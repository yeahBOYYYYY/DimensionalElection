# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

No npm dependencies and no transpiling: the browser loads `src/` as plain ES modules. Node ≥ 20.

```bash
npm start                                   # dev server → http://localhost:8080 (PORT=… to change)
npm test                                    # node:test, all tests/*.test.mjs
node --test tests/i18n.test.mjs             # one file
node --test --test-name-pattern="plural" tests/*.test.mjs   # one test by name
npm run validate                            # dataset + translation integrity (run before committing data/locale changes)
npm run build                               # copy the deployable files into dist/ (gitignored)
```

The page loads data with `fetch`, so it must be served over HTTP (opening `index.html` from disk fails).
The translation editor is at http://localhost:8080/translate.html. Its saves go through a localhost-only `PUT /locales/…` endpoint in `scripts/serve.mjs`.

CI (`.github/workflows/ci.yml`) runs `npm test` + `npm run validate` on every push and PR. On `main` it builds and force-pushes `dist/` to the `gh-pages` branch.

## Architecture

**Data flow.** `main.js` loads the CSV tables, the UI catalogs and the data catalogs, then builds `Database` + `I18n` and starts `App`. `App` creates a `Store` (frozen state, shallow `set`) and one component per `[data-component="…"]` mount point in `index.html`. On every state change it calls `render(state)` on all components. Components never mutate state; they call functions from `state/actions.js`. `UrlSync` mirrors view state into the URL hash, so every view is a shareable link. Transient state (`query`, `slot`, `focus`) isn't serialized.

**Pure vs DOM.** Code under `src/data/`, `src/state/selectors.js`, `src/i18n/catalog.js` and `src/ui/layout/` is DOM-free and unit-tested in Node. Keep new logic there when possible, with components only rendering. `core/dom.js` `h()` is the element factory: no innerHTML, and CSS custom properties in `style` objects go through `setProperty`.

**Dataset (`data/*.csv`).** A small relational database: `src/data/schema.js` defines each table's key, foreign keys and `translate` columns, and `src/data/validate.js` enforces them. `data/README.md` has the schema and recipes for adding parties, topics, positions and elections. Placements must cite sources. A blank `value` means "no clear position", not 0. Ids in tables with translatable columns must not contain `.` or `/`.

**Entries.** The unit that is plotted and filtered is an *entry*: one party in one election, keyed `"<electionId>.<partyId>"` (`entryKey` in selectors). The same party in two elections is two independent entries (hidden separately via `state.hiddenEntries`, each with its own year tag on its marker). Only the party drawer combines them.

**i18n: two separate systems.**
- UI strings: `locales/<lang>.json` (`{meta, strings}`), read with `i18n.t(key, vars)`. Plurals use i18next-style suffixes chosen by `Intl.PluralRules` from `count` (Hebrew has `_two`; only `_other` is required). Use placeholders, not concatenation; `i18n.tParts()` fills a placeholder with a DOM node. Static markup uses `data-i18n` / `data-i18n-attr`. `?i18n=keys` shows keys instead of text.
- Data text: stored once in English in the CSV; other languages live in `locales/data/<lang>.json`, keyed `<table>.<rowKey>.<column>` (e.g. `positions.2026/iran/shas.summary`). Use `i18n.field(record, column)`. Records get their `i18nKey` prefix from `Database`. Never add `_en`/`_he` columns.
- `CONFIG` in `src/config.js`: `defaultLocale` is `he` (the site opens in Hebrew, RTL), and `sourceLocale` is `en` (the fallback language and the language of the CSV text). Locale resolution order: `#lang=` → saved choice (localStorage) → default.
- Catalog files are written in a canonical format by `serializeCatalog` (used by the dev server). Adding a key means adding it to every `locales/*.json`; `npm run validate` fails on missing keys or placeholder mismatches.

**RTL.** Layout uses CSS logical properties. Charts compute physical x positions themselves and mirror them via `fraction(value, rtl)`. The history graph mirrors its lane x positions too.

**History timeline.** `ui/layout/historyGraph.js` turns parties, election lists and `lineage.csv` into git-style rows, lanes and edges (pure, tested). `HistoryView` renders the rows as HTML and draws the SVG graph over the gutter column *after* layout, measuring row offsets and redrawing on resize.

**Topic ordering.** `sortedCategories` ranks categories by the share of their placed positions that come from the latest election. `sortedTopics` ranks topics within a category by placed count for the selected elections.
