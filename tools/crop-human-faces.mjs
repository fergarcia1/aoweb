/**
 * Recorta human_male_faces.png a las primeras N columnas (4 filas × frame 20×32).
 * Layout: columna = cara (c1…cN), filas f1=S f2=W f3=A f4=D (igual que el cuerpo).
 * Uso: node tools/crop-human-faces.mjs [columnas]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const FRAME_W = 20;
const FRAME_H = 32;
const ROWS = 4;
const KEEP_COLS = Number.parseInt(process.argv[2] ?? "11", 10);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(root, "public/assets/ao/razes/human_male_faces.png");

const source = PNG.sync.read(fs.readFileSync(targetPath));
const dstW = KEEP_COLS * FRAME_W;
const dstH = ROWS * FRAME_H;
const output = new PNG({ width: dstW, height: dstH });

for (let row = 0; row < ROWS; row += 1) {
  for (let col = 0; col < KEEP_COLS; col += 1) {
    for (let y = 0; y < FRAME_H; y += 1) {
      for (let x = 0; x < FRAME_W; x += 1) {
        const sx = col * FRAME_W + x;
        const sy = row * FRAME_H + y;
        const dx = col * FRAME_W + x;
        const dy = row * FRAME_H + y;
        const srcIdx = (source.width * sy + sx) << 2;
        const dstIdx = (dstW * dy + dx) << 2;
        output.data[dstIdx] = source.data[srcIdx];
        output.data[dstIdx + 1] = source.data[srcIdx + 1];
        output.data[dstIdx + 2] = source.data[srcIdx + 2];
        output.data[dstIdx + 3] = source.data[srcIdx + 3];
      }
    }
  }
}

fs.writeFileSync(targetPath, PNG.sync.write(output));
console.log(`human_male_faces.png -> ${dstW}x${dstH} (${KEEP_COLS} caras × ${ROWS} direcciones)`);
