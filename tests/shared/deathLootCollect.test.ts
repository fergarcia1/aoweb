import { describe, expect, it } from "vitest";
import { collectDeathLootStacks } from "../../shared/deathLootCollect";

describe("collectDeathLootStacks", () => {
  const alwaysKnown = () => true;
  const alwaysDrops = () => true;

  it("drops equipped weapon once when it lives in inventory", () => {
    const inventory = [{ itemId: "weapon_baston", amount: 1 }];
    const equipment = {
      weaponId: "weapon_baston",
      shieldId: null,
      helmetId: null,
      armorId: null,
    };

    const loot = collectDeathLootStacks(inventory, equipment, {
      isKnownItemId: alwaysKnown,
      itemDropsOnDeath: alwaysDrops,
      addOrphanToInventory: () => false,
    });

    expect(loot).toEqual([{ itemId: "weapon_baston", amount: 1 }]);
  });

  it("drops orphan equipped item once after reconcile", () => {
    const inventory = [{ itemId: null, amount: 0 }];
    const equipment = {
      weaponId: "weapon_baston",
      shieldId: null,
      helmetId: null,
      armorId: null,
    };

    const loot = collectDeathLootStacks(inventory, equipment, {
      isKnownItemId: alwaysKnown,
      itemDropsOnDeath: alwaysDrops,
      addOrphanToInventory: (itemId) => {
        inventory[0] = { itemId, amount: 1 };
        return true;
      },
    });

    expect(loot).toEqual([{ itemId: "weapon_baston", amount: 1 }]);
  });

  it("drops each non-stackable inventory slot separately", () => {
    const inventory = [
      { itemId: "weapon_baston", amount: 1 },
      { itemId: "potion_roja", amount: 3 },
    ];
    const equipment = {
      weaponId: "weapon_baston",
      shieldId: null,
      helmetId: null,
      armorId: null,
    };

    const loot = collectDeathLootStacks(inventory, equipment, {
      isKnownItemId: alwaysKnown,
      itemDropsOnDeath: alwaysDrops,
      addOrphanToInventory: () => false,
    });

    expect(loot).toEqual([
      { itemId: "weapon_baston", amount: 1 },
      { itemId: "potion_roja", amount: 3 },
    ]);
  });

  it("skips items that do not drop on death", () => {
    const inventory = [{ itemId: "anillo_espectral", amount: 1 }];
    const equipment = {
      weaponId: null,
      shieldId: null,
      helmetId: null,
      armorId: null,
    };

    const loot = collectDeathLootStacks(inventory, equipment, {
      isKnownItemId: alwaysKnown,
      itemDropsOnDeath: (id) => id !== "anillo_espectral",
      addOrphanToInventory: () => false,
    });

    expect(loot).toEqual([]);
  });
});
