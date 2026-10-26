/* OtokuMap — tiny shared UI helpers (language buttons + toast) */
(function () {
  var toastTimer = null;

  function syncLangButtons() {
    document.querySelectorAll('[data-lang]').forEach(function (btn) {
      var active = btn.getAttribute('data-lang') === window.I18N.lang;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function toast(message) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('is-visible');
    }, 2800);
  }

  function closeOnBackdrop(dialog) {
    if (!dialog) return;
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    var lang = params.get('lang');
    if (lang && window.STRINGS[lang]) {
      window.I18N.setLang(lang);
    }
    document.querySelectorAll('.lang-switch [data-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.I18N.setLang(btn.getAttribute('data-lang'));
      });
    });
    syncLangButtons();
    window.addEventListener('langchange', syncLangButtons);
  }

  document.addEventListener('DOMContentLoaded', init);

  window.Ui = { toast: toast, closeOnBackdrop: closeOnBackdrop };
})();
