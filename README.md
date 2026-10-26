# おトクマップ · OtokuMap

A bilingual (English / 日本語) supermarket deal finder for Japan. Shoppers can browse **without an account** and choose how to shop:

- **Dealwise（おトク順）** — every deal ranked by its deal score, so the biggest bargains come first even if the shop is slightly farther away.
- **Nearest（近い順）** — deals grouped by the supermarkets closest to you.

The customer site combines two layers:

1. **Every supermarket near the user** — a static OpenStreetMap index of Japanese supermarkets (`data/stores.json`), filtered in the browser by radius.
2. **Real flyer links** — refreshed from official retailer websites every six hours (`data/flyers.json`).

The demo deals and prices are still sample data. The store index and flyer links are real.

Everything is plain HTML, CSS and JavaScript on GitHub Pages — **no runtime backend, no paid APIs, no paid hosting**.

---

## Quick start

1. Install Node 20+ (Node 24 is used in CI) and serve the folder:

   ```bash
   cd C:\sotsugyo
   python -m http.server 8000
   ```

   Then visit <http://localhost:8000>.

2. The project is configured in `js/config.js` with a Google Maps key. To use your own key, replace `googleMapsApiKey` (see [Google Maps setup](#google-maps-setup)).

3. Allow location access when prompted, or pick a Tokyo area from the **Area** dropdown. If permission is blocked, the app defaults to Tokyo Station.

> Geolocation only works on `localhost` or HTTPS in most browsers. The Google map and web fonts need an internet connection. The supermarket list and flyer links come from static JSON, so they do not need a Google Places key.

Add `?lang=ja` or `?lang=en` to any page URL to force a language (`index.html?lang=ja`).

---

## Pages

| Page | Who it's for | Notes |
| --- | --- | --- |
| `index.html` | Shoppers | Location, radius, two shopping modes, filters, favourites, map, nearby supermarkets, flyer viewer. |
| `login.html` | Shops | Demo login. Accounts are checked in the browser. |
| `dashboard.html` | Signed-in shops | Stats, deal list, add/edit/pause/delete, reset demo data. |

### Demo shop accounts

Password for all demo accounts: **`demo1234`**

| Shop | Email |
| --- | --- |
| イオンスタイル 板橋店 / AEON Style Itabashi | `aeon@demo.jp` |
| 西友 高円寺店 / Seiyu Koenji | `seiyu@demo.jp` |
| 業務スーパー 中野店 / Gyomu Super Nakano | `gyomu@demo.jp` |
| ライフ 渋谷東店 / Life Shibuya Higashi | `life@demo.jp` |

The login page has one-click buttons that fill in these details. You can add more accounts in the `ACCOUNTS` array at the top of `js/shop.js`.

---

## Features

### Shopper side

- **Dealwise / Nearest toggle** with different layouts and sort orders.
- **Deal score (0–100)** combining discount percentage, urgency and price level.
- **Radius** of 1 / 3 / 5 / 10 / 25 km (straight-line distance).
- **Search** across product names, notes and shop names in both languages.
- **Filters**: category (10 types), shop, minimum discount, saved deals only.
- **Favourites** stored in `localStorage`.
- **Google Map** with two kinds of pins:
  - coloured price tags for the demo deal shops;
  - green dots for a sample of up to 120 real stores from OpenStreetMap, spread across the radius. The list below the map contains **all** stores inside the radius.
- **Nearby supermarkets list** with real store names, addresses, distance and a Google Maps directions link.
- **Flyer chips** on nearby stores and deal cards. A store-level match opens the official store flyer page. Regional or chain-level fallbacks are clearly labelled.
- **Flyer dialog** with validity dates, source, a branded preview and an “Open official flyer” link. Flyer images stay on the retailer's site.
- **Coverage count** under the nearby heading, e.g. `272 of 1035 stores have a flyer link`.
- Fully responsive down to 320 px, keyboard focus styles, and `prefers-reduced-motion` support.

### Shop side

- Browser-only demo authentication (see limitations below).
- Dashboard stats: live deals, average discount, best discount, deals ending within 48 hours.
- Add a deal with Japanese and/or English names, category, regular/deal price, details, end date and visibility.
- Edit, pause/resume and delete deals, including seeded sample deals.
- “Reset demo data” restores the original sample deals and removes local edits.

---

## Data pipeline

```text
OpenStreetMap Overpass
        │  scripts/build-stores.mjs
        ▼
data/stores.json ──────────────┐
                               │
Official retailer pages        │
        │  scripts/fetch-flyers.mjs
        ▼                      ▼
data/flyers.json ───────► static GitHub Pages site
```

### 1. Supermarket index (`data/stores.json`)

`scripts/build-stores.mjs` asks the public Overpass API for every `shop=supermarket` in Japan. It queries one prefecture at a time, retries mirrors, deduplicates by OSM ID and writes a compact JSON file.

```bash
# Full rebuild (all 47 prefectures)
node scripts/build-stores.mjs --all-prefectures --out=data/stores.json

# Smaller local test
node scripts/build-stores.mjs --bbox=35.60,139.60,35.80,139.90 --out=data/stores.tokyo.json

# Resume from data/stores.json.checkpoint.json after a server error
node scripts/build-stores.mjs --all-prefectures --out=data/stores.json --resume

# Re-query specific prefectures even if the checkpoint says they finished
node scripts/build-stores.mjs --prefectures=千葉県,静岡県 --out=data/stores.json --resume --force

# CI mode: fail instead of committing a partial index when any area fails
node scripts/build-stores.mjs --all-prefectures --out=data/stores.json --strict
```

Each store contains:

```json
{
  "id": "osm:node/123456",
  "name": "ライフ 渋谷東店",
  "nameEn": "Life Shibuya Higashi",
  "brand": "ライフ",
  "chain": "life",
  "lat": 35.658,
  "lng": 139.704,
  "address": "東京都渋谷区...",
  "prefecture": "東京都",
  "region": "東京都",
  "osmType": "node",
  "osmId": 123456,
  "website": ""
}
```

The browser filter is in `js/stores.js`. It loads the JSON once, calculates straight-line distance, sorts by distance and returns every store inside the radius.

### 2. Flyer links (`data/flyers.json`)

`scripts/fetch-flyers.mjs` runs the official-source adapters in `scripts/sources/index.mjs`:

| Chain | Source | Level | What is extracted |
| --- | --- | --- | --- |
| ライフ / Life | `store.lifecorp.jp` official store pages | Store | Store name, address, coordinates and the official page that embeds the flyer widget. |
| 西友 / Seiyu | `seiyu.co.jp/flyer/chirashi/` | Region / store | Weekly flyer page, region, validity week and official flyer image URL. |
| ドン・キホーテ / Don Quijote | `donki.com/chirashi/` | Store | Store name, official store flyer page (`#leaflet`) and current flyer listing. |
| 業務スーパー / Gyomu | `gyomusuper.jp/sale/` | Chain | Current official sale information and validity dates. |
| イトーヨーカドー / Ito-Yokado | `stores.itoyokado.co.jp` | Chain | Official store/flyer finder. |
| サミット / Summit | `summitstore.co.jp/store/` | Chain | Official store/flyer finder. |
| Other major chains | Official homepages / store finders | Chain | A verified official link, clearly labelled as a finder rather than a branch flyer. |

The build also adds a chain-level fallback link for AEON, OK Store, Costco, Maruetsu, Yaoko, Belc, Trial, Inageya and Ropia.

```bash
node scripts/fetch-flyers.mjs
```

Useful environment variables:

```bash
LIFE_MAX_STORES=40   # limit Life detail-page requests (0 = all)
LIFE_CONCURRENCY=3   # parallel Life requests
```

The output is a list of flyer records:

```json
{
  "id": "life-east874",
  "chain": "life",
  "brand": "ライフ",
  "level": "store",
  "title": { "ja": "Webチラシ", "en": "Web flyer" },
  "url": "https://store.lifecorp.jp/detail/east874/",
  "image": null,
  "storeName": "ライフ神田和泉町店",
  "address": "東京都千代田区...",
  "lat": 35.696,
  "lng": 139.773,
  "validFrom": null,
  "validTo": null,
  "source": "life-official",
  "sourceLabel": "ライフ公式サイト",
  "checkedAt": "2026-10-26T05:27:19.216Z"
}
```

### 3. Flyer matching in the browser

`js/flyers.js` matches in this order:

1. **Store level** — same chain, plus branch-name match, address similarity or close coordinates.
2. **Region level** — same chain and the store's prefecture is covered by the regional flyer. Labelled as approximate.
3. **Chain level** — an official store/flyer finder. Labelled “Find flyer”, never presented as this branch's exact flyer.

Only store-level matches with a high score are shown as exact. If there is no match, no chip is shown.

### 4. Validation

```bash
node scripts/validate.mjs
```

Checks both JSON files for required fields, valid URLs, valid dates, coordinate ranges and duplicate IDs.

---

## GitHub Actions (zero-cost refresh)

| Workflow | Schedule | What it does |
| --- | --- | --- |
| `.github/workflows/flyers.yml` | Every 6 hours + manual | Runs `fetch-flyers.mjs`, validates, commits `data/flyers.json`. |
| `.github/workflows/stores.yml` | Monthly + manual | Rebuilds `data/stores.json` from OpenStreetMap, validates, commits. |
| `.github/workflows/validate.yml` | Push / PR | Runs the validator. |

The workflows use the built-in `GITHUB_TOKEN`; no secrets are required. GitHub may pause scheduled workflows after 60 days without repository activity — the fresh `generatedAt` timestamp on each commit keeps the data current and the repository active.

### Publishing on GitHub Pages

1. Create a **public** GitHub repository and push this folder.
2. Go to **Settings → Pages** and set the source to **Deploy from a branch** → `main` → `/ (root)`.
3. Visit `https://<user>.github.io/<repo>/`.
4. Add that URL to the Google Maps key's **Website restrictions**, then trigger the workflows manually once.

No server, database, paid API or paid hosting is required.

---

## Project structure

```text
index.html                  Shopper app (no login)
login.html                  Shop login
dashboard.html              Shop dashboard
css/styles.css              All styling
js/config.js                Google Maps API key + Places fallback options
js/data.js                  Demo shops, deals, categories, areas
js/i18n.js                  English/Japanese strings and language switching
js/ui.js                    Language buttons + toast helper
js/store.js                 Data layer: localStorage, dates, distances, sorting helpers
js/stores.js                Static OpenStreetMap store loader/filter
js/flyers.js                Flyer loader + store/region/chain matching
js/google-maps.js           Google Maps loader, deal pins, Places fallback
js/app.js                   Shopper logic: geolocation, filters, ranking, map, nearby list, flyer dialog
js/shop.js                  Demo auth + dashboard CRUD
scripts/build-stores.mjs    Resumable OpenStreetMap store-index builder
scripts/fetch-flyers.mjs    Flyer refresh entrypoint
scripts/validate.mjs        JSON validator
scripts/sources/index.mjs   Official retailer adapters
scripts/lib/http.mjs        Fetch/retry/robots helpers
scripts/lib/normalize.mjs   Chain aliases, name/address normalization
data/stores.json            Generated store index
data/flyers.json            Generated flyer links
data/flyer-overrides.json   Manual flyer corrections
```

---

## Google Maps setup

The map uses:

| API | Used for |
| --- | --- |
| **Maps JavaScript API** | The interactive map, markers and popups. |
| **Places API (New)** | Optional fallback when the static store index has no stores in the radius. |

The nearby supermarket list does **not** require Places. It works from `data/stores.json` even if the Google key is missing or rejected.

### Configuration

```js
window.OTOKU_CONFIG = {
  googleMapsApiKey: 'YOUR_KEY_HERE',
  mapId: 'DEMO_MAP_ID',
  placesRegion: 'JP',
  placesMaxResults: 20,
  placeTypes: ['supermarket'],
  mapLanguage: 'auto'
};
```

- **`mapId`** — `DEMO_MAP_ID` works for development. Create a Map ID in Google Cloud for production styling.
- **`placesMaxResults`** — the Places fallback returns at most 20 nearby results; the static OSM index is the main source.
- **`placeTypes`** — `['supermarket']` gives the cleanest results.

### Getting a key

**Free development option (no credit card):** <https://mapsplatform.google.com/maps-demo-key/>

**Standard key:** create a project in [Google Cloud Console](https://console.cloud.google.com/), enable **Maps JavaScript API** (and optionally **Places API (New)**), then create an API key under **APIs & Services → Credentials**. A billing account is normally required for a standard key, even while using the free monthly quota.

### Restrict the key before publishing

1. **Application restrictions → Websites**
   - `http://localhost:8000/*`
   - `http://127.0.0.1:8000/*`
   - `https://<user>.github.io/<repo>/*`
2. **API restrictions** — allow only **Maps JavaScript API** and, if you keep the fallback, **Places API (New)**.
3. Set a daily quota / budget alert in Google Cloud.

If the key was ever pasted into a chat, issue tracker or public repository, rotate it.

### Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Map is grey / “For development purposes only” | Billing is not enabled, or the key is a Demo Key with no quota left. |
| `Google Maps rejected the key` message | Maps JavaScript API is not enabled, the key is restricted to another referrer, or the key is invalid. |
| Map missing but the nearby list works | Expected: the static store list does not depend on Google. Add a valid key to show the map. |
| Nearby list shows an error | `data/stores.json` is missing or the browser blocked the JSON request. Serve over HTTP and check the file exists. |
| Works on `localhost` but not by double-clicking `index.html` | `file://` is not an allowed referrer. Serve the folder over HTTP. |

---

## Data licenses and etiquette

- **Store data:** © OpenStreetMap contributors, available under the [Open Database License (ODbL 1.0)](https://www.openstreetmap.org/copyright). The attribution is shown in the UI.
- **Flyer data:** links and metadata from official retailer websites. Flyer images are never copied into this repository. Seiyu flyer image URLs point at the official Seiyu site; the dialog labels the source.
- **Respect robots.txt and rate limits.** The scripts use a clear user agent, retries and low concurrency. Do not add flyer aggregators that forbid crawling.
- **No paid services.** GitHub Actions, GitHub Pages, OpenStreetMap/Overpass and the official retailer pages are used without paid plans. The Google Maps key is the only optional third-party service and has a free tier.

---

## License

The application code is released under the MIT License (see `LICENSE`). Store data is © OpenStreetMap contributors under ODbL 1.0. Flyer links and metadata remain the property of the respective retailers; no flyer images are rehosted in this repository.

## Limitations / production notes

- **Deal prices are sample data.** Real flyers are linked, but OtokuMap does not parse individual prices from flyer images. A production price feed would need OCR or retailer data.
- **Flyer coverage is best-effort.** Not every retailer publishes a machine-readable flyer. Life, Seiyu and Don Quijote provide the most store-level coverage; other chains fall back to official store/flyer finders.
- **Regional flyers are approximate.** A Seiyu regional flyer may cover a group of stores, not one exact branch. The dialog says so.
- **Authentication is not secure.** Credentials are checked in `js/shop.js` and the session lives in `sessionStorage`. A real service needs a server, hashed passwords and signed sessions.
- **No shared database.** Deals posted in the dashboard are visible only in that browser.
- **The Google key is public in the browser.** Keep it restricted and quota-limited; never use an unrestricted billing key in production.
- **The map shows up to 120 supermarkets.** They are spatially sampled across the radius, not just the closest ones, so the map still shows coverage at 25 km. The nearby list contains all stores in the radius.
- **Distances are straight-line**, not walking or driving routes. The **Directions** link opens Google Maps with a real route.
