import Phaser from "phaser";
import type { CoreStats } from "../../game/characterStats";
import {
  BASELINE_STRENGTH,
  BASE_MISS_CHANCE,
  EXP_BASE,
  EXP_GROWTH,
  MAX_MISS_CHANCE,
  MIN_MISS_CHANCE,
  MISS_REDUCTION_PER_AGILITY,
  STAT_MIN,
} from "./constants";

export function expRequiredForLevel(level: number): number {
  return Math.max(1, Math.floor(EXP_BASE * Math.pow(EXP_GROWTH, level - 1)));
}

export function getBaseVitalsFromStats(stats: CoreStats): { hpMax: number; mpMax: number } {
  return {
    hpMax: 62 + stats.constitution * 2,
    mpMax: 12 + stats.intelligence * 2,
  };
}

export function getLevelUpBonusesFromStats(stats: CoreStats): { hpBonus: number; mpBonus: number } {
  return {
    hpBonus: Math.max(1, Math.round(stats.constitution * 0.6)),
    mpBonus: Math.max(1, Math.round(stats.intelligence * 0.5)),
  };
}

export function getStrengthDamageBonus(strength: number): { minBonus: number; maxBonus: number } {
  const delta = strength - BASELINE_STRENGTH;
  return {
    minBonus: delta,
    maxBonus: delta * 2,
  };
}

export function getMissChanceFromAgility(agility: number): number {
  const missChance = BASE_MISS_CHANCE - (agility - STAT_MIN) * MISS_REDUCTION_PER_AGILITY;
  return Phaser.Math.Clamp(missChance, MIN_MISS_CHANCE, MAX_MISS_CHANCE);
}

export function macroSpellTextureKey(spellId: number): string {
  return `macro_spell_${spellId}`;
}
