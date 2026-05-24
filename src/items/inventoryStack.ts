import { getItemDefinition, getItemMaxStack, type ItemId } from "./itemDefinitions";

export type InventoryStack = {
  itemId: ItemId;
  count: number;
};

export type InventorySlot = InventoryStack | null;

export type AddToInventoryResult = {
  added: number;
  remaining: number;
};

export function formatStackLabel(itemId: ItemId, count: number): string {
  const item = getItemDefinition(itemId);
  return `${item.name} - (${count})`;
}

export function addToInventory(
  inventory: InventorySlot[],
  itemId: ItemId,
  count: number
): AddToInventoryResult {
  if (count <= 0) {
    return { added: 0, remaining: 0 };
  }

  const maxStack = getItemMaxStack(itemId);
  let remaining = count;

  for (let i = 0; i < inventory.length && remaining > 0; i++) {
    const slot = inventory[i];
    if (!slot || slot.itemId !== itemId) continue;

    const space = maxStack - slot.count;
    if (space <= 0) continue;

    const add = Math.min(space, remaining);
    slot.count += add;
    remaining -= add;
  }

  for (let i = 0; i < inventory.length && remaining > 0; i++) {
    if (inventory[i] !== null) continue;

    const add = Math.min(maxStack, remaining);
    inventory[i] = { itemId, count: add };
    remaining -= add;
  }

  return { added: count - remaining, remaining };
}
