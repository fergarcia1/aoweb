import type { CharacterClassId } from "./items/catalog";

export const DEFAULT_MOB_MISS_CHANCE = 0.2;
export const AGILITY_MISS_REDUCTION_SOFT_CAP = 24;
export const AGILITY_MISS_REDUCTION_BEFORE_CAP = 0.001;
export const AGILITY_MISS_REDUCTION_AFTER_CAP = 0.0025;

export const CLASS_EVASION_CHANCE: Record<CharacterClassId, number> = {
  bardo: 0.22,
  paladin: 0.15,
  druida: 0.19,
  nigromante: 0.16,
  mago: 0.16,
  cazador: 0.15,
  asesino: 0.18,
  guerrero: 0.15,
  clerigo: 0.16,
};

export function clampChance(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function getMobMissChance(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? clampChance(value)
    : DEFAULT_MOB_MISS_CHANCE;
}

export function getClassEvasionChance(classId: string): number {
  return CLASS_EVASION_CHANCE[classId as CharacterClassId] ?? 0;
}

export function getAgilityMissChanceReduction(agility: number): number {
  const normalizedAgility = Number.isFinite(agility)
    ? Math.max(0, Math.floor(agility))
    : 0;
  const beforeCap =
    Math.min(normalizedAgility, AGILITY_MISS_REDUCTION_SOFT_CAP) *
    AGILITY_MISS_REDUCTION_BEFORE_CAP;
  const afterCap =
    Math.max(0, normalizedAgility - AGILITY_MISS_REDUCTION_SOFT_CAP) *
    AGILITY_MISS_REDUCTION_AFTER_CAP;
  return beforeCap + afterCap;
}

export function applyAgilityMissReduction(baseChance: number, agility: number): number {
  return clampChance(baseChance - getAgilityMissChanceReduction(agility));
}

export function rollChance(chance: number): boolean {
  return Math.random() < clampChance(chance);
}
