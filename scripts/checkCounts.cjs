const fs = require('fs');

const buf = fs.readFileSync('C:/Users/imaga/Desktop/imperiumclassic/Imperium-Clasico/Fixtures/Recursos descomprimidos/Mapas/mapa1.csm');

let offset = { val: 0 };
function getInt16(b, o) { const val = b.readInt16LE(o.val); o.val += 2; return val; }
function getInt32(b, o) { const val = b.readInt32LE(o.val); o.val += 4; return val; }
function getString(b, o, len = -1) {
  if (len < 0) { len = getInt16(b, o); }
  if (len <= 0) return '';
  const str = b.toString('ascii', o.val, o.val + len).replace(/\0/g, '');
  o.val += len;
  return str;
}

getString(buf, offset, 255);
getInt32(buf, offset);
getInt32(buf, offset);

const numBloqueados = getInt32(buf, offset);
const numL2 = getInt32(buf, offset);
const numL3 = getInt32(buf, offset);
const numL4 = getInt32(buf, offset);
const numTriggers = getInt32(buf, offset);
const numLuces = getInt32(buf, offset);
const numParticulas = getInt32(buf, offset);
const numNPCs = getInt32(buf, offset);
const numOBJs = getInt32(buf, offset);
const numTE = getInt32(buf, offset);

console.log({
  numBloqueados,
  numL2,
  numL3,
  numL4,
  numTriggers,
  numLuces,
  numParticulas,
  numNPCs,
  numOBJs,
  numTE
});
