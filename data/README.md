# Dataset

The site is a pretty UI over a small relational database. Each table is a UTF-8 CSV file (RFC 4180: quote any field
that contains a comma, quote or newline, and double the quotes inside it).

Human-readable text is stored **once, in English** (the source language). Translations live outside the CSVs, in
`locales/data/<lang>.json` (for Hebrew: `locales/data/he.json`), keyed `<table>.<row id>.<column>`. Composite keys are
joined with `/`. For example:

```json
"parties.likud.name": "הליכוד",
"positions.2026/iran/shas.summary": "…"
```

The easiest way to edit them is the **Data** tab of the translation editor: run `npm start` and open
http://localhost:8080/translate.html#data. The translatable columns of each table are listed under `translate` in
`src/data/schema.js`.

Multi-valued reference columns (`source_ids`) hold ids separated by `|`.

## Tables

| Table | Key | Purpose |
|---|---|---|
| `elections.csv` | `id` | One row per election (`id`, ISO `date`, name). |
| `categories.csv` | `id` | Topic categories, ordered by `sort`. |
| `topics.csv` | `id` | The issues. `left_*` is the label at value **0** and `right_*` the label at **10**. |
| `parties.csv` | `id` | Every party that ever appears, current or historical: colors, `logo` file in `assets/logos/`, `founded` / `ended` years. |
| `election_lists.csv` | `election_id, party_id` | Which parties ran in which election, under what list name, with which leader, components and `seats` won (blank if not known yet). |
| `groups.csv` | `id` | Groupings of parties. `kind` is `bloc` (election-specific alliances) or `family` (editorial political family). |
| `group_members.csv` | `group_id, party_id, election_id` | Membership. A blank `election_id` means the membership applies to every election. |
| `lineage.csv` | `from_party_id, to_party_id` | How parties changed: `kind` is `merged`, `split`, `joint_list` or `renamed`, with a `year`, a note and sources. Used to draw arrows across elections. |
| `sources.csv` | `id` | Citations: outlet, title, `url` (https), date, `language`. |
| `positions.csv` | `election_id, topic_id, party_id` | **The agreement table.** A `value` from 0 to 10, a summary and `source_ids`. A blank `value` means "no clear position / disputed": the party is listed as unplaced, and the summary explains why. |

```
elections ─┬─< election_lists >─┬─ parties ─┬─< group_members >── groups
           │                    │           └─< lineage (from/to)
           └─< positions >──────┘
topics ─────< positions ;  categories ──< topics ;  sources ──< positions / lineage (source_ids)
```

## Rules (enforced by `npm run validate`)

- Keys are unique, and every foreign key points at an existing row.
- `value` is blank or a number between 0 and 10.
- A position's party must have a row in `election_lists` for that election.
- Every position and lineage row cites at least one source, and every source URL uses https.
- Every non-empty translatable cell has a translation in each `locales/data/<lang>.json`, and translations whose row
  no longer exists are flagged as stale. (Ids used in translation keys can't contain `.` or `/`.)
- Party colors are `#rrggbb`, and logo files exist.

## Recipes

**Add a position.** Add the source(s) to `sources.csv`, then add a row to `positions.csv`:
`2026,iran,shas,,"English summary",src_id_1|src_id_2`. A blank value means unplaced. Then add its Hebrew text
(`positions.2026/iran/shas.summary`) in the editor's Data tab. `npm run validate` lists every text that still needs a translation.

**Add a topic.** Add a row to `topics.csv` (pick a `category_id` and a `sort` order), then add positions for it.

**Add a party.** Add it to `parties.csv` (optionally drop a logo in `assets/logos/` and credit it in `CREDITS.csv`),
then add its `election_lists` rows, its `group_members`, and any `lineage` links to older or newer parties.

**Add an election (past or future).** Add a row to `elections.csv`. Add `election_lists` rows for every party that ran,
and `group_members` rows for that election's blocs. Then add its positions. It appears in the filters automatically.
