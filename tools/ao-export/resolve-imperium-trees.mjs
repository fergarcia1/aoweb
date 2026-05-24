import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const PK_CONTRA = Buffer.from("$FlLrjB3JoliHdAPKA8&YaJR5", "latin1");

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    objDat: "C:/Users/imaga/Desktop/AOWEB/tools/imperium-clasico-ref/Server/Dat/obj.dat",
    scriptsIac:
      "C:/Users/imaga/Desktop/AOWEB/tools/imperium-clasico-ref/Cliente/Recursos/Scripts.IAC",
    bmpDir: "C:/Users/imaga/Desktop/AOWEB/tools/imperium-clasico-ref/Cliente/Recursos/Graficos",
    outDir: "C:/Users/imaga/Desktop/AOWEB/public/assets/ao/imperium/trees",
  };
  for (let i = 0; i < args.length; i++) {
    const k = args[i];
    if (k === "--obj-dat") opts.objDat = args[++i];
    else if (k === "--scripts-iac") opts.scriptsIac = args[++i];
    else if (k === "--bmp-dir") opts.bmpDir = args[++i];
    else if (k === "--out-dir") opts.outDir = args[++i];
  }
  return opts;
}

function iacFileTable(iacBuf) {
  const fileHeaderSize = 8;
  const infoHeaderSize = 44;
  const numFiles = (iacBuf.readUInt32LE(4) ^ 37816) >>> 0;
  const map = new Map();

  for (let i = 0; i < numFiles; i++) {
    const off = fileHeaderSize + i * infoHeaderSize;
    const fileStart = (iacBuf.readUInt32LE(off) ^ 172379447) >>> 0;
    const fileSize = (iacBuf.readUInt32LE(off + 4) ^ 221872469) >>> 0;
    const nameEnc = iacBuf.subarray(off + 8, off + 40);

    const nameBytes = Buffer.alloc(32);
    for (let j = 0; j < 32; j++) {
      const pos = j + 1;
      const key = pos % 2 === 0 ? 12 : 23;
      nameBytes[j] = nameEnc[j] ^ key;
    }
    const name = nameBytes.toString("latin1").replace(/\0+$/g, "").trimEnd().toLowerCase();
    map.set(name, { fileStart, fileSize, name });
  }
  return map;
}

function iacExtract(iacBuf, table, filename) {
  const entry = table.get(filename.toLowerCase());
  if (!entry) throw new Error(`No encontrado en IAC: ${filename}`);
  const start = Math.max(0, entry.fileStart - 1);
  const end = start + entry.fileSize;
  const compressed = Buffer.from(iacBuf.subarray(start, end));

  if (PK_CONTRA.length > 0 && PK_CONTRA.length <= compressed.length) {
    for (let i = 0; i < PK_CONTRA.length; i++) compressed[i] ^= PK_CONTRA[i];
  }
  return zlib.inflateSync(compressed);
}

function parseGraficosInd(buf) {
  let o = 0;
  o += 255;
  o += 4;
  o += 4;
  o += 4; // fileVersion
  const grhCount = buf.readInt32LE(o);
  o += 4;

  const grh = new Map();
  while (o + 6 <= buf.length) {
    const id = buf.readInt32LE(o);
    o += 4;
    const numFrames = buf.readInt16LE(o);
    o += 2;
    if (id <= 0 || numFrames <= 0) break;

    if (numFrames > 1) {
      const frames = [];
      for (let i = 0; i < numFrames; i++) {
        frames.push(buf.readInt32LE(o));
        o += 4;
      }
      const speed = buf.readFloatLE(o);
      o += 4;
      grh.set(id, { id, numFrames, frames, speed, fileNum: null });
    } else {
      const fileNum = buf.readInt32LE(o);
      const pixelWidth = buf.readInt16LE(o + 4);
      const pixelHeight = buf.readInt16LE(o + 6);
      const sX = buf.readInt16LE(o + 8);
      const sY = buf.readInt16LE(o + 10);
      o += 12;
      grh.set(id, { id, numFrames, frames: [id], fileNum, pixelWidth, pixelHeight, sX, sY });
    }
    if (id === grhCount) break;
  }
  return { grhCount, grh };
}

function resolveFileNum(grhMap, grhId, seen = new Set()) {
  if (!grhId || seen.has(grhId)) return null;
  seen.add(grhId);
  const entry = grhMap.get(grhId);
  if (!entry) return null;
  if (entry.fileNum && entry.fileNum > 0) return entry.fileNum;
  if (!entry.frames || entry.frames.length === 0) return null;
  return resolveFileNum(grhMap, entry.frames[0], seen);
}

const opts = parseArgs();
for (const p of [opts.objDat, opts.scriptsIac, opts.bmpDir]) {
  if (!fs.existsSync(p)) throw new Error(`Ruta inexistente: ${p}`);
}
fs.mkdirSync(opts.outDir, { recursive: true });

const iac = fs.readFileSync(opts.scriptsIac);
const iacTable = iacFileTable(iac);
const graficos = parseGraficosInd(iacExtract(iac, iacTable, "Graficos.ind"));
const objDatText = fs.readFileSync(opts.objDat).toString("utf16le");
const treeBlockStart = objDatText.indexOf("[OBJ4]");
const treeBlockEnd = objDatText.indexOf("[OBJ384]");
if (treeBlockStart < 0 || treeBlockEnd <= treeBlockStart) {
  throw new Error("No se pudo localizar el bloque de arboles en obj.dat");
}
const treeBlock = objDatText.slice(treeBlockStart, treeBlockEnd);

const treeCandidates = [];
const sections = treeBlock.split(/(?=\[OBJ\d+\])/i).filter(Boolean);
for (const sec of sections) {
  const objId = Number(sec.match(/\[OBJ(\d+)\]/i)?.[1] ?? 0);
  const grhId = Number(sec.match(/GrhIndex\s*=\s*(\d+)/i)?.[1] ?? 0);
  if (!objId || !grhId) continue;
  const name = sec.match(/Name\s*=\s*([^\r\n]+)/i)?.[1]?.trim() ?? "Árbol";
  treeCandidates.push({ objId, name, grhId });
}

const rows = [];
const bmpIds = new Set();
for (const obj of treeCandidates) {
  const fileNum = resolveFileNum(graficos.grh, obj.grhId);
  const hasBmp = Boolean(fileNum && fs.existsSync(path.join(opts.bmpDir, `${fileNum}.bmp`)));
  if (hasBmp) bmpIds.add(fileNum);
  rows.push({
    objId: obj.objId,
    name: obj.name,
    grhId: obj.grhId,
    fileNum: fileNum ?? "",
    hasBmp: hasBmp ? 1 : 0,
  });
}

const sortedBmpIds = [...bmpIds].sort((a, b) => a - b);
const header = ["objId", "name", "grhId", "fileNum", "hasBmp"];
const csv = [header.join(",")];
for (const r of rows) {
  const escapedName = /[",\n]/.test(r.name) ? `"${r.name.replace(/"/g, '""')}"` : r.name;
  csv.push([r.objId, escapedName, r.grhId, r.fileNum, r.hasBmp].join(","));
}

fs.writeFileSync(path.join(opts.outDir, "trees_manifest.csv"), csv.join("\n"), "utf8");
fs.writeFileSync(path.join(opts.outDir, "trees_filenums.txt"), sortedBmpIds.join("\n"), "utf8");

console.log(`Objetos candidatos: ${treeCandidates.length}`);
console.log(`BMP unicos encontrados: ${sortedBmpIds.length}`);
console.log(`Salida: ${opts.outDir}`);
