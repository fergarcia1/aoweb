const fs = require('fs');
const content = fs.readFileSync('C:/Users/imaga/Desktop/AOWEB/src/maps/mapa1.ts', 'utf8');

const matchL3 = content.match(/const L3 = (\[.*?\]);/);
const matchL4 = content.match(/const L4 = (\[.*?\]);/);
if (matchL3 && matchL4) {
  const L3 = JSON.parse(matchL3[1]);
  const L4 = JSON.parse(matchL4[1]);
  
  console.log('--- L3 (y=60 to 65, x=58 to 64) ---');
  for (let y = 60; y <= 65; y++) {
    let row = `Y=${y}: `;
    for (let x = 58; x <= 64; x++) {
      row += L3[y][x].toString().padStart(4, ' ') + ' ';
    }
    console.log(row);
  }
  console.log('\n--- L4 (y=60 to 65, x=58 to 64) ---');
  for (let y = 60; y <= 65; y++) {
    let row = `Y=${y}: `;
    for (let x = 58; x <= 64; x++) {
      row += L4[y][x].toString().padStart(4, ' ') + ' ';
    }
    console.log(row);
  }
}
