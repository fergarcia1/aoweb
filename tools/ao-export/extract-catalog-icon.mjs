/**
 * Extrae el icono 32×32 de un bloque de catálogo AO (256×256).
 *
 *   node extract-catalog-icon.mjs --in "C:/input Script/1005.png" --block 0 --out citizenClothesBajos_icon.png
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOCK_SIZE = 256;
const ICON_SIZE = 32;
/** Celda de icono en bloque 256×256 (igual que cuero y demás armaduras). */
const DEFAULT_ICON_OFFSET = { x: 0, y: 0 };

function parseArgs() {
  const args = process.argv.slice(2);
  let inputPath = null;
  let outputPath = null;
  let blockIndex = 0;
  let iconX = DEFAULT_ICON_OFFSET.x;
  let iconY = DEFAULT_ICON_OFFSET.y;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--in") inputPath = args[++i];
    else if (arg === "--out") outputPath = args[++i];
    else if (arg === "--block") blockIndex = Number.parseInt(args[++i], 10);
    else if (arg === "--icon-x") iconX = Number.parseInt(args[++i], 10);
    else if (arg === "--icon-y") iconY = Number.parseInt(args[++i], 10);
  }

  if (!inputPath || !outputPath) {
    console.error(
      "Uso: node extract-catalog-icon.mjs --in <catalog.png> --out <icon.png> [--block 0] [--icon-x 0] [--icon-y 0]"
    );
    process.exit(1);
  }

  return {
    inputPath: path.resolve(inputPath),
    outputPath: path.isAbsolute(outputPath)
      ? outputPath
      : path.resolve(__dirname, "../../public/assets/ao/armors", outputPath),
    blockIndex,
    iconX,
    iconY,
  };
}

function getPixel(png, x, y) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return [0, 0, 0, 0];
  const i = (y * png.width + x) * 4;
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
}

function isBg(r, g, b, a) {
  if (a < 20) return true;
  if (r <= 4 && g <= 4 && b <= 4) return true;
  if (r > 248 && g > 248 && b > 248) return true;
  return false;
}

function main() {
  const opts = parseArgs();
  const source = PNG.sync.read(fs.readFileSync(opts.inputPath));
  const blocksX = Math.ceil(source.width / BLOCK_SIZE);
  const blockX = opts.blockIndex % blocksX;
  const blockY = Math.floor(opts.blockIndex / blocksX);
  const blockOriginX = blockX * BLOCK_SIZE;
  const blockOriginY = blockY * BLOCK_SIZE;

  const icon = new PNG({ width: ICON_SIZE, height: ICON_SIZE, colorType: 6 });
  for (let y = 0; y < ICON_SIZE; y += 1) {
    for (let x = 0; x < ICON_SIZE; x += 1) {
      const sx = blockOriginX + opts.iconX + x;
      const sy = blockOriginY + opts.iconY + y;
      let [r, g, b, a] = getPixel(source, sx, sy);
      if (isBg(r, g, b, a)) {
        r = 0;
        g = 0;
        b = 0;
        a = 0;
      }
      const i = (y * ICON_SIZE + x) * 4;
      icon.data[i] = r;
      icon.data[i + 1] = g;
      icon.data[i + 2] = b;
      icon.data[i + 3] = a;
    }
  }

  fs.mkdirSync(path.dirname(opts.outputPath), { recursive: true });
  fs.writeFileSync(opts.outputPath, PNG.sync.write(icon));
  console.log(
    `Icono ${ICON_SIZE}x${ICON_SIZE} bloque ${opts.blockIndex} @ (${opts.iconX},${opts.iconY}) -> ${opts.outputPath}`
  );
}

main();
