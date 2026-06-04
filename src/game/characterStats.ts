import Phaser from "phaser";
import {
  ATTRIBUTE_POTION_BUFF_DURATION_MS,
  ATTRIBUTE_POTION_BUFF_MAX,
  STAT_MAX,
  STAT_MIN,
} from "../../game-data/constants";
import type { CharacterClassId } from "../data/items";
import type { CharacterRaceId } from "../data/characters";

export type CoreStats = {
  strength: number;
  constitution: number;
  agility: number;
  intelligence: number;
};

export { ATTRIBUTE_POTION_BUFF_DURATION_MS, ATTRIBUTE_POTION_BUFF_MAX, STAT_MAX, STAT_MIN };
const BASELINE_STRENGTH = 19;

export const RACE_BASE_STATS: Record<CharacterRaceId, CoreStats> = {
  human: { strength: 19, agility: 18, intelligence: 15, constitution: 19 },
  elf: { strength: 17, agility: 20, intelligence: 20, constitution: 17 },
  drow: { strength: 18, agility: 19, intelligence: 19, constitution: 17 },
  dwarf: { strength: 19, agility: 18, intelligence: 15, constitution: 21 },
  gnome: { strength: 15, agility: 18, intelligence: 21, constitution: 15 },
  orc: { strength: 21, agility: 18, intelligence: 15, constitution: 19 },
  fantasma: { strength: 19, agility: 19, intelligence: 18, constitution: 18 },
};

export const CLASS_STAT_MODIFIERS: Record<CharacterClassId, CoreStats> = {
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

import { CLASS_USES_MANA } from "../../game-data/classes";
import { getMaxVitalsAtLevel } from "../../game-data/vitalProgression";

export { CLASS_USES_MANA };

export type CharacterPreviewVitals = {
  hp: number;
  mana: number;
  energy: number;
};

export type CharacterPreviewModifiers = {
  magicResistancePercent: number;
  hitMin: number;
  hitMax: number;
  magicLabel: string;
  attackInterval: number;
  magicInterval: number;
  projectileInterval: number;
  martialInterval: number;
  thrownInterval: number;
};

/** Solo para stats naturales (creación / raza+clase). */
export function clampNaturalStat(value: number): number {
  return Phaser.Math.Clamp(Math.floor(value), STAT_MIN, STAT_MAX);
}

export function resolveCoreStats(
  race: CharacterRaceId,
  classId: CharacterClassId
): CoreStats {
  const base = RACE_BASE_STATS[race];
  const mod = CLASS_STAT_MODIFIERS[classId];
  return {
    strength: clampNaturalStat(base.strength + mod.strength),
    constitution: clampNaturalStat(base.constitution + mod.constitution),
    agility: clampNaturalStat(base.agility + mod.agility),
    intelligence: clampNaturalStat(base.intelligence + mod.intelligence),
  };
}

/** Stats en juego: naturales + bono de pociones (puede superar STAT_MAX hasta STAT_MAX + ATTRIBUTE_POTION_BUFF_MAX). */
export function applyStatsWithPotionBuffs(
  natural: CoreStats,
  buffs: { strength: number; agility: number }
): CoreStats {
  const strBuff = Phaser.Math.Clamp(
    Math.floor(buffs.strength),
    0,
    ATTRIBUTE_POTION_BUFF_MAX
  );
  const agiBuff = Phaser.Math.Clamp(
    Math.floor(buffs.agility),
    0,
    ATTRIBUTE_POTION_BUFF_MAX
  );
  const potionCeiling = STAT_MAX + ATTRIBUTE_POTION_BUFF_MAX;
  return {
    ...natural,
    strength: Phaser.Math.Clamp(natural.strength + strBuff, STAT_MIN, potionCeiling),
    agility: Phaser.Math.Clamp(natural.agility + agiBuff, STAT_MIN, potionCeiling),
  };
}

/** Vida y maná iniciales / máximos base: 2 por punto de CON e INT. */
export function getBaseVitalsFromStats(stats: CoreStats): { hpMax: number; mpMax: number } {
  return {
    hpMax: Math.max(1, stats.constitution * 2),
    mpMax: Math.max(0, stats.intelligence * 2),
  };
}

export function getPreviewVitals(
  stats: CoreStats,
  classId: CharacterClassId,
  race: CharacterRaceId,
  level = 1
): CharacterPreviewVitals {
  const { hpMax, mpMax } = getMaxVitalsAtLevel(race, classId, level, {
    constitution: stats.constitution,
    intelligence: stats.intelligence,
  });
  return {
    hp: hpMax,
    mana: CLASS_USES_MANA[classId] ? mpMax : 0,
    energy: 30 + stats.constitution * 15 + stats.agility * 10,
  };
}

export function getPreviewModifiers(
  stats: CoreStats,
  classId: CharacterClassId
): CharacterPreviewModifiers {
  const strDelta = stats.strength - BASELINE_STRENGTH;
  const hitMin = Math.max(1, 8 + strDelta);
  const hitMax = Math.max(hitMin, 16 + strDelta * 2);
  const magicResist = Math.round(8 + stats.intelligence * 1.2 + stats.constitution * 0.3);

  return {
    magicResistancePercent: magicResist,
    hitMin,
    hitMax,
    magicLabel: CLASS_USES_MANA[classId]
      ? `${stats.intelligence}/${stats.intelligence + 2}`
      : "-",
    attackInterval: 1 + stats.agility * 0.01,
    magicInterval: 1 + stats.intelligence * 0.012,
    projectileInterval: 0.4 + stats.agility * 0.006,
    martialInterval: 1 + stats.agility * 0.01,
    thrownInterval: 1 + stats.agility * 0.012,
  };
}

export function formatRate(value: number): string {
  return value.toFixed(2).replace(".", ",");
}
