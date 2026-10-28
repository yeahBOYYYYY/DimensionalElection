import { h } from "../../core/dom.js";

/** Direction arrow for an axis end; CSS mirrors it in right-to-left layouts. */
export function axisArrow(char) {
  return h("span", { class: "arr", "aria-hidden": "true" }, char);
}
