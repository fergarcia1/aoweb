import type { GameMap } from "./types";

export const MINIMAP_LEGACY_SNOW_COLOR = 0xf0f4f7;
export const MINIMAP_LEGACY_CRYSTAL_DUNGEON_COLOR = 0x263846;

const LEGACY_SNOW_GRH_RANGES: Array<[number, number]> = [
  [7428, 7443],
  [13064, 13127],
  [13192, 13287],
  [13544, 13559],
];

const LEGACY_CRYSTAL_DUNGEON_GRH_RANGES: Array<[number, number]> = [
  [4929, 5195],
];

export function isLegacySnowGroundTile(map: GameMap, tileX: number, tileY: number): boolean {
  const l1 = map.legacyCsmData?.L1[tileY]?.[tileX] ?? 0;
  return LEGACY_SNOW_GRH_RANGES.some(([min, max]) => l1 >= min && l1 <= max);
}

export function isLegacyCrystalDungeonGroundTile(map: GameMap, tileX: number, tileY: number): boolean {
  if (!map.name.toLowerCase().includes("cristal")) {
    return false;
  }
  const l1 = map.legacyCsmData?.L1[tileY]?.[tileX] ?? 0;
  return LEGACY_CRYSTAL_DUNGEON_GRH_RANGES.some(([min, max]) => l1 >= min && l1 <= max);
}
