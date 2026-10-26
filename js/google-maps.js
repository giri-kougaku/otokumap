/* OtokuMap — Google Maps: loader, deal pins, user location and Places search */
(function () {
  'use strict';

  var cfg = window.OTOKU_CONFIG || {};
  var API_KEY = String(cfg.googleMapsApiKey || '').trim();
  var MAP_ID = cfg.mapId || 'DEMO_MAP_ID';
  var PLACE_TYPES = Array.isArray(cfg.placeTypes) && cfg.placeTypes.length
    ? cfg.placeTypes
    : ['supermarket'];
  var MAX_RESULTS = Math.max(1, Math.min(20, Number(cfg.placesMaxResults) || 20));

  var loadPromise = null;
  var libs = null;
  var map = null;
  var infoWindow = null;
  var ready = false;
  var authFailed = false;
  var callbacks = {};

  var dealMarkers = [];
  var placeMarkers = [];
  var placeMarkerById = {};
  var placeById = {};
  var userMarker = null;
  var dealPoints = [];
  var userPoint = null;

  function makeError(code, detail) {
    var err = new Error(detail || code);
    err.code = code;
    return err;
  }

  function isConfigured() {
    return !!API_KEY &&
      API_KEY.indexOf('PASTE') !== 0 &&
      API_KEY.indexOf('YOUR_') !== 0;
  }

  function currentLang() {
    return window.I18N && window.I18N.lang === 'ja' ? 'ja' : 'en';
  }

  function apiLanguage() {
    if (cfg.mapLanguage && cfg.mapLanguage !== 'auto') return cfg.mapLanguage;
    return currentLang();
  }

  function loadApi() {
    if (window.google && window.google.maps && window.google.maps.importLibrary) {
      return Promise.resolve();
    }
    if (loadPromise) return loadPromise;

    loadPromise = new Promise(function (resolve, reject) {
      var callbackName = '__otokuMapsReady_' + Date.now();
      var settled = false;

      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(makeError('network', 'Google Maps timed out.'));
      }, 20000);

      window[callbackName] = function () {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
        resolve();
      };

      var params = [
        'key=' + encodeURIComponent(API_KEY),
        'v=weekly',
        'loading=async',
        'libraries=places,marker',
        'language=' + encodeURIComponent(apiLanguage()),
        'region=' + encodeURIComponent(cfg.placesRegion || 'JP'),
        'callback=' + encodeURIComponent(callbackName)
      ];

      var script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.src = 'https://maps.googleapis.com/maps/api/js?' + params.join('&');
      script.onerror = function () {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(makeError('network', 'Google Maps could not load.'));
      };
      document.head.appendChild(script);
    });

    /* Allow a later retry after a network failure. */
    loadPromise.catch(function () { loadPromise = null; });

    return loadPromise;
  }

  function loadLibraries() {
    if (libs) return Promise.resolve(libs);
    return Promise.all([
      google.maps.importLibrary('maps'),
      google.maps.importLibrary('marker'),
      google.maps.importLibrary('places')
    ]).then(function (result) {
      libs = {
        Map: result[0].Map,
        AdvancedMarkerElement: result[1].AdvancedMarkerElement,
        Place: result[2].Place
      };
      return libs;
    });
  }

  /* Google calls this global when a key is missing, invalid or not
     authorised for the Maps JavaScript API. */
  window.gm_authFailure = function () {
    authFailed = true;
    if (callbacks.onError) callbacks.onError(makeError('auth'));
  };

  function init(el, opts) {
    callbacks = opts || {};
    authFailed = false;

    if (!isConfigured()) return Promise.reject(makeError('no-key'));

    return loadApi()
      .then(loadLibraries)
      .then(function () {
        if (authFailed) throw makeError('auth');

        map = new libs.Map(el, {
          center: {
            lat: Number(callbacks.lat) || 35.6812,
            lng: Number(callbacks.lng) || 139.7671
          },
          zoom: 13,
          mapId: MAP_ID,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          gestureHandling: 'cooperative',
          clickableIcons: false
        });

        infoWindow = new google.maps.InfoWindow({ maxWidth: 300 });
        map.addListener('click', function () { infoWindow.close(); });

        var osmCredit = document.createElement('div');
        osmCredit.className = 'map-osm-credit';
        osmCredit.innerHTML = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
        map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(osmCredit);

        ready = true;

        /* Layout may still be settling when the app first paints. */
        setTimeout(function () {
          if (map) google.maps.event.trigger(map, 'resize');
        }, 250);

        return map;
      })
      .catch(function (err) {
        if (err && err.code) throw err;
        throw makeError('network', err && err.message);
      });
  }

  function clearMarkers(list) {
    for (var i = 0; i < list.length; i++) {
      try {
        list[i].map = null;
        if (list[i].remove) list[i].remove();
      } catch (e) { /* ignore */ }
    }
    list.length = 0;
  }

  function renderUser(data) {
    if (userMarker) {
      try {
        userMarker.map = null;
        if (userMarker.remove) userMarker.remove();
      } catch (e) { /* ignore */ }
      userMarker = null;
    }

    var dot = document.createElement('div');
    dot.className = 'user-dot';
    dot.title = window.t('mapYourLocation');

    userMarker = new libs.AdvancedMarkerElement({
      map: map,
      position: { lat: data.lat, lng: data.lng },
      content: dot,
      anchorLeft: '-50%',
      anchorTop: '-50%',
      title: window.t('mapYourLocation'),
      zIndex: 30
    });
  }

  function openDealPopup(marker, shop, best, dealsAtShop) {
    var O = window.Otoku;
    var t = window.t;

    var wrap = document.createElement('div');
    wrap.className = 'popup-card';
    wrap.innerHTML =
      '<span class="popup-brand" style="--c:' + O.esc(shop.color) + '">' +
        O.esc(O.loc(shop.brand)) + '</span>' +
      '<h4>' + O.esc(O.loc(shop.branch)) + '</h4>' +
      '<p class="popup-meta">' + O.distanceLabel(shop.distance) + ' · ' +
        O.esc(t('shopDeals', {
          n: dealsAtShop.length,
          dealWord: t(dealsAtShop.length === 1 ? 'dealOne' : 'dealMany')
        })) + '</p>' +
      '<div class="popup-best">' +
        '<span class="popup-best-label">' + O.esc(t('bestDeal')) + '</span>' +
        '<b>' + O.esc(O.loc(best.name)) + '</b>' +
        '<strong>' + O.yen(best.now) + ' <s>' + O.yen(best.was) + '</s></strong>' +
      '</div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-filter-shop="' +
        O.esc(shop.id) + '">' + O.esc(t('filterByShop')) + '</button>';

    wrap.querySelector('[data-filter-shop]').addEventListener('click', function () {
      infoWindow.close();
      if (callbacks.onFilterShop) callbacks.onFilterShop(shop.id);
    });

    infoWindow.setContent(wrap);
    infoWindow.open({ map: map, anchor: marker });
  }

  function fitPoints(points) {
    if (!ready || !map || !points.length) return;

    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(14);
      return;
    }

    var bounds = new google.maps.LatLngBounds();
    points.forEach(function (point) { bounds.extend(point); });
    map.fitBounds(bounds, { top: 36, right: 36, bottom: 36, left: 36 });
    google.maps.event.addListenerOnce(map, 'idle', function () {
      if (map && map.getZoom() > 15) map.setZoom(15);
    });
  }

  function fitPlaces(places) {
    var points = [];
    if (userPoint) points.push(userPoint);
    points = points.concat(dealPoints);
    (places || []).forEach(function (place) {
      points.push({ lat: place.lat, lng: place.lng });
    });
    fitPoints(points);
  }

  function renderDeals(data) {
    if (!ready || !map) return { shopCount: 0 };
    data = data || {};
    if (infoWindow) infoWindow.close();
    clearMarkers(dealMarkers);

    var radius = Number(data.radius) || 10;
    var nearby = (data.deals || []).filter(function (deal) {
      return deal.distance <= radius;
    });

    var byShop = {};
    nearby.forEach(function (deal) {
      if (!byShop[deal.shopId] || deal.score > byShop[deal.shopId].score) {
        byShop[deal.shopId] = deal;
      }
    });

    var shopIds = Object.keys(byShop);

    userPoint = { lat: data.lat, lng: data.lng };
    dealPoints = shopIds.map(function (shopId) {
      var shop = byShop[shopId].shop;
      return { lat: shop.lat, lng: shop.lng };
    });

    shopIds.forEach(function (shopId) {
      var best = byShop[shopId];
      var shop = best.shop;
      var isActive = data.activeShopId === shopId;
      var dealsAtShop = nearby.filter(function (deal) {
        return deal.shopId === shopId;
      });

      var wrapper = document.createElement('div');
      wrapper.className = 'gmap-pin';

      var pin = document.createElement('div');
      pin.className = 'map-pin' + (isActive ? ' is-active' : '');
      pin.style.setProperty('--pin', shop.color);
      pin.textContent = '−' + best.disc + '%';
      wrapper.appendChild(pin);

      var marker = new libs.AdvancedMarkerElement({
        map: map,
        position: { lat: shop.lat, lng: shop.lng },
        content: wrapper,
        title: window.Otoku ? window.Otoku.shopLabel(shop) : shop.id,
        gmpClickable: true,
        zIndex: isActive ? 20 : 10
      });

      marker.addEventListener('gmp-click', function () {
        openDealPopup(marker, shop, best, dealsAtShop);
      });

      dealMarkers.push(marker);
    });

    renderUser(data);
    if (data.fit) {
      fitPoints([userPoint].concat(dealPoints));
    }

    return { shopCount: shopIds.length };
  }

  function directionsUrl(place) {
    var base = 'https://www.google.com/maps/dir/?api=1&destination=' +
      encodeURIComponent(place.lat + ',' + place.lng);
    if (place.source === 'osm' || String(place.id || '').indexOf('osm:') === 0) return base;
    return base + '&destination_place_id=' + encodeURIComponent(place.id);
  }

  function normalizePlaces(places, opts) {
    var O = window.Otoku;
    var seen = {};
    var out = [];

    (places || []).forEach(function (place) {
      if (!place || !place.id || seen[place.id]) return;

      var location = place.location;
      if (!location) return;

      var lat = typeof location.lat === 'function' ? location.lat() : location.lat;
      var lng = typeof location.lng === 'function' ? location.lng() : location.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;

      var name = place.displayName ? String(place.displayName).trim() : '';
      if (!name) return;

      seen[place.id] = true;
      out.push({
        id: place.id,
        name: name,
        address: place.formattedAddress || '',
        lat: lat,
        lng: lng,
        rating: typeof place.rating === 'number' ? place.rating : null,
        ratingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : 0,
        status: place.businessStatus || '',
        mapsUrl: place.googleMapsURI || '',
        distance: O ? O.haversine(opts.lat, opts.lng, lat, lng) : 0
      });
    });

    out.sort(function (a, b) { return a.distance - b.distance; });
    return out;
  }

  function searchNearby(opts) {
    opts = opts || {};
    if (!isConfigured()) return Promise.reject(makeError('no-key'));

    return loadApi()
      .then(loadLibraries)
      .then(function () {
        var request = {
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'businessStatus',
            'googleMapsURI'
          ],
          locationRestriction: {
            center: { lat: opts.lat, lng: opts.lng },
            radius: Math.max(1, Math.min(50000, Number(opts.radiusMeters) || 1500))
          },
          includedPrimaryTypes: PLACE_TYPES,
          maxResultCount: Math.max(1, Math.min(20, Number(opts.maxResultCount) || MAX_RESULTS)),
          rankPreference: 'DISTANCE',
          language: opts.language === 'ja' ? 'ja' : 'en',
          region: cfg.placesRegion || 'JP'
        };

        return libs.Place.searchNearby(request);
      })
      .then(function (result) {
        return normalizePlaces(result && result.places, opts);
      })
      .catch(function (err) {
        if (err && err.code) throw err;
        if (authFailed) throw makeError('auth');
        throw makeError('places', err && err.message);
      });
  }

  function setActivePlace(placeId) {
    placeMarkers.forEach(function (marker) {
      if (marker.__pin) {
        marker.__pin.classList.toggle('is-active', marker.__placeId === placeId);
      }
    });
  }

  function openPlacePopup(marker, place, silent) {
    var O = window.Otoku;
    var t = window.t;

    var meta = [];
    if (place.rating) {
      meta.push('★ ' + place.rating.toFixed(1) +
        (place.ratingCount ? ' (' + place.ratingCount + ')' : ''));
    }
    meta.push(O.distanceLabel(place.distance));

    var closed = place.status === 'CLOSED_TEMPORARILY'
      ? '<span class="place-closed">' + O.esc(t('placeClosed')) + '</span>'
      : '';

    var wrap = document.createElement('div');
    wrap.className = 'popup-card popup-card--place';
    var displayName = (window.I18N.lang === 'en' && place.nameEn) ? place.nameEn : place.name;
    var sourceLabel = place.source === 'osm' ? t('nearbySource') : 'Google';
    var flyerMatch = window.OtokuFlyers ? window.OtokuFlyers.forStore(place) : null;
    var flyerButton = flyerMatch
      ? '<button type="button" class="btn btn-soft btn-sm" data-open-flyer>' +
          O.esc(t('nearbyFlyer')) + '</button>'
      : '';
    wrap.innerHTML =
      '<span class="popup-brand ' + (place.source === 'osm' ? 'popup-brand--osm' : 'popup-brand--google') + '">' +
        O.esc(sourceLabel) + '</span>' +
      '<h4>' + O.esc(displayName) + ' ' + closed + '</h4>' +
      (place.address ? '<p class="popup-meta">' + O.esc(place.address) + '</p>' : '') +
      '<p class="popup-meta popup-meta--rating">' + O.esc(meta.join(' · ')) + '</p>' +
      '<div class="popup-actions">' +
        '<a class="btn btn-primary btn-sm" href="' + O.esc(directionsUrl(place)) +
          '" target="_blank" rel="noopener">' + O.esc(t('nearbyDirections')) + '</a>' +
        flyerButton +
      '</div>';

    var flyerBtn = wrap.querySelector('[data-open-flyer]');
    if (flyerBtn) {
      flyerBtn.addEventListener('click', function () {
        if (window.OtokuApp && window.OtokuApp.openFlyerForPlace) {
          window.OtokuApp.openFlyerForPlace(place);
        } else {
          window.dispatchEvent(new CustomEvent('otoku:flyer', { detail: { place: place } }));
        }
      });
    }

    infoWindow.setContent(wrap);
    infoWindow.open({ map: map, anchor: marker });

    setActivePlace(place.id);
    if (!silent && callbacks.onPlaceFocus) callbacks.onPlaceFocus(place.id);
  }

  function renderPlaces(places, activeId) {
    if (!ready || !map) return;

    if (infoWindow) infoWindow.close();
    clearMarkers(placeMarkers);
    placeMarkerById = {};
    placeById = {};

    (places || []).forEach(function (place) {
      placeById[place.id] = place;

      var dot = document.createElement('div');
      dot.className = 'super-pin' + (place.id === activeId ? ' is-active' : '');
      dot.title = place.name;
      dot.innerHTML = '<span class="super-pin-dot" aria-hidden="true"></span>';

      var marker = new libs.AdvancedMarkerElement({
        map: map,
        position: { lat: place.lat, lng: place.lng },
        content: dot,
        anchorLeft: '-50%',
        anchorTop: '-50%',
        title: place.name,
        gmpClickable: true,
        zIndex: place.id === activeId ? 25 : 5
      });

      marker.__pin = dot;
      marker.__placeId = place.id;

      marker.addEventListener('gmp-click', function () {
        openPlacePopup(marker, place);
      });

      placeMarkers.push(marker);
      placeMarkerById[place.id] = marker;
    });

    setActivePlace(activeId);
  }

  function focusPlace(placeId) {
    if (!ready || !map) return;
    var marker = placeMarkerById[placeId];
    var place = placeById[placeId];
    if (!marker || !place) return;

    setActivePlace(placeId);
    map.panTo({ lat: place.lat, lng: place.lng });
    if (map.getZoom() < 15) map.setZoom(15);
    openPlacePopup(marker, place, true);
  }

  window.OtokuMaps = {
    isConfigured: isConfigured,
    init: init,
    renderDeals: renderDeals,
    searchNearby: searchNearby,
    renderPlaces: renderPlaces,
    fitPlaces: fitPlaces,
    focusPlace: focusPlace,
    setActivePlace: setActivePlace,
    directionsUrl: directionsUrl
  };
})();
