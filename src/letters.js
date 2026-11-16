/*
  FONTCAST · weather → letterforms
  --------------------------------
  style()  turns the weather into a handful of drawing settings.
  block()  draws lines of text with those settings, inside a box.
  Humidity drives serifs and contrast (thin horizontals, like a Didone);
  at night the letters turn hollow (an inline in the background colour).
*/

import { G } from "./glyphs.js";
import { clamp, lerp, norm, rnd, f, dist, pathD } from "./utils.js";

// The weather (W) → drawing settings
export function style(W, R) {
  const night = W.hour < W.sunrise - 0.3 || W.hour > W.sunset + 0.5;
  const t = norm(W.temp, ...R.temperature);
  const windN = clamp(W.wind / R.wind[1], 0, 1.15);
  const to = (W.dir + 180) * Math.PI / 180; // the wind blows TOWARD this direction
  const S = {
    sx: lerp(0.55, 1.45, t),                                   // width
    wg: lerp(0.32, 1.35, Math.pow(norm(W.rain, ...R.rain), 0.8)), // weight
    skew: Math.sin(to) * windN * 0.32,                         // slant
    jit: Math.pow(windN, 1.4) * 0.42,                          // shake
    fill: Math.pow(norm(W.pm, ...R.pm25), 0.85),               // filled counters
    rad: lerp(0, 1.1, norm(W.cloud, ...R.cloud)),              // rounded corners
    lower: norm(W.pres, ...R.pressure),                        // 0 = CAPITALS, 1 = lowercase
    serif: Math.pow(norm(W.hum, ...R.humidity), 1.2),          // serif length (0 = sans)
    drips: W.rain,
    contrast: 0.75 * Math.pow(norm(W.hum, ...R.humidity), 1.1), // horizontals thinner than uprights
    hollow: night,                                              // inline letters at night
  };
  // Hollow letters need some weight to show; and the inline must not eat thin horizontals.
  if (S.hollow) { S.wg = Math.max(S.wg, 1.05); S.contrast = Math.min(S.contrast, 0.3); }
  return S;
}

// ---------- serifs ----------

// Is point p on the segment a–b? (grid units)
function onSegment(p, a, b) {
  const l = dist(a, b);
  if (!l) return dist(p, a) < 0.05;
  return Math.abs(dist(a, p) + dist(p, b) - l) < 0.05;
}

// Serif segments for one glyph, in grid units.
// A serif sits on every free end of an open stroke: horizontal on stems and
// diagonals, vertical on arms. Ends that touch another stroke get none (the
// crossbar of an H, for example), and neither do dots.
const serifCache = new Map();
function serifsFor(ch) {
  if (serifCache.has(ch)) return serifCache.get(ch);
  const g = G[ch], out = [];
  g.s.forEach((s, si) => {
    const closed = s.length > 2 && s[0][0] === s[s.length - 1][0] && s[0][1] === s[s.length - 1][1];
    if (closed) return;
    let len = 0;
    for (let i = 1; i < s.length; i++) len += dist(s[i - 1], s[i]);
    if (len < 0.5) return; // dots
    [[s[0], s[1]], [s[s.length - 1], s[s.length - 2]]].forEach(([end, prev]) => {
      const touches = g.s.some((o, oi) => oi !== si && o.some((p, i) => i > 0 && onSegment(end, o[i - 1], p)))
        || s.some((p, i) => i > 0 && p !== end && s[i - 1] !== end && onSegment(end, s[i - 1], p));
      if (touches) return;
      const dx = end[0] - prev[0], dy = end[1] - prev[1];
      const vertical = Math.abs(dy) >= Math.abs(dx) * 0.5;
      out.push({ end, dir: vertical ? [1, 0] : [0, 1] });
    });
  });
  serifCache.set(ch, out);
  return out;
}

// ---------- layout of a block of lines inside a box ----------

// bg: the background colour, used for the inline of hollow letters at night.
export function block(id, lines, box, S, ink, maxU, caseMode, bg) {
  const solid = draw(id, lines, box, S, ink, maxU, caseMode, 1, ink, true);
  if (!S.hollow || !bg) return solid;
  const inline = draw(id, lines, box, S, ink, maxU, caseMode, 0.42, bg, false);
  return { svg: solid.svg + inline.svg, u: solid.u };
}

