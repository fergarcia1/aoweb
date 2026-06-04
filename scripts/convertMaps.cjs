const fs = require('fs');
const path = require('path');

const srcDir = 'C:/Users/imaga/Desktop/imperiumclassic/Imperium-Clasico/Fixtures/Recursos descomprimidos/Mapas';
const destDir = 'C:/Users/imaga/Desktop/AOWEB/src/maps';

function getString(buf, offsetObj, fixedLen = -1) {
  if (fixedLen >= 0) {
    const str = buf.toString('ascii', offsetObj.pos, offsetObj.pos + fixedLen).replace(/\0/g, '');
    offsetObj.pos += fixedLen;
    return str;
  } else {
    const len = buf.readInt16LE(offsetObj.pos);
    offsetObj.pos += 2;
    if (len <= 0) return '';
    const str = buf.toString('ascii', offsetObj.pos, offsetObj.pos + len).replace(/\0/g, '');
    offsetObj.pos += len;
    return str;
  }
}

function getBoolean(buf, offsetObj) {
  const val = buf.readInt16LE(offsetObj.pos);
  offsetObj.pos += 2;
  return val !== 0;
}

function getInt16(buf, offsetObj) {
  const val = buf.readInt16LE(offsetObj.pos);
  offsetObj.pos += 2;
  return val;
}

function getInt32(buf, offsetObj) {
  const val = buf.readInt32LE(offsetObj.pos);
  offsetObj.pos += 4;
  return val;
}

