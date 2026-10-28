/**
 * Two-way sync between the store and the URL hash, so every view is shareable.
 * Only "view" state is serialized; transient UI state (search text, active slot) is not.
 */
import { parseEntryKey } from "./selectors.js";

const list = s => (s ? s.split(",").filter(Boolean) : []);

export class UrlSync {
  constructor(store, db, i18n) {
    this.store = store;
    this.db = db;
    this.i18n = i18n;
  }

  /** Read the current hash into a state patch (invalid values are ignored). */
  read() {
    const p = new URLSearchParams(location.hash.replace(/^#\/?/, ""));
    const patch = {};
    const topic = id => (this.db.topic(id) ? id : null);

    if (this.i18n.supports(p.get("lang"))) patch.locale = p.get("lang");
    patch.view = p.get("view") === "history" ? "history" : "chart";
    if (["1d", "2d"].includes(p.get("mode"))) patch.mode = p.get("mode");
    if (topic(p.get("x"))) patch.x = p.get("x");
    if (topic(p.get("y"))) patch.y = p.get("y");
    const elections = list(p.get("e")).filter(id => this.db.election(id));
    if (elections.length) patch.elections = elections;
    if (p.has("g")) patch.groups = list(p.get("g")).filter(id => this.db.group(id));
    if (p.has("hide")) patch.hiddenEntries = list(p.get("hide")).filter(key => {
      const { electionId, partyId } = parseEntryKey(key);
      return Boolean(this.db.list(electionId, partyId));
    });
    if (this.db.party(p.get("party"))) patch.partyId = p.get("party");
    return patch;
  }

  /** Write the current state to the hash without adding history entries. */
  write(state) {
    const p = new URLSearchParams();
    p.set("lang", state.locale);
    if (state.view === "history") p.set("view", "history");
    p.set("mode", state.mode);
    p.set("x", state.x);
    if (state.mode === "2d") p.set("y", state.y);
    p.set("e", state.elections.join(","));
    if (state.groups.length) p.set("g", state.groups.join(","));
    if (state.hiddenEntries.length) p.set("hide", state.hiddenEntries.join(","));
    if (state.partyId) p.set("party", state.partyId);
    const hash = "#" + p.toString();
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }

  /** Start syncing: apply the hash now, then keep both sides in step. */
  start() {
    this.store.set(this.read());
    this.store.subscribe(state => this.write(state));
    window.addEventListener("hashchange", () => this.store.set(this.read()));
    this.write(this.store.state);
  }
}
