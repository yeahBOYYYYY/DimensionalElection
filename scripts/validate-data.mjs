#!/usr/bin/env node
// Validates the CSV dataset in /data (schema, keys, foreign keys, ranges, translations, logo files)
// the data translations in /locales/data, and the UI string catalogs in /locales (missing strings,
// placeholder mismatches).
// Usage: npm run validate
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "../src/core/csv.js";
import { TABLE_NAMES } from "../src/data/schema.js";
import { validateTables } from "../src/data/validate.js";
import { CONFIG } from "../src/config.js";
import { checkCatalogs } from "../src/i18n/catalog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function loadTables(dataDir = path.join(root, "data")) {
  return Object.fromEntries(
    TABLE_NAMES.map(name => [name, parseCsv(fs.readFileSync(path.join(dataDir, `${name}.csv`), "utf8"))])
  );
}

export function loadCatalogs(localesDir = path.join(root, CONFIG.localesUrl)) {
  return Object.fromEntries(
    CONFIG.locales.map(code => [code, JSON.parse(fs.readFileSync(path.join(localesDir, `${code}.json`), "utf8"))])
  );
}

/** Data translations for every non-source locale: { he: { "<table>.<row>.<column>": text } }. */
export function loadDataTranslations(dir = path.join(root, CONFIG.localesUrl, "data")) {
  return Object.fromEntries(
    CONFIG.locales.filter(code => code !== CONFIG.sourceLocale)
      .map(code => [code, JSON.parse(fs.readFileSync(path.join(dir, `${code}.json`), "utf8")).strings])
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tables = loadTables();
  const data = validateTables(tables, { fileExists: rel => fs.existsSync(path.join(root, rel)), translations: loadDataTranslations() });
  const strings = checkCatalogs(loadCatalogs(), CONFIG.sourceLocale);
  const errors = [...data.errors, ...strings.errors.map(e => `locales/${e}`)];
  const warnings = [...data.warnings, ...strings.warnings.map(w => `locales/${w}`)];
  for (const w of warnings) console.warn(`warn  ${w}`);
  for (const e of errors) console.error(`error ${e}`);
  const counts = TABLE_NAMES.map(n => `${n}=${tables[n].length}`).join(" ");
  console.log(`\n${counts}`);
  console.log(errors.length ? `\n✗ ${errors.length} error(s)` : "\n✓ dataset and translations are valid");
  process.exit(errors.length ? 1 : 0);
}
