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

export type WeaponData = {
  itemId: "weapon_saramiana";
  idItem: number;
  nombre: string;
  danioMin: number;
  danioMax: number;
  velocidadAtaqueMs: number;
  valor: number;
  equipablePor: CharacterClassId[];
  iconAssetPath: string;
  equippedAssetPath: string;
  equippedFrameWidth: number;
  equippedFrameHeight: number;
  equippedScale: number;
};

export type ArmorData = {
  itemId: "armor_cuero" | "armor_placas" | "armor_placas_rojas" | "armor_placas_azules";
  idItem: number;
  nombre: string;
  reduccionDanioPercent: number;
  valor: number;
  equipablePor: CharacterClassId[];
  iconAssetPath: string;
  outfitOverride: "cuero" | "placas" | "placasRojas" | "placasAzules";
};

export type ConsumableData = {
  itemId: "potion_hp" | "scroll_implosion";
  idItem: number;
  nombre: string;
  valor: number;
  usableBy: CharacterClassId[];
  iconAssetPath: string;
  maxStack?: number;
  healHpPercent?: number;
  learnSpellId?: number;
};

export const WEAPONS: WeaponData[] = [
  {
    itemId: "weapon_saramiana",
    idItem: 1001,
    nombre: "Espada",
    danioMin: 180,
    danioMax: 200,
    velocidadAtaqueMs: 800,
    valor: 6500,
    equipablePor: ALL_CLASSES,
    iconAssetPath: "/assets/ao/weapons/weapon_saramiana_icon.png",
    equippedAssetPath: "/assets/ao/weapons/weapon_saramiana.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },
];

export const ARMORS: ArmorData[] = [
  {
    itemId: "armor_cuero",
    idItem: 2001,
    nombre: "Armadura de cuero",
    reduccionDanioPercent: 0.14,
    valor: 4200,
    equipablePor: ALL_CLASSES,
    iconAssetPath: "/assets/ao/armors/armor_cuero_icon.png",
    outfitOverride: "cuero",
  },
  {
    itemId: "armor_placas",
    idItem: 2002,
    nombre: "Armadura de placas",
    reduccionDanioPercent: 0.18,
    valor: 5600,
    equipablePor: ALL_CLASSES,
    iconAssetPath: "/assets/ao/armors/armor_placas_icon.png",
    outfitOverride: "placas",
  },
  {
    itemId: "armor_placas_rojas",
    idItem: 2003,
    nombre: "Armadura de placas rojas",
    reduccionDanioPercent: 0.2,
    valor: 6200,
    equipablePor: ALL_CLASSES,
    iconAssetPath: "/assets/ao/armors/armor_placasRojas_icon.png",
    outfitOverride: "placasRojas",
  },
  {
    itemId: "armor_placas_azules",
    idItem: 2004,
    nombre: "Armadura de placas azules",
    reduccionDanioPercent: 0.2,
    valor: 6200,
    equipablePor: ALL_CLASSES,
    iconAssetPath: "/assets/ao/armors/armor_placasAzules_icon.png",
    outfitOverride: "placasAzules",
  },
];

export const CONSUMABLES: ConsumableData[] = [
  {
    itemId: "potion_hp",
    idItem: 3001,
    nombre: "Poción de vida",
    valor: 250,
    usableBy: ALL_CLASSES,
    iconAssetPath: "/assets/ao/otherItems/pocion_hp_icon.png",
    healHpPercent: 0.08,
  },
  {
    itemId: "scroll_implosion",
    idItem: 3002,
    nombre: "Scroll de Implosion",
    valor: 4200,
    usableBy: MANA_CLASSES,
    iconAssetPath: "/assets/ao/spells/spellFuerte.png",
    maxStack: 1,
    learnSpellId: 7,
  },
];
