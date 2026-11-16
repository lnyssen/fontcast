# Fontcast

A live typographic poster for Brussels. Real weather and air-quality data reshape the letterforms, their case and the sky behind them, every hour.

## How it works

1. **Every hour**, a GitHub Action (`.github/workflows/hourly.yml`) runs `scripts/fetch-data.mjs`.
2. The script fetches the weather from Open-Meteo and the fine particles (PM2.5) from IRCEL-CELINE, then saves them in `data/latest.json`.
3. That commit makes Vercel republish the site. The pages read `data/latest.json`.

Every day at 12:30 Brussels time, a second Action (`.github/workflows/daily-archive.yml`) runs `scripts/snapshot.mjs` and saves the noon poster in `archive/YYYY/` as SVG (for print), PNG (2000 px wide) and JSON (the data used).

To download the whole archive at once: on GitHub, **Code → Download ZIP**.

If a source fails, the last good values are kept and the problem is noted in the file. The page never breaks.

## Pages

| Page | What it shows |
|---|---|
| `index.html` | The live poster. Add `?simulate` to the address to test any weather with sliders |
| `debug.html` | Raw values, their source and their age |
| `archive.html` | One poster a day, at noon: grid of past days, with SVG, PNG and data downloads |
| `prototype/` | The original prototype with simulated weather |

## Code

| File | Role |
|---|---|
| `src/glyphs.js` | Letter skeletons |
| `src/letters.js` | Weather → letterforms (width, weight, slant, counters, corners, case, serifs, contrast, hollow at night) |
| `src/sky.js` | Weather → two colours, paper + ink, chosen by the kind of weather and flipped at night |
| `src/render.js` | The shared poster function: weather in, SVG out |
| `src/live.js` | Turns `data/latest.json` into the weather the poster needs |
| `src/weather.js` | Weather sources: Open-Meteo, and MET Norway when Open-Meteo refuses GitHub (daily quota) |

## Settings

Everything about the place, the sources and the ranges lives in **`config.js`**.

## Run the data job yourself

Needs Node 18 or newer. The data job needs no extra packages; the archive job uses `@resvg/resvg-js` to make the PNG (`npm ci` installs it).

```
node scripts/fetch-data.mjs
npm ci && node scripts/snapshot.mjs --force
```

## Data sources and credits

- Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0), used under the free non-commercial terms.
- Air quality: [IRCEL-CELINE](https://www.irceline.be/) (CC BY 4.0), station 41REG1, Brussels, Boulevard du Régent. Real-time values are not validated.
- Fallback air quality: [Open-Meteo.com](https://open-meteo.com/en/docs/air-quality-api), CAMS European air quality forecast (CC BY 4.0).
- Poster small text: [IBM Plex Mono](https://github.com/IBM/plex) (SIL Open Font License 1.1). The archive job downloads it from Google Fonts at each run; it is not stored in this repository.
