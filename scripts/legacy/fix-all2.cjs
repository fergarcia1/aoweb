const fs = require('fs');

let catalog = fs.readFileSync('game-data/items/catalog.ts', 'utf8');

// Fix WeaponItemId
const weaponKeys = ['weapon_espada_plata', 'weapon_hacha_plata'];
for (const k of weaponKeys) {
  if (!catalog.includes('"' + k + '"', catalog.indexOf('export type WeaponItemId'))) {
    catalog = catalog.replace(/\| "weapon_baston_esmeralda";/, '| "weapon_baston_esmeralda"\n  | "' + k + '";');
  }
}

// Fix ShieldItemId
const shieldKeys = ['shield_reflex_treinta', 'shield_tortuga_mas_uno', 'shield_tortuga'];
for (const k of shieldKeys) {
  if (!catalog.includes('"' + k + '"', catalog.indexOf('export type ShieldItemId'))) {
    catalog = catalog.replace(/\| "shield_torre";/, '| "shield_torre"\n  | "' + k + '";');
  }
}

// Fix outfitOverride in ArmorData
const newOutfits = [
  'atuendoBanquero', 'ropaEleganteBajos', 'tunicaClerigo', 
  'tunicaDruidaBajos', 'tunicaRmQuince', 'placasRojasBajos',
  'caballeroDeMuerte', 'caballeroDeMuerteBajos', 'caballeroOscuro'
];
for (const o of newOutfits) {
  if (!catalog.includes('"' + o + '"', catalog.indexOf('outfitOverride:'))) {
    catalog = catalog.replace(/\| "placasDoradas";/, '| "placasDoradas"\n    | "' + o + '";');
  }
}

fs.writeFileSync('game-data/items/catalog.ts', catalog);

// Fix playerSprites.ts (it had 3 other occurrences of placasDoradas)
let ps = fs.readFileSync('src/player/playerSprites.ts', 'utf8');
let addedPaths = newOutfits.map(o => '  ' + o + ': "' + o + '",').join('\n');
ps = ps.replace(/placasDoradas: "placasDoradas",/g, 'placasDoradas: "placasDoradas",\n' + addedPaths);

let addedOffsets = newOutfits.map(o => '  ' + o + ': { x: 0, y: 0 },').join('\n');
ps = ps.replace(/placasDoradas: \{ x: 0, y: 0 \},/g, 'placasDoradas: { x: 0, y: 0 },\n' + addedOffsets);

// There is also outfitToArmorId maps? Let's fix them if needed. 
// No, the error says: "missing the following properties... atuendoBanquero, ropaEleganteBajos..."
// In playerSprites.ts around line 121, 141, 161

fs.writeFileSync('src/player/playerSprites.ts', ps);
console.log('Fixed catalog and playerSprites');
