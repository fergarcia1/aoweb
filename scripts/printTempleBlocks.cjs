const fs = require('fs');
const content = fs.readFileSync('C:/Users/imaga/Desktop/AOWEB/src/maps/mapa1.ts', 'utf8');

const startIndex = content.indexOf('tiles: [');
const endIndex = content.indexOf('],', startIndex);
if (startIndex !== -1 && endIndex !== -1) {
  const tilesStr = content.substring(startIndex, endIndex);
  const lines = tilesStr.split('\n').filter(l => l.includes('TILE.'));
  console.log('--- BLOCKS (Y=60 to 66, X=58 to 64) ---');
  for (let y = 60; y <= 66; y++) {
    if (!lines[y]) continue;
    const rowTiles = lines[y].split(',').map(s => s.replace(/['\[\]]/g, '').trim());
    let rowStr = `Y=${y.toString().padStart(2, ' ')}: `;
    for (let x = 58; x <= 64; x++) {
      rowStr += (rowTiles[x] === 'TILE.GRASS_BLOCKED' ? 'X ' : '. ');
    }
    console.log(rowStr);
  }
} else {
  console.log("No match");
}
