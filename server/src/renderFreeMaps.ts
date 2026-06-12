import { MAP_MAPA1 } from "../../shared/maps/mapa1";
import { MAP_MAPA44 } from "../../shared/maps/mapa44";
import type { GameMap, MapTransition } from "../../shared/mapTypes";

const MAPS: Record<string, GameMap> = {
  [MAP_MAPA1.id]: MAP_MAPA1,
  [MAP_MAPA44.id]: MAP_MAPA44,
};

export function getMap(mapId: string): GameMap {
  const map = MAPS[mapId];
  if (!map) {
    throw new Error(`Mapa no disponible en Render Free: ${mapId}`);
  }
  return map;
}

export function getAllMaps(): GameMap[] {
  return Object.values(MAPS);
}

export function getAdjacentMapIds(mapId: string): string[] {
  const map = getMap(mapId);
  const adjacent = new Set<string>();

  for (const transition of map.transitions) {
    if (MAPS[transition.toMapId] && transition.toMapId !== mapId) {
      adjacent.add(transition.toMapId);
    }
  }

  for (const edgeTransition of Object.values(map.edgeTransitions ?? {})) {
    if (edgeTransition?.toMapId && MAPS[edgeTransition.toMapId] && edgeTransition.toMapId !== mapId) {
      adjacent.add(edgeTransition.toMapId);
    }
  }

  return [...adjacent];
}

export function getScopedPreloadMapIds(mapId: string): string[] {
  return [mapId, ...getAdjacentMapIds(mapId)];
}

export function findTransition(
  mapId: string,
  tileX: number,
  tileY: number,
  facing?: "up" | "down" | "left" | "right"
): MapTransition | undefined {
  const map = getMap(mapId);
  const directTransition = map.transitions.find((t) => t.tileX === tileX && t.tileY === tileY);
  if (directTransition && MAPS[directTransition.toMapId]) {
    return directTransition;
  }

  if (!facing) {
    return undefined;
  }

  const edgeTransition = map.edgeTransitions?.[facing];
  if (!edgeTransition || !MAPS[edgeTransition.toMapId]) {
    return undefined;
  }

  return {
    tileX,
    tileY,
    toMapId: edgeTransition.toMapId,
    toTileX: Math.max(1, Math.min(getMap(edgeTransition.toMapId).width - 2, tileX)),
    toTileY: Math.max(1, Math.min(getMap(edgeTransition.toMapId).height - 2, tileY)),
    facing: edgeTransition.facing ?? facing,
  };
}
