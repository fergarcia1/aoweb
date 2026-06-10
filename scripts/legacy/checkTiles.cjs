const fs = require('fs');
const content = fs.readFileSync('C:/Users/imaga/Desktop/AOWEB/src/maps/mapa1.ts', 'utf8');
const lines = content.split('\n');
const tileLines = lines.filter(l => l.includes('TILE.'));
if (tileLines.length > 40) {
  const line39 = tileLines[39];
  const line40 = tileLines[40];
  const parseLine = (line) => line.split(',').map(s => s.replace(/['\[\]]/g, '').trim());
  const arr39 = parseLine(line39);
  const arr40 = parseLine(line40);
  console.log('Y=39 X=43 (wall):', arr39[43]);
  console.log('Y=39 X=44 (doorway):', arr39[44]);
  console.log('Y=39 X=45 (doorway):', arr39[45]);
  console.log('Y=39 X=46 (wall):', arr39[46]);
  console.log('Y=40 X=44 (ground):', arr40[44]);
}
