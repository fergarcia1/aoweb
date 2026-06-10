import type { GameMap } from "./mapTypes";
import { resolveMapTile, type MapTileOverrides } from "./mapTileOverrides";
import { TILE } from "./tileTypes";

export const BOAT_ITEM_IDS = new Set<string>(["barca"]);

const CARDINAL_OFFSETS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

const LEGACY_WATER_GRH_MIN = 1505;
const LEGACY_WATER_GRH_MAX = 1520;
const LEGACY_DOCK_GRH_MIN = 8994;
const LEGACY_DOCK_GRH_MAX = 8997;

export function isLegacyWaterGrh(grhId: number): boolean {
  return grhId >= LEGACY_WATER_GRH_MIN && grhId <= LEGACY_WATER_GRH_MAX;
}

function isLegacyDockGrh(grhId: number): boolean {
  return grhId >= LEGACY_DOCK_GRH_MIN && grhId <= LEGACY_DOCK_GRH_MAX;
}

function getLegacyGroundGrh(map: GameMap, tileX: number, tileY: number): number {
  return map.legacyCsmData?.L1[tileY]?.[tileX] ?? 0;
}

export function isLegacyWaterTile(map: GameMap, tileX: number, tileY: number): boolean {
  return isLegacyWaterGrh(getLegacyGroundGrh(map, tileX, tileY));
}

export function isLegacyShoreWaterTile(map: GameMap, tileX: number, tileY: number): boolean {
  if (!isLegacyWaterTile(map, tileX, tileY)) {
    return false;
  }
  return CARDINAL_OFFSETS.some(([dx, dy]) => {
    const neighborGrh = getLegacyGroundGrh(map, tileX + dx, tileY + dy);
    return neighborGrh > 0 && !isLegacyWaterGrh(neighborGrh) && !isLegacyDockGrh(neighborGrh);
  });
}

export function isWaterTile(
  map: GameMap,
  tileX: number,
  tileY: number,
  overrides?: MapTileOverrides
): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) {
    return false;
  }
  if (resolveMapTile(map.tiles, tileX, tileY, overrides) === TILE.WATER) {
    return true;
  }
  return isLegacyWaterTile(map, tileX, tileY);
}

export function isAdjacentToWater(
  map: GameMap,
  tileX: number,
  tileY: number,
  overrides?: MapTileOverrides
): boolean {
  return CARDINAL_OFFSETS.some(([dx, dy]) =>
    isWaterTile(map, tileX + dx, tileY + dy, overrides)
  );
}

function isNavigableWaterForBoarding(
  map: GameMap,
  tileX: number,
  tileY: number,
  overrides?: MapTileOverrides
): boolean {
  if (!isWaterTile(map, tileX, tileY, overrides)) {
    return false;
  }
  return !isLegacyShoreWaterTile(map, tileX, tileY);
}

function isAdjacentToNavigableWaterForBoarding(
  map: GameMap,
  tileX: number,
  tileY: number,
  overrides?: MapTileOverrides
): boolean {
  return CARDINAL_OFFSETS.some(([dx, dy]) =>
    isNavigableWaterForBoarding(map, tileX + dx, tileY + dy, overrides)
  );
}

export function canStartNavigationAtTile(
  map: GameMap,
  tileX: number,
  tileY: number,
  overrides?: MapTileOverrides
): boolean {
  return (
    isAdjacentToNavigableWaterForBoarding(map, tileX, tileY, overrides) ||
    isLegacyShoreWaterTile(map, tileX, tileY)
  );
}

export function canNavigateToTile(
  map: GameMap,
  tileX: number,
  tileY: number,
  overrides?: MapTileOverrides
): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) {
    return false;
  }
  return isWaterTile(map, tileX, tileY, overrides);
}
