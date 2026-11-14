# Fontcast · log

## Phase 0 · understand (2026-11-14)

- Read the brief and the prototype.
- Checked the Open-Meteo docs and terms (free for non-commercial use, CC BY 4.0; the air-quality API also requires a CAMS credit).
- IRCEL-CELINE: chose the REST timeseries API. Closest PM2.5 station to the Grand-Place is 41REG1 (Boulevard du Régent, about 1.1 km), timeseries 100034.
- Hosting: Vercel's free cron runs only once a day, so the hourly job runs on GitHub Actions and Vercel only serves the pages.
- Decisions (Laurent): centre = Grand-Place, station = 41REG1, non-commercial project, public repository.

## Phase 1 · real data in (2026-11-14)

- `config.js`: the single settings file.
- `scripts/fetch-data.mjs`: fetches both sources, checks every value, falls back to Open-Meteo/CAMS when IRCEL is missing or older than 3 hours, keeps the last good values on failure, writes `data/latest.json`.
- `.github/workflows/hourly.yml`: runs at 20 minutes past every hour; commits the file on `main` only.
- `debug.html`: plain page with the raw values, their source and their age.
- The prototype is kept unchanged in `prototype/index.html`.

### Phase 1 follow-ups

- Overlapping runs no longer fail (the job saves on top of the newest `main`).
- Relative humidity added to the data.
- The data job now waits 5 s, then 10 s between attempts, and names the network error.

## Phase 2 · live poster (2026-11-14)

- Prototype split into modules (`src/`), look unchanged except for Laurent's requests:
  - humidity drives serifs (50 % = sans serif, 95 % = full serifs), on every free stroke end;
  - background is one flat colour, no sun, moon, clouds, stars, rain or grain (Laurent's call). The colour still carries time of day (real sunrise and sunset), clouds, temperature, rain and pollution;
  - ink is dark or light, whichever gives the higher WCAG contrast with that colour.
- `index.html` is the live poster (re-reads the data every 10 min, the sky follows the clock every minute). `?simulate` brings back the sliders, with a humidity slider and a "Live values" button.
- Footer: "updated HH:MM · data Open-Meteo, IRCEL-CELINE" (or CAMS), or "last data HH:MM, not updated since" after 3 h.
- Open question: Open-Meteo's current `precipitation` may be the amount of the last 15 minutes, not per hour. Not verified.

## Phase 4 · daily archive (2026-11-14)

- `scripts/snapshot.mjs`: at noon Brussels time, freezes the poster as `archive/YYYY/YYYY-MM-DD.svg`, `.png` (2000 px, via `@resvg/resvg-js`, approved by Laurent) and `.json`, then rebuilds `archive/index.json`.
- `.github/workflows/daily-archive.yml`: starts at 10:30 and 11:30 UTC; only the run at 12:30 Brussels does the work (summer/winter time safe). Fetches fresh data first. Manual "Run workflow" with *force* re-does today.
- Both jobs share one concurrency group so they never save at the same time.
- `archive.html`: grid by month, click to view large, download SVG/PNG/data.
- No email (Laurent's choice). Measured: SVG about 30 KB, PNG about 155 KB, so roughly 70 MB a year.
- Phase 3 (case rule refinement, accelerated day in simulate, footer contrast check) is still to do.

## Phase 3 · background and case (2026-11-14)

- Small text contrast is computed, not guessed: the faded date/footer lines use the faintest opacity (from 65 %) that still reaches 4.5:1. Mid-grey skies where neither ink reaches 4.5:1 get their background nudged a few percent away from the ink. Checked on 38,400 combinations of hour, cloud, rain, PM2.5 and temperature: worst case 4.50:1.
- Simulate mode: "Play a day" runs 24 hours in 24 seconds.
- Hour-by-hour sheets of a grey and a clear November day checked: night, dawn (around sunrise), day, dusk (around sunset), night.
- Case rule unchanged (stable per-letter thresholds, flips one by one as pressure falls).
- Glyphs (Laurent chose option D): capital I gets bars top and bottom; lowercase l gets a long rounded foot.

## 2026-11-14 · Main word: a weather word
- Laurent chose a word that names the weather instead of a fixed "Brussels".
- `config.text` is `["{weather}"]`; `src/words.js` picks the word: rain first, then wind, pollution, frost, heat, fog, cold, clouds, clear sky (day or night).
- Each condition has a few words; the date picks one, so the word is stable all day while the weather holds.
- Rain thresholds (0.5 and 4 mm) depend on the precipitation unit, still to verify on a rainy day.

## 2026-11-14 · Poster number and home links
- Posters are numbered from the first day: 2026-11-14 is No. 001 (`config.firstDay`), no longer the day of the year.
- The home page shows two links under the poster: Archive and Data. The data page links back to both.
