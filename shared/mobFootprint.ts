/** Tiles ocupados por un mob según su hitbox (misma lógica que el cliente). */
export function getMobFootprintTiles(
  anchorTileX: number,
  anchorTileY: number,
  hitboxWidthTiles: number,
  hitboxHeightTiles: number
): { x: number; y: number }[] {
  const height = Math.max(1, hitboxHeightTiles);
  const width = Math.max(1, hitboxWidthTiles);
  const halfWidth = Math.floor((width - 1) / 2);
  const tiles: { x: number; y: number }[] = [];

  for (let dy = -(height - 1); dy <= 0; dy += 1) {
    for (let dx = -halfWidth; dx <= halfWidth; dx += 1) {
      tiles.push({ x: anchorTileX + dx, y: anchorTileY + dy });
    }
  }

  return tiles;
}

export function mobFootprintOccupiesTile(
  tileX: number,
  tileY: number,
  anchorTileX: number,
  anchorTileY: number,
  hitboxWidthTiles: number,
  hitboxHeightTiles: number
): boolean {
  return getMobFootprintTiles(
    anchorTileX,
    anchorTileY,
    hitboxWidthTiles,
    hitboxHeightTiles
  ).some((tile) => tile.x === tileX && tile.y === tileY);
}
