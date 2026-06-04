import * as fs from "fs";

export interface GrhData {
  id: number;
  numFrames: number;
  frames?: number[];
  speed?: number;
  fileNum?: number;
  pixelWidth?: number;
  pixelHeight?: number;
  sX?: number;
  sY?: number;
}

export function convertGrh(indPath: string, outputPath: string) {
  console.log(`Leyendo ${indPath}...`);
  const buf = fs.readFileSync(indPath);
  let offset = 0;

  const desc = buf.subarray(offset, offset + 255).toString("ascii").replace(/\0/g, "");
  offset += 255;
  const crc = buf.readInt32LE(offset); offset += 4;
  const magicWord = buf.readInt32LE(offset); offset += 4;
  const version = buf.readInt32LE(offset); offset += 4;
  const grhCount = buf.readInt32LE(offset); offset += 4;

  console.log(`Header: ${desc}`);
  console.log(`Grh Count: ${grhCount}`);

  const grhs: Record<number, GrhData> = {};

  let currentGrh = buf.readInt32LE(offset); offset += 4;
  while (currentGrh !== grhCount && offset < buf.length) {
    const numFrames = buf.readInt16LE(offset); offset += 2;
    if (numFrames <= 0) {
      console.error(`Error: NumFrames <= 0 para Grh ${currentGrh}`);
      break;
    }

    const grh: GrhData = { id: currentGrh, numFrames };

    if (numFrames > 1) {
      grh.frames = [];
      for (let i = 0; i < numFrames; i++) {
        grh.frames.push(buf.readInt32LE(offset)); offset += 4;
      }
      grh.speed = buf.readFloatLE(offset); offset += 4;
    } else {
      grh.fileNum = buf.readInt32LE(offset); offset += 4;
      grh.pixelWidth = buf.readInt16LE(offset); offset += 2;
      grh.pixelHeight = buf.readInt16LE(offset); offset += 2;
      grh.sX = buf.readInt16LE(offset); offset += 2;
      grh.sY = buf.readInt16LE(offset); offset += 2;
    }

    grhs[currentGrh] = grh;
    
    // Check if we hit end of file early or if next bytes are invalid
    if (offset >= buf.length) break;
    currentGrh = buf.readInt32LE(offset); offset += 4;
  }

  // To reduce JSON size, we could export it as an array or object
  // Since grhCount can be ~30,000 and there are missing IDs, a dict is best
  fs.writeFileSync(outputPath, JSON.stringify(grhs));
  console.log(`Exportado exitosamente a ${outputPath} con ${Object.keys(grhs).length} gráficos`);
}

const args = process.argv.slice(2);
if (args.length >= 2) {
  convertGrh(args[0], args[1]);
} else {
  console.log("Uso: npx tsx scripts/grhConverter.ts <graficos.ind> <output.json>");
}
