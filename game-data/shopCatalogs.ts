import { ARMORS, CONSUMABLES, HELMETS, SHIELDS, WEAPONS, MISC_ITEMS } from "./items";
import type { ItemId } from "./items/definitions";
import type { MerchantRole } from "../shared/npcData";

export const SHOP_SELL_RATIO = 0.6;
export type { MerchantRole } from "../shared/npcData";

export function isSpellMerchantRole(role: MerchantRole): role is "mage" {
  return role === "mage";
}

export function getMerchantDisplayTitle(role: MerchantRole): string {
  if (role === "blacksmith") return "Herrero";
  if (role === "armorer") return "Armero";
  if (role === "tailor") return "Sastre";
  if (role === "mage") return "Vendedor de Magia";
  return "Alquimista";
}

const BLACKSMITH_CATALOG: ItemId[] = WEAPONS.map((w) => w.itemId);

const ARMORER_CATALOG: ItemId[] = [
  ...ARMORS.map((a) => a.itemId),
  ...SHIELDS.map((s) => s.itemId),
  ...HELMETS.map((h) => h.itemId),
];

const ALCHEMIST_CATALOG: ItemId[] = [
  ...CONSUMABLES.map((c) => c.itemId),
  ...MISC_ITEMS.map((m) => m.itemId),
];

const TAILOR_CATALOG: ItemId[] = ARMORS.filter((armor) =>
  /tunica|citizen|atuendo|ropa/i.test(armor.itemId)
).map((armor) => armor.itemId);

export const SHOP_CATALOGS: Record<MerchantRole, ItemId[]> = {
  blacksmith: BLACKSMITH_CATALOG,
  armorer: ARMORER_CATALOG,
  tailor: TAILOR_CATALOG,
  alchemist: ALCHEMIST_CATALOG,
  mage: [],
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
