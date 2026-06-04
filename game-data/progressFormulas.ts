/** Fórmulas de progreso compartidas cliente/servidor (sin Phaser). */

export const EXP_BASE = 100;
export const EXP_GROWTH = 1.35;

export function expRequiredForLevel(level: number): number {
  return Math.max(1, Math.floor(EXP_BASE * Math.pow(EXP_GROWTH, Math.max(1, level) - 1)));
}
