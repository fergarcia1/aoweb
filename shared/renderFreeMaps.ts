import { MAP_MAPA1 } from "./maps/mapa1";
import { MAP_MAPA37 } from "./maps/mapa37";
import { MAP_MAPA44 } from "./maps/mapa44";
import { EDGE_TRANSITION_TARGET_INSET, START_MAP_ID } from "./mapConstants";
import type { GameMap, MapTransition } from "./mapTypes";

export { EDGE_TRANSITION_TARGET_INSET, EDGE_TRANSITION_TRIGGER_DISTANCE, START_MAP_ID } from "./mapConstants";

const MAPS: Record<string, GameMap> = {
  [MAP_MAPA1.id]: MAP_MAPA1,
  [MAP_MAPA37.id]: MAP_MAPA37,
  [MAP_MAPA44.id]: MAP_MAPA44,
};

export function getMap(mapId: string): GameMap {
  const map = MAPS[mapId];
  if (!map) {
    throw new Error(`Mapa no disponible en deploy free: ${mapId}`);
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

  const targetMap = getMap(edgeTransition.toMapId);
  const insetX = Math.min(EDGE_TRANSITION_TARGET_INSET, Math.max(1, Math.floor((targetMap.width - 1) / 2)));
  const insetY = Math.min(EDGE_TRANSITION_TARGET_INSET, Math.max(1, Math.floor((targetMap.height - 1) / 2)));

  if (facing === "up" || facing === "down") {
    return {
      tileX,
      tileY,
      toMapId: edgeTransition.toMapId,
      toTileX: Math.max(insetX, Math.min(targetMap.width - 1 - insetX, tileX)),
      toTileY: facing === "up" ? targetMap.height - 1 - insetY : insetY,
      facing: edgeTransition.facing ?? facing,
    };
  }

  return {
    tileX,
    tileY,
    toMapId: edgeTransition.toMapId,
    toTileX: facing === "left" ? targetMap.width - 1 - insetX : insetX,
    toTileY: Math.max(insetY, Math.min(targetMap.height - 1 - insetY, tileY)),
    facing: edgeTransition.facing ?? facing,
  };
}
