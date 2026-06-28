import { findTransition, getMap } from "./maps";
import { EDGE_TRANSITION_TRIGGER_DISTANCE } from "./mapConstants";

/** Tile dentro de la franja de cambio de mapa por borde (no apto para loot en el suelo). */
export function isMapEdgeTransitionZoneTile(
  mapId: string,
  tileX: number,
  tileY: number
): boolean {
  const map = getMap(mapId);

  if (map.transitions.some((t) => t.tileX === tileX && t.tileY === tileY)) {
    return true;
  }

  const margin = 10;
  if (tileY <= margin && findTransition(mapId, tileX, tileY, "up", false, true)) {
    return true;
  }
  if (tileY >= map.height - 1 - margin && findTransition(mapId, tileX, tileY, "down", false, true)) {
    return true;
  }
  if (tileX <= margin && findTransition(mapId, tileX, tileY, "left", false, true)) {
    return true;
  }
  if (tileX >= map.width - 1 - margin && findTransition(mapId, tileX, tileY, "right", false, true)) {
    return true;
  }

  return false;
}

/** Tile seguro para dejar ítems caminables y recuperables (sin zonas de portal/borde). */
export function isWorldItemDropTileAllowed(
  mapId: string,
  tileX: number,
  tileY: number,
  isWalkable: (tileX: number, tileY: number) => boolean
): boolean {
  if (!isWalkable(tileX, tileY)) {
    return false;
  }
  return !isMapEdgeTransitionZoneTile(mapId, tileX, tileY);
}
