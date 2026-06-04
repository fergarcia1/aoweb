import {
  ARMORS,
  CONSUMABLES,
  HELMETS,
  MISC_ITEMS,
  SHIELDS,
  WEAPONS,
} from "./catalog";
import { normalizeItemId } from "./definitions";

const KNOWN_ITEM_IDS = new Set<string>([
  ...WEAPONS.map((entry) => entry.itemId),
  ...SHIELDS.map((entry) => entry.itemId),
  ...HELMETS.map((entry) => entry.itemId),
  ...ARMORS.map((entry) => entry.itemId),
  ...CONSUMABLES.map((entry) => entry.itemId),
  ...MISC_ITEMS.map((entry) => entry.itemId),
]);

const EQUIPMENT_ITEM_IDS = new Set<string>([
  ...WEAPONS.map((entry) => entry.itemId),
  ...SHIELDS.map((entry) => entry.itemId),
  ...HELMETS.map((entry) => entry.itemId),
  ...ARMORS.map((entry) => entry.itemId),
]);

export function getKnownItemIds(): ReadonlySet<string> {
  return KNOWN_ITEM_IDS;
}

export function isKnownItemId(itemId: string | null | undefined): boolean {
  if (!itemId) return false;
  return normalizeItemId(itemId) != null;
}

export function isKnownEquipmentItemId(itemId: string | null | undefined): boolean {
  if (!itemId) return false;
  const resolved = normalizeItemId(itemId);
  if (!resolved) return false;
  return EQUIPMENT_ITEM_IDS.has(resolved);
}
