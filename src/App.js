import { Store } from "./core/Store.js";
import { createInitialState } from "./state/initialState.js";
import { createActions } from "./state/actions.js";
import { UrlSync } from "./state/UrlSync.js";
import { StaticContent } from "./ui/components/StaticContent.js";
import { LanguageSwitch } from "./ui/components/LanguageSwitch.js";
import { AxisControls } from "./ui/components/AxisControls.js";
import { TopicPicker } from "./ui/components/TopicPicker.js";
import { FilterPanel } from "./ui/components/FilterPanel.js";
import { ChartPanel } from "./ui/components/ChartPanel.js";
import { PartyDirectory } from "./ui/components/PartyDirectory.js";
import { PartyDrawer } from "./ui/components/PartyDrawer.js";
import { ViewTabs } from "./ui/components/ViewTabs.js";
import { HistoryView } from "./ui/components/HistoryView.js";

/**
 * Composition root: wires the database, i18n, state store and UI components together.
 * Components are mounted on elements marked with data-component="<name>".
 */
const COMPONENTS = {
  "language-switch": LanguageSwitch,
  "view-tabs": ViewTabs,
  "history-view": HistoryView,
  "axis-controls": AxisControls,
  "topic-picker": TopicPicker,
  "filter-panel": FilterPanel,
  "chart-panel": ChartPanel,
  "party-directory": PartyDirectory,
  "party-drawer": PartyDrawer
};

export class App {
  constructor(root, { db, i18n }) {
    this.store = new Store(createInitialState(db, { locale: i18n.locale }));
    const ctx = { db, i18n, actions: createActions(this.store) };

    this.i18n = i18n;
    this.root = root;
    this.staticContent = new StaticContent(root, ctx);
    this.components = Object.entries(COMPONENTS).map(([name, Component]) => {
      const el = root.querySelector(`[data-component="${name}"]`);
      if (!el) throw new Error(`Missing mount point: data-component="${name}"`);
      return new Component(el, ctx);
    });

    new UrlSync(this.store, db, i18n).start();
    this.store.subscribe(state => this.render(state));
  }

  render(state = this.store.state) {
    if (state.locale !== this.i18n.locale) this.i18n.setLocale(state.locale);
    this.root.dataset.view = state.view; // CSS shows the chart layout or the history timeline
    this.staticContent.render(state);
    for (const c of this.components) c.render(state);
  }
}
