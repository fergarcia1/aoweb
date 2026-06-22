import type { Facing } from "../../shared/types";
import type { ItemSpecialUse } from "./itemSpecialUse";
import { OTHER_MISC_ITEMS, type OtherMiscItemId } from "./otherItemsCatalog";

export type CharacterClassId =
  | "paladin"
  | "clerigo"
  | "mago"
  | "nigromante"
  | "druida"
  | "bardo"
  | "guerrero"
  | "cazador"
  | "asesino";

const ALL_CLASSES: CharacterClassId[] = [
  "paladin",
  "clerigo",
  "mago",
  "nigromante",
  "druida",
  "bardo",
  "guerrero",
  "cazador",
  "asesino",
];
const MANA_CLASSES: CharacterClassId[] = [
  "paladin",
  "clerigo",
  "mago",
  "nigromante",
  "druida",
  "bardo",
  "asesino",
];
/** Solo bardo para nudillos. */
const BARD_CLASSES: CharacterClassId[] = ["bardo"];
const MARTIAL_CLASSES: CharacterClassId[] = [
  "guerrero",
  "paladin",
  "clerigo",
  "cazador",
  "asesino",
];
const ROBES_CLASSES: CharacterClassId[] = [
  "mago",
  "nigromante",
  "druida",
  "paladin",
  "clerigo",
  "asesino",
];
const HEAVY_ARMOR_CLASSES: CharacterClassId[] = [
  "guerrero",
  "paladin",
  "clerigo",
  "cazador",
  "asesino",
];

export type WeaponItemId =
  | "weapon_saramiana"
  | "weapon_espada_plata_mas_uno"
  | "weapon_daga_mas_dos"
  | "weapon_baculo_aqualin"
  | "weapon_baculo_lazurt"
  | "weapon_baston_esmeralda"
  | "weapon_baston"
  | "weapon_espada_plata"
  | "weapon_espada_viento"
  | "weapon_espada_larga"
  | "weapon_hacha_plata"
  | "weapon_hacha_guerra"
  | "weapon_arco_cazador"
  | "weapon_arco_largo"
  | "weapon_sable"
  | "weapon_cuchilla_esmeralda"
  | "weapon_mata_dragones"
  | "weapon_varita_dm_cuatro"
  | "weapon_nudillos_bronce"
  | "weapon_nudillos_plata"
  | "weapon_nudillos_oro";

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
  | "shield_torre"
  | "shield_reflex_treinta"
  | "shield_tortuga_mas_uno"
  | "shield_tortuga";

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
  /** Probabilidad de bloquear daño físico (0.18 = 18%). */
  probabilidadBloqueoPercent: number;
  /** Reducción de daño al bloquear (0.38 = 38%). Solo físico, no hechizos. */
  reduccionAlBloquearPercent: number;
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
    | "armor_coraza"
    | "armor_corazaBajos"
    | "armor_cueroBajos"
    | "armor_placasAzulesFem"
    | "armor_placasVerdes"
    | "armor_tunicaMagoBajos"
    | "armor_tunicaRoja"
    | "armor_tunicaRojaBajos"
    | "armor_tunicaClerigoBajos"
    | "armor_tunicaDruida"
    | "armor_caballero_oscuro";
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
  spritesheetFemalePath?: string;
  /** Spritesheet por raza (p. ej. orc → citizenClothesOrc_std). */
  spritesheetPathsByRace?: Partial<
    Record<"human" | "elf" | "drow" | "dwarf" | "gnome" | "orc" | "fantasma", string>
  >;
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
    | "dragonRojoBajos"
    | "armaduraAse"
    | "dragonBlancoFem"
    | "placasDoradas"
    | "atuendoBanquero"
    | "ropaEleganteBajos"
    | "tunicaClerigo"
    | "tunicaDruidaBajos"
    | "tunicaRmQuince"
    | "placasRojasBajos"
    | "caballeroDeMuerte"
    | "caballeroDeMuerteBajos"
    | "caballeroOscuro"
    | "coraza"
    | "corazaBajos"
    | "cueroBajos"
    | "placasAzulesFem"
    | "placasVerdes"
    | "tunicaMagoBajos"
    | "tunicaRoja"
    | "tunicaRojaBajos"
    | "tunicaClerigoBajos"
    | "tunicaDruida";
  /** Si true, no se dropea al morir. */
  noDropeaAlMorir?: boolean;
};

export type MiscItemId = "anillo_espectral" | OtherMiscItemId;

