import { h } from "../../core/dom.js";
import { SCALE } from "../../data/schema.js";

/** Small gradient bar with a dot at `value` (mirrored in RTL by CSS logical positioning). */
export function miniScale(value, color, { labels } = {}) {
  const pct = ((value - SCALE.min) / (SCALE.max - SCALE.min)) * 100;
  return h("div", { class: "mscale-wrap" },
    h("div", { class: "mscale" }, h("i", { style: { insetInlineStart: `${pct}%`, background: color } })),
    labels ? h("div", { class: "mscale-labels" }, h("span", {}, labels[0]), h("span", {}, labels[1])) : null);
}
