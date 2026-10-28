/**
 * Localization service.
 * - `t(key, vars)` translates UI strings from the locale catalogs (locales/<code>.json).
 *   Passing a numeric `count` picks the CLDR plural form (`key_one`, `key_two`, `key_other`…).
 *   Lookup falls back: current locale → fallback (source) locale → the key itself.
 * - `field(record, name)` localizes a data column: the CSV holds the source-language text, and other
 *   languages come from the data catalogs (locales/data/<code>.json) under `<record.i18nKey>.<name>`.
 * - `apply(root)` fills static markup marked with data-i18n / data-i18n-attr.
 * - With `showKeys`, `t()` returns the key instead of the text, so you can see which key to edit.
 */
export class I18n {
  #dictionaries;
  #locale;
  #fallback;
  #showKeys;
  #data;
  #plurals = new Map();
  #warned = new Set();

  /**
   * @param {Record<string, {meta: {dir: string, name: string}, strings: Record<string,string>}>} dictionaries
   * @param {string} locale
   * @param {{fallback?: string, showKeys?: boolean, data?: Record<string, Record<string,string>>}} [options]
   *   `fallback` is the source language (UI fallback, and the language of the CSV text);
   *   `data` maps every other locale to its data translations.
   */
  constructor(dictionaries, locale, { fallback = "en", showKeys = false, data = {} } = {}) {
    this.#dictionaries = dictionaries;
    this.#locale = this.supports(locale) ? locale : Object.keys(dictionaries)[0];
    this.#fallback = fallback;
    this.#showKeys = showKeys;
    this.#data = data;
  }

  get locale() { return this.#locale; }
  get locales() { return Object.keys(this.#dictionaries); }
  get dir() { return this.#dictionaries[this.#locale].meta.dir; }
  get isRtl() { return this.dir === "rtl"; }
  supports(locale) { return Boolean(locale && this.#dictionaries[locale]); }
  localeName(locale) { return this.#dictionaries[locale].meta.name; }

  setLocale(locale) {
    if (this.supports(locale)) this.#locale = locale;
  }

  t(key, vars = {}) {
    if (this.#showKeys) return key;
    return this.#message(key, vars.count).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
  }

  /**
   * Like t(), but returns the message as an array of text and values, so a placeholder can be
   * filled with a DOM node (e.g. a clickable party name) without concatenating translated fragments.
   */
  tParts(key, vars = {}) {
    if (this.#showKeys) return [key];
    return this.#message(key, vars.count).split(/(\{\w+\})/).filter(Boolean)
      .map(part => (/^\{\w+\}$/.test(part) && part.slice(1, -1) in vars ? vars[part.slice(1, -1)] : part));
  }

  #message(key, count) {
    return this.#lookup(this.#locale, key, count) ?? this.#lookup(this.#fallback, key, count) ?? this.#missing(key);
  }

  #lookup(locale, key, count) {
    const strings = this.#dictionaries[locale]?.strings;
    if (!strings) return undefined;
    if (typeof count === "number") {
      const form = strings[`${key}_${this.#pluralRules(locale).select(count)}`] ?? strings[`${key}_other`];
      if (form) return form;
    }
    return strings[key] || undefined;
  }

  #pluralRules(locale) {
    if (!this.#plurals.has(locale)) this.#plurals.set(locale, new Intl.PluralRules(locale));
    return this.#plurals.get(locale);
  }

  #missing(key) {
    if (!this.#warned.has(key)) {
      this.#warned.add(key);
      console.warn(`[i18n] missing translation: "${key}"`);
    }
    return key;
  }

  /** Localized value of a data record's column, falling back to the source-language text in the CSV. */
  field(record, name, locale = this.#locale) {
    if (!record) return "";
    if (locale !== this.#fallback) {
      const translated = this.#data[locale]?.[`${record.i18nKey}.${name}`];
      if (translated) return translated;
    }
    return record[name] || "";
  }

  /** Format a date string (YYYY-MM-DD) for the current locale. */
  date(iso, opts = { day: "numeric", month: "long", year: "numeric" }) {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(this.#locale === "he" ? "he-IL" : "en-GB", opts);
  }

  /** Update <html lang/dir> and every [data-i18n] / [data-i18n-attr="attr:key;attr:key"] element. */
  apply(root = document) {
    document.documentElement.lang = this.#locale;
    document.documentElement.dir = this.dir;
    for (const el of root.querySelectorAll("[data-i18n]")) el.textContent = this.t(el.dataset.i18n);
    for (const el of root.querySelectorAll("[data-i18n-attr]")) {
      for (const pair of el.dataset.i18nAttr.split(";")) {
        const [attr, key] = pair.split(":");
        el.setAttribute(attr, this.t(key));
      }
    }
  }
}