export type MiscItemData = {
  itemId: MiscItemId;
  idItem: number;
  nivelMinimo: number;
  nombre: string;
  valor: number;
  usableBy: CharacterClassId[];
  iconAssetPath: string;
  maxStack?: number;
  /** Si true, no se dropea al morir (ej. barca). */
  noDropeaAlMorir?: boolean;
  /** Doble click en inventario dispara el uso especial. */
  usableFromInventory?: boolean;
  specialUse?: ItemSpecialUse;
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
    danioMin: 200,
    danioMax: 200,
    velocidadAtaqueMs: 800,
    valor: 6500,
    equipablePor: MARTIAL_CLASSES,
    iconAssetPath: "assets/ao/weapons/saramiana_icon.png",
    equippedAssetPath: "assets/ao/weapons/saramiana.png",
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
    iconAssetPath: "assets/ao/weapons/espadaPlataMasUno_icon.png",
    equippedAssetPath: "assets/ao/weapons/espadaPlataMasUno.png",
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
    velocidadAtaqueMs: 750,
    valor: 4800,
    maxStack: 10_000,
    equipablePor: MARTIAL_CLASSES,
    iconAssetPath: "assets/ao/weapons/dagaMasDos_icon.png",
    equippedAssetPath: "assets/ao/weapons/dagaMasDos.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_baculo_lazurt",
    idItem: 1004,
    nivelMinimo: 1,
    nombre: "Báculo lazurt",
    danioMin: 150,
    danioMax: 175,
    aumentoDanioMagicoPercent: 0.12,
    velocidadAtaqueMs: 800,
    valor: 8500,
    equipablePor: MANA_CLASSES,
    iconAssetPath: "assets/ao/weapons/baculoLazurt_icon.png",
    equippedAssetPath: "assets/ao/weapons/baculoLazurt.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_baculo_aqualin",
    idItem: 1006,
    nivelMinimo: 1,
    nombre: "Báculo Aqualin",
    danioMin: 125,
    danioMax: 145,
    aumentoDanioMagicoPercent: 0.12,
    velocidadAtaqueMs: 800,
    valor: 8600,
    equipablePor: MANA_CLASSES,
    iconAssetPath: "assets/ao/weapons/baculoAqualin_icon.png",
    equippedAssetPath: "assets/ao/weapons/baculoAqualin.png",
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
    velocidadAtaqueMs: 800,
    valor: 7800,
    equipablePor: MANA_CLASSES,
    iconAssetPath: "assets/ao/weapons/bastonEsmeralda_icon.png",
    equippedAssetPath: "assets/ao/weapons/bastonEsmeralda.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_baston",
    idItem: 1008,
    nivelMinimo: 1,
    nombre: "Bastón",
    danioMin: 20,
    danioMax: 28,
    aumentoDanioMagicoPercent: 0.08,
    velocidadAtaqueMs: 800,
    valor: 6800,
    equipablePor: MANA_CLASSES,
    iconAssetPath: "assets/ao/weapons/baston_icon.png",
    equippedAssetPath: "assets/ao/weapons/baston.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_espada_plata",
    idItem: 1009,
    nivelMinimo: 1,
    nombre: "Espada de plata",
    danioMin: 167,
    danioMax: 190,
    velocidadAtaqueMs: 800,
    valor: 7000,
    equipablePor: MARTIAL_CLASSES,
    iconAssetPath: "assets/ao/weapons/espadaPlata_icon.png",
    equippedAssetPath: "assets/ao/weapons/espadaPlata.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_espada_larga",
    idItem: 1010,
    nivelMinimo: 1,
    nombre: "Espada larga",
    danioMin: 25,
    danioMax: 40,
    velocidadAtaqueMs: 780,
    valor: 6400,
    equipablePor: MARTIAL_CLASSES,
    iconAssetPath: "assets/ao/weapons/espadaLarga_icon.png",
    equippedAssetPath: "assets/ao/weapons/espadaLarga.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_espada_viento",
    idItem: 1011,
    nivelMinimo: 8,
    nombre: "Espada de viento",
    danioMin: 195,
    danioMax: 220,
    velocidadAtaqueMs: 760,
    valor: 8400,
    equipablePor: MARTIAL_CLASSES,
    iconAssetPath: "assets/ao/weapons/espadaViento_icon.png",
    equippedAssetPath: "assets/ao/weapons/espadaViento.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_hacha_plata",
    idItem: 1012,
    nivelMinimo: 1,
    nombre: "Hacha de plata",
    danioMin: 190,
    danioMax: 210,
    velocidadAtaqueMs: 900,
    valor: 7600,
    equipablePor: MARTIAL_CLASSES,
    iconAssetPath: "assets/ao/weapons/hachaPlata_icon.png",
    equippedAssetPath: "assets/ao/weapons/hachaPlata.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_hacha_guerra",
    idItem: 1013,
    nivelMinimo: 12,
    nombre: "Hacha de guerra",
    danioMin: 180,
    danioMax: 200,
    velocidadAtaqueMs: 900,
    valor: 9800,
    equipablePor: MARTIAL_CLASSES,
    iconAssetPath: "assets/ao/weapons/hachaGuerra_icon.png",
    equippedAssetPath: "assets/ao/weapons/hachaGuerra.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_arco_cazador",
    idItem: 1014,
    nivelMinimo: 1,
    nombre: "Arco cazador",
    danioMin: 160,
    danioMax: 185,
    velocidadAtaqueMs: 800,
    valor: 6200,
    equipablePor: ["cazador"],
    iconAssetPath: "assets/ao/weapons/arcoCazador_icon.png",
    equippedAssetPath: "assets/ao/weapons/arcoCazador.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_arco_largo",
    idItem: 1015,
    nivelMinimo: 10,
    nombre: "Arco largo",
    danioMin: 120,
    danioMax: 150,
    velocidadAtaqueMs: 800,
    valor: 8400,
    equipablePor: ["cazador"],
    iconAssetPath: "assets/ao/weapons/arcoLargo_icon.png",
    equippedAssetPath: "assets/ao/weapons/arcoLargo.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_sable",
    idItem: 1016,
    nivelMinimo: 6,
    nombre: "Sable",
    danioMin: 75,
    danioMax: 115,
    velocidadAtaqueMs: 800,
    valor: 7600,
    equipablePor: MARTIAL_CLASSES,
    iconAssetPath: "assets/ao/weapons/sable_icon.png",
    equippedAssetPath: "assets/ao/weapons/sable.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_cuchilla_esmeralda",
    idItem: 1017,
    nivelMinimo: 12,
    nombre: "Cuchilla esmeralda",
    danioMin: 140,
    danioMax: 160,
    velocidadAtaqueMs: 700,
    valor: 9800,
    equipablePor: MARTIAL_CLASSES,
    iconAssetPath: "assets/ao/weapons/cuchillaEsmeralda_icon.png",
    equippedAssetPath: "assets/ao/weapons/cuchillaEsmeralda.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_mata_dragones",
    idItem: 1018,
    nivelMinimo: 20,
    nombre: "Mata dragones",
    danioMin: 200,
    danioMax: 205,
    velocidadAtaqueMs: 800,
    valor: 15000,
    equipablePor: MARTIAL_CLASSES,
    iconAssetPath: "assets/ao/weapons/mataDragones_icon.png",
    equippedAssetPath: "assets/ao/weapons/mataDragones.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_varita_dm_cuatro",
    idItem: 1019,
    nivelMinimo: 1,
    nombre: "Varita DM IV",
    danioMin: 70,
    danioMax: 90,
    aumentoDanioMagicoPercent: 0.4,
    velocidadAtaqueMs: 80,
    valor: 7000,
    equipablePor: MANA_CLASSES,
    iconAssetPath: "assets/ao/weapons/varitaDMCuatro_icon.png",
    equippedAssetPath: "assets/ao/weapons/varitaDMCuatro.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_nudillos_bronce",
    idItem: 1020,
    nivelMinimo: 1,
    nombre: "Nudillos de bronce",
    danioMin: 20,
    danioMax: 40,
    velocidadAtaqueMs: 800,
    valor: 2600,
    equipablePor: BARD_CLASSES,
    iconAssetPath: "assets/ao/weapons/nudillosBronce_icon.png",
    equippedAssetPath: "assets/ao/weapons/nudillosBronce.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_nudillos_plata",
    idItem: 1021,
    nivelMinimo: 8,
    nombre: "Nudillos de plata",
    danioMin: 140,
    danioMax: 165,
    velocidadAtaqueMs: 800,
    valor: 4600,
    equipablePor: BARD_CLASSES,
    iconAssetPath: "assets/ao/weapons/nudillosPlata_icon.png",
    equippedAssetPath: "assets/ao/weapons/nudillosPlata.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
  {
    itemId: "weapon_nudillos_oro",
    idItem: 1022,
    nivelMinimo: 14,
    nombre: "Nudillos de oro",
    danioMin: 160,
    danioMax: 185,
    velocidadAtaqueMs: 800,
    valor: 7200,
    equipablePor: BARD_CLASSES,
    iconAssetPath: "assets/ao/weapons/nudillosOro_icon.png",
    equippedAssetPath: "assets/ao/weapons/nudillosOro.png",
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
    probabilidadBloqueoPercent: 0.15,
    reduccionAlBloquearPercent: 0.38,
    resistenciaMagicaPercent: 0.00,
    valor: 2800,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/shields/escudoPlata_icon.png",
    equippedAssetPath: "assets/ao/shields/escudoPlata.png",
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
    probabilidadBloqueoPercent: 0.12,
    reduccionAlBloquearPercent: 0.30,
    resistenciaMagicaPercent: 0.00,
    valor: 4200,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/shields/escudoPlataDos_icon.png",
    equippedAssetPath: "assets/ao/shields/escudoPlataDos.png",
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
    probabilidadBloqueoPercent: 0.18,
    reduccionAlBloquearPercent: 0.40,
    resistenciaMagicaPercent: 0.05,
    valor: 5800,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/shields/escudoLeon_icon.png",
    equippedAssetPath: "assets/ao/shields/escudoLeon.png",
    equippedScale: 1,
    equippedOffsetByFacing: {
      down: { x: 7, y: 1 },
      right: { x: 2, y: 3 },
      left: { y: 3 },
      up: { x: -7, y: 2 },
    },
  },
  {
    itemId: "shield_torre",
    idItem: 2104,
    nivelMinimo: 20,
    nombre: "Escudo torre",
    probabilidadBloqueoPercent: 0.20,
    reduccionAlBloquearPercent: 0.42,
    resistenciaMagicaPercent: 0.06,
    valor: 7500,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/shields/escudoTorre_icon.png",
    equippedAssetPath: "assets/ao/shields/escudoTorre.png",
    equippedScale: 1,
    equippedOffsetByFacing: {
      down: { x: 5 },
      right: { x: 2, y: 3 },
      up: { x: -5 },
    },
  },
  {
    itemId: "shield_reflex_treinta",
    idItem: 2105,
    nivelMinimo: 25,
    nombre: "Escudo Reflex +30",
    probabilidadBloqueoPercent: 0.2,
    reduccionAlBloquearPercent: 0.4,
    resistenciaMagicaPercent: 0.30,
    valor: 9500,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/shields/escudoReflexTreinta_icon.png",
    equippedAssetPath: "assets/ao/shields/escudoReflexTreinta.png",
    equippedScale: 1,
    equippedOffsetByFacing: {
      down: { x: 5 },
      right: { x: 2, y: 3 },
      up: { x: -5 },
    },
  },
  {
    itemId: "shield_tortuga_mas_uno",
    idItem: 2106,
    nivelMinimo: 18,
    nombre: "Escudo Tortuga +1",
    probabilidadBloqueoPercent: 0.2,
    reduccionAlBloquearPercent: 0.4,
    resistenciaMagicaPercent: 0.00,
    valor: 6500,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/shields/escudoTortugaMasUno_icon.png",
    equippedAssetPath: "assets/ao/shields/escudoTortugaMasUno.png",
    equippedScale: 1,
    equippedOffsetByFacing: {
      down: { x: 5 },
      right: { x: 2, y: 3 },
      up: { x: -5 },
    },
  },
  {
    itemId: "shield_tortuga",
    idItem: 2107,
    nivelMinimo: 15,
    nombre: "Escudo Tortuga",
    probabilidadBloqueoPercent: 0.22,
    reduccionAlBloquearPercent: 0.30,
    resistenciaMagicaPercent: 0.00,
    valor: 2600,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/shields/escudoTortuga_icon.png",
    equippedAssetPath: "assets/ao/shields/escudoTortuga.png",
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
    reduccionDanioPercent: 0.12,
    resistenciaMagicaPercent: 0.00,
    valor: 7500,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/helms/celada_icon.png",
    equippedAssetPath: "assets/ao/helms/celada.png",
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
    reduccionDanioPercent: 0.10,
    resistenciaMagicaPercent: 0.00,
    valor: 3200,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/helms/cascoSoldado_icon.png",
    equippedAssetPath: "assets/ao/helms/cascoSoldado.png",
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
    reduccionDanioPercent: 0.16,
    resistenciaMagicaPercent: 0.00,
    valor: 50000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/helms/cascoGladiador_icon.png",
    equippedAssetPath: "assets/ao/helms/cascoGladiador.png",
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
    reduccionDanioPercent: 0.15,
    resistenciaMagicaPercent: 0.00,
    valor: 12000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/helms/yelmo_icon.png",
  },
  {
    itemId: "helmet_gorro_gris",
    idItem: 2205,
    nivelMinimo: 1,
    nombre: "Gorro gris",
    reduccionDanioPercent: 0.10,
    resistenciaMagicaPercent: 0.04,
    valor: 10000,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "assets/ao/helms/gorroGris_icon.png",
    equippedAssetPath: "assets/ao/helms/gorroGris.png",
    equippedSheetLayout: HELMET_EQUIPPED_SHEET_64_SWAD,
    equippedScale: 1,
    equippedOffsetByFacing: { up: { y: -2 } },
  },
  {
    itemId: "helmet_gorro_negro",
    idItem: 2206,
    nivelMinimo: 1,
    nombre: "Gorro negro",
    reduccionDanioPercent: 0.08,
    resistenciaMagicaPercent: 0.04,
    valor: 3200,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "assets/ao/helms/gorroNegro_icon.png",
    equippedAssetPath: "assets/ao/helms/gorroNegro.png",
    equippedSheetLayout: HELMET_EQUIPPED_SHEET_64_SWAD,
    equippedScale: 1,
    equippedOffsetByFacing: { up: { y: -2 } },
  },
  {
    itemId: "helmet_gorro_rm_diez",
    idItem: 2207,
    nivelMinimo: 10,
    nombre: "Gorro RM X",
    reduccionDanioPercent: 0.12,
    resistenciaMagicaPercent: 0.10,
    valor: 50000,
    equipablePor: MANA_CLASSES,
    iconAssetPath: "assets/ao/helms/gorroRmDiez_icon.png",
    equippedAssetPath: "assets/ao/helms/gorroRmDiez.png",
    equippedSheetLayout: HELMET_EQUIPPED_SHEET_64_SWAD,
    equippedScale: 1,
    equippedOffsetByFacing: { up: { y: -2 } },
  },
  {
    itemId: "helmet_gorro_rm_treinta",
    idItem: 2208,
    nivelMinimo: 22,
    nombre: "Gorro RM XXX",
    reduccionDanioPercent: 0.14,
    resistenciaMagicaPercent: 0.30,
    valor: 50000,
    equipablePor: MANA_CLASSES,
    iconAssetPath: "assets/ao/helms/gorroRmTreinta_icon.png",
    equippedAssetPath: "assets/ao/helms/gorroRmTreinta.png",
    equippedSheetLayout: HELMET_EQUIPPED_SHEET_128_SWAD,
    equippedScale: 1,
  },
  {
    itemId: "helmet_casco_alado",
    idItem: 2210,
    nivelMinimo: 25,
    nombre: "Casco alado",
    reduccionDanioPercent: 0.25,
    resistenciaMagicaPercent: 0.15,
    valor: 50000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/helms/cascoAlado_icon.png",
    equippedAssetPath: "assets/ao/helms/cascoAlado.png",
    equippedSheetLayout: HELMET_EQUIPPED_SHEET_128_SWAD,
    equippedScale: 1,
    equippedOffsetByFacing: { down: { y: 12, x: 1}, up: { y: 8 }, left: { y: 14 }, right: { y: 14 } },
  },
  {
    itemId: "helmet_tunica_dorada",
    idItem: 2209,
    nivelMinimo: 18,
    nombre: "Tiara dorada",
    reduccionDanioPercent: 0.20,
    resistenciaMagicaPercent: 0.05,
    valor: 50000,
    equipablePor: MANA_CLASSES,
    iconAssetPath: "assets/ao/helms/corona_icon.png",
    equippedAssetPath: "assets/ao/helms/corona.png",
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
    resistenciaMagicaPercent: 0.00,
    valor: 2800,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/cuero_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/cuero_std.png",
    spritesheetFemalePath: "assets/ao/armors/cueroFem_std.png",
    outfitOverride: "cuero",
  },
  {
    itemId: "armor_placas",
    idItem: 2002,
    nivelMinimo: 12,
    nombre: "Armadura de placas",
    reduccionDanioPercent: 0.19,
    resistenciaMagicaPercent: 0.00,
    valor: 5600,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/placas_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/placas_std.png",
    outfitOverride: "placas",
  },
  {
    itemId: "armor_placas_rojas",
    idItem: 2003,
    nivelMinimo: 18,
    nombre: "Armadura de placas rojas",
    reduccionDanioPercent: 0.22,
    resistenciaMagicaPercent: 0.00,
    valor: 13000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/placasRojas_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/placasRojas_std.png",
    outfitOverride: "placasRojas",
  },
  {
    itemId: "armor_placas_azules",
    idItem: 2004,
    nivelMinimo: 18,
    nombre: "Armadura de placas azules",
    reduccionDanioPercent: 0.22,
    resistenciaMagicaPercent: 0.0,
    valor: 13000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/placasAzules_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/placasAzules_std.png",
    outfitOverride: "placasAzules",
  },
  {
    itemId: "armor_tunica_nigro",
    idItem: 2005,
    nivelMinimo: 1,
    nombre: "Túnica negra",
    reduccionDanioPercent: 0.18,
    resistenciaMagicaPercent: 0.06,
    valor: 13000,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "assets/ao/armors/tunicaNigro_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/tunicaNigro_std.png",
    outfitOverride: "tunicaNigro",
  },
  {
    itemId: "armor_tunica_azul",
    idItem: 2006,
    nivelMinimo: 1,
    nombre: "Túnica azul",
    reduccionDanioPercent: 0.08,
    resistenciaMagicaPercent: 0.05,
    valor: 4000,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "assets/ao/armors/tunicaAzul_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/tunicaAzul_std.png",
    outfitOverride: "tunicaAzul",
  },
  {
    itemId: "armor_tunica_cruz",
    idItem: 2010,
    nivelMinimo: 1,
    nombre: "Túnica Cruz",
    reduccionDanioPercent: 0.08,
    resistenciaMagicaPercent: 0.05,
    valor: 4000,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "assets/ao/armors/tunicaCruz_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/tunicaCruz_Std.png",
    outfitOverride: "tunicaCruz",
  },
  {
    itemId: "armor_citizen",
    idItem: 2007,
    nivelMinimo: 1,
    nombre: "Ropa de ciudadano",
    reduccionDanioPercent: 0.04,
    resistenciaMagicaPercent: 0.02,
    valor: 1200,
    equipablePor: ALL_CLASSES,
    iconAssetPath: "assets/ao/armors/citizenClothes_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/citizenClothes_std.png",
    spritesheetBajosPath: "assets/ao/armors/citizenClothesBajos_std.png",
    spritesheetPathsByRace: {
      orc: "assets/ao/armors/citizenClothesOrc_std.png",
    },
    outfitOverride: "citizen",
  },
  {
    itemId: "armor_dragon_negro",
    idItem: 2009,
    nivelMinimo: 1,
    nombre: "Armadura Dragón Negro",
    reduccionDanioPercent: 0.30,
    resistenciaMagicaPercent: 0.1,
    valor: 50000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/dragonNegro_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/dragonNegro_std.png",
    outfitOverride: "dragonNegro",
  },
  {
    itemId: "armor_dragon_negro_bajos",
    idItem: 2008,
    nivelMinimo: 1,
    nombre: "Armadura Dragón Negro (bajos)",
    reduccionDanioPercent: 0.30,
    resistenciaMagicaPercent: 0.1,
    valor: 50000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/dragonNegroBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "assets/ao/armors/dragonNegroBajos_std.png",
    outfitOverride: "dragonNegroBajos",
  },
  {
    itemId: "armor_dragon_blanco",
    idItem: 2011,
    nivelMinimo: 1,
    nombre: "Armadura Dragón Blanco",
    reduccionDanioPercent: 0.30,
    resistenciaMagicaPercent: 0.1,
    valor: 50000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/dragonBlanco_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/dragonBlanco_std.png",
    outfitOverride: "dragonBlanco",
  },
  {
    itemId: "armor_dragon_blanco_bajos",
    idItem: 2012,
    nivelMinimo: 1,
    nombre: "Armadura Dragón Blanco (bajos)",
    reduccionDanioPercent: 0.30,
    resistenciaMagicaPercent: 0.1,
    valor: 50000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/dragonBlancoBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "assets/ao/armors/dragonBlancoBajos_std.png",
    outfitOverride: "dragonBlancoBajos",
  },
  {
    itemId: "armor_dragon_rojo",
    idItem: 2013,
    nivelMinimo: 1,
    nombre: "Armadura Dragón Rojo",
    reduccionDanioPercent: 0.30,
    resistenciaMagicaPercent: 0.1,
    valor: 50000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/dragonRojo_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/dragonRojo_std.png",
    outfitOverride: "dragonRojo",
  },
  {
    itemId: "armor_dragon_rojo_bajos",
    idItem: 2014,
    nivelMinimo: 1,
    nombre: "Armadura Dragón Rojo (bajos)",
    reduccionDanioPercent: 0.30,
    resistenciaMagicaPercent: 0.1,
    valor: 50000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/dragonRojoBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "assets/ao/armors/dragonRojoBajos_std.png",
    outfitOverride: "dragonRojoBajos",
  },
  {
    itemId: "armor_atuendo_banquero",
    idItem: 2013,
    nivelMinimo: 1,
    nombre: "Atuendo de Banquero",
    reduccionDanioPercent: 0.05,
    resistenciaMagicaPercent: 0.05,
    valor: 1500,
    equipablePor: ALL_CLASSES,
    iconAssetPath: "assets/ao/armors/atuendoBanquero_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/atuendoBanquero_std.png",
    outfitOverride: "atuendoBanquero",
  },
  {
    itemId: "armor_ropa_elegante_bajos",
    idItem: 2014,
    nivelMinimo: 1,
    nombre: "Ropa Elegante (bajos)",
    reduccionDanioPercent: 0.05,
    resistenciaMagicaPercent: 0.05,
    valor: 1500,
    equipablePor: ALL_CLASSES,
    iconAssetPath: "assets/ao/armors/ropaElegenateBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "assets/ao/armors/ropaEleganteBajos_std.png",
    outfitOverride: "ropaEleganteBajos",
  },
  {
    itemId: "armor_tunica_clerigo",
    idItem: 2015,
    nivelMinimo: 20,
    nombre: "Túnica de Clérigo",
    reduccionDanioPercent: 0.18,
    resistenciaMagicaPercent: 0.08,
    valor: 13000,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "assets/ao/armors/tunicaClerigo_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/tunicaClerigo_std.png",
    spritesheetBajosPath: "assets/ao/armors/tunicaClerigoBajos_std.png",
    outfitOverride: "tunicaClerigo",
  },
  {
    itemId: "armor_tunica_druida_bajos",
    idItem: 2016,
    nivelMinimo: 20,
    nombre: "Túnica de Druida (bajos)",
    reduccionDanioPercent: 0.18,
    resistenciaMagicaPercent: 0.08,
    valor: 13000,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "assets/ao/armors/tunicaDruidaBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "assets/ao/armors/tunicaDruidaBajos.png",
    outfitOverride: "tunicaDruidaBajos",
  },
  {
    itemId: "armor_tunica_rm_quince",
    idItem: 2017,
    nivelMinimo: 25,
    nombre: "Túnica RM Quince",
    reduccionDanioPercent: 0.20,
    resistenciaMagicaPercent: 0.15,
    valor: 50000,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "assets/ao/armors/tunicaRmQuince_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "assets/ao/armors/tunicaRmQuinceBajos.png",
    outfitOverride: "tunicaRmQuince",
  },
  {
    itemId: "armor_placas_rojas_bajos",
    idItem: 2018,
    nivelMinimo: 18,
    nombre: "Armadura de Placas Rojas (bajos)",
    reduccionDanioPercent: 0.22,
    resistenciaMagicaPercent: 0.00,
    valor: 13000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/placasRojasBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "assets/ao/armors/placasRojasBajos_std.png",
    outfitOverride: "placasRojasBajos",
  },
  {
    itemId: "armor_caballero_muerte",
    idItem: 2019,
    nivelMinimo: 30,
    nombre: "Armadura Caballero de la Muerte",
    reduccionDanioPercent: 0.25,
    resistenciaMagicaPercent: 0.1,
    valor: 50000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/caballeroDeMuerte_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/caballeroDeMuerte_std.png",
    outfitOverride: "caballeroDeMuerte",
  },
  {
    itemId: "armor_caballero_muerte_bajos",
    idItem: 2020,
    nivelMinimo: 30,
    nombre: "Armadura Caballero de la Muerte (bajos)",
    reduccionDanioPercent: 0.25,
    resistenciaMagicaPercent: 0.1,
    valor: 50000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/caballeroDeMuerteBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "assets/ao/armors/caballeroDeMuerteBajos_std.png",
    outfitOverride: "caballeroDeMuerteBajos",
  },
  {
    itemId: "armor_caballero_oscuro",
    idItem: 2021,
    nivelMinimo: 30,
    nombre: "Armadura Caballero Oscuro",
    reduccionDanioPercent: 0.25,
    resistenciaMagicaPercent: 0.15,
    valor: 50000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/caballeroOscuro_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/caballeroOscuro_std.png",
    outfitOverride: "caballeroOscuro",
  },
  {
    itemId: "armor_asesino",
    idItem: 2015,
    nivelMinimo: 1,
    nombre: "Armadura Asesino",
    reduccionDanioPercent: 0.22,
    resistenciaMagicaPercent: 0.0,
    valor: 13000,
    equipablePor: ["asesino"],
    iconAssetPath: "assets/ao/armors/armaduraAse_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/armaduraAse_std.png",
    outfitOverride: "armaduraAse",
  },
  {
    itemId: "armor_dragon_blanco_fem",
    idItem: 2016,
    nivelMinimo: 40,
    nombre: "Armadura Dragón Blanco Fem",
    reduccionDanioPercent: 0.30,
    resistenciaMagicaPercent: 0.1,
    valor: 50000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/dragonBlancoFem_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/dragonBlancoFem_std.png",
    outfitOverride: "dragonBlancoFem",
  },
  {
    itemId: "armor_placas_doradas",
    idItem: 2017,
    nivelMinimo: 1,
    nombre: "Armadura Placas Doradas",
    reduccionDanioPercent: 0.22,
    resistenciaMagicaPercent: 0.10,
    valor: 50000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/placasDoradas_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/placasDoradas_std.png",
    outfitOverride: "placasDoradas",
  },
  {
    itemId: "armor_coraza",
    idItem: 2501,
    nivelMinimo: 1,
    nombre: "Coraza Negra",
    reduccionDanioPercent: 0.19,
    resistenciaMagicaPercent: 0.05,
    valor: 12000,
    equipablePor: ["clerigo", "nigromante"],
    iconAssetPath: "assets/ao/armors/coraza_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/coraza_std.png",
    outfitOverride: "coraza",
  },
  {
    itemId: "armor_corazaBajos",
    idItem: 2502,
    nivelMinimo: 1,
    nombre: "Coraza Negra(Bajos)",
    reduccionDanioPercent: 0.19,
    resistenciaMagicaPercent: 0.05,
    valor: 12000,
    equipablePor: ["clerigo", "nigromante"],
    iconAssetPath: "assets/ao/armors/corazaBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "assets/ao/armors/corazaBajos_std.png",
    outfitOverride: "corazaBajos",
  },
  {
    itemId: "armor_cueroBajos",
    idItem: 2503,
    nivelMinimo: 1,
    nombre: "Armadura de Cuero (Bajos)",
    reduccionDanioPercent: 0.14,
    resistenciaMagicaPercent: 0.0,
    valor: 2800,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/cueroBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "assets/ao/armors/cueroBajos_std.png",
    outfitOverride: "cueroBajos",
  },
  {
    itemId: "armor_placasAzulesFem",
    idItem: 2504,
    nivelMinimo: 18,
    nombre: "Armadura de Placas Azules (Fem)",
    reduccionDanioPercent: 0.22,
    resistenciaMagicaPercent: 0.0,
    valor: 13000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/placasAzulesFem_icon.png",
    clasesBajas: false,
    spritesheetFemalePath: "assets/ao/armors/placasAzulesFem_std.png",
    outfitOverride: "placasAzulesFem",
  },
  {
    itemId: "armor_placasVerdes",
    idItem: 2505,
    nivelMinimo: 18,
    nombre: "Armadura de Placas Verdes",
    reduccionDanioPercent: 0.22,
    resistenciaMagicaPercent: 0.0,
    valor: 13000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "assets/ao/armors/placasVerdes_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/placasVerdes_std.png",
    outfitOverride: "placasVerdes",
  },
  {
    itemId: "armor_tunicaMagoBajos",
    idItem: 2506,
    nivelMinimo: 1,
    nombre: "Túnica de Mago (Bajos)",
    reduccionDanioPercent: 0.10,
    resistenciaMagicaPercent: 0.05,
    valor: 5000,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "assets/ao/armors/tunicaMagoBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "assets/ao/armors/tunicaMagoBajos_std.png",
    outfitOverride: "tunicaMagoBajos",
  },
  {
    itemId: "armor_tunicaRoja",
    idItem: 2507,
    nivelMinimo: 10,
    nombre: "Túnica Roja",
    reduccionDanioPercent: 0.10,
    resistenciaMagicaPercent: 0.05,
    valor: 8000,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "assets/ao/armors/tunicaRoja_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/tunicaRoja_std.png",
    outfitOverride: "tunicaRoja",
  },
  {
    itemId: "armor_tunicaRojaBajos",
    idItem: 2508,
    nivelMinimo: 10,
    nombre: "Túnica Roja (Bajos)",
    reduccionDanioPercent: 0.10,
    resistenciaMagicaPercent: 0.05,
    valor: 8000,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "assets/ao/armors/tunicaRojaBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "assets/ao/armors/tunicaRojaBajos_std.png",
    outfitOverride: "tunicaRojaBajos",
  },
  {
    itemId: "armor_tunicaClerigoBajos",
    idItem: 2509,
    nivelMinimo: 10,
    nombre: "Túnica de Clérigo (Bajos)",
    reduccionDanioPercent: 0.10,
    resistenciaMagicaPercent: 0.05,
    valor: 8000,
    equipablePor: ["clerigo"],
    iconAssetPath: "assets/ao/armors/tunicaClerigoBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "assets/ao/armors/tunicaClerigoBajos_std.png",
    outfitOverride: "tunicaClerigoBajos",
  },
  {
    itemId: "armor_tunicaDruida",
    idItem: 2510,
    nivelMinimo: 10,
    nombre: "Túnica de Druida",
    reduccionDanioPercent: 0.10,
    resistenciaMagicaPercent: 0.05,
    valor: 8000,
    equipablePor: ["druida"],
    iconAssetPath: "assets/ao/armors/tunicaDruida_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "assets/ao/armors/tunicaDruida_std.png",
    outfitOverride: "tunicaDruida",
  }
];

