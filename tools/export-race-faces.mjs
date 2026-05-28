/**
 * Exporta hojas {race}_{gender}_faces.png (11 caras × 4 direcciones, 20×32)
 * desde cabezas.ini + graficos.ini + Graficos_extraido.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const FRAME_W = 20;
const FRAME_H = 32;
const SRC_W = 27;
const SRC_H = 64;
const FACE_COUNT = 11;
const ROWS = 4;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recursos = "C:/Users/imaga/Desktop/recursosAO/Recursos";
const graficosDir = path.join(recursos, "Graficos_extraido");
const cabezasIni = path.join(recursos, "init/cabezas.ini");
const headDataPath = path.join(recursos, "init/HeadAndBodyData.json");
const outDir = path.join(root, "public/assets/ao/razes");

const RACE_KEY = {
  Human: "human",
  Elf: "elf",
  Drow: "drow",
  Dwarf: "dwarf",
  Gnome: "gnome",
  Orc: "orc",
};

/**
 * Filas del sheet (igual que human_male_faces / cuerpo STD):
 * f1=S (sur), f2=W (norte/espalda), f3=A (oeste), f4=D (este)
 * Según posición Y en el atlas AO (27×64 por dirección).
 */
const ATLAS_Y_TO_ROW = new Map([
  [0, 2],
  [64, 0],
  [128, 3],
  [192, 1],
]);

const TARGET_HEAD_H = 16;

function loadGrhMap(iniPath) {
  const text = fs.readFileSync(iniPath, "latin1");
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(/^Grh(\d+)=(.+)$/i);
    if (m) map.set(Number(m[1]), m[2]);
  }
  return map;
}

function parseStaticGrh(value) {
  const parts = value.split("-");
  if (Number(parts[0]) !== 1) {
    throw new Error(`Grh animado no soportado: ${value}`);
  }
  return {
    fileNum: Number(parts[1]),
    x: Number(parts[2]),
    y: Number(parts[3]),
    w: Number(parts[4]),
    h: Number(parts[5]),
  };
}

function loadCabezas(iniPath) {
  const text = fs.readFileSync(iniPath, "latin1");
  const heads = new Map();
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const section = line.match(/^\[HEAD(\d+)\]$/i);
    if (section) {
      current = Number(section[1]);
      heads.set(current, []);
      continue;
    }
    if (!current) continue;
    const kv = line.match(/^Head(\d+)=(\d+)/i);
    if (kv) {
      const slot = Number(kv[1]) - 1;
      heads.get(current)[slot] = Number(kv[2]);
    }
  }
  return heads;
}

const atlasCache = new Map();

