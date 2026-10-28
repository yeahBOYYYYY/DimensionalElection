/** Static configuration: where things live. Paths are relative to index.html. */
export const CONFIG = {
  dataUrl: "data",
  localesUrl: "locales",
  locales: ["he", "en"],     // order of the language switch
  defaultLocale: "he",       // used when the visitor hasn't chosen a language
  sourceLocale: "en"         // the language new strings are written in first; fallback for missing ones
};
