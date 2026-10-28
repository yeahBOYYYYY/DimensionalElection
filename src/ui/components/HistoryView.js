import { h, mount, svg } from "../../core/dom.js";
import { contrastText } from "../../core/color.js";
import { buildHistory } from "../layout/historyGraph.js";
import { partyBadge } from "../widgets/PartyBadge.js";
import { sourceList } from "../widgets/SourceList.js";

const DOT_Y = 21;     // a row's anchor, measured from its top (level with the first line of text)
// Lane width and badge radius; narrow screens get thin lanes with plain dots instead of initials.
const SIZES = { wide: { lane: 28, badge: 11 }, narrow: { lane: 10, badge: 4.5 } };
const NARROW = "(max-width: 640px)";

/**
 * The party history as a git-style graph: one colored line per party, newest events on top.
 * Rows are HTML (so text wraps naturally); the graph is an SVG drawn over the rows' gutter
 * after layout, and redrawn whenever the rows change size.
 */
export class HistoryView {
  #graph;
  #rowEls = new Map();      // row index -> <li>
  #signature = null;

  constructor(el, { db, i18n, actions }) {
    this.el = el;
    this.db = db;
    this.i18n = i18n;
    this.actions = actions;
    this.#graph = buildHistory(db);
    this.head = h("div", { class: "history-head" });
    this.svgEl = svg("svg", { class: "hgraph" });
    this.list = h("ol", { class: "hrows" });
    this.canvas = h("div", { class: "history-canvas" }, this.svgEl, this.list);
    mount(el, this.head, h("div", { class: "history-scroll" }, this.canvas));
    new ResizeObserver(() => this.#draw()).observe(this.list);
  }

  render(state) {
    this.el.hidden = state.view !== "history";
    if (this.el.hidden) { this.#signature = null; return; }
    const signature = `${this.i18n.locale}|${state.focus}`;
    if (signature === this.#signature) return;
    const refocus = state.focus && !this.#signature?.endsWith(`|${state.focus}`);
    this.#signature = signature;
    this.focus = state.focus;

    this.#renderHead();
    this.#renderRows();
    this.#draw();
    if (refocus) this.#scrollToFocus();
  }

  #involves(row, id) {
    if (row.type === "election" || row.type === "now") return row.partyIds.includes(id);
    return row.partyId === id || row.fromId === id;
  }

  #renderHead() {
    const { i18n, db, focus } = this;
    const party = focus && db.party(focus);
    mount(this.head,
      h("h2", {}, i18n.t("history.title")),
      h("p", { class: "history-intro" }, i18n.t("history.intro")),
      party ? h("div", { class: "focus-bar" },
        partyBadge(party, i18n, { style: "abbr", size: "sm" }), h("b", {}, i18n.field(party, "name")),
        h("button", { type: "button", class: "link-btn", onclick: this.actions.clearFocus }, i18n.t("history.clearFocus"))) : null);
  }

  #renderRows() {
    const { rows } = this.#graph;
    this.#rowEls.clear();
    const items = [];
    let prevYear = null;
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      const showYear = row.year !== null && row.year !== prevYear;
      prevYear = row.year;
      const state = !this.focus ? "" : this.#involves(row, this.focus) ? " related" : " dim";
      const year = showYear ? String(row.year) : "";
      const li = h("li", { class: `hrow hrow-${row.type}${state}` },
        h("span", { class: "hyear" }, year),
        h("span", { class: "hgutter" }),
        // On narrow screens the year column is dropped and the year sits above the text instead.
        h("div", { class: "hcontent" }, year ? h("span", { class: "hyear-inline" }, year) : null, this.#content(row)));
      this.#rowEls.set(i, li);
      items.push(li);
    }
    mount(this.list, items);
  }

  #content(row) {
    const { i18n, db } = this;
    const party = id => this.#partyButton(id);
    switch (row.type) {
      case "now":
        return h("b", {}, i18n.t("history.now"));
      case "election":
        return [h("b", {}, i18n.field(row.election, "name")), " ", h("span", { class: "muted" }, i18n.t("history.lists", { count: row.partyIds.length }))];
      case "founded":
        return i18n.tParts("history.founded", { party: party(row.partyId) });
      case "ended":
        return i18n.tParts("history.ended", { party: party(row.partyId) });
      case "lineage":
        return [
          h("div", { class: "hlink" }, h("span", { class: `lineage-kind kind-${row.link.kind}` }, i18n.t(`lineage.${row.link.kind}`)),
            i18n.tParts("history.link", { from: party(row.fromId), to: party(row.partyId) })),
          h("p", { class: "hnote" }, i18n.field(row.link, "note")),
          h("details", { class: "hsources" },
            h("summary", {}, i18n.t("drawer.sources", { n: row.link.sourceIds.length })),
            sourceList(db, i18n, row.link.sourceIds))
        ];
    }
    return null;
  }

