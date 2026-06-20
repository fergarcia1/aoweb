import { ARMORS, CONSUMABLES, HELMETS, SHIELDS, WEAPONS, MISC_ITEMS } from "./items";
import type { ItemId } from "./items/definitions";
import type { MerchantRole } from "../shared/npcData";

export const SHOP_SELL_RATIO = 0.6;
export type { MerchantRole } from "../shared/npcData";

export function isSpellMerchantRole(role: MerchantRole): role is "mage" | "test_mage" {
  return role === "mage" || role === "test_mage";
}

export function getMerchantDisplayTitle(role: MerchantRole): string {
  if (role === "blacksmith" || role === "test_blacksmith") return "Herrero";
  if (role === "armorer" || role === "test_armorer") return "Armero";
  if (role === "tailor" || role === "test_tailor") return "Sastre";
  if (role === "mage" || role === "test_mage") return "Vendedor de Magia";
  if (role === "general" || role === "test_general") return "Vendedor General";
  return "Alquimista";
}

const BLACKSMITH_CATALOG: ItemId[] = [
  "weapon_nudillos_bronce",
  "weapon_nudillos_plata",
  "weapon_espada_plata",
  "shield_plata",
  "shield_plata_dos",
  "shield_tortuga",
  "weapon_daga_mas_dos",
  "weapon_baculo_aqualin",
  "weapon_baston_esmeralda"
];

const ARMORER_CATALOG: ItemId[] = [
  "armor_placas",
  "armor_placas_rojas",
  "armor_placas_azules",
  "armor_cuero"
];

const ALCHEMIST_CATALOG: ItemId[] = [
  "potion_hp",
  "potion_mp",
  "potion_strength",
  "potion_agility",
];

const TAILOR_CATALOG: ItemId[] = [
  "armor_tunica_druida_bajos",
  "armor_tunica_clerigo",
  "armor_tunica_nigro",
  "armor_tunica_cruz",
  "armor_tunica_azul",
  "helmet_gorro_gris",
  "helmet_gorro_negro"
];

const MAGE_CATALOG: ItemId[] = [
  "scroll_implosion",
  "scroll_paralizar",
  "scroll_tormenta"
];

const GENERAL_CATALOG: ItemId[] = [
  "barca",
  "anillo_espectral",
  "montura_caballo_mago",
  "montura_caballo_negro",
  "montura_caballo_nw",
  "montura_caballo_semielfo",
  "montura_huargo",
];

const TEST_BLACKSMITH_CATALOG: ItemId[] = WEAPONS.map((w) => w.itemId);
const TEST_ARMORER_CATALOG: ItemId[] = [
  ...ARMORS.map((a) => a.itemId),
  ...SHIELDS.map((s) => s.itemId),
  ...HELMETS.map((h) => h.itemId),
];
const TEST_ALCHEMIST_CATALOG: ItemId[] = [
  "potion_hp",
  "potion_mp",
  "potion_strength",
  "potion_agility",
];
const TEST_TAILOR_CATALOG: ItemId[] = ARMORS.filter((armor) =>
  /tunica|citizen|atuendo|ropa/i.test(armor.itemId)
).map((armor) => armor.itemId);
const TEST_MAGE_CATALOG: ItemId[] = [
  "scroll_implosion",
  "scroll_paralizar",
  "scroll_tormenta"
];
const TEST_GENERAL_CATALOG: ItemId[] = [
  "anillo_espectral",
  "barca",
  "montura_caballo_mago",
  "montura_caballo_negro",
  "montura_caballo_nw",
  "montura_caballo_semielfo",
  "montura_huargo",
];

export const SHOP_CATALOGS: Record<MerchantRole, ItemId[]> = {
  blacksmith: BLACKSMITH_CATALOG,
  armorer: ARMORER_CATALOG,
  tailor: TAILOR_CATALOG,
  alchemist: ALCHEMIST_CATALOG,
  mage: MAGE_CATALOG,
  general: GENERAL_CATALOG,
  test_blacksmith: TEST_BLACKSMITH_CATALOG,
  test_armorer: TEST_ARMORER_CATALOG,
  test_tailor: TEST_TAILOR_CATALOG,
  test_alchemist: TEST_ALCHEMIST_CATALOG,
  test_mage: TEST_MAGE_CATALOG,
  test_general: TEST_GENERAL_CATALOG,
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
