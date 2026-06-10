const fs = require('fs');

const outfits = [
  'armaduraAse', 'dragonBlancoFem', 'placasDoradas', 'atuendoBanquero',
  'ropaEleganteBajos', 'tunicaClerigo', 'tunicaDruidaBajos', 'tunicaRmQuince',
  'placasRojasBajos', 'caballeroDeMuerte', 'caballeroDeMuerteBajos', 'caballeroOscuro'
];

let ps = fs.readFileSync('src/player/playerSprites.ts', 'utf8');

const addedPaths = outfits.map(o => '  ' + o + ': "' + o + '",').join('\n');
const addedOffsets = outfits.map(o => '  ' + o + ': { x: 0, y: 0 },').join('\n');

// There are 4 dictionaries of type Record<Exclude<Outfit, "base">, string>
ps = ps.replace(/dragonRojoBajos: "dragonRojoBajos",/g, 'dragonRojoBajos: "dragonRojoBajos",\n' + addedPaths);

// There is 1 dictionary of type Record<Outfit, { x: number; y: number }>
ps = ps.replace(/dragonRojoBajos: \{ x: 0, y: -4 \},/g, 'dragonRojoBajos: { x: 0, y: -4 },\n' + addedOffsets);

fs.writeFileSync('src/player/playerSprites.ts', ps);
console.log('Fixed playerSprites.ts');
