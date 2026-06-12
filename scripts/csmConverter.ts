import * as fs from "fs";

interface MapHeader {
  numeroBloqueados: number;
  numeroLayers2: number;
  numeroLayers3: number;
  numeroLayers4: number;
  numeroTriggers: number;
  numeroLuces: number;
  numeroParticulas: number;
  numeroNPCs: number;
  numeroOBJs: number;
  numeroTE: number;
}

interface MapSize {
  xMax: number;
  xMin: number;
  yMax: number;
  yMin: number;
}

export function convertCsm(csmPath: string, outputPath: string, mapId: string) {
  console.log(`Convirtiendo ${csmPath} -> ${outputPath} (ID: ${mapId})`);
  const buf = fs.readFileSync(csmPath);
  let offset = 0;

  // Cabecera
  const desc = buf.subarray(offset, offset + 255).toString("ascii").replace(/\0/g, "");
  offset += 255 + 4 + 4; // desc + crc + magicWord

  // tMapHeader
  const header: MapHeader = {
    numeroBloqueados: buf.readInt32LE(offset),
    numeroLayers2: buf.readInt32LE(offset + 4),
    numeroLayers3: buf.readInt32LE(offset + 8),
    numeroLayers4: buf.readInt32LE(offset + 12),
    numeroTriggers: buf.readInt32LE(offset + 16),
    numeroLuces: buf.readInt32LE(offset + 20),
    numeroParticulas: buf.readInt32LE(offset + 24),
    numeroNPCs: buf.readInt32LE(offset + 28),
    numeroOBJs: buf.readInt32LE(offset + 32),
    numeroTE: buf.readInt32LE(offset + 36),
  };
  offset += 40;

  const mapSize: MapSize = {
    xMax: buf.readInt16LE(offset),
    xMin: buf.readInt16LE(offset + 2),
    yMax: buf.readInt16LE(offset + 4),
    yMin: buf.readInt16LE(offset + 6),
  };
  offset += 8;

  function readVBString() {
    const len = buf.readInt16LE(offset); offset += 2;
    if (len > 0) {
      const str = buf.subarray(offset, offset + len).toString("ascii");
      offset += len;
      return str.trim();
    }
    return "";
  }

  const mapName = readVBString();
  offset += 2; // battle_mode
  offset += 2; // backup_mode
  const restrictMode = readVBString();
  const musicNumber = readVBString();
  const zone = readVBString();
  const terrain = readVBString();
  const ambient = readVBString();
  const lvlMinimo = readVBString();
  const luzBase = buf.readInt32LE(offset); offset += 4;
  const version = buf.readInt32LE(offset); offset += 4;
  const noTirarItems = buf.readInt16LE(offset); offset += 2;

  const width = mapSize.xMax - mapSize.xMin + 1;
  const height = mapSize.yMax - mapSize.yMin + 1;

  const L1: number[][] = [];
  for (let x = 0; x < width; x++) {
    const col: number[] = [];
    for (let y = 0; y < height; y++) {
      col.push(buf.readInt32LE(offset));
      offset += 4;
    }
    L1.push(col);
  }

  const createMatrix = () => Array.from({ length: width }, () => Array.from({ length: height }, () => 0));
  
  const blocked = createMatrix();
  for (let i = 0; i < header.numeroBloqueados; i++) {
    const x = buf.readInt16LE(offset) - mapSize.xMin; offset += 2;
    const y = buf.readInt16LE(offset) - mapSize.yMin; offset += 2;
    if (x >= 0 && x < width && y >= 0 && y < height) blocked[x][y] = 1;
  }

  const L2 = createMatrix();
  for (let i = 0; i < header.numeroLayers2; i++) {
    const x = buf.readInt16LE(offset) - mapSize.xMin; offset += 2;
    const y = buf.readInt16LE(offset) - mapSize.yMin; offset += 2;
    const grh = buf.readInt32LE(offset); offset += 4;
    if (x >= 0 && x < width && y >= 0 && y < height) L2[x][y] = grh;
  }

  const L3 = createMatrix();
  for (let i = 0; i < header.numeroLayers3; i++) {
    const x = buf.readInt16LE(offset) - mapSize.xMin; offset += 2;
    const y = buf.readInt16LE(offset) - mapSize.yMin; offset += 2;
    const grh = buf.readInt32LE(offset); offset += 4;
    if (x >= 0 && x < width && y >= 0 && y < height) L3[x][y] = grh;
  }

  const L4 = createMatrix();
  for (let i = 0; i < header.numeroLayers4; i++) {
    const x = buf.readInt16LE(offset) - mapSize.xMin; offset += 2;
    const y = buf.readInt16LE(offset) - mapSize.yMin; offset += 2;
    const grh = buf.readInt32LE(offset); offset += 4;
    if (x >= 0 && x < width && y >= 0 && y < height) L4[x][y] = grh;
  }

  // Skip others to reach TE. In these CSM files, OBJs are stored before NPCs.
  const skipTriggers = header.numeroTriggers * 6;
  const skipLuces = header.numeroLuces * 11;
  const skipParticulas = header.numeroParticulas * 8;
  const skipOBJs = header.numeroOBJs * 8;
  const skipNPCs = header.numeroNPCs * 6;
  offset += skipTriggers + skipLuces + skipParticulas + skipOBJs + skipNPCs;

  // TE (Traslados)
  const transitions: any[] = [];
  for (let i = 0; i < header.numeroTE; i++) {
    const tileX = buf.readInt16LE(offset) - mapSize.xMin; offset += 2;
    const tileY = buf.readInt16LE(offset) - mapSize.yMin; offset += 2;
    const destM = buf.readInt16LE(offset); offset += 2;
    const destX = buf.readInt16LE(offset) - mapSize.xMin; offset += 2;
    const destY = buf.readInt16LE(offset) - mapSize.yMin; offset += 2;
    
    // Asumimos que "mapa" + destM es el ID en AOWEB, pero los IDs son alfanuméricos. 
    // Usaremos `mapa${destM}` como convencion.
    transitions.push({
      tileX,
      tileY,
      toMapId: `mapa${destM}`,
      toTileX: destX,
      toTileY: destY
    });
  }

  // Generamos el archivo TS
  // Rotamos la matriz L1/Blocked para escribirla de manera amigable (por filas)
  const rows: string[] = [];
  for (let y = 0; y < height; y++) {
    const row: string[] = [];
    for (let x = 0; x < width; x++) {
      row.push(blocked[x][y] === 1 ? "TILE.GRASS_BLOCKED" : "TILE.GRASS");
    }
    rows.push(`    [${row.join(", ")}]`);
  }

  // Analizar dependencias de imágenes (fileNum)
  let fileNumsArray: number[] = [];
  try {
    const grhIndexBuf = fs.readFileSync("public/assets/ao/grh_index.json", "utf-8");
    const grhIndex = JSON.parse(grhIndexBuf);
    
    const requiredFileNums = new Set<number>();
    
    const checkGrh = (grhId: number) => {
      if (grhId <= 0) return;
      const grh = grhIndex[grhId];
      if (!grh) return;
      
      if (grh.numFrames === 1 && grh.fileNum) {
        requiredFileNums.add(grh.fileNum);
      } else if (grh.numFrames > 1 && grh.frames) {
        grh.frames.forEach((f: number) => checkGrh(f));
      }
    };

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        checkGrh(L1[x][y]);
        checkGrh(L2[x][y]);
        checkGrh(L3[x][y]);
        checkGrh(L4[x][y]);
      }
    }

    fileNumsArray = Array.from(requiredFileNums).sort((a, b) => a - b);
    console.log(`El mapa utiliza ${fileNumsArray.length} imágenes (.bmp) únicas.`);
  } catch (e) {
    console.error("No se pudo leer grh_index.json para analizar dependencias", e);
  }

  const tsCode = `import type { GameMap } from "./types";
import { TILE } from "./tileDefinitions";

const L1 = ${JSON.stringify(L1)};
const L2 = ${JSON.stringify(L2)};
const L3 = ${JSON.stringify(L3)};
const L4 = ${JSON.stringify(L4)};

export const MAP_${mapId.toUpperCase()}: GameMap = {
  id: "${mapId}",
  name: "${mapName || mapId}",
  width: ${width},
  height: ${height},
  tiles: [
${rows.join(",\n")}
  ],
  transitions: ${JSON.stringify(transitions, null, 4)},
  legacyCsmData: {
    L1,
    L2,
    L3,
    L4,
    fileNums: ${JSON.stringify(fileNumsArray)}
  }
};
`;

  fs.writeFileSync(outputPath, tsCode);
  console.log(`TS Generado en ${outputPath}`);
}

const args = process.argv.slice(2);
if (args.length >= 3) {
  convertCsm(args[0], args[1], args[2]);
} else {
  console.log("Uso: npx tsx scripts/csmConverter.ts <input.csm> <output.ts> <mapId>");
}