// One pass over the text. wf: stroke width factor, col: colour,
// full: also draw the filled counters and the drips (only on the first pass).
function draw(id, lines, box, S, ink, maxU, caseMode, wf, col, full) {
  const trk = 1.15 + S.wg + S.serif * 0.9; // letter spacing grows with the serifs
  // Weather decides the case of the whole block, never letter by letter:
  // high pressure = CAPITALS, middle = Capital first, low = lowercase.
  const caseOf = (line) => S.lower < 1 / 3 ? line.toUpperCase()
    : S.lower < 2 / 3 ? line.toLowerCase().replace(/(^|\s)([a-z])/g, (m, a, b) => a + b.toUpperCase())
    : line.toLowerCase();
  const L = lines.map((line) => [...(caseMode === "weather" ? caseOf(line) : line)]);
  const desc = L.map((l) => l.some((ch) => "gjpqy,".includes(ch)));
  const W = L.map((l) => {
    let w = 0;
    l.forEach((ch) => { const g = G[ch]; w += (g ? g.w * S.sx : 2.4) + trk; });
    return Math.max(0, w - trk) + S.wg + 6 * Math.abs(S.skew) + S.serif * 1.1;
  });
  const gap = 2.2 + S.wg;
  const lh = L.map((l, i) => (desc[i] ? 7.5 : 6));
  const H = lh.reduce((a, b) => a + b, 0) + (L.length - 1) * gap + S.wg + 1.5;
  const u = Math.min(box.w / Math.max(...W, 1), box.h / H, maxU || 1e9);
  let oy = box.y + (box.h - H * u) / 2 + S.wg * u / 2;
  const sw = S.wg * u * wf, r = S.rad * u;
  const line = (w) => `stroke="${col}" stroke-width="${w.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"`;
  const stroke = line(sw), thin = S.contrast > 0.02 ? line(sw * (1 - S.contrast)) : stroke;
  let out = "";

  L.forEach((line, li) => {
    let x = box.x + (box.w - W[li] * u) / 2 + S.wg * u / 2 + S.serif * 0.55 * u + (S.skew < 0 ? 6 * -S.skew * u : 0);
    line.forEach((ch, ci) => {
      const g = G[ch];
      if (!g) { x += (2.4 + trk) * u; return; }
      const ox = x, oyy = oy;
      // grid point → page point (width, slant, wind jitter)
      const T = (p) => {
        const k = id + "|" + li + "|" + ci + "|" + p[0] + "|" + p[1];
        const jx = (rnd(k + "x") * 2 - 1) * S.jit, jy = (rnd(k + "y") * 2 - 1) * S.jit * 0.6;
        return [ox + (p[0] * S.sx + S.skew * (6 - p[1]) + jx) * u, oyy + (p[1] + jy) * u];
      };
      // counters (pollution)
      if (full && g.c && S.fill > 0.01) g.c.forEach((c) => {
        out += `<path d="${pathD(c.map(T), r, true)}" fill="${ink}" fill-opacity="${S.fill.toFixed(3)}"/>`;
      });
      // strokes
      g.s.forEach((s) => {
        const closed = s.length > 2 && s[0][0] === s[s.length - 1][0] && s[0][1] === s[s.length - 1][1];
        // contrast: the whole stroke thin, then its upright parts at full width on top
        out += `<path d="${pathD(s.map(T), r, closed)}" fill="none" ${thin}/>`;
        if (thin === stroke) return;
        const P = s.map(T);
        for (let i = 1; i < P.length; i++) {
          const a = P[i - 1], b = P[i], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
          if (!l || Math.abs(dy) < Math.abs(dx) * 0.9) continue;
          const k = Math.min(r, l / 2) / l; // stop short of rounded corners
          out += `<path d="M${f([a[0] + dx * k, a[1] + dy * k])}L${f([b[0] - dx * k, b[1] - dy * k])}" fill="none" ${stroke}/>`;
        }
      });
      // serifs (humidity). Half-length in grid units, not stretched by the width.
      if (S.serif > 0.03) {
        const half = S.serif * 0.55;
        serifsFor(ch).forEach(({ end, dir }) => {
          const a = T(end);
          const dx = dir[0] * half * u, dy = dir[1] * half * u;
          out += `<path d="M${f([a[0] - dx, a[1] - dy])}L${f([a[0] + dx, a[1] + dy])}" fill="none" ${thin}/>`;
        });
      }
      // drips (rain)
      if (full && S.drips > 0.3) {
        const low = [];
        g.s.forEach((s) => s.forEach((p) => { if (p[1] >= 5) low.push(p); }));
        const n = Math.min(5, Math.round(S.drips * 0.7));
        for (let i = 0; i < n && low.length; i++) {
          const k = id + "d" + li + "|" + ci + "|" + i;
          if (rnd(k + "p") > 0.55) continue;
          const p = low[Math.floor(rnd(k + "i") * low.length)], a = T(p);
          const len = (0.4 + rnd(k + "l")) * S.drips * 0.32 * u, dw = sw * (0.45 + rnd(k + "w") * 0.25);
          out += `<path d="M${f(a)}L${f([a[0], a[1] + len])}" stroke="${ink}" stroke-width="${dw.toFixed(2)}" stroke-linecap="round"/><circle cx="${a[0].toFixed(1)}" cy="${(a[1] + len).toFixed(1)}" r="${(dw * 0.75).toFixed(2)}" fill="${ink}"/>`;
        }
      }
      x += (g.w * S.sx + trk) * u;
    });
    oy += (lh[li] + gap) * u;
  });
  return { svg: out, u };
}
