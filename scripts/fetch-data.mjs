/*
  FONTCAST · hourly data job
  --------------------------
  Fetches the Brussels weather (Open-Meteo, or MET Norway as a fallback) and fine particles PM2.5
  (IRCEL-CELINE, or Open-Meteo/CAMS as a fallback), then writes
  data/latest.json for the web pages to read.

  Golden rule: never write a broken file. If a source fails, we keep the
  last good values for that source and note the problem in the file.

  Run it yourself with:  node scripts/fetch-data.mjs
  (add --met to skip Open-Meteo and test the MET Norway fallback)
  It needs Node 18 or newer and no extra packages.
*/

import { readFile, writeFile, mkdir } from "node:fs/promises";
import config from "../config.js";
import { openMeteo, metNorway } from "../src/weather.js";

const OUT = new URL("../data/latest.json", import.meta.url);
const now = new Date();
const problems = [];

// ---------- small helpers ----------

// Download JSON. Give up after 20 seconds; try 3 times, waiting a little longer each time.
async function getJSON(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "fontcast (github.com/lnyssen/fontcast)" },
        signal: AbortSignal.timeout(20000),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
      return JSON.parse(text);
    } catch (err) {
      // "fetch failed" alone says nothing: add the network reason (timeout, DNS, reset…)
      const why = err.cause?.code || err.cause?.message;
      lastError = new Error(`${err.message}${why ? ` (${why})` : ""}, after ${attempt} attempt(s)`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 5000));
    }
  }
  throw lastError;
}

const isNumber = (v) => typeof v === "number" && Number.isFinite(v);
const hoursSince = (iso) => (now - new Date(iso)) / 3600000;

// Open-Meteo gives local times without an offset ("2026-11-14T11:00")
// plus the offset in seconds. Turn that into a proper UTC timestamp.
function localToUTC(local, offsetSeconds) {
  const asIfUTC = new Date(local + "Z").getTime();
  return new Date(asIfUTC - offsetSeconds * 1000).toISOString();
}

// ---------- 1. weather ----------
// Open-Meteo first. GitHub's machines are shared, and Open-Meteo sometimes
// refuses them for the rest of the day (HTTP 429, daily limit): then MET Norway.

async function fetchWeather() {
  try {
    // --met: skip Open-Meteo, to test the fallback
    if (process.argv.includes("--met")) throw new Error("skipped (--met)");
    return await openMeteo(config, getJSON, now);
  } catch (err) {
    problems.push(`Open-Meteo unavailable, used MET Norway: ${err.message}`);
    return await metNorway(config, getJSON, now);
  }
}

// ---------- 2. air quality ----------

// First choice: the measured value at the IRCEL-CELINE station.
async function fetchIrcel() {
  const { url, station, maxAgeHours, attribution } = config.air;
  const data = await getJSON(url);
  const last = data.lastValue;
  if (!last || !isNumber(last.value) || !isNumber(last.timestamp)) {
    throw new Error("IRCEL-CELINE returned no usable lastValue");
  }
  const measuredAt = new Date(last.timestamp).toISOString();
  const age = hoursSince(measuredAt);
  if (age > maxAgeHours) {
    throw new Error(`IRCEL-CELINE latest value is ${age.toFixed(1)} h old (limit ${maxAgeHours} h)`);
  }
  if (last.value < 0) throw new Error(`IRCEL-CELINE value is negative (${last.value})`);
  return {
    source: "IRCEL-CELINE",
    attribution,
    station,
    pm2_5: last.value,
    unit: data.uom || "µg/m³",
    measuredAt,
    fetchedAt: now.toISOString(),
  };
}

// Fallback: the CAMS model value served by Open-Meteo.
async function fetchAirFallback() {
  const { url, attribution } = config.airFallback;
  const { latitude, longitude, timezone } = config.place;
  const params = new URLSearchParams({ latitude, longitude, timezone, current: "pm2_5" });
  const data = await getJSON(`${url}?${params}`);
  const v = data.current?.pm2_5;
  if (!isNumber(v)) throw new Error(`Open-Meteo air quality did not return "pm2_5" (got ${JSON.stringify(v)})`);
  return {
    source: "Open-Meteo (CAMS)",
    attribution,
    station: "model forecast, no station",
    pm2_5: v,
    unit: data.current_units?.pm2_5 || "µg/m³",
    measuredAt: localToUTC(data.current.time, data.utc_offset_seconds ?? 0),
    fetchedAt: now.toISOString(),
  };
}

async function fetchAir() {
  try {
    return await fetchIrcel();
  } catch (err) {
    problems.push(`IRCEL-CELINE unavailable, used fallback: ${err.message}`);
    return await fetchAirFallback();
  }
}

// ---------- 3. put it together ----------

let previous = null;
try {
  previous = JSON.parse(await readFile(OUT, "utf8"));
} catch {
  // first run: no previous file, that's fine
}

let weather, air;
try {
  weather = await fetchWeather();
} catch (err) {
  problems.push(`Weather: ${err.message}`);
  weather = previous?.weather ?? null; // keep the last good reading
}
try {
  air = await fetchAir();
} catch (err) {
  problems.push(`Air quality: ${err.message}`);
  air = previous?.air ?? null;
}

if (!weather && !air) {
  console.error("Nothing could be fetched and there is no previous file.\n" + problems.join("\n"));
  process.exit(1);
}

const result = {
  generatedAt: now.toISOString(),
  place: config.place,
  weather,
  air,
  problems,
};

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(OUT, JSON.stringify(result, null, 2) + "\n");

console.log(JSON.stringify(result, null, 2));
if (problems.length) console.warn("\nProblems:\n- " + problems.join("\n- "));
