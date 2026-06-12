/**
 * Genera game-data/vitalBenchmarksLevel50.txt (proyección nivel 50).
 * Anclas exactas del diseño; el resto usa crecimiento por clase calibrado.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const STAT_MIN = 10;
const STAT_MAX = 25;

const PLAYABLE_RACES = ["human", "elf", "drow", "dwarf", "gnome", "orc"];

const RACE_LABELS = {
  human: "Humano",
  elf: "Elfo",
  drow: "Elfo oscuro",
  dwarf: "Enano",
  gnome: "Gnomo",
  orc: "Orco",
};

const CLASS_IDS = [
  "paladin",
  "clerigo",
  "mago",
  "nigromante",
  "druida",
  "bardo",
  "guerrero",
  "cazador",
  "asesino",
];

const CLASS_LABELS = {
  paladin: "Paladín",
  clerigo: "Clérigo",
  mago: "Mago",
  nigromante: "Nigromante",
  druida: "Druida",
  bardo: "Bardo",
  guerrero: "Guerrero",
  cazador: "Cazador",
  asesino: "Asesino",
};

const CLASS_USES_MANA = {
  paladin: true,
  clerigo: true,
  mago: true,
  nigromante: true,
  druida: true,
  bardo: true,
  guerrero: false,
  cazador: false,
  asesino: true,
};

const RACE_BASE_STATS = {
  human: { strength: 19, agility: 18, intelligence: 15, constitution: 19 },
  elf: { strength: 17, agility: 20, intelligence: 20, constitution: 16 },
  drow: { strength: 18, agility: 19, intelligence: 19, constitution: 17 },
  dwarf: { strength: 19, agility: 18, intelligence: 15, constitution: 21 },
  gnome: { strength: 15, agility: 18, intelligence: 21, constitution: 15 },
  orc: { strength: 21, agility: 18, intelligence: 15, constitution: 19 },
};

const CLASS_STAT_MODIFIERS = {
  paladin: { strength: 2, constitution: 3, agility: 0, intelligence: -2 },
  clerigo: { strength: 0, constitution: 2, agility: 1, intelligence: 2 },
  mago: { strength: -3, constitution: -1, agility: -3, intelligence: 4 },
  nigromante: { strength: -1, constitution: -1, agility: -1, intelligence: 4 },
  druida: { strength: -1, constitution: -1, agility: 1, intelligence: 3 },
  bardo: { strength: 0, constitution: 1, agility: 3, intelligence: 2 },
  guerrero: { strength: 4, constitution: 4, agility: 2, intelligence: -10 },
  cazador: { strength: 2, constitution: 3, agility: 2, intelligence: -10 },
  asesino: { strength: 1, constitution: 2, agility: 4, intelligence: 1 },
};

/** Crecimiento por nivel (49 subidas entre 1 y 50), calibrado contra anclas de diseño. */
const CLASS_HP_PER_LEVEL = {
  paladin: 7.88,
  clerigo: 7.51,
  bardo: 7.04,
  guerrero: 9.18,
  cazador: 8.49,
  mago: 5.76,
  nigromante: 6.69,
  druida: 6.84,
  asesino: 7.25,
};

const CLASS_MP_PER_LEVEL = {
  paladin: 20.29,
  clerigo: 36.04,
  bardo: 37.06,
  mago: 52.04,
  nigromante: 45.98,
  druida: 41.92,
  asesino: 32.0,
};

/** Anclas exactas (sobrescriben proyección). */
const ANCHORS = {
  "human|paladin": { hp50: 430, mp50: 1020 },
  "human|clerigo": { hp50: 410, mp50: 1800 },
  "human|bardo": { hp50: 385, mp50: 1850 },
  "dwarf|guerrero": { hp50: 500 },
  "human|cazador": { hp50: 460 },
  "gnome|mago": { hp50: 310, mp50: 2600 },
  "elf|druida": { hp50: 365, mp50: 2100 },
  "drow|nigromante": { hp50: 360, mp50: 2300 },
};

function clampStat(value) {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, Math.floor(value)));
}

