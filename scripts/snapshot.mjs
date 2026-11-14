/*
  FONTCAST · daily archive
  ------------------------
  Once a day at noon (Brussels time), freeze the poster:
    archive/YYYY/YYYY-MM-DD.svg   vector, for print (book, exhibition)
    archive/YYYY/YYYY-MM-DD.png   image, for viewing and sharing
    archive/YYYY/YYYY-MM-DD.json  the exact data used
  and refresh archive/index.json, the list read by archive.html.

  GitHub starts it at 10:30 and 11:30 UTC; only the run that falls on
  12:30 in Brussels does the work, so summer and winter time both work.

  Run it yourself:  node scripts/snapshot.mjs --force
  (--force: ignore the clock and overwrite today's files)
*/

import { readFile, writeFile, mkdir, readdir, access } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import config from "../config.js";
import { poster } from "../src/render.js";
import { weatherFrom, footerFrom, hourIn } from "../src/live.js";

const root = new URL("../", import.meta.url);
const tz = config.place.timezone;
const force = process.argv.includes("--force");
const now = new Date();

// Today's date in Brussels: "2026-11-14"
const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
const year = ymd.slice(0, 4);

// 1. Is it noon in Brussels?
const hour = Math.floor(hourIn(now, tz));
if (!force && hour !== 12) {
  console.log(`It is ${hour}h in Brussels, not noon: nothing to do.`);
  process.exit(0);
}

const dir = new URL(`archive/${year}/`, root);
const svgFile = new URL(`${ymd}.svg`, dir);
const exists = await access(svgFile).then(() => true, () => false);
if (exists && !force) {
  console.log(`${ymd} is already archived.`);
  process.exit(0);
}

// 2. The poster at noon, from the latest data
const data = JSON.parse(await readFile(new URL("data/latest.json", root), "utf8"));
const W = { ...weatherFrom(data, now, tz), hour: 12 };
const svg = poster(W, {
  lines: config.text,
  ranges: config.ranges, firstDay: config.firstDay,
  date: now,
  timezone: tz,
  footer: footerFrom(data, now, tz, config.staleAfterHours),
});

// 3. PNG. The poster's small text is set in IBM Plex Mono: fetch the official
//    font file from Google Fonts. If that fails, a system monospace is used.
async function plexMono() {
  try {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400",
      { signal: AbortSignal.timeout(15000) })).text();
    const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
    if (!url) throw new Error("no .ttf link in the Google Fonts answer");
    const file = new URL("node_modules/.cache/IBMPlexMono-Regular.ttf", root);
    await mkdir(new URL("node_modules/.cache/", root), { recursive: true });
    await writeFile(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
    return file.pathname;
  } catch (err) {
    console.warn(`IBM Plex Mono not available (${err.message}), using a system monospace for the PNG.`);
    return null;
  }
}
const fontFile = await plexMono();
const png = new Resvg(svg, {
  fitTo: { mode: "width", value: 2000 },
  font: {
    fontFiles: fontFile ? [fontFile] : [],
    loadSystemFonts: true,
    defaultFontFamily: fontFile ? "IBM Plex Mono" : "DejaVu Sans Mono",
    monospaceFamily: fontFile ? "IBM Plex Mono" : "DejaVu Sans Mono",
  },
}).render().asPng();

// 4. Save the three files
await mkdir(dir, { recursive: true });
await writeFile(svgFile, svg);
await writeFile(new URL(`${ymd}.png`, dir), png);
await writeFile(new URL(`${ymd}.json`, dir), JSON.stringify(data, null, 2) + "\n");

// 5. Rebuild archive/index.json from the files on disk (newest first)
const days = [];
for (const y of (await readdir(new URL("archive/", root), { withFileTypes: true })).filter((d) => d.isDirectory())) {
  for (const f of await readdir(new URL(`archive/${y.name}/`, root))) {
    const m = f.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
    if (!m) continue;
    const d = JSON.parse(await readFile(new URL(`archive/${y.name}/${f}`, root), "utf8"));
    const v = d.weather?.values || {};
    days.push({
      date: m[1],
      svg: `archive/${y.name}/${m[1]}.svg`,
      png: `archive/${y.name}/${m[1]}.png`,
      temperature: v.temperature_2m ?? null,
      humidity: v.relative_humidity_2m ?? null,
      precipitation: v.precipitation ?? null,
      pm25: d.air?.pm2_5 ?? null,
    });
  }
}
days.sort((a, b) => b.date.localeCompare(a.date));
await writeFile(new URL("archive/index.json", root), JSON.stringify(days, null, 2) + "\n");

console.log(`Archived ${ymd}: SVG ${(svg.length / 1024).toFixed(0)} KB, PNG ${(png.length / 1024).toFixed(0)} KB. ${days.length} day(s) in the archive.`);
