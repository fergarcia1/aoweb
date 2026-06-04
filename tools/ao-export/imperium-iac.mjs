/**
 * Lectura de Personajes.ind / Graficos.ind desde Scripts.IAC (Imperium Clásico).
 */
import fs from "node:fs";
import zlib from "node:zlib";

const PK_CONTRA = Buffer.from("$FlLrjB3JoliHdAPKA8&YaJR5", "latin1");

export function iacFileTable(iacBuf) {
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
    map.set(name, { fileStart, fileSize });
  }
  return map;
}

export function iacExtract(iacBuf, table, filename) {
  const entry = table.get(filename.toLowerCase());
  if (!entry) {
    throw new Error(`No encontrado en IAC: ${filename}`);
  }
  const start = Math.max(0, entry.fileStart - 1);
  const end = start + entry.fileSize;
  const compressed = Buffer.from(iacBuf.subarray(start, end));
  for (let i = 0; i < PK_CONTRA.length && i < compressed.length; i++) {
    compressed[i] ^= PK_CONTRA[i];
  }
  return zlib.inflateSync(compressed);
}

export function parsePersonajesInd(buf) {
  let o = 255 + 4 + 4;
  const numBodies = buf.readInt16LE(o);
  o += 2;

  const bodies = new Map();
  for (let i = 1; i <= numBodies; i++) {
    const walk = [
      buf.readInt32LE(o),
      buf.readInt32LE(o + 4),
      buf.readInt32LE(o + 8),
      buf.readInt32LE(o + 12),
    ];
    const headOffsetX = buf.readInt16LE(o + 16);
    const headOffsetY = buf.readInt16LE(o + 18);
    o += 20;
    bodies.set(i, { walk, headOffsetX, headOffsetY });
  }
  return bodies;
}

export function parseGraficosInd(buf) {
  let o = 255 + 4 + 4 + 4;
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
      grh.set(id, {
        id,
        numFrames,
        frames: [id],
        fileNum,
        pixelWidth,
        pixelHeight,
        sX,
        sY,
      });
    }
    if (id === grhCount) break;
  }
  return { grhCount, grh };
}

/** Expande un Grh a frames estáticos (fileNum + rect). */
export function expandGrhFrames(grhMap, grhId, seen = new Set()) {
  if (!grhId || grhId <= 0 || seen.has(grhId)) return [];
  seen.add(grhId);
  const entry = grhMap.get(grhId);
  if (!entry) return [];

  if (entry.fileNum && entry.fileNum > 0) {
    return [
      {
        grhId: entry.id,
        fileNum: entry.fileNum,
        x: entry.sX,
        y: entry.sY,
        w: entry.pixelWidth,
        h: entry.pixelHeight,
      },
    ];
  }

  if (entry.frames?.length) {
    return entry.frames.flatMap((childId) => expandGrhFrames(grhMap, childId, seen));
  }
  return [];
}

/** Filas en Personajes.ind (walk[0..3]): W, D, S, A. */
export const IMPERIUM_DIRECTION_ROWS = ["up", "right", "down", "left"];

/** Filas en la hoja PNG exportada (convención AOWEB / mobs/npc_bodies): S, W, A, D. */
export const MOB_SHEET_ROW_FACINGS_SWAD = ["down", "up", "left", "right"];

export function resolveBodyDirectionFrames(personajes, grhMap, bodyId) {
  const bodyDef = personajes.get(bodyId);
  if (!bodyDef) {
    return { ok: false, reason: "missing_body_index" };
  }

  const directions = [];
  for (let row = 0; row < 4; row += 1) {
    const walkGrh = bodyDef.walk[row];
    const frames = expandGrhFrames(grhMap, walkGrh);
    if (frames.length === 0) {
      return { ok: false, reason: "missing_grh", row, walkGrh };
    }
    directions.push({
      facing: IMPERIUM_DIRECTION_ROWS[row],
      walkGrh,
      frames,
    });
  }

  return {
    ok: true,
    headOffsetX: bodyDef.headOffsetX,
    headOffsetY: bodyDef.headOffsetY,
    directions,
  };
}

export function loadImperiumIndices(scriptsIacPath) {
  const iac = fs.readFileSync(scriptsIacPath);
  const table = iacFileTable(iac);
  const personajes = parsePersonajesInd(iacExtract(iac, table, "Personajes.ind"));
  const { grh: grhMap } = parseGraficosInd(iacExtract(iac, table, "Graficos.ind"));
  return { personajes, grhMap };
}
