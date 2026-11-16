/*
  FONTCAST · weather sources
  --------------------------
  Shared by the hourly job (scripts/fetch-data.mjs, on GitHub) and the live
  page (index.html, in the visitor's browser), so both read the weather the
  same way.

  openMeteo()   first choice: Open-Meteo forecast API.
  metNorway()   fallback for the hourly job: MET Norway (api.met.no), used
                when Open-Meteo refuses GitHub's shared machines (daily quota).
                Values are renamed to the Open-Meteo names, so the rest of the
                code does not need to know where they came from.

  getJSON(url) is passed in: the job adds a User-Agent and retries, the browser
  uses a plain fetch.
*/

const isNumber = (v) => typeof v === "number" && Number.isFinite(v);

// Open-Meteo gives local times without an offset ("2026-11-14T11:00")
// plus the offset in seconds. Turn that into a proper UTC timestamp.
function localToUTC(local, offsetSeconds) {
  const asIfUTC = new Date(local + "Z").getTime();
  return new Date(asIfUTC - offsetSeconds * 1000).toISOString();
}

export async function openMeteo(config, getJSON, now = new Date()) {
  const { url, current, daily, attribution } = config.weather;
  const { latitude, longitude, timezone } = config.place;
  const params = new URLSearchParams({
    latitude, longitude, timezone,
    current: current.join(","),
    daily: daily.join(","),
    forecast_days: "1",
  });
  const data = await getJSON(`${url}?${params}`);

  // Check that every value we asked for really came back as a number.
  const values = {};
  for (const name of current) {
    const v = data.current?.[name];
    if (!isNumber(v)) throw new Error(`Open-Meteo did not return "${name}" (got ${JSON.stringify(v)})`);
    values[name] = v;
  }
  const sunrise = data.daily?.sunrise?.[0];
  const sunset = data.daily?.sunset?.[0];
  if (!sunrise || !sunset) throw new Error("Open-Meteo did not return sunrise/sunset");

  const offset = data.utc_offset_seconds ?? 0;
  return {
    source: "Open-Meteo",
    attribution,
    measuredAt: localToUTC(data.current.time, offset),
    fetchedAt: now.toISOString(),
    values,
    units: Object.fromEntries(current.map((n) => [n, data.current_units?.[n] ?? ""])),
    sunrise: localToUTC(sunrise, offset),
    sunset: localToUTC(sunset, offset),
  };
}

// "+01:00": the offset of the time zone on that date
function offsetOf(date, timezone) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset" })
    .formatToParts(date).find((p) => p.type === "timeZoneName").value; // "GMT+01:00"
  return name === "GMT" ? "+00:00" : name.slice(3);
}

export async function metNorway(config, getJSON, now = new Date()) {
  const { latitude, longitude, timezone } = config.place;
  const lat = latitude.toFixed(4), lon = longitude.toFixed(4);
  const fc = await getJSON(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`);
  const series = fc.properties?.timeseries;
  if (!series?.length) throw new Error("MET Norway returned no timeseries");
  // the latest step that has started (steps are hourly near the start)
  const step = series.filter((s) => new Date(s.time) <= now).pop() || series[0];
  const d = step.data?.instant?.details || {};
  const rain = step.data?.next_1_hours?.details?.precipitation_amount ?? 0;

  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const sun = await getJSON(`https://api.met.no/weatherapi/sunrise/3.0/sun?lat=${lat}&lon=${lon}&date=${ymd}&offset=${encodeURIComponent(offsetOf(now, timezone))}`);
  const sunrise = sun.properties?.sunrise?.time, sunset = sun.properties?.sunset?.time;
  if (!sunrise || !sunset) throw new Error("MET Norway did not return sunrise/sunset");

  const values = {
    temperature_2m: d.air_temperature,
    relative_humidity_2m: d.relative_humidity,
    precipitation: rain,
    wind_speed_10m: isNumber(d.wind_speed) ? Math.round(d.wind_speed * 36) / 10 : d.wind_speed, // m/s → km/h
    wind_direction_10m: d.wind_from_direction,
    cloud_cover: d.cloud_area_fraction,
    pressure_msl: d.air_pressure_at_sea_level,
    is_day: now >= new Date(sunrise) && now <= new Date(sunset) ? 1 : 0,
  };
  for (const [k, v] of Object.entries(values)) {
    if (!isNumber(v)) throw new Error(`MET Norway did not return "${k}" (got ${JSON.stringify(v)})`);
  }
  return {
    source: "MET Norway",
    attribution: "Weather data by MET Norway (CC BY 4.0)",
    measuredAt: new Date(step.time).toISOString(),
    fetchedAt: now.toISOString(),
    values,
    units: { temperature_2m: "°C", relative_humidity_2m: "%", precipitation: "mm", wind_speed_10m: "km/h", wind_direction_10m: "°", cloud_cover: "%", pressure_msl: "hPa", is_day: "" },
    sunrise: new Date(sunrise).toISOString(),
    sunset: new Date(sunset).toISOString(),
  };
}
