/*
  FONTCAST · the poster
  ---------------------
  One shared function: weather in, finished SVG out.
  The live page, the simulate mode and (later) the daily archive all call it,
  so they always look the same. It uses no browser features, so it also runs
  on GitHub for the archive.
*/

import { style, block } from "./letters.js";
import { sky, background } from "./sky.js";
import { NB, nf, card, hhmm, esc, clean, readableOpacity } from "./utils.js";

/*
  W     the weather: { hour, sunrise, sunset (decimal hours, Brussels time),
        temp, rain, wind, dir, pm, cloud, pres, hum }
  opts  { lines: ["Bru","xel","les"], ranges, date: Date, timezone,
          footer: "text at the bottom right" }
*/
export function poster(W, opts) {
  const S = style(W, opts.ranges), K = sky(W), ink = K.ink;
  const tz = opts.timezone;
  const now = opts.date;

  // Day of the year and the date, in Brussels time
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const [y, m, d] = ymd.split("-").map(Number);
  const doy = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 864e5);
  const dateStr = now.toLocaleDateString("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" });

  let lines = (opts.lines || []).map((l) => clean(l).trim()).filter(Boolean);
  if (!lines.length) lines = ["Brussels"];

  const main = block("m", lines, { x: 70, y: 150, w: 860, h: 640 }, S, ink, null, "weather");
  const spec = block("s", ["ABCDEFGHIJKLM", "nopqrstuvwxyz", "0123456789"], { x: 70, y: 880, w: 860, h: 330 }, S, ink, Math.min(main.u * 0.55, 48), "fixed");

  // Secondary text is a little faded, but never below a 4.5:1 contrast (WCAG AA)
  const faded = readableOpacity(ink, K.bg, 0.65);
  const mono = `font-family="IBM Plex Mono, ui-monospace, monospace" fill="${ink}"`;
  const data = [
    `${nf(W.temp, 1)}${NB}°C`,
    `${nf(W.rain, 1)}${NB}mm`,
    `wind ${nf(W.wind)}${NB}km/h ${card(W.dir)}`,
    `hum ${nf(W.hum)}${NB}%`,
    `PM2.5 ${nf(W.pm)}${NB}µg/m³`,
    `cloud ${nf(W.cloud)}${NB}%`,
    `${nf(W.pres)}${NB}hPa`,
  ].join("  ·  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1414" width="1000" height="1414">` +
    background(W, K) +
    `<text x="70" y="92" ${mono} font-size="17" letter-spacing="2.5">FONTCAST · BRUSSELS</text>` +
    `<text x="930" y="92" ${mono} font-size="17" letter-spacing="2.5" text-anchor="end">No.${NB}${String(doy).padStart(3, "0")} · ${hhmm(W.hour)}</text>` +
    `<line x1="70" x2="930" y1="112" y2="112" stroke="${ink}" stroke-width="1.2"/>` +
    main.svg +
    `<line x1="70" x2="930" y1="840" y2="840" stroke="${ink}" stroke-width="1.2"/>` +
    spec.svg +
    `<line x1="70" x2="930" y1="1262" y2="1262" stroke="${ink}" stroke-width="1.2"/>` +
    `<text x="70" y="1300" ${mono} font-size="14">${data}</text>` +
    `<text x="70" y="1336" ${mono} font-size="14" fill-opacity="${faded}">${esc(dateStr)}</text>` +
    `<text x="930" y="1336" ${mono} font-size="14" text-anchor="end" fill-opacity="${faded}">${esc(opts.footer || "")}</text>` +
    `</svg>`;
}
