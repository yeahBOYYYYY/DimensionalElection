import { test } from "node:test";
import assert from "node:assert/strict";
import { I18n } from "../src/i18n/I18n.js";
import { baseKey, checkCatalogs, placeholders, serializeCatalog } from "../src/i18n/catalog.js";
import { loadCatalogs } from "../scripts/validate-data.mjs";
import { CONFIG } from "../src/config.js";

const catalogs = {
  en: { meta: { name: "English", dir: "ltr" }, strings: { hi: "Hello {name}", "n_one": "{count} item", "n_other": "{count} items", onlyEn: "English only" } },
  he: { meta: { name: "עברית", dir: "rtl" }, strings: { hi: "שלום {name}", "n_one": "פריט אחד", "n_two": "שני פריטים", "n_other": "{count} פריטים" } }
};

test("the shipped catalogs are complete and consistent", () => {
  const { errors } = checkCatalogs(loadCatalogs(), CONFIG.sourceLocale);
  assert.deepEqual(errors, []);
});

test("the site defaults to Hebrew, right to left", () => {
  assert.equal(CONFIG.defaultLocale, "he");
  assert.equal(loadCatalogs().he.meta.dir, "rtl");
});

test("t() interpolates and picks CLDR plural forms per language", () => {
  const he = new I18n(catalogs, "he");
  assert.equal(he.t("hi", { name: "רון" }), "שלום רון");
  assert.equal(he.t("n", { count: 1 }), "פריט אחד");
  assert.equal(he.t("n", { count: 2 }), "שני פריטים");
  assert.equal(he.t("n", { count: 7 }), "7 פריטים");
  const en = new I18n(catalogs, "en");
  assert.equal(en.t("n", { count: 2 }), "2 items");
});

test("t() falls back to the source language, then to the key", () => {
  const he = new I18n(catalogs, "he", { fallback: "en" });
  assert.equal(he.t("onlyEn"), "English only");
  const warn = console.warn;
  console.warn = () => {};
  try { assert.equal(he.t("nope"), "nope"); } finally { console.warn = warn; }
});

test("field() reads data text from the CSV in the source language and from the data catalog otherwise", () => {
  const party = { i18nKey: "parties.likud", name: "Likud", abbr: "L" };
  const data = { he: { "parties.likud.name": "הליכוד" } };
  const he = new I18n(catalogs, "he", { fallback: "en", data });
  assert.equal(he.field(party, "name"), "הליכוד");
  assert.equal(he.field(party, "abbr"), "L", "untranslated cells fall back to the CSV text");
  assert.equal(he.field(party, "name", "en"), "Likud");
  assert.equal(new I18n(catalogs, "en", { fallback: "en", data }).field(party, "name"), "Likud");
});

test("tParts() keeps placeholder values as-is so they can be DOM nodes", () => {
  const he = new I18n(catalogs, "he");
  const node = { node: true };
  assert.deepEqual(he.tParts("hi", { name: node }), ["שלום ", node]);
});

test("showKeys mode returns keys instead of text", () => {
  assert.equal(new I18n(catalogs, "he", { showKeys: true }).t("hi", { name: "x" }), "hi");
});

test("checkCatalogs reports missing strings and unknown placeholders", () => {
  const broken = structuredClone(catalogs);
  delete broken.he.strings.hi;
  broken.he.strings.n_other = "{total} פריטים";
  const { errors, warnings } = checkCatalogs(broken, "en");
  assert.ok(errors.some(e => e.includes('"hi" is missing')));
  assert.ok(errors.some(e => e.includes("{total}")));
  assert.ok(errors.some(e => e.includes('"onlyEn" is missing')));
  assert.equal(warnings.length, 0);
});

test("helpers: plural base keys and placeholder extraction", () => {
  assert.equal(baseKey("topics.count_two"), "topics.count");
  assert.equal(baseKey("lineage.joint_list"), "lineage.joint_list");
  assert.deepEqual(placeholders("{x} × {y} ({x})"), ["x", "y"]);
});

test("serializeCatalog round-trips and groups keys by prefix", () => {
  const cat = { meta: { name: "x", dir: "ltr" }, strings: { "a.one": "1", "a.two": "\"2\"", "b.one": "3" } };
  const text = serializeCatalog(cat);
  assert.deepEqual(JSON.parse(text), cat);
  assert.match(text, /"a\.two": "\\"2\\"",\n\n {4}"b\.one"/);
});
