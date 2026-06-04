import { expRequiredForLevel } from "./progressFormulas";
import { VITAL_GROWTH_MAX_LEVEL } from "./vitalProgression";

export type ExpGainResult = {
  exp: number;
  expToNext: number;
  level: number;
  levelsGained: number;
};

/** Suma experiencia y resuelve subidas de nivel (tope VITAL_GROWTH_MAX_LEVEL). */
export function applyExpGain(
  level: number,
  exp: number,
  expToNext: number,
  amount: number
): ExpGainResult {
  let nextLevel = Math.max(1, Math.floor(level));
  let nextExp = Math.max(0, Math.floor(exp)) + Math.max(0, Math.floor(amount));
  let nextExpToNext = Math.max(1, Math.floor(expToNext));
  let levelsGained = 0;

  while (nextLevel < VITAL_GROWTH_MAX_LEVEL && nextExp >= nextExpToNext) {
    nextExp -= nextExpToNext;
    nextLevel += 1;
    levelsGained += 1;
    nextExpToNext = expRequiredForLevel(nextLevel);
  }

  if (nextLevel >= VITAL_GROWTH_MAX_LEVEL) {
    nextExp = 0;
    nextExpToNext = expRequiredForLevel(nextLevel);
  }

  return {
    exp: nextExp,
    expToNext: nextExpToNext,
    level: nextLevel,
    levelsGained,
  };
}
