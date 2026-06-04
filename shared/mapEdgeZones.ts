import { getMap } from "./maps";
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

  const edges = map.edgeTransitions;
  if (!edges) {
    return false;
  }

  const margin = EDGE_TRANSITION_TRIGGER_DISTANCE;
  if (edges.up !== undefined && tileY <= margin) {
    return true;
  }
  if (edges.down !== undefined && tileY >= map.height - 1 - margin) {
    return true;
  }
  if (edges.left !== undefined && tileX <= margin) {
    return true;
  }
  if (edges.right !== undefined && tileX >= map.width - 1 - margin) {
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
