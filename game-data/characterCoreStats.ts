import {
  ATTRIBUTE_POTION_BUFF_MAX,
  STAT_MAX,
  STAT_MIN,
} from "./constants";
import type { CharacterClassId } from "./items/catalog";
import type { CharacterRaceId } from "../shared/characterTypes";

export type CoreStats = {
  strength: number;
  constitution: number;
  agility: number;
  intelligence: number;
};

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

function clamp(value: number, min: number, max: number): number {
  const normalized = Number.isFinite(value) ? Math.floor(value) : min;
  return Math.min(max, Math.max(min, normalized));
}

export function clampNaturalStat(value: number): number {
  return clamp(value, STAT_MIN, STAT_MAX);
}

function getRaceStats(race: string): CoreStats {
  return RACE_BASE_STATS[race as CharacterRaceId] ?? RACE_BASE_STATS.human;
}

function getClassModifiers(classId: string): CoreStats {
  return CLASS_STAT_MODIFIERS[classId as CharacterClassId] ?? CLASS_STAT_MODIFIERS.paladin;
}

export function resolveCoreStats(race: string, classId: string): CoreStats {
  const base = getRaceStats(race);
  const mod = getClassModifiers(classId);
  return {
    strength: clampNaturalStat(base.strength + mod.strength),
    constitution: clampNaturalStat(base.constitution + mod.constitution),
    agility: clampNaturalStat(base.agility + mod.agility),
    intelligence: clampNaturalStat(base.intelligence + mod.intelligence),
  };
}

export function applyStatsWithPotionBuffs(
  natural: CoreStats,
  buffs: { strength: number; agility: number }
): CoreStats {
  const strBuff = clamp(buffs.strength, 0, ATTRIBUTE_POTION_BUFF_MAX);
  const agiBuff = clamp(buffs.agility, 0, ATTRIBUTE_POTION_BUFF_MAX);
  const potionCeiling = STAT_MAX + ATTRIBUTE_POTION_BUFF_MAX;
  return {
    ...natural,
    strength: clamp(natural.strength + strBuff, STAT_MIN, potionCeiling),
    agility: clamp(natural.agility + agiBuff, STAT_MIN, potionCeiling),
  };
}

export function resolveEffectiveCoreStats(
  race: string,
  classId: string,
  buffs: { strength: number; agility: number }
): CoreStats {
  return applyStatsWithPotionBuffs(resolveCoreStats(race, classId), buffs);
}

export function resolveEffectiveStrength(
  race: string,
  classId: string,
  buffs: { strength: number; agility: number }
): number {
  return resolveEffectiveCoreStats(race, classId, buffs).strength;
}

export function resolveEffectiveAgility(
  race: string,
  classId: string,
  buffs: { strength: number; agility: number }
): number {
  return resolveEffectiveCoreStats(race, classId, buffs).agility;
}
