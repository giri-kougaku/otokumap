#!/usr/bin/env node
/* Build data/stores.json from OpenStreetMap supermarket data.
 *
 * Default: query Overpass once per Japanese region, then merge/dedupe.
 * This keeps each query small enough for the public Overpass servers and
 * avoids a 2 GB planet download in GitHub Actions.
 *
 * Examples:
 *   node scripts/build-stores.mjs
 *   node scripts/build-stores.mjs --regions=kanto
 *   node scripts/build-stores.mjs --bbox=35.60,139.60,35.80,139.90 --out=data/stores.tokyo.json
 *   node scripts/build-stores.mjs --prefectures=千葉県,静岡県 --resume --force
 *   node scripts/build-stores.mjs --all-prefectures --out=data/stores.json --merge-existing
 *   node scripts/build-stores.mjs --all-prefectures --out=data/stores.json --strict
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fetchJson, sleep } from './lib/http.mjs';
import { chainFor, addressFromTags, cleanStoreName } from './lib/normalize.mjs';

const REGIONS = [
  { id: 'hokkaido', name: '北海道', bbox: [41.3, 139.3, 45.6, 145.9] },
  { id: 'tohoku', name: '東北', bbox: [36.7, 139.4, 41.6, 142.2] },
  { id: 'kanto', name: '関東', bbox: [34.7, 138.3, 37.2, 141.1] },
  { id: 'chubu', name: '中部', bbox: [34.4, 135.9, 37.6, 139.6] },
  { id: 'kansai', name: '近畿', bbox: [33.3, 133.9, 35.9, 137.0] },
  { id: 'chugoku', name: '中国', bbox: [33.9, 130.7, 35.8, 134.6] },
  { id: 'shikoku', name: '四国', bbox: [32.5, 131.9, 34.5, 134.9] },
  { id: 'kyushu', name: '九州', bbox: [30.8, 128.9, 34.1, 132.2] },
  { id: 'okinawa', name: '沖縄', bbox: [24.0, 122.8, 27.2, 131.2] }
];

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter'
];

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

/* Approximate bounding boxes. They deliberately overlap a little so no
 * stores are lost at prefecture borders; the result is deduplicated by OSM id. */
const PREFECTURE_BBOXES = [
  ['北海道', 41.3, 139.3, 45.6, 145.9],
  ['青森県', 40.2, 139.8, 41.6, 141.7],
  ['岩手県', 38.7, 140.6, 40.5, 142.2],
  ['宮城県', 37.7, 140.2, 39.0, 141.7],
  ['秋田県', 38.8, 139.7, 40.5, 140.9],
  ['山形県', 37.7, 139.5, 39.0, 140.7],
  ['福島県', 36.7, 139.1, 38.0, 141.1],
  ['茨城県', 35.7, 139.7, 36.9, 140.9],
  ['栃木県', 36.2, 139.3, 37.2, 140.3],
  ['群馬県', 36.0, 138.3, 37.1, 139.7],
  ['埼玉県', 35.7, 138.7, 36.3, 140.0],
  ['千葉県', 34.9, 139.7, 36.0, 140.9],
  ['東京都', 35.5, 138.9, 35.9, 139.9],
  ['神奈川県', 35.1, 138.9, 35.7, 139.8],
  ['新潟県', 37.3, 137.3, 38.6, 139.6],
  ['富山県', 36.2, 136.7, 37.0, 137.8],
  ['石川県', 36.0, 136.2, 37.5, 137.4],
  ['福井県', 35.3, 135.4, 36.3, 136.8],
  ['山梨県', 35.1, 138.4, 35.9, 139.2],
  ['長野県', 35.1, 137.3, 37.0, 138.7],
  ['岐阜県', 35.1, 136.1, 36.5, 137.7],
  ['静岡県', 34.5, 137.4, 35.7, 139.2],
  ['愛知県', 34.5, 136.6, 35.5, 137.9],
  ['三重県', 33.7, 135.8, 35.3, 137.1],
  ['滋賀県', 34.8, 135.8, 35.6, 136.5],
  ['京都府', 34.7, 135.0, 35.8, 136.1],
  ['大阪府', 34.2, 135.1, 35.1, 135.8],
  ['兵庫県', 34.2, 134.0, 35.7, 135.5],
  ['奈良県', 33.8, 135.6, 34.8, 136.2],
  ['和歌山県', 33.4, 135.0, 34.4, 135.8],
  ['鳥取県', 35.0, 133.1, 35.6, 134.5],
  ['島根県', 34.2, 131.6, 35.6, 133.4],
  ['岡山県', 34.3, 133.2, 35.3, 134.4],
  ['広島県', 34.0, 132.0, 35.1, 133.5],
  ['山口県', 33.7, 130.7, 34.8, 132.2],
  ['徳島県', 33.5, 133.6, 34.3, 134.8],
  ['香川県', 34.0, 133.5, 34.5, 134.3],
  ['愛媛県', 32.7, 132.0, 34.0, 133.4],
  ['高知県', 32.7, 132.5, 33.9, 134.4],
  ['福岡県', 33.0, 130.0, 34.0, 131.2],
  ['佐賀県', 32.9, 129.7, 33.6, 130.5],
  ['長崎県', 32.5, 128.6, 33.5, 130.4],
  ['熊本県', 32.1, 130.0, 33.2, 131.3],
  ['大分県', 32.7, 130.8, 33.8, 132.1],
  ['宮崎県', 31.3, 130.6, 32.9, 132.0],
  ['鹿児島県', 30.9, 129.5, 32.3, 131.2],
  ['沖縄県', 24.0, 122.8, 27.2, 131.2]
];

