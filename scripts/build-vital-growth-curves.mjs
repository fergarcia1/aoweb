/**
 * Lee game-data/vitalBenchmarksLevel50.txt y genera vitalGrowthCurves.ts
 * con curvas por nivel (ganancias variables que suman exacto al hp_50/mp_50).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TXT_PATH = join(ROOT, "game-data", "vitalBenchmarksLevel50.txt");
const OUT_PATH = join(ROOT, "game-data", "vitalGrowthCurves.ts");

const MAX_LEVEL = 50;
const LEVELS_GAINED = MAX_LEVEL - 1;

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Reparte `total` en `count` enteros >= 1 (o 0 si total es 0) con variación determinista. */
function distributeGainVaried(total, count, seedKey) {
  if (count <= 0) return [];
  if (total <= 0) return Array(count).fill(0);

  const weights = [];
  let hash = hashString(seedKey);
  for (let i = 0; i < count; i++) {
    hash = (Math.imul(hash, 1103515245) + 12345) >>> 0;
    weights.push(0.65 + (hash % 70) / 100);
  }
  const wSum = weights.reduce((a, b) => a + b, 0);
  const deltas = weights.map((w) => Math.max(1, Math.floor((w / wSum) * total)));

  let sum = deltas.reduce((a, b) => a + b, 0);
  let i = 0;
  while (sum > total) {
    const idx = (hashString(seedKey + ":dec") + i) % count;
    if (deltas[idx] > 1) {
      deltas[idx]--;
      sum--;
    }
    i++;
    if (i > count * 20) break;
  }
  i = 0;
  while (sum < total) {
    const idx = (hashString(seedKey + ":inc") + i) % count;
    deltas[idx]++;
    sum++;
    i++;
  }

  return deltas;
}

function buildMaxByLevel(l1, target50, seedKey) {
  const total = target50 - l1;
  const perLevel = distributeGainVaried(total, LEVELS_GAINED, seedKey);
  const byLevel = [l1];
  for (const gain of perLevel) {
    byLevel.push(byLevel[byLevel.length - 1] + gain);
  }
  if (byLevel.length !== MAX_LEVEL) {
    throw new Error(`${seedKey}: expected ${MAX_LEVEL} levels, got ${byLevel.length}`);
  }
  if (byLevel[MAX_LEVEL - 1] !== target50) {
    byLevel[MAX_LEVEL - 1] = target50;
    perLevel[perLevel.length - 1] += target50 - byLevel[MAX_LEVEL - 2] - perLevel.slice(0, -1).reduce((a, b) => a + b, l1);
    byLevel[MAX_LEVEL - 1] = target50;
  }
  const final = [l1];
  for (const gain of perLevel) {
    final.push(final[final.length - 1] + gain);
  }
  if (final[MAX_LEVEL - 1] !== target50) {
    const diff = target50 - final[MAX_LEVEL - 1];
    perLevel[perLevel.length - 1] += diff;
    final[MAX_LEVEL - 1] = target50;
  }
  return { hpMaxByLevel: final, perLevel };
}

function parseIntField(raw) {
  const t = raw.trim();
  if (t === "—" || t === "-" || t === "") return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function parseTxt(content) {
  const rows = [];
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#") || line.startsWith("-")) continue;
    if (!line.includes("|")) continue;
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 10) continue;
    if (parts[0] === "raza_id") continue;

    const [race, classId, , , , , hpL1Raw, mpL1Raw, hp50Raw, mp50Raw] = parts;
    const hpL1 = parseIntField(hpL1Raw);
    const hp50 = parseIntField(hp50Raw);
    if (hpL1 === null || hp50 === null) continue;

    const mpL1 = parseIntField(mpL1Raw);
    const mp50 = parseIntField(mp50Raw);
    const usesMana = mp50Raw !== "—" && mp50Raw !== "-" && mp50 !== null;

    rows.push({
      race,
      classId,
      hpL1,
      hp50,
      mpL1: usesMana ? (mpL1 ?? 0) : 0,
      mp50: usesMana ? (mp50 ?? 0) : 0,
      usesMana,
    });
  }
  return rows;
}

