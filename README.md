# Dimensional Election

**Where do Israel's parties stand?** An interactive, bilingual (English / עברית) static site that places every party
on a 0–10 line for a chosen issue, or on a 2D plane for two issues at once, across several Knesset elections.
Click any party to see its stance **and the sources behind it**.

- **24 topics** in 7 categories: security, Palestinians & territory, governance, religion & state, military service, economy & society, coalition politics
- **2 elections** (2022, 2026) and **20 parties**, including ones that no longer exist (Meretz, Labor, National Unity, Jewish Home…)
- **Party history**: a git-style timeline of every party (its own tab): one colored line per party, joining and branching at mergers, splits and joint lists
- **Entries per election**: a party in each election is its own entry, tagged with the year on the chart (e.g. Likud ’22 and Likud ’26), filtered separately
- **Topics ordered by relevance**: categories whose data is most current (share from the latest election) come first; within a category, the topics with the most placed parties
- **Filters**: by election (latest by default), bloc (per election), political family, or individual list, grouped by election
- Every placement cites at least one source; a party with no clear stated position is listed separately instead of guessed

## Running locally

The site loads its data with `fetch`, so it needs to be served over HTTP. Opening `index.html` from disk won't work.

```bash
npm start              # zero-dependency static server → http://localhost:8080
npm test               # unit tests (node:test)
npm run validate       # integrity check of the CSV dataset and the translations
```

Translations: with `npm start` running, open http://localhost:8080/translate.html (see [Translations](#translations)).

You need Node.js 20 or newer. There are no npm dependencies and no build step. Any static host (GitHub Pages, Netlify…) can serve the folder as is.

## Project layout

```
index.html                 Page shell: static markup + one mount point per component
translate.html             Translation editor (UI strings + data text, side by side)
data/                      THE DATABASE — plain CSV tables, English text (see data/README.md)
locales/                   TRANSLATIONS — no code here
  {he,en}.json               UI strings
  data/he.json               Hebrew text for the data, keyed <table>.<row id>.<column>
assets/logos/              Party logos + CREDITS.csv (source & license per file)
src/
  main.js                  Bootstrap: load data + locales, start the App
  App.js                   Composition root: wires db, i18n, store and components
  config.js                Paths and defaults
  core/                    Generic utilities, no app knowledge
    csv.js                   RFC 4180 CSV parser
    Store.js                 Observable state container
    dom.js                   Element/SVG factories
    color.js                 Contrast & shading helpers
  data/                    Data access layer
    schema.js                Table definitions (columns, keys, foreign keys)
    CsvSource.js             Loads tables over HTTP
    Database.js              Typed, indexed, read-only queries over the tables
    validate.js              Pure integrity checks (used by tests + CLI)
  i18n/
    I18n.js                  t() with plurals & fallback, localized data fields, RTL
    catalog.js               Catalog checks (missing keys, placeholders) + canonical file format
    localePreference.js      Remembers the visitor's explicit language choice
    editor/                  The translation editor behind translate.html
  state/                   Application state
    initialState.js          Defaults derived from the data
    actions.js               All allowed state transitions
    selectors.js             Pure queries combining db + state (entries, filters, trails)
    UrlSync.js               State ⇄ URL hash (every view is shareable)
  ui/
    components/              One class per UI region; each has render(state) (incl. ViewTabs, HistoryView)
    charts/                  Chart1D (one line), Chart2D (one plane), geometry
    layout/                  Pure layout algorithms (lane stacking, collision relaxation, history graph)
    widgets/                 Reusable pieces: PartyBadge, MarkerLayer, Overlay, SourceList…
  styles/                  CSS split by concern (tokens, layout, controls, chart, drawer…)
scripts/
  serve.mjs                Dev server
  validate-data.mjs        Dataset validator CLI
tests/                     node:test suites for parser, database, selectors, layout and dataset
```

### Design principles

- **Data and code are separate.** All content lives in `data/*.csv`. The code never hard-codes a party, topic or claim.
- **Single responsibility.** Parsing, storage, querying, state transitions, URL sync, layout math and rendering each live in their own module.
- **One-way data flow.** Components read state and call `actions`. The `Store` notifies `App`, which re-renders the components.
- **Pure where possible.** CSV parsing, validation, selectors and layout algorithms are DOM-free and unit-tested in Node.
- **Bilingual by construction.** Text is written once in English. Every other language is a catalog in `locales/`, and the validator rejects a missing translation. Layout uses CSS logical properties, and the charts mirror their value axis in RTL.

## Translations

The site opens in **Hebrew** unless the visitor chose otherwise. The order is: `#lang=` in the link, then the language
they last picked with the switch (saved in the browser), then Hebrew (`defaultLocale` in `src/config.js`).

The setup follows the common production pattern (i18next / FormatJS style): code refers to **keys**, and the text lives
in per-language **message catalogs** that translators can edit without touching code.

| What | Where | Key example |
|---|---|---|
| UI strings | `locales/he.json`, `locales/en.json` | `filters.reset` |
| Data text (parties, topics, positions…) | English in `data/*.csv`, Hebrew in `locales/data/he.json` | `parties.likud.name` |

**To change a phrase:** run `npm start`, open http://localhost:8080/translate.html, find the phrase, edit it, and press
<kbd>Ctrl</kbd>+<kbd>S</kbd>. The file in `locales/` is updated. To find which key a phrase on the site uses, open
http://localhost:8080/?i18n=keys, which shows keys instead of text. You can also edit the JSON files directly.
`npm run validate` (and `npm test`) fail if a translation is missing or uses a `{placeholder}` the English text doesn't have.

Message conventions:
- **Placeholders, never concatenation:** `"Ran in {years}"`, not `t("legend.ran") + " " + years`, so each language can
  reorder words.
- **Plurals:** pass `count` and define CLDR forms with i18next-style suffixes. Hebrew has a dual form:
  `"topics.count_one"`, `"topics.count_two"`, `"topics.count_other"`. Only `_other` is required.
- **Fallback:** a missing string falls back to English, then to the key, and logs a console warning.

**Adding a language** (e.g. Arabic): add `locales/ar.json` (with `"dir": "rtl"`) and `locales/data/ar.json`, then add
`"ar"` to `locales` in `src/config.js`. The switch, the editor and the validator pick it up automatically.

## Contributing data

See [`data/README.md`](data/README.md) for the schema and step-by-step recipes for adding a party, a topic, a position or a whole election.
Always run `npm run validate` before committing.

## Disclaimer

Placements are editorial summaries of the cited reporting. They are not scores the parties supplied themselves. Check the sources before relying on a placement.
Party logos are trademarks of their respective parties and are used for identification only; see `assets/logos/CREDITS.csv`.
