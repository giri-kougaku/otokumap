/* OtokuMap — flyer lookup and matching for data/flyers.json. */
(function () {
  'use strict';

  var CHAIN_ALIASES = [
    ['seijoishii', ['成城石井', 'seijo ishii', 'seijoishii']],
    ['kinokuniya', ['紀ノ国屋', '紀伊國屋', 'kinokuniya']],
    ['itoyokado', ['イトーヨーカドー', 'イトーヨーカ堂', 'itoyokado', 'ito-yokado', 'ヨークマート']],
    ['maxvalu', ['マックスバリュ', 'maxvalu', 'max valu']],
    ['aeon', ['イオンスタイル', 'イオン', 'aeon', 'aeon style']],
    ['daiei', ['ダイエー', 'daiei']],
    ['seiyu', ['西友', 'seiyu', 'livin', 'リヴィン']],
    ['life', ['ライフコーポレーション', 'ライフ', 'life', 'ビオラル', 'bio-ral', 'セントラルスクエア']],
    ['summit', ['サミットストア', 'サミット', 'summit store', 'summit']],
    ['gyomu', ['業務スーパー', 'gyomu super', 'gyomusuper', '神戸物産']],
    ['ok', ['オーケーストア', 'オーケー', 'ok store', 'ok-store', 'ok corporation']],
    ['donki', ['ドン・キホーテ', 'ドンキホーテ', 'ドンキ', 'don quijote', 'donki', 'mega donki', 'megaドンキ']],
    ['costco', ['コストコ', 'costco']],
    ['maruetsu', ['マルエツ', 'maruetsu']],
    ['yaoko', ['ヤオコー', 'yaoko']],
    ['belc', ['ベルク', 'belc']],
    ['valor', ['バロー', 'valor']],
    ['trial', ['トライアル', 'trial']],
    ['inageya', ['いなげや', 'inageya']],
    ['ropia', ['ロピア', 'ropia']],
    ['maibasket', ['まいばすけっと', 'maibasket']],
    ['acore', ['アコレ', 'acore']],
    ['tokyustore', ['東急ストア', 'tokyu store', 'tokyustore']],
    ['keiostore', ['京王ストア', 'keio store', 'keiostore']],
    ['odakyuox', ['小田急ox', 'odakyu ox', 'odakyuox']],
    ['santoku', ['三徳', 'santoku']],
    ['marusho', ['マルショク', 'marusho']],
    ['fresco', ['フレスコ', 'fresco']],
    ['harvest', ['ハーベスト', 'harvest']]
  ];

  var state = {
    data: null,
    promise: null,
    error: null,
    byChain: {}
  };

  function norm(value) {
    return String(value == null ? '' : value)
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\s\u3000]+/g, '')
      .replace(/[・･.,，、。'"“”‘’()（）【】\[\]「」『』<>＜＞/\\|_\-—–]/g, '');
  }

  function chainFor() {
    var hay = norm(Array.prototype.slice.call(arguments).filter(Boolean).join(' '));
    if (!hay) return 'other';
    for (var i = 0; i < CHAIN_ALIASES.length; i++) {
      var chain = CHAIN_ALIASES[i][0];
      var names = CHAIN_ALIASES[i][1];
      for (var j = 0; j < names.length; j++) {
        if (hay.indexOf(norm(names[j])) !== -1) return chain;
      }
    }
    return 'other';
  }

  function todayYmd() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function isCurrent(flyer) {
    if (!flyer || !flyer.validTo) return true;
    var end = new Date(flyer.validTo + 'T23:59:59');
    if (Number.isNaN(end.getTime())) return true;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return end.getTime() >= today.getTime() - 86400000;
  }

  function load() {
    if (state.data) return Promise.resolve(state.data);
    if (state.promise) return state.promise;
    state.promise = fetch('data/flyers.json', { cache: 'no-cache', headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('flyers.json HTTP ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        var flyers = payload && Array.isArray(payload.flyers) ? payload.flyers : [];
        var byChain = {};
        flyers.forEach(function (f) {
          if (!f || !f.chain || !isCurrent(f)) return;
          if (!byChain[f.chain]) byChain[f.chain] = [];
          byChain[f.chain].push(f);
        });
        state.data = {
          generatedAt: payload && payload.generatedAt ? payload.generatedAt : null,
          coverage: (payload && payload.coverage) || {},
          flyers: flyers,
          byChain: byChain
        };
        state.byChain = byChain;
        return state.data;
      })
      .catch(function (err) {
        state.error = err;
        throw err;
      });
    return state.promise;
  }

  function addressScore(a, b) {
    var na = norm(a);
    var nb = norm(b);
    if (!na || !nb) return 0;
    if (na.indexOf(nb) !== -1 || nb.indexOf(na) !== -1) return 55;

    var set = {};
    for (var i = 0; i < nb.length - 1; i++) set[nb.slice(i, i + 2)] = true;
    var hit = 0;
    var total = 0;
    for (var j = 0; j < na.length - 1; j++) {
      total++;
      if (set[na.slice(j, j + 2)]) hit++;
    }
    var ratio = total ? hit / total : 0;
    return ratio >= 0.55 ? 30 : ratio >= 0.35 ? 15 : 0;
  }

  function distanceKm(a, b) {
    if (!a || !b || typeof a.lat !== 'number' || typeof a.lng !== 'number' ||
      typeof b.lat !== 'number' || typeof b.lng !== 'number') return null;
    if (window.Otoku && window.Otoku.haversine) return window.Otoku.haversine(a.lat, a.lng, b.lat, b.lng);
    return null;
  }

  function matchScore(flyer, store) {
    if (!flyer || !store || flyer.chain !== store.chain) return -1;
    if (!isCurrent(flyer)) return -1;

    var score = 0;
    var levelRank = { store: 3, region: 2, chain: 1 };

    if (flyer.level === 'store') {
      var fn = norm(flyer.storeName);
      var sn = norm(store.storeName || store.name || '');
      if (fn && sn) {
        if (sn.indexOf(fn) !== -1 || fn.indexOf(sn) !== -1) score += 90;
        else {
          var fn2 = fn.replace(/店$/g, '');
          var sn2 = sn.replace(/店$/g, '');
          if (fn2 && (sn2.indexOf(fn2) !== -1 || fn2.indexOf(sn2) !== -1)) score += 70;
        }
      }
      score += addressScore(flyer.address, store.address);
      var d = distanceKm(flyer, store);
      if (d != null) {
        if (d <= 0.15) score += 100;
        else if (d <= 0.5) score += 70;
        else if (d <= 1.2) score += 30;
        else if (d <= 3) score += 5;
      }
      if (score < 30) return -1;
    } else if (flyer.level === 'region') {
      if (flyer.regions && flyer.regions.length && store.prefecture) {
        if (flyer.regions.indexOf(store.prefecture) !== -1) score += 75;
      }
      if (flyer.regionLabel && store.address && norm(store.address).indexOf(norm(flyer.regionLabel)) !== -1) {
        score += 45;
      }
      if (score < 30) return -1;
    } else {
      score = 5;
    }

    score += levelRank[flyer.level] || 0;
    return score;
  }

  function pick(store) {
    if (!state.data || !store || !store.chain || store.chain === 'other') return null;
    var candidates = state.byChain[store.chain] || [];
    var best = null;
    var bestScore = -1;

    for (var i = 0; i < candidates.length; i++) {
      var flyer = candidates[i];
      var score = matchScore(flyer, store);
      if (score < 0) continue;
      if (score > bestScore ||
        (score === bestScore && best && flyer.level === 'store' && best.flyer.level !== 'store') ||
        (score === bestScore && best && flyer.image && !best.flyer.image)) {
        best = { flyer: flyer, score: score };
        bestScore = score;
      }
    }

    if (!best) return null;
    return {
      flyer: best.flyer,
      score: bestScore,
      level: best.flyer.level,
      exact: best.flyer.level === 'store' && bestScore >= 60
    };
  }

  function forStore(store) {
    return pick(store);
  }

  function forShop(shop) {
    if (!shop) return null;
    var brand = window.Otoku ? window.Otoku.loc(shop.brand) : '';
    var branch = window.Otoku ? window.Otoku.loc(shop.branch) : '';
    var address = shop.address && window.Otoku ? window.Otoku.loc(shop.address) : '';
    return pick({
      chain: chainFor(brand, branch, address),
      name: branch || brand,
      storeName: branch || brand,
      brand: brand,
      address: address,
      lat: shop.lat,
      lng: shop.lng,
      prefecture: ''
    });
  }

  function coverage(stores) {
    var total = 0;
    var withFlyer = 0;
    (stores || []).forEach(function (store) {
      total++;
      if (forStore(store)) withFlyer++;
    });
    return { total: total, withFlyer: withFlyer };
  }

  function summary() {
    if (!state.data) return { chains: 0, flyers: 0, withImage: 0, generatedAt: null };
    var flyers = state.data.flyers || [];
    return {
      chains: Object.keys(state.byChain).length,
      flyers: flyers.length,
      withImage: flyers.filter(function (f) { return !!f.image; }).length,
      generatedAt: state.data.generatedAt
    };
  }

  window.OtokuFlyers = {
    load: load,
    forStore: forStore,
    forShop: forShop,
    coverage: coverage,
    summary: summary,
    chainFor: chainFor,
    isCurrent: isCurrent,
    error: function () { return state.error; }
  };
})();
