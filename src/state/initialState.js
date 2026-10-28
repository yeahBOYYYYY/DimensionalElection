/** Builds the default UI state from the loaded database. */
export function createInitialState(db, { locale = "he" } = {}) {
  const topics = db.topics();
  return {
    locale,
    view: "chart",           // "chart" | "history"
    mode: "1d",              // "1d" | "2d"
    x: topics[0].id,         // topic on the horizontal axis
    y: topics.find(t => t.id === "haredi-draft")?.id ?? topics[1].id,
    slot: "x",               // which axis the topic picker fills in 2D mode
    query: "",               // topic search text
    elections: [db.latestElection().id],
    groups: [],              // selected group ids (empty = no group filter)
    hiddenEntries: [],       // entry keys ("2026.likud") switched off in the filter
    partyId: null,           // party shown in the drawer
    focus: null              // party highlighted on the history timeline
  };
}
