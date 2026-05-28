import { describe, expect, it } from "vitest";
import {
  AOI_RADIUS_TILES,
  ATTRIBUTE_POTION_BUFF_DURATION_MS,
  ATTRIBUTE_POTION_BUFF_MAX,
  STAT_MAX,
  STAT_MIN,
  STEP_DURATION_MS,
  TILE_SIZE,
} from "../../game-data/constants";

describe("game-data/constants", () => {
  it("tile and step timing are positive", () => {
    expect(TILE_SIZE).toBe(32);
    expect(STEP_DURATION_MS).toBeGreaterThan(0);
  });

  it("attribute potion ceiling is natural max + buff cap", () => {
    expect(STAT_MIN).toBeLessThan(STAT_MAX);
    expect(STAT_MAX + ATTRIBUTE_POTION_BUFF_MAX).toBe(40);
    expect(ATTRIBUTE_POTION_BUFF_DURATION_MS).toBe(90_000);
  });

  it("AOI radius is reasonable for pueblo map", () => {
    expect(AOI_RADIUS_TILES).toBeGreaterThanOrEqual(16);
    expect(AOI_RADIUS_TILES).toBeLessThanOrEqual(48);
  });
});
