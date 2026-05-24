/**
 * Pipeline: catálogos AO (bloques 256×256) → std1_raw + std (192×192, 6×4 × 32×48).
 *
 *   node pipeline-armor-std1.mjs --in "C:/input" --out "C:/output"
 *   node pipeline-armor-std1.mjs --in "C:/input" --out "C:/output" --mode raw
 *   node pipeline-armor-std1.mjs --in "C:/input" --out "C:/output" --mode align --base "../../public/assets/ao/razes/human_male_base.png"
 *   node pipeline-armor-std1.mjs --in "C:/input" --out "C:/output" --names armor-name-map.example.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASE = path.resolve(
  __dirname,
  "../../public/assets/ao/razes/human_male_base.png"
);

const BLOCK_SIZE = 256;
const OUT_SIZE = 192;
const FRAME_W = 32;
const FRAME_H = 48;
const SHEET_COLS = 6;
const SHEET_ROWS = 4;
const INNER_MARGIN = 1;

function parseArgs() {
  const args = process.argv.slice(2);
  let inputDir = null;
  let outputDir = null;
  let basePath = DEFAULT_BASE;
  let mode = "raw";
  let namesPath = null;
  let seamCleanup = true;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--in") inputDir = args[++i];
    else if (arg === "--out") outputDir = args[++i];
    else if (arg === "--base") basePath = args[++i];
    else if (arg === "--mode") mode = args[++i];
    else if (arg === "--names") namesPath = args[++i];
    else if (arg === "--no-seam-cleanup") seamCleanup = false;
  }

  if (!inputDir || !outputDir) {
    console.error(
      "Uso: node pipeline-armor-std1.mjs --in <carpeta> --out <carpeta> [--mode raw|align] [--base base.png] [--names map.json] [--no-seam-cleanup]"
    );
    process.exit(1);
  }

  if (mode !== "raw" && mode !== "align") {
    console.error('--mode debe ser "raw" o "align".');
    process.exit(1);
  }

  return {
    inputDir: path.resolve(inputDir),
    outputDir: path.resolve(outputDir),
    basePath: path.resolve(basePath),
    mode,
    namesPath: namesPath ? path.resolve(namesPath) : null,
    seamCleanup,
  };
}

function isBg(r, g, b, a) {
  if (a < 20) return true;
  if (r < 30 && g < 30 && b < 30) return true;
  if (r > 240 && g > 240 && b > 240) return true;
  return false;
}

function getPixel(png, x, y) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return [0, 0, 0, 0];
  const i = (y * png.width + x) * 4;
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
}

function setPixel(png, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (y * png.width + x) * 4;
  png.data[i] = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = a;
}

function clonePng(png) {
  const out = new PNG({ width: png.width, height: png.height, colorType: 6 });
  out.data = Buffer.from(png.data);
  return out;
}

function chromaKeyBlock(png) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const [r, g, b, a] = getPixel(png, x, y);
      if (isBg(r, g, b, a)) setPixel(png, x, y, 0, 0, 0, 0);
    }
  }
}

function removeCatalogLines(png) {
  const w = png.width;
  const h = png.height;

  for (let x = 1; x < w - 1; x += 1) {
    let darkCount = 0;
    let opaqueCount = 0;
    for (let y = 0; y < h; y += 1) {
      const [r, g, b, a] = getPixel(png, x, y);
      if (a < 40) continue;
      opaqueCount += 1;
      if (r < 70 && g < 70 && b < 70) darkCount += 1;
    }
    if (opaqueCount < h * 0.35) continue;
    if (darkCount / opaqueCount < 0.75) continue;

    let isolated = true;
    for (let y = 0; y < h; y += 1) {
      const left = getPixel(png, x - 1, y)[3];
      const right = getPixel(png, x + 1, y)[3];
      if (left > 40 && right > 40) {
        isolated = false;
        break;
      }
    }
    if (!isolated) continue;
    for (let y = 0; y < h; y += 1) setPixel(png, x, y, 0, 0, 0, 0);
  }

  for (let y = 1; y < h - 1; y += 1) {
    let darkCount = 0;
    let opaqueCount = 0;
    for (let x = 0; x < w; x += 1) {
      const [r, g, b, a] = getPixel(png, x, y);
      if (a < 40) continue;
      opaqueCount += 1;
      if (r < 70 && g < 70 && b < 70) darkCount += 1;
    }
    if (opaqueCount < w * 0.35) continue;
    if (darkCount / opaqueCount < 0.75) continue;
    for (let x = 0; x < w; x += 1) setPixel(png, x, y, 0, 0, 0, 0);
  }
}

function extractBlock(source, blockX, blockY) {
  const png = new PNG({ width: BLOCK_SIZE, height: BLOCK_SIZE, colorType: 6 });
  const srcX0 = blockX * BLOCK_SIZE;
  const srcY0 = blockY * BLOCK_SIZE;

  for (let y = 0; y < BLOCK_SIZE; y += 1) {
    for (let x = 0; x < BLOCK_SIZE; x += 1) {
      const sx = srcX0 + x;
      const sy = srcY0 + y;
      if (sx >= source.width || sy >= source.height) continue;
      const [r, g, b, a] = getPixel(source, sx, sy);
      setPixel(png, x, y, r, g, b, a);
    }
  }

  chromaKeyBlock(png);
  removeCatalogLines(png);
  return png;
}

function opaqueCountInWindow(png, ox, oy, size) {
  let count = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (getPixel(png, ox + x, oy + y)[3] > 40) count += 1;
    }
  }
  return count;
}

function findBestWindow192(png) {
  const maxOx = BLOCK_SIZE - OUT_SIZE;
  const maxOy = BLOCK_SIZE - OUT_SIZE;
  let best = { ox: 0, oy: 0, score: -Infinity };

  for (let oy = 0; oy <= maxOy; oy += 1) {
    for (let ox = 0; ox <= maxOx; ox += 1) {
      const density = opaqueCountInWindow(png, ox, oy, OUT_SIZE);
      if (density === 0) continue;

      const gridPenalty = (ox % FRAME_W) * 8 + (oy % FRAME_H) * 8;
      const topLeftBonus = (maxOx - ox) * 0.01 + (maxOy - oy) * 0.02;
      const score = density - gridPenalty + topLeftBonus;

      if (score > best.score) {
        best = { ox, oy, score };
      }
    }
  }

  return best;
}

function blockBounds(png) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (getPixel(png, x, y)[3] < 40) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
}

function cropWindowTo192(png, ox, oy) {
  const out = new PNG({ width: OUT_SIZE, height: OUT_SIZE, colorType: 6 });
  for (let y = 0; y < OUT_SIZE; y += 1) {
    for (let x = 0; x < OUT_SIZE; x += 1) {
      const [r, g, b, a] = getPixel(png, ox + x, oy + y);
      setPixel(out, x, y, r, g, b, a);
    }
  }
  return out;
}

function frameBounds(png, frameX, frameY) {
  let minX = FRAME_W;
  let minY = FRAME_H;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < FRAME_H; y += 1) {
    for (let x = 0; x < FRAME_W; x += 1) {
      const sx = frameX + x;
      const sy = frameY + y;
      const a = getPixel(png, sx, sy)[3];
      if (a === 0) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
}

function cleanFrameSeams(png, frameX, frameY) {
  for (let lx = 1; lx < FRAME_W - 1; lx += 1) {
    const x = frameX + lx;
    let opaque = 0;
    let dark = 0;
    for (let ly = 0; ly < FRAME_H; ly += 1) {
      const [r, g, b, a] = getPixel(png, x, frameY + ly);
      if (a < 40) continue;
      opaque += 1;
      if (r < 80 && g < 80 && b < 80) dark += 1;
    }
    if (opaque < FRAME_H * 0.2 || dark / opaque < 0.7) continue;

    let isolated = true;
    for (let ly = 0; ly < FRAME_H; ly += 1) {
      const leftA = getPixel(png, x - 1, frameY + ly)[3];
      const rightA = getPixel(png, x + 1, frameY + ly)[3];
      if (leftA > 40 && rightA > 40) {
        isolated = false;
        break;
      }
    }
    if (!isolated) continue;
    for (let ly = 0; ly < FRAME_H; ly += 1) setPixel(png, x, frameY + ly, 0, 0, 0, 0);
  }
}

function cleanAllFrameSeams(png) {
  for (let row = 0; row < SHEET_ROWS; row += 1) {
    for (let col = 0; col < SHEET_COLS; col += 1) {
      cleanFrameSeams(png, col * FRAME_W, row * FRAME_H);
    }
  }
}

function copyAlignedFrame({ srcPng, outPng, srcFrameX, srcFrameY, outFrameX, outFrameY, shiftX, shiftY }) {
  for (let y = 0; y < FRAME_H; y += 1) {
    for (let x = 0; x < FRAME_W; x += 1) {
      const [r, g, b, a] = getPixel(srcPng, srcFrameX + x, srcFrameY + y);
      if (a === 0) continue;

      const dstX = outFrameX + x + shiftX;
      const dstY = outFrameY + y + shiftY;
      if (
        dstX < outFrameX + INNER_MARGIN ||
        dstX > outFrameX + FRAME_W - 1 - INNER_MARGIN ||
        dstY < outFrameY + INNER_MARGIN ||
        dstY > outFrameY + FRAME_H - 1 - INNER_MARGIN
      ) {
        continue;
      }
      setPixel(outPng, dstX, dstY, r, g, b, a);
    }
  }
}

function alignToBase(rawPng, basePng) {
  if (rawPng.width !== OUT_SIZE || rawPng.height !== OUT_SIZE) {
    throw new Error(`std1_raw debe ser ${OUT_SIZE}x${OUT_SIZE}.`);
  }
  if (basePng.width !== OUT_SIZE || basePng.height !== OUT_SIZE) {
    throw new Error(`base debe ser ${OUT_SIZE}x${OUT_SIZE}.`);
  }

  const out = new PNG({ width: OUT_SIZE, height: OUT_SIZE, colorType: 6 });

  for (let row = 0; row < SHEET_ROWS; row += 1) {
    for (let col = 0; col < SHEET_COLS; col += 1) {
      const frameX = col * FRAME_W;
      const frameY = row * FRAME_H;
      const baseBounds = frameBounds(basePng, frameX, frameY);
      const armorBounds = frameBounds(rawPng, frameX, frameY);

      if (!armorBounds) continue;

      const targetCenterX = baseBounds
        ? (baseBounds.minX + baseBounds.maxX) / 2
        : (FRAME_W - 1) / 2;
      const targetBottomY = baseBounds ? baseBounds.maxY : FRAME_H - 1 - INNER_MARGIN;
      const armorCenterX = (armorBounds.minX + armorBounds.maxX) / 2;
      const armorBottomY = armorBounds.maxY;

      copyAlignedFrame({
        srcPng: rawPng,
        outPng: out,
        srcFrameX: frameX,
        srcFrameY: frameY,
        outFrameX: frameX,
        outFrameY: frameY,
        shiftX: Math.round(targetCenterX - armorCenterX),
        shiftY: Math.round(targetBottomY - armorBottomY),
      });
    }
  }

  return out;
}

function loadNameMap(namesPath) {
  if (!namesPath || !fs.existsSync(namesPath)) return {};
  const raw = JSON.parse(fs.readFileSync(namesPath, "utf8"));
  return raw && typeof raw === "object" ? raw : {};
}

function blockStem(sourceStem, blockIndex) {
  return `${sourceStem}_b${String(blockIndex).padStart(3, "0")}`;
}

function processBlock({ blockPng, blockIndex, blockX, blockY, outputDir, sourceStem, basePng, mode, seamCleanup, nameMap }) {
  const bounds = blockBounds(blockPng);
  if (!bounds) return null;

  const { ox, oy } = findBestWindow192(blockPng);
  let rawPng = cropWindowTo192(blockPng, ox, oy);
  if (seamCleanup) cleanAllFrameSeams(rawPng);

  const stem = blockStem(sourceStem, blockIndex);
  const friendly = nameMap[stem] ?? stem;
  const rawName = `${friendly}_std1_raw.png`;
  const stdName = `${friendly}_std.png`;

  fs.writeFileSync(path.join(outputDir, rawName), PNG.sync.write(rawPng));

  let stdPng = rawPng;
  if (mode === "align") {
    stdPng = alignToBase(clonePng(rawPng), basePng);
    if (seamCleanup) cleanAllFrameSeams(stdPng);
  }

  fs.writeFileSync(path.join(outputDir, stdName), PNG.sync.write(stdPng));

  return {
    blockIndex,
    blockX,
    blockY,
    bounds,
    window: { ox, oy },
    raw: rawName,
    aligned: stdName,
    friendlyName: friendly,
  };
}

function processSourceFile(sourcePath, options) {
  const buffer = fs.readFileSync(sourcePath);
  const source = PNG.sync.read(buffer);
  const sourceStem = path.basename(sourcePath, path.extname(sourcePath));
  const blocksX = Math.ceil(source.width / BLOCK_SIZE);
  const blocksY = Math.ceil(source.height / BLOCK_SIZE);
  const exported = [];
  let blockIndex = 0;

  for (let by = 0; by < blocksY; by += 1) {
    for (let bx = 0; bx < blocksX; bx += 1) {
      const blockPng = extractBlock(source, bx, by);
      const entry = processBlock({
        blockPng,
        blockIndex,
        blockX: bx,
        blockY: by,
        outputDir: options.outputDir,
        sourceStem,
        basePng: options.basePng,
        mode: options.mode,
        seamCleanup: options.seamCleanup,
        nameMap: options.nameMap,
      });
      if (entry) exported.push(entry);
      blockIndex += 1;
    }
  }

  return {
    source: sourcePath,
    blocksTotal: blocksX * blocksY,
    exportedCount: exported.length,
    exported,
  };
}

function main() {
  const opts = parseArgs();
  fs.mkdirSync(opts.outputDir, { recursive: true });

  if (opts.mode === "align" && !fs.existsSync(opts.basePath)) {
    console.error(`No existe base: ${opts.basePath}`);
    process.exit(1);
  }

  const basePng =
    opts.mode === "align" ? PNG.sync.read(fs.readFileSync(opts.basePath)) : null;
  const nameMap = loadNameMap(opts.namesPath);

  const files = fs
    .readdirSync(opts.inputDir)
    .filter((f) => f.toLowerCase().endsWith(".png"))
    .map((f) => path.join(opts.inputDir, f))
    .sort();

  if (files.length === 0) {
    console.error(`No hay PNG en ${opts.inputDir}`);
    process.exit(1);
  }

  const reports = [];
  for (const file of files) {
    const report = processSourceFile(file, {
      outputDir: opts.outputDir,
      basePng,
      mode: opts.mode,
      seamCleanup: opts.seamCleanup,
      nameMap,
    });
    reports.push(report);
    console.log(
      `${path.basename(file)} -> ${report.exportedCount}/${report.blocksTotal} bloques`
    );
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: opts.mode,
    inputDir: opts.inputDir,
    outputDir: opts.outputDir,
    basePath: opts.mode === "align" ? opts.basePath : null,
    seamCleanup: opts.seamCleanup,
    reports,
  };

  const reportPath = path.join(opts.outputDir, "pipeline-armor-std1-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`Reporte: ${reportPath}`);
}

main();
