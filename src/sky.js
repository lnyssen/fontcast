/*
  FONTCAST · weather → colours ("ink pairs")
  ------------------------------------------
  sky()         the paper (one flat background colour) and the ink.
  background()  the paper as a plain SVG rectangle. No sun, no clouds, no
                gradient: the weather lives in the colour and in the letters.

  Each kind of weather (the same conditions as the main word, src/words.js)
  is printed with its own two colours, like a two-colour poster:
  sunny = yellow + blue, rain = blue + white, heat = orange + cream…
  At night the pair turns over: the darker colour becomes the paper (deepened),
  the lighter one the ink. Around sunrise and sunset it slides between the two.
  The ink always keeps at least a 4.5:1 contrast with the paper (WCAG AA).
*/

import { clamp, mix, contrast, lum } from "./utils.js";
import { conditionFor } from "./words.js";

// condition: [paper, ink] by day. Edit freely: contrast is fixed automatically.
export const PAIRS = {
  clearDay: ["#ffd23f", "#1b3fb5"],
  clearNight: ["#0f1a52", "#ffd23f"],
  clouds: ["#bcd7ee", "#c2302a"],
  overcast: ["#cfcac0", "#2a3a8c"],
  fog: ["#ebe7df", "#5a5f6b"],
  drizzle: ["#a9d3cf", "#0f3d4a"],
  rain: ["#2f62c8", "#e8f1ff"],
  downpour: ["#0d2457", "#6fd6ff"],
  wind: ["#f2f5f7", "#e2462b"],
  gale: ["#e2462b", "#141414"],
  haze: ["#d1ad6e", "#3d2a12"],
  frost: ["#e4f2ff", "#2f55d4"],
  cold: ["#a6dbea", "#14305c"],
  heat: ["#ff5a36", "#fff3cf"],
};

// 0 at night → 1 in full day, with a smooth passage around sunrise and sunset
function daylight(W) {
  const h = W.hour, r = W.sunrise, s = W.sunset;
  if (h < r - 1 || h > s + 1.2) return 0;
  if (h < r + 0.5) return clamp((h - (r - 1)) / 1.5, 0, 1);
  if (h > s - 0.5) return clamp(1 - (h - (s - 0.5)) / 1.7, 0, 1);
  return 1;
}

// The night version of a pair: dark colour as paper (deepened), light colour as ink
function nightPair([a, b]) {
  const [dk, lt] = lum(a) < lum(b) ? [a, b] : [b, a];
  return [mix(dk, "#05070f", 0.55), lt];
}

// W.hour, W.sunrise and W.sunset are decimal hours in Brussels time (13.5 = 13:30)
export function sky(W) {
  const cond = conditionFor(W), day = PAIRS[cond], d = daylight(W);
  const night = cond === "clearNight" ? day : nightPair(day);
  let bg = mix(night[0], day[0], d), ink = mix(night[1], day[1], d);
  // Keep the ink readable: push it toward black or white until it reaches 4.5:1
  const toward = contrast(bg, "#000000") > contrast(bg, "#ffffff") ? "#000000" : "#ffffff";
  for (let i = 0; i < 40 && contrast(bg, ink) < 4.5; i++) ink = mix(ink, toward, 0.05);
  return { bg, ink, contrast: contrast(bg, ink), night: d < 0.5, isDay: W.hour >= W.sunrise && W.hour <= W.sunset, condition: cond };
}

export function background(W, Ky) {
  return `<rect width="1000" height="1414" fill="${Ky.bg}"/>`;
}
