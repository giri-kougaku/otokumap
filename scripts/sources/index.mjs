/* OtokuMap — official flyer sources.
 *
 * Design rules:
 *  - Allowlisted official retailer domains only.
 *  - No paid APIs and no flyer aggregators.
 *  - Store links and metadata only; flyer images are never copied into the repo.
 *  - A source can return store-level, regional-level or chain-level entries.
 */

import { fetchText, robotsAllowed, mapLimit } from '../lib/http.mjs';
import {
  chainFor,
  brandForChain,
  addressFromTags,
  dateOnly,
  isValidHttpUrl,
  normalizeText,
  storeNameKey
} from '../lib/normalize.mjs';

const BASE = {
  life: 'https://store.lifecorp.jp',
  summit: 'https://www.summitstore.co.jp',
  itoyokado: 'https://stores.itoyokado.co.jp',
  gyomu: 'https://www.gyomusuper.jp',
  ok: 'https://www.ok-corporation.co.jp',
  aeon: 'https://www.aeon.com',
  seiyu: 'https://www.seiyu.co.jp',
  donki: 'https://www.donki.com',
  daiei: 'https://www.daiei.co.jp',
  tokyustore: 'https://www.tokyu-store.co.jp',
  costco: 'https://www.costco.co.jp',
  maruetsu: 'https://www.maruetsu.co.jp',
  yaoko: 'https://www.yaoko-net.com',
  belc: 'https://www.belc.jp',
  trial: 'https://www.trial-net.co.jp',
  inageya: 'https://www.inageya.co.jp',
  ropia: 'https://www.ropia.co.jp'
};

/* Pages that are specifically for finding a store flyer, or the closest
 * official equivalent when a retailer does not publish a single flyer page. */
const CHAIN_PAGES = [
  { chain: 'life', url: BASE.life + '/all/', title: { ja: '店舗・チラシ情報', en: 'Store flyer finder' }, note: 'Choose your store to see its flyer.' },
  { chain: 'summit', url: BASE.summit + '/store/', title: { ja: '店舗・チラシ情報', en: 'Store flyer finder' }, note: 'Choose your store to see its flyer.' },
  { chain: 'itoyokado', url: BASE.itoyokado + '/', title: { ja: '店舗・チラシ情報', en: 'Store flyer finder' }, note: 'Choose your store to see its flyer.' },
  { chain: 'gyomu', url: BASE.gyomu + '/sale/', title: { ja: 'セール情報', en: 'Sale information' }, note: 'Official sale information. Flyers are published per store.' },
  { chain: 'ok', url: BASE.ok + '/', title: { ja: '公式サイト', en: 'Official site' }, note: 'Official store information.' },
  { chain: 'aeon', url: BASE.aeon + '/store/', title: { ja: '店舗情報', en: 'Store information' }, note: 'Official store finder. Flyers are published per store.' },
  { chain: 'seiyu', url: BASE.seiyu + '/flyer/chirashi/', title: { ja: '今週のチラシ', en: "This week's flyers" }, note: 'Official weekly flyers by region.' },
  { chain: 'donki', url: BASE.donki + '/chirashi/', title: { ja: 'WEBチラシ', en: 'Web flyers' }, note: 'Official store flyers.' },
  { chain: 'daiei', url: BASE.daiei + '/flyer/', title: { ja: 'チラシ', en: 'Flyers' }, note: 'Official flyer page.' },
  { chain: 'tokyustore', url: BASE.tokyustore + '/shop/', title: { ja: '店舗・チラシ情報', en: 'Store flyer finder' }, note: 'Choose your store to see its flyer.' },
  { chain: 'costco', url: BASE.costco + '/', title: { ja: '公式サイト', en: 'Official site' }, note: 'Official coupons and warehouse information.' },
  { chain: 'maruetsu', url: BASE.maruetsu + '/', title: { ja: 'チラシ一覧', en: 'Flyer list' }, note: 'Official flyer list.' },
  { chain: 'yaoko', url: BASE.yaoko + '/', title: { ja: '公式サイト', en: 'Official site' }, note: 'Official store information.' },
  { chain: 'belc', url: BASE.belc + '/', title: { ja: '公式サイト', en: 'Official site' }, note: 'Official store information.' },
  { chain: 'trial', url: BASE.trial + '/', title: { ja: '公式サイト', en: 'Official site' }, note: 'Official store information.' },
  { chain: 'inageya', url: BASE.inageya + '/', title: { ja: '公式サイト', en: 'Official site' }, note: 'Official store information.' },
  { chain: 'ropia', url: BASE.ropia + '/', title: { ja: '公式サイト', en: 'Official site' }, note: 'Official store information.' }
];

