export const STRENGTH_DAMAGE_SOFT_CAP = 24;
export const STRENGTH_DAMAGE_BEFORE_CAP = 0.5;
export const STRENGTH_DAMAGE_AFTER_CAP = 1;
export const UNARMED_DAMAGE_VARIANCE = 2;

export type AttackDamageRange = {
  attackMin: number;
  attackMax: number;
};

export function getStrengthDamageBonus(strength: number): number {
  const normalizedStrength = Number.isFinite(strength)
    ? Math.max(0, Math.floor(strength))
    : 0;
  const beforeCap =
    Math.min(normalizedStrength, STRENGTH_DAMAGE_SOFT_CAP) *
    STRENGTH_DAMAGE_BEFORE_CAP;
  const afterCap =
    Math.max(0, normalizedStrength - STRENGTH_DAMAGE_SOFT_CAP) *
    STRENGTH_DAMAGE_AFTER_CAP;
  return beforeCap + afterCap;
}

export function getUnarmedDamageRange(strength: number): AttackDamageRange {
  const baseDamage = getStrengthDamageBonus(strength);
  const attackMin = Math.max(1, Math.floor(baseDamage - UNARMED_DAMAGE_VARIANCE));
  const attackMax = Math.max(attackMin, Math.floor(baseDamage + UNARMED_DAMAGE_VARIANCE));
  return { attackMin, attackMax };
}

export function getWeaponDamageRangeWithStrength(
  weaponMin: number,
  weaponMax: number,
  strength: number
): AttackDamageRange {
  const strengthBonus = getStrengthDamageBonus(strength);
  const attackMin = Math.max(1, Math.floor(weaponMin + strengthBonus));
  const attackMax = Math.max(attackMin, Math.floor(weaponMax + strengthBonus));
  return { attackMin, attackMax };
}
