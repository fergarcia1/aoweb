/**
 * Exporta un Grh de graficos.ini a PNG
 *
 * npm run grh -- --grh 63 --recursos "C:\...\RecursosAO\Recursos" --out "salida.png"
 */

import fs from "fs";
import path from "path";
import bmp from "bmp-js";
import { PNG } from "pngjs";

const TOLERANCE = 8;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--grh") opts.grh = Number(args[++i]);
    else if (args[i] === "--recursos") opts.recursos = args[++i];
    else if (args[i] === "--out") opts.out = args[++i];
    else if (args[i] === "--out-dir") opts.outDir = args[++i];
    else if (!args[i].startsWith("--")) positional.push(args[i]);
  }

  if (!opts.recursos && positional[0]) opts.recursos = positional[0];
  if (!opts.out && positional[1]) opts.out = positional[1];

  return opts;
}

function isTransparent(r, g, b) {
  return (
    Math.abs(r) <= TOLERANCE &&
    Math.abs(g) <= TOLERANCE &&
    Math.abs(b) <= TOLERANCE
  );
}

function loadGrhMap(iniPath) {
  const text = fs.readFileSync(iniPath, "latin1");
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(/^Grh(\d+)=(.+)$/i);
    if (m) map.set(Number(m[1]), m[2]);
  }
  return map;
}

function resolveStatic(grhId, value, grhs) {
  const parts = value.split("-");
  const frameCount = Number(parts[0]);
  if (frameCount !== 1) {
    const frameIds = parts.slice(1, 1 + frameCount).map(Number);
    return frameIds.flatMap((id) => resolveStatic(id, grhs.get(id), grhs));
  }
  return [
    {
      grhId,
      fileNum: Number(parts[1]),
      x: Number(parts[2]),
      y: Number(parts[3]),
      w: Number(parts[4]),
      h: Number(parts[5]),
    },
  ];
}

function findBmp(bmpDir, fileNum) {
  for (const ext of [".bmp", ".BMP"]) {
    const p = path.join(bmpDir, `${fileNum}${ext}`);
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`No se encontró ${fileNum}.bmp en ${bmpDir}`);
}

function cropFrame(bmpPath, frame) {
  const { data, width } = bmp.decode(fs.readFileSync(bmpPath));
  const png = new PNG({ width: frame.w, height: frame.h });

  for (let y = 0; y < frame.h; y++) {
    for (let x = 0; x < frame.w; x++) {
      const si = (width * (frame.y + y) + (frame.x + x)) * 4;
      const di = (frame.w * y + x) << 2;
      const r = data[si];
      const g = data[si + 1];
      const b = data[si + 2];
      png.data[di] = r;
      png.data[di + 1] = g;
      png.data[di + 2] = b;
      png.data[di + 3] = isTransparent(r, g, b) ? 0 : 255;
    }
  }
  return png;
}

const { grh, recursos, out, outDir } = parseArgs();

if (!grh || !recursos) {
  console.log("Uso:");
  console.log(
    '  npm run grh -- --grh 63 --recursos "RUTA\\RecursosAO\\Recursos" --out "grh63.png"'
  );
  process.exit(1);
}

const iniPath = path.join(recursos, "init", "graficos.ini");
const bmpDir = path.join(recursos, "Graficos", "bmp");

if (!fs.existsSync(iniPath)) {
  console.error(`ERROR: No existe ${iniPath}`);
  process.exit(1);
}
if (!fs.existsSync(bmpDir)) {
  console.error(`ERROR: No existe ${bmpDir}`);
  console.error("Copiá los BMP desde AO (Steam) — ver README.md");
  process.exit(1);
}

const grhs = loadGrhMap(iniPath);
if (!grhs.has(grh)) {
  console.error(`ERROR: Grh${grh} no existe en graficos.ini`);
  process.exit(1);
}

const frames = resolveStatic(grh, grhs.get(grh), grhs);

if (outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const bmpPath = findBmp(bmpDir, frame.fileNum);
    const png = cropFrame(bmpPath, frame);
    const dst = path.join(outDir, `grh${frame.grhId}_${i}.png`);
    fs.writeFileSync(dst, PNG.sync.write(png));
    console.log(`Guardado: ${dst}`);
  }
} else if (frames.length > 1) {
  console.error("Este Grh tiene varios frames. Usá --out-dir.");
  process.exit(1);
} else {
  const frame = frames[0];
  const bmpPath = findBmp(bmpDir, frame.fileNum);
  const png = cropFrame(bmpPath, frame);
  const dst = out || `grh${grh}.png`;
  fs.mkdirSync(path.dirname(path.resolve(dst)), { recursive: true });
  fs.writeFileSync(dst, PNG.sync.write(png));
  console.log(`Guardado: ${dst} (${frame.w}x${frame.h} desde ${path.basename(bmpPath)})`);
}
