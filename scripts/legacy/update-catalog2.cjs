const fs = require('fs');
let catalog = fs.readFileSync('game-data/items/catalog.ts', 'utf8');

const newArmorData = [
  `  {
    itemId: "armor_atuendo_banquero",
    idItem: 2013,
    nivelMinimo: 1,
    nombre: "Atuendo de Banquero",
    reduccionDanioPercent: 0.05,
    resistenciaMagicaPercent: 0.05,
    valor: 1500,
    equipablePor: ALL_CLASSES,
    iconAssetPath: "/assets/ao/armors/atuendoBanquero_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "/assets/ao/armors/atuendoBanquero_std.png",
    outfitOverride: "atuendoBanquero",
  },`,
  `  {
    itemId: "armor_ropa_elegante_bajos",
    idItem: 2014,
    nivelMinimo: 1,
    nombre: "Ropa Elegante (bajos)",
    reduccionDanioPercent: 0.05,
    resistenciaMagicaPercent: 0.05,
    valor: 1500,
    equipablePor: ALL_CLASSES,
    iconAssetPath: "/assets/ao/armors/ropaElegenateBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "/assets/ao/armors/ropaEleganteBajos_std.png",
    outfitOverride: "ropaEleganteBajos",
  },`,
  `  {
    itemId: "armor_tunica_clerigo",
    idItem: 2015,
    nivelMinimo: 20,
    nombre: "Túnica de Clérigo",
    reduccionDanioPercent: 0.15,
    resistenciaMagicaPercent: 0.18,
    valor: 7500,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "/assets/ao/armors/tunicaClerigo_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "/assets/ao/armors/tunicaClerigo_std.png",
    outfitOverride: "tunicaClerigo",
  },`,
  `  {
    itemId: "armor_tunica_druida_bajos",
    idItem: 2016,
    nivelMinimo: 20,
    nombre: "Túnica de Druida (bajos)",
    reduccionDanioPercent: 0.15,
    resistenciaMagicaPercent: 0.18,
    valor: 7500,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "/assets/ao/armors/tunicaDruidaBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "/assets/ao/armors/tunicaDruidaBajos.png",
    outfitOverride: "tunicaDruidaBajos",
  },`,
  `  {
    itemId: "armor_tunica_rm_quince",
    idItem: 2017,
    nivelMinimo: 25,
    nombre: "Túnica RM Quince",
    reduccionDanioPercent: 0.16,
    resistenciaMagicaPercent: 0.20,
    valor: 9000,
    equipablePor: ROBES_CLASSES,
    iconAssetPath: "/assets/ao/armors/tunicaRmQuince_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "/assets/ao/armors/tunicaRmQuinceBajos.png",
    outfitOverride: "tunicaRmQuince",
  },`,
  `  {
    itemId: "armor_placas_rojas_bajos",
    idItem: 2018,
    nivelMinimo: 18,
    nombre: "Armadura de Placas Rojas (bajos)",
    reduccionDanioPercent: 0.2,
    resistenciaMagicaPercent: 0.05,
    valor: 6200,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/armors/placasRojasBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "/assets/ao/armors/placasRojasBajos_std.png",
    outfitOverride: "placasRojasBajos",
  },`,
  `  {
    itemId: "armor_caballero_muerte",
    idItem: 2019,
    nivelMinimo: 30,
    nombre: "Armadura Caballero de la Muerte",
    reduccionDanioPercent: 0.25,
    resistenciaMagicaPercent: 0.1,
    valor: 15000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/armors/caballeroDeMuerte_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "/assets/ao/armors/caballeroDeMuerte_std.png",
    outfitOverride: "caballeroDeMuerte",
  },`,
  `  {
    itemId: "armor_caballero_muerte_bajos",
    idItem: 2020,
    nivelMinimo: 30,
    nombre: "Armadura Caballero de la Muerte (bajos)",
    reduccionDanioPercent: 0.25,
    resistenciaMagicaPercent: 0.1,
    valor: 15000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/armors/caballeroDeMuerteBajos_icon.png",
    clasesBajas: true,
    spritesheetBajosPath: "/assets/ao/armors/caballeroDeMuerteBajos_std.png",
    outfitOverride: "caballeroDeMuerteBajos",
  },`,
  `  {
    itemId: "armor_caballero_oscuro",
    idItem: 2021,
    nivelMinimo: 30,
    nombre: "Armadura Caballero Oscuro",
    reduccionDanioPercent: 0.25,
    resistenciaMagicaPercent: 0.1,
    valor: 15000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/armors/caballeroOscuro_icon.png",
    clasesBajas: false,
    spritesheetStdPath: "/assets/ao/armors/caballeroOscuro_std.png",
    outfitOverride: "caballeroOscuro",
  },`
];

