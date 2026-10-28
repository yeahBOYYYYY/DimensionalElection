import { SCALE } from "../../data/schema.js";

/** Marker box size: party initials in a circle. */
export function markerSize(compact) {
  return compact ? { w: 34, h: 34 } : { w: 42, h: 42 };
}

/** Position of a value along an axis as 0..1, mirrored for right-to-left layouts. */
export function fraction(value, rtl = false) {
  const f = (value - SCALE.min) / (SCALE.max - SCALE.min);
  return rtl ? 1 - f : f;
}

/** Short election tag shown on every marker, e.g. ’22. */
export function electionTag(electionId) {
  return `’${String(electionId).slice(-2)}`;
}
