import { CONFIG } from "./config.js";
import { CsvSource } from "./data/CsvSource.js";
import { Database } from "./data/Database.js";
import { I18n } from "./i18n/I18n.js";
import { loadCatalogs } from "./i18n/loadCatalogs.js";
import { loadPreferredLocale } from "./i18n/localePreference.js";
import { App } from "./App.js";

/** Language resolution: explicit link (#lang=…) → the visitor's saved choice → the site default. */
function initialLocale(supported) {
  const fromHash = new URLSearchParams(location.hash.replace(/^#\/?/, "")).get("lang");
  if (supported.includes(fromHash)) return fromHash;
  const saved = loadPreferredLocale();
  return supported.includes(saved) ? saved : CONFIG.defaultLocale;
}

async function main() {
  const root = document.body;
  try {
    const translated = CONFIG.locales.filter(code => code !== CONFIG.sourceLocale);
    const [tables, dictionaries, dataCatalogs] = await Promise.all([
      new CsvSource(CONFIG.dataUrl).loadAll(),
      loadCatalogs(CONFIG.localesUrl, CONFIG.locales),
      loadCatalogs(`${CONFIG.localesUrl}/data`, translated)
    ]);
    const data = Object.fromEntries(Object.entries(dataCatalogs).map(([code, c]) => [code, c.strings]));
    const showKeys = new URLSearchParams(location.search).get("i18n") === "keys";
    const i18n = new I18n(dictionaries, initialLocale(CONFIG.locales), { fallback: CONFIG.sourceLocale, showKeys, data });
    const app = new App(root, { db: new Database(tables), i18n });
    app.render();
    root.classList.add("ready");
  } catch (err) {
    console.error(err);
    const box = root.querySelector("[data-load-error]");
    box.hidden = false;
    box.querySelector("[data-load-error-detail]").textContent = String(err.message || err);
  }
}

main();
