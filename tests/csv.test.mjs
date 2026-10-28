import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseCsvRows } from "../src/core/csv.js";

test("parses quoted fields with commas, quotes and newlines", () => {
  const rows = parseCsvRows('a,b,c\n1,"x, y","he said ""hi"""\n2,"line1\nline2",z\n');
  assert.deepEqual(rows, [["a", "b", "c"], ["1", "x, y", 'he said "hi"'], ["2", "line1\nline2", "z"]]);
});

test("handles CRLF, BOM, empty fields and a missing trailing newline", () => {
  const rows = parseCsvRows("﻿id,v\r\n1,\r\n2,x");
  assert.deepEqual(rows, [["id", "v"], ["1", ""], ["2", "x"]]);
});

test("keeps Hebrew text intact", () => {
  const [row] = parseCsv('id,name_he\nlikud,"הליכוד, מפלגה"\n');
  assert.equal(row.name_he, "הליכוד, מפלגה");
});

test("maps rows to objects by header", () => {
  assert.deepEqual(parseCsv("id,value\na,1\nb,2\n"), [{ id: "a", value: "1" }, { id: "b", value: "2" }]);
});

test("rejects rows with the wrong number of fields", () => {
  assert.throws(() => parseCsv("a,b\n1,2,3\n"), /row 2 has 3 fields/);
});

test("rejects an unterminated quote", () => {
  assert.throws(() => parseCsvRows('a\n"oops\n'), /unterminated/);
});
