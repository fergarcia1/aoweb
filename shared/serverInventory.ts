import { INVENTORY_SLOT_COUNT } from "../game-data/constants";
import { getItemMaxStack, type ItemId } from "../game-data/items/definitions";
import { isKnownItemId } from "../game-data/items/registry";

export type ServerInventorySlot = {
  slotIndex: number;
  itemId: string | null;
  amount: number;
  isEquipped: boolean;
};

export function createEmptyServerInventory(): ServerInventorySlot[] {
  return Array.from({ length: INVENTORY_SLOT_COUNT }, (_, slotIndex) => ({
    slotIndex,
    itemId: null,
    amount: 0,
    isEquipped: false,
  }));
}

export function addToServerInventory(
  slots: ServerInventorySlot[],
  itemId: string,
  count: number
): { added: number; remaining: number } {
  if (count <= 0 || !isKnownItemId(itemId)) {
    return { added: 0, remaining: count };
  }

  const maxStack = getItemMaxStack(itemId as ItemId);
  let remaining = count;

  for (const slot of slots) {
    if (remaining <= 0) break;
    if (!slot.itemId || slot.itemId !== itemId || slot.amount <= 0) continue;
    const space = maxStack - slot.amount;
    if (space <= 0) continue;
    const add = Math.min(space, remaining);
    slot.amount += add;
    remaining -= add;
  }

  for (const slot of slots) {
    if (remaining <= 0) break;
    if (slot.itemId && slot.amount > 0) continue;
    const add = Math.min(maxStack, remaining);
    slot.itemId = itemId;
    slot.amount = add;
    remaining -= add;
  }

  return { added: count - remaining, remaining };
}

export function removeFromServerSlot(
  slots: ServerInventorySlot[],
  slotIndex: number,
  amount: number
): { removed: number; itemId: string | null } {
  const slot = slots[slotIndex];
  if (!slot || !slot.itemId || slot.amount <= 0 || amount <= 0) {
    return { removed: 0, itemId: null };
  }

  const removed = Math.min(slot.amount, Math.floor(amount));
  slot.amount -= removed;
  const itemId = slot.itemId;
  if (slot.amount <= 0) {
    slot.amount = 0;
    slot.itemId = null;
    slot.isEquipped = false;
  }
  return { removed, itemId };
}
