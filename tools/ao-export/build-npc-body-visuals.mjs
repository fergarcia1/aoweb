/**
 * Resuelve gráficos de cuerpo (Personajes.ind + Graficos.ind + BMP) y genera:
 * - public/assets/ao/imperium/npc_bodies/body_{id}.png
 * - game-data/imperium/npcBodyVisuals.json
 * - enriquece game-data/imperium/npcCatalog.json con campo `visual`
 *
 * Uso: node tools/ao-export/build-npc-body-visuals.mjs
 *      node tools/ao-export/build-npc-body-visuals.mjs --limit 20
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import {
  loadImperiumIndices,
  MOB_SHEET_ROW_FACINGS_SWAD,
  resolveBodyDirectionFrames,
} from "./imperium-iac.mjs";
import { decodeAoBmpFile } from "./decode-ao-bmp.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

const DEFAULT_IAC = path.join(
  REPO_ROOT,
  "tools/imperium-clasico-ref/Cliente/Recursos/Scripts.IAC"
);
const DEFAULT_BMP_DIR = path.join(
  REPO_ROOT,
  "tools/imperium-clasico-ref/Cliente/Recursos/Graficos"
);
const CATALOG_JSON = path.join(REPO_ROOT, "game-data/imperium/npcCatalog.json");
const BODY_VISUALS_JSON = path.join(REPO_ROOT, "game-data/imperium/npcBodyVisuals.json");
const OUT_BODIES_DIR = path.join(
  REPO_ROOT,
  "public/assets/ao/imperium/npc_bodies"
);

const BG_TOLERANCE = 12;
const MAX_WALK_FRAMES_PER_DIR = 8;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    scriptsIac: DEFAULT_IAC,
    bmpDir: DEFAULT_BMP_DIR,
    limit: 0,
    bodyIds: "",
    skipCatalogPatch: false,
  };
  for (let i = 0; i < args.length; i++) {
    const k = args[i];
    if (k === "--scripts-iac") opts.scriptsIac = path.resolve(args[++i]);
    else if (k === "--bmp-dir") opts.bmpDir = path.resolve(args[++i]);
    else if (k === "--limit") opts.limit = Number(args[++i] ?? 0);
    else if (k === "--body-ids") opts.bodyIds = args[++i] ?? "";
    else if (k === "--skip-catalog-patch") opts.skipCatalogPatch = true;
  }
  return opts;
}

function isNearBlack(r, g, b) {
  return r <= BG_TOLERANCE && g <= BG_TOLERANCE && b <= BG_TOLERANCE;
}

/** Negro puro o azul clave típico de BMP AO (evita halos azulados). */
function isBackgroundPixel(r, g, b) {
  if (isNearBlack(r, g, b)) return true;
  return r <= BG_TOLERANCE && g <= BG_TOLERANCE && b >= 255 - BG_TOLERANCE;
}

function removeBackgroundBlack(png) {
  const { width, height, data } = png;
  const visited = new Uint8Array(width * height);
  const qx = [];
  const qy = [];
  let head = 0;

  function enqueue(x, y) {
    const idx = y * width + x;
    if (visited[idx]) return;
    const p = idx * 4;
    if (data[p + 3] === 0) return;
    if (!isBackgroundPixel(data[p], data[p + 1], data[p + 2])) return;
    visited[idx] = 1;
    qx.push(x);
    qy.push(y);
  }

  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < qx.length) {
    const x = qx[head];
    const y = qy[head];
    head += 1;
    const p = (y * width + x) * 4;
    data[p + 3] = 0;
    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < width) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < height) enqueue(x, y + 1);
  }
}

async function loadBmpDecoded(bmpDir, fileNum, cache) {
  if (cache.has(fileNum)) return cache.get(fileNum);
  const bmpPath = path.join(bmpDir, `${fileNum}.bmp`);
  if (!fs.existsSync(bmpPath)) {
    cache.set(fileNum, null);
    return null;
  }
  const decoded = await decodeAoBmpFile(bmpPath);
  cache.set(fileNum, decoded);
  return decoded;
}

