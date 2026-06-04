const fs = require('fs');
const content = fs.readFileSync('C:/Users/imaga/Desktop/AOWEB/src/maps/mapa1.ts', 'utf8');

const matchL3 = content.match(/const L3 = (\[.*?\]);/);
if (matchL3) {
  const L3 = JSON.parse(matchL3[1]);
  console.log('L3[39][43]:', L3[39][43]);
  console.log('L3[39][44]:', L3[39][44]);
  console.log('L3[39][45]:', L3[39][45]);
  console.log('L3[39][46]:', L3[39][46]);
}
