import { SCHEMA, SCALE } from "./schema.js";
import { checkDataTranslations } from "./translations.js";

/**
 * Validate raw dataset tables against the schema: required columns, unique keys,
 * foreign keys, value ranges and, when catalogs are given, translation completeness.
 * Pure function: returns { errors: string[], warnings: string[] }.
 *
 * @param {Record<string, object[]>} tables
 * @param {{ fileExists?: (relPath: string) => boolean, translations?: Record<string, Record<string,string>> }} [options]
 */
export function validateTables(tables, { fileExists, translations } = {}) {
  const errors = [];
  const warnings = [];
  const ids = name => new Set((tables[name] || []).map(r => r.id));

  for (const [name, spec] of Object.entries(SCHEMA)) {
    const rows = tables[name];
    if (!rows) { errors.push(`Missing table: ${name}`); continue; }

    // Columns
    if (rows.length) {
      const missing = spec.columns.filter(c => !(c in rows[0]));
      if (missing.length) errors.push(`${name}: missing columns ${missing.join(", ")}`);
    }

    // Unique keys
    const seen = new Set();
    rows.forEach((r, i) => {
      const k = spec.key.map(c => r[c]).join("|");
      if (seen.has(k)) errors.push(`${name} row ${i + 2}: duplicate key "${k}"`);
      seen.add(k);
    });

    // Foreign keys
    for (const [col, target] of Object.entries(spec.refs || {})) {
      const many = target.endsWith("[]");
      const optional = target.endsWith("?");
      const table = target.replace(/\[\]|\?/g, "");
      const valid = ids(table);
      rows.forEach((r, i) => {
        const values = many ? (r[col] || "").split("|").filter(Boolean) : [r[col]];
        if (many && !values.length) errors.push(`${name} row ${i + 2}: ${col} is empty (every claim needs a source)`);
        for (const v of values) {
          if (optional && v === "") continue;
          if (!valid.has(v)) errors.push(`${name} row ${i + 2}: ${col} "${v}" not found in ${table}`);
        }
      });
    }

    // Translation keys are "<table>.<a>/<b>.<column>", so key values can't contain "." or "/"
    rows.forEach((r, i) => {
      for (const c of spec.translate ? spec.key : []) {
        if (/[./]/.test(r[c])) errors.push(`${name} row ${i + 2}: ${c} "${r[c]}" must not contain "." or "/"`);
      }
    });
  }

  if (translations) {
    const t = checkDataTranslations(tables, translations);
    errors.push(...t.errors);
    warnings.push(...t.warnings);
  }

  // Positions: value range, and the party must have run in that election
  const lists = new Set((tables.election_lists || []).map(r => `${r.election_id}|${r.party_id}`));
  (tables.positions || []).forEach((r, i) => {
    if (r.value !== "") {
      const v = Number(r.value);
      if (!Number.isFinite(v) || v < SCALE.min || v > SCALE.max) errors.push(`positions row ${i + 2}: value "${r.value}" out of range ${SCALE.min}–${SCALE.max}`);
    }
    if (!lists.has(`${r.election_id}|${r.party_id}`)) errors.push(`positions row ${i + 2}: party "${r.party_id}" has no list in election ${r.election_id}`);
  });

  // Parties: colors and logo files
  (tables.parties || []).forEach((r, i) => {
    if (!/^#[0-9a-f]{6}$/i.test(r.color)) errors.push(`parties row ${i + 2}: invalid color "${r.color}"`);
    if (r.logo && fileExists && !fileExists(`assets/logos/${r.logo}`)) errors.push(`parties row ${i + 2}: logo file assets/logos/${r.logo} not found`);
    if (!r.logo) warnings.push(`parties: "${r.id}" has no logo (initials will be shown)`);
  });

  // Sources: well-formed URLs, and unused entries
  const used = new Set();
  for (const t of ["positions", "lineage"]) for (const r of tables[t] || []) for (const s of (r.source_ids || "").split("|")) used.add(s);
  (tables.sources || []).forEach((r, i) => {
    if (!/^https:\/\//.test(r.url)) errors.push(`sources row ${i + 2}: url must start with https://`);
    if (!used.has(r.id)) warnings.push(`sources: "${r.id}" is never referenced`);
  });

  return { errors, warnings };
}
