const fs = require('fs');

// Fix catalog.ts ArmorData
let catalog = fs.readFileSync('game-data/items/catalog.ts', 'utf8');
const armorKeys = [
  'armor_atuendo_banquero', 'armor_ropa_elegante_bajos', 'armor_tunica_clerigo',
  'armor_tunica_druida_bajos', 'armor_tunica_rm_quince', 'armor_placas_rojas_bajos',
  'armor_caballero_muerte', 'armor_caballero_muerte_bajos', 'armor_caballero_oscuro'
];
for (const k of armorKeys) {
  if (!catalog.includes('"' + k + '"', catalog.indexOf('export type ArmorData'))) {
    catalog = catalog.replace(/\| "armor_placas_doradas";/, '| "armor_placas_doradas"\n    | "' + k + '";');
  }
}
fs.writeFileSync('game-data/items/catalog.ts', catalog);

// Fix playerSprites.ts
let ps = fs.readFileSync('src/player/playerSprites.ts', 'utf8');
const newOutfits = [
  'atuendoBanquero', 'ropaEleganteBajos', 'tunicaClerigo', 
  'tunicaDruidaBajos', 'tunicaRmQuince', 'placasRojasBajos',
  'caballeroDeMuerte', 'caballeroDeMuerteBajos', 'caballeroOscuro'
];

for (const o of newOutfits) {
  if (!ps.includes(o + ': "' + o + '"')) {
    ps = ps.replace(/placasDoradas: "placasDoradas",/g, 'placasDoradas: "placasDoradas",\n  ' + o + ': "' + o + '",');
  }
  if (!ps.includes(o + ': { x: 0, y: 0 }')) {
    ps = ps.replace(/placasDoradas: \{ x: 0, y: 0 \},/g, 'placasDoradas: { x: 0, y: 0 },\n  ' + o + ': { x: 0, y: 0 },');
  }
}

fs.writeFileSync('src/player/playerSprites.ts', ps);
