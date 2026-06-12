import { describe, expect, it } from "vitest";
import {
  AOI_RADIUS_TILES,
  SOUND_HEARING_RADIUS_TILES,
  ATTRIBUTE_POTION_BUFF_DURATION_MS,
  ATTRIBUTE_POTION_BUFF_MAX,
  INMOVILIZAR_MOB_DURATION_MS,
  INMOVILIZAR_PLAYER_DURATION_MS,
  PARALIZAR_MOB_DURATION_MS,
  PARALIZAR_PLAYER_DURATION_MS,
  STAT_MAX,
  STAT_MIN,
  STEP_DURATION_MS,
  TILE_SIZE,
} from "../../game-data/constants";
import {
  getImmobilizeMobDurationMs,
  getImmobilizePlayerDurationMs,
  isMobImmobilizedAt,
} from "../../shared/combat";

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

  it("sound hearing radius is smaller than AOI", () => {
    expect(SOUND_HEARING_RADIUS_TILES).toBe(15);
    expect(SOUND_HEARING_RADIUS_TILES).toBeLessThan(AOI_RADIUS_TILES);
  });

  it("immobilize spell durations match design", () => {
    expect(INMOVILIZAR_MOB_DURATION_MS).toBe(60_000);
    expect(INMOVILIZAR_PLAYER_DURATION_MS).toBe(12_000);
    expect(PARALIZAR_MOB_DURATION_MS).toBe(90_000);
    expect(PARALIZAR_PLAYER_DURATION_MS).toBe(20_000);
    expect(getImmobilizeMobDurationMs(8)).toBe(60_000);
    expect(getImmobilizePlayerDurationMs(8)).toBe(12_000);
    expect(getImmobilizeMobDurationMs(10)).toBe(90_000);
    expect(getImmobilizePlayerDurationMs(10)).toBe(20_000);
    expect(isMobImmobilizedAt(Date.now() + 5000)).toBe(true);
    expect(isMobImmobilizedAt(0)).toBe(false);
  });
});
