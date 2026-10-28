import { h, mount } from "../../core/dom.js";
import { partyBadge } from "../widgets/PartyBadge.js";

/** Every party in the dataset (current and historical) with the elections it ran in. */
export class PartyDirectory {
  constructor(el, { db, i18n, actions }) {
    this.el = el;
    this.db = db;
    this.i18n = i18n;
    this.actions = actions;
  }

  render(state) {
    const { db, i18n } = this;
    const latestYear = p => db.electionsOf(p.id).at(-1)?.date ?? "";
    const parties = [...db.parties()].sort((a, b) => latestYear(b).localeCompare(latestYear(a)));

    mount(this.el,
      h("h3", {}, i18n.t("legend.title")),
      h("div", { class: "legend" }, parties.map(p => {
        const ran = db.electionsOf(p.id);
        const years = ran.map(e => e.date.slice(0, 4));
        const dim = !ran.some(e => state.elections.includes(e.id));
        return h("button", { type: "button", class: `lg${dim ? " dim" : ""}`, onclick: () => this.actions.openParty(p.id) },
          partyBadge(p, i18n, { style: "logo", size: "md" }),
          h("span", { class: "lg-text" },
            h("span", { class: "lg-name" }, i18n.field(p, "name")),
            h("span", { class: "lg-sub" }, i18n.t("legend.ran", { years: years.join(" · ") }))));
      })));
  }
}
