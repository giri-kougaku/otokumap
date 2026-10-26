#!/usr/bin/env node
/* Validate the generated JSON files before GitHub Actions commits them. */

import fs from 'node:fs/promises';
import path from 'node:path';
import { isValidHttpUrl } from './lib/normalize.mjs';

const ROOT = process.cwd();
const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, file), 'utf8'));
  } catch (err) {
    fail(`${file}: ${err.message}`);
    return null;
  }
}

function checkDate(value, label) {
  if (!value) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${label}: invalid date ${JSON.stringify(value)}`);
}

async function main() {
  const stores = await readJson('data/stores.json');
  const flyers = await readJson('data/flyers.json');

  if (stores) {
    if (!Array.isArray(stores.stores)) fail('stores.json: stores must be an array');
    else {
      const ids = new Set();
      for (const [i, store] of stores.stores.entries()) {
        if (!store || typeof store !== 'object') { fail(`stores.json[${i}]: not an object`); continue; }
        if (!store.id) fail(`stores.json[${i}]: missing id`);
        else if (ids.has(store.id)) fail(`stores.json[${i}]: duplicate id ${store.id}`);
        else ids.add(store.id);
        if (typeof store.lat !== 'number' || store.lat < 20 || store.lat > 47) fail(`stores.json[${i}]: bad lat`);
        if (typeof store.lng !== 'number' || store.lng < 122 || store.lng > 154) fail(`stores.json[${i}]: bad lng`);
        if (!store.name) fail(`stores.json[${i}]: missing name`);
        if (!store.chain) fail(`stores.json[${i}]: missing chain`);
      }
      if (stores.count && stores.count !== stores.stores.length) warnings.push(`stores.json: count ${stores.count} != ${stores.stores.length}`);
    }
  }

  if (flyers) {
    if (!Array.isArray(flyers.flyers)) fail('flyers.json: flyers must be an array');
    else {
      const ids = new Set();
      for (const [i, flyer] of flyers.flyers.entries()) {
        if (!flyer || typeof flyer !== 'object') { fail(`flyers.json[${i}]: not an object`); continue; }
        if (!flyer.id) fail(`flyers.json[${i}]: missing id`);
        else if (ids.has(flyer.id)) fail(`flyers.json[${i}]: duplicate id ${flyer.id}`);
        else ids.add(flyer.id);
        if (!flyer.chain) fail(`flyers.json[${i}]: missing chain`);
        if (!['store', 'region', 'chain'].includes(flyer.level)) fail(`flyers.json[${i}]: bad level ${flyer.level}`);
        if (!flyer.url || !isValidHttpUrl(flyer.url)) fail(`flyers.json[${i}]: bad url`);
        if (flyer.image && !isValidHttpUrl(flyer.image)) fail(`flyers.json[${i}]: bad image url`);
        if (!flyer.title || !flyer.title.ja || !flyer.title.en) fail(`flyers.json[${i}]: missing bilingual title`);
        if (flyer.lat != null && (typeof flyer.lat !== 'number' || flyer.lat < 20 || flyer.lat > 47)) fail(`flyers.json[${i}]: bad lat`);
        if (flyer.lng != null && (typeof flyer.lng !== 'number' || flyer.lng < 122 || flyer.lng > 154)) fail(`flyers.json[${i}]: bad lng`);
        checkDate(flyer.validFrom, `flyers.json[${i}].validFrom`);
        checkDate(flyer.validTo, `flyers.json[${i}].validTo`);
        if (flyer.validFrom && flyer.validTo && flyer.validFrom > flyer.validTo) fail(`flyers.json[${i}]: validFrom after validTo`);
      }
    }
  }

  for (const w of warnings) console.warn(`WARN ${w}`);
  if (errors.length) {
    for (const e of errors.slice(0, 50)) console.error(`ERROR ${e}`);
    if (errors.length > 50) console.error(`… and ${errors.length - 50} more`);
    process.exit(1);
  }
  console.log(`OK — ${stores ? stores.stores.length : 0} stores, ${flyers ? flyers.flyers.length : 0} flyers`);
}

main().catch((err) => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});
