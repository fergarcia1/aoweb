import fs from "node:fs";
import path from "node:path";
import bmp from "bmp-js";
import { PNG } from "pngjs";

const TOLERANCE = 8;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    limit: 0,
    ranges: "",
    exact: "",
    keepSubdir: "selected",
  };

  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === "--bmp-dir") opts.bmpDir = args[++i];
    else if (key === "--out-dir") opts.outDir = args[++i];
    else if (key === "--ranges") opts.ranges = args[++i] ?? "";
    else if (key === "--exact") opts.exact = args[++i] ?? "";
    else if (key === "--limit") opts.limit = Number(args[++i] ?? 0);
    else if (key === "--keep-subdir") opts.keepSubdir = args[++i] ?? "selected";
  }

  return opts;
}

function parseRanges(input) {
  if (!input) return [];
  return input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (!m) throw new Error(`Rango invalido: "${part}" (usa ej. 7500-7530)`);
      const a = Number(m[1]);
      const b = Number(m[2]);
      return [Math.min(a, b), Math.max(a, b)];
    });
}

function parseExact(input) {
  if (!input) return new Set();
  return new Set(
    input
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x) && x >= 0)
  );
}

function fileId(name) {
  const stem = path.parse(name).name;
  if (!/^\d+$/.test(stem)) return null;
  return Number(stem);
}

function inRanges(id, ranges) {
  for (const [a, b] of ranges) {
    if (id >= a && id <= b) return true;
  }
  return false;
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
  const decoded = bmp.decode(buf);
  const png = new PNG({ width: decoded.width, height: decoded.height });

  for (let y = 0; y < decoded.height; y++) {
    for (let x = 0; x < decoded.width; x++) {
      const i = (decoded.width * y + x) * 4;
      const r = decoded.data[i];
      const g = decoded.data[i + 1];
      const b = decoded.data[i + 2];
      const p = (decoded.width * y + x) << 2;
      png.data[p] = r;
      png.data[p + 1] = g;
      png.data[p + 2] = b;
      png.data[p + 3] = isTransparent(r, g, b) ? 0 : 255;
    }
  }

  fs.mkdirSync(path.dirname(dstPath), { recursive: true });
  fs.writeFileSync(dstPath, PNG.sync.write(png));
}

const opts = parseArgs();
if (!opts.bmpDir || !opts.outDir) {
  console.log("Uso:");
  console.log(
    '  node export-bmp-range-to-png.mjs --bmp-dir "C:\\...\\Graficos" --out-dir "C:\\...\\assets\\ao" --ranges "7500-7530,10090-10160"'
  );
  console.log('  (opcional) --exact "231,640,10090" --limit 200');
  process.exit(1);
}

if (!fs.existsSync(opts.bmpDir)) {
  console.error(`ERROR: No existe la carpeta: ${opts.bmpDir}`);
  process.exit(1);
}

const ranges = parseRanges(opts.ranges);
const exact = parseExact(opts.exact);
if (ranges.length === 0 && exact.size === 0) {
  console.error("ERROR: tenes que pasar --ranges o --exact.");
  process.exit(1);
}

const all = fs
  .readdirSync(opts.bmpDir)
  .filter((f) => f.toLowerCase().endsWith(".bmp"))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const selected = [];
for (const file of all) {
  const id = fileId(file);
  if (id == null) continue;
  if (exact.has(id) || inRanges(id, ranges)) {
    selected.push(file);
  }
}

const toProcess = opts.limit > 0 ? selected.slice(0, opts.limit) : selected;
const outputBase = path.join(opts.outDir, opts.keepSubdir);
fs.mkdirSync(outputBase, { recursive: true });

console.log(`Total BMP disponibles: ${all.length}`);
console.log(`Coincidencias por rango/ids: ${selected.length}`);
console.log(`Convirtiendo: ${toProcess.length}`);
console.log(`Origen: ${opts.bmpDir}`);
console.log(`Destino: ${outputBase}`);

for (let i = 0; i < toProcess.length; i++) {
  const file = toProcess[i];
  const stem = path.parse(file).name;
  bmpToPng(path.join(opts.bmpDir, file), path.join(outputBase, `${stem}.png`));
  if ((i + 1) % 100 === 0 || i + 1 === toProcess.length) {
    console.log(`  ${i + 1}/${toProcess.length}`);
  }
}

console.log("Listo.");
