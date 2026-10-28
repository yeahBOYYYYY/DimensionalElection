/**
 * Minimal RFC 4180 CSV parser.
 * Handles quoted fields, escaped quotes (""), embedded commas/newlines, CRLF and a UTF-8 BOM.
 */

/** Parse CSV text into an array of string arrays. */
export function parseCsvRows(text) {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += c;
  }
  if (inQuotes) throw new Error("CSV parse error: unterminated quoted field");
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0] === ""));
}

/** Parse CSV text with a header row into an array of plain objects. */
export function parseCsv(text) {
  const [header, ...rows] = parseCsvRows(text);
  if (!header) return [];
  return rows.map((r, n) => {
    if (r.length !== header.length) {
      throw new Error(`CSV parse error: row ${n + 2} has ${r.length} fields, expected ${header.length}`);
    }
    return Object.fromEntries(header.map((h, i) => [h, r[i]]));
  });
}
