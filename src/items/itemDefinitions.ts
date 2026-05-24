import type { Outfit } from "../player/playerSprites";
import type { CharacterClassId } from "../data/items";
import { ARMORS, CONSUMABLES, WEAPONS } from "../data/items";

export type ItemId =
  | "weapon_saramiana"
  | "armor_cuero"
  | "armor_placas"
  | "armor_placas_rojas"
  | "armor_placas_azules"
  | "potion_hp"
  | "scroll_implosion";

export type ItemType = "weapon" | "armor" | "consumable" | "misc";

export type EquipmentSlot = "weapon" | "shield" | "helmet" | "armor";

export type ItemCombatModifiers = {
  attackMinBonus?: number;
  attackMaxBonus?: number;
  damageReductionPercent?: number;
};

export type ItemConsumableEffects = {
  /** Porcentaje de HP máximo restaurado (0.07 = 7%). */
  healHpPercent?: number;
  /** Aprende un hechizo por idSpell al usar el item. */
  learnSpellId?: number;
};

export const DEFAULT_MAX_ITEM_STACK = 10_000;

export type ItemDefinition = {
  id: ItemId;
  idItem: number;
  name: string;
  type: ItemType;
  textureKey: string;
  assetPath: string;
  value: number;
  usableBy: CharacterClassId[];
  /** Cantidad máxima por casillero de inventario. Default: 10_000. */
  maxStack?: number;
  equipSlot?: EquipmentSlot;
  combatModifiers?: ItemCombatModifiers;
  consumableEffects?: ItemConsumableEffects;
  attackSpeedMs?: number;
  damageMin?: number;
  damageMax?: number;
  equippedTextureKey?: string;
  equippedAssetPath?: string;
  equippedScale?: number;
  equippedFrameWidth?: number;
  equippedFrameHeight?: number;
  equippedIdleFrame?: number;
  equippedWalkFrame?: number;
  outfitOverride?: Outfit;
};

const WEAPON_SARAMIANA = WEAPONS[0];
const ARMOR_CUERO = ARMORS.find((armor) => armor.itemId === "armor_cuero")!;
const ARMOR_PLACAS = ARMORS.find((armor) => armor.itemId === "armor_placas")!;
const ARMOR_PLACAS_ROJAS = ARMORS.find((armor) => armor.itemId === "armor_placas_rojas")!;
const ARMOR_PLACAS_AZULES = ARMORS.find((armor) => armor.itemId === "armor_placas_azules")!;
const POTION_HP = CONSUMABLES.find(
  (consumable) => consumable.itemId === "potion_hp"
)!;
const SCROLL_IMPLOSION = CONSUMABLES.find(
  (consumable) => consumable.itemId === "scroll_implosion"
)!;

