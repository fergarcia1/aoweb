import { normalizeOutfit, type Outfit } from "../../game-data/outfits";
import type { Facing } from "../../shared/types";
import type { EquipmentSlot, ItemId } from "../items/itemDefinitions";
import type { InventorySlot } from "../items/inventoryStack";

import { INVENTORY_COLS, INVENTORY_ROWS, INVENTORY_SLOT_COUNT } from "../../game-data/constants";
import { normalizeItemId } from "../../game-data/items/definitions";

export { INVENTORY_COLS, INVENTORY_ROWS, INVENTORY_SLOT_COUNT };
export const MACRO_SLOT_COUNT = 10;

const STORAGE_PREFIX = "aoweb_progress_v1_";
const SHARED_WORLD_ITEMS_KEY = "aoweb_world_items_by_map_v1";

export type SavedPlayerProgress = {
  level: number;
  exp: number;
  expToNext: number;
  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;
  gold: number;
};

export type SavedMacroBinding = {
  keyCode: string | null;
  action: "cast_spell" | "use_item" | "equip_item";
  itemId: ItemId | null;
  inventorySlotIndex?: number | null;
  spellId: number | null;
};

export type SavedKillStats = {
  creaturesKilled: number;
  criminalsKilled: number;
  usersKilled: number;
};

export type SavedWorldItem = {
  itemId: ItemId | "gold";
  tileX: number;
  tileY: number;
  count: number;
};

export type SavedCharacterProgress = {
  version: 1;
  mapId: string;
  tileX: number;
  tileY: number;
  facing: Facing;
  inventory: InventorySlot[];
  equipment: Record<EquipmentSlot, ItemId | null>;
  equippedOutfit: Outfit;
  playerProgress: SavedPlayerProgress;

  learnedSpellIds: number[];
  macroBindings: SavedMacroBinding[];
  killStats: SavedKillStats;
  deathPhase: "alive" | "ghost_offer" | "ghost";
  useGhostAppearance: boolean;
  worldItemsByMap: Record<string, SavedWorldItem[]>;
};

