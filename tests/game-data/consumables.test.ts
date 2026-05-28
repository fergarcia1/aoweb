import { describe, expect, it } from "vitest";
import { tryUseConsumableOnVitals } from "../../game-data/consumables";

describe("tryUseConsumableOnVitals", () => {
  it("heals hp by percent", () => {
    const result = tryUseConsumableOnVitals(
      "potion_hp",
      "paladin",
      { hp: { current: 50, max: 100 }, mp: { current: 50, max: 50 } },
      { strength: 0, agility: 0, expiresAtMs: 0 },
      1000
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.hp).toBe(58);
    }
  });

  it("rejects unknown item", () => {
    const result = tryUseConsumableOnVitals(
      "not_real",
      "mago",
      { hp: { current: 50, max: 100 }, mp: { current: 50, max: 50 } },
      { strength: 0, agility: 0, expiresAtMs: 0 },
      1000
    );
    expect(result.ok).toBe(false);
  });
});
