/**
 * Genera game-data/spellCastMeta.ts desde spells_imported + SPELL_DEFINITIONS.
 * Uso: node tools/generate-spell-cast-meta.mjs
 */
import { readFileSync, writeFileSync } from "fs";

/** AOWEB id → IAO spells_imported id (cuando no coincide por nombre). */
const AOWEB_SPELL_TO_IMPORTED_ID = {
  4: 6,
  5: 7,
  6: 38,
  7: 34,
  8: 24,
  9: 5,
  10: 9,
  11: 23,
  102: 10,
  103: 11,
};

const SPELL_ID_REPLACEMENTS = [
  ["SPELL_ID.CURAR_VENENO", "1"],
  ["SPELL_ID.PROYECTIL_MAGICO", "2"],
  ["SPELL_ID.CURAR_HERIDAS_LEVES", "3"],
  ["SPELL_ID.SAETA_IGNEA", "4"],
  ["SPELL_ID.PROYECTIL_ELECTRICO", "5"],
  ["SPELL_ID.METAMORFOSIS_AGUILA", "6"],
  ["SPELL_ID.IMPLOSION", "7"],
  ["SPELL_ID.INMOVILIZAR", "8"],
  ["SPELL_ID.CURAR_HERIDAS_GRAVES", "9"],
  ["SPELL_ID.PARALIZAR", "10"],
  ["SPELL_ID.TORMENTA_ELECTRICA", "11"],
  ["SPELL_ID.REMOVER_PARALISIS", "102"],
  ["SPELL_ID.RESUCITAR", "103"],
];

function normalizeSpellName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

let importedText = readFileSync("game-data/imported/spells_imported.ts", "utf8");
importedText = importedText.replace("export const IMPORTED_SPELLS =", "").trim();
if (importedText.endsWith(";")) importedText = importedText.slice(0, -1);
const IMPORTED_SPELLS = eval(importedText);

const importedById = new Map(IMPORTED_SPELLS.map((s) => [s.id, s]));
const importedByName = new Map();
for (const s of IMPORTED_SPELLS) {
  const k = normalizeSpellName(s.nombre);
  if (!importedByName.has(k)) importedByName.set(k, s);
}

function resolveImported(aowebId, nombre) {
  const override = AOWEB_SPELL_TO_IMPORTED_ID[aowebId];
  if (override !== undefined) return importedById.get(override);
  const byId = importedById.get(aowebId);
  if (byId && normalizeSpellName(byId.nombre) === normalizeSpellName(nombre)) {
    return byId;
  }
  return importedByName.get(normalizeSpellName(nombre));
}

let spellsTs = readFileSync("src/data/spells.ts", "utf8");
for (const [token, num] of SPELL_ID_REPLACEMENTS) {
  spellsTs = spellsTs.replaceAll(token, num);
}

const spellRe = /idSpell:\s*(\d+),[\s\S]*?nombre:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
const meta = {};
const missing = [];
let m;
while ((m = spellRe.exec(spellsTs)) !== null) {
  const id = Number(m[1]);
  const nombre = m[2].replace(/\\"/g, '"');
  const imp = resolveImported(id, nombre);
  if (!imp) {
    missing.push({ id, nombre });
    continue;
  }
  const words = imp.palabrasMagicas?.trim();
  meta[id] = {
    wav: imp.wav,
    ...(words ? { palabrasMagicas: words } : {}),
  };
}

function formatEntry(id, data) {
  const parts = [`wav: ${data.wav}`];
  if (data.palabrasMagicas) {
    parts.push(`palabrasMagicas: ${JSON.stringify(data.palabrasMagicas)}`);
  }
  return `  ${id}: { ${parts.join(", ")} },`;
}

const lines = Object.keys(meta)
  .map(Number)
  .sort((a, b) => a - b)
  .map((id) => formatEntry(id, meta[id]));

const body = `/**
 * Metadatos de lanzamiento por hechizo (WAV + palabras mágicas de IAO).
 * Generado con: node tools/generate-spell-cast-meta.mjs
 * No importar spells_imported en runtime.
 */
export type SpellCastMeta = {
  /** Índice de sonido original de Argentum Online. */
  wav: number;
  /** Texto sobre la cabeza al lanzar. */
  palabrasMagicas?: string;
};

export const SPELL_CAST_META_BY_ID: Record<number, SpellCastMeta> = {
${lines.join("\n")}
};
`;

writeFileSync("game-data/spellCastMeta.ts", body, "utf8");
console.log(`Wrote game-data/spellCastMeta.ts (${Object.keys(meta).length} spells, ${missing.length} missing)`);
for (const row of missing) {
  console.error("  missing:", row.id, row.nombre);
}
