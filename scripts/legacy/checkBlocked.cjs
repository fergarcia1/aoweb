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
function getBoolean(b, o) {
  const val = b.readInt16LE(o.val);
  o.val += 2;
  return val !== 0;
}

getString(buf, offset, 255);
getInt32(buf, offset);
getInt32(buf, offset);

const numBloqueados = getInt32(buf, offset);

for(let i=0; i<4; i++) getInt32(buf, offset);
const numTriggers = getInt32(buf, offset);
for(let i=0; i<5; i++) getInt32(buf, offset);

getInt16(buf, offset); getInt16(buf, offset); getInt16(buf, offset); getInt16(buf, offset);
getString(buf, offset); getBoolean(buf, offset); getBoolean(buf, offset); getString(buf, offset);
getString(buf, offset); getString(buf, offset); getString(buf, offset); getString(buf, offset);
getString(buf, offset); getInt32(buf, offset); getInt32(buf, offset); getBoolean(buf, offset);

for (let y = 0; y < 100; y++) {
  for (let x = 0; x < 100; x++) {
    getInt32(buf, offset);
  }
}

const tiles = Array.from({length: 100}, () => new Array(100).fill(false));
for (let i = 0; i < numBloqueados; i++) {
  const x = getInt16(buf, offset) - 1;
  const y = getInt16(buf, offset) - 1;
  tiles[y][x] = true;
}

for(let y=59; y<=66; y++) {
  let row = `Y=${y.toString().padStart(2, ' ')}: `;
  for(let x=56; x<=66; x++) {
    row += tiles[y][x] ? 'B ' : '. ';
  }
  console.log(row);
}
