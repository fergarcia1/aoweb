import { DEFAULT_MAP_ID } from "./constants";
import { INVENTORY_SLOT_COUNT } from "../game-data/constants";
import { isKnownEquipmentItemId } from "../game-data/items/registry";
import type { Facing, NetPlayerEquipment } from "./types";

/** Mapas con simulación en el servidor hosteado (ampliar al habilitar más zonas). */
export const MULTIPLAYER_SERVER_MAP_IDS = new Set<string>([DEFAULT_MAP_ID]);

export type JoinEquipmentPayload = {
  weaponId?: string | null;
  shieldId?: string | null;
  helmetId?: string | null;
  armorId?: string | null;
  equippedOutfit?: string;
};

export type JoinInventorySlotPayload = {
  slotIndex?: number;
  itemId?: string | null;
  amount?: number;
  isEquipped?: boolean;
};

export function clampPlayerLevel(level: unknown): number {
  if (typeof level !== "number" || !Number.isFinite(level)) {
    return 1;
  }
  return Math.min(200, Math.max(1, Math.floor(level)));
}

export function clampVitalPair(
  current: unknown,
  max: unknown,
  fallbackMax: number
): { current: number; max: number } {
  const maxVal =
    typeof max === "number" && Number.isFinite(max)
      ? Math.min(100_000, Math.max(1, Math.floor(max)))
      : fallbackMax;
  const cur =
    typeof current === "number" && Number.isFinite(current)
      ? Math.min(maxVal, Math.max(0, Math.floor(current)))
      : maxVal;
  return { current: cur, max: maxVal };
}

export function normalizeFacing(raw: unknown): Facing {
  if (raw === "up" || raw === "down" || raw === "left" || raw === "right") {
    return raw;
  }
  return "down";
}

function nullableItemId(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  return raw.trim().slice(0, 64);
}

export function sanitizeJoinEquipment(
  raw: JoinEquipmentPayload | undefined
): NetPlayerEquipment {
  const weaponId = nullableItemId(raw?.weaponId);
  const shieldId = nullableItemId(raw?.shieldId);
  const helmetId = nullableItemId(raw?.helmetId);
  const armorId = nullableItemId(raw?.armorId);
  return {
    weaponId: isKnownEquipmentItemId(weaponId) ? weaponId : null,
    shieldId: isKnownEquipmentItemId(shieldId) ? shieldId : null,
    helmetId: isKnownEquipmentItemId(helmetId) ? helmetId : null,
    armorId: isKnownEquipmentItemId(armorId) ? armorId : null,
    equippedOutfit:
      typeof raw?.equippedOutfit === "string" && raw.equippedOutfit.trim()
        ? raw.equippedOutfit.trim().slice(0, 32)
        : "base",
  };
}

export function resolveMultiplayerMapId(clientMapId: string): string {
  return MULTIPLAYER_SERVER_MAP_IDS.has(clientMapId) ? clientMapId : DEFAULT_MAP_ID;
}

export function sanitizeJoinInventory(
  raw: JoinInventorySlotPayload[] | null | undefined
): Array<{ slotIndex: number; itemId: string | null; amount: number; isEquipped: boolean }> {
  const slots = Array.from({ length: INVENTORY_SLOT_COUNT }, (_, slotIndex) => ({
    slotIndex,
    itemId: null as string | null,
    amount: 0,
    isEquipped: false,
  }));
  if (!Array.isArray(raw)) {
    return slots;
  }
  for (const entry of raw) {
    const slotIndex =
      typeof entry?.slotIndex === "number" && Number.isFinite(entry.slotIndex)
        ? Math.floor(entry.slotIndex)
        : -1;
    if (slotIndex < 0 || slotIndex >= INVENTORY_SLOT_COUNT) continue;
    const amount =
      typeof entry?.amount === "number" && Number.isFinite(entry.amount)
        ? Math.max(0, Math.floor(entry.amount))
        : 0;
    const itemId = nullableItemId(entry?.itemId);
    slots[slotIndex] = {
      slotIndex,
      itemId: amount > 0 ? itemId : null,
      amount: amount > 0 && itemId ? amount : 0,
      isEquipped: entry?.isEquipped === true,
    };
  }
  return slots;
}
