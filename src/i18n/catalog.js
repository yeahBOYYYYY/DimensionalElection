/**
 * Pure helpers for message catalogs (locales/<code>.json), shared by the app, the translation
 * editor, the dev server and the tests. No DOM, no I/O.
 *
 * A catalog is { meta: { name, short, dir }, strings: { "<key>": "<message>" } }.
 * Messages use {name} placeholders. Plural forms follow the i18next convention: `<key>_<category>`
 * where category is a CLDR plural category (zero, one, two, few, many, other), chosen with
 * Intl.PluralRules from the `count` variable. `<key>_other` is required and is the fallback.
 */
export const PLURAL_CATEGORIES = ["zero", "one", "two", "few", "many", "other"];
const PLURAL_SUFFIX = new RegExp(`_(${PLURAL_CATEGORIES.join("|")})$`);

/** "topics.count_two" → "topics.count"; non-plural keys are returned unchanged. */
export function baseKey(key) {
  return key.replace(PLURAL_SUFFIX, "");
}

/** Placeholder names used in a message: "{n} of {total}" → ["n", "total"]. */
export function placeholders(message) {
  return [...new Set([...String(message).matchAll(/\{(\w+)\}/g)].map(m => m[1]))];
}

/**
 * Compare every catalog against the source-language catalog.
 * Errors: missing messages, unknown placeholders, malformed catalogs.
 * Warnings: messages that drop a placeholder, keys that only exist in a translation.
 * @param {Record<string, {meta: object, strings: Record<string,string>}>} catalogs
 */
export function checkCatalogs(catalogs, sourceLocale) {
  const errors = [], warnings = [];
  for (const [code, cat] of Object.entries(catalogs)) {
    if (!cat?.meta || !cat.strings) errors.push(`${code}: missing "meta" or "strings"`);
    else if (!["ltr", "rtl"].includes(cat.meta.dir)) errors.push(`${code}: meta.dir must be "ltr" or "rtl"`);
  }
  const source = catalogs[sourceLocale]?.strings;
  if (!source) return { errors: [...errors, `source locale "${sourceLocale}" not found`], warnings };

  // Placeholders allowed per base key: everything any source form uses.
  const allowed = new Map();
  for (const [key, msg] of Object.entries(source)) {
    const base = baseKey(key);
    allowed.set(base, new Set([...(allowed.get(base) ?? []), ...placeholders(msg)]));
  }

  for (const [code, cat] of Object.entries(catalogs)) {
    const strings = cat?.strings ?? {};
    const has = key => typeof strings[key] === "string" && strings[key].trim() !== "";

    for (const key of Object.keys(source)) {
      const isPlural = baseKey(key) !== key;
      if (isPlural) {
        // Languages have different plural categories; only `_other` is mandatory everywhere.
        if (key.endsWith("_other") && !has(key)) errors.push(`${code}: "${key}" is missing`);
      } else if (!has(key)) {
        errors.push(`${code}: "${key}" is missing`);
      }
    }

    for (const [key, msg] of Object.entries(strings)) {
      const base = baseKey(key);
      if (!allowed.has(base)) {
        if (code !== sourceLocale) warnings.push(`${code}: "${key}" is not in the ${sourceLocale} catalog (unused?)`);
        continue;
      }
      for (const p of placeholders(msg)) {
        if (!allowed.get(base).has(p)) errors.push(`${code}: "${key}" uses {${p}}, which the ${sourceLocale} text doesn't define`);
      }
      if (code !== sourceLocale && base === key && source[key] !== undefined) {
        for (const p of placeholders(source[key])) {
          if (!placeholders(msg).includes(p)) warnings.push(`${code}: "${key}" doesn't use {${p}}`);
        }
      }
    }
  }
  return { errors, warnings };
}

/**
 * Canonical file text for a catalog (UI or data): meta, if any, on one line, one string per line, a blank line
 * between key groups (the part before the first dot). Keeps diffs small and readable.
 */
export function serializeCatalog(catalog) {
  const lines = [];
  let prevGroup = null;
  for (const [key, msg] of Object.entries(catalog.strings)) {
    const group = key.split(".")[0];
    if (prevGroup !== null && group !== prevGroup) lines.push("");
    lines.push(`    ${JSON.stringify(key)}: ${JSON.stringify(msg)},`);
    prevGroup = group;
  }
  if (lines.length) lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, "");
  const meta = catalog.meta && JSON.stringify(catalog.meta).replace(/^\{/, "{ ").replace(/\}$/, " }").replace(/","/g, '", "').replace(/":"/g, '": "');
  return `{\n${meta ? `  "meta": ${meta},\n` : ""}  "strings": {\n${lines.join("\n")}\n  }\n}\n`;
}
