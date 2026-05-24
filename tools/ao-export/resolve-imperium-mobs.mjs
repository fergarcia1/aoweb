import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const PK_CONTRA = Buffer.from("$FlLrjB3JoliHdAPKA8&YaJR5", "latin1");

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    npcDat: "C:/Users/imaga/Desktop/AOWEB/tools/imperium-clasico-ref/Server/Dat/NPCs.dat",
    scriptsIac:
      "C:/Users/imaga/Desktop/AOWEB/tools/imperium-clasico-ref/Cliente/Recursos/Scripts.IAC",
    bmpDir:
      "C:/Users/imaga/Desktop/AOWEB/tools/imperium-clasico-ref/Cliente/Recursos/Graficos",
    outDir: "C:/Users/imaga/Desktop/AOWEB/public/assets/ao/imperium/mobs/npc_bodies",
  };
  for (let i = 0; i < args.length; i++) {
    const k = args[i];
    if (k === "--npc-dat") opts.npcDat = args[++i];
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
    const fileSizeUncompressed = (iacBuf.readUInt32LE(off + 40) ^ 447915732) >>> 0;

    const nameBytes = Buffer.alloc(32);
    for (let j = 0; j < 32; j++) {
      const pos = j + 1; // VB is 1-based
      const key = pos % 2 === 0 ? 12 : 23;
      nameBytes[j] = nameEnc[j] ^ key;
    }
    const name = nameBytes.toString("latin1").replace(/\0+$/g, "").trimEnd().toLowerCase();
    map.set(name, { fileStart, fileSize, fileSizeUncompressed, name });
  }
  return map;
}

function iacExtract(iacBuf, table, filename) {
  const key = filename.toLowerCase();
  const entry = table.get(key);
  if (!entry) throw new Error(`No encontrado en IAC: ${filename}`);

  const start = Math.max(0, entry.fileStart - 1); // VB binary position is 1-based
  const end = start + entry.fileSize;
  const compressed = Buffer.from(iacBuf.subarray(start, end));

  if (PK_CONTRA.length > 0 && PK_CONTRA.length <= compressed.length) {
    for (let i = 0; i < PK_CONTRA.length; i++) compressed[i] ^= PK_CONTRA[i];
  }
  return zlib.inflateSync(compressed);
}

function parsePersonajesInd(buf) {
  let o = 0;
  o += 255; // desc fixed string
  o += 4; // crc
  o += 4; // magic
  const numBodies = buf.readInt16LE(o);
  o += 2;

  const bodies = new Map();
  for (let i = 1; i <= numBodies; i++) {
    const walk1 = buf.readInt32LE(o);
    const walk2 = buf.readInt32LE(o + 4);
    const walk3 = buf.readInt32LE(o + 8);
    const walk4 = buf.readInt32LE(o + 12);
    const headOffsetX = buf.readInt16LE(o + 16);
    const headOffsetY = buf.readInt16LE(o + 18);
    o += 20;
    bodies.set(i, { walk: [walk1, walk2, walk3, walk4], headOffsetX, headOffsetY });
  }
  return bodies;
}

function parseGraficosInd(buf) {
  let o = 0;
  o += 255;
  o += 4;
  o += 4;
  const fileVersion = buf.readInt32LE(o);
  o += 4;
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
  return { fileVersion, grhCount, grh };
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

function parseNpcsDat(text) {
  const lines = text.split(/\r?\n/);
  const npcs = [];
  let sectionCriaturas = false;
  let cur = null;

  const flush = () => {
    if (cur) npcs.push(cur);
    cur = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (/^'\-+>/.test(line)) {
      if (/criaturas/i.test(line)) sectionCriaturas = true;
      else if (sectionCriaturas) sectionCriaturas = false;
    }
    const mNpc = line.match(/^\[NPC(\d+)\]/i);
    if (mNpc) {
      flush();
      cur = { npcId: Number(mNpc[1]), inCriaturas: sectionCriaturas };
      continue;
    }
    if (!cur) continue;
    const kv = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!kv) continue;
    cur[kv[1].toLowerCase()] = kv[2];
  }
  flush();
  return npcs;
}

