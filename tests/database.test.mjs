import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTables } from "../scripts/validate-data.mjs";
import { Database } from "../src/data/Database.js";
import {
  entryKey, parseEntryKey, passesFilters, placeEntries, sortedCategories, sortedTopics, visibleEntries
} from "../src/state/selectors.js";
import { buildHistory } from "../src/ui/layout/historyGraph.js";

const db = new Database(loadTables());
const baseState = { elections: ["2026"], groups: [], hiddenEntries: [] };

test("elections are ordered oldest first", () => {
  const dates = db.elections().map(e => e.date);
  assert.deepEqual(dates, [...dates].sort());
  assert.equal(db.latestElection().id, "2026");
});

test("positions are typed: numbers, or null for 'unclear'", () => {
  assert.equal(typeof db.position("2026", "pal-state", "likud").value, "number");
  assert.equal(db.position("2026", "pal-state", "utj").value, null);
  assert.equal(db.position("2026", "pal-state", "meretz"), undefined);
});

test("historical parties only run in their elections", () => {
  assert.deepEqual(db.electionsOf("meretz").map(e => e.id), ["2022"]);
  assert.ok(!db.partiesIn("2026").includes("meretz"));
  assert.ok(db.partiesIn("2026").includes("democrats"));
});

test("bloc membership is per election; families apply to all elections", () => {
  assert.ok(db.isMember("change", "raam", "2022"));
  assert.ok(!db.isMember("change", "raam", "2026"));
  assert.ok(db.isMember("arab", "raam", "2022") && db.isMember("arab", "raam", "2026"));
});

test("group filter keeps only members of a selected group", () => {
  const state = { ...baseState, groups: ["haredi"] };
  const ids = visibleEntries(db, state).map(e => e.party.id).sort();
  assert.deepEqual(ids, ["shas", "utj"]);
  assert.equal(passesFilters(db, { ...baseState, hiddenEntries: ["2026.likud"] }, "likud", "2026"), false);
});

test("placeEntries separates placed from unclear / missing", () => {
  const { placed, unplaced } = placeEntries(db, visibleEntries(db, baseState), ["pal-state"]);
  assert.ok(placed.some(e => e.party.id === "likud" && e.values["pal-state"] === 8.5));
  assert.deepEqual(unplaced.map(e => [e.party.id, e.reason]), [["utj", "unclear"]]);
});

test("the same party in two elections is two independent entries", () => {
  const state = { ...baseState, elections: ["2022", "2026"], hiddenEntries: [entryKey("2022", "likud")] };
  const keys = visibleEntries(db, state).map(e => e.key);
  assert.ok(keys.includes("2026.likud"));
  assert.ok(!keys.includes("2022.likud"));
  assert.deepEqual(parseEntryKey("2026.yesh-atid"), { electionId: "2026", partyId: "yesh-atid" });
});

test("categories: most current first; topics: most data first", () => {
  const cats = sortedCategories(db).map(c => c.id);
  assert.equal(cats[0], "security", "security has only 2026 data");
  assert.equal(cats.at(-1), "society", "economy & society is half 2022 data");
  assert.equal(cats.length, db.categories().length);
  const count = t => db.placedCount(t.id, ["2026"]);
  for (const c of cats) {
    const counts = sortedTopics(db, c, ["2026"]).map(count);
    assert.deepEqual(counts, [...counts].sort((a, b) => b - a), c);
  }
});

test("history graph: lines never share a lane at the same time, and merges continue a lane", () => {
  const { rows, spans, edges } = buildHistory(db);
  const byLane = new Map();
  for (const [id, s] of spans) {
    assert.ok(s.start <= s.end, id);
    for (const [other, o] of byLane.get(s.lane) ?? []) {
      const touching = o.end === s.start || s.end === o.start;
      const overlap = s.start < o.end && o.start < s.end;
      assert.ok(!overlap || touching, `${id} overlaps ${other}`);
    }
    byLane.set(s.lane, [...(byLane.get(s.lane) ?? []), [id, s]]);
  }
  assert.equal(spans.get("democrats").lane, spans.get("labor").lane, "The Democrats continue Labor's line");
  assert.ok(edges.some(e => e.fromId === "meretz" && e.toId === "democrats" && !e.continues));
  assert.ok(!rows.some(r => r.type === "founded" && r.partyId === "democrats"), "founded through the merger itself");
  assert.equal(rows.at(-1).type, "now");
  assert.ok(spans.get("likud").open && !spans.get("labor").open);
});
