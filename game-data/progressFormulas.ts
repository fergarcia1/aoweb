/** Fórmulas de progreso compartidas cliente/servidor (sin Phaser). */

import { VITAL_GROWTH_MAX_LEVEL } from "./vitalGrowthCurves";

/**
 * Experiencia requerida estando en cada nivel para subir al siguiente.
 * Índice 0 = nivel 1 → 2, índice 48 = nivel 49 → 50 (tabla Imperium AO).
 */
export const EXP_TO_NEXT_BY_LEVEL: readonly number[] = [
  20, // nivel 2
  60, // nivel 3
  100, // nivel 4
  140, // nivel 5
  180, // nivel 6
  220, // nivel 7
  260, // nivel 8
  320, // nivel 9
  400, // nivel 10
  500, // nivel 11
  620, // nivel 12
  740, // nivel 13
  1000, // nivel 14 — fin dungeon newbie
  2000, // nivel 15
  3400, // nivel 16
  5200, // nivel 17
  7500, // nivel 18
  10200, // nivel 19
  14500, // nivel 20
  18400, // nivel 21
  23000, // nivel 22
  28300, // nivel 23
  36000, // nivel 24
  50000, // nivel 25
  68000, // nivel 26
  83000, // nivel 27
  102000, // nivel 28
  133000, // nivel 29
  182000, // nivel 30
  240000, // nivel 31
  293000, // nivel 32
  358000, // nivel 33
  420000, // nivel 34
  501000, // nivel 35
  593000, // nivel 36
  699000, // nivel 37
  805000, // nivel 38
  979000, // nivel 39
  1160000, // nivel 40
  1320000, // nivel 41
  1540000, // nivel 42
  1850000, // nivel 43
  2160000, // nivel 44
  2430000, // nivel 45
  2850000, // nivel 46
  3120000, // nivel 47
  3330000, // nivel 48
  3650000, // nivel 49
  3888888, // nivel 50
];

export const EXP_PROGRESSION_MAX_LEVEL = VITAL_GROWTH_MAX_LEVEL;

export function expRequiredForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(EXP_PROGRESSION_MAX_LEVEL, Math.floor(level)));
  const index = clamped - 1;
  return EXP_TO_NEXT_BY_LEVEL[index] ?? EXP_TO_NEXT_BY_LEVEL[EXP_TO_NEXT_BY_LEVEL.length - 1];
}
