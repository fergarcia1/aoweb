const fs = require('fs');
let catalog = fs.readFileSync('game-data/items/catalog.ts', 'utf8');

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

const outfitKeys = [
  'atuendoBanquero', 'ropaEleganteBajos', 'tunicaClerigo', 
  'tunicaDruidaBajos', 'tunicaRmQuince', 'placasRojasBajos',
  'caballeroDeMuerte', 'caballeroDeMuerteBajos', 'caballeroOscuro'
];
for (const k of outfitKeys) {
  if (!catalog.includes('"' + k + '"')) {
    catalog = catalog.replace(/\| "placasDoradas";/, '| "placasDoradas"\n    | "' + k + '";');
  }
}

fs.writeFileSync('game-data/items/catalog.ts', catalog);
console.log('Fixed catalog.ts');
