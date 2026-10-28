/**
 * Pure queries that combine the database with UI state.
 * An "entry" is one party in one election: the unit that gets plotted and filtered. The same party
 * in two elections is two independent entries (only the party drawer brings them together).
 */

/** "2026.likud": identifies an entry in state, the URL and the chart. */
export function entryKey(electionId, partyId) {
  return `${electionId}.${partyId}`;
}

/** Inverse of entryKey: { electionId, partyId }. Party ids never contain "." (enforced by the validator). */
export function parseEntryKey(key) {
  const dot = key.indexOf(".");
  return { electionId: key.slice(0, dot), partyId: key.slice(dot + 1) };
}

/** Does an entry pass the group + party filters? */
export function passesFilters(db, state, partyId, electionId) {
  if (state.hiddenEntries.includes(entryKey(electionId, partyId))) return false;
  if (!state.groups.length) return true;
  return state.groups.some(g => db.isMember(g, partyId, electionId));
}

/** All visible entries (party × selected election), oldest election first. */
export function visibleEntries(db, state) {
  const entries = [];
  for (const election of db.elections()) {
    if (!state.elections.includes(election.id)) continue;
    for (const partyId of db.partiesIn(election.id)) {
      if (!passesFilters(db, state, partyId, election.id)) continue;
      entries.push({ key: entryKey(election.id, partyId), electionId: election.id, party: db.party(partyId) });
    }
  }
  return entries;
}

/**
 * Split entries into placed / unplaced for the given topic ids.
 * Placed entries carry `values[topicId]`; unplaced ones carry `reason`: "unclear" | "none".
 */
export function placeEntries(db, entries, topicIds) {
  const placed = [];
  const unplaced = [];
  for (const entry of entries) {
    const positions = topicIds.map(t => db.position(entry.electionId, t, entry.party.id));
    if (positions.every(p => p && p.value !== null)) {
      placed.push({ ...entry, values: Object.fromEntries(topicIds.map((t, i) => [t, positions[i].value])) });
    } else {
      const unclear = positions.some(p => p && p.value === null);
      unplaced.push({ ...entry, reason: unclear ? "unclear" : "none" });
    }
  }
  return { placed, unplaced };
}

/** Selected election ids in chronological order. */
export function selectedElections(db, state) {
  return db.elections().map(e => e.id).filter(id => state.elections.includes(id));
}

/**
 * How current a category is: the share of its placed positions that come from the latest election.
 * Issues that only entered the parties' platforms recently (e.g. Iran) score 1; issues mostly
 * documented in older elections score lower. Independent of the UI filters.
 */
export function categoryRelevance(db, categoryId) {
  const latest = db.latestElection().id;
  const topics = db.topicsInCategory(categoryId).map(t => t.id);
  const count = elections => topics.reduce((n, t) => n + db.placedCount(t, elections), 0);
  const all = count(db.elections().map(e => e.id));
  return { share: all ? count([latest]) / all : 0, latest: count([latest]) };
}

/** Categories, most current first (ties: more data in the latest election, then the dataset's order). */
export function sortedCategories(db) {
  const score = new Map(db.categories().map(c => [c.id, categoryRelevance(db, c.id)]));
  return [...db.categories()].sort((a, b) =>
    score.get(b.id).share - score.get(a.id).share || score.get(b.id).latest - score.get(a.id).latest || a.sort - b.sort);
}

/** A category's topics, most data first for the selected elections (ties: all elections, then the dataset's order). */
export function sortedTopics(db, categoryId, electionIds) {
  const allIds = db.elections().map(e => e.id);
  return [...db.topicsInCategory(categoryId)].sort((a, b) =>
    db.placedCount(b.id, electionIds) - db.placedCount(a.id, electionIds) ||
    db.placedCount(b.id, allIds) - db.placedCount(a.id, allIds) ||
    a.sort - b.sort);
}
