import { describe, expect, it } from "vitest";
import { getAttackStatsFromEquipment } from "../../game-data/equipmentCombat";

describe("getAttackStatsFromEquipment", () => {
  it("applies weapon damage from catalog", () => {
    const stats = getAttackStatsFromEquipment({
      weaponId: "weapon_saramiana",
      shieldId: null,
      helmetId: null,
      armorId: null,
      equippedOutfit: "base",
    });
    expect(stats.attackMin).toBeGreaterThan(8);
    expect(stats.attackMax).toBeGreaterThan(stats.attackMin);
  });
});
