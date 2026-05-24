import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    inputDir:
      "C:/Users/imaga/Desktop/AOWEB/public/assets/ao/imperium/mobs/npc_bodies",
    threshold: 12,
    thumbSize: 96,
    sheetCols: 12,
  };

  for (let i = 0; i < args.length; i++) {
    const k = args[i];
    if (k === "--input-dir") opts.inputDir = args[++i];
    else if (k === "--threshold") opts.threshold = Number(args[++i] ?? 12);
    else if (k === "--thumb-size") opts.thumbSize = Number(args[++i] ?? 96);
    else if (k === "--sheet-cols") opts.sheetCols = Number(args[++i] ?? 12);
  }

  return opts;
}

function isNearBlack(r, g, b, threshold) {
  return r <= threshold && g <= threshold && b <= threshold;
}

function removeBackgroundBlack(png, threshold) {
  const { width, height, data } = png;
  const visited = new Uint8Array(width * height);
  const queueX = [];
  const queueY = [];
  let qHead = 0;

  function enqueue(x, y) {
    const idx = y * width + x;
    if (visited[idx]) return;
    const p = idx * 4;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const a = data[p + 3];
    if (a === 0) return;
    if (!isNearBlack(r, g, b, threshold)) return;
    visited[idx] = 1;
    queueX.push(x);
    queueY.push(y);
  }

  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (qHead < queueX.length) {
    const x = queueX[qHead];
    const y = queueY[qHead];
    qHead++;
    const p = (y * width + x) * 4;
    data[p + 3] = 0;

    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < width) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < height) enqueue(x, y + 1);
  }
}

function nearestResize(src, dstW, dstH) {
  const out = new PNG({ width: dstW, height: dstH });
  for (let y = 0; y < dstH; y++) {
    const sy = Math.min(src.height - 1, Math.floor((y * src.height) / dstH));
    for (let x = 0; x < dstW; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x * src.width) / dstW));
      const sp = (sy * src.width + sx) * 4;
      const dp = (y * dstW + x) * 4;
      out.data[dp] = src.data[sp];
      out.data[dp + 1] = src.data[sp + 1];
      out.data[dp + 2] = src.data[sp + 2];
      out.data[dp + 3] = src.data[sp + 3];
    }
  }
  return out;
}

function fitThumb(src, thumbSize) {
  const scale = Math.min(thumbSize / src.width, thumbSize / src.height);
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const resized = nearestResize(src, w, h);
  const thumb = new PNG({ width: thumbSize, height: thumbSize });
  const ox = Math.floor((thumbSize - w) / 2);
  const oy = Math.floor((thumbSize - h) / 2);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sp = (y * w + x) * 4;
      const dp = ((y + oy) * thumbSize + (x + ox)) * 4;
      thumb.data[dp] = resized.data[sp];
      thumb.data[dp + 1] = resized.data[sp + 1];
      thumb.data[dp + 2] = resized.data[sp + 2];
      thumb.data[dp + 3] = resized.data[sp + 3];
    }
  }
  return thumb;
}

function blit(src, dst, ox, oy) {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const sp = (y * src.width + x) * 4;
      const dp = ((y + oy) * dst.width + (x + ox)) * 4;
      const sa = src.data[sp + 3] / 255;
      const da = dst.data[dp + 3] / 255;
      const oa = sa + da * (1 - sa);

      if (oa <= 0) continue;
      dst.data[dp] = Math.round(
        (src.data[sp] * sa + dst.data[dp] * da * (1 - sa)) / oa
      );
      dst.data[dp + 1] = Math.round(
        (src.data[sp + 1] * sa + dst.data[dp + 1] * da * (1 - sa)) / oa
      );
      dst.data[dp + 2] = Math.round(
        (src.data[sp + 2] * sa + dst.data[dp + 2] * da * (1 - sa)) / oa
      );
      dst.data[dp + 3] = Math.round(oa * 255);
    }
  }
}

function writePng(png, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

const opts = parseArgs();
if (!fs.existsSync(opts.inputDir)) {
  throw new Error(`No existe input dir: ${opts.inputDir}`);
}

const files = fs
  .readdirSync(opts.inputDir)
  .filter((f) => f.toLowerCase().endsWith(".png"))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const thumbsDir = path.join(opts.inputDir, "_thumbs");
fs.mkdirSync(thumbsDir, { recursive: true });

const thumbs = [];
for (const file of files) {
  const p = path.join(opts.inputDir, file);
  const png = PNG.sync.read(fs.readFileSync(p));
  removeBackgroundBlack(png, opts.threshold);
  writePng(png, p); // overwrite original with transparent background

  const thumb = fitThumb(png, opts.thumbSize);
  const thumbPath = path.join(thumbsDir, file);
  writePng(thumb, thumbPath);
  thumbs.push({ file, thumb });
}

const cols = Math.max(1, opts.sheetCols);
const rows = Math.max(1, Math.ceil(thumbs.length / cols));
const sheet = new PNG({
  width: cols * opts.thumbSize,
  height: rows * opts.thumbSize,
});

for (let i = 0; i < thumbs.length; i++) {
  const col = i % cols;
  const row = Math.floor(i / cols);
  blit(thumbs[i].thumb, sheet, col * opts.thumbSize, row * opts.thumbSize);
}

const sheetPath = path.join(opts.inputDir, "_contact_sheet.png");
writePng(sheet, sheetPath);

const indexPath = path.join(opts.inputDir, "_contact_sheet_index.csv");
const indexLines = ["index,row,col,file"];
for (let i = 0; i < thumbs.length; i++) {
  const col = i % cols;
  const row = Math.floor(i / cols);
  indexLines.push(`${i},${row},${col},${thumbs[i].file}`);
}
fs.writeFileSync(indexPath, indexLines.join("\n"), "utf8");

console.log(`Procesados PNG: ${files.length}`);
console.log(`Thumbs: ${thumbsDir}`);
console.log(`Contact sheet: ${sheetPath}`);
console.log(`Index csv: ${indexPath}`);
