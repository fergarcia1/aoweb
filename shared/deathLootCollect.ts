export type DeathLootInventorySlot = {
  itemId: string | null;
  amount: number;
};

export type DeathLootEquipment = {
  weaponId: string | null;
  shieldId: string | null;
  helmetId: string | null;
  armorId: string | null;
};

export type CollectDeathLootOptions = {
  isKnownItemId: (itemId: string) => boolean;
  itemDropsOnDeath: (itemId: string) => boolean;
  /** Inserta un ítem huérfano (solo equipado, sin stack en inventario). */
  addOrphanToInventory: (itemId: string) => boolean;
};

/**
 * Determina qué stacks dropear al morir. Los equipados viven en inventario;
 * nunca se dropea por separado desde equipment (evita x2).
 */
export function collectDeathLootStacks(
  inventorySlots: DeathLootInventorySlot[],
  equipment: DeathLootEquipment,
  options: CollectDeathLootOptions
): Array<{ itemId: string; amount: number }> {
  const equipKeys = ["weaponId", "shieldId", "helmetId", "armorId"] as const;
  for (const key of equipKeys) {
    const itemId = equipment[key];
    if (!itemId) continue;
    const inInventory = inventorySlots.some(
      (slot) => slot.itemId === itemId && slot.amount > 0
    );
    if (!inInventory) {
      options.addOrphanToInventory(itemId);
    }
  }

  const loot: Array<{ itemId: string; amount: number }> = [];
  for (const slot of inventorySlots) {
    if (!slot.itemId || slot.amount <= 0) continue;
    if (!options.isKnownItemId(slot.itemId)) continue;
    if (!options.itemDropsOnDeath(slot.itemId)) continue;
    loot.push({ itemId: slot.itemId, amount: slot.amount });
  }
  return loot;
}
