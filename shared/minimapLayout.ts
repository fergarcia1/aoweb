/** Escala del minimapa: todo el rectángulo de tiles debe caber en el viewport. */
export function computeMinimapCellSize(
  viewportW: number,
  viewportH: number,
  renderW: number,
  renderH: number
): number {
  if (viewportW <= 0 || viewportH <= 0) return 1;
  const w = Math.max(1, renderW);
  const h = Math.max(1, renderH);
  return Math.max(
    1,
    Math.min(Math.floor(viewportW / w), Math.floor(viewportH / h))
  );
}

export function minimapTileCenterPx(
  tile: number,
  minTile: number,
  cell: number,
  viewportOrigin: number
): number {
  return viewportOrigin + (tile - minTile) * cell + Math.floor(cell / 2);
}
