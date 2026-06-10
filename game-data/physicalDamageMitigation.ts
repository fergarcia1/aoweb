/**
 * Mitigación de daño físico: reducción plana (armadura/casco) y bloqueo probabilístico del escudo.
 */

export type PhysicalMitigationInput = {
  /** Reducción plana de armadura/casco (0.14 = 14%). */
  damageReductionPercent: number;
  /** Probabilidad de bloquear con escudo (0.18 = 18%). */
  shieldBlockChancePercent: number;
  /** Reducción extra al bloquear (0.38 = 38% menos daño). */
  shieldBlockReductionPercent: number;
  /** Roll en [0, 1) para tests; por defecto Math.random(). */
  roll?: number;
};

export type PhysicalMitigationResult = {
  damage: number;
  blocked: boolean;
};

export function mitigatePhysicalDamage(
  rawDamage: number,
  input: PhysicalMitigationInput
): PhysicalMitigationResult {
  const afterArmor = Math.max(
    0,
    Math.floor(rawDamage * (1 - Math.max(0, input.damageReductionPercent)))
  );

  const blockChance = Math.max(0, Math.min(1, input.shieldBlockChancePercent));
  const blockReduction = Math.max(0, Math.min(1, input.shieldBlockReductionPercent));

  if (blockChance <= 0 || blockReduction <= 0 || afterArmor <= 0) {
    return {
      damage: Math.max(1, afterArmor),
      blocked: false,
    };
  }

  const roll = input.roll ?? Math.random();
  if (roll < blockChance) {
    return {
      damage: Math.max(1, Math.floor(afterArmor * (1 - blockReduction))),
      blocked: true,
    };
  }

  return {
    damage: Math.max(1, afterArmor),
    blocked: false,
  };
}
