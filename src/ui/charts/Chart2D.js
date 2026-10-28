import { h, mount, svg } from "../../core/dom.js";
import { relax } from "../layout/relax.js";
import { MarkerLayer } from "../widgets/MarkerLayer.js";
import { Overlay } from "../widgets/Overlay.js";
import { fraction, markerSize } from "./geometry.js";
import { axisArrow as arr } from "../widgets/AxisArrow.js";

/** Two topics as a plane: X = first topic, Y = second topic. */
export class Chart2D {
  constructor(root, { i18n, onSelect }) {
    this.i18n = i18n;
    this.yLabel = h("div", { class: "y-label" });
    this.svgEl = svg("svg", { class: "overlay", "aria-hidden": "true" });
    this.markersEl = h("div", { class: "markers" });
    this.inner = h("div", { class: "plane-inner" }, this.svgEl, this.markersEl);
    this.plane = h("div", { class: "plane" }, h("div", { class: "axis-h" }), h("div", { class: "axis-v" }), this.inner);
    this.xLabel = h("div", { class: "x-label" });
    this.axisName = h("div", { class: "axis-name" });
    this.root = h("div", { class: "chart chart-2d" },
      h("div", { class: "plane-outer" }, this.yLabel, this.plane), this.xLabel, this.axisName);
    root.append(this.root);
    this.markers = new MarkerLayer(this.markersEl, { i18n, onSelect });
    this.overlay = new Overlay(this.svgEl);
  }

  /**
   * @param {{ topicX, topicY, items: {key, party, x: number, y: number, tag?, tip}[], width: number }} view
   *        item x / y are topic values (0..10)
   */
  render({ topicX, topicY, items, width }) {
    const { i18n } = this;
    const rtl = i18n.isRtl;
    const compact = width < 560;
    const { w: mw, h: mh } = markerSize(compact);

    mount(this.yLabel, h("span", {}, "◀ ", i18n.field(topicY, "left")), h("span", {}, i18n.field(topicY, "right"), " ▶"));
    mount(this.xLabel, h("span", {}, arr("◀"), i18n.field(topicX, "left")), h("span", {}, i18n.field(topicX, "right"), arr("▶")));
    mount(this.axisName,
      h("b", {}, `${i18n.t("chart.axisX")}: `), i18n.field(topicX, "title"), "  ·  ",
      h("b", {}, `${i18n.t("chart.axisY")}: `), i18n.field(topicY, "title"));

    const W = this.inner.clientWidth;
    const H = this.inner.clientHeight;
    const anchors = items.map(it => ({ key: it.key, ax: fraction(it.x, rtl) * W, ay: H - fraction(it.y) * H }));
    const placed = relax(anchors, { w: mw, h: mh, bounds: { w: W, h: H } });
    const byKey = new Map(items.map((it, i) => [it.key, { it, anchor: anchors[i], pos: placed.get(it.key) }]));

    this.markers.update(items.map(it => ({ ...it, ...byKey.get(it.key).pos })));

    const stems = [], dots = [];
    for (const { anchor, pos } of byKey.values()) {
      if (Math.hypot(pos.x - anchor.ax, pos.y - anchor.ay) > 6) {
        stems.push({ x1: anchor.ax, y1: anchor.ay, x2: pos.x, y2: pos.y });
        dots.push({ x: anchor.ax, y: anchor.ay });
      }
    }
    this.overlay.draw({ w: W, h: H }, { stems, anchors: dots });
  }
}