export const ITEM_DEFINITIONS: Record<ItemId, ItemDefinition> = {
  weapon_saramiana: {
    id: WEAPON_SARAMIANA.itemId,
    idItem: WEAPON_SARAMIANA.idItem,
    name: WEAPON_SARAMIANA.nombre,
    type: "weapon",
    maxStack: 1,
    equipSlot: "weapon",
    value: WEAPON_SARAMIANA.valor,
    usableBy: WEAPON_SARAMIANA.equipablePor,
    attackSpeedMs: WEAPON_SARAMIANA.velocidadAtaqueMs,
    damageMin: WEAPON_SARAMIANA.danioMin,
    damageMax: WEAPON_SARAMIANA.danioMax,
    combatModifiers: {
      attackMinBonus: 172,
      attackMaxBonus: 184,
    },
    textureKey: "item_weapon_saramiana",
    assetPath: WEAPON_SARAMIANA.iconAssetPath,
    equippedTextureKey: "item_weapon_saramiana_equipped",
    equippedAssetPath: WEAPON_SARAMIANA.equippedAssetPath,
    equippedScale: WEAPON_SARAMIANA.equippedScale,
    equippedFrameWidth: WEAPON_SARAMIANA.equippedFrameWidth,
    equippedFrameHeight: WEAPON_SARAMIANA.equippedFrameHeight,
    equippedIdleFrame: 0,
    equippedWalkFrame: 1,
  },
  armor_cuero: {
    id: ARMOR_CUERO.itemId,
    idItem: ARMOR_CUERO.idItem,
    name: ARMOR_CUERO.nombre,
    type: "armor",
    maxStack: 1,
    equipSlot: "armor",
    value: ARMOR_CUERO.valor,
    usableBy: ARMOR_CUERO.equipablePor,
    combatModifiers: {
      damageReductionPercent: ARMOR_CUERO.reduccionDanioPercent,
    },
    textureKey: "item_armor_cuero",
    assetPath: ARMOR_CUERO.iconAssetPath,
    outfitOverride: ARMOR_CUERO.outfitOverride,
  },
  armor_placas: {
    id: ARMOR_PLACAS.itemId,
    idItem: ARMOR_PLACAS.idItem,
    name: ARMOR_PLACAS.nombre,
    type: "armor",
    maxStack: 1,
    equipSlot: "armor",
    value: ARMOR_PLACAS.valor,
    usableBy: ARMOR_PLACAS.equipablePor,
    combatModifiers: {
      damageReductionPercent: ARMOR_PLACAS.reduccionDanioPercent,
    },
    textureKey: "item_armor_placas",
    assetPath: ARMOR_PLACAS.iconAssetPath,
    outfitOverride: ARMOR_PLACAS.outfitOverride,
  },
  armor_placas_rojas: {
    id: ARMOR_PLACAS_ROJAS.itemId,
    idItem: ARMOR_PLACAS_ROJAS.idItem,
    name: ARMOR_PLACAS_ROJAS.nombre,
    type: "armor",
    maxStack: 1,
    equipSlot: "armor",
    value: ARMOR_PLACAS_ROJAS.valor,
    usableBy: ARMOR_PLACAS_ROJAS.equipablePor,
    combatModifiers: {
      damageReductionPercent: ARMOR_PLACAS_ROJAS.reduccionDanioPercent,
    },
    textureKey: "item_armor_placas_rojas",
    assetPath: ARMOR_PLACAS_ROJAS.iconAssetPath,
    outfitOverride: ARMOR_PLACAS_ROJAS.outfitOverride,
  },
  armor_placas_azules: {
    id: ARMOR_PLACAS_AZULES.itemId,
    idItem: ARMOR_PLACAS_AZULES.idItem,
    name: ARMOR_PLACAS_AZULES.nombre,
    type: "armor",
    maxStack: 1,
    equipSlot: "armor",
    value: ARMOR_PLACAS_AZULES.valor,
    usableBy: ARMOR_PLACAS_AZULES.equipablePor,
    combatModifiers: {
      damageReductionPercent: ARMOR_PLACAS_AZULES.reduccionDanioPercent,
    },
    textureKey: "item_armor_placas_azules",
    assetPath: ARMOR_PLACAS_AZULES.iconAssetPath,
    outfitOverride: ARMOR_PLACAS_AZULES.outfitOverride,
  },
  potion_hp: {
    id: POTION_HP.itemId,
    idItem: POTION_HP.idItem,
    name: POTION_HP.nombre,
    type: "consumable",
    textureKey: "item_potion_hp",
    assetPath: POTION_HP.iconAssetPath,
    value: POTION_HP.valor,
    usableBy: POTION_HP.usableBy,
    consumableEffects: {
      healHpPercent: POTION_HP.healHpPercent,
    },
  },
  scroll_implosion: {
    id: SCROLL_IMPLOSION.itemId,
    idItem: SCROLL_IMPLOSION.idItem,
    name: SCROLL_IMPLOSION.nombre,
    type: "consumable",
    maxStack: SCROLL_IMPLOSION.maxStack,
    textureKey: "item_scroll_implosion",
    assetPath: SCROLL_IMPLOSION.iconAssetPath,
    value: SCROLL_IMPLOSION.valor,
    usableBy: SCROLL_IMPLOSION.usableBy,
    consumableEffects: {
      learnSpellId: SCROLL_IMPLOSION.learnSpellId,
    },
  },
};

export function getItemDefinition(itemId: ItemId): ItemDefinition {
  return ITEM_DEFINITIONS[itemId];
}

export function getItemMaxStack(itemId: ItemId): number {
  return ITEM_DEFINITIONS[itemId].maxStack ?? DEFAULT_MAX_ITEM_STACK;
}

