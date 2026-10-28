import { h, mount } from "../../core/dom.js";
import { baseKey, placeholders } from "../catalog.js";

/**
 * Side-by-side editor for one set of catalogs (translate.html has one for UI strings, one for data).
 * Edits are kept in memory; `save()` PUTs each changed catalog to the dev server, which writes it to
 * disk. On a static host without that endpoint, the changed catalogs are downloaded instead.
 */
export class TranslationEditor {
  #catalogs;
  #saved;
  #dirty = new Set();
  #keys = [];

  /**
   * @param {HTMLElement} el
   * @param {object} options
   * @param {Record<string, {meta: object, strings: Record<string,string>}>} options.catalogs
   * @param {string[]} options.locales        column order
   * @param {string} options.sourceLocale     the language every other one is checked against
   * @param {string[]} [options.readOnly]     locales shown for reference only (e.g. English data from the CSVs)
   * @param {(code: string) => string} options.url            where a catalog is saved
   * @param {(catalog: object) => object} [options.payload]   what gets saved
   * @param {string} [options.note]           one line shown above the table
   */
  constructor(el, { catalogs, locales, sourceLocale, readOnly = [], url, payload = c => c, note = "" }) {
    this.el = el;
    this.locales = locales;
    this.sourceLocale = sourceLocale;
    this.readOnly = new Set(readOnly);
    this.url = url;
    this.payload = payload;
    this.note = note;
    this.#catalogs = structuredClone(catalogs);
    this.#saved = structuredClone(catalogs);
    this.query = "";
    this.onlyIssues = false;
  }

