import { h, mount, svg } from "../../core/dom.js";
import { SCALE } from "../../data/schema.js";
import { assignLanes } from "../layout/lanes.js";
import { MarkerLayer } from "../widgets/MarkerLayer.js";
import { Overlay } from "../widgets/Overlay.js";
import { axisArrow as arr } from "../widgets/AxisArrow.js";
import { fraction, markerSize } from "./geometry.js";

const TAG_ROOM = 8;      // extra vertical room per lane for the election tag on a marker's corner

/**
 * A single topic as one horizontal line. Every entry (a party in one election) is a marker;
 * markers that would overlap stack in lanes above and below the line.
 */
export class Chart1D {
  constructor(root, { i18n, onSelect }) {
    this.i18n = i18n;
    this.lineEl = h("div", { class: "bands" });
    this.svgEl = svg("svg", { class: "overlay", "aria-hidden": "true" });
    this.markersEl = h("div", { class: "markers" });
    this.wrap = h("div", { class: "line-wrap" }, this.lineEl, this.svgEl, this.markersEl);
    this.poles = h("div", { class: "pole-labels" });
    this.root = h("div", { class: "chart chart-1d" }, this.wrap, this.poles);
    root.append(this.root);
    this.markers = new MarkerLayer(this.markersEl, { i18n, onSelect });
    this.overlay = new Overlay(this.svgEl);
  }

  /** @param {{ topic, items: {key, party, value, tag?, tip}[], width: number }} view */
  render({ topic, items, width }) {
    const rtl = this.i18n.isRtl;
    const compact = width < 560;
    const { w: mw, h: mh } = markerSize(compact);
    const pad = mw / 2 + 8;
    const usable = Math.max(10, width - pad * 2);
    const xOf = v => pad + fraction(v, rtl) * usable;
    const laneH = mh + TAG_ROOM + 6;

    const placed = items.map(it => ({ ...it, x: xOf(it.value) }));
    const lanes = assignLanes(placed, mw, 8);
    const laneValues = [...lanes.values()];
    const maxUp = Math.max(0, ...laneValues.map(l => -l));
    const maxDown = Math.max(0, ...laneValues.map(l => l));
    const axisY = TAG_ROOM + 8 + maxUp * laneH + mh / 2;

    const stems = [], anchors = [];
    const markers = placed.map(it => {
      const y = axisY + lanes.get(it.key) * laneH;
      if (y !== axisY) { stems.push({ x1: it.x, y1: axisY, x2: it.x, y2: y }); anchors.push({ x: it.x, y: axisY }); }
      return { ...it, y };
    });

    const height = axisY + maxDown * laneH + mh / 2 + 34;
    mount(this.lineEl, this.#track(axisY, pad, xOf), this.#tickLabels(xOf, height - 20, compact));
    this.wrap.style.height = `${height}px`;
    this.markers.update(markers);
    this.overlay.draw({ w: width, h: height }, { stems, anchors });

    mount(this.poles,
      h("div", { class: "pole pole-start" }, arr("◀"), this.i18n.field(topic, "left")),
      h("div", { class: "pole pole-end" }, this.i18n.field(topic, "right"), arr("▶")));
  }

  #track(axisY, pad, xOf) {
    const ticks = [];
    for (let v = SCALE.min; v <= SCALE.max; v++) {
      ticks.push(h("div", { class: "tick", style: { left: `${xOf(v)}px`, top: `${axisY + 8}px` } }));
    }
    return h("div", { class: "band" },
      h("div", { class: "track", style: { top: `${axisY - 5}px`, left: `${pad - 6}px`, right: `${pad - 6}px` } }),
      ticks);
  }

  #tickLabels(xOf, top, compact) {
    const labels = [];
    for (let v = SCALE.min; v <= SCALE.max; v++) {
      if (!compact || v % 5 === 0) labels.push(h("div", { class: "tick-label", style: { left: `${xOf(v)}px`, top: `${top}px` } }, String(v)));
    }
    return labels;
  }
}
