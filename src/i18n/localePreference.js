/**
 * Remembers the language a visitor picked explicitly, so a later visit without `lang` in the URL
 * opens in that language. Storage can be unavailable (private mode, blocked cookies), so every
 * access is guarded and failures fall back to the default locale.
 */
const KEY = "dimensional-election:locale";

export function loadPreferredLocale() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function savePreferredLocale(locale) {
  try { localStorage.setItem(KEY, locale); } catch { /* not persisted; the URL still carries it */ }
}
