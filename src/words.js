/*
  FONTCAST · weather → word
  -------------------------
  The main word on the poster names the weather of the moment.
  wordFor() reads the conditions in order of strength (rain first, then wind,
  pollution, cold, heat, fog, clouds) and takes the first that applies.
  Each condition has a few words; which one is used depends on the date only,
  so the word stays the same all day while the weather stays the same, and the
  noon archive gets a little variety over the year.

  To change the words, edit the lists below. Letters, digits and . , : - ' / ! ?
  are available; anything else is skipped when drawn.
*/

import { rnd } from "./utils.js";

const WORDS = {
  downpour: ["Downpour", "Deluge", "Torrent"],
  rain: ["Rain", "Showers", "Wet"],
  drizzle: ["Drizzle", "Mizzle", "Damp"],
  gale: ["Gale", "Storm"],
  wind: ["Gust", "Blustery", "Windy"],
  haze: ["Haze", "Smog", "Murk"],
  frost: ["Frost", "Freeze", "Ice"],
  cold: ["Chilly", "Nippy", "Cold"],
  heat: ["Heat", "Swelter", "Scorch"],
  fog: ["Fog", "Mist"],
  overcast: ["Overcast", "Grey", "Leaden"],
  clouds: ["Cloudy", "Patchy", "Mixed"],
  clearDay: ["Sunny", "Clear", "Bright"],
  clearNight: ["Clear", "Starry", "Still"],
};

// W: the same weather object as poster(). ymd: "2026-11-14" (Brussels date)
export function conditionFor(W) {
  const night = W.hour < W.sunrise || W.hour > W.sunset;
  if (W.rain >= 4) return "downpour";
  if (W.rain >= 0.5) return "rain";
  if (W.rain > 0) return "drizzle";
  if (W.wind >= 50) return "gale";
  if (W.wind >= 30) return "wind";
  if (W.pm >= 25) return "haze";
  if (W.temp <= 0) return "frost";
  if (W.temp >= 28) return "heat";
  if (W.hum >= 95 && W.cloud >= 80) return "fog";
  if (W.temp <= 5) return "cold";
  if (W.cloud >= 85) return "overcast";
  if (W.cloud >= 30) return "clouds";
  return night ? "clearNight" : "clearDay";
}

export function wordFor(W, ymd) {
  const c = conditionFor(W), list = WORDS[c];
  return list[Math.floor(rnd("word|" + ymd + "|" + c) * list.length)];
}