export function hasCharacterProgress(characterId: string): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${characterId}`) !== null;
  } catch {
    return false;
  }
}

function normalizeInventory(slots: unknown): InventorySlot[] {
  const inventory = Array(INVENTORY_SLOT_COUNT).fill(null) as InventorySlot[];
  if (!Array.isArray(slots)) {
    return inventory;
  }
  for (let i = 0; i < INVENTORY_SLOT_COUNT; i += 1) {
    const entry = slots[i];
    const stack = entry as InventorySlot | null | undefined;
    if (
      stack &&
      typeof stack === "object" &&
      typeof stack.itemId === "string" &&
      typeof stack.count === "number" &&
      stack.count > 0
    ) {
      const itemId = normalizeItemId(stack.itemId);
      if (!itemId) {
        continue;
      }
      inventory[i] = {
        itemId,
        count: Math.floor(stack.count),
      };
    }
  }
  return inventory;
}

function normalizeEquipment(raw: unknown): Record<EquipmentSlot, ItemId | null> {
  const equipment: Record<EquipmentSlot, ItemId | null> = {
    weapon: null,
    shield: null,
    helmet: null,
    armor: null,
  };
  if (!raw || typeof raw !== "object") {
    return equipment;
  }
  const record = raw as Record<string, unknown>;
  for (const slot of ["weapon", "shield", "helmet", "armor"] as EquipmentSlot[]) {
    const value = record[slot];
    if (typeof value === "string") {
      equipment[slot] = normalizeItemId(value);
    }
  }
  return equipment;
}



function normalizeMacroBindings(raw: unknown): SavedMacroBinding[] {
  const defaults: SavedMacroBinding[] = Array.from({ length: MACRO_SLOT_COUNT }, () => ({
    keyCode: null,
    action: "use_item",
    itemId: null,
    inventorySlotIndex: null,
    spellId: null,
  }));
  if (!Array.isArray(raw)) {
    return defaults;
  }
  for (let i = 0; i < MACRO_SLOT_COUNT; i += 1) {
    const entry = raw[i];
    if (!entry || typeof entry !== "object") continue;
    const binding = entry as Partial<SavedMacroBinding>;
    defaults[i] = {
      keyCode: typeof binding.keyCode === "string" ? binding.keyCode : null,
      action:
        binding.action === "cast_spell" ||
        binding.action === "use_item" ||
        binding.action === "equip_item"
          ? binding.action
          : "use_item",
      itemId:
        typeof binding.itemId === "string"
          ? normalizeItemId(binding.itemId)
          : null,
      inventorySlotIndex:
        typeof binding.inventorySlotIndex === "number" &&
        Number.isFinite(binding.inventorySlotIndex)
          ? Math.floor(binding.inventorySlotIndex)
          : null,
      spellId:
        typeof binding.spellId === "number" && Number.isFinite(binding.spellId)
          ? Math.floor(binding.spellId)
          : null,
    };
  }
  return defaults;
}

function normalizePlayerProgress(raw: unknown): SavedPlayerProgress | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Partial<SavedPlayerProgress>;
  if (
    typeof record.level !== "number" ||
    typeof record.exp !== "number" ||
    typeof record.expToNext !== "number" ||
    typeof record.hp !== "number" ||
    typeof record.hpMax !== "number" ||
    typeof record.mp !== "number" ||
    typeof record.mpMax !== "number" ||
    typeof record.gold !== "number"
  ) {
    return null;
  }
  return {
    level: Math.max(1, Math.floor(record.level)),
    exp: Math.max(0, Math.floor(record.exp)),
    expToNext: Math.max(1, Math.floor(record.expToNext)),
    hp: Math.max(0, Math.floor(record.hp)),
    hpMax: Math.max(1, Math.floor(record.hpMax)),
    mp: Math.max(0, Math.floor(record.mp)),
    mpMax: Math.max(0, Math.floor(record.mpMax)),
    gold: Math.max(0, Math.floor(record.gold)),
  };
}

function normalizeFacing(value: unknown): Facing {
  if (value === "up" || value === "down" || value === "left" || value === "right") {
    return value;
  }
  return "down";
}

function normalizeDeathPhase(value: unknown): SavedCharacterProgress["deathPhase"] {
  if (value === "ghost_offer" || value === "ghost") {
    return value;
  }
  return "alive";
}

function normalizeWorldItemsByMap(raw: unknown): Record<string, SavedWorldItem[]> {
  const result: Record<string, SavedWorldItem[]> = {};
  if (!raw || typeof raw !== "object") {
    return result;
  }

  for (const [mapId, entries] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof mapId !== "string" || !Array.isArray(entries)) {
      continue;
    }
    const normalized: SavedWorldItem[] = [];
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const record = entry as Partial<SavedWorldItem>;
      if (typeof record.itemId !== "string" || record.itemId.length === 0) {
        continue;
      }
      if (
        typeof record.tileX !== "number" ||
        typeof record.tileY !== "number" ||
        typeof record.count !== "number" ||
        record.count <= 0
      ) {
        continue;
      }
      normalized.push({
        itemId: record.itemId as ItemId | "gold",
        tileX: Math.max(0, Math.floor(record.tileX)),
        tileY: Math.max(0, Math.floor(record.tileY)),
        count: Math.floor(record.count),
      });
    }
    if (normalized.length > 0) {
      result[mapId] = normalized;
    }
  }
  return result;
}

export function loadCharacterProgress(characterId: string): SavedCharacterProgress | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${characterId}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<SavedCharacterProgress>;
    if (parsed.version !== 1) {
      return null;
    }
    const playerProgress = normalizePlayerProgress(parsed.playerProgress);
    if (
      !playerProgress ||
      typeof parsed.mapId !== "string" ||
      typeof parsed.tileX !== "number" ||
      typeof parsed.tileY !== "number"
    ) {
      return null;
    }

    const learnedSpellIds = Array.isArray(parsed.learnedSpellIds)
      ? parsed.learnedSpellIds
          .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
          .map((id) => Math.floor(id))
      : [];

    const killStats: SavedKillStats = {
      creaturesKilled:
        typeof parsed.killStats?.creaturesKilled === "number"
          ? Math.max(0, Math.floor(parsed.killStats.creaturesKilled))
          : 0,
      criminalsKilled:
        typeof parsed.killStats?.criminalsKilled === "number"
          ? Math.max(0, Math.floor(parsed.killStats.criminalsKilled))
          : 0,
      usersKilled:
        typeof parsed.killStats?.usersKilled === "number"
          ? Math.max(0, Math.floor(parsed.killStats.usersKilled))
          : 0,
    };

    let mapId = parsed.mapId;
    if (mapId && ["pueblo", "bosque", "montana", "desierto"].includes(mapId)) {
      mapId = "mapa1";
    }

    return {
      version: 1,
      mapId: mapId,
      tileX: Math.max(0, Math.floor(parsed.tileX)),
      tileY: Math.max(0, Math.floor(parsed.tileY)),
      facing: normalizeFacing(parsed.facing),
      inventory: normalizeInventory(parsed.inventory),
      equipment: normalizeEquipment(parsed.equipment),
      equippedOutfit: normalizeOutfit(parsed.equippedOutfit),
      playerProgress,
      learnedSpellIds,
      macroBindings: normalizeMacroBindings(parsed.macroBindings),
      killStats,
      deathPhase: normalizeDeathPhase(parsed.deathPhase),
      useGhostAppearance: parsed.useGhostAppearance === true,
      worldItemsByMap: normalizeWorldItemsByMap(parsed.worldItemsByMap),
    };
  } catch {
    return null;
  }
}

export function saveCharacterProgress(
  characterId: string,
  progress: SavedCharacterProgress
): void {
  localStorage.setItem(
    `${STORAGE_PREFIX}${characterId}`,
    JSON.stringify({
      ...progress,
      version: 1 as const,
    })
  );
}

export function loadSharedWorldItemsByMap(): Record<string, SavedWorldItem[]> {
  try {
    const raw = localStorage.getItem(SHARED_WORLD_ITEMS_KEY);
    if (!raw) {
      return {};
    }
    return normalizeWorldItemsByMap(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveSharedWorldItemsByMap(worldItemsByMap: Record<string, SavedWorldItem[]>): void {
  const normalized = normalizeWorldItemsByMap(worldItemsByMap);
  localStorage.setItem(SHARED_WORLD_ITEMS_KEY, JSON.stringify(normalized));
}

export function deleteCharacterProgress(characterId: string): void {
  localStorage.removeItem(`${STORAGE_PREFIX}${characterId}`);
}
