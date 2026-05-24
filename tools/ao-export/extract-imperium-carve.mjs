import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const inputFile = process.argv[2];
const outputDir = process.argv[3] ?? path.resolve("imperium-carved");

if (!inputFile) {
  console.error("Uso: node extract-imperium-carve.mjs <archivo.iao> [outputDir]");
  process.exit(1);
}

const data = fs.readFileSync(inputFile);
fs.mkdirSync(outputDir, { recursive: true });
const pngDir = path.join(outputDir, "png");
const bmpDir = path.join(outputDir, "bmp");
fs.mkdirSync(pngDir, { recursive: true });
fs.mkdirSync(bmpDir, { recursive: true });

const seenHashes = new Set();
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_ASSET_SIZE = 24 * 1024 * 1024;

function sha1(buf) {
  return crypto.createHash("sha1").update(buf).digest("hex");
}

function saveUnique(kind, start, end, bytes) {
  const hash = sha1(bytes);
  if (seenHashes.has(hash)) return false;
  seenHashes.add(hash);
  const dir = kind === "png" ? pngDir : bmpDir;
  const filename = `${kind}_${String(seenHashes.size).padStart(5, "0")}_${start}_${end}.${kind}`;
  fs.writeFileSync(path.join(dir, filename), bytes);
  return true;
}

function tryReadPngAt(offset) {
  if (offset + 8 >= data.length) return null;
  if (!data.subarray(offset, offset + 8).equals(PNG_SIG)) return null;
  let ptr = offset + 8;
  let chunkIndex = 0;
  let sawIEND = false;
  let sawIDAT = false;
  let width = 0;
  let height = 0;
  while (ptr + 12 <= data.length) {
    const len = data.readUInt32BE(ptr);
    const type = data.subarray(ptr + 4, ptr + 8).toString("ascii");
    const chunkEnd = ptr + 12 + len;
    if (len > MAX_ASSET_SIZE || chunkEnd > data.length) return null;
    if (!/^[A-Za-z]{4}$/.test(type)) return null;
    if (chunkIndex === 0) {
      if (type !== "IHDR" || len !== 13) return null;
      width = data.readUInt32BE(ptr + 8);
      height = data.readUInt32BE(ptr + 12);
      if (width < 1 || width > 20000 || height < 1 || height > 20000) return null;
    } else if (type === "IHDR") {
      return null;
    }
    if (type === "IDAT") sawIDAT = true;
    ptr = chunkEnd;
    if (type === "IEND") {
      if (len !== 0) return null;
      sawIEND = true;
      break;
    }
    chunkIndex++;
  }
  if (!sawIEND || !sawIDAT) return null;
  const end = ptr;
  const bytes = data.subarray(offset, end);
  if (bytes.length < 80 || bytes.length > MAX_ASSET_SIZE) return null;
  return { end, bytes };
}

function validBmpHeader(offset, fileSize) {
  if (offset + 54 > data.length) return false;
  const reserved1 = data.readUInt16LE(offset + 6);
  const reserved2 = data.readUInt16LE(offset + 8);
  const dibSize = data.readUInt32LE(offset + 14);
  const width = data.readInt32LE(offset + 18);
  const height = data.readInt32LE(offset + 22);
  return (
    reserved1 === 0 &&
    reserved2 === 0 &&
    [12, 40, 52, 56, 108, 124].includes(dibSize) &&
    fileSize >= 54 &&
    fileSize <= MAX_ASSET_SIZE &&
    Math.abs(width) > 0 &&
    Math.abs(width) < 20000 &&
    Math.abs(height) > 0 &&
    Math.abs(height) < 20000
  );
}

function tryReadBmpAt(offset) {
  if (offset + 14 > data.length) return null;
  if (data[offset] !== 0x42 || data[offset + 1] !== 0x4d) return null;
  const fileSize = data.readUInt32LE(offset + 2);
  const end = offset + fileSize;
  if (end > data.length || !validBmpHeader(offset, fileSize)) return null;
  const bytes = data.subarray(offset, end);
  return { end, bytes };
}

let pngCount = 0;
let bmpCount = 0;
let scanned = 0;
for (let i = 0; i < data.length - 8; i++) {
  scanned++;
  if (data[i] === 0x89) {
    const png = tryReadPngAt(i);
    if (png && saveUnique("png", i, png.end, png.bytes)) {
      pngCount++;
      i = png.end - 1;
      continue;
    }
  }
  if (data[i] === 0x42 && data[i + 1] === 0x4d) {
    const bmp = tryReadBmpAt(i);
    if (bmp && saveUnique("bmp", i, bmp.end, bmp.bytes)) {
      bmpCount++;
      i = bmp.end - 1;
      continue;
    }
  }
}

console.log(`Archivo: ${inputFile}`);
console.log(`Output: ${outputDir}`);
console.log(`Escaneado bytes: ${scanned}`);
console.log(`PNG extraidos: ${pngCount}`);
console.log(`BMP extraidos: ${bmpCount}`);
