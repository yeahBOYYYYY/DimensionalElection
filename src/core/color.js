/** Color utilities for party swatches. */

function rgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Readable text color (dark or white) on top of `hex`. */
export function contrastText(hex) {
  const [r, g, b] = rgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#0b1b3f" : "#ffffff";
}

/** Darken (negative pct) or lighten (positive pct) a hex color. */
export function shade(hex, pct) {
  const f = c => Math.max(0, Math.min(255, Math.round(c + (pct / 100) * (pct < 0 ? c : 255 - c))));
  return "#" + rgb(hex).map(f).map(c => c.toString(16).padStart(2, "0")).join("");
}
