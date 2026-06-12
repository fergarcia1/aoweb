import { describe, expect, it } from "vitest";
import {
  canNavigateToTile,
  canStartNavigationAtTile,
  isAdjacentToWater,
  isLegacyShoreWaterTile,
  isLegacyWaterGrh,
  isWaterTile,
} from "../../shared/navigation";
import type { GameMap } from "../../shared/mapTypes";
import { TILE } from "../../shared/tileTypes";

const TEST_MAP: GameMap = {
  id: "test_navigation",
  name: "Test Navigation",
  width: 3,
  height: 3,
  tiles: [
    [TILE.GRASS, TILE.WATER, TILE.GRASS],
    [TILE.GRASS, TILE.GRASS, TILE.WALL],
    [TILE.GRASS, TILE.GRASS_BLOCKED, TILE.GRASS],
  ],
};

const LEGACY_WATER_MAP: GameMap = {
  id: "test_legacy_water_navigation",
  name: "Test Legacy Water Navigation",
  width: 3,
  height: 3,
  tiles: [
    [TILE.GRASS, TILE.GRASS, TILE.GRASS],
    [TILE.GRASS, TILE.GRASS, TILE.GRASS],
    [TILE.GRASS, TILE.GRASS, TILE.GRASS],
  ],
  transitions: [],
  legacyCsmData: {
    L1: [
      [0, 0, 0],
      [0, 1513, 0],
      [0, 0, 0],
    ],
    L2: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
    L3: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
    L4: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  },
};

describe("navigation", () => {
  it("detecta agua adyacente para activar barca", () => {
    expect(isAdjacentToWater(TEST_MAP, 1, 1)).toBe(true);
    expect(isAdjacentToWater(TEST_MAP, 2, 2)).toBe(false);
  });

  it("permite navegar solo por agua", () => {
    expect(isWaterTile(TEST_MAP, 1, 0)).toBe(true);
    expect(canNavigateToTile(TEST_MAP, 1, 0)).toBe(true);
    expect(canNavigateToTile(TEST_MAP, 0, 0)).toBe(false);
    expect(canNavigateToTile(TEST_MAP, 2, 1)).toBe(false);
  });

  it("detecta agua legacy por GRH aunque el tile semantico sea grass", () => {
    expect(isLegacyWaterGrh(1513)).toBe(true);
    expect(isWaterTile(LEGACY_WATER_MAP, 1, 1)).toBe(true);
    expect(isLegacyShoreWaterTile(LEGACY_WATER_MAP, 1, 1)).toBe(false);
    expect(isAdjacentToWater(LEGACY_WATER_MAP, 1, 2)).toBe(true);
    expect(canStartNavigationAtTile(LEGACY_WATER_MAP, 1, 2)).toBe(true);
    expect(canNavigateToTile(LEGACY_WATER_MAP, 1, 1)).toBe(true);
  });

  it("detecta orilla legacy cuando el agua toca tierra natural", () => {
    const shoreMap: GameMap = {
      ...LEGACY_WATER_MAP,
      legacyCsmData: {
        ...LEGACY_WATER_MAP.legacyCsmData!,
        L1: [
          [0, 0, 0],
          [0, 1513, 7704],
          [0, 0, 0],
        ],
      },
    };
    expect(isLegacyShoreWaterTile(shoreMap, 1, 1)).toBe(true);
    expect(canStartNavigationAtTile(shoreMap, 1, 1)).toBe(true);
    expect(canStartNavigationAtTile(shoreMap, 2, 1)).toBe(false);
  });
});
