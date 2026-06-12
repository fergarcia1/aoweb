import { describe, expect, it } from "vitest";
import {
  mobCanAttack,
  normalizeMobHitRange,
  rollMobHitDamage,
} from "../../game-data/mobCombat";

describe("mobCombat", () => {
  it("normalizes legacy attackDamage", () => {
    expect(normalizeMobHitRange(undefined, undefined, 12)).toEqual({
      minHit: 12,
      maxHit: 12,
    });
  });

  it("swaps inverted min/max", () => {
    expect(normalizeMobHitRange(20, 10, 0)).toEqual({ minHit: 10, maxHit: 20 });
  });

  it("rolls within range", () => {
    for (let i = 0; i < 30; i += 1) {
      const roll = rollMobHitDamage(5, 10);
      expect(roll).toBeGreaterThanOrEqual(5);
      expect(roll).toBeLessThanOrEqual(10);
    }
  });

  it("mobCanAttack requires positive maxHit", () => {
    expect(mobCanAttack(0, 0)).toBe(false);
    expect(mobCanAttack(1, 5)).toBe(true);
  });
});
