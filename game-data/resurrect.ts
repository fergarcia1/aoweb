import { isResurrectSpell } from "./spellBehaviors";

/** Hechizo Resucitar (id 103). */
export const RESURRECT_SPELL_ID = 103;

/** Solo el id del hechizo Resucitar en SPELL_DEFINITIONS (103). No usar 11: es Tormenta Eléctrica. */
export const RESURRECT_SPELL_IDS = new Set<number>([RESURRECT_SPELL_ID]);

export function normalizeSpellId(spellId: unknown): number {
  const id = typeof spellId === "number" ? spellId : Number(spellId);
  return Number.isFinite(id) ? Math.floor(id) : NaN;
}

export function isResurrectSpellId(spellId: unknown): boolean {
  const id = normalizeSpellId(spellId);
  if (!Number.isFinite(id)) {
    return false;
  }
  return RESURRECT_SPELL_IDS.has(id) || isResurrectSpell(id);
}

/** Distancia máxima (Manhattan) entre lanzador y fantasma. */
export const RESURRECT_MAX_TILE_DISTANCE = 4;

/** Tiempo de carga antes de revivir al aliado (ms). */
export const RESURRECT_CHANNEL_MS = 10_000;

export function resurrectTileDistance(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): number {
  return Math.abs(fromX - toX) + Math.abs(fromY - toY);
}

export function isWithinResurrectRange(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): boolean {
  return resurrectTileDistance(fromX, fromY, toX, toY) <= RESURRECT_MAX_TILE_DISTANCE;
}

/** HP al revivir con hechizo / aliado (misma regla que sacerdote aliado). */
export const RESURRECT_REVIVE_HP_RATIO = 0.35;
