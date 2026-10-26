/* OtokuMap — OpenStreetMap supermarket index (static data/stores.json). */
(function () {
  'use strict';

  var state = {
    data: null,
    promise: null,
    error: null
  };

  function load() {
    if (state.data) return Promise.resolve(state.data);
    if (state.promise) return state.promise;
    state.promise = fetch('data/stores.json', { cache: 'no-cache', headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('stores.json HTTP ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        var stores = payload && Array.isArray(payload.stores) ? payload.stores : [];
        state.data = {
          generatedAt: payload && payload.generatedAt ? payload.generatedAt : null,
          source: (payload && payload.source) || 'OpenStreetMap',
          license: (payload && payload.license) || '',
          stores: stores
        };
        return state.data;
      })
      .catch(function (err) {
        state.error = err;
        throw err;
      });
    return state.promise;
  }

  function haversine(lat1, lng1, lat2, lng2) {
    if (window.Otoku && window.Otoku.haversine) return window.Otoku.haversine(lat1, lng1, lat2, lng2);
    var R = 6371;
    var rad = Math.PI / 180;
    var dLat = (lat2 - lat1) * rad;
    var dLng = (lng2 - lng1) * rad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function addressOf(store) {
    if (store.address) return store.address;
    return store.prefecture || '';
  }

  function nearby(lat, lng, radiusKm, opts) {
    opts = opts || {};
    if (!state.data) return [];
    var radius = Number(radiusKm) || 10;
    var out = [];

    for (var i = 0; i < state.data.stores.length; i++) {
      var store = state.data.stores[i];
      if (!store || typeof store.lat !== 'number' || typeof store.lng !== 'number') continue;
      var distance = haversine(lat, lng, store.lat, store.lng);
      if (distance > radius) continue;
      out.push({
        id: store.id,
        name: store.name,
        nameEn: store.nameEn || '',
        address: addressOf(store),
        lat: store.lat,
        lng: store.lng,
        distance: distance,
        rating: null,
        ratingCount: 0,
        status: '',
        source: 'osm',
        sourceLabel: 'OpenStreetMap',
        brand: store.brand || '',
        chain: store.chain || 'other',
        storeName: store.name,
        prefecture: store.prefecture || '',
        region: store.region || '',
        website: store.website || ''
      });
    }

    out.sort(function (a, b) {
      return a.distance - b.distance || String(a.name).localeCompare(String(b.name), 'ja');
    });

    if (opts.limit && opts.limit > 0) return out.slice(0, opts.limit);
    return out;
  }

  function count() {
    return state.data ? state.data.stores.length : 0;
  }

  window.OtokuStores = {
    load: load,
    nearby: nearby,
    count: count,
    generatedAt: function () { return state.data ? state.data.generatedAt : null; },
    error: function () { return state.error; }
  };
})();
