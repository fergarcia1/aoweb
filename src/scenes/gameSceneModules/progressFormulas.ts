import Phaser from "phaser";
import type { CoreStats } from "../../game/characterStats";
import { getStrengthDamageBonus as getSharedStrengthDamageBonus } from "../../../game-data/attackDamage";
import { expRequiredForLevel as sharedExpRequiredForLevel } from "../../../game-data/progressFormulas";
import {
  BASE_MISS_CHANCE,
  MAX_MISS_CHANCE,
  MIN_MISS_CHANCE,
  MISS_REDUCTION_PER_AGILITY,
  STAT_MIN,
} from "./constants";

export {
  EXP_PROGRESSION_MAX_LEVEL,
  EXP_TO_NEXT_BY_LEVEL,
} from "../../../game-data/progressFormulas";

export function expRequiredForLevel(level: number): number {
  return sharedExpRequiredForLevel(level);
}

export { getBaseVitalsFromStats } from "../../game/characterStats";

export function getLevelUpBonusesFromStats(stats: CoreStats): { hpBonus: number; mpBonus: number } {
  return {
    hpBonus: Math.max(1, Math.round(stats.constitution * 0.6)),
    mpBonus: Math.max(1, Math.round(stats.intelligence * 0.5)),
  };
}

export function getStrengthDamageBonus(strength: number): { minBonus: number; maxBonus: number } {
  const bonus = getSharedStrengthDamageBonus(strength);
  return {
    minBonus: bonus,
    maxBonus: bonus,
  };
}

export function getMissChanceFromAgility(agility: number): number {
  const missChance = BASE_MISS_CHANCE - (agility - STAT_MIN) * MISS_REDUCTION_PER_AGILITY;
  return Phaser.Math.Clamp(missChance, MIN_MISS_CHANCE, MAX_MISS_CHANCE);
}

export function macroSpellTextureKey(spellId: number): string {
  return `macro_spell_${spellId}`;
}
