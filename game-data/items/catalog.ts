import type { Facing } from "../../shared/types";

export type CharacterClassId =
  | "paladin"
  | "mago"
  | "druida"
  | "guerrero"
  | "cazador"
  | "asesino";

const ALL_CLASSES: CharacterClassId[] = [
  "paladin",
  "mago",
  "druida",
  "guerrero",
  "cazador",
  "asesino",
];
const MANA_CLASSES: CharacterClassId[] = ["paladin", "mago", "druida", "asesino"];
const MARTIAL_CLASSES: CharacterClassId[] = ["guerrero", "paladin", "cazador", "asesino"];
const ROBES_CLASSES: CharacterClassId[] = ["mago", "druida", "paladin", "asesino"];
const HEAVY_ARMOR_CLASSES: CharacterClassId[] = ["guerrero", "paladin", "cazador", "asesino"];

export type WeaponItemId =
  | "weapon_saramiana"
  | "weapon_espada_plata_mas_uno"
  | "weapon_daga_mas_dos"
  | "weapon_baculo_lazull"
  | "weapon_baston_esmeralda";

export type WeaponData = {
  itemId: WeaponItemId;
  idItem: number;
  /** Nivel mínimo del personaje para equipar o usar. */
  nivelMinimo: number;
  nombre: string;
  danioMin: number;
  danioMax: number;
  /** Bonus al daño de hechizos (0.1 = +10%). */
  aumentoDanioMagicoPercent?: number;
  /** Si el arma puede infligir golpes críticos. */
  canCrit?: boolean;
  /** Probabilidad de crítico (0.18 = 18%). Solo aplica si canCrit es true. */
  critChance?: number;
  /** Multiplicador de daño en crítico (1.5 = 150% del daño rolado). */
  critDamage?: number;
  velocidadAtaqueMs: number;
  valor: number;
  equipablePor: CharacterClassId[];
  iconAssetPath: string;
  equippedAssetPath: string;
  equippedFrameWidth: number;
  equippedFrameHeight: number;
  equippedScale: number;
  /** Cantidad máxima por casillero (por defecto 1 en armas). */
  maxStack?: number;
  /** Si true, no se dropea al morir. */
  noDropeaAlMorir?: boolean;
};

export type ShieldItemId =
  | "shield_plata"
  | "shield_plata_dos"
  | "shield_leon"
  | "shield_torre";

export type HelmetItemId =
  | "helmet_celada"
  | "helmet_casco_soldado"
  | "helmet_casco_gladiador"
  | "helmet_casco_alado"
  | "helmet_yelmo"
  | "helmet_gorro_gris"
  | "helmet_gorro_negro"
  | "helmet_gorro_rm_diez"
  | "helmet_gorro_rm_treinta"
  | "helmet_tunica_dorada";

export type HelmetData = {
  itemId: HelmetItemId;
  idItem: number;
  nivelMinimo: number;
  nombre: string;
  reduccionDanioPercent: number;
  resistenciaMagicaPercent: number;
  valor: number;
  equipablePor: CharacterClassId[];
  iconAssetPath: string;
  /** Spritesheet equipado sobre la cabeza (std/png). */
  equippedAssetPath?: string;
  equippedSheetLayout?: HelmetEquippedSheetLayout;
  equippedScale?: number;
  /** Suma al offset global del casco equipado por dirección. */
  equippedOffsetByFacing?: Partial<Record<Facing, { x?: number; y?: number }>>;
  /** Suma al depth global del casco por dirección (p. ej. W delante del cuerpo). */
  equippedDepthOffsetByFacing?: Partial<Record<Facing, number>>;
  /** Si true, no se dropea al morir. */
  noDropeaAlMorir?: boolean;
};

export type HelmetEquippedSheetLayout = {
  frameWidth: number;
  frameHeight: number;
  sheetCols: number;
  walkColumnsByFacing: Record<Facing, number>;
  walkStartColByFacing: Record<Facing, number>;
  mirrorRightFromLeft: boolean;
};

/** PNG 64×64: 1 columna × 4 filas SWAD, 1 frame por dirección (celda 64×16). */
export const HELMET_EQUIPPED_SHEET_64_SWAD: HelmetEquippedSheetLayout = {
  frameWidth: 64,
  frameHeight: 16,
  sheetCols: 1,
  walkColumnsByFacing: {
    down: 1,
    up: 1,
    left: 1,
    right: 1,
  },
  walkStartColByFacing: {
    down: 0,
    up: 0,
    left: 0,
    right: 0,
  },
  mirrorRightFromLeft: false,
};