function arg(name, fallback = null) {
  const prefix = `--${name}=`;
  const hit = process.argv.slice(2).find((x) => x.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.slice(2).includes(`--${name}`);
}

function prefectureOf(address, tags) {
  const direct = tags['addr:province'] || tags['addr:state'] || '';
  const hay = String(direct || address || '');
  return PREFECTURES.find((p) => hay.includes(p)) || '';
}

function normalizeElement(el, regionName) {
  const tags = el.tags || {};
  const lat = Number(el.lat ?? (el.center && el.center.lat));
  const lng = Number(el.lon ?? (el.center && el.center.lon));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const name = cleanStoreName(tags['name:ja'] || tags.name || tags['name:en'] || tags.brand || tags.operator || '');
  if (!name) return null;

  const brand = String(tags['brand:ja'] || tags.brand || tags.operator || '').trim();
  const address = addressFromTags(tags);
  const chain = chainFor(name, brand, tags.operator, tags['name:en'], tags['brand:en']);
  const prefecture = prefectureOf(address, tags);

  return {
    id: `osm:${el.type}/${el.id}`,
    name,
    nameEn: String(tags['name:en'] || '').trim(),
    brand,
    chain,
    lat: Math.round(lat * 1e6) / 1e6,
    lng: Math.round(lng * 1e6) / 1e6,
    address,
    prefecture,
    region: regionName || '',
    osmType: el.type,
    osmId: el.id,
    website: String(tags.website || tags['contact:website'] || '').trim(),
    updatedAt: el.timestamp || null
  };
}

async function queryOverpass(bbox, log) {
  const [s, w, n, e] = bbox;
  const query = `[out:json][timeout:90];nwr["shop"="supermarket"](${s},${w},${n},${e});out center tags;`;
  const errors = [];

  for (let attempt = 0; attempt < 3; attempt++) {
    for (const base of MIRRORS) {
      const url = base + '?data=' + encodeURIComponent(query);
      try {
        log(`  querying ${new URL(base).host}${attempt ? ' (retry)' : ''} …`);
        const data = await fetchJson(url, {
          timeout: 65000,
          retries: 0,
          headers: { 'Accept': 'application/json' }
        });
        return Array.isArray(data.elements) ? data.elements : [];
      } catch (err) {
        errors.push(`${new URL(base).host}: ${err.message}`);
        log(`  mirror failed: ${err.message}`);
      }
    }
    if (attempt < 2) await sleep(3000 + attempt * 2000);
  }
  throw new Error(errors.slice(-4).join('; '));
}

async function main() {
  const outPath = path.resolve(arg('out', 'data/stores.json'));
  const checkpointPath = outPath + '.checkpoint.json';
  const bboxArg = arg('bbox');
  const regionArg = arg('regions');
  const prefectureArg = arg('prefectures');
  const resume = hasFlag('resume');
  const force = hasFlag('force');
  const strict = hasFlag('strict');
  const mergeExisting = hasFlag('merge-existing');
  const limit = Number(arg('limit', '0')) || 0;
  const log = (msg) => console.error(msg);

  let regions = REGIONS;
  if (regionArg) {
    const wanted = new Set(regionArg.split(',').map((x) => x.trim()).filter(Boolean));
    regions = REGIONS.filter((r) => wanted.has(r.id));
    if (!regions.length) throw new Error(`Unknown --regions value: ${regionArg}`);
  }

  let jobs;
  if (bboxArg) {
    jobs = [{ id: 'custom', name: 'custom', bbox: bboxArg.split(',').map(Number) }];
  } else if (prefectureArg) {
    const wanted = new Set(prefectureArg.split(',').map((x) => x.trim()).filter(Boolean));
    jobs = PREFECTURE_BBOXES
      .filter(([name]) => wanted.has(name))
      .map(([name, s, w, n, e]) => ({ id: name, name, bbox: [s, w, n, e] }));
    if (!jobs.length) throw new Error(`Unknown --prefectures value: ${prefectureArg}`);
  } else if (hasFlag('all-prefectures')) {
    jobs = PREFECTURE_BBOXES.map(([name, s, w, n, e]) => ({ id: name, name, bbox: [s, w, n, e] }));
  } else {
    jobs = regions;
  }

  log(`OtokuMap store build — ${jobs.map((j) => j.id).join(', ')}`);
  const stores = [];
  const seen = new Set();
  const regionStats = [];
  const existingStats = [];
  const completed = new Set();

  if (resume) {
    try {
      const cp = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
      if (Array.isArray(cp.stores)) {
        for (const store of cp.stores) {
          if (!store || !store.id || seen.has(store.id)) continue;
          seen.add(store.id);
          stores.push(store);
        }
      }
      if (Array.isArray(cp.regions)) regionStats.push(...cp.regions);
      for (const r of regionStats) if (!r.error) completed.add(r.id);
      log(`Resumed checkpoint: ${stores.length} stores, ${completed.size} completed areas`);
    } catch (err) {
      if (err.code !== 'ENOENT') log(`Could not read checkpoint: ${err.message}`);
    }
  }

  if (mergeExisting) {
    try {
      const previous = JSON.parse(await fs.readFile(outPath, 'utf8'));
      let merged = 0;
      for (const store of previous.stores || []) {
        if (!store || !store.id || seen.has(store.id)) continue;
        seen.add(store.id);
        stores.push(store);
        merged++;
      }
      if (Array.isArray(previous.regions)) existingStats.push(...previous.regions);
      log(`Merged existing index: ${merged} stores, ${existingStats.length} area stats`);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  async function writeCheckpoint() {
    await fs.mkdir(path.dirname(checkpointPath), { recursive: true });
    await fs.writeFile(checkpointPath, JSON.stringify({ stores, regions: regionStats }));
  }

  for (const region of jobs) {
    if (force) {
      completed.delete(region.id);
      for (let i = regionStats.length - 1; i >= 0; i--) {
        if (regionStats[i].id === region.id) regionStats.splice(i, 1);
      }
    }
    if (completed.has(region.id)) {
      log(`${region.name} — already in checkpoint`);
      continue;
    }
    log(`${region.name} (${region.bbox.join(', ')})`);
    try {
      const elements = await queryOverpass(region.bbox, log);
      let added = 0;
      for (const el of elements) {
        const store = normalizeElement(el, region.name);
        if (!store || seen.has(store.id)) continue;
        seen.add(store.id);
        stores.push(store);
        added++;
      }
      regionStats.push({ id: region.id, name: region.name, elements: elements.length, added });
      completed.add(region.id);
      log(`  ${added} supermarkets`);
    } catch (err) {
      regionStats.push({ id: region.id, name: region.name, error: err.message });
      log(`  FAILED: ${err.message}`);
    }
    await writeCheckpoint();
    await sleep(900);
  }

  if (!stores.length) throw new Error('No supermarkets were collected; refusing to overwrite the store index.');

  const jobIds = new Set(jobs.map((j) => j.id));
  const succeeded = regionStats.filter((r) => jobIds.has(r.id) && !r.error).length;
  if (mergeExisting && succeeded === 0) {
    throw new Error('All requested areas failed; keeping the existing store index.');
  }

  const mergedStatsById = new Map(existingStats.map((r) => [r.id, r]));
  for (const r of regionStats) mergedStatsById.set(r.id, r);
  const mergedRegionStats = [...mergedStatsById.values()];
  const failures = mergedRegionStats.filter((r) => jobIds.has(r.id) && r.error);
  if (strict && failures.length) {
    throw new Error(
      `Strict mode: ${failures.length} area(s) failed (${failures.map((r) => r.name).join(', ')}). ` +
      'Keeping the existing store index.'
    );
  }

  stores.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  const finalStores = limit > 0 ? stores.slice(0, limit) : stores;
  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'OpenStreetMap',
    sourceUrl: 'https://www.openstreetmap.org/',
    license: 'OpenStreetMap contributors, ODbL 1.0',
    licenseUrl: 'https://www.openstreetmap.org/copyright',
    count: finalStores.length,
    regions: mergedRegionStats,
    stores: finalStores
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(payload));
  await fs.rm(checkpointPath, { force: true });
  const byChain = {};
  for (const s of finalStores) byChain[s.chain] = (byChain[s.chain] || 0) + 1;
  log(`Wrote ${finalStores.length} stores to ${outPath}`);
  log(`Chains: ${Object.entries(byChain).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${k}=${v}`).join(', ')}`);
}

main().catch((err) => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});