function asInt(v) {
  if (v == null) return null;
  const m = String(v).match(/^\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

function asString(v) {
  return v == null ? "" : String(v);
}

function isMobCandidate(n) {
  const attackable = asInt(n.attackable) === 1;
  if (!attackable) return false;
  const body = asInt(n.body);
  if (!body || body <= 0) return false;
  const exp = asInt(n.giveexp) ?? 0;
  const npcType = asInt(n.npctype) ?? 0;
  return n.inCriaturas || (exp > 0 && npcType === 0);
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const opts = parseArgs();
for (const p of [opts.npcDat, opts.scriptsIac, opts.bmpDir]) {
  if (!fs.existsSync(p)) throw new Error(`Ruta inexistente: ${p}`);
}
fs.mkdirSync(opts.outDir, { recursive: true });

const iac = fs.readFileSync(opts.scriptsIac);
const iacTable = iacFileTable(iac);
const personajes = parsePersonajesInd(iacExtract(iac, iacTable, "Personajes.ind"));
const graficos = parseGraficosInd(iacExtract(iac, iacTable, "Graficos.ind"));
const npcs = parseNpcsDat(fs.readFileSync(opts.npcDat, "latin1"));

const mobs = npcs.filter(isMobCandidate);
const rows = [];
const uniqueFileNums = new Set();
const missingBodies = new Set();

for (const n of mobs) {
  const bodyId = asInt(n.body);
  const bodyDef = personajes.get(bodyId);
  if (!bodyDef) {
    missingBodies.add(bodyId);
    rows.push({
      npcId: n.npcId,
      name: asString(n.name),
      bodyId,
      inCriaturas: n.inCriaturas ? 1 : 0,
      giveExp: asInt(n.giveexp) ?? 0,
      grh1: "",
      grh2: "",
      grh3: "",
      grh4: "",
      file1: "",
      file2: "",
      file3: "",
      file4: "",
    });
    continue;
  }
  const grhWalk = bodyDef.walk.map((x) => Number(x || 0));
  const fileNums = grhWalk.map((grhId) => resolveFileNum(graficos.grh, grhId) ?? "");
  fileNums.forEach((x) => {
    if (x && x > 0) uniqueFileNums.add(x);
  });
  rows.push({
    npcId: n.npcId,
    name: asString(n.name),
    bodyId,
    inCriaturas: n.inCriaturas ? 1 : 0,
    giveExp: asInt(n.giveexp) ?? 0,
    grh1: grhWalk[0],
    grh2: grhWalk[1],
    grh3: grhWalk[2],
    grh4: grhWalk[3],
    file1: fileNums[0],
    file2: fileNums[1],
    file3: fileNums[2],
    file4: fileNums[3],
  });
}

const sortedFileNums = [...uniqueFileNums].sort((a, b) => a - b);
const existingBmp = [];
const missingBmp = [];
for (const id of sortedFileNums) {
  const bmpPath = path.join(opts.bmpDir, `${id}.bmp`);
  if (fs.existsSync(bmpPath)) existingBmp.push(id);
  else missingBmp.push(id);
}

const csvHeader = [
  "npcId",
  "name",
  "bodyId",
  "inCriaturas",
  "giveExp",
  "grh1",
  "grh2",
  "grh3",
  "grh4",
  "file1",
  "file2",
  "file3",
  "file4",
];
const csvLines = [csvHeader.join(",")];
for (const r of rows) {
  csvLines.push(csvHeader.map((k) => csvEscape(r[k])).join(","));
}

fs.writeFileSync(path.join(opts.outDir, "mobs_manifest.csv"), csvLines.join("\n"), "utf8");
fs.writeFileSync(path.join(opts.outDir, "mobs_filenums.txt"), existingBmp.join("\n"), "utf8");
fs.writeFileSync(path.join(opts.outDir, "mobs_missing_bmp.txt"), missingBmp.join("\n") || "none", "utf8");
fs.writeFileSync(
  path.join(opts.outDir, "mobs_missing_body_index.txt"),
  [...missingBodies].sort((a, b) => a - b).join("\n") || "none",
  "utf8"
);

console.log(`NPC mobs candidatos: ${mobs.length}`);
console.log(`Bodies faltantes en Personajes.ind: ${missingBodies.size}`);
console.log(`BMP ids resueltos: ${sortedFileNums.length}`);
console.log(`BMP ids existentes: ${existingBmp.length}`);
console.log(`BMP ids faltantes: ${missingBmp.length}`);
console.log(`Salida: ${opts.outDir}`);
