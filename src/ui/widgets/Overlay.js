import { svg } from "../../core/dom.js";

/**
 * SVG layer under the markers. It draws stems + anchor dots: from a marker's true value to where
 * it was nudged to avoid overlapping another marker.
 */
export class Overlay {
  constructor(svgEl) {
    this.el = svgEl;
  }

  /**
   * @param {{w: number, h: number}} size
   * @param {{ stems?: {x1,y1,x2,y2}[], anchors?: {x,y}[] }} layers
   */
  draw(size, { stems = [], anchors = [] }) {
    this.el.setAttribute("viewBox", `0 0 ${size.w} ${size.h}`);
    this.el.setAttribute("width", size.w);
    this.el.setAttribute("height", size.h);
    this.el.replaceChildren(
      ...stems.map(s => svg("line", { class: "stem", x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })),
      ...anchors.map(a => svg("circle", { class: "anchor", cx: a.x, cy: a.y, r: 3.5 })));
  }
}