export const MISC_ITEMS: MiscItemData[] = [
  {
    itemId: "anillo_espectral",
    idItem: 4001,
    nivelMinimo: 1,
    nombre: "Anillo Espectral",
    valor: 10000,
    usableBy: MANA_CLASSES,
    iconAssetPath: "assets/ao/otherItems/anilloEspectral.png",
    maxStack: 10_000,
    specialUse: { kind: "future", note: "Hechizos sin anillo equipado (pendiente)." },
    usableFromInventory: true,
  },
  ...OTHER_MISC_ITEMS,
];

export const CONSUMABLES: ConsumableData[] = [
  {
    itemId: "potion_hp",
    idItem: 3001,
    nivelMinimo: 1,
    nombre: "Poción de vida",
    valor: 10,
    usableBy: ALL_CLASSES,
    iconAssetPath: "assets/ao/otherItems/pocion_hp_icon.png",
    healHpPercent: 0.08,
  },
  {
    itemId: "potion_mp",
    idItem: 3005,
    nivelMinimo: 1,
    nombre: "Poción de maná",
    valor: 12,
    usableBy: MANA_CLASSES,
    iconAssetPath: "assets/ao/otherItems/pocionMana.png",
    restoreMpPercent: 0.08,
  },
  {
    itemId: "potion_strength",
    idItem: 3006,
    nivelMinimo: 1,
    nombre: "Poción de fuerza",
    valor: 25,
    usableBy: ALL_CLASSES,
    iconAssetPath: "assets/ao/otherItems/pocionVerde.png",
    attributeBuff: "strength",
  },
  {
    itemId: "potion_agility",
    idItem: 3007,
    nivelMinimo: 1,
    nombre: "Poción de agilidad",
    valor: 25,
    usableBy: ALL_CLASSES,
    iconAssetPath: "assets/ao/otherItems/pocionAmarilla.png",
    attributeBuff: "agility",
  },
  {
    itemId: "scroll_implosion",
    idItem: 3002,
    nivelMinimo: 24,
    nombre: "Scroll de Implosion",
    valor: 350000,
    usableBy: MANA_CLASSES,
    iconAssetPath: "assets/ao/spells/spellFuerte.png",
    maxStack: 10_000,
    learnSpellId: 7,
  },
  {
    itemId: "scroll_paralizar",
    idItem: 3003,
    nivelMinimo: 20,
    nombre: "Scroll de Paralizar",
    valor: 25000,
    usableBy: MANA_CLASSES,
    iconAssetPath: "assets/ao/spells/spell7.png",
    maxStack: 10_000,
    learnSpellId: 10,
  },
  {
    itemId: "scroll_tormenta",
    idItem: 3004,
    nivelMinimo: 30,
    nombre: "Scroll de Tormenta Electrica",
    valor: 38000,
    usableBy: MANA_CLASSES,
    iconAssetPath: "assets/ao/spells/spellDruida.png",
    maxStack: 10_000,
    learnSpellId: 11,
  },
];
