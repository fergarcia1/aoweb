const fs = require('fs');
const content = fs.readFileSync('C:/Users/imaga/Desktop/AOWEB/src/maps/mapa1.ts', 'utf8');

const matchTiles = content.match(/tiles:\s*\[([\s\S]*?)\]/);
if (matchTiles) {
  const arr = JSON.parse('[' + matchTiles[1] + ']');
  for (let y = 43; y <= 47; y++) {
    let row = `Y=${y}: `;
    for (let x = 55; x <= 62; x++) {
      row += (arr[y][x] === 'TILE.GRASS_BLOCKED' ? 'B' : '.') + ' ';
    }
    console.log(row);
  }
}
