/**
 * Mitigación anti-oneshot en PvP: hechizos de distintos jugadores en ventana corta
 * hacen menos daño; el mismo atacante siempre aplica daño completo.
 */

export const ANTI_ONESHOT_WINDOW_MS = 2000;

export const ANTI_ONESHOT_FIRST_SOURCE_MULTIPLIER = 1;
export const ANTI_ONESHOT_SECOND_SOURCE_MULTIPLIER = 0.7;
export const ANTI_ONESHOT_THIRD_PLUS_SOURCE_MULTIPLIER = 0.5;

export type PvpSpellHitRecord = {
  attackerId: string;
  atMs: number;
};

export function prunePvpSpellHitRecords(
  records: readonly PvpSpellHitRecord[],
  nowMs: number
): PvpSpellHitRecord[] {
  const cutoff = nowMs - ANTI_ONESHOT_WINDOW_MS;
  return records.filter((record) => record.atMs >= cutoff);
}

/**
 * Multiplicador de daño para un hechizo PvP según fuentes recientes (solo jugadores distintos).
 * Si el atacante ya golpeó en la ventana, siempre 100%.
 */
export function resolveAntiOneshotSpellMultiplier(
  records: readonly PvpSpellHitRecord[],
  attackerId: string,
  nowMs: number
): { multiplier: number; records: PvpSpellHitRecord[] } {
  const pruned = prunePvpSpellHitRecords(records, nowMs);
  const alreadyHitVictim = pruned.some((record) => record.attackerId === attackerId);
  if (alreadyHitVictim) {
    return {
      multiplier: ANTI_ONESHOT_FIRST_SOURCE_MULTIPLIER,
      records: [...pruned, { attackerId, atMs: nowMs }],
    };
  }

  const distinctAttackers = new Set(pruned.map((record) => record.attackerId)).size;
  let multiplier = ANTI_ONESHOT_FIRST_SOURCE_MULTIPLIER;
  if (distinctAttackers === 1) {
    multiplier = ANTI_ONESHOT_SECOND_SOURCE_MULTIPLIER;
  } else if (distinctAttackers >= 2) {
    multiplier = ANTI_ONESHOT_THIRD_PLUS_SOURCE_MULTIPLIER;
  }

  return {
    multiplier,
    records: [...pruned, { attackerId, atMs: nowMs }],
  };
}

export function applyAntiOneshotToSpellDamage(
  rawDamage: number,
  records: readonly PvpSpellHitRecord[],
  attackerId: string,
  nowMs: number
): { damage: number; records: PvpSpellHitRecord[] } {
  const { multiplier, records: nextRecords } = resolveAntiOneshotSpellMultiplier(
    records,
    attackerId,
    nowMs
  );
  return {
    damage: Math.max(0, Math.floor(rawDamage * multiplier)),
    records: nextRecords,
  };
}

export function createEmptyPvpSpellHitRecords(): PvpSpellHitRecord[] {
  return [];
}