function absolute(base, href) {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

async function fetchOfficial(url, options) {
  if (!(await robotsAllowed(url))) {
    throw new Error(`robots.txt disallows ${url}`);
  }
  return fetchText(url, options);
}

function textOf(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNextData(html) {
  const m = String(html).match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function parseJapaneseDate(text, year) {
  const m = String(text || '').match(/(\d{1,2})月(\d{1,2})日/);
  if (!m) return null;
  const y = year || new Date().getFullYear();
  return `${y}-${String(Number(m[1])).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`;
}

function ymdFromCompact(value) {
  const m = String(value || '').match(/^(\d{2})(\d{2})(\d{2})$/);
  if (!m) return null;
  return `20${m[1]}-${m[2]}-${m[3]}`;
}

function addDaysYmd(ymd, days) {
  if (!ymd) return null;
  const d = new Date(ymd + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + days);
  return dateOnly(d);
}

function chainPageFlyers(now) {
  return CHAIN_PAGES.map((item) => ({
    id: `official-${item.chain}`,
    chain: item.chain,
    brand: brandForChain(item.chain),
    level: 'chain',
    title: item.title,
    url: item.url,
    image: null,
    storeName: '',
    address: '',
    lat: null,
    lng: null,
    validFrom: null,
    validTo: null,
    source: 'official',
    sourceLabel: 'Official retailer site',
    note: item.note,
    checkedAt: now
  }));
}

/* ------------------------------------------------------------------ *
 * Life — official store pages, each of which embeds its own flyer widget.
 * ------------------------------------------------------------------ */
async function fetchLife({ now, log, env }) {
  const maxPages = 20;
  const maxStores = Math.max(0, Number(env.LIFE_MAX_STORES) || 0);
  const concurrency = Math.max(1, Math.min(6, Number(env.LIFE_CONCURRENCY) || 4));

  const shops = [];
  let maxPage = 1;
  for (let page = 1; page <= Math.min(maxPages, maxPage + 1); page++) {
    const url = `${BASE.life}/all/${page > 1 ? `?page=${page}` : ''}`;
    const html = await fetchOfficial(url, { timeout: 25000, retries: 1 });
    const data = parseNextData(html);
    const pp = data && data.props && data.props.pageProps;
    if (!pp || !Array.isArray(pp.shops)) break;
    maxPage = Math.max(1, Number(pp.maxPage) || 1);
    shops.push(...pp.shops);
    if (page >= maxPage) break;
  }

  log(`life: ${shops.length} stores in ${maxPage} list page(s)`);
  const selected = maxStores ? shops.slice(0, maxStores) : shops;

  const details = await mapLimit(selected, concurrency, async (shop) => {
    if (!shop || !shop.storeCode) return null;
    const url = `${BASE.life}/detail/${encodeURIComponent(shop.storeCode)}/`;
    try {
      const html = await fetchOfficial(url, { timeout: 20000, retries: 1 });
      const data = parseNextData(html);
      const detail = data && data.props && data.props.pageProps && data.props.pageProps.shop;
      if (!detail) return null;
      const cms = Array.isArray(detail.cmsItemValues) ? detail.cmsItemValues : [];
      const flyerItem = cms.find((item) => {
        const c = item && item.content;
        return c && (c.title === 'Webチラシ' || c.componentName === 'textArea' && /チラシ/.test(c.title || ''));
      });
      const itemText = flyerItem && flyerItem.content && flyerItem.content.textArea &&
        Array.isArray(flyerItem.content.textArea.items)
        ? flyerItem.content.textArea.items.map((x) => x.text || '').join(' ')
        : '';
      const widget = String(itemText).match(/https:\/\/widgets\.tokubai\.co\.jp\/[^"'\s<]+\/leaflet_widget[^"'\s<]*/);
      if (!widget) return null;

      const lat = Number(detail.latitude);
      const lng = Number(detail.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return {
        id: `life-${shop.storeCode}`,
        chain: 'life',
        brand: (detail.brand && detail.brand.name) || 'ライフ',
        storeName: detail.nameKanji || shop.nameKanji || '',
        address: detail.address || shop.address || '',
        lat,
        lng,
        level: 'store',
        title: { ja: 'Webチラシ', en: 'Web flyer' },
        url,
        image: null,
        widgetUrl: widget[0],
        validFrom: null,
        validTo: null,
        source: 'life-official',
        sourceLabel: 'ライフ公式サイト',
        note: 'Flyer widget published by Life on the official store page.',
        checkedAt: now
      };
    } catch (err) {
      log(`life: skipped ${shop.storeCode} (${err.message})`);
      return null;
    }
  });

  const flyers = details.filter(Boolean);
  log(`life: ${flyers.length} stores with a flyer widget`);
  return flyers;
}

/* ------------------------------------------------------------------ *
 * Seiyu — official weekly flyers by region, with real flyer image URLs.
 * ------------------------------------------------------------------ */
async function fetchSeiyu({ now, log }) {
  const pageUrl = BASE.seiyu + '/flyer/chirashi/';
  const html = await fetchOfficial(pageUrl, { timeout: 25000, retries: 1 });
  const blocks = [...html.matchAll(/<div class="chirashi_box[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*(?=<div class="chirashi_box|<\/div>)/gi)];
  const flyers = [];

  const regionMap = {
    '関東': ['東京都', '千葉県', '神奈川県', '埼玉県', '茨城県', '群馬県', '栃木県'],
    '東北': ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
    '郡山': ['福島県'],
    '静岡': ['静岡県'],
    '浜松': ['静岡県'],
    '愛知': ['愛知県', '岐阜県', '三重県'],
    '関西': ['大阪府', '京都府', '兵庫県', '奈良県', '滋賀県', '和歌山県'],
    '長野': ['長野県']
  };

  for (const m of blocks) {
    const block = m[1];
    const area = (block.match(/<div class="area_title"[^>]*>[\s\S]*?<p>([^<]+)<\/p>/i) || [])[1];
    const areaText = textOf((block.match(/<p class="area_text">([\s\S]*?)<\/p>/i) || [])[1]);
    const image = (block.match(/href="([^"]+flyer_week[^"]+)"/i) || [])[1];
    if (!area || !image) continue;

    const week = (image.match(/flyer_week(\d{6})/i) || [])[1];
    const validFrom = ymdFromCompact(week);
    const validTo = addDaysYmd(validFrom, 6);
    const isSingleStore = /THE MALL|郡山/i.test(areaText);

    flyers.push({
      id: `seiyu-${normalizeText(area) || flyers.length}-${week || 'current'}`,
      chain: 'seiyu',
      brand: '西友',
      level: isSingleStore ? 'store' : 'region',
      storeName: isSingleStore ? areaText : '',
      regions: regionMap[area] || [],
      regionLabel: area,
      title: { ja: `西友 ${area}版 チラシ`, en: `SEIYU ${area} flyer` },
      url: pageUrl,
      image: absolute(pageUrl, image),
      imageSource: 'official',
      validFrom,
      validTo,
      source: 'seiyu-official',
      sourceLabel: '西友公式サイト',
      note: 'Official weekly flyer. Check the store page for your branch.',
      checkedAt: now
    });
  }

  log(`seiyu: ${flyers.length} regional flyers`);
  return flyers;
}

/* ------------------------------------------------------------------ *
 * Don Quijote — official /chirashi/ page lists each store with a flyer.
 * ------------------------------------------------------------------ */
async function fetchDonki({ now, log }) {
  const pageUrl = BASE.donki + '/chirashi/';
  const html = await fetchOfficial(pageUrl, { timeout: 25000, retries: 1 });
  const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']*shop_detail\.php\?shop_id=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const seen = new Set();
  const flyers = [];

  for (const m of anchors) {
    const href = absolute(pageUrl, m[1]);
    const raw = textOf(m[2]).replace(/^公開中\s*/, '').trim();
    const storeName = raw.replace(/^WEBチラシ\s*/, '').trim();
    if (!storeName || seen.has(href)) continue;
    seen.add(href);
    flyers.push({
      id: `donki-${(href.match(/shop_id=(\d+)/) || [])[1] || flyers.length}`,
      chain: 'donki',
      brand: 'ドン・キホーテ',
      level: 'store',
      storeName,
      address: '',
      lat: null,
      lng: null,
      title: { ja: `${storeName}のWEBチラシ`, en: `${storeName} web flyer` },
      url: href,
      image: null,
      validFrom: null,
      validTo: null,
      source: 'donki-official',
      sourceLabel: 'ドン・キホーテ公式サイト',
      note: 'Official store page with the current flyer.',
      checkedAt: now
    });
  }

  log(`donki: ${flyers.length} store flyers`);
  return flyers;
}

/* ------------------------------------------------------------------ *
 * Gyomu Super — official sale page. Flyers are per store, so this is
 * a chain-level sale link rather than a fake store match.
 * ------------------------------------------------------------------ */
async function fetchGyomu({ now, log }) {
  const pageUrl = BASE.gyomu + '/sale/';
  const html = await fetchOfficial(pageUrl, { timeout: 25000, retries: 1 });
  const title = textOf((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]) || '業務スーパー セール情報';
  const desc = textOf((html.match(/<meta name="description" content="([^"]*)"/i) || [])[1]);
  const year = new Date(now).getFullYear();
  const dates = [...String(desc).matchAll(/(\d{1,2})月(\d{1,2})日/g)].map((m) => `${year}-${String(Number(m[1])).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`);
  const validFrom = dates[0] || null;
  const validTo = dates[1] || null;
  log(`gyomu: ${title}`);
  return [{
    id: 'gyomu-sale-current',
    chain: 'gyomu',
    brand: '業務スーパー',
    level: 'chain',
    title: { ja: title.replace(/^【セール】/, ''), en: 'Gyomu Super sale information' },
    url: pageUrl,
    image: null,
    validFrom,
    validTo,
    source: 'gyomu-official',
    sourceLabel: '業務スーパー公式サイト',
    note: 'Official sale page. Flyers are published per store.',
    checkedAt: now
  }];
}

/* ------------------------------------------------------------------ *
 * Ito-Yokado — official store/flyer search (client-rendered).
 * ------------------------------------------------------------------ */
async function fetchItoyokado({ now, log }) {
  const pageUrl = BASE.itoyokado + '/';
  const html = await fetchOfficial(pageUrl, { timeout: 25000, retries: 1 });
  const title = textOf((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  log(`itoyokado: ${title || 'store search'}`);
  return [{
    id: 'itoyokado-store-finder',
    chain: 'itoyokado',
    brand: 'イトーヨーカドー',
    level: 'chain',
    title: { ja: '店舗・チラシ情報', en: 'Store flyer finder' },
    url: pageUrl,
    image: null,
    validFrom: null,
    validTo: null,
    source: 'itoyokado-official',
    sourceLabel: 'イトーヨーカドー公式サイト',
    note: 'Choose your store on the official page to open its flyer.',
    checkedAt: now
  }];
}

/* ------------------------------------------------------------------ *
 * Summit — official store/flyer search (Nuxt SPA).
 * ------------------------------------------------------------------ */
async function fetchSummit({ now, log }) {
  const pageUrl = BASE.summit + '/store/';
  const html = await fetchOfficial(pageUrl, { timeout: 25000, retries: 1 });
  log(`summit: ${html.length} bytes`);
  return [{
    id: 'summit-store-finder',
    chain: 'summit',
    brand: 'サミットストア',
    level: 'chain',
    title: { ja: '店舗・チラシ情報', en: 'Store flyer finder' },
    url: pageUrl,
    image: null,
    validFrom: null,
    validTo: null,
    source: 'summit-official',
    sourceLabel: 'サミットストア公式サイト',
    note: 'Choose your store on the official page to open its flyer.',
    checkedAt: now
  }];
}

const ADAPTERS = [
  { id: 'life', run: fetchLife },
  { id: 'seiyu', run: fetchSeiyu },
  { id: 'donki', run: fetchDonki },
  { id: 'gyomu', run: fetchGyomu },
  { id: 'itoyokado', run: fetchItoyokado },
  { id: 'summit', run: fetchSummit }
];

export async function fetchAllFlyers({ now = new Date().toISOString(), env = process.env, log = () => {} } = {}) {
  const results = [];
  const health = [];

  for (const adapter of ADAPTERS) {
    const started = Date.now();
    try {
      const flyers = await adapter.run({ now, env, log });
      const valid = (flyers || []).filter((f) => f && f.chain && f.level && f.url && isValidHttpUrl(f.url));
      results.push(...valid);
      health.push({ id: adapter.id, status: 'ok', count: valid.length, ms: Date.now() - started });
    } catch (err) {
      log(`${adapter.id}: FAILED — ${err.message}`);
      health.push({ id: adapter.id, status: 'error', count: 0, ms: Date.now() - started, error: err.message });
    }
  }

  const chainPages = chainPageFlyers(now);
  const merged = [];
  const seen = new Set();
  for (const f of chainPages.concat(results)) {
    if (!f || !f.id || seen.has(f.id)) continue;
    seen.add(f.id);
    merged.push(f);
  }

  return { flyers: merged, health };
}

export { CHAIN_PAGES, BASE };