function parseMap(mapId) {
  const filePath = path.join(srcDir, `mapa${mapId}.csm`);
  if (!fs.existsSync(filePath)) {
    console.log(`Map ${mapId} does not exist.`);
    return;
  }

  const buf = fs.readFileSync(filePath);
  const offset = { pos: 0 };

  // Cabecera
  const desc = getString(buf, offset, 255);
  const crc = getInt32(buf, offset);
  const magic = getInt32(buf, offset);

  // tMapHeader
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

  // MapSize
  const xMax = getInt16(buf, offset);
  const xMin = getInt16(buf, offset);
  const yMax = getInt16(buf, offset);
  const yMin = getInt16(buf, offset);

  // MapDat
  const mapName = getString(buf, offset);
  const battleMode = getBoolean(buf, offset);
  const backupMode = getBoolean(buf, offset);
  const restrictMode = getString(buf, offset);
  const musicNumber = getString(buf, offset);
  const zone = getString(buf, offset);
  const terrain = getString(buf, offset);
  const ambient = getString(buf, offset);
  const lvlMinimo = getString(buf, offset);
  const luzBase = getInt32(buf, offset);
  const version = getInt32(buf, offset);
  const noTirarItems = getBoolean(buf, offset);

  // Init matrices
  const grhIndex = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/assets/ao/grh_index.json'), 'utf8'));

  function addFileNum(grhId, set) {
    if (grhId <= 0) return;
    let grh = grhIndex[grhId];
    if (!grh) return;
    if (grh.numFrames > 1 && grh.frames) {
      grh = grhIndex[grh.frames[0]];
    }
    if (grh && grh.fileNum) {
      set.add(grh.fileNum);
    }
  }

  const L1 = Array.from({length: 100}, () => new Array(100).fill(0));
  const L2 = Array.from({length: 100}, () => new Array(100).fill(0));
  const L3 = Array.from({length: 100}, () => new Array(100).fill(0));
  const L4 = Array.from({length: 100}, () => new Array(100).fill(0));
  const tiles = Array.from({length: 100}, () => new Array(100).fill('TILE.GRASS'));

  const fileNums = new Set();

  for (let j = 0; j < 100; j++) {
    for (let i = 0; i < 100; i++) {
      let l1Grh = getInt32(buf, offset);
      if (l1Grh > 0) {
        L1[j][i] = l1Grh;
        addFileNum(l1Grh, fileNums);
        
        if (l1Grh >= 6300 && l1Grh <= 6600) {
          tiles[j][i] = 'TILE.DIRT';
        } else {
          tiles[j][i] = 'TILE.GRASS';
        }
      }
    }
  }

  for (let i = 0; i < numBloqueados; i++) {
    let x = getInt16(buf, offset) - 1;
    let y = getInt16(buf, offset) - 1;
    if (x >= 0 && x < 100 && y >= 0 && y < 100) {
      tiles[y][x] = 'TILE.GRASS_BLOCKED';
    }
  }

  for (let i = 0; i < numL2; i++) {
    let x = getInt16(buf, offset) - 1;
    let y = getInt16(buf, offset) - 1;
    let grh = getInt32(buf, offset);
    if (x >= 0 && x < 100 && y >= 0 && y < 100 && grh > 0) {
      L2[y][x] = grh;
      addFileNum(grh, fileNums);
    }
  }

  for (let i = 0; i < numL3; i++) {
    let x = getInt16(buf, offset) - 1;
    let y = getInt16(buf, offset) - 1;
    let grh = getInt32(buf, offset);
    if (x >= 0 && x < 100 && y >= 0 && y < 100 && grh > 0) {
      L3[y][x] = grh;
      addFileNum(grh, fileNums);
    }
  }

  for (let i = 0; i < numL4; i++) {
    let x = getInt16(buf, offset) - 1;
    let y = getInt16(buf, offset) - 1;
    let grh = getInt32(buf, offset);
    if (x >= 0 && x < 100 && y >= 0 && y < 100 && grh > 0) {
      L4[y][x] = grh;
      addFileNum(grh, fileNums);
    }
  }

  const roofTriggers = [];
  for (let i = 0; i < numTriggers; i++) {
    let x = getInt16(buf, offset) - 1;
    let y = getInt16(buf, offset) - 1;
    let trigger = getInt16(buf, offset);
    if (x >= 0 && x < 100 && y >= 0 && y < 100) {
      if (trigger === 1 || trigger === 2) {
        roofTriggers.push({ tileX: x, tileY: y });
      }
    }
  }

  // Skip Luces
  for (let i = 0; i < numLuces; i++) {
    getInt16(buf, offset); getInt16(buf, offset); getInt32(buf, offset); getInt32(buf, offset); getInt32(buf, offset); getInt32(buf, offset);
  }
  // Skip Particulas
  for (let i = 0; i < numParticulas; i++) {
    getInt16(buf, offset); getInt16(buf, offset); getInt32(buf, offset);
  }
  // Skip NPCs
  for (let i = 0; i < numNPCs; i++) {
    getInt16(buf, offset); getInt16(buf, offset); getInt16(buf, offset);
  }

  // Parse OBJs
  const objs = [];
  for (let i = 0; i < numOBJs; i++) {
    let x = getInt16(buf, offset) - 1;
    let y = getInt16(buf, offset) - 1;
    let objIndex = getInt16(buf, offset);
    let objAmount = getInt16(buf, offset);
    if (x >= 0 && x < 100 && y >= 0 && y < 100) {
      objs.push({ tileX: x, tileY: y, objIndex, objAmount });
    }
  }



  // HACK: Triggers de techo faltantes en mapa1 (interiores sin BAJOTECHO en el CSM)
  if (filePath.endsWith('mapa1.csm')) {
    const addRoofTrigger = (x, y) => {
      if (x < 0 || y < 0 || x >= 100 || y >= 100) return;
      if (!roofTriggers.some((t) => t.tileX === x && t.tileY === y)) {
        roofTriggers.push({ tileX: x, tileY: y });
      }
    };
    // Casa de madera sur (puerta ~62–63,66)
    for (let x = 58; x <= 64; x++) {
      for (let y = 62; y <= 67; y++) {
        addRoofTrigger(x, y);
      }
    }
    // Banco (72,46)–(82,54)
    for (let x = 72; x <= 82; x++) {
      for (let y = 46; y <= 54; y++) {
        addRoofTrigger(x, y);
      }
    }
    // Templo (73,61)–(82,68)
    for (let x = 73; x <= 82; x++) {
      for (let y = 61; y <= 68; y++) {
        addRoofTrigger(x, y);
      }
    }
  }

  // Generate .ts file
  let tsContent = `import { TILE } from "./tileDefinitions";
import type { GameMap } from "./types";

const L1 = ${JSON.stringify(L1)};
const L2 = ${JSON.stringify(L2)};
const L3 = ${JSON.stringify(L3)};
const L4 = ${JSON.stringify(L4)};

export const MAP_MAPA${mapId}: GameMap = {
  id: "mapa${mapId}",
  name: "${mapName || 'Mapa ' + mapId}",
  width: 100,
  height: 100,
  backgroundColor: '#000000',
  tiles: [
    ${tiles.map(row => '[' + row.join(', ') + ']').join(',\n    ')}
  ],
  transitions: [],
  roofTriggers: ${JSON.stringify(roofTriggers)},
  legacyObjs: ${JSON.stringify(objs)},
  groundOverlays: [],
  legacyCsmData: {
    L1,
    L2,
    L3,
    L4,
    fileNums: [${Array.from(fileNums).join(', ')}]
  }
};
`;

  fs.writeFileSync(path.join(destDir, `mapa${mapId}.ts`), tsContent);
  console.log(`Successfully converted mapa${mapId}.ts!`);
}

for (let i = 1; i <= 10; i++) {
  parseMap(i);
}
