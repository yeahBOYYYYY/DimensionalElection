import { rowKey } from "./schema.js";

/**
 * In-memory, read-only relational model over the dataset tables.
 * Converts raw CSV strings into typed records once, indexes them, and answers queries.
 * It knows nothing about the UI.
 */

const splitIds = s => (s ? s.split("|").map(x => x.trim()).filter(Boolean) : []);
const toNumberOrNull = s => (s === "" || s === undefined || s === null ? null : Number(s));
const pairKey = (...parts) => parts.join("\u0000");
/** Copy a row and tag it with its translation key prefix (see I18n.field). */
const record = (table, r, extra = {}) => ({ ...r, i18nKey: rowKey(table, r), ...extra });

export class Database {
  #elections; #categories; #topics; #parties; #groups; #sources;
  #lists = new Map();        // election|party -> list record
  #positions = new Map();    // election|topic|party -> position record
  #members = new Map();      // group -> [{ partyId, electionId|null }]
  #lineage;

  constructor(tables) {
    this.#elections = indexById(tables.elections.map(r => record("elections", r)).sort((a, b) => a.date.localeCompare(b.date)));
    this.#categories = indexById(tables.categories.map(r => record("categories", r, { sort: Number(r.sort) })).sort((a, b) => a.sort - b.sort));
    this.#topics = indexById(tables.topics.map(r => record("topics", r, { sort: Number(r.sort) })).sort((a, b) => a.sort - b.sort));
    this.#parties = indexById(tables.parties.map(r => record("parties", r)));
    this.#groups = indexById(tables.groups.map(r => record("groups", r)));
    this.#sources = indexById(tables.sources.map(r => ({ ...r })));

    for (const r of tables.election_lists) {
      this.#lists.set(pairKey(r.election_id, r.party_id), record("election_lists", r, { seats: toNumberOrNull(r.seats) }));
    }
    for (const r of tables.positions) {
      this.#positions.set(pairKey(r.election_id, r.topic_id, r.party_id), {
        electionId: r.election_id,
        topicId: r.topic_id,
        partyId: r.party_id,
        value: toNumberOrNull(r.value),
        summary: r.summary,
        sourceIds: splitIds(r.source_ids),
        i18nKey: rowKey("positions", r)
      });
    }
    for (const r of tables.group_members) {
      if (!this.#members.has(r.group_id)) this.#members.set(r.group_id, []);
      this.#members.get(r.group_id).push({ partyId: r.party_id, electionId: r.election_id || null });
    }
    this.#lineage = tables.lineage.map(r => record("lineage", r, { year: Number(r.year), sourceIds: splitIds(r.source_ids) }));
  }

  /* ── Elections ── */
  elections() { return [...this.#elections.values()]; }
  election(id) { return this.#elections.get(id); }
  latestElection() { return this.elections().at(-1); }

  /* ── Topics ── */
  categories() { return [...this.#categories.values()]; }
  category(id) { return this.#categories.get(id); }
  topics() { return [...this.#topics.values()]; }
  topic(id) { return this.#topics.get(id); }
  topicsInCategory(categoryId) { return this.topics().filter(t => t.category_id === categoryId); }

  /* ── Parties & lists ── */
  parties() { return [...this.#parties.values()]; }
  party(id) { return this.#parties.get(id); }

  /** The ballot list a party ran in a given election, or undefined if it didn't run. */
  list(electionId, partyId) { return this.#lists.get(pairKey(electionId, partyId)); }

  /** Party ids that ran in an election. */
  partiesIn(electionId) {
    return this.parties().filter(p => this.#lists.has(pairKey(electionId, p.id))).map(p => p.id);
  }

  /** Elections in which a party ran, oldest first. */
  electionsOf(partyId) {
    return this.elections().filter(e => this.#lists.has(pairKey(e.id, partyId)));
  }

  /* ── Groups (blocs & political families) ── */
  groups(kind) { return [...this.#groups.values()].filter(g => !kind || g.kind === kind); }
  group(id) { return this.#groups.get(id); }
  groupKinds() { return [...new Set([...this.#groups.values()].map(g => g.kind))]; }

  /** Is the party in the group for that election? Members with no election apply to every election. */
  isMember(groupId, partyId, electionId) {
    return (this.#members.get(groupId) || []).some(m => m.partyId === partyId && (m.electionId === null || m.electionId === electionId));
  }

  /** Groups the party belongs to in that election. */
  groupsOf(partyId, electionId, kind) {
    return this.groups(kind).filter(g => this.isMember(g.id, partyId, electionId));
  }

  /* ── Positions ── */
  /** A party's position on a topic in an election (value null = unclear), or undefined if none recorded. */
  position(electionId, topicId, partyId) {
    return this.#positions.get(pairKey(electionId, topicId, partyId));
  }

  /** Number of placed (non-null) positions for a topic in the given elections. */
  placedCount(topicId, electionIds) {
    let n = 0;
    for (const e of electionIds) for (const p of this.partiesIn(e)) {
      const pos = this.position(e, topicId, p);
      if (pos && pos.value !== null) n++;
    }
    return n;
  }

  /* ── Sources ── */
  source(id) { return this.#sources.get(id); }
  sources() { return [...this.#sources.values()]; }

  /* ── Lineage ── */
  lineage() { return this.#lineage; }
  successorsOf(partyId) { return this.#lineage.filter(l => l.from_party_id === partyId); }
  predecessorsOf(partyId) { return this.#lineage.filter(l => l.to_party_id === partyId); }
}

function indexById(rows) {
  return new Map(rows.map(r => [r.id, r]));
}
