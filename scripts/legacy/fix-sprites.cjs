const fs = require('fs');

let playerSprites = fs.readFileSync('src/player/playerSprites.ts', 'utf8');

const newOutfits = [
  'atuendoBanquero', 'ropaEleganteBajos', 'tunicaClerigo', 
  'tunicaDruidaBajos', 'tunicaRmQuince', 'placasRojasBajos',
  'caballeroDeMuerte', 'caballeroDeMuerteBajos', 'caballeroOscuro'
];

for (const o of newOutfits) {
  playerSprites = playerSprites.replace(/placasDoradas: "(.*?)",/, 'placasDoradas: "$1",\n  ' + o + ': "' + o + '",');
  playerSprites = playerSprites.replace(/placasDoradas: \{ x: 0, y: 0 \},/, 'placasDoradas: { x: 0, y: 0 },\n  ' + o + ': { x: 0, y: 0 },');
}

fs.writeFileSync('src/player/playerSprites.ts', playerSprites);
console.log('Fixed playerSprites.ts');