/** PNG 128×128: 1 columna × 4 filas SWAD, 1 frame por dirección (celda 128×32). */
export const HELMET_EQUIPPED_SHEET_128_SWAD: HelmetEquippedSheetLayout = {
  frameWidth: 128,
  frameHeight: 32,
  sheetCols: 1,
  walkColumnsByFacing: {
    down: 1,
    up: 1,
    left: 1,
    right: 1,
  },
  walkStartColByFacing: {
    down: 0,
    up: 0,
    left: 0,
    right: 0,
  },
  mirrorRightFromLeft: false,
};

export type ShieldEquippedSheetLayout = {
  frameWidth: number;
  frameHeight: number;
  sheetCols: number;
  walkColumnsByFacing: Record<Facing, number>;
  walkStartColByFacing: Record<Facing, number>;
  mirrorRightFromLeft: boolean;
};

/** Hoja 192×192: celdas 32×48, 6 columnas en grilla, S/W 6 frames, A/D 5. */
export const SHIELD_EQUIPPED_SHEET_192: ShieldEquippedSheetLayout = {
  frameWidth: 32,
  frameHeight: 48,
  sheetCols: 6,
  walkColumnsByFacing: {
    down: 6,
    up: 6,
    left: 5,
    right: 5,
  },
  walkStartColByFacing: {
    down: 0,
    up: 0,
    left: 0,
    right: 0,
  },
  mirrorRightFromLeft: false,
};

/** Hoja 256×256: celdas 32×64, 8 columnas en grilla (misma lógica SWAD). */
export const SHIELD_EQUIPPED_SHEET_256: ShieldEquippedSheetLayout = {
  frameWidth: 32,
  frameHeight: 64,
  sheetCols: 8,
  walkColumnsByFacing: {
    down: 6,
    up: 6,
    left: 5,
    right: 5,
  },
  walkStartColByFacing: {
    down: 0,
    up: 0,
    left: 0,
    right: 0,
  },
  mirrorRightFromLeft: false,
};

/** @deprecated Usar SHIELD_EQUIPPED_SHEET_192 */
export const SHIELD_EQUIPPED_SHEET_LAYOUT = SHIELD_EQUIPPED_SHEET_192;

export type ShieldData = {
  itemId: ShieldItemId;
  idItem: number;
  nivelMinimo: number;
  nombre: string;
  /** Reducción de daño físico (0.08 = 8%). */
  reduccionDanioPercent: number;
  /** Resistencia a daño mágico (0.04 = 4%). */
  resistenciaMagicaPercent: number;
  valor: number;
  equipablePor: CharacterClassId[];
  iconAssetPath: string;
  /** Spritesheet equipado (cuando exista std/png). */
  equippedAssetPath?: string;
  /** Grilla del std; por defecto 192×192. */
  equippedSheetLayout?: ShieldEquippedSheetLayout;
  equippedScale?: number;
  /** Suma al offset global del escudo equipado por dirección. */
  equippedOffsetByFacing?: Partial<Record<Facing, { x?: number; y?: number }>>;
  /** Si true, no se dropea al morir. */
  noDropeaAlMorir?: boolean;
};

export type ArmorData = {
  itemId:
    | "armor_cuero"
    | "armor_placas"
    | "armor_placas_rojas"
    | "armor_placas_azules"
    | "armor_tunica_nigro"
    | "armor_tunica_azul"
    | "armor_tunica_cruz"
    | "armor_citizen_bajos"
    | "armor_dragon_negro"
    | "armor_dragon_negro_bajos"
    | "armor_dragon_blanco"
    | "armor_dragon_blanco_bajos"
    | "armor_dragon_rojo"
    | "armor_dragon_rojo_bajos";
  idItem: number;
  nivelMinimo: number;
  nombre: string;
  reduccionDanioPercent: number;
  /** Resistencia a daño mágico entrante (0.12 = 12%). */
  resistenciaMagicaPercent: number;
  valor: number;
  equipablePor: CharacterClassId[];
  iconAssetPath: string;
  /** Si true, solo enanos/gnomos pueden equiparla (spritesheet *Bajos_std). */
  clasesBajas: boolean;
  /** Spritesheet equipado para razas altas; si omitido se deriva del outfit. */
  spritesheetStdPath?: string;
  /** Spritesheet para enanos/gnomos; si omitido se infiere de *_Bajos_std. */
  spritesheetBajosPath?: string;
  outfitOverride:
    | "citizen"
    | "cuero"
    | "placas"
    | "placasRojas"
    | "placasAzules"
    | "tunicaNigro"
    | "tunicaAzul"
    | "tunicaCruz"
    | "dragonNegro"
    | "dragonNegroBajos"
    | "dragonBlanco"
    | "dragonBlancoBajos"
    | "dragonRojo"
    | "dragonRojoBajos";
  /** Si true, no se dropea al morir. */
  noDropeaAlMorir?: boolean;
};

