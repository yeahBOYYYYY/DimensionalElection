import { h } from "../../core/dom.js";
import { contrastText } from "../../core/color.js";

export const LOGO_DIR = "assets/logos";

/**
 * A party's visual identity: its logo on a white card, or its initials on its color.
 * @param {object} party  party record
 * @param {import("../../i18n/I18n.js").I18n} i18n
 * @param {{ style?: "logo"|"abbr", size?: "sm"|"md"|"lg" }} opts
 */
export function partyBadge(party, i18n, { style = "logo", size = "md" } = {}) {
  const name = i18n.field(party, "name");
  if (style === "logo" && party.logo) {
    return h("span", { class: `badge badge-logo badge-${size}`, style: { "--party": party.color } },
      h("img", { src: `${LOGO_DIR}/${party.logo}`, alt: name, loading: "lazy", draggable: "false" }));
  }
  return h("span", {
    class: `badge badge-abbr badge-${size}`,
    style: { background: party.color, color: contrastText(party.color), "--party": party.color },
    "aria-hidden": "true"
  }, i18n.field(party, "abbr"));
}
