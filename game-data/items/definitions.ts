import type { Facing } from "../../shared/types";
import type { Outfit } from "../outfits";
import type { ItemSpecialUse } from "./itemSpecialUse";
import type {
  ArmorData,
  CharacterClassId,
  ConsumableData,
  HelmetData,
  HelmetItemId,
  MiscItemData,
  MiscItemId,
  ShieldData,
  ShieldItemId,
  WeaponData,
  WeaponItemId,
} from "./catalog";
import {
  ARMORS,
  CONSUMABLES,
  HELMETS,
  HELMET_EQUIPPED_SHEET_64_SWAD,
  MISC_ITEMS,
  SHIELDS,
  SHIELD_EQUIPPED_SHEET_192,
  WEAPONS,
} from "./catalog";

export type ItemId =
  | WeaponItemId
  | ShieldItemId
  | HelmetItemId
  | "armor_cuero"
  | "armor_placas"
  | "armor_placas_rojas"
  | "armor_placas_azules"
  | "armor_tunica_nigro"
  | "armor_tunica_azul"
  | "armor_tunica_cruz"
  | "armor_citizen"
  | "armor_dragon_negro"
  | "armor_dragon_negro_bajos"
  | "armor_dragon_blanco"
  | "armor_dragon_blanco_bajos"
  | "armor_dragon_rojo"
  | "armor_dragon_rojo_bajos"
  | "armor_asesino"
  | "armor_dragon_blanco_fem"
  | "armor_placas_doradas"
  | "armor_atuendo_banquero"
  | "armor_ropa_elegante_bajos"
  | "armor_tunica_clerigo"
  | "armor_tunica_druida_bajos"
  | "armor_tunica_rm_quince"
  | "armor_placas_rojas_bajos"
  | "armor_caballero_muerte"
  | "armor_caballero_muerte_bajos"
  | "armor_caballero_oscuro"
  | "potion_hp"
  | "potion_mp"
  | "potion_strength"
  | "potion_agility"
  | "scroll_implosion"
  | "scroll_paralizar"
  | "scroll_tormenta"
  | MiscItemId;

export type ItemType = "weapon" | "shield" | "helmet" | "armor" | "consumable" | "misc";

export type EquipmentSlot = "weapon" | "shield" | "helmet" | "armor";

export type ItemCombatModifiers = {
  attackMinBonus?: number;
  attackMaxBonus?: number;
  damageReductionPercent?: number;
  magicResistancePercent?: number;
  magicDamageBonusPercent?: number;
};

export type ItemConsumableEffects = {
  /** Porcentaje de HP máximo restaurado (0.08 = 8%). */
  healHpPercent?: number;
  /** Porcentaje de MP máximo restaurado (0.08 = 8%). */
  restoreMpPercent?: number;
  /** Aprende un hechizo por idSpell al usar el item. */
  learnSpellId?: number;
  /** Bonificación temporal de Fuerza o Agilidad (pociones verde/amarilla). */
  attributeBuff?: "strength" | "agility";
};

export type { ItemSpecialUse };

export const DEFAULT_MAX_ITEM_STACK = 10_000;

