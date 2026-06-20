import { IMMOBILIZE_SPELL_IDS, SPELL_DEFINITIONS } from "../game-data/spells";
import {
  INMOVILIZAR_MOB_DURATION_MS,
  INMOVILIZAR_PLAYER_DURATION_MS,
  PARALIZAR_MOB_DURATION_MS,
  PARALIZAR_PLAYER_DURATION_MS,
} from "../game-data/constants";

export const ATTACK_COOLDOWN_MS = 1200;

export function getSpellDefinition(spellId: number) {
  return SPELL_DEFINITIONS.find((spell) => spell.idSpell === spellId);
}

export function isImmobilizeSpell(spellId: number) {
  return IMMOBILIZE_SPELL_IDS.has(spellId);
}

/** Duración de inmovilización/parálisis sobre mobs según hechizo. */
export function getImmobilizeMobDurationMs(spellId: number): number {
  if (spellId === 8) {
    return INMOVILIZAR_MOB_DURATION_MS;
  }
  if (spellId === 10 || spellId === 35) {
    return PARALIZAR_MOB_DURATION_MS;
  }
  return INMOVILIZAR_MOB_DURATION_MS;
}

/** Duración de inmovilización/parálisis sobre jugadores según hechizo. */
export function isMobImmobilizedAt(
  immobilizedUntilMs: number,
  nowMs: number = Date.now()
): boolean {
  return immobilizedUntilMs > 0 && nowMs < immobilizedUntilMs;
}

export function getImmobilizePlayerDurationMs(spellId: number): number {
  if (spellId === 8) {
    return INMOVILIZAR_PLAYER_DURATION_MS;
  }
  if (spellId === 10 || spellId === 35) {
    return PARALIZAR_PLAYER_DURATION_MS;
  }
  return INMOVILIZAR_PLAYER_DURATION_MS;
}

export function manhattanDistance(ax: number, ay: number, bx: number, by: number) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function isAdjacent(ax: number, ay: number, bx: number, by: number) {
  return manhattanDistance(ax, ay, bx, by) === 1;
}

export function rollInt(min: number, max: number) {
  const lo = Math.max(0, Math.floor(min));
  const hi = Math.max(lo, Math.floor(max));
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export type WeaponCritConfig = {
  canCrit: boolean;
  critChance: number;
  critDamage: number;
};

export type AttackRollResult = {
  damage: number;
  isCrit: boolean;
};

export function rollAttackDamage(
  attackMin: number,
  attackMax: number,
  crit?: Partial<WeaponCritConfig>
): AttackRollResult {
  let damage = rollInt(attackMin, attackMax);
  if (!crit?.canCrit) {
    return { damage, isCrit: false };
  }

  const critChance = crit.critChance ?? 0;
  const critDamage = crit.critDamage ?? 1.5;
  if (Math.random() < critChance) {
    damage = Math.max(1, Math.floor(damage * critDamage));
    return { damage, isCrit: true };
  }

  return { damage, isCrit: false };
}