const txt = readFileSync(TXT_PATH, "utf8");
const rows = parseTxt(txt);
if (rows.length !== 54) {
  console.warn(`Expected 54 rows, parsed ${rows.length}`);
}

const entries = {};
for (const row of rows) {
  const key = `${row.race}:${row.classId}`;
  const hp = buildMaxByLevel(row.hpL1, row.hp50, `${key}:hp`);
  let mpMaxByLevel = Array(MAX_LEVEL).fill(0);
  let mpPerLevel = [];
  if (row.usesMana) {
    const mp = buildMaxByLevel(row.mpL1, row.mp50, `${key}:mp`);
    mpMaxByLevel = mp.hpMaxByLevel;
    mpPerLevel = mp.perLevel;
  }

  if (hp.hpMaxByLevel[MAX_LEVEL - 1] !== row.hp50) {
    throw new Error(`${key} HP mismatch: ${hp.hpMaxByLevel[49]} vs ${row.hp50}`);
  }
  if (row.usesMana && mpMaxByLevel[MAX_LEVEL - 1] !== row.mp50) {
    throw new Error(`${key} MP mismatch: ${mpMaxByLevel[49]} vs ${row.mp50}`);
  }

  entries[key] = {
    hpL1: row.hpL1,
    mpL1: row.mpL1,
    hp50: row.hp50,
    mp50: row.mp50,
    usesMana: row.usesMana,
    hpPerLevel: hp.perLevel,
    mpPerLevel,
    hpMaxByLevel: hp.hpMaxByLevel,
    mpMaxByLevel,
  };
}

function formatArray(arr, indent = 4) {
  const pad = " ".repeat(indent);
  const lines = arr.map((n) => `${n}`).join(", ");
  if (arr.length <= 12) return `[${lines}]`;
  const chunks = [];
  for (let i = 0; i < arr.length; i += 10) {
    chunks.push(arr.slice(i, i + 10).join(", "));
  }
  return `[\n${pad}  ${chunks.join(`,\n${pad}  `)},\n${pad}]`;
}

const keys = Object.keys(entries).sort();
const body = keys
  .map((key) => {
    const e = entries[key];
    return `  "${key}": {
    hpL1: ${e.hpL1},
    mpL1: ${e.mpL1},
    hp50: ${e.hp50},
    mp50: ${e.mp50},
    usesMana: ${e.usesMana},
    hpPerLevel: ${formatArray(e.hpPerLevel)},
    mpPerLevel: ${formatArray(e.mpPerLevel)},
    hpMaxByLevel: ${formatArray(e.hpMaxByLevel)},
    mpMaxByLevel: ${formatArray(e.mpMaxByLevel)},
  }`;
  })
  .join(",\n");

const out = `/**
 * AUTO-GENERADO — no editar a mano.
 * Fuente: game-data/vitalBenchmarksLevel50.txt
 * Regenerar: node scripts/build-vital-growth-curves.mjs
 */
export type VitalGrowthEntry = {
  hpL1: number;
  mpL1: number;
  hp50: number;
  mp50: number;
  usesMana: boolean;
  /** Ganancia al subir de nivel L → L+1; índice 0 = 1→2. */
  hpPerLevel: readonly number[];
  mpPerLevel: readonly number[];
  /** hpMaxByLevel[i] = HP máximo en nivel i+1. */
  hpMaxByLevel: readonly number[];
  mpMaxByLevel: readonly number[];
};

export const VITAL_GROWTH_BY_KEY: Record<string, VitalGrowthEntry> = {
${body}
};

export const VITAL_GROWTH_MAX_LEVEL = ${MAX_LEVEL};
`;

writeFileSync(OUT_PATH, out, "utf8");
console.log(`Wrote ${keys.length} entries to ${OUT_PATH}`);
