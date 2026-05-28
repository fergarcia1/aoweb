import type { Facing } from "../player/playerSprites";

/**
 * @deprecated Fase 1: usar `src/game/mobs/mobVisualConfig.ts`.
 * Se mantienen presets y helpers por si herramientas o código legacy los importan.
 */

export const MOB_TARGET_DISPLAY_HEIGHT_PX = 48;
export const MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX = 96;

export function mobScaleForFrameHeight(
  frameHeight: number,
  targetPx = MOB_TARGET_DISPLAY_HEIGHT_PX
): number {
  return targetPx / frameHeight;
}

/** Filas S W A D (Fila 1–4 en convención Imperium). */
export const MOB_DIRECTION_ROWS_SWAD: Record<Facing, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
};

export const MOB_LAYOUT_192_32x48 = {
  frameWidth: 32,
  frameHeight: 48,
  sheetCols: 6,
  dirAxis: "rows" as const,
  dirRows: MOB_DIRECTION_ROWS_SWAD,
};

export const MOB_LAYOUT_ROWS_SWAD_64 = {
  frameWidth: 64,
  frameHeight: 64,
  sheetCols: 4,
  dirAxis: "rows" as const,
  dirRows: MOB_DIRECTION_ROWS_SWAD,
};

export const MOB_LAYOUT_ROWS_SWAD_128 = {
  frameWidth: 128,
  frameHeight: 128,
  sheetCols: 4,
  dirAxis: "rows" as const,
  dirRows: MOB_DIRECTION_ROWS_SWAD,
};

/** @deprecated Usar MOB_LAYOUT_ROWS_SWAD_* (direcciones en filas, no columnas). */
export const MOB_LAYOUT_256_SWAD_64 = MOB_LAYOUT_ROWS_SWAD_64;
export const MOB_LAYOUT_512_SWAD_128 = MOB_LAYOUT_ROWS_SWAD_128;
