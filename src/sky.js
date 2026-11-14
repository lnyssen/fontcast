/*
  FONTCAST · weather → background
  -------------------------------
  sky()         sky colours and ink colour for the current hour and weather.
  background()  the background layers as SVG: gradient, sun or moon and stars,
                clouds, rain, pollution haze and grain.
  Everything is sharp: flat discs and flat abstract cloud shapes, no blur.
*/

import { clamp, lerp, rnd, mix, lum, grey } from "./utils.js";

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
  const dark = clamp(W.rain / 8, 0, 1) * 0.28;
  top = mix(top, "#0e1116", dark); bot = mix(bot, "#0e1116", dark * 0.8);

  const L = (lum(top) + lum(bot) * 2) / 3;
  const night = L < 0.2;
  return { top, bot, ink: night ? "#f1eee6" : "#141414", night, isDay: h >= r && h <= s };
}

export function background(W, Ky) {
  // A gradient id unique to these colours, so several posters can share a page
  const gid = "sky" + (Ky.top + Ky.bot).replace(/#/g, "");
  let s = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${Ky.top}"/><stop offset="1" stop-color="${Ky.bot}"/></linearGradient></defs>
  <rect width="1000" height="1414" fill="url(#${gid})"/>`;

  // Sun or moon: a sharp flat disc, only when the sky is clear enough
  const clear = 1 - W.cloud / 100;
  if (clear > 0.15) {
    if (Ky.isDay) {
      const dayT = clamp((W.hour - W.sunrise) / (W.sunset - W.sunrise), 0, 1);
      const cx = lerp(140, 860, dayT), cy = lerp(560, 190, Math.sin(dayT * Math.PI));
      s += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="62" fill="#fff1c9" opacity="${(0.9 * clear).toFixed(2)}"/>`;
    } else {
      s += `<circle cx="780" cy="230" r="36" fill="#e4e9f2" opacity="${(0.85 * clear).toFixed(2)}"/>`;
      for (let i = 0; i < Math.round(140 * clear); i++) {
        const k = "st" + i;
        s += `<circle cx="${(rnd(k + "x") * 1000).toFixed(0)}" cy="${(rnd(k + "y") * 700).toFixed(0)}" r="${(0.5 + rnd(k + "r") * 1.1).toFixed(2)}" fill="#fff" opacity="${(0.25 + rnd(k + "o") * 0.5).toFixed(2)}"/>`;
      }
    }
  }

  // Clouds: flat horizontal capsules, pushed by the wind
  const n = Math.round(W.cloud / 100 * 14);
  const cc = Ky.night ? "#3a4152" : (W.rain > 1 ? "#8d939b" : "#ffffff");
  const drift = Math.sin((W.dir + 180) * Math.PI / 180) * W.wind * 1.2;
  for (let i = 0; i < n; i++) {
    const k = "cl" + i;
    const w = 180 + rnd(k + "w") * 300, h = 22 + rnd(k + "h") * 46;
    const x = rnd(k + "x") * 1200 - 200 + drift, y = rnd(k + "y") * 880;
    s += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" rx="${(h / 2).toFixed(1)}" fill="${cc}" opacity="${(0.14 + rnd(k + "o") * 0.2).toFixed(2)}"/>`;
  }

  // Rain streaks, slanted by the wind
  if (W.rain > 0.1) {
    const cnt = Math.round(W.rain * 70), lean = Math.sin((W.dir + 180) * Math.PI / 180) * clamp(W.wind / 80, 0, 1.1) * 0.7;
    const rc = Ky.night ? "#c9d3e3" : "#ffffff";
    for (let i = 0; i < cnt; i++) {
      const k = "rn" + i, x = rnd(k + "x") * 1100 - 50, y = rnd(k + "y") * 1414, l = 25 + rnd(k + "l") * 45;
      s += `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x + lean * l).toFixed(0)}" y2="${(y + l).toFixed(0)}" stroke="${rc}" stroke-width="1.2" stroke-linecap="round" opacity="${(0.18 + rnd(k + "o") * 0.25).toFixed(2)}"/>`;
    }
  }

  // Pollution: brownish haze, then grain above 25 µg/m³
  const pz = clamp(W.pm / 75, 0, 1);
  if (pz > 0.05) s += `<rect width="1000" height="1414" fill="${Ky.night ? "#4a3f2e" : "#9c8a66"}" opacity="${(pz * 0.38).toFixed(2)}"/>`;
  if (W.pm > 25) {
    const n2 = Math.round((W.pm - 25) * 14);
    for (let i = 0; i < n2; i++) {
      const k = "g" + i;
      s += `<circle cx="${(rnd(k + "x") * 1000).toFixed(1)}" cy="${(rnd(k + "y") * 1414).toFixed(1)}" r="${(0.6 + rnd(k + "r") * 1.3).toFixed(2)}" fill="${Ky.ink}" fill-opacity="${(0.1 + rnd(k + "o") * 0.22).toFixed(2)}"/>`;
    }
  }
  return s;
}
