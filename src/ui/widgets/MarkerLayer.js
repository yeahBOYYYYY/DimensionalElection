import { h } from "../../core/dom.js";
import { partyBadge } from "./PartyBadge.js";

/**
 * Keyed set of absolutely-positioned party markers.
 * Markers are reused between renders (matched by key), so CSS transitions animate
 * them smoothly from one topic to the next instead of re-creating them.
 */
export class MarkerLayer {
  #nodes = new Map();

  /** @param {HTMLElement} container  @param {{ i18n, onSelect: (partyId: string) => void }} deps */
  constructor(container, { i18n, onSelect }) {
    this.el = container;
    this.i18n = i18n;
    this.onSelect = onSelect;
  }

  /** @param {{ key, party, x, y, tag?: string, tip: string }[]} items */
  update(items) {
    const keep = new Set();
    for (const item of items) {
      keep.add(item.key);
      const signature = [this.i18n.locale, item.tag || "", item.tip].join("|");
      let node = this.#nodes.get(item.key);
      if (!node || node.dataset.signature !== signature) {
        const fresh = this.#create(item, signature);
        if (node) {
          fresh.style.left = node.style.left;
          fresh.style.top = node.style.top;
          node.replaceWith(fresh);
        } else {
          fresh.style.left = `${item.x}px`;
          fresh.style.top = `${item.y}px`;
          fresh.classList.add("entering");
          this.el.append(fresh);
          requestAnimationFrame(() => fresh.classList.remove("entering"));
        }
        node = fresh;
        this.#nodes.set(item.key, node);
      }
      node.style.left = `${item.x}px`;
      node.style.top = `${item.y}px`;
    }
    for (const [key, node] of this.#nodes) {
      if (!keep.has(key)) { node.remove(); this.#nodes.delete(key); }
    }
  }

  #create(item, signature) {
    const { party } = item;
    return h("button", {
      class: "marker",
      type: "button",
      dataset: { signature, party: party.id },
      style: { "--party": party.color },
      "aria-label": item.tip,
      onclick: () => this.onSelect(party.id)
    },
      partyBadge(party, this.i18n, { style: "abbr", size: "md" }),
      item.tag ? h("span", { class: "marker-tag" }, item.tag) : null,
      h("span", { class: "tip", role: "presentation" }, item.tip)
    );
  }
}
