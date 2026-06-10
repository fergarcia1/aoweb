const fs = require('fs');
const content = fs.readFileSync('C:/Users/imaga/Desktop/AOWEB/src/maps/mapa1.ts', 'utf8');

const matchL1 = content.match(/const L1 = (\[.*?\]);/);
if (matchL1) {
  const L1 = JSON.parse(matchL1[1]);
  console.log('--- L1 (Y=63 to 67, X=56 to 64) ---');
  for (let y = 63; y <= 67; y++) {
    let row = `Y=${y}: `;
    for (let x = 56; x <= 64; x++) {
      row += L1[y][x].toString().padStart(4, ' ') + ' ';
    }
    console.log(row);
  }
}
