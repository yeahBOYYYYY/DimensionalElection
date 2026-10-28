/** Applies translations to the static page markup and fills the data-coverage line. */
export class StaticContent {
  constructor(root, { db, i18n }) {
    this.root = root;
    this.db = db;
    this.i18n = i18n;
  }

  render() {
    const { db, i18n } = this;
    i18n.apply(this.root);
    document.title = i18n.t("app.title");
    const coverage = this.root.querySelector("[data-coverage]");
    if (coverage) {
      const list = db.elections().map(e => `${i18n.field(e, "name")} (${i18n.date(e.date)})`).join(", ");
      coverage.textContent = i18n.t("method.updated", { elections: list });
    }
  }
}
