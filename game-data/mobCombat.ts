/**
 * Daño de golpe de mobs (min/max) y utilidades compartidas cliente/servidor.
 */

export function normalizeMobHitRange(
  minHit: unknown,
  maxHit: unknown,
  legacyAttackDamage?: unknown
): { minHit: number; maxHit: number } {
  const legacy =
    typeof legacyAttackDamage === "number" && Number.isFinite(legacyAttackDamage)
      ? Math.max(0, Math.floor(legacyAttackDamage))
      : 0;

  let min =
    typeof minHit === "number" && Number.isFinite(minHit)
      ? Math.max(0, Math.floor(minHit))
      : legacy;
  let max =
    typeof maxHit === "number" && Number.isFinite(maxHit)
      ? Math.max(0, Math.floor(maxHit))
      : legacy;

  if (min > max) {
    [min, max] = [max, min];
  }

  return { minHit: min, maxHit: max };
}

export function mobCanAttack(minHit: number, maxHit: number): boolean {
  return maxHit > 0;
}

/** Daño entero aleatorio entre minHit y maxHit (inclusive). */
export function rollMobHitDamage(minHit: number, maxHit: number): number {
  if (maxHit <= 0) {
    return 0;
  }
  if (minHit >= maxHit) {
    return maxHit;
  }
  return minHit + Math.floor(Math.random() * (maxHit - minHit + 1));
}
