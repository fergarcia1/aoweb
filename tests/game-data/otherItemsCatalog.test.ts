import { describe, expect, it } from "vitest";
import { MISC_ITEMS } from "../../game-data/items/catalog";
import { OTHER_MISC_ITEMS } from "../../game-data/items/otherItemsCatalog";
import { ITEM_DEFINITIONS } from "../../game-data/items/definitions";
import { isKnownItemId } from "../../game-data/items/registry";

describe("otherItems catalog", () => {
  it("registra todos los PNG de otherItems nuevos en MISC_ITEMS", () => {
    expect(OTHER_MISC_ITEMS.length).toBe(37);
    expect(MISC_ITEMS.length).toBe(1 + OTHER_MISC_ITEMS.length);
  });

  it("cada other item tiene definición y id conocido", () => {
    for (const entry of OTHER_MISC_ITEMS) {
      expect(ITEM_DEFINITIONS[entry.itemId as keyof typeof ITEM_DEFINITIONS]).toBeDefined();
      expect(isKnownItemId(entry.itemId)).toBe(true);
      expect(entry.iconAssetPath).toMatch(/^\/assets\/ao\/otherItems\/.+\.png$/);
    }
  });

  it("gemas de clan y barca tienen uso especial", () => {
    const barca = ITEM_DEFINITIONS.barca;
    expect(barca?.specialUse).toEqual({ kind: "boat_navigation" });

    const gemaDorada = ITEM_DEFINITIONS.gema_dorada;
    expect(gemaDorada?.specialUse).toEqual({
      kind: "clan_founding_gem",
      gemTier: "dorada",
    });
  });
});
