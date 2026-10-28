import { h, mount } from "../../core/dom.js";

/** Switches the page between the positions chart and the party history timeline. */
export class ViewTabs {
  constructor(el, { i18n, actions }) {
    this.el = el;
    this.i18n = i18n;
    this.actions = actions;
  }

  render(state) {
    const { i18n } = this;
    mount(this.el, h("div", { class: "view-tabs", role: "tablist", "aria-label": i18n.t("view.label") },
      ["chart", "history"].map(view => h("button", {
        type: "button", role: "tab",
        class: state.view === view ? "active" : "",
        "aria-selected": String(state.view === view),
        onclick: () => this.actions.setView(view)
      }, i18n.t(`view.${view}`)))));
  }
}
