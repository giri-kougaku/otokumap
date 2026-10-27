# OtokuMap demo video

A 90-second screen-recorded walkthrough of the live site. No voiceover, no audio track, and English captions are burned into the picture.

- **Video:** [`otokumap-demo-90s.mp4`](otokumap-demo-90s.mp4)
- **Poster:** [`otokumap-poster.jpg`](otokumap-poster.jpg)
- **Flyer modal still:** [`otokumap-flyer-preview.jpg`](otokumap-flyer-preview.jpg)

## Specifications

| Property | Value |
| --- | --- |
| Length | 90.0 seconds |
| Resolution | 1920 × 1080 |
| Codec | H.264 High profile, level 4.1 |
| Frame rate | 30 fps |
| Pixel format | yuv420p |
| Audio | None |
| Captions | English, burned in |
| Source | Live GitHub Pages site |

## What the video shows

| Time | Scene |
| --- | --- |
| 0:00 | Title card: 19,754 OSM stores, 896 official flyer links, English / 日本語 |
| 0:05 | Homepage at Tokyo Station; 10 km radius |
| 0:15 | Radius changes (5 km → 10 km) and the live map / list update |
| 0:24 | Real OpenStreetMap supermarkets on the map; Life store popup |
| 0:34 | Flyer badge on the nearby Life store |
| 0:43 | Official flyer dialog for Life 神田和泉町 |
| 0:55 | Dealwise → Nearest shopping mode |
| 1:04 | Japanese interface |
| 1:14 | Category filter |
| 1:22 | Closing card with the live URL and coverage totals |

## Data at recording time (27 October 2026)

- **19,754** supermarkets from OpenStreetMap
- **896** official flyer links
- **47** prefectures
- Tokyo Station, 10 km: **1,035** supermarkets, **293** with a flyer link

Store locations and flyer links are real. **Deal prices and discounts are sample data**; they are not parsed from flyer images. Flyer coverage is best-effort and varies by retailer.

## Files

- `record-demo.cjs` — Playwright recording timeline (1600 × 900 capture).
- `overlay-init.js` — injected title cards, English captions, focus ring and cursor.
- The final video is upscaled to 1920 × 1080 with FFmpeg.

## Re-recording

Requirements: Node.js, Google Chrome, FFmpeg, and Playwright.

```bash
cd demo
npm init -y
npm install playwright@1.64.1
npx playwright install ffmpeg
node record-demo.cjs
```

The script writes `site-recording.webm` (1600 × 900, 25 fps). Trim the intro so the result is exactly 90 seconds, then encode:

```bash
ffmpeg -ss <intro-trim-seconds> -i site-recording.webm -t 90 \
  -vf "scale=1920:1080:flags=lanczos,fps=30,fade=t=in:st=0:d=0.45,fade=t=out:st=89:d=1,format=yuv420p" \
  -c:v libx264 -preset slow -crf 18 -profile:v high -level 4.1 \
  -movflags +faststart -an otokumap-demo-90s.mp4
```

The totals shown in the title cards are hard-coded. If the store or flyer data changes, update `overlay-init.js` before re-recording.

## Google Maps key

The live map uses a browser key. Before publishing or sharing, restrict it in Google Cloud Console to:

- `http://localhost:8000/*`
- `http://127.0.0.1:8000/*`
- `https://giri-kougaku.github.io/otokumap/*`

Also restrict the key to **Maps JavaScript API** (and optionally **Places API (New)**), and set a quota or budget alert.
