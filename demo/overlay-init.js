
(() => {
  const css = `
    html, body { background: #fbf7f0 !important; }
    #demoIntro, #demoOutro, #demoCaption, #demoCursor, #demoProgress {
      font-family: Inter, "Noto Sans JP", system-ui, -apple-system, "Segoe UI", sans-serif;
    }
    #demoIntro, #demoOutro {
      position: fixed; inset: 0; z-index: 2147483646;
      display: flex; align-items: center; justify-content: center;
      opacity: 1; transition: opacity .85s ease;
    }
    #demoIntro {
      background:
        radial-gradient(circle at 18% 18%, rgba(232,66,46,.10), transparent 34%),
        radial-gradient(circle at 82% 78%, rgba(232,66,46,.07), transparent 32%),
        #fbf7f0;
      color: #1d1916;
    }
    #demoIntro.is-hidden { opacity: 0; pointer-events: none; }
    #demoOutro {
      display: none; opacity: 0; color: #fff; text-align: center;
      background:
        radial-gradient(circle at 50% 22%, rgba(232,66,46,.28), transparent 42%),
        #171310;
      transition: opacity .7s ease;
    }
    #demoOutro.is-visible { display: flex; opacity: 1; }
    .demo-intro-inner, .demo-outro-inner { max-width: 1100px; padding: 32px; text-align: center; }
    .demo-logo {
      width: 116px; height: 116px; margin: 0 auto 28px; border-radius: 31px;
      display: grid; place-items: center; color: #fff;
      background: linear-gradient(145deg, #f2553e, #d93422);
      font-size: 69px; font-weight: 800; letter-spacing: -.08em;
      box-shadow: 0 24px 60px rgba(216,48,31,.28), inset 0 1px 0 rgba(255,255,255,.28);
      animation: demoFloat 3.6s ease-in-out infinite;
    }
    @keyframes demoFloat {
      0%, 100% { transform: translateY(0) rotate(-2deg); }
      50% { transform: translateY(-9px) rotate(2deg); }
    }
    .demo-eyebrow {
      font-size: 13px; font-weight: 800; letter-spacing: .22em;
      text-transform: uppercase; color: #d63b28; margin-bottom: 15px;
    }
    .demo-brand { font-size: 82px; line-height: .95; font-weight: 800; letter-spacing: -.055em; }
    .demo-tagline { margin-top: 16px; font-size: 27px; color: #5d554e; font-weight: 500; }
    .demo-pills { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; margin-top: 30px; }
    .demo-pills span {
      padding: 10px 16px; border-radius: 999px; background: rgba(255,255,255,.72);
      border: 1px solid rgba(29,25,22,.09); color: #4c443e; font-size: 15px; font-weight: 600;
      box-shadow: 0 6px 18px rgba(29,25,22,.05);
    }
    .demo-loading {
      display: inline-flex; align-items: center; gap: 10px; margin-top: 36px;
      font-size: 12px; font-weight: 700; letter-spacing: .17em; text-transform: uppercase; color: #948a82;
    }
    .demo-loading i {
      width: 9px; height: 9px; border-radius: 50%; background: #e8422e;
      box-shadow: 0 0 0 0 rgba(232,66,46,.45); animation: demoPing 1.4s infinite;
    }
    .demo-note { margin-top: 13px; font-size: 13px; color: #8b8178; letter-spacing: .01em; }
    .demo-outro-note { margin-top: 14px; font-size: 13px; color: #b6aca3; }
    @keyframes demoPing {
      0% { box-shadow: 0 0 0 0 rgba(232,66,46,.45); }
      70% { box-shadow: 0 0 0 9px rgba(232,66,46,0); }
      100% { box-shadow: 0 0 0 0 rgba(232,66,46,0); }
    }
    .demo-outro-logo {
      width: 92px; height: 92px; margin: 0 auto 24px; border-radius: 25px;
      display: grid; place-items: center; background: #e8422e; color: #fff;
      font-size: 55px; font-weight: 800; letter-spacing: -.08em;
      box-shadow: 0 20px 50px rgba(0,0,0,.32);
    }
    .demo-outro-brand { font-size: 76px; line-height: 1; font-weight: 800; letter-spacing: -.055em; }
    .demo-outro-sub { margin-top: 16px; font-size: 24px; color: #cfc5bb; }
    .demo-outro-url {
      display: inline-block; margin-top: 28px; padding: 14px 22px; border-radius: 12px;
      background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14);
      color: #ffb5a7; font-size: 24px; font-weight: 700; letter-spacing: .01em;
    }
    .demo-outro-facts { margin-top: 22px; font-size: 17px; color: #f0e8df; }
    .demo-outro-foot { margin-top: 8px; font-size: 13px; letter-spacing: .12em; text-transform: uppercase; color: #8d847c; }
    #demoCaption {
      position: fixed; left: 64px; bottom: 42px; width: 880px; z-index: 2147483645;
      padding: 22px 27px 24px; border-left: 5px solid #e8422e; border-radius: 17px;
      background: rgba(23,19,16,.945); color: #fff;
      box-shadow: 0 24px 70px rgba(0,0,0,.34);
      opacity: 0; transform: translateY(14px);
      transition: opacity .35s ease, transform .35s ease;
      overflow: hidden;
    }
    #demoCaption.is-visible { opacity: 1; transform: none; }
    .demo-cap-kicker {
      font-size: 11px; line-height: 1; letter-spacing: .19em;
      text-transform: uppercase; font-weight: 800; color: #ff7a64;
    }
    .demo-cap-title {
      margin-top: 7px; font-size: 31px; line-height: 1.13;
      font-weight: 800; letter-spacing: -.025em;
    }
    .demo-cap-body {
      margin-top: 8px; font-size: 18px; line-height: 1.45;
      color: #d8d0c8; max-width: 760px;
    }
    .demo-cap-step {
      position: absolute; right: 24px; top: 22px;
      font-size: 11px; font-weight: 700; letter-spacing: .12em; color: #8f857d;
    }
    .demo-cap-bar {
      position: absolute; left: 0; bottom: 0; height: 3px; width: 0;
      background: #e8422e; transition: width .5s ease;
    }
    #demoCursor {
      position: fixed; left: 50%; top: 50%; width: 21px; height: 21px;
      z-index: 2147483644; pointer-events: none; border-radius: 50%;
      background: #e8422e; border: 2px solid #fff;
      box-shadow: 0 4px 18px rgba(0,0,0,.38);
      transform: translate(-50%, -50%); opacity: 0;
      transition: left .55s cubic-bezier(.2,.8,.2,1), top .55s cubic-bezier(.2,.8,.2,1), opacity .2s ease;
    }
    #demoCursor.is-visible { opacity: 1; }
    #demoCursor.is-clicking::after {
      content: ""; position: absolute; inset: -9px; border-radius: 50%;
      border: 2px solid rgba(232,66,46,.72); animation: demoClick .55s ease-out;
    }
    @keyframes demoClick {
      from { transform: scale(.55); opacity: 1; }
      to { transform: scale(1.65); opacity: 0; }
    }
    .demo-focus {
      outline: 3px solid #e8422e !important; outline-offset: 4px !important;
      box-shadow: 0 0 0 7px rgba(232,66,46,.16) !important;
      border-radius: 14px !important;
    }
  `;
  const html = `
    <div id="demoIntro">
      <div class="demo-intro-inner">
        <div class="demo-logo">%</div>
        <div class="demo-eyebrow">Graduation project demo</div>
        <div class="demo-brand">OtokuMap</div>
        <div class="demo-tagline">Every supermarket. Every flyer. One map.</div>
        <div class="demo-pills">
          <span>19,754 OSM stores</span>
          <span>896 official flyer links</span>
          <span>English / 日本語</span>
        </div>
        <div class="demo-loading"><i></i><span id="demoLoadingText">Loading live map</span></div>
        <div class="demo-note">Store locations and flyer links are live · deal prices are sample data</div>
      </div>
    </div>
    <div id="demoOutro">
      <div class="demo-outro-inner">
        <div class="demo-outro-logo">%</div>
        <div class="demo-outro-brand">OtokuMap</div>
        <div class="demo-outro-sub">Real supermarkets. Real official flyers.</div>
        <div class="demo-outro-url">giri-kougaku.github.io/otokumap</div>
        <div class="demo-outro-facts">19,754 stores · 896 flyer links · 47 prefectures</div>
        <div class="demo-outro-foot">Free · Static · OpenStreetMap + GitHub Pages</div>
        <div class="demo-outro-note">Store locations and flyer links are real. Deal prices are sample data.</div>
      </div>
    </div>
    <div id="demoCaption">
      <div class="demo-cap-step" id="demoStep"></div>
      <div class="demo-cap-kicker" id="demoKicker"></div>
      <div class="demo-cap-title" id="demoTitle"></div>
      <div class="demo-cap-body" id="demoBody"></div>
      <div class="demo-cap-bar" id="demoBar"></div>
    </div>
    <div id="demoCursor"></div>
  `;
  function mount() {
    if (!document.body) return setTimeout(mount, 20);
    const style = document.createElement('style');
    style.id = 'demoStyle';
    style.textContent = css;
    document.head.appendChild(style);
    const wrap = document.createElement('div');
    wrap.id = 'demoOverlayRoot';
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    const $ = (s) => document.querySelector(s);
    const cursor = $('#demoCursor');
    let focusEl = null;
    window.__demo = {
      hideIntro() {
        const el = $('#demoIntro');
        const loading = $('#demoLoadingText');
        if (loading) loading.textContent = 'Live map ready';
        if (el) el.classList.add('is-hidden');
        setTimeout(() => { if (el) el.style.display = 'none'; }, 1000);
      },
      showOutro() {
        const cap = $('#demoCaption');
        if (cap) cap.classList.remove('is-visible');
        if (cursor) cursor.classList.remove('is-visible');
        const outro = $('#demoOutro');
        if (outro) outro.classList.add('is-visible');
      },
      setCaption(kicker, title, body, step, pct) {
        const cap = $('#demoCaption');
        if (!cap) return;
        $('#demoKicker').textContent = kicker || '';
        $('#demoTitle').textContent = title || '';
        $('#demoBody').textContent = body || '';
        $('#demoStep').textContent = step || '';
        $('#demoBar').style.width = (pct || 0) + '%';
        cap.classList.add('is-visible');
      },
      moveCursor(selector, dx = 0, dy = 0) {
        const el = document.querySelector(selector);
        if (!el || !cursor) return false;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return false;
        cursor.style.left = Math.round(r.left + r.width / 2 + dx) + 'px';
        cursor.style.top = Math.round(r.top + r.height / 2 + dy) + 'px';
        cursor.classList.add('is-visible');
        return true;
      },
      hideCursor() { if (cursor) cursor.classList.remove('is-visible'); },
      pulseCursor() {
        if (!cursor) return;
        cursor.classList.remove('is-clicking');
        void cursor.offsetWidth;
        cursor.classList.add('is-clicking');
        setTimeout(() => cursor.classList.remove('is-clicking'), 650);
      },
      focus(selector) {
        if (focusEl) focusEl.classList.remove('demo-focus');
        const el = document.querySelector(selector);
        if (!el) { focusEl = null; return false; }
        el.classList.add('demo-focus');
        focusEl = el;
        return true;
      },
      clearFocus() {
        if (focusEl) focusEl.classList.remove('demo-focus');
        focusEl = null;
      }
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
