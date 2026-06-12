import { isMultiplayerEnabled } from "../network/multiplayerConfig";

/**
 * AOWEB es MMO: la simulación del mundo (mobs, combate, loot, oro) vive en el servidor.
 * El cliente predice movimiento y renderiza; no hay modo single-player autoritativo.
 */
export function isMmoServerAuthorityEnabled(): boolean {
  return isMultiplayerEnabled();
}

export const OFFLINE_GAMEPLAY_MESSAGE = "Sin conexión al servidor.";
