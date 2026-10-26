#!/usr/bin/env node
/* Build data/flyers.json from official retailer pages.
 *
 * Run locally:
 *   node scripts/fetch-flyers.mjs
 *
 * Useful environment variables:
 *   LIFE_MAX_STORES=40     Limit Life detail-page requests (0 = all)
 *   LIFE_CONCURRENCY=3     Parallel Life requests
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fetchAllFlyers } from './sources/index.mjs';
import { isValidHttpUrl, dateOnly } from './lib/normalize.mjs';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const OUT_FILE = path.join(DATA_DIR, 'flyers.json');
const OVERRIDES_FILE = path.join(DATA_DIR, 'flyer-overrides.json');

function todayYmd() {
  return dateOnly(new Date());
}

function normalizeTitle(title, fallback) {
  if (title && typeof title === 'object') {
    return {
      ja: String(title.ja || title.en || fallback || '').trim(),
      en: String(title.en || title.ja || fallback || '').trim()
    };
  }
  const s = String(title || fallback || '').trim();
  return { ja: s, en: s };
}

function sanitizeFlyer(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const chain = String(raw.chain || '').trim();
  const level = String(raw.level || '').trim();
  const url = String(raw.url || '').trim();
  if (!chain || !['store', 'region', 'chain'].includes(level)) return null;
  if (!isValidHttpUrl(url)) return null;
  if (!raw.id) return null;

  const lat = raw.lat == null ? null : Number(raw.lat);
  const lng = raw.lng == null ? null : Number(raw.lng);
  const title = normalizeTitle(raw.title, 'Flyer');
  const validFrom = raw.validFrom ? dateOnly(raw.validFrom) : null;
  const validTo = raw.validTo ? dateOnly(raw.validTo) : null;

  return {
    id: String(raw.id).slice(0, 180),
    chain,
    brand: String(raw.brand || chain).trim(),
    level,
    title,
    url,
    image: raw.image && isValidHttpUrl(raw.image) ? String(raw.image) : null,
    imageSource: raw.image ? String(raw.imageSource || 'official') : null,
    storeName: String(raw.storeName || '').trim(),
    address: String(raw.address || '').trim(),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    regions: Array.isArray(raw.regions) ? raw.regions.map(String) : [],
    regionLabel: String(raw.regionLabel || '').trim(),
    validFrom,
    validTo,
    source: String(raw.source || 'official').trim(),
    sourceLabel: String(raw.sourceLabel || 'Official retailer site').trim(),
    note: String(raw.note || '').trim(),
    checkedAt: raw.checkedAt || new Date().toISOString()
  };
}

function isCurrent(flyer, today) {
  if (!flyer.validTo) return true;
  const end = new Date(flyer.validTo + 'T23:59:59Z');
  const now = new Date(today + 'T00:00:00Z');
  return end.getTime() >= now.getTime() - 86400000;
}

async function readOverrides() {
  try {
    const raw = JSON.parse(await fs.readFile(OVERRIDES_FILE, 'utf8'));
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.flyers)) return raw.flyers;
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn(`Could not read overrides: ${err.message}`);
  }
  return [];
}

async function main() {
  const now = new Date().toISOString();
  const today = todayYmd();
  const log = (msg) => console.log(msg);

  log('OtokuMap flyer refresh');
  const { flyers, health } = await fetchAllFlyers({ now, log });
  const overrides = await readOverrides();
  const candidates = flyers.concat(overrides);
  const byId = new Map();
  for (const raw of candidates) {
    const flyer = sanitizeFlyer(raw);
    if (!flyer) continue;
    if (!isCurrent(flyer, today)) continue;
    byId.set(flyer.id, flyer);
  }

  const finalFlyers = [...byId.values()].sort((a, b) => {
    if (a.chain !== b.chain) return a.chain.localeCompare(b.chain);
    const rank = { store: 0, region: 1, chain: 2 };
    if (rank[a.level] !== rank[b.level]) return rank[a.level] - rank[b.level];
    return (a.storeName || a.regionLabel || a.id).localeCompare(b.storeName || b.regionLabel || b.id, 'ja');
  });

  const coverage = {
    chains: new Set(finalFlyers.map((f) => f.chain)).size,
    flyers: finalFlyers.length,
    storeLevel: finalFlyers.filter((f) => f.level === 'store').length,
    regionLevel: finalFlyers.filter((f) => f.level === 'region').length,
    chainLevel: finalFlyers.filter((f) => f.level === 'chain').length,
    withImage: finalFlyers.filter((f) => f.image).length
  };

  const payload = {
    generatedAt: now,
    source: 'Official retailer websites',
    license: 'Flyer links and metadata only. Images remain on the retailer site.',
    coverage,
    sources: health,
    flyers: finalFlyers
  };

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(payload, null, 2) + '\n');
  log(`Wrote ${finalFlyers.length} flyers to ${OUT_FILE}`);
  log(`Coverage: ${coverage.chains} chains, ${coverage.storeLevel} store, ${coverage.regionLevel} region, ${coverage.chainLevel} chain-level`);
  for (const h of health) {
    log(`  ${h.id}: ${h.status}${h.error ? ' — ' + h.error : ''} (${h.count})`);
  }
}

main().catch((err) => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});
