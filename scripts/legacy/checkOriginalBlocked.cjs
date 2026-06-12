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

getString(255); getInt32(); getInt32();

const numBloqueados = getInt32();
// skip rest of header
for(let i=0; i<4; i++) getInt32();
const numTriggers = getInt32();
for(let i=0; i<5; i++) getInt32();
getInt16(); getInt16(); getInt16(); getInt16();
getString(-1); getInt16(); getInt16(); getString(-1); getString(-1);
getString(-1); getString(-1); getString(-1); getString(-1);
getInt32(); getInt32(); getInt16();

// skip L1
for(let i=0; i<100*100; i++) getInt32();

const blockedTiles = Array.from({length: 100}, () => new Array(100).fill(false));
for (let i = 0; i < numBloqueados; i++) {
  const x = getInt16() - 1;
  const y = getInt16() - 1;
  blockedTiles[y][x] = true;
}

for(let y=63; y<=66; y++) {
  let row = `Y=${y}: `;
  for(let x=56; x<=66; x++) {
    row += blockedTiles[y][x] ? 'B ' : '. ';
  }
  console.log(row);
}