export type ItemDefinition = {
  id: ItemId;
  idItem: number;
  name: string;
  type: ItemType;
  textureKey: string;
  assetPath: string;
  value: number;
  nivelMinimo: number;
  usableBy: CharacterClassId[];
  /** Cantidad máxima por casillero de inventario. Default: 10_000. */
  maxStack?: number;
  equipSlot?: EquipmentSlot;
  combatModifiers?: ItemCombatModifiers;
  consumableEffects?: ItemConsumableEffects;
  attackSpeedMs?: number;
  damageMin?: number;
  damageMax?: number;
  canCrit?: boolean;
  /** Probabilidad de crítico (0.18 = 18%). */
  critChance?: number;
  /** Multiplicador de daño en crítico (1.5 = 150% del daño rolado). */
  critDamage?: number;
  equippedTextureKey?: string;
  equippedAssetPath?: string;
  equippedScale?: number;
  equippedFrameWidth?: number;
  equippedFrameHeight?: number;
  equippedIdleFrame?: number;
  equippedWalkFrame?: number;
  /** Uso especial (barca, montura, gema de clan, forma druida, etc.). */
  specialUse?: ItemSpecialUse;
  /** Si true, doble click en inventario intenta usar el objeto. */
  usableFromInventory?: boolean;
  /** Columnas de la grilla (p. ej. 6 en hoja 192×192). */
  equippedSheetCols?: number;
  /** Columnas de animación por fila SWAD. */
  equippedWalkColumnsByFacing?: Partial<Record<Facing, number>>;
  /** Columna inicial de caminata (idle suele ser 0). */
  equippedWalkStartColByFacing?: Partial<Record<Facing, number>>;
  /** Si true, D reutiliza fila A espejada (armas). Escudos: false → fila D. */
  equippedMirrorRightFromLeft?: boolean;
  /** Ajuste fino de posición del escudo equipado (suma al offset global). */
  equippedOffsetByFacing?: Partial<Record<Facing, { x?: number; y?: number }>>;
  /** Ajuste fino de depth equipado por dirección (suma al offset global del ítem). */
  equippedDepthOffsetByFacing?: Partial<Record<Facing, number>>;
  outfitOverride?: Outfit;
  /** Armadura exclusiva para enanos/gnomos (spritesheet *Bajos_std). */
  clasesBajas?: boolean;
  spritesheetStdPath?: string;
  spritesheetBajosPath?: string;
  spritesheetPathsByRace?: Partial<
    Record<"human" | "elf" | "drow" | "dwarf" | "gnome" | "orc" | "fantasma", string>
  >;
  /** Si true, no se dropea al morir y permanece en inventario/equipo (ej. barca). */
  noDropeaAlMorir?: boolean;
  /** @deprecated Usar noDropeaAlMorir. Si false, no se dropea al morir. */
  caeAlMorir?: boolean;
};

export function itemDropsOnDeath(item: ItemDefinition): boolean {
  if (item.noDropeaAlMorir === true) {
    return false;
  }
  return item.caeAlMorir !== false;
}

function applyDeathDropPolicy(
  definition: ItemDefinition,
  source: { noDropeaAlMorir?: boolean; caeAlMorir?: boolean }
): void {
  if (source.noDropeaAlMorir !== undefined) {
    definition.noDropeaAlMorir = source.noDropeaAlMorir;
  }
  if (source.caeAlMorir !== undefined) {
    definition.caeAlMorir = source.caeAlMorir;
  }
}

function buildWeaponItemDefinition(weapon: WeaponData): ItemDefinition {
  const textureKey = `item_${weapon.itemId}`;
  const definition: ItemDefinition = {
    id: weapon.itemId,
    idItem: weapon.idItem,
    name: weapon.nombre,
    type: "weapon",
    maxStack: weapon.maxStack ?? DEFAULT_MAX_ITEM_STACK,
    equipSlot: "weapon",
    value: weapon.valor,
    nivelMinimo: weapon.nivelMinimo,
    usableBy: weapon.equipablePor,
    attackSpeedMs: weapon.velocidadAtaqueMs,
    damageMin: weapon.danioMin,
    damageMax: weapon.danioMax,
    canCrit: weapon.canCrit ?? false,
    critChance: weapon.critChance,
    critDamage: weapon.critDamage,
    combatModifiers: {
      attackMinBonus: weapon.danioMin - 8,
      attackMaxBonus: weapon.danioMax - 16,
      magicDamageBonusPercent: weapon.aumentoDanioMagicoPercent ?? 0,
    },
    textureKey,
    assetPath: weapon.iconAssetPath,
    equippedTextureKey: `${textureKey}_equipped`,
    equippedAssetPath: weapon.equippedAssetPath,
    equippedScale: weapon.equippedScale,
    equippedFrameWidth: weapon.equippedFrameWidth,
    equippedFrameHeight: weapon.equippedFrameHeight,
    equippedIdleFrame: 0,
    equippedWalkFrame: 1,
  };
  applyDeathDropPolicy(definition, weapon);
  return definition;
}

const WEAPON_DEFINITIONS = Object.fromEntries(
  WEAPONS.map((weapon) => [weapon.itemId, buildWeaponItemDefinition(weapon)])
) as Record<WeaponItemId, ItemDefinition>;