export type MiscItemData = {
  itemId: "anillo_espectral";
  idItem: number;
  nivelMinimo: number;
  nombre: string;
  valor: number;
  usableBy: CharacterClassId[];
  iconAssetPath: string;
  maxStack?: number;
  /** Si true, no se dropea al morir (ej. barca). */
  noDropeaAlMorir?: boolean;
};

export type ConsumableData = {
  itemId:
    | "potion_hp"
    | "potion_mp"
    | "potion_strength"
    | "potion_agility"
    | "scroll_implosion"
    | "scroll_paralizar"
    | "scroll_tormenta";
  idItem: number;
  nivelMinimo: number;
  nombre: string;
  valor: number;
  usableBy: CharacterClassId[];
  iconAssetPath: string;
  maxStack?: number;
  healHpPercent?: number;
  /** Porcentaje de MP máximo restaurado (0.08 = 8%). */
  restoreMpPercent?: number;
  learnSpellId?: number;
  /** Bonificación temporal de Fuerza o Agilidad. */
  attributeBuff?: "strength" | "agility";
  /** Si true, no se dropea al morir. */
  noDropeaAlMorir?: boolean;
};

export const WEAPONS: WeaponData[] = [
  {
    itemId: "weapon_saramiana",
    idItem: 1001,
    nivelMinimo: 1,
    nombre: "Espada",
    danioMin: 180,
    danioMax: 200,
    velocidadAtaqueMs: 800,
    valor: 6500,
    equipablePor: MARTIAL_CLASSES,
    iconAssetPath: "/assets/ao/weapons/saramiana_icon.png",
    equippedAssetPath: "/assets/ao/weapons/saramiana.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_espada_plata_mas_uno",
    idItem: 1002,
    nivelMinimo: 1,
    nombre: "Espada de plata +1",
    danioMin: 190,
    danioMax: 210,
    velocidadAtaqueMs: 800,
    valor: 7200,
    equipablePor: MARTIAL_CLASSES,
    iconAssetPath: "/assets/ao/weapons/espadaPlataMasUno_icon.png",
    equippedAssetPath: "/assets/ao/weapons/espadaPlataMasUno.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_daga_mas_dos",
    idItem: 1003,
    nivelMinimo: 1,
    nombre: "Daga +2",
    danioMin: 150,
    danioMax: 170,
    canCrit: true,
    critChance: 0.18,
    critDamage: 1.5,
    velocidadAtaqueMs: 650,
    valor: 4800,
    maxStack: 10_000,
    equipablePor: MARTIAL_CLASSES,
    iconAssetPath: "/assets/ao/weapons/dagaMasDos_icon.png",
    equippedAssetPath: "/assets/ao/weapons/dagaMasDos.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_baculo_lazull",
    idItem: 1004,
    nivelMinimo: 1,
    nombre: "Báculo lazul",
    danioMin: 80,
    danioMax: 100,
    aumentoDanioMagicoPercent: 0.12,
    velocidadAtaqueMs: 900,
    valor: 8500,
    equipablePor: MANA_CLASSES,
    iconAssetPath: "/assets/ao/weapons/baculoLazull_icon.png",
    equippedAssetPath: "/assets/ao/weapons/baculoLazull.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_baston_esmeralda",
    idItem: 1005,
    nivelMinimo: 1,
    nombre: "Bastón de esmeralda",
    danioMin: 90,
    danioMax: 110,
    aumentoDanioMagicoPercent: 0.1,
    velocidadAtaqueMs: 850,
    valor: 7800,
    equipablePor: MANA_CLASSES,
    iconAssetPath: "/assets/ao/weapons/bastonEsmeralda_icon.png",
    equippedAssetPath: "/assets/ao/weapons/bastonEsmeralda.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
];

export const SHIELDS: ShieldData[] = [
  {
    itemId: "shield_plata",
    idItem: 2101,
    nivelMinimo: 1,
    nombre: "Escudo de plata",
    reduccionDanioPercent: 0.06,
    resistenciaMagicaPercent: 0.03,
    valor: 2800,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/shields/escudoPlata_icon.png",
    equippedAssetPath: "/assets/ao/shields/escudoPlata.png",
    equippedScale: 1,
    equippedOffsetByFacing: {
      down: { x: 5 },
      right: { x: 2, y: 3 },
      up: { x: -5},
    },
  },
  {
    itemId: "shield_plata_dos",
    idItem: 2102,
    nivelMinimo: 8,
    nombre: "Escudo de plata +2",
    reduccionDanioPercent: 0.09,
    resistenciaMagicaPercent: 0.04,
    valor: 4200,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/shields/escudoPlataDos_icon.png",
    equippedAssetPath: "/assets/ao/shields/escudoPlataDos.png",
    equippedScale: 1,
    equippedOffsetByFacing: {
      down: { x: 14, y: 2 },
      right: { x: 2, y: 3 },
      left: { y: 3 },
      up: { x: -9, y: 3 },
    },
  },
  {
    itemId: "shield_leon",
    idItem: 2103,
    nivelMinimo: 14,
    nombre: "Escudo del león",
    reduccionDanioPercent: 0.11,
    resistenciaMagicaPercent: 0.05,
    valor: 5800,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/shields/escudoLeon_icon.png",
  },
  {
    itemId: "shield_torre",
    idItem: 2104,
    nivelMinimo: 20,
    nombre: "Escudo torre",
    reduccionDanioPercent: 0.14,
    resistenciaMagicaPercent: 0.06,
    valor: 7500,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/shields/escudoTorre_icon.png",
    equippedAssetPath: "/assets/ao/shields/escudoTorre.png",
    equippedScale: 1,
    equippedOffsetByFacing: {
      down: { x: 5 },
      right: { x: 2, y: 3 },
      up: { x: -5 },
    },
  },
];

export const HELMETS: HelmetData[] = [
  {
    itemId: "helmet_celada",
    idItem: 2201,
    nivelMinimo: 1,
    nombre: "Celada",
    reduccionDanioPercent: 0.03,
    resistenciaMagicaPercent: 0.02,
    valor: 1800,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/helms/celada_icon.png",
    equippedAssetPath: "/assets/ao/helms/celada.png",
    equippedSheetLayout: HELMET_EQUIPPED_SHEET_128_SWAD,
    equippedScale: 1,
    equippedOffsetByFacing: {
      down: { y: 8, x: 1 },
      up: { y: 6, x: 1  },
      left: { y: 6 },
      right: { y: 6 },
    },
  },
  {
    itemId: "helmet_casco_soldado",
    idItem: 2202,
    nivelMinimo: 6,
    nombre: "Casco de soldado",
    reduccionDanioPercent: 0.05,
    resistenciaMagicaPercent: 0.02,
    valor: 3200,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/helms/cascoSoldado_icon.png",
    equippedAssetPath: "/assets/ao/helms/cascoSoldado.png",
    equippedSheetLayout: HELMET_EQUIPPED_SHEET_64_SWAD,
    equippedScale: 1,
    equippedOffsetByFacing: {
      down: { y: 8 },
      up: { y: 7 },
      left: { y: 9, x: -2 },
      right: { y: 9 },
    },
  },
  {
    itemId: "helmet_casco_gladiador",
    idItem: 2203,
    nivelMinimo: 12,
    nombre: "Casco de gladiador",
    reduccionDanioPercent: 0.06,
    resistenciaMagicaPercent: 0.03,
    valor: 4500,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/helms/cascoGladiador_icon.png",
    equippedAssetPath: "/assets/ao/helms/cascoGladiador.png",
    equippedSheetLayout: HELMET_EQUIPPED_SHEET_64_SWAD,
    equippedScale: 1,
    equippedOffsetByFacing: {
      down: { y: 8, x: 1 },
      up: { y: 7, x: 1 },
      left: { y: 9, x: -1 },
      right: { y: 9 },
    },
  },
  {
    itemId: "helmet_yelmo",
    idItem: 2204,
    nivelMinimo: 16,
    nombre: "Yelmo",
    reduccionDanioPercent: 0.07,
    resistenciaMagicaPercent: 0.03,
    valor: 5200,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/helms/yelmo_icon.png",
  },
  {
    itemId: "helmet_gorro_gris",
    idItem: 2205,
    nivelMinimo: 1,
    nombre: "Gorro gris",
    reduccionDanioPercent: 0.02,
    resistenciaMagicaPercent: 0.04,
    valor: 1400,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "/assets/ao/helms/gorroGris_icon.png",
    equippedAssetPath: "/assets/ao/helms/gorroGris.png",
    equippedSheetLayout: HELMET_EQUIPPED_SHEET_64_SWAD,
    equippedScale: 1,
    equippedOffsetByFacing: { up: { y: -2 } },
  },
  {
    itemId: "helmet_gorro_negro",
    idItem: 2206,
    nivelMinimo: 1,
    nombre: "Gorro negro",
    reduccionDanioPercent: 0.02,
    resistenciaMagicaPercent: 0.04,
    valor: 1500,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "/assets/ao/helms/gorroNegro_icon.png",
    equippedAssetPath: "/assets/ao/helms/gorroNegro.png",
    equippedSheetLayout: HELMET_EQUIPPED_SHEET_64_SWAD,
    equippedScale: 1,
    equippedOffsetByFacing: { up: { y: -2 } },
  },
  {
    itemId: "helmet_gorro_rm_diez",
    idItem: 2207,
    nivelMinimo: 10,
    nombre: "Gorro RM X",
    reduccionDanioPercent: 0.03,
    resistenciaMagicaPercent: 0.06,
    valor: 3800,
    equipablePor: MANA_CLASSES,
    iconAssetPath: "/assets/ao/helms/gorroRmDiez_icon.png",
    equippedAssetPath: "/assets/ao/helms/gorroRmDiez.png",
    equippedSheetLayout: HELMET_EQUIPPED_SHEET_64_SWAD,
    equippedScale: 1,
    equippedOffsetByFacing: { up: { y: -2 } },
  },
  {
    itemId: "helmet_gorro_rm_treinta",
    idItem: 2208,
    nivelMinimo: 22,
    nombre: "Gorro RM XXX",
    reduccionDanioPercent: 0.04,
    resistenciaMagicaPercent: 0.08,
    valor: 6200,
    equipablePor: MANA_CLASSES,
    iconAssetPath: "/assets/ao/helms/gorroRmTreinta_icon.png",
    equippedAssetPath: "/assets/ao/helms/gorroRmTreinta.png",
    equippedSheetLayout: HELMET_EQUIPPED_SHEET_128_SWAD,
    equippedScale: 1,
  },
  {
    itemId: "helmet_casco_alado",
    idItem: 2210,
    nivelMinimo: 25,
    nombre: "Casco alado",
    reduccionDanioPercent: 0.06,
    resistenciaMagicaPercent: 0.04,
    valor: 8500,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/helms/cascoAlado_icon.png",
    equippedAssetPath: "/assets/ao/helms/cascoAlado.png",
    equippedSheetLayout: HELMET_EQUIPPED_SHEET_128_SWAD,
    equippedScale: 1,
    equippedOffsetByFacing: { down: { y: 12, x: 1}, up: { y: 8 }, left: { y: 14 }, right: { y: 14 } },
  },
  {
    itemId: "helmet_tunica_dorada",
    idItem: 2209,
    nivelMinimo: 18,
    nombre: "Tiara dorada",
    reduccionDanioPercent: 0.03,
    resistenciaMagicaPercent: 0.07,
    valor: 5800,
    equipablePor: MANA_CLASSES,
    iconAssetPath: "/assets/ao/helms/corona_icon.png",
    equippedAssetPath: "/assets/ao/helms/corona.png",
    equippedSheetLayout: HELMET_EQUIPPED_SHEET_128_SWAD,
    equippedScale: 1,
  },
];

export const ARMORS: ArmorData[] = [
  {
    itemId: "armor_cuero",
    idItem: 2001,
    nivelMinimo: 1,
    nombre: "Armadura de cuero",
    reduccionDanioPercent: 0.14,
    resistenciaMagicaPercent: 0.08,
    valor: 4200,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/armors/cuero_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "/assets/ao/armors/cuero_std.png",
    outfitOverride: "cuero",
  },
  {
    itemId: "armor_placas",
    idItem: 2002,
    nivelMinimo: 12,
    nombre: "Armadura de placas",
    reduccionDanioPercent: 0.18,
    resistenciaMagicaPercent: 0.04,
    valor: 5600,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/armors/placas_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "/assets/ao/armors/placas_std.png",
    outfitOverride: "placas",
  },
  {
    itemId: "armor_placas_rojas",
    idItem: 2003,
    nivelMinimo: 18,
    nombre: "Armadura de placas rojas",
    reduccionDanioPercent: 0.2,
    resistenciaMagicaPercent: 0.05,
    valor: 6200,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/armors/placasRojas_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "/assets/ao/armors/placasRojas_std.png",
    outfitOverride: "placasRojas",
  },
  {
    itemId: "armor_placas_azules",
    idItem: 2004,
    nivelMinimo: 18,
    nombre: "Armadura de placas azules",
    reduccionDanioPercent: 0.2,
    resistenciaMagicaPercent: 0.05,
    valor: 6200,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/armors/placasAzules_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "/assets/ao/armors/placasAzules_std.png",
    outfitOverride: "placasAzules",
  },
  {
    itemId: "armor_tunica_nigro",
    idItem: 2005,
    nivelMinimo: 1,
    nombre: "Túnica negra",
    reduccionDanioPercent: 0.12,
    resistenciaMagicaPercent: 0.15,
    valor: 3800,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "/assets/ao/armors/tunicaNigro_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "/assets/ao/armors/tunicaNigro_std.png",
    outfitOverride: "tunicaNigro",
  },
  {
    itemId: "armor_tunica_azul",
    idItem: 2006,
    nivelMinimo: 1,
    nombre: "Túnica azul",
    reduccionDanioPercent: 0.12,
    resistenciaMagicaPercent: 0.15,
    valor: 3800,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "/assets/ao/armors/tunicaAzul_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "/assets/ao/armors/tunicaAzul_std.png",
    outfitOverride: "tunicaAzul",
  },
  {
    itemId: "armor_tunica_cruz",
    idItem: 2010,
    nivelMinimo: 1,
    nombre: "Túnica Cruz",
    reduccionDanioPercent: 0.13,
    resistenciaMagicaPercent: 0.16,
    valor: 4300,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "/assets/ao/armors/tunicaCruz_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "/assets/ao/armors/tunicaCruz_Std.png",
    outfitOverride: "tunicaCruz",
  },
  {
    itemId: "armor_citizen_bajos",
    idItem: 2007,
    nivelMinimo: 1,
    nombre: "Ropa de ciudadano (bajos)",
    reduccionDanioPercent: 0.04,
    resistenciaMagicaPercent: 0.02,
    valor: 1200,
    equipablePor: ALL_CLASSES,
    iconAssetPath: "/assets/ao/armors/citizenClothesBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "/assets/ao/armors/citizenClothesBajos_std.png",
    outfitOverride: "citizen",
  },
  {
    itemId: "armor_dragon_negro",
    idItem: 2009,
    nivelMinimo: 1,
    nombre: "Armadura Dragón Negro",
    reduccionDanioPercent: 0.16,
    resistenciaMagicaPercent: 0.1,
    valor: 5200,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/armors/dragonNegro_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "/assets/ao/armors/dragonNegro_std.png",
    outfitOverride: "dragonNegro",
  },
  {
    itemId: "armor_dragon_negro_bajos",
    idItem: 2008,
    nivelMinimo: 1,
    nombre: "Armadura Dragón Negro (bajos)",
    reduccionDanioPercent: 0.16,
    resistenciaMagicaPercent: 0.1,
    valor: 5200,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/armors/dragonNegroBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "/assets/ao/armors/dragonNegroBajos_std.png",
    outfitOverride: "dragonNegroBajos",
  },
  {
    itemId: "armor_dragon_blanco",
    idItem: 2011,
    nivelMinimo: 1,
    nombre: "Armadura Dragón Blanco",
    reduccionDanioPercent: 0.16,
    resistenciaMagicaPercent: 0.1,
    valor: 5200,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/armors/dragonBlanco_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "/assets/ao/armors/dragonBlanco_std.png",
    outfitOverride: "dragonBlanco",
  },
  {
    itemId: "armor_dragon_blanco_bajos",
    idItem: 2012,
    nivelMinimo: 1,
    nombre: "Armadura Dragón Blanco (bajos)",
    reduccionDanioPercent: 0.16,
    resistenciaMagicaPercent: 0.1,
    valor: 5200,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/armors/dragonBlancoBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "/assets/ao/armors/dragonBlancoBajos_std.png",
    outfitOverride: "dragonBlancoBajos",
  },
  {
    itemId: "armor_dragon_rojo",
    idItem: 2013,
    nivelMinimo: 1,
    nombre: "Armadura Dragón Rojo",
    reduccionDanioPercent: 0.16,
    resistenciaMagicaPercent: 0.1,
    valor: 5200,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/armors/dragonRojo_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "/assets/ao/armors/dragonRojo_std.png",
    outfitOverride: "dragonRojo",
  },
  {
    itemId: "armor_dragon_rojo_bajos",
    idItem: 2014,
    nivelMinimo: 1,
    nombre: "Armadura Dragón Rojo (bajos)",
    reduccionDanioPercent: 0.16,
    resistenciaMagicaPercent: 0.1,
    valor: 5200,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/armors/dragonRojoBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "/assets/ao/armors/dragonRojoBajos_std.png",
    outfitOverride: "dragonRojoBajos",
  },
];

export const MISC_ITEMS: MiscItemData[] = [
  {
    itemId: "anillo_espectral",
    idItem: 4001,
    nivelMinimo: 20,
    nombre: "Anillo Espectral",
    valor: 15000,
    usableBy: MANA_CLASSES,
    iconAssetPath: "/assets/ao/otherItems/anilloEspectral.png",
    maxStack: 10_000,
  },
];

export const CONSUMABLES: ConsumableData[] = [
  {
    itemId: "potion_hp",
    idItem: 3001,
    nivelMinimo: 1,
    nombre: "Poción de vida",
    valor: 250,
    usableBy: ALL_CLASSES,
    iconAssetPath: "/assets/ao/otherItems/pocion_hp_icon.png",
    healHpPercent: 0.08,
  },
  {
    itemId: "potion_mp",
    idItem: 3005,
    nivelMinimo: 1,
    nombre: "Poción de maná",
    valor: 280,
    usableBy: MANA_CLASSES,
    iconAssetPath: "/assets/ao/otherItems/pocionMana.png",
    restoreMpPercent: 0.08,
  },
  {
    itemId: "potion_strength",
    idItem: 3006,
    nivelMinimo: 1,
    nombre: "Poción de fuerza",
    valor: 350,
    usableBy: ALL_CLASSES,
    iconAssetPath: "/assets/ao/otherItems/pocionVerde.png",
    attributeBuff: "strength",
  },
  {
    itemId: "potion_agility",
    idItem: 3007,
    nivelMinimo: 1,
    nombre: "Poción de agilidad",
    valor: 350,
    usableBy: ALL_CLASSES,
    iconAssetPath: "/assets/ao/otherItems/pocionAmarilla.png",
    attributeBuff: "agility",
  },
  {
    itemId: "scroll_implosion",
    idItem: 3002,
    nivelMinimo: 24,
    nombre: "Scroll de Implosion",
    valor: 4200,
    usableBy: MANA_CLASSES,
    iconAssetPath: "/assets/ao/spells/spellFuerte.png",
    maxStack: 10_000,
    learnSpellId: 7,
  },
  {
    itemId: "scroll_paralizar",
    idItem: 3003,
    nivelMinimo: 20,
    nombre: "Scroll de Paralizar",
    valor: 5200,
    usableBy: MANA_CLASSES,
    iconAssetPath: "/assets/ao/spells/spell7.png",
    maxStack: 10_000,
    learnSpellId: 10,
  },
  {
    itemId: "scroll_tormenta",
    idItem: 3004,
    nivelMinimo: 30,
    nombre: "Scroll de Tormenta Electrica",
    valor: 11000,
    usableBy: MANA_CLASSES,
    iconAssetPath: "/assets/ao/spells/spellDruida.png",
    maxStack: 10_000,
    learnSpellId: 11,
  },
];
