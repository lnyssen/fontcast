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
  - sun and moon are sharp flat discs, clouds are sharp flat capsules: no blur anywhere;
  - sky uses the real sunrise and sunset.
- `index.html` is the live poster (re-reads the data every 10 min, the sky follows the clock every minute). `?simulate` brings back the sliders, with a humidity slider and a "Live values" button.
- Footer: "updated HH:MM · data Open-Meteo, IRCEL-CELINE" (or CAMS), or "last data HH:MM, not updated since" after 3 h.
- Open question: Open-Meteo's current `precipitation` may be the amount of the last 15 minutes, not per hour. Not verified.
