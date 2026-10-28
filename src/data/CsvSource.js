import { parseCsv } from "../core/csv.js";
import { TABLE_NAMES } from "./schema.js";

/** Loads every dataset table from `<baseUrl>/<table>.csv` over HTTP. */
export class CsvSource {
  constructor(baseUrl, fetchImpl = globalThis.fetch.bind(globalThis)) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetch = fetchImpl;
  }

  async loadTable(name) {
    const res = await this.fetch(`${this.baseUrl}/${name}.csv`);
    if (!res.ok) throw new Error(`Failed to load ${name}.csv (HTTP ${res.status})`);
    return parseCsv(await res.text());
  }

  /** @returns {Promise<Record<string, object[]>>} */
  async loadAll() {
    const entries = await Promise.all(TABLE_NAMES.map(async name => [name, await this.loadTable(name)]));
    return Object.fromEntries(entries);
  }
}
