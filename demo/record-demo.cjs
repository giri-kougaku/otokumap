const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LIVE = 'https://giri-kougaku.github.io/otokumap/?lang=en';
const OUT_DIR = __dirname;
const RAW_VIDEO = path.join(OUT_DIR, 'site-recording.webm');

const initScript = fs.readFileSync(path.join(__dirname, 'overlay-init.js'), 'utf8');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding']
  });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: { dir: path.join(OUT_DIR, 'raw'), size: { width: 1600, height: 900 } }
  });
  await context.addInitScript({ content: initScript });
  const page = await context.newPage();
  const video = page.video();
  const videoStart = Date.now();

  await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__demo, null, { timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('#map .gm-style') && document.querySelector('#nearbyStatus')?.textContent.includes('supermarkets'), null, { timeout: 45000 });
  await page.waitForTimeout(1800);

  const readyMs = Date.now() - videoStart;
  if (readyMs < 5200) await wait(5200 - readyMs);
  await page.evaluate(() => window.__demo.hideIntro());
  await wait(1050);

  const timelineStart = Date.now();
  const at = async (seconds) => {
    const elapsed = (Date.now() - timelineStart) / 1000;
    if (elapsed < seconds) await wait((seconds - elapsed) * 1000);
  };
  const mark = async (n, kicker, title, body, pct) => {
    await page.evaluate(([k, t, b, s, p]) => window.__demo.setCaption(k, t, b, s, p), [kicker, title, body, String(n).padStart(2, '0') + ' / 09', pct]);
    await wait(360);
  };
  const move = async (selector, dx = 0, dy = 0) => {
    await page.evaluate(([s, x, y]) => window.__demo.moveCursor(s, x, y), [selector, dx, dy]);
    await wait(650);
  };
  const click = async (selector) => {
    await page.evaluate((s) => window.__demo.focus(s), selector);
    await page.evaluate(() => window.__demo.pulseCursor());
    await page.click(selector, { timeout: 15000 });
    await wait(900);
  };
  const focus = async (selector) => { await page.evaluate((s) => window.__demo.focus(s), selector); };

  // 01 — hero + location
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await mark(1, 'Live demo · Tokyo Station', 'Every supermarket around you', 'Real OpenStreetMap locations, with a radius you control.', 8);
  await focus('.location-card');
  await move('#radiusChips [data-radius="10"]');
  await click('#radiusChips [data-radius="10"]');
  await wait(2500);
  await at(9.2);

  // 02 — radius + browse
  await mark(2, 'Search radius', '1, 3, 5, 10 or 25 km', 'The map and the nearby list update together.', 18);
  await click('#radiusChips [data-radius="5"]');
  await wait(1200);
  await click('#radiusChips [data-radius="10"]');
  await wait(1000);
  await page.evaluate(() => document.querySelector('#deals').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  await wait(1100);
  await focus('.toolbar');
  await move('#mapBadge');
  await at(18.5);

  // 03 — map + nearby store popup
  await mark(3, 'Real map · real stores', '1,035 supermarkets within 10 km', 'Red pins are deals; green dots are nearby OpenStreetMap stores.', 30);
  await page.evaluate(() => window.scrollTo({ top: 620, behavior: 'smooth' }));
  await wait(900);
  const lifeItem = page.locator('.nearby-item').filter({ has: page.locator('.nearby-name', { hasText: 'Life' }) }).first();
  await lifeItem.scrollIntoViewIfNeeded();
  await wait(500);
  await lifeItem.evaluate((el) => {
    el.id = 'demoLifeRow';
    const open = el.querySelector('.nearby-open');
    if (open) open.id = 'demoLifeOpen';
    const flyer = el.querySelector('[data-flyer-place]');
    if (flyer) flyer.id = 'demoLifeFlyer';
  });
  await page.locator('#demoLifeOpen').scrollIntoViewIfNeeded();
  await move('#demoLifeOpen');
  await click('#demoLifeOpen');
  await wait(1200);
  await focus('.gm-style-iw-c');
  await wait(2000);
  await at(28.5);

  // 04 — flyer badge
  await mark(4, 'Flyer coverage', '293 of 1,035 stores have a flyer', 'Flyer badges link straight to the retailer’s official page.', 42);
  await focus('#demoLifeRow');
  await move('#demoLifeFlyer');
  await wait(2200);
  await at(37.5);

  // 05 — official flyer modal
  await mark(5, 'Official flyer · one click away', 'Life · 神田和泉町', 'Matched to this exact store. The flyer opens on Life’s official site.', 54);
  await wait(1600);
  await page.evaluate(() => {
    document.querySelector('#demoCaption')?.classList.remove('is-visible');
    window.__demo.hideCursor();
  });
  await wait(300);
  await click('#demoLifeFlyer');
  await wait(5400);
  await page.click('#flyerClose');
  await wait(700);
  await page.evaluate(() => {
    document.querySelector('#demoCaption')?.classList.add('is-visible');
    window.__demo.clearFocus();
  });
  await wait(1500);
  await at(49.5);

  // 06 — choose nearest
  await mark(6, 'Choose how to shop', 'Dealwise or nearest', 'Rank by biggest savings, or keep the closest shops at the top.', 64);
  await page.evaluate(() => document.querySelector('.modes-section').scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await wait(900);
  await focus('.mode-switch');
  await move('[data-mode="nearest"]');
  await click('[data-mode="nearest"]');
  await wait(1500);
  await page.evaluate(() => document.querySelector('#deals').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  await wait(1000);
  await at(58.5);

  // 07 — bilingual
  await mark(7, 'English and Japanese', 'One click switches the whole interface', 'The map, stores and flyer data stay exactly the same.', 74);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(1100);
  await focus('.lang-switch');
  await move('[data-lang="ja"]');
  await click('[data-lang="ja"]');
  await wait(3200);
  await move('[data-lang="en"]');
  await click('[data-lang="en"]');
  await at(68.5);

  // 08 — filters
  await mark(8, 'Filter in seconds', 'Category, shop, discount, saved', 'The results, map and nearby list stay connected.', 84);
  await page.evaluate(() => document.querySelector('#deals').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  await wait(1000);
  await focus('#categoryChips');
  await move('[data-cat="meat"]');
  await click('[data-cat="meat"]');
  await wait(1600);
  await move('[data-cat="all"]');
  await click('[data-cat="all"]');
  await wait(1000);
  await at(77.0);

  // 09 — outro
  await page.evaluate(() => window.__demo.showOutro());
  await wait(7000);

  const totalMs = Date.now() - timelineStart;
  console.log(JSON.stringify({ readyMs, timelineMs: totalMs, sceneEnd: 84 }, null, 2));
  await context.close();
  const rawDir = path.join(OUT_DIR, 'raw');
  const latest = fs.readdirSync(rawDir)
    .filter((name) => name.endsWith('.webm'))
    .map((name) => ({ name, mtime: fs.statSync(path.join(rawDir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0];
  if (!latest) throw new Error('No Playwright video found');
  fs.copyFileSync(path.join(rawDir, latest.name), RAW_VIDEO);
  await browser.close();
  console.log('RAW_VIDEO', RAW_VIDEO);
})().catch((err) => { console.error(err); process.exit(1); });
