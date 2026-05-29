/**
 * Reglas de oro al unirse a una sesión multijugador.
 * Usado por el servidor (join / fallback) y cubierto por tests.
 */

/** Oro del mensaje join cuando el cliente envía un valor válido. */
export function resolveJoinGoldFromMessage(
  messageGold: number | undefined,
  sessionGoldBeforeOverride: number
): number {
  if (typeof messageGold === "number" && Number.isFinite(messageGold)) {
    return Math.max(0, Math.floor(messageGold));
  }
  return sessionGoldBeforeOverride;
}

/** Oro cuando no hay personaje persistido (fallback de join). */
export function resolveJoinFallbackGold(messageGold: number | undefined): number {
  if (typeof messageGold === "number" && Number.isFinite(messageGold)) {
    return Math.max(0, Math.floor(messageGold));
  }
  return 0;
}
