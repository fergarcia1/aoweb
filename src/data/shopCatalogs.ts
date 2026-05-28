import { ARMORS, CONSUMABLES, HELMETS, SHIELDS, WEAPONS } from "./items";
import type { ItemId } from "../items/itemDefinitions";
import type { NpcRole } from "../npcs/types";

export const SHOP_SELL_RATIO = 0.6;

export type MerchantRole = Extract<NpcRole, "blacksmith" | "armorer" | "alchemist">;

export const MERCHANT_ROLES: MerchantRole[] = ["blacksmith", "armorer", "alchemist"];

export function isMerchantRole(role: NpcRole): role is MerchantRole {
  return role === "blacksmith" || role === "armorer" || role === "alchemist";
}

export function getMerchantDisplayTitle(role: MerchantRole): string {
  if (role === "blacksmith") return "Herrero";
  if (role === "armorer") return "Armero";
  return "Alquimista";
}

const BLACKSMITH_CATALOG: ItemId[] = WEAPONS.map((w) => w.itemId);

const ARMORER_CATALOG: ItemId[] = [
  ...ARMORS.map((a) => a.itemId),
  ...SHIELDS.map((s) => s.itemId),
  ...HELMETS.map((h) => h.itemId),
];

const ALCHEMIST_CATALOG: ItemId[] = CONSUMABLES.map((c) => c.itemId);

export const SHOP_CATALOGS: Record<MerchantRole, ItemId[]> = {
  blacksmith: BLACKSMITH_CATALOG,
  armorer: ARMORER_CATALOG,
  alchemist: ALCHEMIST_CATALOG,
};

export function getShopCatalogForRole(role: MerchantRole): ItemId[] {
  return SHOP_CATALOGS[role];
}

export function getSellPrice(itemValue: number, amount: number): number {
  return Math.floor(itemValue * SHOP_SELL_RATIO) * Math.max(1, Math.floor(amount));
}

export function getBuyPrice(itemValue: number, amount: number): number {
  return itemValue * Math.max(1, Math.floor(amount));
}