function buildShieldItemDefinition(shield: ShieldData): ItemDefinition {
  const textureKey = `item_${shield.itemId}`;
  const definition: ItemDefinition = {
    id: shield.itemId,
    idItem: shield.idItem,
    name: shield.nombre,
    type: "shield",
    maxStack: DEFAULT_MAX_ITEM_STACK,
    equipSlot: "shield",
    value: shield.valor,
    nivelMinimo: shield.nivelMinimo,
    usableBy: shield.equipablePor,
    combatModifiers: {
      damageReductionPercent: shield.reduccionDanioPercent,
      magicResistancePercent: shield.resistenciaMagicaPercent,
    },
    textureKey,
    assetPath: shield.iconAssetPath,
  };

  if (shield.equippedAssetPath) {
    const layout =
      shield.equippedSheetLayout ?? SHIELD_EQUIPPED_SHEET_192;
    definition.equippedTextureKey = `${textureKey}_equipped`;
    definition.equippedAssetPath = shield.equippedAssetPath;
    definition.equippedScale = shield.equippedScale ?? 1;
    definition.equippedFrameWidth = layout.frameWidth;
    definition.equippedFrameHeight = layout.frameHeight;
    definition.equippedSheetCols = layout.sheetCols;
    definition.equippedWalkColumnsByFacing = layout.walkColumnsByFacing;
    definition.equippedWalkStartColByFacing = layout.walkStartColByFacing;
    definition.equippedMirrorRightFromLeft = layout.mirrorRightFromLeft;
    definition.equippedOffsetByFacing = shield.equippedOffsetByFacing;
    definition.equippedIdleFrame = 0;
    definition.equippedWalkFrame = 1;
  }

  applyDeathDropPolicy(definition, shield);
  return definition;
}

const SHIELD_DEFINITIONS = Object.fromEntries(
  SHIELDS.map((shield) => [shield.itemId, buildShieldItemDefinition(shield)])
) as Record<ShieldItemId, ItemDefinition>;

function buildHelmetItemDefinition(helmet: HelmetData): ItemDefinition {
  const textureKey = `item_${helmet.itemId}`;
  const definition: ItemDefinition = {
    id: helmet.itemId,
    idItem: helmet.idItem,
    name: helmet.nombre,
    type: "helmet",
    maxStack: DEFAULT_MAX_ITEM_STACK,
    equipSlot: "helmet",
    value: helmet.valor,
    nivelMinimo: helmet.nivelMinimo,
    usableBy: helmet.equipablePor,
    combatModifiers: {
      damageReductionPercent: helmet.reduccionDanioPercent,
      magicResistancePercent: helmet.resistenciaMagicaPercent,
    },
    textureKey,
    assetPath: helmet.iconAssetPath,
  };

  if (helmet.equippedAssetPath) {
    const layout = helmet.equippedSheetLayout ?? HELMET_EQUIPPED_SHEET_64_SWAD;
    definition.equippedTextureKey = `${textureKey}_equipped`;
    definition.equippedAssetPath = helmet.equippedAssetPath;
    definition.equippedScale = helmet.equippedScale ?? 1;
    definition.equippedFrameWidth = layout.frameWidth;
    definition.equippedFrameHeight = layout.frameHeight;
    definition.equippedSheetCols = layout.sheetCols;
    definition.equippedWalkColumnsByFacing = layout.walkColumnsByFacing;
    definition.equippedWalkStartColByFacing = layout.walkStartColByFacing;
    definition.equippedMirrorRightFromLeft = layout.mirrorRightFromLeft;
    definition.equippedOffsetByFacing = helmet.equippedOffsetByFacing;
    definition.equippedDepthOffsetByFacing = helmet.equippedDepthOffsetByFacing;
    definition.equippedIdleFrame = 0;
    definition.equippedWalkFrame = 0;
  }

  applyDeathDropPolicy(definition, helmet);
  return definition;
}

const HELMET_DEFINITIONS = Object.fromEntries(
  HELMETS.map((helmet) => [helmet.itemId, buildHelmetItemDefinition(helmet)])
) as Record<HelmetItemId, ItemDefinition>;

function buildArmorItemDefinition(armor: ArmorData): ItemDefinition {
  const textureKey = `item_${armor.itemId}`;
  const definition: ItemDefinition = {
    id: armor.itemId,
    idItem: armor.idItem,
    name: armor.nombre,
    type: "armor",
    maxStack: DEFAULT_MAX_ITEM_STACK,
    equipSlot: "armor",
    value: armor.valor,
    nivelMinimo: armor.nivelMinimo,
    usableBy: armor.equipablePor,
    combatModifiers: {
      damageReductionPercent: armor.reduccionDanioPercent,
      magicResistancePercent: armor.resistenciaMagicaPercent,
    },
    textureKey,
    assetPath: armor.iconAssetPath,
    clasesBajas: armor.clasesBajas,
    spritesheetStdPath: armor.spritesheetStdPath,
    spritesheetBajosPath: armor.spritesheetBajosPath,
    spritesheetPathsByRace: armor.spritesheetPathsByRace,
    outfitOverride: armor.outfitOverride,
  };
  applyDeathDropPolicy(definition, armor);
  return definition;
}

