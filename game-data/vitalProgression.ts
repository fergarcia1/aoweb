import { CLASS_USES_MANA, type CharacterClassId } from "./classes";
import {
  VITAL_GROWTH_BY_KEY,
  VITAL_GROWTH_MAX_LEVEL,
  type VitalGrowthEntry,
} from "./vitalGrowthCurves";

export type VitalRaceId =
  | "human"
  | "elf"
  | "drow"
  | "dwarf"
  | "gnome"
  | "orc"
  | "fantasma";

export { VITAL_GROWTH_MAX_LEVEL, type VitalGrowthEntry };

export function vitalGrowthKey(race: string, classId: string): string {
  return `${race}:${classId}`;
}

export function getVitalGrowthEntry(
  race: string,
  classId: string
): VitalGrowthEntry | undefined {
  return VITAL_GROWTH_BY_KEY[vitalGrowthKey(race, classId)];
}

export function clampVitalProgressionLevel(level: unknown): number {
  const n = typeof level === "number" && Number.isFinite(level) ? Math.floor(level) : 1;
  return Math.max(1, Math.min(VITAL_GROWTH_MAX_LEVEL, n));
}

/**
 * HP/MP máximos en un nivel (tablas hardcodeadas desde vitalBenchmarksLevel50.txt).
 * Si no hay entrada para la combinación, usa 2×CON / 2×INT como respaldo.
 */
export function getMaxVitalsAtLevel(
  race: string,
  classId: CharacterClassId,
  level: unknown,
  fallback?: { constitution: number; intelligence: number }
): { hpMax: number; mpMax: number } {
  const entry = getVitalGrowthEntry(race, classId);
  const l = clampVitalProgressionLevel(level);
  const idx = l - 1;

  if (entry) {
    return {
      hpMax: entry.hpMaxByLevel[idx] ?? entry.hp50,
      mpMax: entry.usesMana ? (entry.mpMaxByLevel[idx] ?? entry.mp50) : 0,
    };
  }

  if (fallback) {
    return {
      hpMax: Math.max(1, Math.floor(fallback.constitution) * 2),
      mpMax: CLASS_USES_MANA[classId]
        ? Math.max(0, Math.floor(fallback.intelligence) * 2)
        : 0,
    };
  }

  return { hpMax: 100, mpMax: CLASS_USES_MANA[classId] ? 50 : 0 };
}

/** Ganancia al pasar de `fromLevel` a `fromLevel + 1`. */
export function getVitalGainForLevelUp(
  race: string,
  classId: CharacterClassId,
  fromLevel: number
): { hpGain: number; mpGain: number } {
  const entry = getVitalGrowthEntry(race, classId);
  if (!entry) {
    return { hpGain: 0, mpGain: 0 };
  }
  const from = clampVitalProgressionLevel(fromLevel);
  if (from >= VITAL_GROWTH_MAX_LEVEL) {
    return { hpGain: 0, mpGain: 0 };
  }
  const i = from - 1;
  return {
    hpGain: entry.hpPerLevel[i] ?? 0,
    mpGain: entry.usesMana ? (entry.mpPerLevel[i] ?? 0) : 0,
  };
}

/** Aplica nuevos máximos al subir de nivel; suma ganancias de cada nivel intermedio al HP/MP actual. */
export function applyLevelUpVitals(params: {
  race: string;
  classId: CharacterClassId;
  previousLevel: number;
  newLevel: number;
  currentHp: number;
  currentMp: number;
  healToNewMax?: boolean;
}): { hpMax: number; mpMax: number; hp: number; mp: number } {
  const prev = clampVitalProgressionLevel(params.previousLevel);
  const next = clampVitalProgressionLevel(params.newLevel);
  const { hpMax, mpMax } = getMaxVitalsAtLevel(params.race, params.classId, next);
  if (params.healToNewMax) {
    return { hpMax, mpMax, hp: hpMax, mp: mpMax };
  }
  let hp = Math.max(0, Math.floor(params.currentHp));
  let mp = Math.max(0, Math.floor(params.currentMp));
  for (let from = prev; from < next && from < VITAL_GROWTH_MAX_LEVEL; from++) {
    const gain = getVitalGainForLevelUp(params.race, params.classId, from);
    hp += gain.hpGain;
    mp += gain.mpGain;
  }
  return {
    hpMax,
    mpMax,
    hp: Math.min(hpMax, hp),
    mp: Math.min(mpMax, mp),
  };
}
