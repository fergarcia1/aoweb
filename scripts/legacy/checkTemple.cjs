const fs = require('fs');
const content = fs.readFileSync('C:/Users/imaga/Desktop/AOWEB/src/maps/mapa1.ts', 'utf8');

const matchTriggers = content.match(/roofTriggers: (\[.*?\])/);
if (matchTriggers) {
  const roofTriggers = JSON.parse(matchTriggers[1]);
  const templeTriggers = roofTriggers.filter(t => t.tileX >= 55 && t.tileX <= 65 && t.tileY >= 40 && t.tileY <= 50);
  console.log('Temple triggers:', templeTriggers.length > 0 ? templeTriggers : 'NONE');
  
  // also check the doorways around X=58, Y=45 (typical temple entrance)
  console.log('Is 58, 45 in triggers?', roofTriggers.some(t => t.tileX === 58 && t.tileY === 45));
}
