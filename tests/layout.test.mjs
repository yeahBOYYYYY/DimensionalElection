import { test } from "node:test";
import assert from "node:assert/strict";
import { assignLanes } from "../src/ui/layout/lanes.js";
import { relax } from "../src/ui/layout/relax.js";
import { fraction } from "../src/ui/charts/geometry.js";

test("lanes: markers sharing a lane never overlap", () => {
  const items = [0, 10, 20, 30, 100, 105, 300].map((x, i) => ({ key: `k${i}`, x }));
  const width = 40, gap = 4;
  const lanes = assignLanes(items, width, gap);
  const byLane = new Map();
  for (const it of items) {
    const l = lanes.get(it.key);
    if (!byLane.has(l)) byLane.set(l, []);
    byLane.get(l).push(it.x);
  }
  for (const xs of byLane.values()) {
    xs.sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= width + gap);
  }
  assert.equal(lanes.get("k6"), 0, "an isolated marker stays on the axis");
});

test("relax: overlapping boxes are separated", () => {
  const items = [{ key: "a", ax: 50, ay: 50 }, { key: "b", ax: 52, ay: 50 }, { key: "c", ax: 50, ay: 52 }];
  const w = 40, h = 20;
  const out = relax(items, { w, h, bounds: { w: 400, h: 400 } });
  const pts = [...out.values()];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const overlapX = w - Math.abs(pts[i].x - pts[j].x);
    const overlapY = h - Math.abs(pts[i].y - pts[j].y);
    assert.ok(overlapX <= 0.5 || overlapY <= 0.5, "boxes should not overlap");
  }
});

test("relax: a lone marker stays at its anchor", () => {
  const out = relax([{ key: "a", ax: 10, ay: 20 }], { w: 40, h: 20, bounds: { w: 100, h: 100 } });
  assert.deepEqual(out.get("a"), { x: 10, y: 20 });
});

test("fraction mirrors in RTL", () => {
  assert.equal(fraction(0), 0);
  assert.equal(fraction(10), 1);
  assert.equal(fraction(2.5, true), 0.75);
});
