/**
 * Evita que un autosave programado persista en el personaje equivocado
 * tras cambiar de slot (CharacterSelect resume).
 */
export function shouldApplyScheduledPersist(
  scheduledForCharacterId: string,
  currentCharacterId: string | null
): boolean {
  return currentCharacterId === scheduledForCharacterId;
}