const newShieldData = [
  `  {
    itemId: "shield_reflex_treinta",
    idItem: 2105,
    nivelMinimo: 25,
    nombre: "Escudo Reflex +30",
    reduccionDanioPercent: 0.15,
    resistenciaMagicaPercent: 0.10,
    valor: 9500,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/shields/escudoReflexTreinta_icon.png",
    equippedAssetPath: "/assets/ao/shields/escudoReflexTreinta_std.png",
    equippedScale: 1,
    equippedOffsetByFacing: { down: { x: 5 }, right: { x: 2, y: 3 }, up: { x: -5 } },
  },`,
  `  {
    itemId: "shield_tortuga_mas_uno",
    idItem: 2106,
    nivelMinimo: 18,
    nombre: "Escudo Tortuga +1",
    reduccionDanioPercent: 0.12,
    resistenciaMagicaPercent: 0.08,
    valor: 6500,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/shields/escudoTortugaMasUno_icon.png",
    equippedAssetPath: "/assets/ao/shields/escudoTortugaMasUno_std.png",
    equippedScale: 1,
    equippedOffsetByFacing: { down: { x: 5 }, right: { x: 2, y: 3 }, up: { x: -5 } },
  },`,
  `  {
    itemId: "shield_tortuga",
    idItem: 2107,
    nivelMinimo: 15,
    nombre: "Escudo Tortuga",
    reduccionDanioPercent: 0.10,
    resistenciaMagicaPercent: 0.06,
    valor: 5000,
    equipablePor: HEAVY_ARMOR_CLASSES,
    iconAssetPath: "/assets/ao/shields/escudoTortuga_icon.png",
    equippedAssetPath: "/assets/ao/shields/escudoTortuga_std.png",
    equippedScale: 1,
    equippedOffsetByFacing: { down: { x: 5 }, right: { x: 2, y: 3 }, up: { x: -5 } },
  },`
];

const newWeaponData = [
  `  {
    itemId: "weapon_espada_plata",
    idItem: 1006,
    nivelMinimo: 10,
    nombre: "Espada de Plata",
    danioMin: 180,
    danioMax: 200,
    velocidadAtaqueMs: 800,
    valor: 6000,
    equipablePor: MARTIAL_CLASSES,
    iconAssetPath: "/assets/ao/weapons/espadaPlata_icon.png",
    equippedAssetPath: "/assets/ao/weapons/espadaPlata_std.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },`,
  `  {
    itemId: "weapon_hacha_plata",
    idItem: 1007,
    nivelMinimo: 15,
    nombre: "Hacha de Plata",
    danioMin: 200,
    danioMax: 230,
    velocidadAtaqueMs: 900,
    valor: 7500,
    equipablePor: MARTIAL_CLASSES,
    iconAssetPath: "/assets/ao/weapons/hachaPlata_icon.png",
    equippedAssetPath: "/assets/ao/weapons/hachaPlata_std.png",
    equippedFrameWidth: 32,
    equippedFrameHeight: 48,
    equippedScale: 1,
  },`
];

for (const data of newArmorData) {
  if (!catalog.includes(data.split('\n')[1].trim())) {
    catalog = catalog.replace(/];\n\nexport const MISC_ITEMS/, data + '\n];\n\nexport const MISC_ITEMS');
  }
}

for (const data of newShieldData) {
  if (!catalog.includes(data.split('\n')[1].trim())) {
    catalog = catalog.replace(/];\n\nexport const HELMETS/, data + '\n];\n\nexport const HELMETS');
  }
}

for (const data of newWeaponData) {
  if (!catalog.includes(data.split('\n')[1].trim())) {
    catalog = catalog.replace(/];\n\nexport const SHIELDS/, data + '\n];\n\nexport const SHIELDS');
  }
}

// Add ItemKeys for the new items
let defs = fs.readFileSync('game-data/items/catalog.ts', 'utf8');

const armorKeys = [
  'armor_atuendo_banquero', 'armor_ropa_elegante_bajos', 'armor_tunica_clerigo',
  'armor_tunica_druida_bajos', 'armor_tunica_rm_quince', 'armor_placas_rojas_bajos',
  'armor_caballero_muerte', 'armor_caballero_muerte_bajos', 'armor_caballero_oscuro'
];

for (const k of armorKeys) {
  if (!catalog.includes('"' + k + '"')) {
    catalog = catalog.replace(/\| "armor_placas_doradas";/, '| "armor_placas_doradas"\n    | "' + k + '";');
  }
}

const shieldKeys = [
  'shield_reflex_treinta', 'shield_tortuga_mas_uno', 'shield_tortuga'
];
for (const k of shieldKeys) {
  if (!catalog.includes('"' + k + '"')) {
    catalog = catalog.replace(/\| "shield_torre";/, '| "shield_torre"\n  | "' + k + '";');
  }
}

const weaponKeys = [
  'weapon_espada_plata', 'weapon_hacha_plata'
];
for (const k of weaponKeys) {
  if (!catalog.includes('"' + k + '"')) {
    catalog = catalog.replace(/\| "weapon_baston_esmeralda";/, '| "weapon_baston_esmeralda"\n  | "' + k + '";');
  }
}

fs.writeFileSync('game-data/items/catalog.ts', catalog);
console.log('Updated catalog.ts');
