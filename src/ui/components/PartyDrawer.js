import { h, mount } from "../../core/dom.js";
import { contrastText, shade } from "../../core/color.js";
import { selectedElections } from "../../state/selectors.js";
import { partyBadge } from "../widgets/PartyBadge.js";
import { sourceList } from "../widgets/SourceList.js";
import { miniScale } from "../widgets/MiniScale.js";

/** Side sheet with everything about one party: identity, history, lists, positions and their sources. */
export class PartyDrawer {
  #lastFocus = null;
  #openId = null;

  constructor(el, { db, i18n, actions }) {
    this.db = db;
    this.i18n = i18n;
    this.actions = actions;
    this.el = el;
    this.body = h("div", { class: "drawer-body" });
    this.closeBtn = h("button", { type: "button", class: "drawer-close", onclick: actions.closeParty }, "✕");
    this.card = h("div", { class: "drawer-card", role: "dialog", "aria-modal": "true" }, this.closeBtn, this.body);
    mount(el, h("div", { class: "drawer-scrim", onclick: actions.closeParty }), this.card);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && this.#openId) actions.closeParty(); });
  }

  render(state) {
    const party = state.partyId && this.db.party(state.partyId);
    this.closeBtn.setAttribute("aria-label", this.i18n.t("drawer.close"));
    if (!party) return this.#close();

    const sameParty = this.#openId === party.id;
    mount(this.body, this.#header(party), h("div", { class: "drawer-content" },
      this.#historyLink(party),
      this.#lists(party),
      this.#selectedTopics(party, state),
      this.#allPositions(party, state)));

    if (!sameParty) {
      this.card.scrollTop = 0;
      this.#lastFocus = document.activeElement;
    }
    this.#openId = party.id;
    this.el.classList.add("open");
    this.el.setAttribute("aria-hidden", "false");
    if (!sameParty) this.closeBtn.focus({ preventScroll: true });
  }

  #close() {
    if (!this.#openId) return;
    this.#openId = null;
    this.el.classList.remove("open");
    this.el.setAttribute("aria-hidden", "true");
    if (this.#lastFocus?.isConnected) this.#lastFocus.focus({ preventScroll: true });
  }

  #header(party) {
    const { i18n } = this;
    const other = i18n.locales.filter(code => code !== i18n.locale).map(code => i18n.field(party, "name", code)).join(" · ");
    const years = `${party.founded}–${party.ended || i18n.t("drawer.present")}`;
    return h("header", { class: "d-head", style: { background: `linear-gradient(135deg, ${party.color}, ${shade(party.color, -40)})`, color: contrastText(party.color) } },
      h("div", { class: "d-logo" }, partyBadge(party, i18n, { style: party.logo ? "logo" : "abbr", size: "lg" })),
      h("h2", {}, i18n.field(party, "name")),
      h("div", { class: "d-alt", dir: "auto" }, other),
      h("p", { class: "d-desc" }, i18n.field(party, "description")),
      h("div", { class: "d-years" }, i18n.t("drawer.years", { years })));
  }

  /** Mergers, splits and joint lists are shown on the history timeline, not in the drawer. */
  #historyLink(party) {
    return h("section", { class: "d-sec" },
      h("button", { type: "button", class: "history-link", onclick: () => this.actions.focusParty(party.id) },
        h("span", { "aria-hidden": "true" }, "⑂"), this.i18n.t("drawer.showHistory"), h("span", { class: "arr", "aria-hidden": "true" }, "→")));
  }

