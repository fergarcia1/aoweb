import { describe, expect, it } from "vitest";
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
});
