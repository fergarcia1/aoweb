/**
 * Exporta un spritesheet de personaje/outfit para Phaser (32x48, 6 cols, 4 filas S/W/A/D).
 *
 * Fuentes con celdas ya compuestas (ej. 1000.png, 1004.png): recorte directo + chroma + recenter.
 * Fuentes STD1 partidas (ej. 1105.png): compone torso+piernas en "down" y copia el resto.
 *
 * Uso:
 *   node export-player-sheet.mjs --src 1004.png --out armor_cuero_std.png
 *   node export-player-sheet.mjs --src 1105.png --out human_from_1105.png --mode std1
 */

import fs from "fs";
import path from "path";
import { PNG } from "pngjs";

const FRAME_W = 32;
const FRAME_H = 48;
const OUT_COLS = 6;
const OUT_ROWS = 4;
const TILE = 32;

const AO_GRAPHICS =
  process.env.AO_GRAPHICS_DIR ??
  "C:/Users/imaga/Desktop/RecursosAO/Recursos/Graficos_extraido";
const AO_WEB =
  process.env.AO_WEB_DIR ?? "C:/Users/imaga/Desktop/AOWEB/public/assets/ao";

function parseArgs() {
  const args = process.argv.slice(2);
  let src = null;
  let out = null;
  let mode = "direct";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--src") src = args[++i];
    else if (args[i] === "--out") out = args[++i];
    else if (args[i] === "--mode") mode = args[++i];
  }
  if (!src || !out) {
    console.error(
      "Uso: node export-player-sheet.mjs --src <file.png> --out <out.png> [--mode direct|std1]"
    );
    process.exit(1);
  }
  const srcPath = path.isAbsolute(src) ? src : path.join(AO_GRAPHICS, src);
  const outPath = path.isAbsolute(out) ? out : path.join(AO_WEB, out);
  return { srcPath, outPath, mode };
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

function setFramePixel(frame, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= FRAME_W || y >= FRAME_H || isBg(r, g, b, a)) return;
  const i = (y * FRAME_W + x) * 4;
  frame[i] = r;
  frame[i + 1] = g;
  frame[i + 2] = b;
  frame[i + 3] = a;
}

function blitTile32(src, srcX, srcY, frame, destOffsetY) {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const [r, g, b, a] = getPixel(src, srcX + x, srcY + y);
      setFramePixel(frame, x, y + destOffsetY, r, g, b, a);
    }
  }
}

function composeStd1Down(src, frameIdx) {
  const frame = Buffer.alloc(FRAME_W * FRAME_H * 4);
  const leg =
    frameIdx === 4 ? { row: 5, col: 4 } : { row: 4, col: frameIdx };
  blitTile32(src, leg.col * TILE, leg.row * TILE, frame, FRAME_H - TILE);
  blitTile32(src, frameIdx * TILE, 0, frame, FRAME_H - TILE);
  return frame;
}

function copyStd1BodyRow(src, bodyRow, frameIdx) {
  const frame = Buffer.alloc(FRAME_W * FRAME_H * 4);
  blitTile32(src, frameIdx * TILE, bodyRow * TILE, frame, FRAME_H - TILE);
  return frame;
}

function extractDirect(src, col, row) {
  const frame = Buffer.alloc(FRAME_W * FRAME_H * 4);
  const sx = col * FRAME_W;
  const sy = row * FRAME_H;
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const [r, g, b, a] = getPixel(src, sx + x, sy + y);
      setFramePixel(frame, x, y, r, g, b, a);
    }
  }
  return frame;
}

function recenterFrame(frame) {
  let minX = FRAME_W;
  let maxX = -1;
  let minY = FRAME_H;
  let maxY = -1;

  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      if (frame[(y * FRAME_W + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return frame;

  const feetY = FRAME_H - 1;
  const shiftX = Math.floor((FRAME_W - (maxX - minX + 1)) / 2) - minX;
  const shiftY = feetY - maxY;
  const out = Buffer.alloc(FRAME_W * FRAME_H * 4);

  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const sx = x - shiftX;
      const sy = y - shiftY;
      if (sx >= 0 && sx < FRAME_W && sy >= 0 && sy < FRAME_H) {
        const si = (sy * FRAME_W + sx) * 4;
        const di = (y * FRAME_W + x) * 4;
        out[di] = frame[si];
        out[di + 1] = frame[si + 1];
        out[di + 2] = frame[si + 2];
        out[di + 3] = frame[si + 3];
      }
    }
  }

  return out;
}

function writeFrame(outPng, frame, col, row) {
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const si = (y * FRAME_W + x) * 4;
      const di = ((row * FRAME_H + y) * outPng.width + (col * FRAME_W + x)) * 4;
      outPng.data[di] = frame[si];
      outPng.data[di + 1] = frame[si + 1];
      outPng.data[di + 2] = frame[si + 2];
      outPng.data[di + 3] = frame[si + 3];
    }
  }
}

const { srcPath, outPath, mode } = parseArgs();
const src = PNG.sync.read(fs.readFileSync(srcPath));
const outPng = new PNG({ width: OUT_COLS * FRAME_W, height: OUT_ROWS * FRAME_H });

const frameCounts = [5, 5, 5, 5];

for (let outRow = 0; outRow < OUT_ROWS; outRow++) {
  const count = frameCounts[outRow];
  for (let frame = 0; frame < OUT_COLS; frame++) {
    let raw;
    if (frame >= count) {
      raw = Buffer.alloc(FRAME_W * FRAME_H * 4);
    } else if (mode === "std1") {
      if (outRow === 0) raw = composeStd1Down(src, frame);
      else raw = copyStd1BodyRow(src, outRow, frame);
    } else {
      raw = extractDirect(src, frame, outRow);
    }
    writeFrame(outPng, recenterFrame(raw), frame, outRow);
  }
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, PNG.sync.write(outPng));
console.log("OK ->", outPath, `(${mode})`);
