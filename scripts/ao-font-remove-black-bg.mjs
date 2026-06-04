/**
 * Convierte el fondo negro del atlas AO en transparencia (RGBA).
 * Uso: node scripts/ao-font-remove-black-bg.mjs [ruta/font2.png]
 */
import fs from "node:fs";
import path from "node:path";
import { Jimp } from "jimp";

const defaultPng = path.resolve("public/assets/ao/fonts/font2.png");
const BLACK_THRESHOLD = 18;

async function stripBlackBackground(pngPath) {
  const image = await Jimp.read(pngPath);
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (_x, _y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    if (r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD) {
      this.bitmap.data[idx + 3] = 0;
    } else if (this.bitmap.data[idx + 3] === 0) {
      this.bitmap.data[idx + 3] = 255;
    }
  });
  await image.write(pngPath);
}

const pngPath = path.resolve(process.argv[2] ?? defaultPng);
if (!fs.existsSync(pngPath)) {
  console.error(`No existe: ${pngPath}`);
  process.exit(1);
}
await stripBlackBackground(pngPath);
console.log(`Transparent background applied: ${pngPath}`);