const ARMOR_DEFINITIONS = Object.fromEntries(
  ARMORS.map((armor) => [armor.itemId, buildArmorItemDefinition(armor)])
) as Record<ArmorData["itemId"], ItemDefinition>;

function buildConsumableItemDefinition(consumable: ConsumableData): ItemDefinition {
  const textureKey = `item_${consumable.itemId}`;
  const definition: ItemDefinition = {
    id: consumable.itemId,
    idItem: consumable.idItem,
    name: consumable.nombre,
    type: "consumable",
    textureKey,
    assetPath: consumable.iconAssetPath,
    value: consumable.valor,
    nivelMinimo: consumable.nivelMinimo,
    usableBy: consumable.usableBy,
    maxStack: consumable.maxStack,
    consumableEffects: {
      healHpPercent: consumable.healHpPercent,
      restoreMpPercent: consumable.restoreMpPercent,
      learnSpellId: consumable.learnSpellId,
      attributeBuff: consumable.attributeBuff,
    },
  };
  applyDeathDropPolicy(definition, consumable);
  return definition;
}

const CONSUMABLE_DEFINITIONS = Object.fromEntries(
  CONSUMABLES.map((consumable) => [consumable.itemId, buildConsumableItemDefinition(consumable)])
) as Record<ConsumableData["itemId"], ItemDefinition>;

function buildMiscItemDefinition(misc: MiscItemData): ItemDefinition {
  const textureKey = `item_${misc.itemId}`;
  const definition: ItemDefinition = {
    id: misc.itemId as MiscItemId,
    idItem: misc.idItem,
    name: misc.nombre,
    type: "misc",
    maxStack: misc.maxStack,
    textureKey,
    assetPath: misc.iconAssetPath,
    value: misc.valor,
    nivelMinimo: misc.nivelMinimo,
    usableBy: misc.usableBy,
    specialUse: misc.specialUse,
    usableFromInventory: misc.usableFromInventory,
  };
  applyDeathDropPolicy(definition, misc);
  return definition;
}

const MISC_DEFINITIONS = Object.fromEntries(
  MISC_ITEMS.map((misc) => [misc.itemId, buildMiscItemDefinition(misc)])
) as Record<MiscItemId, ItemDefinition>;

export const ITEM_DEFINITIONS: Record<ItemId, ItemDefinition> = {
  ...WEAPON_DEFINITIONS,
  ...SHIELD_DEFINITIONS,
  ...HELMET_DEFINITIONS,
  ...ARMOR_DEFINITIONS,
  ...CONSUMABLE_DEFINITIONS,
  ...MISC_DEFINITIONS,
};

/** IDs legacy → id actual del catálogo. */
const ITEM_ID_ALIASES: Record<string, ItemId> = {
  armor_citizen_bajos: "armor_citizen",
};

export function normalizeItemId(itemId: string): ItemId | null {
  const resolved = (ITEM_ID_ALIASES[itemId] ?? itemId) as ItemId;
  return resolved in ITEM_DEFINITIONS ? resolved : null;
}

export function tryGetItemDefinition(itemId: string): ItemDefinition | undefined {
  const resolved = normalizeItemId(itemId);
  if (!resolved) {
    return undefined;
  }
  return ITEM_DEFINITIONS[resolved];
}

export function getItemDefinition(itemId: ItemId): ItemDefinition {
  const definition = tryGetItemDefinition(itemId);
  if (!definition) {
    throw new Error(`Unknown item id: ${itemId}`);
  }
  return definition;
}

export function getItemMaxStack(itemId: ItemId): number {
  const definition = tryGetItemDefinition(itemId);
  if (!definition) {
    return DEFAULT_MAX_ITEM_STACK;
  }
  return definition.maxStack ?? DEFAULT_MAX_ITEM_STACK;
}

export const ALL_ITEM_IDS = Object.keys(ITEM_DEFINITIONS) as ItemId[];

