/**
 * Paso 2: detectar tamaño de celda y layout de un spritesheet de mob.
 *
 * Uso:
 *   npm run audit:mobs
 *   npm run audit:mobs -- public/assets/ao/imperium/mobs/npc_bodies/lobo.png
 *   npm run audit:mobs -- public/assets/ao/imperium/mobs/npc_bodies
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "..");
const defaultDir = path.join(
  workspaceRoot,
  "public/assets/ao/imperium/mobs/npc_bodies"
);

const CANDIDATE_SIZES = [
  [32, 32],
  [32, 48],
  [48, 48],
  [64, 64],
  [96, 96],
  [128, 128],
  [170, 170],
];

const PRESETS = [
  {
    id: "MOB_LAYOUT_192_32x48",
    match: (w, h, fw, fh) => w === 192 && h === 192 && fw === 32 && fh === 48,
    hint: "gallina, dummy — 6×4, caminar por fila",
  },
  {
    id: "MOB_LAYOUT_128_2x2_64",
    match: (w, h, fw, fh) => w === 128 && h === 128 && fw === 64 && fh === 64,
    hint: "conejo/serpiente — 2×2, 1 frame por dirección",
  },
  {
    id: "MOB_LAYOUT_ROWS_SWAD_64",
    match: (w, h, fw, fh) => w === 256 && h === 256 && fw === 64 && fh === 64,
    hint: "filas S|W|A|D (Fila1–4), frames de caminar en columnas",
  },
  {
    id: "MOB_LAYOUT_ROWS_SWAD_128",
    match: (w, h, fw, fh) => w === 512 && h === 512 && fw === 128 && fh === 128,
    hint: "filas S|W|A|D (Fila1–4), frames de caminar en columnas",
  },
];

function frameHasPixels(png, fx, fy, fw, fh) {
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const px = fx + x;
      const py = fy + y;
      if (px >= png.width || py >= png.height) continue;
      const i = (py * png.width + px) * 4;
      if (png.data[i + 3] > 8) return true;
    }
  }
  return false;
}

function buildGrid(png, fw, fh) {
  const cols = Math.floor(png.width / fw);
  const rows = Math.floor(png.height / fh);
  const cells = [];
  let filled = 0;

  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      const hit = frameHasPixels(png, c * fw, r * fh, fw, fh);
      if (hit) filled += 1;
      line += hit ? "#" : ".";
      cells.push({ index: r * cols + c, row: r, col: c, filled: hit });
    }
    cells.push({ line, row: r });
  }

  return { cols, rows, filled, total: cols * rows, cells, lines: cells.filter((c) => c.line) };
}

function scoreGrid(grid) {
  if (grid.total === 0) return -1;
  const fillRatio = grid.filled / grid.total;
  const wastePenalty = (grid.total - grid.filled) / grid.total;
  return fillRatio * 100 - wastePenalty * 15;
}

function suggestPreset(width, height, fw, fh, filePath = "") {
  const baseName = path.basename(filePath);
  const exact = PRESETS.find((p) => p.match(width, height, fw, fh));
  if (exact) return exact;

  if (fw === 32 && fh === 48) {
    return { id: "MOB_LAYOUT_192_32x48", hint: "mismo layout que personaje (ajustar si el PNG no es 192×192)" };
  }
  if (fw === 64 && fh === 64 && width <= 128) {
    return { id: "MOB_LAYOUT_128_2x2_64", hint: "hoja chica 128×128" };
  }
  if (fw === 64 && fh === 64) {
    return { id: "MOB_LAYOUT_ROWS_SWAD_64", hint: "256×256, filas S W A D" };
  }
  if (fw === 128 && fh === 128) {
    return { id: "MOB_LAYOUT_ROWS_SWAD_128", hint: "512×512, filas S W A D" };
  }
  return { id: "(custom)", hint: "copiar un preset en mobSheetLayouts.ts y ajustar frameWidth/Height" };
}

function collectPngPaths(inputPath) {
  let resolved = path.resolve(workspaceRoot, inputPath);
  if (!fs.existsSync(resolved) && !path.isAbsolute(inputPath) && !inputPath.includes("/")) {
    const inMobsDir = path.join(defaultDir, inputPath);
    if (fs.existsSync(inMobsDir)) {
      resolved = inMobsDir;
    }
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`No existe: ${resolved}`);
  }
  const stat = fs.statSync(resolved);
  if (stat.isFile()) {
    return resolved.toLowerCase().endsWith(".png") ? [resolved] : [];
  }
  return fs
    .readdirSync(resolved)
    .filter((f) => f.toLowerCase().endsWith(".png") && !f.startsWith("_"))
    .map((f) => path.join(resolved, f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function auditFile(filePath) {
  const png = PNG.sync.read(fs.readFileSync(filePath));
  const rel = path.relative(workspaceRoot, filePath).replace(/\\/g, "/");
  const candidates = [];

  for (const [fw, fh] of CANDIDATE_SIZES) {
    if (png.width % fw !== 0 || png.height % fh !== 0) continue;
    const grid = buildGrid(png, fw, fh);
    if (grid.filled === 0) continue;
    candidates.push({
      frameWidth: fw,
      frameHeight: fh,
      score: scoreGrid(grid),
      grid,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  console.log(`\n${"=".repeat(72)}`);
  console.log(rel);
  console.log(`Imagen: ${png.width}×${png.height}px`);

  if (!best) {
    console.log("  Sin candidato válido (ningún tamaño de celda divide la imagen).");
    return;
  }

  const preset = suggestPreset(
    png.width,
    png.height,
    best.frameWidth,
    best.frameHeight,
    filePath
  );
  console.log(`\n>>> Mejor celda: ${best.frameWidth}×${best.frameHeight}  (score ${best.score.toFixed(1)})`);
  console.log(`    Grilla: ${best.grid.cols}×${best.grid.rows} = ${best.grid.total} celdas, ${best.grid.filled} con sprite`);
  console.log(`    Preset sugerido: ${preset.id}`);
  console.log(`    Nota: ${preset.hint}`);

  console.log("\n    Mapa (# = hay dibujo, . = vacío):");
  for (const row of best.grid.lines) {
    console.log(`    ${row.row}: ${row.line}`);
  }

  console.log("\n    Top 3 tamaños de celda:");
  for (const c of candidates.slice(0, 3)) {
    console.log(
      `    - ${c.frameWidth}×${c.frameHeight} → ${c.grid.cols}×${c.grid.rows}, llenas ${c.grid.filled}/${c.grid.total}, score ${c.score.toFixed(1)}`
    );
  }

  const modelId = path.basename(filePath, ".png").replace(/[^a-zA-Z0-9_]/g, "_");
  const assetPath = "/" + rel.replace(/^public\//, "");
  console.log("\n    Paso 3 — pegar en src/data/mobs.ts (ejemplo):");
  const layoutSpread = preset.id;
  console.log(`    ${modelId}: mobModel("${modelId}", "${assetPath}", {`);
  console.log(`      ...${layoutSpread},`);
  console.log(`      scale: mobScaleForFrameHeight(${best.frameHeight}),`);
  console.log("    }),");
}

function main() {
  const arg = process.argv[2];
  const targets = collectPngPaths(arg ?? defaultDir);
  if (targets.length === 0) {
    console.error("No hay PNGs. Uso: npm run audit:mobs -- <archivo.png | carpeta>");
    process.exit(1);
  }

  console.log(`Auditando ${targets.length} sprite(s) de mob...`);
  for (const file of targets) {
    auditFile(file);
  }
  console.log(`\n${"=".repeat(72)}`);
  console.log(
    "Listo. Convención por defecto: fila0=S, fila1=W, fila2=A, fila3=D. Config: src/game/mobs/mobVisualConfig.ts"
  );
}

main();
