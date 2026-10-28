/**
 * Lays out the parties' history as a git-style graph. Pure: no DOM.
 *
 * Rows are events in chronological order (index 0 = oldest; the view draws them newest on top):
 * a party founded, a lineage link (merger, split, joint list, rename), an election, a party ending,
 * and a final "now" row. Each party is a line in one lane (column) from its first row to its last.
 *
 * - A party whose founding *is* a lineage event (The Democrats, Yashar!) starts at that event,
 *   without a separate "founded" row; likewise a party that ends through a lineage event has no
 *   separate "ended" row.
 * - A party formed by a merger continues the lane of the party merged into it at that same event,
 *   so the line reads like a git branch that kept going under a new name.
 * - Lanes are reused once their previous party's line has ended.
 *
 * @returns {{
 *   rows: {type: "founded"|"lineage"|"election"|"ended"|"now", year: number|null, partyId?: string,
 *          fromId?: string, link?: object, election?: object, partyIds?: string[]}[],
 *   spans: Map<string, {lane: number, start: number, end: number, open: boolean}>,
 *   edges: {row: number, fromId: string, toId: string, kind: string, continues: boolean}[],
 *   laneCount: number
 * }}
 */
export function buildHistory(db) {
  const lineage = db.lineage();
  const year = v => Number(v);
  const ORDER = { founded: 0, lineage: 1, election: 2, ended: 3 };

  const events = [];
  for (const p of db.parties()) {
    const bornFromLink = lineage.some(l => l.to_party_id === p.id && l.year === year(p.founded));
    if (!bornFromLink) events.push({ type: "founded", year: year(p.founded), partyId: p.id });
    const endsInLink = p.ended && lineage.some(l => l.from_party_id === p.id && l.year === year(p.ended));
    if (p.ended && !endsInLink) events.push({ type: "ended", year: year(p.ended), partyId: p.id });
  }
  for (const l of lineage) events.push({ type: "lineage", year: l.year, partyId: l.to_party_id, fromId: l.from_party_id, link: l });
  for (const e of db.elections()) events.push({ type: "election", year: year(e.date.slice(0, 4)), election: e, partyIds: db.partiesIn(e.id) });
  // Stable sort keeps the dataset's order for events of the same kind in the same year.
  const rows = events.sort((a, b) => a.year - b.year || ORDER[a.type] - ORDER[b.type]);

  // First and last row of every party's line.
  const spans = new Map();
  const touch = (id, i) => {
    const s = spans.get(id);
    if (!s) spans.set(id, { start: i, end: i });
    else s.end = i;
  };
  rows.forEach((r, i) => {
    if (r.type === "election") r.partyIds.forEach(id => touch(id, i));
    else touch(r.partyId, i);
    if (r.type === "lineage") touch(r.fromId, i);
  });
  // Parties still active run up to the "now" row.
  const active = db.parties().filter(p => !p.ended).map(p => p.id);
  const nowRow = rows.length;
  rows.push({ type: "now", year: null, partyIds: active });
  for (const id of active) Object.assign(spans.get(id), { end: nowRow, open: true });

  // Lanes: process parties by first row; inherit a merged-in predecessor's lane, else the lowest free lane.
  const laneEnd = [];   // lane index -> last row used
  const order = [...spans.entries()].sort((a, b) => a[1].start - b[1].start);
  for (const [id, span] of order) {
    const heir = rows[span.start].type === "lineage" && rows[span.start].partyId === id ? spans.get(rows[span.start].fromId) : null;
    let lane = heir && heir.end === span.start && heir.lane !== undefined && laneEnd[heir.lane] === span.start ? heir.lane : -1;
    if (lane === -1) lane = laneEnd.findIndex(end => end < span.start);
    if (lane === -1) lane = laneEnd.length;
    span.lane = lane;
    span.open = Boolean(span.open);
    laneEnd[lane] = span.end;
  }

  const edges = rows.flatMap((r, i) => r.type !== "lineage" ? [] : [{
    row: i, fromId: r.fromId, toId: r.partyId, kind: r.link.kind,
    // Same lane: the line simply carries on under the new party; no curve to draw.
    continues: spans.get(r.fromId).lane === spans.get(r.partyId).lane
  }]);

  return { rows, spans, edges, laneCount: laneEnd.length };
}
