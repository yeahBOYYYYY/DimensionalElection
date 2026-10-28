import { SCHEMA, translationKey } from "./schema.js";

/**
 * Data translations: the CSVs hold human-readable text once, in the source language;
 * each other language has a catalog { strings: { "<table>.<row>.<column>": text } } in locales/data/.
 */

/** Every non-empty translatable cell as { key: source text }, in table order. */
export function sourceStrings(tables) {
  const out = {};
  for (const [table, spec] of Object.entries(SCHEMA)) {
    for (const row of tables[table] ?? []) {
      for (const col of spec.translate ?? []) if (row[col]) out[translationKey(table, row, col)] = row[col];
    }
  }
  return out;
}

/**
 * Every source text needs a translation in each catalog (error); translations whose row or
 * column no longer exists are reported as stale (warning).
 * @param {Record<string, object[]>} tables
 * @param {Record<string, Record<string,string>>} catalogs  locale → strings
 */
export function checkDataTranslations(tables, catalogs) {
  const errors = [], warnings = [];
  const source = sourceStrings(tables);
  for (const [code, strings] of Object.entries(catalogs)) {
    for (const key of Object.keys(source)) {
      if (!strings[key]?.trim()) errors.push(`locales/data/${code}.json: "${key}" is missing (${JSON.stringify(source[key].slice(0, 60))})`);
    }
    for (const key of Object.keys(strings)) {
      if (!(key in source)) warnings.push(`locales/data/${code}.json: "${key}" has no matching English text (stale?)`);
    }
  }
  return { errors, warnings };
}
