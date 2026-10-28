import { h, mount } from "../../core/dom.js";
import { entryKey } from "../../state/selectors.js";
import { partyBadge } from "../widgets/PartyBadge.js";

/** Elections, groups (blocs / families) and individual lists, grouped by election. */
export class FilterPanel {
  constructor(el, { db, i18n, actions }) {
    this.el = el;
    this.db = db;
    this.i18n = i18n;
    this.actions = actions;
    this.open = false; // collapsed by default so the chart stays near the top
  }

  render(state) {
    const { i18n, actions } = this;
    const details = h("details", { class: "filters", open: this.open, ontoggle: e => { this.open = e.target.open; } },
      h("summary", {},
        h("span", { class: "filters-title" }, i18n.t("filters.title")),
        this.#summaryText(state)),
      h("div", { class: "filters-body" },
        this.#section("filters.elections", this.#elections(state)),
        this.#section("filters.groups", this.#groups(state), i18n.t("filters.groupsHint")),
        this.#section("filters.parties", this.#parties(state), i18n.t("filters.partiesHint")),
        h("div", { class: "filter-options" },
          h("button", { type: "button", class: "link-btn", onclick: actions.resetFilters }, i18n.t("filters.reset")))));
    mount(this.el, details);
  }

  #section(titleKey, body, hint) {
    return h("section", { class: "filter-section" },
      h("h4", {}, this.i18n.t(titleKey), hint ? h("small", {}, hint) : null),
      body);
  }

  #summaryText(state) {
    const names = state.elections.map(id => this.db.election(id).date.slice(0, 4)).join(" + ");
    const extra = state.groups.length + state.hiddenEntries.length;
    return h("span", { class: "filters-summary" }, names, extra ? ` · ${extra}` : "");
  }

  #elections(state) {
    return h("div", { class: "chips" }, this.db.elections().map(e => {
      const on = state.elections.includes(e.id);
      return h("button", {
        type: "button",
        class: `chip toggle${on ? " on" : ""}`,
        "aria-pressed": String(on),
        title: on && state.elections.length === 1 ? this.i18n.t("filters.atLeastOne") : this.i18n.field(e, "name"),
        onclick: () => this.actions.toggleElection(e.id)
      }, h("b", {}, e.date.slice(0, 4)), " ", h("span", { class: "muted" }, this.i18n.field(e, "name")));
    }));
  }

  #groups(state) {
    return h("div", { class: "group-kinds" }, this.db.groupKinds().map(kind =>
      h("div", { class: "group-kind" },
        h("span", { class: "kind-label" }, this.i18n.t(`group.kind.${kind}`)),
        h("div", { class: "chips" }, this.db.groups(kind).map(g => {
          const on = state.groups.includes(g.id);
          return h("button", {
            type: "button",
            class: `chip toggle${on ? " on" : ""}`,
            "aria-pressed": String(on),
            title: this.i18n.field(g, "description"),
            onclick: () => this.actions.toggleGroup(g.id)
          }, h("i", { class: "dot", style: { background: g.color } }), this.i18n.field(g, "name"));
        })))));
  }

  /** One block per selected election, newest first: each list is its own entry ("Likud 2026" ≠ "Likud 2022"). */
  #parties(state) {
    const { db, i18n, actions } = this;
    const elections = db.elections().filter(e => state.elections.includes(e.id)).reverse();
    return h("div", { class: "entry-groups" }, elections.map(e => {
      const keys = db.partiesIn(e.id).map(p => entryKey(e.id, p));
      return h("div", { class: "entry-group" },
        h("div", { class: "entry-group-head" },
          h("b", {}, e.date.slice(0, 4)), " ", h("span", { class: "muted" }, i18n.field(e, "name")),
          h("span", { class: "mini-actions" },
            h("button", { type: "button", class: "link-btn", onclick: () => actions.showEntries(keys) }, i18n.t("filters.all")),
            h("button", { type: "button", class: "link-btn", onclick: () => actions.hideEntries(keys) }, i18n.t("filters.none")))),
        h("div", { class: "chips party-chips" }, db.partiesIn(e.id).map(id => {
          const p = db.party(id);
          const key = entryKey(e.id, id);
          const on = !state.hiddenEntries.includes(key);
          return h("button", {
            type: "button",
            class: `chip party-chip${on ? " on" : ""}`,
            "aria-pressed": String(on),
            title: `${i18n.field(db.list(e.id, id), "list_name")} · ${e.date.slice(0, 4)}`,
            onclick: () => actions.toggleEntry(key)
          }, partyBadge(p, i18n, { style: "abbr", size: "sm" }), i18n.field(p, "name"));
        })));
    }));
  }
}
