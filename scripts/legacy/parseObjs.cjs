const fs = require('fs');
const path = require('path');

const filePath = 'C:/Users/imaga/Desktop/imperiumclassic/Imperium-Clasico/Fixtures/Recursos descomprimidos/Mapas/mapa1.csm';
const buf = fs.readFileSync(filePath);
let pos = 0;

function getInt16() { const val = buf.readInt16LE(pos); pos += 2; return val; }
function getInt32() { const val = buf.readInt32LE(pos); pos += 4; return val; }
function getString(len) {
  if (len < 0) { len = getInt16(); }
  if (len <= 0) return '';
  const str = buf.toString('ascii', pos, pos + len).replace(/\0/g, '');
  pos += len;
  return str;
}

const desc = getString(255);
const crc = getInt32();
const magic = getInt32();

const numBloqueados = getInt32();
const numL2 = getInt32();
const numL3 = getInt32();
const numL4 = getInt32();
const numTriggers = getInt32();
const numLuces = getInt32();
const numParticulas = getInt32();
const numNPCs = getInt32();
const numOBJs = getInt32();
const numTE = getInt32();

// Skip MapSize and MapDat
getInt16(); getInt16(); getInt16(); getInt16();
getString(-1); getInt16(); getInt16(); getString(-1); getString(-1);
getString(-1); getString(-1); getString(-1); getString(-1);
getInt32(); getInt32(); getInt16();

// Skip L1
for (let j = 0; j < 100; j++) {
  for (let i = 0; i < 100; i++) {
    getInt32();
  }
}
// Skip Bloqueados
for (let i = 0; i < numBloqueados; i++) { getInt16(); getInt16(); }
// Skip L2
for (let i = 0; i < numL2; i++) { getInt16(); getInt16(); getInt32(); }
// Skip L3
for (let i = 0; i < numL3; i++) { getInt16(); getInt16(); getInt32(); }
// Skip L4
for (let i = 0; i < numL4; i++) { getInt16(); getInt16(); getInt32(); }
// Skip Triggers
for (let i = 0; i < numTriggers; i++) { getInt16(); getInt16(); getInt16(); }
// Skip Luces
for (let i = 0; i < numLuces; i++) { getInt16(); getInt16(); getInt32(); getInt32(); getInt32(); getInt32(); }
// Skip Particulas
for (let i = 0; i < numParticulas; i++) { getInt16(); getInt16(); getInt32(); }
// Skip NPCs
for (let i = 0; i < numNPCs; i++) { getInt16(); getInt16(); getInt16(); }

for (let i = 0; i < numOBJs; i++) {
  const x = getInt16() - 1;
  const y = getInt16() - 1;
  const objIndex = getInt16();
  const objAmount = getInt16();
  console.log(`OBJ at X=${x}, Y=${y}: index=${objIndex}, amount=${objAmount}`);
}
