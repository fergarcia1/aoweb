/** Hechizo ya aprendido por el personaje (fuente de verdad para tienda de magia). */
export function isSpellLearnedByPlayer(
  spellId: number,
  learnedSpellIds: ReadonlySet<number>
): boolean {
  return learnedSpellIds.has(spellId);
}
