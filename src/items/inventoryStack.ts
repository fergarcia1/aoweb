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

export function moveEntireStack(
  from: InventorySlot[],
  fromIndex: number,
  to: InventorySlot[]
): { moved: number; ok: boolean } {
  const stack = from[fromIndex];
  if (!stack) {
    return { moved: 0, ok: false };
  }

  const result = addToInventory(to, stack.itemId, stack.count);
  if (result.added <= 0) {
    return { moved: 0, ok: false };
  }

  if (result.added >= stack.count) {
    from[fromIndex] = null;
  } else {
    stack.count -= result.added;
  }

  return { moved: result.added, ok: true };
}

export function moveStackAmount(
  from: InventorySlot[],
  fromIndex: number,
  to: InventorySlot[],
  amount: number
): { moved: number; ok: boolean } {
  const stack = from[fromIndex];
  if (!stack) {
    return { moved: 0, ok: false };
  }

  const transfer = Math.min(Math.max(1, Math.floor(amount)), stack.count);
  const result = addToInventory(to, stack.itemId, transfer);
  if (result.added <= 0) {
    return { moved: 0, ok: false };
  }

  if (result.added >= stack.count) {
    from[fromIndex] = null;
  } else {
    stack.count -= result.added;
  }

  return { moved: result.added, ok: true };
}
