/* OtokuMap — shop login + dashboard (front-end demo auth) */
(function () {
  'use strict';

  var O = window.Otoku;
  var t = window.t;

  var ACCOUNTS = [
    { email: 'aeon@demo.jp',  password: 'demo1234', shopId: 'aeon' },
    { email: 'seiyu@demo.jp', password: 'demo1234', shopId: 'seiyu' },
    { email: 'gyomu@demo.jp', password: 'demo1234', shopId: 'gyomu' },
    { email: 'life@demo.jp',  password: 'demo1234', shopId: 'life' }
  ];

  var page = document.body.getAttribute('data-page');

  function $(sel) { return document.querySelector(sel); }
  function esc(v) { return O.esc(v); }

  /* =========================================================
     Login page
     ========================================================= */

  function renderDemoAccounts() {
    var list = $('#demoList');
    if (!list) return;
    list.innerHTML = ACCOUNTS.map(function (acc) {
      var shop = O.shopById(acc.shopId);
      var name = shop ? O.shopLabel(shop) : acc.shopId;
      return '<button type="button" class="demo-btn" data-email="' + esc(acc.email) + '">' +
        '<strong>' + esc(name) + '</strong>' +
        '<span>' + esc(acc.email) + '</span>' +
        '</button>';
    }).join('');
  }

  function renderMockDeals() {
    var wrap = $('#authMock');
    if (!wrap) return;
    var picks = ['aeon-1', 'life-3', 'costco-2'];
    wrap.innerHTML = picks.map(function (id) {
      var seed = null;
      window.SEED_DEALS.forEach(function (d) { if (d.id === id) seed = d; });
      if (!seed) return '';
      var shop = O.shopById(seed.shopId);
      var cat = O.categoryById(seed.cat);
      return '<div class="mock-deal">' +
        '<span class="mock-thumb" aria-hidden="true">' + cat.emoji + '</span>' +
        '<div class="mock-copy">' +
          '<strong>' + esc(O.loc(seed.name)) + '</strong>' +
          '<span>' + esc(O.loc(shop.brand)) + ' ' + esc(O.loc(shop.branch)) + '</span>' +
        '</div>' +
        '<div class="mock-price"><b>' + O.yen(seed.now) + '</b><s>' + O.yen(seed.was) + '</s></div>' +
      '</div>';
    }).join('');
  }

  function showLoginError(message) {
    var box = $('#loginError');
    if (!box) return;
    box.textContent = message;
    box.classList.add('is-visible');
  }

  function hideLoginError() {
    var box = $('#loginError');
    if (!box) return;
    box.classList.remove('is-visible');
  }

  function initLogin() {
    var existing = O.getSession();
    if (existing) {
      var existingShop = O.shopById(existing.shopId);
      if (existingShop) {
        window.location.replace('dashboard.html');
        return;
      }
      O.clearSession();
    }

    document.title = t('loginTitle') + ' — ' + t('brand');
    renderDemoAccounts();
    renderMockDeals();

    var list = $('#demoList');
    if (list) {
      list.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-email]');
        if (!btn) return;
        var email = btn.getAttribute('data-email');
        var acc = null;
        ACCOUNTS.forEach(function (a) { if (a.email === email) acc = a; });
        if (!acc) return;
        $('#email').value = acc.email;
        $('#password').value = acc.password;
        hideLoginError();
        $('#loginBtn').focus();
      });
    }

    var form = $('#loginForm');
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var email = $('#email').value.trim().toLowerCase();
        var password = $('#password').value;
        if (!email || !password) {
          showLoginError(t('errRequired'));
          return;
        }
        var match = null;
        ACCOUNTS.forEach(function (a) {
          if (a.email === email && a.password === password) match = a;
        });
        if (!match) {
          showLoginError(t('errInvalid'));
          return;
        }
        O.setSession({ email: match.email, shopId: match.shopId, at: Date.now() });
        window.location.href = 'dashboard.html';
      });
    }

    ['#email', '#password'].forEach(function (sel) {
      var input = $(sel);
      if (input) input.addEventListener('input', hideLoginError);
    });

    window.addEventListener('langchange', function () {
      document.title = t('loginTitle') + ' — ' + t('brand');
      renderDemoAccounts();
      renderMockDeals();
      hideLoginError();
    });
  }

  /* =========================================================
     Dashboard
     ========================================================= */

  function initDashboard() {
    var session = O.getSession();
    if (!session) {
      window.location.replace('login.html');
      return;
    }
    var shop = O.shopById(session.shopId);
    if (!shop) {
      O.clearSession();
      window.location.replace('login.html');
      return;
    }

    var currentDeals = [];
    var editingId = null;

    var shopChipDot = $('#shopChipDot');
    var shopChipName = $('#shopChipName');
    if (shopChipDot) shopChipDot.style.setProperty('--dot', shop.color);
    if (shopChipName) shopChipName.textContent = O.shopLabel(shop);

    function decorate(deal) {
      var days = O.daysLeft(deal.ends);
      return {
        raw: deal,
        days: days,
        disc: O.discountPct(deal.was, deal.now),
        active: deal.active !== false,
        expired: days < 0
      };
    }

    function dateLabel(ymd) {
      var d = new Date(ymd + 'T00:00:00');
      return d.toLocaleDateString(window.I18N.lang === 'ja' ? 'ja-JP' : 'en-GB', {
        month: 'short', day: 'numeric'
      });
    }

    function expiryText(days) {
      if (days < 0) return t('expired');
      if (days === 0) return t('endsToday');
      if (window.I18N.lang === 'ja') return t('daysLeft', { n: days });
      if (days === 1) return t('endsTomorrow');
      return t('daysLeft', { n: days });
    }

    function renderStats(rows) {
      var live = rows.filter(function (r) { return r.active && !r.expired; });
      var pausedOrExpired = rows.length - live.length;
      var avg = live.length
        ? Math.round(live.reduce(function (sum, r) { return sum + r.disc; }, 0) / live.length)
        : 0;
      var best = live.slice().sort(function (a, b) { return b.disc - a.disc; })[0] || null;
      var ending = live.filter(function (r) { return r.days <= 2; }).length;

      var elActive = $('#statActive');
      var elAvg = $('#statAvg');
      var elBest = $('#statBest');
      var elEnding = $('#statEnding');
      if (elActive) elActive.textContent = String(live.length);
      if (elAvg) elAvg.textContent = avg + '%';
      if (elBest) elBest.textContent = best ? best.disc + '%' : '—';
      if (elEnding) elEnding.textContent = String(ending);

      var activeSub = $('#statActiveSub');
      if (activeSub) {
        activeSub.textContent = pausedOrExpired > 0
          ? t('statActiveSub', { n: rows.length }) + ' · ' + t('statInactiveSub', { n: pausedOrExpired })
          : t('statActiveSub', { n: rows.length });
      }

      var bestSub = $('#statBestSub');
      if (bestSub) bestSub.textContent = best ? O.loc(best.raw.name) : '—';
    }

    function rowHTML(r) {
      var d = r.raw;
      var cat = O.categoryById(d.cat);
      var note = O.loc(d.note);
      var statusText = r.expired ? t('statusExpired') : (r.active ? t('statusActive') : t('statusPaused'));
      var statusClass = r.expired ? 'is-expired' : (r.active ? 'is-live' : 'is-paused');
      var pauseLabel = r.active ? t('pause') : t('resume');
      var pauseIcon = r.active
        ? '<path d="M9 5v14M15 5v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
        : '<path d="M7 4.5v15l12-7.5-12-7.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>';

      return '<article class="dash-deal' + (r.active && !r.expired ? '' : ' is-paused') + '" data-id="' + esc(d.id) + '">' +
        '<div class="dash-prod">' +
          '<span class="dash-thumb cat-' + esc(d.cat) + '" aria-hidden="true">' + cat.emoji + '</span>' +
          '<div class="dash-prod-copy">' +
            '<h3>' + esc(O.loc(d.name)) + '</h3>' +
            '<p>' + (note ? esc(note) + ' · ' : '') + esc(t('posted')) + ' ' + esc(dateLabel(d.postedAt || d.ends)) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="dash-col dash-col--cat"><span class="dash-label">' + esc(t('colCat')) + '</span>' + esc(t('cat_' + d.cat)) + '</div>' +
        '<div class="dash-col dash-col--price"><span class="dash-label">' + esc(t('colPrice')) + '</span>' +
          '<s>' + O.yen(d.was) + '</s><strong>' + O.yen(d.now) + '</strong></div>' +
        '<div class="dash-col dash-col--disc"><span class="dash-label">' + esc(t('colDiscount')) + '</span>' +
          '<span class="off-pill">−' + r.disc + '%</span></div>' +
        '<div class="dash-col dash-col--ends"><span class="dash-label">' + esc(t('colEnds')) + '</span>' +
          esc(dateLabel(d.ends)) + '<span>' + esc(expiryText(r.days)) + '</span></div>' +
        '<div class="dash-col dash-col--status"><span class="dash-label">' + esc(t('colStatus')) + '</span>' +
          '<span class="status-pill ' + statusClass + '">' + esc(statusText) + '</span></div>' +
        '<div class="dash-actions">' +
          '<button type="button" class="row-action" data-action="edit" title="' + esc(t('edit')) + '" aria-label="' + esc(t('edit')) + '">' +
            '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4 20 4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>' +
            '<span>' + esc(t('edit')) + '</span></button>' +
          '<button type="button" class="row-action" data-action="toggle" title="' + esc(pauseLabel) + '" aria-label="' + esc(pauseLabel) + '">' +
            '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' + pauseIcon + '</svg>' +
            '<span>' + esc(pauseLabel) + '</span></button>' +
          '<button type="button" class="row-action row-action--danger" data-action="delete" title="' + esc(t('delete')) + '" aria-label="' + esc(t('delete')) + '">' +
            '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v5M14 11v5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '<span>' + esc(t('delete')) + '</span></button>' +
        '</div>' +
      '</article>';
    }

    function renderDeals(rows) {
      var wrap = $('#dashDeals');
      if (!wrap) return;

      if (!rows.length) {
        wrap.innerHTML = '<div class="dash-empty">' +
          '<span aria-hidden="true">🏷️</span>' +
          '<h3>' + esc(t('noDeals')) + '</h3>' +
          '<p>' + esc(t('noDealsBody')) + '</p>' +
          '<button type="button" class="btn btn-primary btn-sm" data-action="add">' + esc(t('addDeal')) + '</button>' +
        '</div>';
        return;
      }

      wrap.innerHTML = rows.map(rowHTML).join('');
    }

    function renderDashboard() {
      document.title = t('dashTitle') + ' — ' + t('brand');

      var welcome = $('#dashWelcome');
      if (welcome) welcome.textContent = t('dashWelcome', { shop: O.shopLabel(shop) });

      var chipName = $('#shopChipName');
      if (chipName) chipName.textContent = O.shopLabel(shop);

      var deals = O.allDeals().filter(function (d) { return d.shopId === shop.id; });
      var rows = deals.map(decorate);

      rows.sort(function (a, b) {
        var rankA = a.expired ? 2 : (a.active ? 0 : 1);
        var rankB = b.expired ? 2 : (b.active ? 0 : 1);
        return rankA - rankB || a.days - b.days || O.loc(a.raw.name).localeCompare(O.loc(b.raw.name));
      });

      currentDeals = rows;
      renderStats(rows);
      renderDeals(rows);

      var sub = $('#dialogSub');
      if (sub) sub.textContent = O.shopLabel(shop);
    }

    /* ---- dialog ---- */

    function buildCategoryOptions() {
      var select = $('#fieldCat');
      if (!select) return;
      select.innerHTML = window.CATEGORIES.map(function (c) {
        return '<option value="' + c.id + '">' + c.emoji + ' ' + esc(t('cat_' + c.id)) + '</option>';
      }).join('');
    }

    function updateDialogLabels() {
      var title = $('#dialogTitle');
      var saveBtn = $('#saveBtn');
      if (title) title.textContent = editingId ? t('modalEdit') : t('modalAdd');
      if (saveBtn) saveBtn.textContent = editingId ? t('saveChanges') : t('save');
    }

    function clearFormError() {
      var box = $('#formError');
      if (!box) return;
      box.textContent = '';
      box.classList.remove('is-visible');
    }

    function showFormError(message) {
      var box = $('#formError');
      if (!box) return;
      box.textContent = message;
      box.classList.add('is-visible');
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function updatePreview() {
      var cat = O.categoryById($('#fieldCat').value);
      var thumb = $('#previewThumb');
      if (thumb) {
        thumb.className = 'preview-thumb cat-' + cat.id;
        thumb.textContent = cat.emoji;
      }

      var nameJa = $('#fieldNameJa').value.trim();
      var nameEn = $('#fieldNameEn').value.trim();
      var nameEl = $('#previewName');
      if (nameEl) nameEl.textContent = nameJa || nameEn || '—';

      var was = Number($('#fieldWas').value) || 0;
      var now = Number($('#fieldNow').value) || 0;
      var wasEl = $('#previewWas');
      var nowEl = $('#previewNow');
      var offEl = $('#previewOff');
      if (wasEl) wasEl.textContent = was > 0 ? O.yen(was) : '';
      if (nowEl) nowEl.textContent = now > 0 ? O.yen(now) : '—';

      if (offEl) {
        if (was > 0 && now > 0 && now < was) {
          offEl.hidden = false;
          offEl.textContent = '−' + O.discountPct(was, now) + '%';
        } else {
          offEl.hidden = true;
        }
      }
    }

    function openDialog(dealId) {
      editingId = dealId || null;
      clearFormError();
      updateDialogLabels();

      if (editingId) {
        var found = null;
        currentDeals.forEach(function (r) { if (r.raw.id === editingId) found = r; });
        if (found) {
          var d = found.raw;
          $('#fieldNameJa').value = (d.name && d.name.ja) || '';
          $('#fieldNameEn').value = (d.name && d.name.en) || '';
          $('#fieldCat').value = d.cat;
          $('#fieldEnds').value = d.ends;
          $('#fieldWas').value = d.was;
          $('#fieldNow').value = d.now;
          $('#fieldNoteJa').value = (d.note && d.note.ja) || '';
          $('#fieldNoteEn').value = (d.note && d.note.en) || '';
          $('#fieldActive').checked = d.active !== false;
        }
      } else {
        $('#fieldNameJa').value = '';
        $('#fieldNameEn').value = '';
        $('#fieldCat').value = window.CATEGORIES[0].id;
        $('#fieldEnds').value = O.addDays(3);
        $('#fieldWas').value = '';
        $('#fieldNow').value = '';
        $('#fieldNoteJa').value = '';
        $('#fieldNoteEn').value = '';
        $('#fieldActive').checked = true;
      }

      updatePreview();

      var dialog = $('#dealDialog');
      if (dialog && typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal();
        setTimeout(function () { $('#fieldNameJa').focus(); }, 40);
      }
    }

    function closeDialog() {
      var dialog = $('#dealDialog');
      if (dialog && dialog.open) dialog.close();
      editingId = null;
      clearFormError();
    }

    function bindDashboardEvents() {
      ['#addDealBtn', '#addDealBtn2'].forEach(function (sel) {
        var btn = $(sel);
        if (btn) btn.addEventListener('click', function () { openDialog(null); });
      });

      var closeBtn = $('#dialogClose');
      if (closeBtn) closeBtn.addEventListener('click', closeDialog);
      var cancelBtn = $('#cancelBtn');
      if (cancelBtn) cancelBtn.addEventListener('click', closeDialog);

      var dialog = $('#dealDialog');
      if (dialog) {
        Ui.closeOnBackdrop(dialog);
        dialog.addEventListener('cancel', function () { editingId = null; });
      }

      var form = $('#dealForm');
      if (form) {
        form.addEventListener('input', updatePreview);
        form.addEventListener('change', updatePreview);
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          clearFormError();

          var nameJa = $('#fieldNameJa').value.trim();
          var nameEn = $('#fieldNameEn').value.trim();
          var cat = $('#fieldCat').value;
          var ends = $('#fieldEnds').value;
          var was = Number($('#fieldWas').value);
          var now = Number($('#fieldNow').value);
          var active = $('#fieldActive').checked;

          if (!nameJa && !nameEn) return showFormError(t('errName'));
          if (!cat) return showFormError(t('errCat'));
          if (!(was > 0) || !(now > 0) || now >= was) return showFormError(t('errPrice'));
          if (!ends || O.daysLeft(ends) < 0) return showFormError(t('errDate'));

          var fields = {
            name: { en: nameEn || nameJa, ja: nameJa || nameEn },
            note: {
              en: $('#fieldNoteEn').value.trim(),
              ja: $('#fieldNoteJa').value.trim()
            },
            cat: cat,
            was: was,
            now: now,
            ends: ends,
            active: active
          };

          if (editingId) {
            var original = null;
            currentDeals.forEach(function (r) { if (r.raw.id === editingId) original = r.raw; });
            O.saveDeal(Object.assign({}, original || {}, fields, { id: editingId }));
          } else {
            O.saveDeal(Object.assign({
              id: O.newDealId(),
              shopId: shop.id,
              postedAt: O.addDays(0)
            }, fields));
          }

          closeDialog();
          renderDashboard();
          Ui.toast(t('dealSaved'));
        });
      }

      var logoutBtn = $('#logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
          if (!window.confirm(t('logoutConfirm'))) return;
          O.clearSession();
          window.location.href = 'login.html';
        });
      }

      var resetBtn = $('#resetBtn');
      if (resetBtn) {
        resetBtn.addEventListener('click', function () {
          if (!window.confirm(t('resetConfirm'))) return;
          O.resetDemo();
          renderDashboard();
          Ui.toast(t('resetDone'));
        });
      }

      var dealsWrap = $('#dashDeals');
      if (dealsWrap) {
        dealsWrap.addEventListener('click', function (event) {
          var actionEl = event.target.closest('[data-action]');
          if (!actionEl) return;
          var action = actionEl.getAttribute('data-action');

          if (action === 'add') { openDialog(null); return; }

          var row = event.target.closest('.dash-deal');
          if (!row) return;
          var id = row.getAttribute('data-id');
          var found = null;
          currentDeals.forEach(function (r) { if (r.raw.id === id) found = r; });
          if (!found) return;

          if (action === 'edit') {
            openDialog(id);
          } else if (action === 'delete') {
            if (!window.confirm(t('confirmDelete'))) return;
            O.deleteDeal(id);
            renderDashboard();
            Ui.toast(t('dealDeleted'));
          } else if (action === 'toggle') {
            var next = !found.active;
            O.setDealActive(id, next);
            renderDashboard();
            Ui.toast(next ? t('dealResumed') : t('dealPaused'));
          }
        });
      }
    }

    buildCategoryOptions();
    var endsInput = $('#fieldEnds');
    if (endsInput) endsInput.min = O.addDays(0);
    bindDashboardEvents();
    renderDashboard();

    window.addEventListener('langchange', function () {
      var dialog = $('#dealDialog');
      var catValue = dialog && dialog.open ? $('#fieldCat').value : null;
      buildCategoryOptions();
      if (catValue) $('#fieldCat').value = catValue;
      updateDialogLabels();
      updatePreview();
      renderDashboard();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (page === 'login') initLogin();
    else if (page === 'dashboard') initDashboard();
  });
})();
