/**
 * Progresión de skills estilo Argentum Online.
 *
 * Tope de Magia por nivel (interpolado entre hitos):
 * - Nivel  1 → 0
 * - Nivel 24 → 50
 * - Nivel 40 → 100
 *
 * Entre hitos el tope sube de forma lineal; eso hace que cada nivel
 * otorgue distinto margen (ej. del 1→2 ~2 pts, del 24→25 ~3 pts).
 * El valor real del skill sube al usarlo (p. ej. 10% por hechizo).
 */

export const SKILL_IDS = [
  "magia",
  "robar",
  "evasion",
  "apunalar",
  "supervivencia",
  "liderazgo",
  "combate_armas",
  "combate_distancia",
  "defensa_escudos",
  "sin_armas",
] as const;

export type SkillId = (typeof SKILL_IDS)[number];

export const SKILL_LABELS: Record<SkillId, string> = {
  magia: "Magia",
  robar: "Robar",
  evasion: "Evasión",
  apunalar: "Apuñalar",
  supervivencia: "Supervivencia",
  liderazgo: "Liderazgo",
  combate_armas: "Combate c/armas",
  combate_distancia: "Combate a dist.",
  defensa_escudos: "Defensa escudos",
  sin_armas: "Combate s/armas",
};

/** Skills mostrados en la pestaña lateral. */
export const SIDEBAR_SKILL_IDS: SkillId[] = [...SKILL_IDS];

const MAGIA_CAP_MILESTONES = [
  { level: 1, cap: 0 },
  { level: 2, cap: 3 },
  { level: 3, cap: 7 },
  { level: 24, cap: 50 },
  { level: 40, cap: 100 },
] as const;

/** Escala del tope respecto a Magia (100% = misma curva). */
const SKILL_CAP_SCALE: Record<SkillId, number> = {
  magia: 1,
  robar: 0.72,
  evasion: 0.8,
  apunalar: 0.75,
  supervivencia: 0.7,
  liderazgo: 0.85,
  combate_armas: 0.9,
  combate_distancia: 0.88,
  defensa_escudos: 0.82,
  sin_armas: 0.78,
};

const DEFAULT_SKILL_GAIN_CHANCE = 0.1;

type CapMilestone = { level: number; cap: number };

function interpolateCap(level: number, milestones: readonly CapMilestone[]): number {
  const sorted = [...milestones].sort((a, b) => a.level - b.level);
  const clampedLevel = Math.max(1, Math.floor(level));

  if (clampedLevel <= sorted[0].level) {
    return sorted[0].cap;
  }

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const next = sorted[i];
    if (clampedLevel <= next.level) {
      const span = next.level - prev.level;
      if (span <= 0) return next.cap;
      const t = (clampedLevel - prev.level) / span;
      return Math.floor(prev.cap + t * (next.cap - prev.cap));
    }
  }

  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const span = last.level - prev.level;
  if (span <= 0) return last.cap;
  const slope = (last.cap - prev.cap) / span;
  return Math.floor(last.cap + slope * (clampedLevel - last.level));
}

const MAGIA_CAP_BY_LEVEL: number[] = (() => {
  const table: number[] = [0];
  for (let level = 1; level <= 60; level += 1) {
    table[level] = interpolateCap(level, MAGIA_CAP_MILESTONES);
  }
  return table;
})();

/** Tope de skill alcanzable según el nivel del personaje. */
export function getSkillCap(skillId: SkillId, playerLevel: number): number {
  const level = Math.max(1, Math.floor(playerLevel));
  const magiaCap = MAGIA_CAP_BY_LEVEL[Math.min(level, MAGIA_CAP_BY_LEVEL.length - 1)] ?? 0;
  return Math.floor(magiaCap * SKILL_CAP_SCALE[skillId]);
}

/** Cuánto sube el tope al pasar de `fromLevel` a `toLevel`. */
export function getSkillCapGainBetweenLevels(
  skillId: SkillId,
  fromLevel: number,
  toLevel: number
): number {
  return Math.max(0, getSkillCap(skillId, toLevel) - getSkillCap(skillId, fromLevel));
}

export function createInitialSkillLevels(): Record<SkillId, number> {
  return Object.fromEntries(SKILL_IDS.map((id) => [id, 0])) as Record<SkillId, number>;
}

export type SkillImproveResult = {
  improved: boolean;
  newValue: number;
  atCap: boolean;
};

/** Intenta subir 1 punto de skill por uso (probabilidad configurable). */
export function tryImproveSkill(
  skillId: SkillId,
  levels: Record<SkillId, number>,
  playerLevel: number,
  chance = DEFAULT_SKILL_GAIN_CHANCE
): SkillImproveResult {
  const cap = getSkillCap(skillId, playerLevel);
  const current = levels[skillId] ?? 0;

  if (current >= cap) {
    return { improved: false, newValue: current, atCap: true };
  }

  if (Math.random() >= chance) {
    return { improved: false, newValue: current, atCap: false };
  }

  const newValue = current + 1;
  levels[skillId] = newValue;
  return { improved: true, newValue, atCap: newValue >= cap };
}

export type SkillDisplayEntry = {
  id: SkillId;
  label: string;
  current: number;
  cap: number;
};

export function buildSkillDisplayEntries(
  levels: Record<SkillId, number>,
  playerLevel: number,
  skillIds: SkillId[] = SIDEBAR_SKILL_IDS
): SkillDisplayEntry[] {
  return skillIds.map((id) => ({
    id,
    label: SKILL_LABELS[id],
    current: levels[id] ?? 0,
    cap: getSkillCap(id, playerLevel),
  }));
}

/** Referencia: tope de Magia en niveles clave (debe dar 50 @24 y 100 @40). */
export function getMagiaCapReference(level: number): number {
  return MAGIA_CAP_BY_LEVEL[Math.max(1, Math.floor(level))] ?? 0;
}