function loadAtlas(fileNum) {
  if (!atlasCache.has(fileNum)) {
    const filePath = path.join(graficosDir, `${fileNum}.png`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Falta atlas ${filePath}`);
    }
    atlasCache.set(fileNum, PNG.sync.read(fs.readFileSync(filePath)));
  }
  return atlasCache.get(fileNum);
}

function cropFrame(atlas, frame) {
  const out = new PNG({ width: frame.w, height: frame.h });
  for (let y = 0; y < frame.h; y += 1) {
    for (let x = 0; x < frame.w; x += 1) {
      const sx = frame.x + x;
      const sy = frame.y + y;
      const srcIdx = (atlas.width * sy + sx) << 2;
      const dstIdx = (frame.w * y + x) << 2;
      out.data[dstIdx] = atlas.data[srcIdx];
      out.data[dstIdx + 1] = atlas.data[srcIdx + 1];
      out.data[dstIdx + 2] = atlas.data[srcIdx + 2];
      out.data[dstIdx + 3] = atlas.data[srcIdx + 3];
    }
  }
  return out;
}

function isVisiblePixel(data, idx) {
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];
  const a = data[idx + 3];
  return a > 10 && r + g + b > 30;
}

function findContentBounds(img) {
  let minX = img.width;
  let minY = img.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      const idx = (img.width * y + x) << 2;
      if (!isVisiblePixel(img.data, idx)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  };
}

function extractRegion(img, bounds) {
  const out = new PNG({ width: bounds.w, height: bounds.h });
  for (let y = 0; y < bounds.h; y += 1) {
    for (let x = 0; x < bounds.w; x += 1) {
      const srcIdx = (img.width * (bounds.y + y) + (bounds.x + x)) << 2;
      const dstIdx = (bounds.w * y + x) << 2;
      out.data[dstIdx] = img.data[srcIdx];
      out.data[dstIdx + 1] = img.data[srcIdx + 1];
      out.data[dstIdx + 2] = img.data[srcIdx + 2];
      out.data[dstIdx + 3] = img.data[srcIdx + 3];
    }
  }
  return out;
}

function resizeNearest(src, dstW, dstH) {
  const out = new PNG({ width: dstW, height: dstH });
  for (let y = 0; y < dstH; y += 1) {
    for (let x = 0; x < dstW; x += 1) {
      const sx = Math.min(src.width - 1, Math.floor((x * src.width) / dstW));
      const sy = Math.min(src.height - 1, Math.floor((y * src.height) / dstH));
      const srcIdx = (src.width * sy + sx) << 2;
      const dstIdx = (dstW * y + x) << 2;
      out.data[dstIdx] = src.data[srcIdx];
      out.data[dstIdx + 1] = src.data[srcIdx + 1];
      out.data[dstIdx + 2] = src.data[srcIdx + 2];
      out.data[dstIdx + 3] = src.data[srcIdx + 3];
    }
  }
  return out;
}

function rowForAtlasY(y) {
  const row = ATLAS_Y_TO_ROW.get(y);
  if (row === undefined) {
    throw new Error(`Y=${y} no mapeado a fila S/W/A/D`);
  }
  return row;
}

/** Altura fija en todas las celdas (como human_male_faces ~16px). */
function fitHeadToCell(tight, drawH = TARGET_HEAD_H) {
  const cell = new PNG({ width: FRAME_W, height: FRAME_H });
  if (!tight) {
    return cell;
  }

  const scale = drawH / tight.height;
  let drawW = Math.max(1, Math.round(tight.width * scale));
  if (drawW > FRAME_W) {
    drawW = FRAME_W;
  }
  const scaled = resizeNearest(tight, drawW, drawH);
  const dx = Math.floor((FRAME_W - drawW) / 2);
  const dy = FRAME_H - drawH;
  blit(cell, scaled, dx, dy);
  return cell;
}

function blit(dst, src, dx, dy) {
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      const dstX = dx + x;
      const dstY = dy + y;
      if (dstX < 0 || dstY < 0 || dstX >= dst.width || dstY >= dst.height) continue;
      const srcIdx = (src.width * y + x) << 2;
      const dstIdx = (dst.width * dstY + dstX) << 2;
      dst.data[dstIdx] = src.data[srcIdx];
      dst.data[dstIdx + 1] = src.data[srcIdx + 1];
      dst.data[dstIdx + 2] = src.data[srcIdx + 2];
      dst.data[dstIdx + 3] = src.data[srcIdx + 3];
    }
  }
}

function exportFaceSheet({ race, gender, headStart, grhs, cabezas, skip }) {
  const fileName = `${race}_${gender}_faces.png`;
  const outPath = path.join(outDir, fileName);
  if (skip) {
    console.log(`skip ${fileName} (referencia manual, usar --force-human-male para sobrescribir)`);
    return;
  }

  const sheet = new PNG({
    width: FACE_COUNT * FRAME_W,
    height: ROWS * FRAME_H,
  });

  const pending = [];

  for (let face = 0; face < FACE_COUNT; face += 1) {
    const headId = headStart + face;
    const grhIds = cabezas.get(headId);
    if (!grhIds || grhIds.length < 4) {
      throw new Error(`HEAD${headId} incompleto`);
    }

    for (let slot = 0; slot < 4; slot += 1) {
      const grhId = grhIds[slot];
      const raw = grhs.get(grhId);
      if (!raw) throw new Error(`Grh${grhId} no encontrado (HEAD${headId})`);
      const frame = parseStaticGrh(raw);
      const atlas = loadAtlas(frame.fileNum);
      const cropped = cropFrame(atlas, frame);
      const bounds = findContentBounds(cropped);
      const tight = bounds ? extractRegion(cropped, bounds) : null;
      pending.push({
        col: face,
        row: rowForAtlasY(frame.y),
        tight,
      });
    }
  }

  for (const entry of pending) {
    const fitted = fitHeadToCell(entry.tight, TARGET_HEAD_H);
    blit(sheet, fitted, entry.col * FRAME_W, entry.row * FRAME_H);
  }

  fs.writeFileSync(outPath, PNG.sync.write(sheet));
  console.log(`ok ${fileName} (${sheet.width}x${sheet.height})`);
}

const grhs = loadGrhMap(path.join(recursos, "init/graficos.ini"));
const cabezas = loadCabezas(cabezasIni);
const headData = JSON.parse(fs.readFileSync(headDataPath, "utf8"));

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.slice("--only=".length).split(",") : null;
/** Referencia manual; solo reexportar con --force-human-male */
const skipHumanMale = !process.argv.includes("--force-human-male");

fs.mkdirSync(outDir, { recursive: true });

for (const [raceName, config] of Object.entries(headData)) {
  const race = RACE_KEY[raceName];
  if (!race) continue;
  for (const gender of ["male", "female"]) {
    const id = `${race}_${gender}`;
    if (only && !only.includes(id)) continue;
    const block = config[gender];
    exportFaceSheet({
      race,
      gender,
      headStart: block.start,
      grhs,
      cabezas,
      skip: race === "human" && gender === "male" && skipHumanMale,
    });
  }
}
