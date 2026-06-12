const fs = require('fs');
const content = fs.readFileSync('C:/Users/imaga/Desktop/AOWEB/src/maps/mapa1.ts', 'utf8');

const matchL1 = content.match(/const L1 = (\[.*?\]);/);
if (matchL1) {
  const L1 = JSON.parse(matchL1[1]);
  console.log('Doorway L1:', L1[39][44], L1[39][45]);
}