function cropFrame(decoded, frame) {
  const { data, width: srcW } = decoded;
  const png = new PNG({ width: frame.w, height: frame.h });
  for (let y = 0; y < frame.h; y++) {
    for (let x = 0; x < frame.w; x++) {
      const si = (srcW * (frame.y + y) + (frame.x + x)) * 4;
      const di = (frame.w * y + x) * 4;
      const r = data[si];
      const g = data[si + 1];
      const b = data[si + 2];
      png.data[di] = r;
      png.data[di + 1] = g;
      png.data[di + 2] = b;
      png.data[di + 3] = isBackgroundPixel(r, g, b) ? 0 : 255;
    }
  }
  return png;
}

function blitFrame(dst, src, ox, oy) {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const sp = (y * src.width + x) * 4;
      const sa = src.data[sp + 3] / 255;
      if (sa <= 0) continue;
      const dx = ox + x;
      const dy = oy + y;
      if (dx < 0 || dy < 0 || dx >= dst.width || dy >= dst.height) continue;
      const dp = (dy * dst.width + dx) * 4;
      const da = dst.data[dp + 3] / 255;
      const oa = sa + da * (1 - sa);
      if (oa <= 0) continue;
      dst.data[dp] = Math.round((src.data[sp] * sa + dst.data[dp] * da * (1 - sa)) / oa);
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

async function buildBodySheet(personajes, grhMap, bmpDir, bodyId, bmpCache) {
  const resolved = resolveBodyDirectionFrames(personajes, grhMap, bodyId);
  if (!resolved.ok) {
    return { status: resolved.reason, bodyId };
  }

  const trimmedDirs = resolved.directions.map((dir) => ({
    ...dir,
    frames: dir.frames.slice(0, MAX_WALK_FRAMES_PER_DIR),
  }));

  let frameW = 0;
  let frameH = 0;
  const missingBmp = new Set();

  for (const dir of trimmedDirs) {
    for (const frame of dir.frames) {
      frameW = Math.max(frameW, frame.w);
      frameH = Math.max(frameH, frame.h);
      const decoded = await loadBmpDecoded(bmpDir, frame.fileNum, bmpCache);
      if (!decoded) missingBmp.add(frame.fileNum);
    }
  }

  if (frameW <= 0 || frameH <= 0) {
    return { status: "invalid_frame", bodyId };
  }

  if (missingBmp.size > 0) {
    return {
      status: "missing_bmp",
      bodyId,
      missingBmp: [...missingBmp].sort((a, b) => a - b),
    };
  }

  const sheetCols = Math.max(...trimmedDirs.map((d) => d.frames.length), 1);
  const sheetRows = 4;
  const sheet = new PNG({
    width: sheetCols * frameW,
    height: sheetRows * frameH,
  });

  const walkFrames = [];
  for (let col = 0; col < sheetCols; col++) walkFrames.push(col);

  const dirByFacing = new Map(trimmedDirs.map((d) => [d.facing, d]));

  for (let sheetRow = 0; sheetRow < sheetRows; sheetRow += 1) {
    const facing = MOB_SHEET_ROW_FACINGS_SWAD[sheetRow];
    const dir = dirByFacing.get(facing);
    if (!dir) continue;
    for (let col = 0; col < dir.frames.length; col++) {
      const frame = dir.frames[col];
      const decoded = await loadBmpDecoded(bmpDir, frame.fileNum, bmpCache);
      const cropped = cropFrame(decoded, frame);
      const ox = col * frameW + Math.floor((frameW - frame.w) / 2);
      const oy = sheetRow * frameH + Math.floor((frameH - frame.h) / 2);
      blitFrame(sheet, cropped, ox, oy);
    }
  }

  removeBackgroundBlack(sheet);

  const fileName = `body_${bodyId}.png`;
  const outPath = path.join(OUT_BODIES_DIR, fileName);
  fs.mkdirSync(OUT_BODIES_DIR, { recursive: true });
  fs.writeFileSync(outPath, PNG.sync.write(sheet));

  const texturePath = `/assets/ao/imperium/npc_bodies/${fileName}`;
  const directionRows = Object.fromEntries(
    MOB_SHEET_ROW_FACINGS_SWAD.map((f, row) => [f, row])
  );

  return {
    status: "ready",
    bodyId,
    texturePath,
    textureKey: `imperium_npc_body_${bodyId}`,
    frameWidth: frameW,
    frameHeight: frameH,
    sheetCols,
    walkFrames,
    directionRows,
    headOffsetX: resolved.headOffsetX,
    headOffsetY: resolved.headOffsetY,
    walkGrhs: trimmedDirs.map((d) => d.walkGrh),
    mirrorRightFromLeft: true,
  };
}

function patchCatalogVisuals(catalog, byBodyId) {
  for (const entry of catalog.entries) {
    const bodyVisual = byBodyId[String(entry.body)] ?? byBodyId[entry.body];
    entry.visual = {
      status: bodyVisual?.status ?? (entry.body > 0 ? "not_built" : "no_body"),
      bodyId: entry.body,
      head: entry.head,
      texturePath: bodyVisual?.texturePath,
      textureKey: bodyVisual?.textureKey,
      frameWidth: bodyVisual?.frameWidth,
      frameHeight: bodyVisual?.frameHeight,
      sheetCols: bodyVisual?.sheetCols,
    };
  }
  catalog.meta.visualResolvedAt = new Date().toISOString();
  const counts = { ready: 0, missing_bmp: 0, missing_body_index: 0, other: 0 };
  for (const entry of catalog.entries) {
    const s = entry.visual?.status ?? "other";
    if (s === "ready") counts.ready += 1;
    else if (s === "missing_bmp") counts.missing_bmp += 1;
    else if (s === "missing_body_index") counts.missing_body_index += 1;
    else counts.other += 1;
  }
  catalog.meta.visualByStatus = counts;
}

async function main() {
  const opts = parseArgs();
  for (const p of [opts.scriptsIac, opts.bmpDir, CATALOG_JSON]) {
    if (!fs.existsSync(p)) throw new Error(`Ruta inexistente: ${p}`);
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_JSON, "utf8"));
  let bodyIds = [...new Set(catalog.entries.map((e) => e.body).filter((b) => b > 0))].sort(
    (a, b) => a - b
  );

  if (opts.bodyIds) {
    const filter = new Set(
      opts.bodyIds
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((n) => Number.isFinite(n) && n > 0)
    );
    bodyIds = bodyIds.filter((id) => filter.has(id));
  }
  if (opts.limit > 0) {
    bodyIds = bodyIds.slice(0, opts.limit);
  }

  const { personajes, grhMap } = loadImperiumIndices(opts.scriptsIac);
  const bmpCache = new Map();
  const byBodyId = {};
  const stats = { ready: 0, missing_bmp: 0, missing_body_index: 0, other: 0 };

  for (const bodyId of bodyIds) {
    const result = await buildBodySheet(personajes, grhMap, opts.bmpDir, bodyId, bmpCache);
    byBodyId[bodyId] = result;
    if (result.status === "ready") stats.ready += 1;
    else if (result.status === "missing_bmp") stats.missing_bmp += 1;
    else if (result.status === "missing_body_index") stats.missing_body_index += 1;
    else stats.other += 1;
    if (bodyIds.length <= 30 || result.status !== "ready") {
      console.log(`body ${bodyId}: ${result.status}`);
    }
  }

  const bodyVisualsFile = {
    meta: {
      sourceIac: path.relative(REPO_ROOT, opts.scriptsIac).replace(/\\/g, "/"),
      sourceBmpDir: path.relative(REPO_ROOT, opts.bmpDir).replace(/\\/g, "/"),
      generatedAt: new Date().toISOString(),
      bodyCount: bodyIds.length,
      stats,
      directionRowsConvention: "S W A D → down up left right (misma convención que mobs/npc_bodies)",
    },
    byBodyId,
  };
  fs.writeFileSync(BODY_VISUALS_JSON, `${JSON.stringify(bodyVisualsFile, null, 2)}\n`, "utf8");

  if (!opts.skipCatalogPatch) {
    patchCatalogVisuals(catalog, byBodyId);
    fs.writeFileSync(CATALOG_JSON, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  }

  console.log(`Bodies procesados: ${bodyIds.length}`);
  console.log(`Listos (ready): ${stats.ready}`);
  console.log(`Sin BMP: ${stats.missing_bmp}`);
  console.log(`Sin índice Personajes: ${stats.missing_body_index}`);
  console.log(`Otros: ${stats.other}`);
  console.log(`Salida PNG: ${OUT_BODIES_DIR}`);
  console.log(`Manifest: ${BODY_VISUALS_JSON}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
