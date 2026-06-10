const fs = require('fs');

// 1. game-data/items/catalog.ts
let catalog = fs.readFileSync('game-data/items/catalog.ts', 'utf8');

const weaponKeys = ['weapon_espada_plata', 'weapon_hacha_plata'];
for (const k of weaponKeys) {
  if (!catalog.includes('"' + k + '"', catalog.indexOf('export type WeaponItemId'))) {
    catalog = catalog.replace(/\| "weapon_baston_esmeralda";/, '| "weapon_baston_esmeralda"\n  | "' + k + '";');
  }
}

const shieldKeys = ['shield_reflex_treinta', 'shield_tortuga_mas_uno', 'shield_tortuga'];
for (const k of shieldKeys) {
  if (!catalog.includes('"' + k + '"', catalog.indexOf('export type ShieldItemId'))) {
    catalog = catalog.replace(/\| "shield_torre";/, '| "shield_torre"\n  | "' + k + '";');
  }
}

// Just replace ArmorData itemId union manually:
catalog = catalog.replace(
  /export type ArmorData = \{\n  itemId:\n([\s\S]*?);\n  idItem: number;/m,
  `export type ArmorData = {
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
    | "armor_caballero_oscuro";
  idItem: number;`
);

// Fix outfitOverride union in ArmorData
catalog = catalog.replace(
  /  outfitOverride:\n([\s\S]*?);\n  \/\*\* Si true, no se dropea al morir/m,
  `  outfitOverride:
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
    | "caballeroOscuro";
  /** Si true, no se dropea al morir`
);

fs.writeFileSync('game-data/items/catalog.ts', catalog);

// 2. game-data/outfits.ts
let outfits = fs.readFileSync('game-data/outfits.ts', 'utf8');
outfits = outfits.replace(
  /export type Outfit =\n([\s\S]*?);/m,
  `export type Outfit =
  | "base"
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
  | "caballeroOscuro";`
);
outfits = outfits.replace(
  /const VALID_OUTFITS = new Set<string>\(\[\n([\s\S]*?)\n\]\);/m,
  `const VALID_OUTFITS = new Set<string>([
  "base",
  "citizen",
  "cuero",
  "placas",
  "placasRojas",
  "placasAzules",
  "tunicaNigro",
  "tunicaAzul",
  "tunicaCruz",
  "dragonNegro",
  "dragonNegroBajos",
  "dragonBlanco",
  "dragonBlancoBajos",
  "dragonRojo",
  "dragonRojoBajos",
  "armaduraAse",
  "dragonBlancoFem",
  "placasDoradas",
  "atuendoBanquero",
  "ropaEleganteBajos",
  "tunicaClerigo",
  "tunicaDruidaBajos",
  "tunicaRmQuince",
  "placasRojasBajos",
  "caballeroDeMuerte",
  "caballeroDeMuerteBajos",
  "caballeroOscuro"
]);`
);
fs.writeFileSync('game-data/outfits.ts', outfits);

// 3. game-data/items/definitions.ts
let definitions = fs.readFileSync('game-data/items/definitions.ts', 'utf8');
definitions = definitions.replace(
  /export type ItemId =\n([\s\S]*?);\n\nexport type ItemType/m,
  `export type ItemId =
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
  | "armor_citizen_bajos"
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
  | "anillo_espectral";

export type ItemType`
);
fs.writeFileSync('game-data/items/definitions.ts', definitions);

console.log('Fixed everything properly');
