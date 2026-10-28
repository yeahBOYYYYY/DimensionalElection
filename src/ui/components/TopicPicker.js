import { h, mount } from "../../core/dom.js";
import { sortedCategories, sortedTopics } from "../../state/selectors.js";

/**
 * Searchable list of topics grouped by category. Categories are ordered by how current their
 * data is; topics within a category by how many parties are placed in the selected elections.
 */
export class TopicPicker {
  constructor(el, { db, i18n, actions }) {
    this.db = db;
    this.i18n = i18n;
    this.actions = actions;
    // The search box is created once so typing never loses focus on re-render.
    this.search = h("input", { type: "search", class: "topic-search", oninput: e => actions.setQuery(e.target.value) });
    this.hint = h("span", { class: "hint" });
    this.grid = h("div", { class: "topic-grid" });
    mount(el, h("div", { class: "search-row" }, this.search, this.hint), this.grid);
  }

  render(state) {
    const { db, i18n } = this;
    this.search.placeholder = i18n.t("topics.search");
    this.search.setAttribute("aria-label", i18n.t("topics.search"));
    if (this.search.value !== state.query) this.search.value = state.query;

    const is2d = state.mode === "2d";
    this.hint.textContent = is2d
      ? i18n.t(state.slot === "x" ? "topics.hint2dX" : "topics.hint2dY")
      : i18n.t("topics.hint1d", { n: db.topics().length });

    const q = state.query.trim().toLowerCase();
    const matches = topic => !q || ["title", "question", "left", "right"]
      .flatMap(f => i18n.locales.map(code => i18n.field(topic, f, code)))
      .join(" ").toLowerCase().includes(q);

    const blocks = sortedCategories(db).map(cat => {
      const topics = sortedTopics(db, cat.id, state.elections).filter(matches);
      if (!topics.length) return null;
      return h("div", { class: "cat-block" },
        h("h4", {}, i18n.field(cat, "name")),
        h("div", { class: "chips" }, topics.map(t => this.#chip(t, state, is2d))));
    }).filter(Boolean);

    mount(this.grid, blocks.length ? blocks : h("div", { class: "no-results" }, i18n.t("topics.none", { q: state.query })));
  }

  #chip(topic, state, is2d) {
    const axis = topic.id === state.x ? "x" : is2d && topic.id === state.y ? "y" : null;
    const count = this.db.placedCount(topic.id, state.elections);
    return h("button", {
      type: "button",
      class: `chip${axis ? ` sel-${axis}` : ""}${count ? "" : " empty"}`,
      title: this.i18n.field(topic, "question"),
      "aria-pressed": String(Boolean(axis)),
      onclick: () => this.actions.pickTopic(topic.id)
    },
      axis && is2d ? h("span", { class: "tag" }, axis.toUpperCase()) : null,
      this.i18n.field(topic, "title"),
      h("span", { class: "count", title: this.i18n.t("topics.count", { count }) }, String(count)));
  }
}
