import { h, mount } from "../../core/dom.js";

/** 1D / 2D toggle plus the X / Y topic slots. */
export class AxisControls {
  constructor(el, { db, i18n, actions }) {
    this.el = el;
    this.db = db;
    this.i18n = i18n;
    this.actions = actions;
  }

  render(state) {
    const { i18n, actions } = this;
    const is2d = state.mode === "2d";
    const activeSlot = is2d ? state.slot : "x";

    const mode = h("div", { class: "mode-toggle", role: "tablist", "aria-label": i18n.t("mode.label") },
      ["1d", "2d"].map(m => h("button", {
        type: "button", role: "tab",
        class: state.mode === m ? "active" : "",
        "aria-selected": String(state.mode === m),
        onclick: () => actions.setMode(m)
      }, i18n.t(`mode.${m}`))));

    const slot = axis => h("button", {
      type: "button",
      class: `slot slot-${axis}${activeSlot === axis ? " active" : ""}`,
      onclick: () => actions.setSlot(axis)
    }, h("span", { class: "slot-tag" }, axis.toUpperCase()), h("span", { class: "slot-name" }, i18n.field(this.db.topic(state[axis]), "title")));

    mount(this.el, h("div", { class: "controls-top" },
      mode,
      h("div", { class: "slots" },
        slot("x"),
        is2d ? slot("y") : null,
        is2d ? h("button", { type: "button", class: "swap", title: i18n.t("axis.swap"), "aria-label": i18n.t("axis.swap"), onclick: actions.swapAxes }, "⇅") : null)));
  }
}
