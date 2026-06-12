/**
 * Reglas de oro al unirse a una sesión multijugador.
 * Usado por el servidor (join / fallback) y cubierto por tests.
 */

import { clampVitalPair } from "./joinValidation";

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

export type JoinVitalsMessage = {
  hp?: number;
  hpMax?: number;
  mp?: number;
  mpMax?: number;
};

/** Banco al join: con snapshot persistido el servidor/DB es la fuente de verdad. */
export function shouldApplyJoinBankFromClient(trustPersistedSnapshot: boolean): boolean {
  return !trustPersistedSnapshot;
}

/** Vitales al join: con snapshot persistido no se pisan con el cliente. */
export function applyJoinVitalsToSession(
  session: { hp: number; hpMax: number; mp: number; mpMax: number },
  message: JoinVitalsMessage,
  options: { trustPersistedSnapshot: boolean }
): void {
  if (options.trustPersistedSnapshot) {
    session.hp = Math.min(session.hpMax, Math.max(0, Math.floor(session.hp)));
    session.mp = Math.min(session.mpMax, Math.max(0, Math.floor(session.mp)));
    return;
  }

  const hpPair = clampVitalPair(
    message.hp,
    message.hpMax,
    session.hpMax > 100 ? session.hpMax : 100
  );
  const mpPair = clampVitalPair(
    message.mp,
    message.mpMax,
    session.mpMax > 50 ? session.mpMax : 50
  );
  session.hpMax = hpPair.max;
  session.hp = hpPair.current;
  session.mpMax = mpPair.max;
  session.mp = mpPair.current;
}
