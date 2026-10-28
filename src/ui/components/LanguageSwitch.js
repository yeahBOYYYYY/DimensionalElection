import { h, mount } from "../../core/dom.js";
import { savePreferredLocale } from "../../i18n/localePreference.js";

/** EN / עב toggle. An explicit pick is remembered for the next visit. */
export class LanguageSwitch {
  constructor(el, { i18n, actions }) {
    this.el = el;
    this.i18n = i18n;
    this.actions = actions;
  }

  render(state) {
    const { i18n } = this;
    mount(this.el, h("div", { class: "lang-switch", role: "group", "aria-label": i18n.t("lang.label") },
      i18n.locales.map(code => h("button", {
        type: "button",
        class: code === state.locale ? "active" : "",
        lang: code,
        "aria-pressed": String(code === state.locale),
        onclick: () => {
          savePreferredLocale(code);
          this.actions.setLocale(code);
        }
      }, i18n.localeName(code)))));
  }
}
