export type DeathPhase = "alive" | "ghost_offer" | "ghost";

export type CharacterDeathState = {
  deathPhase: DeathPhase;
  useGhostAppearance: boolean;
};

/** Estado al cargar progreso guardado de un personaje. */
export function deathStateFromSavedProgress(
  deathPhase: DeathPhase,
  useGhostAppearance: boolean
): CharacterDeathState {
  if (deathPhase === "alive") {
    return { deathPhase: "alive", useGhostAppearance: false };
  }
  return { deathPhase, useGhostAppearance: useGhostAppearance === true };
}

/** Personaje sin save al cambiar de slot — siempre vivo. */
export function freshDeathStateForCharacterSwitch(): CharacterDeathState {
  return { deathPhase: "alive", useGhostAppearance: false };
}

export function isDeadOrGhost(state: CharacterDeathState): boolean {
  return state.deathPhase !== "alive";
}

/** Jugador muerto/fantasma en sesión de servidor o estado de red (hp + flag). */
export function isPlayerGhostFromVitals(hp: number, isDead = false): boolean {
  return hp <= 0 || isDead;
}
