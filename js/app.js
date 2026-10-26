/* OtokuMap — customer app: location, deal ranking, filters, map */
(function () {
  'use strict';

  var O = window.Otoku;
  var t = window.t;

  var state = {
    lat: 35.6812,
    lng: 139.7671,
    areaId: 'tokyo',
    radius: 10,
    mode: 'dealwise',
    cat: 'all',
    shop: 'all',
    minDiscount: 0,
    q: '',
    savedOnly: false
  };

  var shops = [];
  var mapReady = false;
  var needsFit = true;
  var NEARBY_MAP_LIMIT = 120;

  var nearby = {
    places: [],
    status: 'idle',
    activeId: null,
    cache: {},
    cacheSource: {},
    source: 'osm',
    reqId: 0,
    timer: null,
    fitPending: false,
    errorCode: null
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function refreshShops() {
    shops = window.SHOPS.map(function (s) {
      return Object.assign({}, s, {
        distance: O.haversine(state.lat, state.lng, s.lat, s.lng)
      });
    });
  }

  /* ---------- location ---------- */

  function areaById(id) {
    for (var i = 0; i < window.AREAS.length; i++) {
      if (window.AREAS[i].id === id) return window.AREAS[i];
    }
    return null;
  }

  function updateLocationLabel() {
    var label = $('#locLabel');
    if (!label) return;
    if (state.areaId === 'custom') {
      label.textContent = t('locCurrent');
      return;
    }
    var area = areaById(state.areaId) || window.AREAS[0];
    label.textContent = O.loc(area.name);
  }

  function buildAreaOptions() {
    var select = $('#areaSelect');
    if (!select) return;
    var html = '';
    if (state.areaId === 'custom') {
      html += '<option value="custom">' + O.esc(t('locCurrent')) + '</option>';
    }
    html += window.AREAS.map(function (a) {
      return '<option value="' + a.id + '">' + O.esc(O.loc(a.name)) + '</option>';
    }).join('');
    select.innerHTML = html;
    select.value = state.areaId === 'custom' ? 'custom' : state.areaId;
    updateLocationLabel();
  }

  function setLocation(lat, lng, areaId, opts) {
    state.lat = lat;
    state.lng = lng;
    state.areaId = areaId;
    O.saveLocation({ lat: lat, lng: lng, areaId: areaId });
    refreshShops();
    buildAreaOptions();
    needsFit = true;
    renderAll();
    scheduleNearby(true);
    if (opts && opts.toast) window.Ui.toast(opts.toast);
  }

  function locate(interactive) {
    var btn = $('#geoBtn');
    if (!navigator.geolocation) {
      if (interactive) window.Ui.toast(t('geoUnsupported'));
      return;
    }
    if (btn) btn.classList.add('is-busy');
    navigator.geolocation.getCurrentPosition(function (pos) {
      if (btn) btn.classList.remove('is-busy');
      setLocation(pos.coords.latitude, pos.coords.longitude, 'custom', {
        toast: interactive ? t('geoSet') : null
      });
    }, function (err) {
      if (btn) btn.classList.remove('is-busy');
      if (!interactive) return;
      window.Ui.toast(err && err.code === 1 ? t('geoDenied') : t('geoTimeout'));
    }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 300000 });
  }

  function maybeAutoLocate() {
    if (!navigator.geolocation || !navigator.permissions || !navigator.permissions.query) return;
    try {
      navigator.permissions.query({ name: 'geolocation' }).then(function (status) {
        if (status.state === 'granted') locate(false);
      }).catch(function () { /* ignore */ });
    } catch (e) { /* ignore */ }
  }

  /* ---------- data ---------- */

  function enrichDeals() {
    var byId = {};
    shops.forEach(function (s) { byId[s.id] = s; });

    return O.allDeals().map(function (d) {
      var shop = byId[d.shopId];
      if (!shop) return null;
      var days = O.daysLeft(d.ends);
      return Object.assign({}, d, {
        shop: shop,
        distance: shop.distance,
        disc: O.discountPct(d.was, d.now),
        days: days,
        score: O.dealScore(d)
      });
    }).filter(function (d) {
      return d && d.active !== false && d.days >= 0;
    });
  }

  function matchesFilters(d) {
    if (d.distance > state.radius) return false;
    if (state.cat !== 'all' && d.cat !== state.cat) return false;
    if (state.shop !== 'all' && d.shopId !== state.shop) return false;
    if (state.minDiscount > 0 && d.disc < state.minDiscount) return false;
    if (state.savedOnly && !O.isSaved(d.id)) return false;
    if (state.q) {
      var q = state.q.toLowerCase();
      var hay = [
        d.name && d.name.en, d.name && d.name.ja,
        d.note && d.note.en, d.note && d.note.ja,
        d.shop.brand.en, d.shop.brand.ja,
        d.shop.branch.en, d.shop.branch.ja
      ].join(' ').toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  /* ---------- rendering: controls ---------- */

  function renderModes() {
    var wrap = $('#modeSwitch');
    if (!wrap) return;
    wrap.innerHTML = [
      { id: 'dealwise', icon: '🔥' },
      { id: 'nearest', icon: '📍' }
    ].map(function (m) {
      var name = m.id === 'dealwise' ? t('modeDealwise') : t('modeNearest');
      var hint = m.id === 'dealwise' ? t('modeDealwiseHint') : t('modeNearestHint');
      var desc = m.id === 'dealwise' ? t('modeDealwiseDesc') : t('modeNearestDesc');
      return '<button type="button" class="mode-btn' + (state.mode === m.id ? ' is-active' : '') + '"' +
        ' role="tab" aria-selected="' + (state.mode === m.id) + '" data-mode="' + m.id + '">' +
        '<span class="mode-icon" aria-hidden="true">' + m.icon + '</span>' +
        '<span class="mode-copy">' +
        '<span class="mode-top"><strong>' + O.esc(name) + '</strong><em>' + O.esc(hint) + '</em></span>' +
        '<span class="mode-desc">' + O.esc(desc) + '</span>' +
        '</span>' +
        '<span class="mode-radio" aria-hidden="true"></span>' +
        '</button>';
    }).join('');
  }

  function renderCategoryChips() {
    var wrap = $('#categoryChips');
    if (!wrap) return;
    var html = '<button type="button" class="chip' + (state.cat === 'all' ? ' is-active' : '') + '" data-cat="all">' +
      '<span aria-hidden="true">🛒</span>' + O.esc(t('catAll')) + '</button>';
    html += window.CATEGORIES.map(function (c) {
      return '<button type="button" class="chip' + (state.cat === c.id ? ' is-active' : '') + '" data-cat="' + c.id + '">' +
        '<span aria-hidden="true">' + c.emoji + '</span>' + O.esc(t('cat_' + c.id)) + '</button>';
    }).join('');
    wrap.innerHTML = html;
  }

  function renderShopOptions() {
    var select = $('#shopSelect');
    if (!select) return;
    select.setAttribute('aria-label', t('shopLabel'));
    var ordered = shops.slice().sort(function (a, b) { return a.distance - b.distance; });
    select.innerHTML = '<option value="all">' + O.esc(t('shopAll')) + '</option>' +
      ordered.map(function (s) {
        return '<option value="' + s.id + '">' + O.esc(O.shopLabel(s)) + '</option>';
      }).join('');
    select.value = state.shop;
  }

  function renderDiscountOptions() {
    var select = $('#discountSelect');
    if (!select) return;
    select.setAttribute('aria-label', t('minDiscount'));
    var opts = [0, 10, 20, 30];
    select.innerHTML = opts.map(function (n) {
      var label = n === 0 ? t('anyDiscount') : t('discountOption', { n: n });
      return '<option value="' + n + '">' + O.esc(label) + '</option>';
    }).join('');
    select.value = String(state.minDiscount);
  }

  function renderRadius() {
    $all('#radiusChips [data-radius]').forEach(function (btn) {
      btn.classList.toggle('is-active', Number(btn.getAttribute('data-radius')) === state.radius);
      btn.setAttribute('aria-pressed', Number(btn.getAttribute('data-radius')) === state.radius);
    });
  }

  function updateSavedCount() {
    var count = O.getSaved().length;
    var el = $('#savedCount');
    if (el) el.textContent = count;
    var toggle = $('#savedToggle');
    if (toggle) {
      toggle.classList.toggle('has-saved', count > 0);
      toggle.classList.toggle('is-active', state.savedOnly);
      toggle.setAttribute('aria-pressed', state.savedOnly ? 'true' : 'false');
    }
  }

  function renderControls() {
    renderModes();
    renderCategoryChips();
    renderShopOptions();
    renderDiscountOptions();
    renderRadius();
    updateSavedCount();
    var search = $('#searchInput');
    if (search && search.value !== state.q) search.value = state.q;

    var pill = $('#shopPill');
    var pillName = $('#shopPillName');
    if (pill && pillName) {
      if (state.shop !== 'all') {
        var shop = shops.filter(function (s) { return s.id === state.shop; })[0];
        if (shop) {
          pillName.textContent = O.shopLabel(shop);
          pill.hidden = false;
        } else {
          pill.hidden = true;
        }
      } else {
        pill.hidden = true;
      }
    }

    var clear = $('#clearFilters');
    if (clear) {
      var anyFilter = state.cat !== 'all' || state.shop !== 'all' || state.minDiscount > 0 || state.q || state.savedOnly;
      clear.classList.toggle('is-visible', !!anyFilter);
    }
  }

  /* ---------- rendering: deals ---------- */

  function expiryLabel(days) {
    if (days <= 0) return t('endsToday');
    if (window.I18N.lang === 'ja') return t('daysLeft', { n: days });
    if (days === 1) return t('endsTomorrow');
    return t('daysLeft', { n: days });
  }

  function countNoun(n, oneKey, manyKey) {
    return t(n === 1 ? oneKey : manyKey);
  }

  /* ---------- flyers ---------- */

  function displayPlaceName(place) {
    if (!place) return '';
    if (window.I18N.lang === 'en' && place.nameEn) return place.nameEn;
    return place.name || '';
  }

  function flyerDateLabel(flyer) {
    if (!flyer) return '';
    var from = flyer.validFrom || '';
    var to = flyer.validTo || '';
    if (from && to) return t('flyerValid', { from: from, to: to });
    if (from) return t('flyerValidFrom', { from: from });
    if (to) return t('flyerValidTo', { to: to });
    return t('flyerNoDates');
  }

  function directionsForPlace(place) {
    if (window.OtokuMaps && window.OtokuMaps.directionsUrl) {
      return window.OtokuMaps.directionsUrl(place);
    }
    return 'https://www.google.com/maps/dir/?api=1&destination=' +
      encodeURIComponent(place.lat + ',' + place.lng);
  }

  function flyerChip(match, attrs) {
    if (!match) return '';
    var flyer = match.flyer;
    var label = match.level === 'store'
      ? t(match.exact ? 'flyerChip' : 'flyerApproxChip')
      : t('nearbyFindFlyer');
    var title = flyer.title ? O.loc(flyer.title) : t('flyerChip');
    return '<button type="button" class="flyer-chip' + (match.exact ? '' : ' is-approx') + '" ' +
      (attrs || '') + ' title="' + O.esc(title) + '" aria-label="' + O.esc(label + ': ' + title) + '">' +
      '<span class="flyer-chip-mark" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 3v5h5M10 12h5M10 15.5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
      '</span>' +
      '<span>' + O.esc(label) + '</span>' +
    '</button>';
  }

  function flyerSourceLabel(flyer) {
    if (!flyer) return '';
    var labelsEn = {
      'life-official': 'Life official site',
      'seiyu-official': 'Seiyu official site',
      'donki-official': 'Don Quijote official site',
      'gyomu-official': 'Gyomu Super official site',
      'itoyokado-official': 'Ito-Yokado official site',
      'summit-official': 'Summit official site',
      official: 'Official retailer site'
    };
    var labelsJa = {
      'life-official': 'ライフ公式サイト',
      'seiyu-official': '西友公式サイト',
      'donki-official': 'ドン・キホーテ公式サイト',
      'gyomu-official': '業務スーパー公式サイト',
      'itoyokado-official': 'イトーヨーカドー公式サイト',
      'summit-official': 'サミットストア公式サイト',
      official: '公式店舗サイト'
    };
    var labels = window.I18N.lang === 'ja' ? labelsJa : labelsEn;
    if (labels[flyer.source]) return labels[flyer.source];
    if (flyer.sourceLabel) return flyer.sourceLabel;
    return window.I18N.lang === 'ja' ? '公式店舗サイト' : 'Official retailer site';
  }

  function openFlyerDialog(match, target) {
    var dialog = $('#flyerDialog');
    if (!dialog || !match || !match.flyer) {
      if (window.Ui) window.Ui.toast(t('flyerUnavailable'));
      return;
    }
    var flyer = match.flyer;
    var title = flyer.title ? O.loc(flyer.title) : t('flyerChip');
    var levelKey = flyer.level === 'store' ? 'flyerLevelStore' :
      flyer.level === 'region' ? 'flyerLevelRegion' : 'flyerLevelChain';

    var titleEl = $('#flyerTitle');
    var kickerEl = $('#flyerKicker');
    var storeEl = $('#flyerStore');
    var levelEl = $('#flyerLevel');
    var noteEl = $('#flyerNote');
    var metaEl = $('#flyerMeta');
    var sourceEl = $('#flyerSource');
    var linkEl = $('#flyerLink');
    var previewEl = $('#flyerPreview');

    if (titleEl) titleEl.textContent = title;
    if (kickerEl) kickerEl.textContent = t('flyerKicker');
    if (storeEl) {
      var bits = [];
      if (target && target.name) bits.push(target.name);
      if (target && target.address) bits.push(target.address);
      storeEl.textContent = bits.join(' · ');
    }
    if (levelEl) {
      var levelText = t(levelKey);
      if (flyer.level === 'store') {
        levelText += ' · ' + t(match.exact ? 'flyerExact' : 'flyerApprox');
      }
      levelEl.textContent = levelText;
    }
    if (noteEl) {
      var note = '';
      if (flyer.level === 'store') {
        note = t('flyerStoreNote', { store: (target && target.name) || flyer.storeName || '' });
      } else if (flyer.level === 'region') {
        note = t('flyerRegionNote', { region: flyer.regionLabel || '' });
      } else {
        note = t('flyerChainNote');
      }
      noteEl.textContent = note + ' ' + t('flyerPreviewNote');
    }
    if (metaEl) {
      var checked = flyer.checkedAt ? String(flyer.checkedAt).slice(0, 10) : '';
      metaEl.textContent = flyerDateLabel(flyer) + (checked ? ' · ' + t('flyerChecked', { date: checked }) : '');
    }
    if (sourceEl) sourceEl.textContent = t('flyerSource', { source: flyerSourceLabel(flyer) });
    if (linkEl) {
      linkEl.href = flyer.url;
      linkEl.hidden = !flyer.url;
    }
    if (previewEl) {
      if (flyer.image) {
        previewEl.innerHTML = '<span class="flyer-preview-loading">' + O.esc(t('flyerLoading')) + '</span>' +
          '<img src="' + O.esc(flyer.image) + '" alt="' + O.esc(t('flyerPreview')) + '" loading="lazy" decoding="async" referrerpolicy="no-referrer">';
        previewEl.classList.add('has-image');
        previewEl.classList.remove('is-loaded');
        var previewImg = previewEl.querySelector('img');
        if (previewImg) {
          var markLoaded = function () {
            previewEl.classList.add('is-loaded');
            var loadingLabel = previewEl.querySelector('.flyer-preview-loading');
            if (loadingLabel) loadingLabel.remove();
          };
          previewImg.addEventListener('load', markLoaded);
          previewImg.addEventListener('error', function () {
            previewEl.classList.remove('has-image', 'is-loaded');
            previewEl.innerHTML = '<span class="flyer-preview-mark">' + O.esc(t('flyerChip')) + '</span>' +
              '<span class="flyer-preview-lines"><i></i><i></i><i></i></span>';
          });
          if (previewImg.complete && previewImg.naturalWidth) markLoaded();
        }
      } else {
        previewEl.innerHTML = '<span class="flyer-preview-mark">' + O.esc(t('flyerChip')) + '</span>' +
          '<span class="flyer-preview-lines"><i></i><i></i><i></i></span>';
        previewEl.classList.remove('has-image', 'is-loaded');
      }
    }

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function openFlyerForPlace(place) {
    if (!place || !window.OtokuFlyers) {
      if (window.Ui) window.Ui.toast(t('flyerUnavailable'));
      return;
    }
    var match = window.OtokuFlyers.forStore(place);
    openFlyerDialog(match, { name: displayPlaceName(place), address: place.address });
  }

  function openFlyerForShop(shopId) {
    var shop = null;
    for (var i = 0; i < shops.length; i++) {
      if (shops[i].id === shopId) { shop = shops[i]; break; }
    }
    if (!shop || !window.OtokuFlyers) {
      if (window.Ui) window.Ui.toast(t('flyerUnavailable'));
      return;
    }
    var match = window.OtokuFlyers.forShop(shop);
    openFlyerDialog(match, {
      name: O.loc(shop.brand) + ' ' + O.loc(shop.branch),
      address: shop.address ? O.loc(shop.address) : ''
    });
  }

  function initFlyerDialog() {
    var dialog = $('#flyerDialog');
    if (!dialog) return;
    var close = $('#flyerClose');
    if (close) close.addEventListener('click', function () { dialog.close(); });
    if (window.Ui && window.Ui.closeOnBackdrop) window.Ui.closeOnBackdrop(dialog);
    window.addEventListener('otoku:flyer', function (event) {
      if (event.detail && event.detail.place) openFlyerForPlace(event.detail.place);
    });
  }

  window.OtokuApp = {
    openFlyerForPlace: openFlyerForPlace,
    openFlyerForShop: openFlyerForShop
  };

  function dealCard(d) {
    var cat = O.categoryById(d.cat);
    var saved = O.isSaved(d.id);
    var shop = d.shop;
    var note = O.loc(d.note);
    var expiry = expiryLabel(d.days);
    var brand = O.loc(shop.brand);
    var branch = O.loc(shop.branch);
    var flyerMatch = window.OtokuFlyers ? window.OtokuFlyers.forShop(shop) : null;
    var flyerHtml = flyerMatch ? flyerChip(flyerMatch, 'data-flyer-shop="' + O.esc(shop.id) + '"') : '';

    return '<article class="deal-card" data-id="' + O.esc(d.id) + '">' +
      '<div class="deal-thumb cat-' + O.esc(d.cat) + '" aria-hidden="true">' +
        '<span class="deal-emoji">' + cat.emoji + '</span>' +
        '<span class="deal-off">−' + d.disc + '%</span>' +
      '</div>' +
      '<div class="deal-main">' +
        '<p class="deal-shop">' +
          '<span class="shop-dot" style="--dot:' + shop.color + '"></span>' +
          '<span class="deal-shop-name">' + O.esc(brand) + ' <span class="deal-branch">' + O.esc(branch) + '</span></span>' +
          '<span class="deal-distance">' + O.distanceLabel(d.distance) + '</span>' +
        '</p>' +
        '<h3 class="deal-name">' + O.esc(O.loc(d.name)) + '</h3>' +
        '<p class="deal-meta">' +
          (note ? O.esc(note) + ' <span class="dot-sep" aria-hidden="true">·</span> ' : '') +
          '<span class="deal-expiry' + (d.days <= 1 ? ' is-urgent' : '') + '">' + O.esc(expiry) + '</span>' +
        '</p>' +
        '<span class="score-chip" title="' + O.esc(t('dealScore')) + ' ' + d.score + '/100">' +
          '<span class="score-flame" aria-hidden="true">🔥</span>' +
          '<b>' + d.score + '</b><span>' + O.esc(t('dealScore')) + '</span>' +
        '</span>' +
        flyerHtml +
      '</div>' +
      '<div class="deal-side">' +
        '<button type="button" class="save-btn' + (saved ? ' is-saved' : '') + '" data-save="' + O.esc(d.id) + '"' +
          ' aria-pressed="' + saved + '" aria-label="' + O.esc(saved ? t('unsaveDeal') : t('saveDeal')) + '">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5 4.8 13.7a4.9 4.9 0 0 1 0-7 4.9 4.9 0 0 1 7 0l.2.2.2-.2a4.9 4.9 0 0 1 7 0 4.9 4.9 0 0 1 0 7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>' +
        '</button>' +
        '<div class="deal-price"><s>' + O.yen(d.was) + '</s><strong>' + O.yen(d.now) + '</strong></div>' +
      '</div>' +
    '</article>';
  }

  function shopGroup(shop, deals) {
    var brand = O.loc(shop.brand);
    var branch = O.loc(shop.branch);
    var initial = (brand || '?').slice(0, 1);
    var sorted = deals.slice().sort(function (a, b) { return b.score - a.score; });

    return '<section class="shop-group" data-shop-group="' + O.esc(shop.id) + '">' +
      '<header class="shop-head">' +
        '<span class="shop-mark" style="--c:' + shop.color + '" aria-hidden="true">' + O.esc(initial) + '</span>' +
        '<div class="shop-head-copy">' +
          '<h3>' + O.esc(brand) + '</h3>' +
          '<p>' + O.esc(branch) + '</p>' +
        '</div>' +
        '<div class="shop-head-meta">' +
          '<strong>' + O.distanceLabel(shop.distance) + '</strong>' +
          '<span>' + O.esc(t('shopDeals', { n: deals.length, dealWord: countNoun(deals.length, 'dealOne', 'dealMany') })) + '</span>' +
        '</div>' +
      '</header>' +
      '<div class="deal-list">' + sorted.map(dealCard).join('') + '</div>' +
    '</section>';
  }

  function renderResults() {
    var all = enrichDeals();
    var visible = all.filter(matchesFilters);

    if (state.mode === 'dealwise') {
      visible.sort(function (a, b) {
        return b.score - a.score || a.distance - b.distance || b.disc - a.disc;
      });
    } else {
      visible.sort(function (a, b) {
        return a.distance - b.distance || b.score - a.score;
      });
    }

    var list = $('#dealList');
    var empty = $('#emptyState');
    if (!list) return;

    if (!visible.length) {
      list.innerHTML = '';
      if (empty) empty.hidden = false;
    } else {
      if (empty) empty.hidden = true;
      if (state.mode === 'dealwise') {
        list.className = 'deal-list';
        list.innerHTML = visible.map(dealCard).join('');
      } else {
        list.className = 'deal-groups';
        var groups = [];
        var index = {};
        visible.forEach(function (d) {
          if (!index[d.shopId]) {
            index[d.shopId] = { shop: d.shop, deals: [] };
            groups.push(index[d.shopId]);
          }
          index[d.shopId].deals.push(d);
        });
        groups.sort(function (a, b) { return a.shop.distance - b.shop.distance; });
        list.innerHTML = groups.map(function (g) { return shopGroup(g.shop, g.deals); }).join('');
      }
    }

    var uniqueShops = {};
    visible.forEach(function (d) { uniqueShops[d.shopId] = true; });
    var shopCount = Object.keys(uniqueShops).length;

    var count = $('#resultCount');
    if (count) {
      count.textContent = t('resultsSummary', {
        deals: visible.length,
        shops: shopCount,
        radius: state.radius,
        dealWord: countNoun(visible.length, 'dealOne', 'dealMany'),
        shopWord: countNoun(shopCount, 'shopOne', 'shopMany')
      });
    }

    var title = $('#listTitle');
    var sub = $('#listSub');
    if (title) title.textContent = state.mode === 'dealwise' ? t('listDealwiseTitle') : t('listNearestTitle');
    if (sub) sub.textContent = state.mode === 'dealwise' ? t('listDealwiseSub') : t('listNearestSub');

    renderMap(all);
  }

  /* ---------- map & nearby supermarkets ---------- */

  function showMapFallback(code) {
    var el = $('#map');
    var fallback = $('#mapFallback');
    var text = $('#mapFallbackText');
    var link = $('#mapSetupLink');
    if (el) el.hidden = true;
    if (fallback) fallback.hidden = false;
    if (text) {
      var key = code === 'no-key' ? 'mapNoKey' :
        code === 'auth' ? 'mapAuthError' : 'mapUnavailable';
      text.setAttribute('data-i18n', key);
      text.textContent = t(key);
    }
    if (link) link.hidden = !(code === 'no-key' || code === 'auth');
  }

  function initMap() {
    var el = $('#map');
    if (!el || !window.OtokuMaps) {
      showMapFallback('unavailable');
      return;
    }

    var failed = false;

    window.OtokuMaps.init(el, {
      lat: state.lat,
      lng: state.lng,
      onFilterShop: function (shopId) {
        state.shop = shopId;
        renderAll();
        var browse = $('#deals');
        if (browse) browse.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      onPlaceFocus: function (placeId) {
        nearby.activeId = placeId;
        setActiveNearbyItem(placeId);
        scrollNearbyIntoView(placeId);
      },
      onError: function (err) {
        failed = true;
        mapReady = false;
        showMapFallback(err && err.code);
      }
    }).then(function () {
      if (failed) return;
      mapReady = true;
      var fallback = $('#mapFallback');
      if (fallback) fallback.hidden = true;
      var mapEl = $('#map');
      if (mapEl) mapEl.hidden = false;
      renderAll();
      scheduleNearby(true);
    }).catch(function (err) {
      failed = true;
      mapReady = false;
      showMapFallback(err && err.code);
      scheduleNearby(true);
    });
  }

  function renderMap(allDeals) {
    if (!mapReady || !window.OtokuMaps) return;

    var shouldFit = needsFit;
    var info = window.OtokuMaps.renderDeals({
      deals: allDeals,
      activeShopId: state.shop,
      lat: state.lat,
      lng: state.lng,
      radius: state.radius,
      fit: needsFit
    });
    if (!info) return;

    needsFit = false;
    if (shouldFit) nearby.fitPending = true;
    var badge = $('#mapBadge');
    if (badge) {
      badge.textContent = t('shopsWithin', {
        n: info.shopCount,
        shopWord: countNoun(info.shopCount, 'shopOne', 'shopMany')
      });
    }
  }

  function nearbyKey() {
    return state.lat.toFixed(4) + ',' + state.lng.toFixed(4) + ',' +
      state.radius + ',' + (window.I18N.lang || 'en');
  }

  function scheduleNearby(force) {
    clearTimeout(nearby.timer);
    nearby.timer = setTimeout(function () { loadNearby(force); }, 320);
  }

  function canUseGooglePlaces() {
    return !!(window.OtokuMaps && window.OtokuMaps.isConfigured());
  }

  function searchWithGoogle() {
    if (!canUseGooglePlaces()) {
      var err = new Error('Google Maps key is not configured');
      err.code = 'no-key';
      return Promise.reject(err);
    }
    return window.OtokuMaps.searchNearby({
      lat: state.lat,
      lng: state.lng,
      radiusMeters: state.radius * 1000,
      language: window.I18N.lang || 'en'
    }).then(function (places) {
      return (places || []).map(function (place) {
        place.source = 'google';
        place.sourceLabel = 'Google';
        return place;
      });
    });
  }

  function samplePlacesForMap(places) {
    if (places.length <= NEARBY_MAP_LIMIT) return places.slice();

    /* One marker per grid cell keeps the map readable and still covers
       the whole search radius instead of piling every dot downtown. */
    var cells = 12;
    var cellLat = (Math.max(1, state.radius) * 2) / 110 / cells;
    var cellLng = cellLat / Math.max(0.2, Math.cos(state.lat * Math.PI / 180));
    var seen = {};
    var out = [];
    for (var i = 0; i < places.length && out.length < NEARBY_MAP_LIMIT; i++) {
      var place = places[i];
      var key = Math.floor((place.lat - state.lat) / cellLat) + ':' +
        Math.floor((place.lng - state.lng) / cellLng);
      if (seen[key]) continue;
      seen[key] = true;
      out.push(place);
    }
    return out;
  }

  function mapPlacesFor(activeId) {
    var list = samplePlacesForMap(nearby.places);
    if (!activeId) return list;
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === activeId) { found = true; break; }
    }
    if (!found) {
      var place = findNearbyPlace(activeId);
      if (place) list.push(place);
    }
    return list;
  }

  function applyNearby(places, key, source, reqId) {
    if (reqId != null && reqId !== nearby.reqId) return;
    nearby.places = places;
    nearby.cache[key] = places;
    nearby.cacheSource[key] = source;
    nearby.status = 'ready';
    nearby.source = source;
    nearby.activeId = null;
    nearby.errorCode = null;
    renderNearby();
    if (mapReady) {
      var mapPlaces = mapPlacesFor(null);
      window.OtokuMaps.renderPlaces(mapPlaces, null);
      if (nearby.fitPending) {
        window.OtokuMaps.fitPlaces(mapPlaces);
        nearby.fitPending = false;
      }
    }
  }

  function failNearby(err, reqId) {
    if (reqId != null && reqId !== nearby.reqId) return;
    nearby.places = [];
    nearby.errorCode = (err && err.code) || 'places';
    nearby.status = nearby.errorCode === 'no-key' ? 'nokey' : 'error';
    nearby.fitPending = false;
    renderNearby();
    if (mapReady) window.OtokuMaps.renderPlaces([], null);
  }

  function loadNearby(force) {
    var key = nearbyKey();
    if (!force && nearby.cache[key]) {
      applyNearby(nearby.cache[key], key, nearby.cacheSource[key] || 'osm');
      return;
    }

    var reqId = ++nearby.reqId;
    nearby.status = 'loading';
    nearby.errorCode = null;
    renderNearby();
    if (mapReady) window.OtokuMaps.renderPlaces([], null);

    var staticLoad = window.OtokuStores
      ? window.OtokuStores.load().then(function () {
          return window.OtokuStores.nearby(state.lat, state.lng, state.radius);
        })
      : Promise.reject(new Error('Static store index is not available'));

    staticLoad.then(function (places) {
      if (reqId !== nearby.reqId) return;
      if (places.length) {
        applyNearby(places, key, 'osm', reqId);
        return;
      }
      /* No OSM stores in this radius: keep the Google Places fallback. */
      return searchWithGoogle().then(function (googlePlaces) {
        applyNearby(googlePlaces, key, 'google', reqId);
      }).catch(function () {
        applyNearby([], key, 'osm', reqId);
      });
    }).catch(function (err) {
      if (reqId !== nearby.reqId) return;
      if (!canUseGooglePlaces()) {
        failNearby({ code: 'stores' }, reqId);
        return;
      }
      searchWithGoogle().then(function (places) {
        applyNearby(places, key, 'google', reqId);
      }).catch(function (googleErr) {
        failNearby(googleErr || err, reqId);
      });
    });
  }

  function nearbyItem(place) {
    var active = nearby.activeId === place.id ? ' is-active' : '';
    var rating = place.rating
      ? '<span class="nearby-rating">★ ' + place.rating.toFixed(1) +
        (place.ratingCount ? ' <small>(' + place.ratingCount + ')</small>' : '') + '</span>'
      : '';
    var closed = place.status === 'CLOSED_TEMPORARILY'
      ? '<span class="nearby-closed">' + O.esc(t('placeClosed')) + '</span>'
      : '';
    var match = window.OtokuFlyers ? window.OtokuFlyers.forStore(place) : null;
    var flyerHtml = match
      ? flyerChip(match, 'data-flyer-place="' + O.esc(place.id) + '"')
      : '';
    var name = displayPlaceName(place);
    var address = place.address || place.prefecture || '';

    return '<li class="nearby-item' + active + '">' +
      '<button type="button" class="nearby-open" data-place-id="' + O.esc(place.id) + '"' +
        ' aria-label="' + O.esc(t('nearbyOpenAria', { name: name })) + '">' +
        '<span class="nearby-name">' + O.esc(name) + closed + '</span>' +
        '<span class="nearby-addr">' + O.esc(address) + '</span>' +
        '<span class="nearby-meta">' + rating +
          '<span>' + O.distanceLabel(place.distance) + '</span></span>' +
      '</button>' +
      flyerHtml +
      '<a class="nearby-dir" href="' + O.esc(directionsForPlace(place)) + '"' +
        ' target="_blank" rel="noopener" aria-label="' + O.esc(t('nearbyDirections')) + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M19 5h-7M19 5v7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</a>' +
    '</li>';
  }

  function renderNearby() {
    var status = $('#nearbyStatus');
    var list = $('#nearbyList');
    var retry = $('#nearbyRetry');
    if (!status || !list) return;

    if (retry) {
      retry.hidden = false;
      retry.disabled = nearby.status === 'loading';
    }

    if (nearby.status === 'loading') {
      status.textContent = t('nearbyLoading');
      list.innerHTML = '';
      return;
    }
    if (nearby.status === 'nokey') {
      status.textContent = t('nearbyNoKey');
      list.innerHTML = '';
      return;
    }
    if (nearby.status === 'error') {
      var errKey = nearby.errorCode === 'network' ? 'nearbyNetworkError' :
        nearby.errorCode === 'auth' ? 'nearbyAuthError' : 'nearbyError';
      status.textContent = t(errKey);
      list.innerHTML = '';
      return;
    }
    if (!nearby.places.length) {
      status.textContent = t('nearbyEmpty');
      list.innerHTML = '';
      return;
    }

    var summary = t('nearbyResults', {
      n: nearby.places.length,
      radius: state.radius
    });
    if (window.OtokuFlyers) {
      var cov = window.OtokuFlyers.coverage(nearby.places);
      if (cov.withFlyer) {
        summary += ' · ' + t('nearbyFlyerCoverage', { withFlyers: cov.withFlyer, total: cov.total });
      }
    }
    status.textContent = summary;
    list.innerHTML = nearby.places.map(nearbyItem).join('');
  }

  function findNearbyPlace(placeId) {
    for (var i = 0; i < nearby.places.length; i++) {
      if (nearby.places[i].id === placeId) return nearby.places[i];
    }
    return null;
  }

  function setActiveNearbyItem(placeId) {
    $all('#nearbyList .nearby-item').forEach(function (item) {
      var btn = item.querySelector('[data-place-id]');
      item.classList.toggle('is-active', !!btn && btn.getAttribute('data-place-id') === placeId);
    });
  }

  function scrollNearbyIntoView(placeId) {
    var list = $('#nearbyList');
    if (!list) return;
    var btn = null;
    try {
      btn = list.querySelector('[data-place-id="' + placeId + '"]');
    } catch (e) { btn = null; }
    if (btn && btn.scrollIntoView) btn.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- actions ---------- */

  function clearFilters(alsoRadius) {
    state.cat = 'all';
    state.shop = 'all';
    state.minDiscount = 0;
    state.q = '';
    state.savedOnly = false;
    if (alsoRadius) {
      state.radius = 10;
      needsFit = true;
    }
    renderAll();
    if (alsoRadius) scheduleNearby(true);
  }

  function bindEvents() {
    var modeWrap = $('#modeSwitch');
    if (modeWrap) {
      modeWrap.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-mode]');
        if (!btn) return;
        state.mode = btn.getAttribute('data-mode');
        renderAll();
      });
    }

    var chips = $('#categoryChips');
    if (chips) {
      chips.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-cat]');
        if (!btn) return;
        state.cat = btn.getAttribute('data-cat');
        renderAll();
      });
    }

    var radius = $('#radiusChips');
    if (radius) {
      radius.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-radius]');
        if (!btn) return;
        state.radius = Number(btn.getAttribute('data-radius'));
        needsFit = true;
        renderAll();
        scheduleNearby(true);
      });
    }

    var area = $('#areaSelect');
    if (area) {
      area.addEventListener('change', function () {
        var picked = areaById(area.value);
        if (!picked) return;
        setLocation(picked.lat, picked.lng, picked.id, {
          toast: t('areaChanged', { area: O.loc(picked.name) })
        });
      });
    }

    var geoBtn = $('#geoBtn');
    if (geoBtn) geoBtn.addEventListener('click', function () { locate(true); });

    var search = $('#searchInput');
    if (search) {
      var onSearch = O.debounce(function () {
        state.q = search.value.trim();
        renderAll();
      }, 160);
      search.addEventListener('input', onSearch);
    }

    var shopSelect = $('#shopSelect');
    if (shopSelect) {
      shopSelect.addEventListener('change', function () {
        state.shop = shopSelect.value;
        renderAll();
      });
    }

    var discountSelect = $('#discountSelect');
    if (discountSelect) {
      discountSelect.addEventListener('change', function () {
        state.minDiscount = Number(discountSelect.value);
        renderAll();
      });
    }

    var savedToggle = $('#savedToggle');
    if (savedToggle) {
      savedToggle.addEventListener('click', function () {
        state.savedOnly = !state.savedOnly;
        updateSavedCount();
        renderResults();
      });
    }

    var clear = $('#clearFilters');
    if (clear) clear.addEventListener('click', function () { clearFilters(false); });

    var emptyReset = $('#emptyReset');
    if (emptyReset) emptyReset.addEventListener('click', function () { clearFilters(true); });

    var clearShop = $('#clearShop');
    if (clearShop) {
      clearShop.addEventListener('click', function () {
        state.shop = 'all';
        renderAll();
      });
    }

    var list = $('#dealList');
    if (list) {
      list.addEventListener('click', function (event) {
        var flyerBtn = event.target.closest('[data-flyer-shop]');
        if (flyerBtn) {
          event.preventDefault();
          openFlyerForShop(flyerBtn.getAttribute('data-flyer-shop'));
          return;
        }
        var btn = event.target.closest('[data-save]');
        if (!btn) return;
        var id = btn.getAttribute('data-save');
        var nowSaved = O.toggleSaved(id);
        btn.classList.toggle('is-saved', nowSaved);
        btn.setAttribute('aria-pressed', nowSaved ? 'true' : 'false');
        btn.setAttribute('aria-label', nowSaved ? t('unsaveDeal') : t('saveDeal'));
        updateSavedCount();
        window.Ui.toast(nowSaved ? t('savedToast') : t('unsavedToast'));
        if (state.savedOnly) renderResults();
      });
    }

    var nearbyList = $('#nearbyList');
    if (nearbyList) {
      nearbyList.addEventListener('click', function (event) {
        var flyerBtn = event.target.closest('[data-flyer-place]');
        if (flyerBtn) {
          event.preventDefault();
          event.stopPropagation();
          openFlyerForPlace(findNearbyPlace(flyerBtn.getAttribute('data-flyer-place')));
          return;
        }
        if (event.target.closest('.nearby-dir')) return;
        var btn = event.target.closest('[data-place-id]');
        if (!btn) return;

        var placeId = btn.getAttribute('data-place-id');
        nearby.activeId = placeId;
        setActiveNearbyItem(placeId);

        if (!mapReady || !window.OtokuMaps) return;
        window.OtokuMaps.renderPlaces(mapPlacesFor(placeId), placeId);
        window.OtokuMaps.focusPlace(placeId);

        if (window.matchMedia && window.matchMedia('(max-width: 1040px)').matches) {
          var card = $('.map-card');
          if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    var nearbyRetry = $('#nearbyRetry');
    if (nearbyRetry) {
      nearbyRetry.addEventListener('click', function () { loadNearby(true); });
    }
  }

  function renderAll() {
    document.title = t('brand') + ' — ' + t('tagline');
    renderControls();
    renderResults();
  }

  function preloadOtokuData() {
    var jobs = [];
    if (window.OtokuStores) {
      jobs.push(window.OtokuStores.load().catch(function () { return null; }));
    }
    if (window.OtokuFlyers) {
      jobs.push(window.OtokuFlyers.load().catch(function () { return null; }));
    }
    if (!jobs.length) {
      renderAll();
      scheduleNearby(true);
      return;
    }
    Promise.all(jobs).then(function () {
      renderAll();
      scheduleNearby(true);
    });
  }

  function init() {
    var saved = O.getLocation();
    state.lat = saved.lat;
    state.lng = saved.lng;
    state.areaId = saved.areaId || 'tokyo';

    refreshShops();
    initFlyerDialog();
    initMap();
    buildAreaOptions();
    bindEvents();
    renderAll();
    preloadOtokuData();
    maybeAutoLocate();

    window.addEventListener('langchange', function () {
      renderAll();
      scheduleNearby(true);
    });

    window.addEventListener('storage', function (event) {
      if (!event.key || event.key.indexOf('otoku_') === 0) renderAll();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
