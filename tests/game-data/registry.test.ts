import { describe, expect, it } from "vitest";
import { CLASS_USES_MANA, type CharacterClassId } from "../../game-data/classes";
import { buildStarterLoadout } from "../../game-data/starterLoadout";
import { tryGetItemDefinition } from "../../game-data/items/definitions";
import { isKnownEquipmentItemId, isKnownItemId } from "../../game-data/items/registry";

describe("item registry", () => {
  it("recognizes catalog equipment ids", () => {
    expect(isKnownEquipmentItemId("armor_dragon_negro")).toBe(true);
    expect(isKnownEquipmentItemId("weapon_saramiana")).toBe(true);
  });

  it("rejects unknown ids", () => {
    expect(isKnownEquipmentItemId("armor_fake")).toBe(false);
    expect(isKnownItemId("potion_hp")).toBe(true);
    expect(isKnownItemId("not_an_item")).toBe(false);
  });

  it("resuelve todos los items iniciales de cada clase", () => {
    const classIds = Object.keys(CLASS_USES_MANA) as CharacterClassId[];
    for (const classId of classIds) {
      const starter = buildStarterLoadout(classId);
      expect(tryGetItemDefinition(starter.weaponItemId), classId).toBeDefined();
      expect(tryGetItemDefinition(starter.armorItemId), classId).toBeDefined();
      for (const slot of starter.inventorySlots) {
        expect(tryGetItemDefinition(slot.itemId), `${classId}:${slot.itemId}`).toBeDefined();
      }
    }
  });
});
