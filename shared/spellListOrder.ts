/** Ordena IDs de hechizo: primero el guardado, luego los nuevos al final. */
export function orderSpellIds(
  availableIds: readonly number[],
  savedOrder: readonly number[]
): number[] {
  const remaining = new Set(availableIds);
  const ordered: number[] = [];

  for (const spellId of savedOrder) {
    if (!remaining.has(spellId)) continue;
    ordered.push(spellId);
    remaining.delete(spellId);
  }

  for (const spellId of availableIds) {
    if (remaining.has(spellId)) {
      ordered.push(spellId);
      remaining.delete(spellId);
    }
  }

  return ordered;
}
