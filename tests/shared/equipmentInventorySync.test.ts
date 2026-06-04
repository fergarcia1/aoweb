import { describe, expect, it } from "vitest";
import { clearOrphanServerEquipment } from "../../shared/equipmentInventorySync";

describe("clearOrphanServerEquipment", () => {
  it("clears helmet when it is not in inventory", () => {
    const equipment = {
      weaponId: "weapon_espada_larga",
      shieldId: null,
      helmetId: "helmet_gorro_rm_diez",
      armorId: "armor_placas_doradas",
    };
    const inventory = [
      { itemId: "weapon_espada_larga", amount: 1 },
      { itemId: "armor_placas_doradas", amount: 1 },
    ];

    const changed = clearOrphanServerEquipment(equipment, inventory);

    expect(changed).toBe(true);
    expect(equipment.helmetId).toBeNull();
    expect(equipment.weaponId).toBe("weapon_espada_larga");
  });

  it("returns false when all equipped items are in inventory", () => {
    const equipment = {
      weaponId: "weapon_espada_larga",
      shieldId: null,
      helmetId: null,
      armorId: "armor_citizen",
    };
    const inventory = [
      { itemId: "weapon_espada_larga", amount: 1 },
      { itemId: "armor_citizen", amount: 1 },
    ];

    expect(clearOrphanServerEquipment(equipment, inventory)).toBe(false);
  });
});
