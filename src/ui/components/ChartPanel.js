import { h, mount } from "../../core/dom.js";
import { placeEntries, visibleEntries } from "../../state/selectors.js";
import { Chart1D } from "../charts/Chart1D.js";
import { Chart2D } from "../charts/Chart2D.js";
import { electionTag } from "../charts/geometry.js";
import { partyBadge } from "../widgets/PartyBadge.js";

/**
 * The visualization card: title, the 1D or 2D chart, and the "not placed" tray.
 * Each marker is one entry (a party in one election), tagged with its election year.
 */
export class ChartPanel {
  #state = null;

  constructor(el, { db, i18n, actions }) {
    this.db = db;
    this.i18n = i18n;
    this.actions = actions;

    this.kicker = h("div", { class: "viz-cat" });
    this.title = h("h2", {});
    this.question = h("p", { class: "viz-q" });
    this.stage = h("div", { class: "stage" });
    this.empty = h("div", { class: "empty-note", hidden: true });
    this.tray = h("div", { class: "unplaced" });
    mount(el, h("div", { class: "viz-head" }, this.kicker, this.title, this.question), this.stage, this.empty, this.tray);

    const onSelect = id => actions.openParty(id);
    this.chart1d = new Chart1D(this.stage, { i18n, onSelect });
    this.chart2d = new Chart2D(this.stage, { i18n, onSelect });

    new ResizeObserver(() => this.#state && this.render(this.#state)).observe(this.stage);
  }

  render(state) {
    this.#state = state;
    if (state.view !== "chart") return; // hidden; the ResizeObserver re-renders once it's visible again
    const { db, i18n } = this;
    const is2d = state.mode === "2d";
    const topicIds = is2d ? [state.x, state.y] : [state.x];
    const [tx, ty] = topicIds.map(id => db.topic(id));

    this.#renderHeader(is2d, tx, ty);

    const { placed, unplaced } = placeEntries(db, visibleEntries(db, state), topicIds);
    const item = e => ({ key: e.key, party: e.party, tag: electionTag(e.electionId), tip: this.#tip(e, topicIds) });

    this.chart1d.root.hidden = is2d;
    this.chart2d.root.hidden = !is2d;
    const width = this.stage.clientWidth;
    if (is2d) {
      const items = placed.map(e => ({ ...item(e), x: e.values[state.x], y: e.values[state.y] }));
      this.chart2d.render({ topicX: tx, topicY: ty, items, width });
    } else {
      this.chart1d.render({ topic: tx, items: placed.map(e => ({ ...item(e), value: e.values[state.x] })), width });
    }

    this.empty.hidden = placed.length > 0;
    this.empty.textContent = i18n.t("chart.empty");
    this.#renderTray(unplaced, is2d);
  }

  #renderHeader(is2d, tx, ty) {
    const { db, i18n } = this;
    if (is2d) {
      this.kicker.textContent = i18n.t("chart.2dKicker");
      this.title.textContent = i18n.t("chart.2dTitle", { x: i18n.field(tx, "title"), y: i18n.field(ty, "title") });
      this.question.textContent = `X: ${i18n.field(tx, "question")}  ·  Y: ${i18n.field(ty, "question")}`;
    } else {
      this.kicker.textContent = i18n.field(db.category(tx.category_id), "name");
      this.title.textContent = i18n.field(tx, "title");
      this.question.textContent = i18n.field(tx, "question");
    }
  }

  #tip(entry, topicIds) {
    const values = topicIds.map(t => entry.values[t]).join(" · ");
    return `${this.i18n.field(entry.party, "name")} · ${entry.electionId} · ${values}`;
  }

  #renderTray(unplaced, is2d) {
    const { i18n } = this;
    if (!unplaced.length) return mount(this.tray);
    mount(this.tray,
      h("h4", {}, i18n.t(is2d ? "chart.unplaced2d" : "chart.unplaced")),
      h("div", { class: "unplaced-list" }, unplaced.map(e => h("button", {
        type: "button",
        class: `uchip${e.reason === "unclear" ? " has-note" : ""}`,
        onclick: () => this.actions.openParty(e.party.id)
      },
        partyBadge(e.party, i18n, { style: "abbr", size: "sm" }),
        i18n.field(e.party, "name"),
        h("span", { class: "year" }, electionTag(e.electionId)),
        h("small", {}, ` · ${i18n.t(e.reason === "unclear" ? "chart.unclear" : "chart.noPosition")}`)))));
  }
}
