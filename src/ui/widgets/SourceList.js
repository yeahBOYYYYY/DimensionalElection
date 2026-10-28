import { h } from "../../core/dom.js";

/** Linked list of the sources behind a claim. */
export function sourceList(db, i18n, sourceIds) {
  const sources = sourceIds.map(id => db.source(id)).filter(Boolean);
  if (!sources.length) return null;
  return h("div", { class: "sources" },
    h("div", { class: "sources-title" }, i18n.t("drawer.sources", { n: sources.length })),
    h("ul", { class: "src-list" }, sources.map(s =>
      h("li", {},
        h("a", { href: s.url, target: "_blank", rel: "noopener noreferrer", hreflang: s.language },
          h("span", { class: "ext", "aria-hidden": "true" }, "↗"),
          h("span", { class: "outlet" }, s.outlet, s.date ? h("span", { class: "date" }, ` · ${s.date}`) : null),
          h("span", { class: "src-name", dir: "auto" }, s.title))))));
}