  get isDirty() { return this.#dirty.size > 0; }

  /** Every key in source order. Keys only a translation has (e.g. Hebrew `_two`) go next to their plural siblings. */
  #computeKeys() {
    const keys = Object.keys(this.#catalogs[this.sourceLocale].strings);
    const known = new Set(keys);
    for (const key of this.locales.flatMap(code => Object.keys(this.#catalogs[code].strings))) {
      if (known.has(key)) continue;
      known.add(key);
      const other = keys.indexOf(`${baseKey(key)}_other`);
      const sibling = keys.findLastIndex(k => baseKey(k) === baseKey(key));
      keys.splice(other !== -1 ? other : sibling !== -1 ? sibling + 1 : keys.length, 0, key);
    }
    return keys;
  }

  /** Problems with one cell, or null. Optional plural forms (e.g. Hebrew-only `_two`) may be empty. */
  issue(code, key) {
    const source = this.#catalogs[this.sourceLocale].strings;
    const text = this.#catalogs[code].strings[key] ?? "";
    if (code !== this.sourceLocale && !(key in source) && baseKey(key) === key) return { level: "warn", text: `no ${this.sourceLocale} text (stale?)` };
    const optional = baseKey(key) !== key && !key.endsWith("_other");
    if (!text.trim()) return optional ? null : { level: "error", text: "missing" };
    const allowed = new Set(this.#keys.filter(k => baseKey(k) === baseKey(key)).flatMap(k => placeholders(source[k] ?? "")));
    const unknown = placeholders(text).filter(p => !allowed.has(p));
    if (unknown.length) return { level: "error", text: `unknown ${unknown.map(p => `{${p}}`).join(" ")}` };
    if (baseKey(key) === key && code !== this.sourceLocale) {
      const dropped = placeholders(source[key] ?? "").filter(p => !placeholders(text).includes(p));
      if (dropped.length) return { level: "warn", text: `doesn't use ${dropped.map(p => `{${p}}`).join(" ")}` };
    }
    return null;
  }

  render() {
    this.#keys = this.#computeKeys();
    const q = this.query.trim().toLowerCase();
    const rows = this.#keys.filter(key => {
      if (this.onlyIssues && !this.locales.some(code => this.issue(code, key))) return false;
      if (!q) return true;
      return key.toLowerCase().includes(q) || this.locales.some(code => (this.#catalogs[code].strings[key] ?? "").toLowerCase().includes(q));
    });

    let prevGroup = null;
    const body = [];
    for (const key of rows) {
      const group = key.split(".")[0];
      if (group !== prevGroup) body.push(h("tr", { class: "group" }, h("th", { colspan: this.locales.length + 1 }, group)));
      prevGroup = group;
      body.push(this.#row(key));
    }

    this.statusEl = h("span", { class: "status" });
    this.issuesEl = h("span");
    this.revertBtn = h("button", { type: "button", class: "btn", onclick: () => this.revert() }, "Revert");
    this.saveBtn = h("button", { type: "button", class: "btn primary", onclick: () => this.save() }, "Save (Ctrl+S)");

    mount(this.el,
      h("div", { class: "toolbar" },
        h("input", {
          type: "search", class: "search", value: this.query, placeholder: "Search keys or text…", "aria-label": "Search",
          oninput: e => { this.query = e.target.value; this.#rerenderKeepingFocus(".search"); }
        }),
        h("label", { class: "check" },
          h("input", { type: "checkbox", checked: this.onlyIssues, onchange: e => { this.onlyIssues = e.target.checked; this.render(); } }),
          " Only problems ", this.issuesEl),
        this.statusEl, this.revertBtn, this.saveBtn),
      this.note ? h("p", { class: "note" }, this.note) : null,
      h("table", { class: "grid" },
        h("thead", {}, h("tr", {}, h("th", {}, "Key"), this.locales.map(code => h("th", {}, `${this.#catalogs[code].meta.name} (${code})`)))),
        h("tbody", {}, body.length ? body : h("tr", {}, h("td", { colspan: this.locales.length + 1, class: "empty" }, "Nothing matches.")))));
    this.#refreshToolbar();
  }

  #refreshToolbar() {
    const errors = this.#keys.reduce((n, key) => n + this.locales.filter(code => this.issue(code, key)?.level === "error").length, 0);
    this.issuesEl.textContent = `(${errors})`;
    this.statusEl.textContent = this.isDirty ? `Unsaved: ${[...this.#dirty].join(", ")}` : "All changes saved";
    this.revertBtn.disabled = this.saveBtn.disabled = !this.isDirty;
  }

  #row(key) {
    const source = this.#catalogs[this.sourceLocale].strings[key] ?? "";
    const vars = placeholders(source);
    return h("tr", {},
      h("td", { class: "key" },
        h("code", {}, key),
        vars.length ? h("small", {}, vars.map(v => `{${v}}`).join(" ")) : null,
        baseKey(key) !== key ? h("small", { class: "plural" }, `plural form: ${key.slice(baseKey(key).length + 1)}`) : null),
      this.locales.map(code => {
        const value = this.#catalogs[code].strings[key] ?? "";
        const cell = h("td", { "data-locale": code },
          h("textarea", {
            dir: this.#catalogs[code].meta.dir, lang: code, rows: Math.max(1, Math.ceil(value.length / 48)),
            readonly: this.readOnly.has(code), placeholder: code === this.sourceLocale ? "" : source,
            oninput: e => this.#edit(cell, code, key, e.target.value)
          }, value));
        this.#refreshCell(cell, code, key);
        return cell;
      }));
  }

  /** Update one cell's state in place, so typing never rebuilds the table. */
  #refreshCell(cell, code, key) {
    const value = this.#catalogs[code].strings[key] ?? "";
    const changed = value !== (this.#saved[code].strings[key] ?? "");
    const issue = this.issue(code, key);
    cell.className = ["cell", changed ? "changed" : "", issue ? issue.level : "", this.readOnly.has(code) ? "readonly" : ""].join(" ");
    cell.querySelector(".issue")?.remove();
    if (issue) cell.append(h("div", { class: "issue" }, issue.text));
  }

  #edit(cell, code, key, value) {
    const strings = this.#catalogs[code].strings;
    if (value === "" && this.#saved[code].strings[key] === undefined) delete strings[key];
    else strings[key] = value;
    if (JSON.stringify(strings) === JSON.stringify(this.#saved[code].strings)) this.#dirty.delete(code);
    else this.#dirty.add(code);
    // A source edit can change what's valid in the other columns of the row.
    for (const sibling of cell.parentElement.querySelectorAll("td[data-locale]")) this.#refreshCell(sibling, sibling.dataset.locale, key);
    this.#refreshToolbar();
  }

  /** Re-render without losing the caret in the field being typed into. */
  #rerenderKeepingFocus(selector) {
    const active = document.activeElement;
    const [start, end] = active ? [active.selectionStart, active.selectionEnd] : [];
    this.render();
    const el = this.el.querySelector(selector);
    if (el) { el.focus(); if (start !== undefined) el.setSelectionRange(start, end); }
  }

  revert() {
    if (!confirm("Discard all unsaved changes?")) return;
    this.#catalogs = structuredClone(this.#saved);
    this.#dirty.clear();
    this.render();
  }

  async save() {
    if (!this.isDirty) return;
    const failed = [];
    for (const code of [...this.#dirty]) {
      try {
        const res = await fetch(this.url(code), {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.payload(this.#catalogs[code]))
        });
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
        this.#saved[code] = structuredClone(this.#catalogs[code]);
        this.#dirty.delete(code);
      } catch (err) {
        failed.push([code, err]);
      }
    }
    this.render();
    if (failed.length) {
      const why = failed.map(([code, err]) => `${code}: ${err.message}`).join("\n");
      if (confirm(`Couldn't save to disk (saving needs \`npm start\` on this machine).\n${why}\n\nDownload the changed files instead?`)) {
        for (const [code] of failed) this.#download(code);
      }
    }
  }

  #download(code) {
    const blob = new Blob([JSON.stringify(this.payload(this.#catalogs[code]), null, 2) + "\n"], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: `${code}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}