  #lists(party) {
    const { db, i18n } = this;
    const elections = db.electionsOf(party.id);
    if (!elections.length) return null;
    return h("section", { class: "d-sec" },
      h("div", { class: "d-sec-title" }, i18n.t("drawer.lists")),
      h("div", { class: "lists" }, elections.map(e => {
        const list = db.list(e.id, party.id);
        const bloc = db.groupsOf(party.id, e.id, "bloc")[0];
        return h("div", { class: "list-card" },
          h("div", { class: "list-top" },
            h("b", {}, e.date.slice(0, 4)),
            h("span", {}, i18n.field(list, "list_name")),
            bloc ? h("span", { class: "bloc-pill" }, h("i", { class: "dot", style: { background: bloc.color } }), i18n.field(bloc, "name")) : null),
          h("div", { class: "list-meta" },
            `${i18n.t("drawer.leader")}: `, h("b", {}, i18n.field(list, "leader")),
            i18n.field(list, "components") ? [h("br"), `${i18n.t("drawer.factions")}: ${i18n.field(list, "components")}`] : null,
            list.seats !== null ? [h("br"), `${i18n.t("drawer.seats")}: `, h("b", {}, String(list.seats))] : null));
      })));
  }

  #selectedTopics(party, state) {
    const { i18n } = this;
    const axes = state.mode === "2d" ? [["drawer.axisX", state.x], ["drawer.axisY", state.y]] : [["drawer.selected", state.x]];
    return axes.map(([label, topicId]) => {
      const topic = this.db.topic(topicId);
      return h("section", { class: "d-sec" },
        h("div", { class: "d-sec-title" }, i18n.t(label)),
        h("h3", { class: "d-topic" }, i18n.field(topic, "title")),
        this.#positionsBlock(party, topic, this.#electionsToShow(party, state), true));
    });
  }

  #allPositions(party, state) {
    const { db, i18n } = this;
    const shown = new Set(state.mode === "2d" ? [state.x, state.y] : [state.x]);
    const elections = this.#electionsToShow(party, state);
    const topics = db.topics().filter(t => !shown.has(t.id));
    return h("section", { class: "all-pos" },
      h("div", { class: "d-sec-title" }, i18n.t("drawer.allOther")),
      topics.map(t => {
        const latest = elections.map(e => db.position(e.id, t.id, party.id)).filter(p => p && p.value !== null).at(-1);
        return h("details", {},
          h("summary", {},
            h("span", {}, i18n.field(t, "title")),
            latest ? miniScale(latest.value, party.color) : h("span", { class: "na" }, "—")),
          h("div", { class: "inner" },
            this.#positionsBlock(party, t, elections, false),
            h("button", { type: "button", class: "link-btn", onclick: () => this.actions.plotTopic(t.id) }, i18n.t("drawer.plot"))));
      }));
  }

  /** Elections to list for this party: the selected ones it ran in, or all it ran in if none selected match. */
  #electionsToShow(party, state) {
    const ran = this.db.electionsOf(party.id);
    const selected = new Set(selectedElections(this.db, state));
    const both = ran.filter(e => selected.has(e.id));
    return both.length ? both : ran;
  }

  #positionsBlock(party, topic, elections, withLabels) {
    const { db, i18n } = this;
    const multi = elections.length > 1;
    return elections.map(e => {
      const pos = db.position(e.id, topic.id, party.id);
      const heading = multi ? h("div", { class: "election-label" }, i18n.field(e, "name")) : null;
      if (pos && pos.value !== null) {
        return h("div", { class: "pos-block" }, heading,
          miniScale(pos.value, party.color, withLabels ? { labels: [i18n.field(topic, "left"), i18n.field(topic, "right")] } : {}),
          h("div", { class: "stance" }, i18n.field(pos, "summary"), h("div", { class: "score" }, i18n.t("drawer.placement", { v: pos.value }))),
          sourceList(db, i18n, pos.sourceIds));
      }
      if (pos) {
        return h("div", { class: "pos-block" }, heading,
          h("div", { class: "stance unclear" }, h("b", {}, i18n.t("drawer.unclear")), " ", i18n.field(pos, "summary")),
          sourceList(db, i18n, pos.sourceIds));
      }
      return h("div", { class: "pos-block" }, heading, h("div", { class: "stance unclear" }, i18n.t("drawer.none")));
    });
  }
}