  #partyButton(id) {
    const p = this.db.party(id);
    return h("button", { type: "button", class: "party-link", onclick: () => this.actions.focusParty(id, { open: true }) },
      partyBadge(p, this.i18n, { style: "abbr", size: "sm" }), this.i18n.field(p, "name"));
  }

  #scrollToFocus() {
    const { rows } = this.#graph;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (this.#involves(rows[i], this.focus) && rows[i].type !== "now") {
        this.#rowEls.get(i)?.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }
    }
  }

  /** Draw lanes, merge/split curves and party badges at the measured row positions. */
  #draw() {
    if (this.el.hidden || !this.#rowEls.size) return;
    const { rows, spans, edges, laneCount } = this.#graph;
    const { db, focus } = this;
    const rtl = this.i18n.isRtl;
    const { lane: LANE, badge: BADGE_R } = matchMedia(NARROW).matches ? SIZES.narrow : SIZES.wide;
    const width = laneCount * LANE + 8;
    // Size the rows' gutter column to the graph (only on change: it re-triggers the ResizeObserver).
    if (this.canvas.style.getPropertyValue("--gutter") !== `${width}px`) this.canvas.style.setProperty("--gutter", `${width}px`);
    const height = this.list.offsetHeight;
    const gutter = this.#rowEls.get(rows.length - 1).querySelector(".hgutter");
    Object.assign(this.svgEl.style, { left: `${gutter.offsetLeft}px`, top: "0px" });
    this.svgEl.setAttribute("width", width);
    this.svgEl.setAttribute("height", height);
    this.svgEl.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const y = i => this.#rowEls.get(i).offsetTop + DOT_Y;
    const x = lane => (rtl ? width - (4 + lane * LANE + LANE / 2) : 4 + lane * LANE + LANE / 2);
    const below = i => (i > 0 ? y(i - 1) : y(i) + LANE);      // the next older row: where a curve leaves its source line
    const dim = id => (focus && focus !== id ? " dim" : "");
    const color = id => db.party(id).color;

    const lines = [], curves = [], marks = [];
    for (const [id, s] of spans) {
      // A party that leaves through a curve stops where the curve starts.
      const leaving = edges.some(e => e.fromId === id && e.row === s.end && !e.continues);
      const top = leaving ? below(s.end) : y(s.end);
      lines.push(svg("line", { class: `hlane${dim(id)}`, x1: x(s.lane), x2: x(s.lane), y1: y(s.start), y2: top, stroke: color(id) }));
    }
    for (const e of edges) {
      if (e.continues) continue;
      const x1 = x(spans.get(e.fromId).lane), y1 = below(e.row);
      const x2 = x(spans.get(e.toId).lane), y2 = y(e.row);
      const mid = (y1 + y2) / 2;
      curves.push(svg("path", {
        class: `hcurve kind-${e.kind}${focus && focus !== e.fromId && focus !== e.toId ? " dim" : ""}`,
        d: `M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`, stroke: color(e.fromId)
      }));
    }
    rows.forEach((row, i) => {
      const badge = (id, title) => marks.push(this.#badge(id, x(spans.get(id).lane), y(i), BADGE_R, title, dim(id)));
      if (row.type === "founded") badge(row.partyId);
      else if (row.type === "election") row.partyIds.forEach(id => badge(id, this.#seatsTitle(row.election, id)));
      else if (row.type === "now") row.partyIds.forEach(id => badge(id));
      else if (row.type === "lineage") {
        marks.push(svg("circle", { class: `hcommit${dim(row.partyId)}`, cx: x(spans.get(row.partyId).lane), cy: y(i), r: Math.min(6, BADGE_R), stroke: color(row.partyId) }));
      } else if (row.type === "ended") {
        const cx = x(spans.get(row.partyId).lane);
        marks.push(svg("rect", { class: `hend${dim(row.partyId)}`, x: cx - 6, y: y(i) - 3, width: 12, height: 6, rx: 2, fill: color(row.partyId) }));
      }
    });
    this.svgEl.replaceChildren(...lines, ...curves, ...marks);
  }

  #badge(id, cx, cy, r, title, dimClass) {
    const { i18n } = this;
    const p = this.db.party(id);
    const g = svg("g", { class: `hbadge${dimClass}`, tabindex: "-1" });
    const label = svg("title");
    label.textContent = title || i18n.field(p, "name");
    const text = svg("text", { x: cx, y: cy, fill: contrastText(p.color), "text-anchor": "middle", "dominant-baseline": "central" });
    text.textContent = i18n.field(p, "abbr");
    g.append(label, svg("circle", { cx, cy, r, fill: p.color }));
    if (r >= 10) g.append(text); // initials only fit on full-size badges
    g.addEventListener("click", () => this.actions.focusParty(id, { open: true }));
    return g;
  }

  #seatsTitle(election, id) {
    const { i18n, db } = this;
    const list = db.list(election.id, id);
    const seats = list.seats === null ? "" : ` · ${i18n.t("history.seats", { count: list.seats })}`;
    return `${i18n.field(list, "list_name")}${seats}`;
  }
}
