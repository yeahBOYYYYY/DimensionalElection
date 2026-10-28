import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadTables, loadDataTranslations } from "../scripts/validate-data.mjs";
import { validateTables } from "../src/data/validate.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tables = loadTables();
const translations = loadDataTranslations();

test("the shipped dataset passes validation", () => {
  const { errors } = validateTables(tables, { fileExists: rel => fs.existsSync(path.join(root, rel)), translations });
  assert.deepEqual(errors, []);
});

test("every placed position cites at least one source", () => {
  for (const p of tables.positions) assert.ok(p.source_ids.split("|").filter(Boolean).length > 0, `${p.election_id}/${p.topic_id}/${p.party_id}`);
});

test("validator catches broken references and out-of-range values", () => {
  const broken = structuredClone(tables);
  broken.positions[0] = { ...broken.positions[0], value: "11", source_ids: "nope" };
  const { errors } = validateTables(broken);
  assert.ok(errors.some(e => e.includes("out of range")));
  assert.ok(errors.some(e => e.includes('"nope" not found in sources')));
});

test("validator catches a missing Hebrew translation", () => {
  const he = { ...translations.he };
  delete he[`topics.${tables.topics[0].id}.title`];
  const { errors } = validateTables(tables, { translations: { he } });
  assert.ok(errors.some(e => e.includes(`"topics.${tables.topics[0].id}.title" is missing`)));
});

test("the CSVs hold each text once: no per-language columns", () => {
  for (const [name, rows] of Object.entries(tables)) {
    assert.ok(!Object.keys(rows[0] ?? {}).some(c => /_(en|he)$/.test(c)), name);
  }
});
