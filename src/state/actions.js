/**
 * Every state transition the UI can request. Components call these instead of
 * mutating state themselves, which keeps the rules in one place.
 */
export function createActions(store) {
  const toggle = (arr, id) => (arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

  return {
    setLocale: locale => store.set({ locale }),
    setView: view => store.set({ view }),

    setMode: mode => store.set({ mode, slot: mode === "2d" ? "y" : "x" }),
    setSlot: slot => store.set({ slot }),
    swapAxes: () => store.set(s => ({ x: s.y, y: s.x })),
    setQuery: query => store.set({ query }),

    /** Put a topic on the active axis. In 2D, picking the other axis's topic swaps them. */
    pickTopic: id => store.set(s => {
      if (s.mode === "1d") return { x: id };
      const other = s.slot === "x" ? "y" : "x";
      const patch = { [s.slot]: id, slot: other };
      if (s[other] === id) patch[other] = s[s.slot];
      return patch;
    }),

    /** Plot a topic on X (used from the party drawer). */
    plotTopic: id => store.set(s => ({ x: id, y: s.y === id ? s.x : s.y, partyId: null })),

    toggleElection: id => store.set(s => {
      const next = toggle(s.elections, id);
      return next.length ? { elections: next } : {};
    }),
    toggleGroup: id => store.set(s => ({ groups: toggle(s.groups, id) })),
    /** Entries are "<election>.<party>" keys: the same party in another election is filtered separately. */
    toggleEntry: key => store.set(s => ({ hiddenEntries: toggle(s.hiddenEntries, key) })),
    showEntries: keys => store.set(s => ({ hiddenEntries: s.hiddenEntries.filter(k => !keys.includes(k)) })),
    hideEntries: keys => store.set(s => ({ hiddenEntries: [...new Set([...s.hiddenEntries, ...keys])] })),
    resetFilters: () => store.set({ groups: [], hiddenEntries: [] }),

    openParty: partyId => store.set({ partyId }),
    closeParty: () => store.set({ partyId: null }),

    /** Highlight a party on the history timeline (and open its drawer when `open`). */
    focusParty: (partyId, { open = false } = {}) => store.set({ view: "history", focus: partyId, partyId: open ? partyId : null }),
    clearFocus: () => store.set({ focus: null })
  };
}
