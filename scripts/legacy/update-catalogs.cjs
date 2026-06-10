const fs = require('fs');

let outfits = fs.readFileSync('game-data/outfits.ts', 'utf8');

const newOutfits = [
  'atuendoBanquero', 'ropaEleganteBajos', 'tunicaClerigo', 
  'tunicaDruidaBajos', 'tunicaRmQuince', 'placasRojasBajos',
  'caballeroDeMuerte', 'caballeroDeMuerteBajos', 'caballeroOscuro'
];

for (const o of newOutfits) {
  if (!outfits.includes('"' + o + '"')) {
    outfits = outfits.replace(/\| "placasDoradas";/, '| "placasDoradas"\n  | "' + o + '";');
    outfits = outfits.replace(/"placasDoradas",/, '"placasDoradas",\n  "' + o + '",');
  }
}
fs.writeFileSync('game-data/outfits.ts', outfits);
console.log('Updated outfits.ts');

let defs = fs.readFileSync('game-data/items/definitions.ts', 'utf8');

const armorKeys = [
  'armor_atuendo_banquero', 'armor_ropa_elegante_bajos', 'armor_tunica_clerigo',
  'armor_tunica_druida_bajos', 'armor_tunica_rm_quince', 'armor_placas_rojas_bajos',
  'armor_caballero_muerte', 'armor_caballero_muerte_bajos', 'armor_caballero_oscuro'
];

for (const k of armorKeys) {
  if (!defs.includes('"' + k + '"')) {
    defs = defs.replace(/\| "armor_placas_doradas"/, '| "armor_placas_doradas"\n  | "' + k + '"');
  }
}

const shieldKeys = [
  'shield_reflex_treinta', 'shield_tortuga_mas_uno', 'shield_tortuga'
];
for (const k of shieldKeys) {
  if (!defs.includes('"' + k + '"')) {
    defs = defs.replace(/\| "shield_torre";/, '| "shield_torre"\n  | "' + k + '";');
  }
}

const weaponKeys = [
  'weapon_espada_plata', 'weapon_hacha_plata'
];
for (const k of weaponKeys) {
  if (!defs.includes('"' + k + '"')) {
    defs = defs.replace(/\| "weapon_baston_esmeralda";/, '| "weapon_baston_esmeralda"\n  | "' + k + '";');
  }
}

fs.writeFileSync('game-data/items/definitions.ts', defs);
console.log('Updated definitions.ts');
