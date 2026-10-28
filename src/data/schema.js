/**
 * The dataset schema: one entry per CSV table in /data.
 * `key` lists the columns that must be unique together; `refs` lists foreign keys.
 * `translate` lists the human-readable columns. The CSV holds them in the source language (English);
 * other languages live in locales/data/<code>.json under translationKey(table, row, column).
 * Multi-valued reference columns hold "|"-separated ids.
 */
export const SCHEMA = {
  elections:      { key: ["id"], columns: ["id", "date", "name"], translate: ["name"] },
  categories:     { key: ["id"], columns: ["id", "sort", "name"], translate: ["name"] },
  topics:         { key: ["id"], columns: ["id", "category_id", "sort", "title", "question", "left", "right"],
                    translate: ["title", "question", "left", "right"], refs: { category_id: "categories" } },
  parties:        { key: ["id"], columns: ["id", "abbr", "name", "color", "logo", "founded", "ended", "description"],
                    translate: ["abbr", "name", "description"] },
  groups:         { key: ["id"], columns: ["id", "kind", "name", "description", "color"], translate: ["name", "description"] },
  group_members:  { key: ["group_id", "party_id", "election_id"], columns: ["group_id", "party_id", "election_id"],
                    refs: { group_id: "groups", party_id: "parties", election_id: "elections?" } },
  election_lists: { key: ["election_id", "party_id"], columns: ["election_id", "party_id", "list_name", "leader", "components", "seats"],
                    translate: ["list_name", "leader", "components"], refs: { election_id: "elections", party_id: "parties" } },
  lineage:        { key: ["from_party_id", "to_party_id"], columns: ["from_party_id", "to_party_id", "year", "kind", "note", "source_ids"],
                    translate: ["note"], refs: { from_party_id: "parties", to_party_id: "parties", source_ids: "sources[]" } },
  sources:        { key: ["id"], columns: ["id", "outlet", "title", "url", "date", "language"] },
  positions:      { key: ["election_id", "topic_id", "party_id"], columns: ["election_id", "topic_id", "party_id", "value", "summary", "source_ids"],
                    translate: ["summary"], refs: { election_id: "elections", topic_id: "topics", party_id: "parties", source_ids: "sources[]" } }
};

export const TABLE_NAMES = Object.keys(SCHEMA);

/** "parties.likud.name", "positions.2026/iran/shas.summary": where a cell's translation is stored. */
export function translationKey(table, row, column) {
  return `${rowKey(table, row)}.${column}`;
}

/** "parties.likud", "positions.2026/iran/shas": the row part of a translation key. */
export function rowKey(table, row) {
  return `${table}.${SCHEMA[table].key.map(c => row[c]).join("/")}`;
}

/** Value scale used by every topic. */
export const SCALE = { min: 0, max: 10 };
