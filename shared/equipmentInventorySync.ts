/** Slot mínimo para saber qué itemIds existen en el inventario. */
export type MinimalInventoryStack = {
  itemId: string | null;
  amount: number;
};

export type ServerEquipmentIds = {
  weaponId: string | null;
  shieldId: string | null;
  helmetId: string | null;
  armorId: string | null;
};

const SERVER_EQUIP_KEYS = ["weaponId", "shieldId", "helmetId", "armorId"] as const;

export function inventoryItemIdSet(
  slots: Array<MinimalInventoryStack | null | undefined>
): Set<string> {
  const ids = new Set<string>();
  for (const slot of slots) {
    if (slot?.itemId && slot.amount > 0) {
      ids.add(slot.itemId);
    }
  }
  return ids;
}

/**
 * Quita equipo que sigue en `equipment` pero ya no está en el inventario.
 * Evita sprites fantasma (ej. gorro equipado sin ítem en la UI).
 */
export function clearOrphanServerEquipment(
  equipment: ServerEquipmentIds,
  inventory: Array<MinimalInventoryStack | null | undefined>
): boolean {
  const inInventory = inventoryItemIdSet(inventory);
  let changed = false;
  for (const key of SERVER_EQUIP_KEYS) {
    const itemId = equipment[key];
    if (itemId && !inInventory.has(itemId)) {
      equipment[key] = null;
      changed = true;
    }
  }
  return changed;
}
