/**
 * BMP AO → PNG (fondo negro = transparente)
 *
 * npm install
 * npm run bmp2png -- --bmp-dir "C:\...\RecursosAO\Recursos\Graficos\bmp" --out-dir "C:\...\AOWEB\public\assets\ao\png"
 */

import fs from "fs";
import path from "path";
import bmp from "bmp-js";
import { PNG } from "pngjs";

const TOLERANCE = 8;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { limit: 0 };
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--bmp-dir") opts.bmpDir = args[++i];
    else if (args[i] === "--out-dir") opts.outDir = args[++i];
    else if (args[i] === "--limit") opts.limit = Number(args[++i]);
    else if (!args[i].startsWith("--")) positional.push(args[i]);
  }

  if (!opts.bmpDir && positional[0]) opts.bmpDir = positional[0];
  if (!opts.outDir && positional[1]) opts.outDir = positional[1];

  return opts;
}

function isTransparent(r, g, b) {
  return (
    Math.abs(r) <= TOLERANCE &&
    Math.abs(g) <= TOLERANCE &&
    Math.abs(b) <= TOLERANCE
  );
}

function bmpToPng(srcPath, dstPath) {
  const buf = fs.readFileSync(srcPath);
  const { data, width, height } = bmp.decode(buf);
  const png = new PNG({ width, height });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (width * y + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const idx = (width * y + x) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = isTransparent(r, g, b) ? 0 : 255;
    }
  }

  fs.mkdirSync(path.dirname(dstPath), { recursive: true });
  fs.writeFileSync(dstPath, PNG.sync.write(png));
}

const { bmpDir, outDir, limit } = parseArgs();

if (!bmpDir || !outDir) {
  console.log("Uso:");
  console.log(
    '  npm run bmp2png -- --bmp-dir "RUTA\\Graficos\\bmp" --out-dir "RUTA\\salida\\png"'
  );
  process.exit(1);
}

if (!fs.existsSync(bmpDir)) {
  console.error(`ERROR: No existe la carpeta:\n  ${bmpDir}`);
  console.error("\nCopiá los .bmp desde Argentum Online (Steam) — ver README.md");
  process.exit(1);
}

const files = fs
  .readdirSync(bmpDir)
  .filter((f) => f.toLowerCase().endsWith(".bmp"))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (files.length === 0) {
  console.error(`ERROR: No hay .bmp en:\n  ${bmpDir}`);
  process.exit(1);
}

const toProcess = limit > 0 ? files.slice(0, limit) : files;
console.log(`Convirtiendo ${toProcess.length} archivos...`);
console.log(`  Origen: ${bmpDir}`);
console.log(`  Destino: ${outDir}`);

for (let i = 0; i < toProcess.length; i++) {
  const file = toProcess[i];
  const stem = path.parse(file).name;
  bmpToPng(path.join(bmpDir, file), path.join(outDir, `${stem}.png`));
  if ((i + 1) % 200 === 0 || i + 1 === toProcess.length) {
    console.log(`  ${i + 1}/${toProcess.length}`);
  }
}

console.log("Listo.");
