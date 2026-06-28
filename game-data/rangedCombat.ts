import type { ItemId } from "./items/definitions";

export const ARROW_ITEM_ID = "municion_flecha" as const;

export const BOW_ITEM_IDS = new Set<string>([
  "weapon_arco_cazador",
  "weapon_arco_largo",
]);

export const RANGED_ATTACK_RANGE_TILES = 8;

export function isBowItemId(itemId: string | null | undefined): boolean {
  return Boolean(itemId && BOW_ITEM_IDS.has(itemId));
}

export function hasArrowStack(
  inventory: Array<{ itemId?: string | null; amount?: number; count?: number } | null>
): boolean {
  return inventory.some((slot) => {
    if (!slot || slot.itemId !== ARROW_ITEM_ID) {
      return false;
    }
    const amount = slot.amount ?? slot.count ?? 0;
    return amount > 0;
  });
}

export function hasBowEquipped(equipment: { weapon?: ItemId | null; weaponId?: string | null }): boolean {
  return isBowItemId(equipment.weapon ?? equipment.weaponId);
}

export function isWithinRangedAttackRange(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): boolean {
  return Math.max(Math.abs(fromX - toX), Math.abs(fromY - toY)) <= RANGED_ATTACK_RANGE_TILES;
}
