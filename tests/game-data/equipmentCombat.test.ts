import { describe, expect, it } from "vitest";
import {
  getAttackStatsFromEquipment,
  getDefenseStatsFromEquipment,
} from "../../game-data/equipmentCombat";

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

  it("el escudo aporta bloqueo probabilístico, no reducción plana", () => {
    const stats = getDefenseStatsFromEquipment({
      weaponId: null,
      shieldId: "shield_tortuga",
      helmetId: null,
      armorId: null,
      equippedOutfit: "base",
    });
    expect(stats.damageReductionPercent).toBe(0);
    expect(stats.shieldBlockChancePercent).toBe(0.18);
    expect(stats.shieldBlockReductionPercent).toBe(0.38);
  });
});
