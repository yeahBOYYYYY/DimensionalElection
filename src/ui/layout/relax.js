/**
 * 2D layout: nudge rectangular markers apart so they don't overlap, while
 * keeping each one as close as possible to its true (anchor) position.
 *
 * @param {{key: string, ax: number, ay: number}[]} items anchors (px)
 * @param {{w: number, h: number, gap?: number, bounds: {w: number, h: number}, iterations?: number}} opts
 * @returns {Map<string, {x: number, y: number}>}
 */
export function relax(items, { w, h, gap = 3, bounds, iterations = 200 }) {
  const pts = items.map(it => ({ key: it.key, ax: it.ax, ay: it.ay, x: it.ax, y: it.ay }));
  const minX = w + gap;
  const minY = h + gap;
  const pad = { x: w / 3, y: h / 3 };

  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        const ox = minX - Math.abs(dx), oy = minY - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        // Separate along the axis that needs the smaller push; break exact ties deterministically.
        if (ox / minX < oy / minY) {
          if (dx === 0) dx = i % 2 ? 1 : -1;
          const push = (ox / 2) * Math.sign(dx);
          a.x -= push; b.x += push;
        } else {
          if (dy === 0) dy = i % 2 ? 1 : -1;
          const push = (oy / 2) * Math.sign(dy);
          a.y -= push; b.y += push;
        }
      }
    }
    for (const p of pts) {
      p.x += (p.ax - p.x) * 0.02;
      p.y += (p.ay - p.y) * 0.02;
      p.x = Math.max(-pad.x, Math.min(bounds.w + pad.x, p.x));
      p.y = Math.max(-pad.y, Math.min(bounds.h + pad.y, p.y));
    }
    if (!moved) break;
  }
  return new Map(pts.map(p => [p.key, { x: p.x, y: p.y }]));
}
