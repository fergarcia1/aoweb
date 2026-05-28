import { MAP_TILE_SIZE } from "../maps/constants";
import { START_MAP_ID } from "../maps/index";
import type { MobModelId } from "./mobs";

/** Todos los modelos de mob implementados, en orden de exhibición (izq → der, filas hacia arriba). */
export const MOB_SHOWCASE_MODEL_ORDER: MobModelId[] = [
  "gallina",
  "conejo",
  "lobo",
  "serpiente",
  "arana",
  "oso",
  "golem_plata",
  "aparicion",
  "aprendiz_mago",
  "asesino",
  "bruja_drow",
  "basilisco",
  "demonio",
  "chaman_nieves",
  "ciclope",
  "training_dummy",
];

/** Fila de sandbox sobre los NPCs de la caja de arena (sacerdote ~y34, alquimista ~y30). */
export const MOB_SHOWCASE_CONFIG = {
  mapId: START_MAP_ID,
  /** Tile ancla del primer mob (esquina sup-izq de su cuadrado de prueba 2×2). */
  startTileX: 34,
  startTileY: 25,
  /** Separación entre anclas en la misma fila. */
  tileSpacingX: 3,
  /** Separación entre filas (cada fila nueva va hacia arriba / menor Y). */
  tileSpacingY: 3,
  /** Recorrido de prueba 2×2 por mob. */
  mobFootprint: 2,
  /** Margen mínimo respecto al borde del mapa. */
  mapMargin: 2,
  stepIntervalMs: 3000,
} as const;

export function getMobShowcaseSlotsPerRow(
  mapWidth = MAP_TILE_SIZE,
  mapHeight = MAP_TILE_SIZE
): number {
  const { startTileX, tileSpacingX, mobFootprint, mapMargin } = MOB_SHOWCASE_CONFIG;
  const maxAnchorX = mapWidth - mapMargin - mobFootprint;
  if (maxAnchorX < startTileX) {
    return 1;
  }
  return Math.max(1, Math.floor((maxAnchorX - startTileX) / tileSpacingX) + 1);
}

/**
 * Posición ancla del mob de exhibición. Si no entran en una fila, continúa en la fila de arriba.
 */
export function getMobShowcaseAnchorTile(
  index: number,
  mapWidth = MAP_TILE_SIZE,
  mapHeight = MAP_TILE_SIZE
): { x: number; y: number } {
  const {
    startTileX,
    startTileY,
    tileSpacingX,
    tileSpacingY,
    mobFootprint,
    mapMargin,
  } = MOB_SHOWCASE_CONFIG;

  const slotsPerRow = getMobShowcaseSlotsPerRow(mapWidth, mapHeight);
  const col = index % slotsPerRow;
  const row = Math.floor(index / slotsPerRow);

  const x = startTileX + col * tileSpacingX;
  const minAnchorY = mapMargin + mobFootprint - 1;
  const y = Math.max(minAnchorY, startTileY - row * tileSpacingY);

  return { x, y };
}
