/*
  FONTCAST · weather → background
  -------------------------------
  sky()         one flat background colour and the ink colour, for the current
                hour and weather (time of day, clouds, temperature, rain, pollution).
  background()  that colour as a plain SVG rectangle. No sun, no clouds, no
                gradient: the weather lives in the colour and in the letters.
*/

import { clamp, mix, lum, grey } from "./utils.js";

// Sky keyframes: [top colour, bottom colour]
const K = {
  night: ["#0b1222", "#18233a"],
  dawn: ["#2c3c63", "#e7a47a"],
  day: ["#7fb0dc", "#e3edf5"],
  dusk: ["#27345a", "#dc8a63"],
};

// W.hour, W.sunrise and W.sunset are decimal hours in Brussels time (13.5 = 13:30)
export function sky(W) {
  const h = W.hour, r = W.sunrise, s = W.sunset;
  const seg = (a, b, t) => [mix(K[a][0], K[b][0], t), mix(K[a][1], K[b][1], t)];
  let top, bot;
  if (h < r - 1 || h > s + 1.2) [top, bot] = K.night;
  else if (h < r) [top, bot] = seg("night", "dawn", h - (r - 1));
  else if (h < r + 1.2) [top, bot] = seg("dawn", "day", (h - r) / 1.2);
  else if (h < s - 1) [top, bot] = K.day;
  else if (h < s) [top, bot] = seg("day", "dusk", h - (s - 1));
  else [top, bot] = seg("dusk", "night", (h - s) / 1.2);

  // clouds grey the sky
  const c = W.cloud / 100;
  top = mix(top, grey(top), c * 0.85); bot = mix(bot, grey(bot), c * 0.85);
  // temperature tint: cool blue or warm amber
  const tT = clamp((W.temp - 12) / 20, -1, 1);
  const tint = tT < 0 ? "#a9c8ea" : "#f2c27c", ta = Math.abs(tT) * 0.18;
  top = mix(top, tint, ta); bot = mix(bot, tint, ta * 1.2);
  // rain darkens
  const wet = clamp(W.rain / 8, 0, 1) * 0.28;
  top = mix(top, "#0e1116", wet); bot = mix(bot, "#0e1116", wet * 0.8);

  // One flat colour: a blend of the two sky colours
  let bg = mix(top, bot, 0.55);
  // pollution: a brownish haze over the colour
  const pz = clamp(W.pm / 75, 0, 1);
  bg = mix(bg, "#9c8a66", pz * 0.38);

  // Ink: dark or light, whichever contrasts more with the background (WCAG ratio)
  const L = lum(bg);
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const dark = "#141414", light = "#f1eee6";
  const ink = ratio(L, lum(dark)) >= ratio(L, lum(light)) ? dark : light;
  return { bg, ink, contrast: ratio(L, lum(ink)), night: ink === light, isDay: h >= r && h <= s };
}

export function background(W, Ky) {
  return `<rect width="1000" height="1414" fill="${Ky.bg}"/>`;
}
