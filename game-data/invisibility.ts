/**
 * Invisibilidad (hechizo 14): parpadeo de alpha sobre el sprite del personaje.
 * Ciclo yoyo sinusoidal: invisible (0) ↔ semi-visible, sin cortes bruscos.
 */

/** Duración total del efecto (ms). */
export const INVISIBILITY_DURATION_MS = 30_000;

/** Un ciclo completo invisible → parcial → invisible (ms). */
export const INVISIBILITY_YOYO_CYCLE_MS = 1_500;

/** Alpha máximo en el pico del yoyo (no es invisibilidad total). */
export const INVISIBILITY_PARTIAL_ALPHA = 0.38;

/** @deprecated Usar INVISIBILITY_YOYO_CYCLE_MS; conservado por compatibilidad de imports. */
export const INVISIBILITY_CYCLE_FULL_MS = 500;

/** @deprecated Usar INVISIBILITY_YOYO_CYCLE_MS. */
export const INVISIBILITY_CYCLE_PARTIAL_MS = 1_000;

/** Alpha 0 = invisible; 1 = visible. */
export function getInvisibilityAlpha(
  nowMs: number,
  invisibleUntilMs: number
): number {
  if (invisibleUntilMs <= 0 || nowMs >= invisibleUntilMs) {
    return 1;
  }
  const startedAt = invisibleUntilMs - INVISIBILITY_DURATION_MS;
  const elapsed = Math.max(0, nowMs - startedAt);
  const phase = (elapsed % INVISIBILITY_YOYO_CYCLE_MS) / INVISIBILITY_YOYO_CYCLE_MS;
  // Coseno: 0 en fase 0 y 1, 1 en fase 0.5 → yoyo suave sin salto al reiniciar ciclo.
  const wave = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
  return wave * INVISIBILITY_PARTIAL_ALPHA;
}

export function isInvisibleAt(nowMs: number, invisibleUntilMs: number): boolean {
  return invisibleUntilMs > 0 && nowMs < invisibleUntilMs;
}
