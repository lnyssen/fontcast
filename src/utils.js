/*
  FONTCAST · small helpers shared by every module
  (maths, seeded randomness, colours, SVG paths). Copied from the prototype.
*/

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
// 0 → 1 position of v between a and b, clamped
export const norm = (v, a, b) => clamp((v - a) / (b - a), 0, 1);

// Seeded "random": the same key always gives the same number (0 → 1).
// This keeps every star, cloud and jitter in place from one hour to the next.
export function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return h >>> 0;
}
export const rnd = (k) => (hash(k) % 100000) / 100000;

// Points and paths
export const f = (p) => p[0].toFixed(1) + "," + p[1].toFixed(1);
export const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
function toward(b, a, r) {
  const l = dist(a, b);
  if (!l) return b.slice();
  return [b[0] + (a[0] - b[0]) * r / l, b[1] + (a[1] - b[1]) * r / l];
}
// A polyline (or closed shape) with every corner rounded by radius r.
export function pathD(pts, r, closed) {
  if (closed) pts = pts.slice(0, -1);
  const m = pts.length;
  if (m < 2) return "";
  const corner = (i) => {
    const a = pts[(i - 1 + m) % m], b = pts[i], c = pts[(i + 1) % m];
    const rr = Math.min(r, dist(a, b) / 2, dist(b, c) / 2);
    return [toward(b, a, rr), b, toward(b, c, rr)];
  };
  let d = "";
  if (closed) {
    const c0 = corner(0);
    d = "M" + f(c0[2]);
    for (let i = 1; i < m; i++) { const [p1, b, p2] = corner(i); d += "L" + f(p1) + "Q" + f(b) + " " + f(p2); }
    d += "L" + f(c0[0]) + "Q" + f(c0[1]) + " " + f(c0[2]) + "Z";
  } else {
    d = "M" + f(pts[0]);
    for (let i = 1; i < m - 1; i++) { const [p1, b, p2] = corner(i); d += "L" + f(p1) + "Q" + f(b) + " " + f(p2); }
    d += "L" + f(pts[m - 1]);
  }
  return d;
}

// Colours
export const hx = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const toHex = (c) => "#" + c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
export const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => lerp(v, B[i], t))); };
export const lum = (h) => {
  const c = hx(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const grey = (h) => { const l = Math.round(hx(h).reduce((a, b) => a + b) / 3); return toHex([l, l, l + 4]); };

// Text
export const NB = " "; // non-breaking space
export const nf = (v, d = 0) => v.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
export const card = (d) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round((((d % 360) + 360) % 360) / 45) % 8];
export const hhmm = (h) => {
  let H = Math.floor(h), M = Math.round((h - H) * 60);
  if (M === 60) { H += 1; M = 0; }
  return String(H % 24).padStart(2, "0") + ":" + String(M).padStart(2, "0");
};
export const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// Remove accents so every letter has a glyph (é → e, œ → oe)
export const clean = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").replace(/Œ/g, "OE");
