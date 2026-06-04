export const TILE = {
  GRASS: 0,
  WATER: 1,
  WALL: 2,
  PORTAL: 3,
  FOREST_GRASS: 4,
  TREE: 5,
  GRASS_BLOCKED: 6,
  FOREST_GRASS_BLOCKED: 7,
  SAND: 8,
  SAND_BLOCKED: 9,
  DIRT: 10,
} as const;

export type TileId = (typeof TILE)[keyof typeof TILE];

const WALKABLE_TILE_IDS = new Set<number>([
  TILE.GRASS,
  TILE.PORTAL,
  TILE.FOREST_GRASS,
  TILE.SAND,
  TILE.DIRT,
]);

export function isTileWalkable(tileId: number): boolean {
  return WALKABLE_TILE_IDS.has(tileId);
}