function resolveCoreStats(race, classId) {
  const base = RACE_BASE_STATS[race];
  const mod = CLASS_STAT_MODIFIERS[classId];
  return {
    strength: clampStat(base.strength + mod.strength),
    constitution: clampStat(base.constitution + mod.constitution),
    agility: clampStat(base.agility + mod.agility),
    intelligence: clampStat(base.intelligence + mod.intelligence),
  };
}

function vitalsLevel1(stats) {
  return {
    hpL1: Math.max(1, stats.constitution * 2),
    mpL1: Math.max(0, stats.intelligence * 2),
  };
}

function projectLevel50(race, classId, stats) {
  const { hpL1, mpL1 } = vitalsLevel1(stats);
  const levelsGained = 49;
  const hp50 = Math.round(hpL1 + levelsGained * CLASS_HP_PER_LEVEL[classId]);
  const usesMana = CLASS_USES_MANA[classId];
  const mp50 = usesMana
    ? Math.round(mpL1 + levelsGained * CLASS_MP_PER_LEVEL[classId])
    : 0;
  const key = `${race}|${classId}`;
  const anchor = ANCHORS[key];
  return {
    hpL1,
    mpL1: usesMana ? mpL1 : 0,
    hp50: anchor?.hp50 ?? hp50,
    mp50: usesMana ? (anchor?.mp50 ?? mp50) : 0,
    anchor: Boolean(anchor),
  };
}

const rows = [];
for (const race of PLAYABLE_RACES) {
  for (const classId of CLASS_IDS) {
    const stats = resolveCoreStats(race, classId);
    const v = projectLevel50(race, classId, stats);
    rows.push({
      race,
      classId,
      raceLabel: RACE_LABELS[race],
      classLabel: CLASS_LABELS[classId],
      con: stats.constitution,
      int: stats.intelligence,
      usesMana: CLASS_USES_MANA[classId],
      ...v,
    });
  }
}

const pad = (s, n) => String(s).padEnd(n, " ");

const colHeader = [
  pad("raza_id", 8),
  pad("clase_id", 12),
  pad("raza", 14),
  pad("clase", 12),
  pad("CON", 4),
  pad("INT", 4),
  pad("hp_l1", 6),
  pad("mp_l1", 6),
  pad("hp_50", 6),
  pad("mp_50", 7),
  "nota",
].join(" | ");

const lines = [
  "# AOWEB — Vitales objetivo al NIVEL 50",
  "#",
  "# Editá hp_50 y mp_50 (mp = 0 o — si la clase no usa maná: guerrero, cazador).",
  "# hp_l1 / mp_l1 = 2×CON / 2×INT con stats actuales (characterStats.ts).",
  "# Filas con ANCLA son referencias de balance acordadas.",
  "#",
  "# Regenerar proyección: node scripts/generate-vital-benchmarks-level50.mjs",
  "# (las filas ANCLA se conservan; el resto se recalcula)",
  "#",
  colHeader,
  "-".repeat(120),
];

for (const r of rows) {
  const mpL1Str = r.usesMana ? String(r.mpL1) : "—";
  const mp50Str = r.usesMana ? String(r.mp50) : "—";
  const note = r.anchor ? "ANCLA" : "";
  lines.push(
    [
      pad(r.race, 8),
      pad(r.classId, 12),
      pad(r.raceLabel, 14),
      pad(r.classLabel, 12),
      pad(r.con, 4),
      pad(r.int, 4),
      pad(r.hpL1, 6),
      pad(mpL1Str, 6),
      pad(r.hp50, 6),
      pad(mp50Str, 7),
      note,
    ].join(" | ")
  );
}

lines.push("");
lines.push("# --- Crecimiento por clase usado en la proyección (49 niveles) ---");
for (const classId of CLASS_IDS) {
  const mp = CLASS_USES_MANA[classId]
    ? `mp/lv ${CLASS_MP_PER_LEVEL[classId].toFixed(2)}`
    : "sin maná";
  lines.push(`# ${CLASS_LABELS[classId]}: hp/lv ${CLASS_HP_PER_LEVEL[classId].toFixed(2)}, ${mp}`);
}

const outPath = join(ROOT, "game-data", "vitalBenchmarksLevel50.txt");
writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`Wrote ${rows.length} rows to ${outPath}`);
