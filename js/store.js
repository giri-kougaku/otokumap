/* OtokuMap — shared data layer, demo storage and small helpers */
(function () {
  var K_LOCAL = 'otoku_local_deals_v1';
  var K_OVERRIDES = 'otoku_overrides_v1';
  var K_SAVED = 'otoku_saved_v1';
  var K_LOCATION = 'otoku_location_v1';
  var K_SESSION = 'otoku_shop_session';

  var DAY = 86400000;

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var val = JSON.parse(raw);
      return val == null ? fallback : val;
    } catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage full / blocked */ }
  }
  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }
  function parseYmd(s) {
    var p = String(s || '').split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function addDays(n) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return ymd(d);
  }
  function daysLeft(ends) {
    var end = parseYmd(ends);
    end.setHours(0, 0, 0, 0);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((end - today) / DAY);
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function loc(obj) {
    if (!obj) return '';
    var lang = window.I18N ? window.I18N.lang : 'en';
    var other = lang === 'ja' ? 'en' : 'ja';
    return obj[lang] || obj[other] || obj.en || obj.ja || '';
  }

  function shopById(id) {
    for (var i = 0; i < window.SHOPS.length; i++) {
      if (window.SHOPS[i].id === id) return window.SHOPS[i];
    }
    return null;
  }

  function shopLabel(shop) {
    if (!shop) return '';
    var brand = loc(shop.brand);
    var branch = loc(shop.branch);
    if (!branch) return brand;
    return brand + (window.I18N && window.I18N.lang === 'ja' ? ' ' : ' ') + branch;
  }

  function categoryById(id) {
    for (var i = 0; i < window.CATEGORIES.length; i++) {
      if (window.CATEGORIES[i].id === id) return window.CATEGORIES[i];
    }
    return window.CATEGORIES[0];
  }

  function haversine(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var toRad = function (d) { return d * Math.PI / 180; };
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function yen(n) {
    return '¥' + Number(n || 0).toLocaleString('ja-JP');
  }

  function distanceLabel(km) {
    if (km < 1) {
      var m = Math.max(10, Math.round(km * 1000 / 10) * 10);
      return m + ' m';
    }
    return km.toFixed(1) + ' km';
  }

  function discountPct(was, now) {
    if (!was || was <= 0) return 0;
    return Math.max(0, Math.round((1 - now / was) * 100));
  }

  function urgency(days) {
    if (days <= 0) return 1;
    if (days <= 1) return 0.95;
    if (days <= 3) return 0.7;
    if (days <= 7) return 0.45;
    return 0.2;
  }

  function dealScore(deal) {
    var disc = Math.max(0, 1 - deal.now / deal.was);
    var value = 1 - Math.min(deal.now / 3000, 1);
    return Math.max(1, Math.min(99, Math.round(disc * 100 + urgency(daysLeft(deal.ends)) * 22 + value * 10)));
  }

  function getOverrides() { return read(K_OVERRIDES, {}); }
  function getLocalDeals() { return read(K_LOCAL, []); }

  /** Every deal after seeded data + local posts + shop edits are applied. */
  function allDeals() {
    var overrides = getOverrides();
    var out = [];

    window.SEED_DEALS.forEach(function (d) {
      var ovr = overrides[d.id];
      if (ovr && ovr._deleted) return;
      var deal = {
        id: d.id,
        shopId: d.shopId,
        cat: d.cat,
        name: d.name,
        note: d.note || {},
        was: d.was,
        now: d.now,
        ends: addDays(d.endsIn == null ? 3 : d.endsIn),
        postedAt: addDays(-(d.postedDaysAgo || 0)),
        active: true,
        source: 'seed'
      };
      if (ovr) {
        ['cat', 'name', 'note', 'was', 'now', 'ends', 'active'].forEach(function (k) {
          if (ovr[k] !== undefined) deal[k] = ovr[k];
        });
      }
      out.push(deal);
    });

    getLocalDeals().forEach(function (d) {
      if (d._deleted) return;
      out.push(Object.assign({ source: 'local', active: true }, d));
    });

    return out;
  }

  function saveDeal(deal) {
    if (String(deal.id).indexOf('local-') === 0) {
      var list = getLocalDeals();
      var idx = -1;
      for (var i = 0; i < list.length; i++) if (list[i].id === deal.id) idx = i;
      if (idx >= 0) list[idx] = Object.assign({}, list[idx], deal);
      else list.unshift(deal);
      write(K_LOCAL, list);
    } else {
      var ovr = getOverrides();
      var patch = ovr[deal.id] || {};
      ['cat', 'name', 'note', 'was', 'now', 'ends', 'active'].forEach(function (k) {
        if (deal[k] !== undefined) patch[k] = deal[k];
      });
      delete patch._deleted;
      ovr[deal.id] = patch;
      write(K_OVERRIDES, ovr);
    }
  }

  function deleteDeal(id) {
    if (String(id).indexOf('local-') === 0) {
      write(K_LOCAL, getLocalDeals().filter(function (d) { return d.id !== id; }));
    } else {
      var ovr = getOverrides();
      ovr[id] = Object.assign({}, ovr[id], { _deleted: true });
      write(K_OVERRIDES, ovr);
    }
    setSaved(id, false);
  }

  function setDealActive(id, active) {
    if (String(id).indexOf('local-') === 0) {
      var list = getLocalDeals().map(function (d) {
        return d.id === id ? Object.assign({}, d, { active: active }) : d;
      });
      write(K_LOCAL, list);
    } else {
      var ovr = getOverrides();
      ovr[id] = Object.assign({}, ovr[id], { active: active });
      write(K_OVERRIDES, ovr);
    }
  }

  function newDealId() {
    return 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  }

  /* ---- saved deals ---- */
  function getSaved() {
    var v = read(K_SAVED, []);
    return Array.isArray(v) ? v : [];
  }
  function isSaved(id) { return getSaved().indexOf(id) !== -1; }
  function setSaved(id, on) {
    var list = getSaved().filter(function (x) { return x !== id; });
    if (on) list.push(id);
    write(K_SAVED, list);
    return on;
  }
  function toggleSaved(id) { return setSaved(id, !isSaved(id)); }

  /* ---- location ---- */
  function getLocation() {
    var v = read(K_LOCATION, null);
    if (v && typeof v.lat === 'number' && typeof v.lng === 'number') return v;
    return { lat: 35.6812, lng: 139.7671, areaId: 'tokyo' };
  }
  function saveLocation(l) { write(K_LOCATION, l); }

  /* ---- shop session (demo only) ---- */
  function getSession() {
    try {
      var raw = sessionStorage.getItem(K_SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function setSession(s) {
    try { sessionStorage.setItem(K_SESSION, JSON.stringify(s)); } catch (e) { /* ignore */ }
  }
  function clearSession() {
    try { sessionStorage.removeItem(K_SESSION); } catch (e) { /* ignore */ }
  }

  function resetDemo() {
    remove(K_LOCAL);
    remove(K_OVERRIDES);
    remove(K_SAVED);
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  window.Otoku = {
    /* storage */
    allDeals: allDeals,
    saveDeal: saveDeal,
    deleteDeal: deleteDeal,
    setDealActive: setDealActive,
    newDealId: newDealId,
    resetDemo: resetDemo,
    /* saved */
    getSaved: getSaved,
    isSaved: isSaved,
    toggleSaved: toggleSaved,
    setSaved: setSaved,
    /* location */
    getLocation: getLocation,
    saveLocation: saveLocation,
    /* shop auth */
    getSession: getSession,
    setSession: setSession,
    clearSession: clearSession,
    /* helpers */
    ymd: ymd,
    addDays: addDays,
    daysLeft: daysLeft,
    esc: esc,
    loc: loc,
    shopById: shopById,
    shopLabel: shopLabel,
    categoryById: categoryById,
    haversine: haversine,
    yen: yen,
    distanceLabel: distanceLabel,
    discountPct: discountPct,
    dealScore: dealScore,
    debounce: debounce
  };
})();
