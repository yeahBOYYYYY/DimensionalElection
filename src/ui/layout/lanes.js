/**
 * 1D layout: assign each marker to a lane so markers on the same lane never overlap.
 * Lanes alternate around the axis: 0, -1, +1, -2, +2, ...
 *
 * @param {{key: string, x: number}[]} items  marker centers along the axis (px)
 * @param {number} width  marker width (px)
 * @param {number} gap    minimum horizontal gap between markers on a lane (px)
 * @returns {Map<string, number>} key -> lane index
 */
export function assignLanes(items, width, gap = 4) {
  const order = [0];
  for (let i = 1; i <= items.length; i++) order.push(-i, i);

  const lastX = new Map();
  const lanes = new Map();
  for (const it of [...items].sort((a, b) => a.x - b.x || a.key.localeCompare(b.key))) {
    const lane = order.find(l => !lastX.has(l) || it.x - lastX.get(l) >= width + gap);
    lastX.set(lane, it.x);
    lanes.set(it.key, lane);
  }
  return lanes;
}
