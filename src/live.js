/*
  FONTCAST · from data/latest.json to the weather the poster needs
*/

// Decimal hour (13.5 = 13:30) of a date, in the given time zone
export function hourIn(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return get("hour") + get("minute") / 60;
}

// "11:20" in the given time zone
export const clock = (iso, timezone) =>
  new Date(iso).toLocaleTimeString("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// latest.json → weather object for poster(). `now` sets the hour of the sky.
export function weatherFrom(data, now, timezone) {
  const v = data.weather?.values || {};
  return {
    hour: hourIn(now, timezone),
    sunrise: data.weather ? hourIn(new Date(data.weather.sunrise), timezone) : 8,
    sunset: data.weather ? hourIn(new Date(data.weather.sunset), timezone) : 17,
    temp: v.temperature_2m ?? 10,
    hum: v.relative_humidity_2m ?? 70,
    rain: v.precipitation ?? 0,
    wind: v.wind_speed_10m ?? 0,
    dir: v.wind_direction_10m ?? 0,
    cloud: v.cloud_cover ?? 50,
    pres: v.pressure_msl ?? 1013,
    pm: data.air?.pm2_5 ?? 10,
  };
}

// Text at the bottom right: when the data was updated and where it comes from.
// If it is too old, say so discreetly (the poster keeps the last known sky).
export function footerFrom(data, now, timezone, staleAfterHours) {
  const times = [data.weather?.fetchedAt, data.air?.fetchedAt].filter(Boolean).sort();
  const oldest = times[0] || data.generatedAt;
  const hours = (now - new Date(oldest)) / 3600000;
  const sources = [data.weather?.source || "Open-Meteo", data.air?.source === "IRCEL-CELINE" ? "IRCEL-CELINE" : "CAMS via Open-Meteo"].join(", ");
  const when = hours > staleAfterHours
    ? `last data ${clock(oldest, timezone)}, not updated since`
    : `updated ${clock(oldest, timezone)}`;
  return `${when} · data ${sources}`;
}
