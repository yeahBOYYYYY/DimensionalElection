/** Tiny observable state container: one source of truth, shallow updates, change notifications. */
export class Store {
  #state;
  #listeners = new Set();

  constructor(initialState) {
    this.#state = Object.freeze({ ...initialState });
  }

  get state() {
    return this.#state;
  }

  /** Merge a partial state (or a function of the current state) and notify subscribers. */
  set(patch) {
    const next = typeof patch === "function" ? patch(this.#state) : patch;
    const changed = Object.keys(next).filter(k => !Object.is(next[k], this.#state[k]));
    if (!changed.length) return;
    const prev = this.#state;
    this.#state = Object.freeze({ ...prev, ...next });
    for (const fn of this.#listeners) fn(this.#state, prev, changed);
  }

  /** Subscribe to changes. Returns an unsubscribe function. */
  subscribe(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }
}
