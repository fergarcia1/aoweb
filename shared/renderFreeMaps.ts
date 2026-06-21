import { MAP_MAPA1 } from "./maps/mapa1";
import { MAP_MAPA2 } from "./maps/mapa2";
import { MAP_MAPA37 } from "./maps/mapa37";
import { MAP_MAPA44 } from "./maps/mapa44";
import {
  EDGE_TRANSITION_TARGET_INSET,
  EDGE_TRANSITION_TRIGGER_DISTANCE,
  START_MAP_ID,
} from "./mapConstants";
import type { EdgeTransition, GameMap, MapEdge, MapTransition } from "./mapTypes";
import { WORLD_MAP_GRID_CELLS } from "./worldMapGrid";

export { EDGE_TRANSITION_TARGET_INSET, EDGE_TRANSITION_TRIGGER_DISTANCE, START_MAP_ID } from "./mapConstants";

const MAPS: Record<string, GameMap> = {
  [MAP_MAPA1.id]: MAP_MAPA1,
  [MAP_MAPA2.id]: MAP_MAPA2,
  [MAP_MAPA37.id]: MAP_MAPA37,
  [MAP_MAPA44.id]: MAP_MAPA44,
};

type WorldGridCell = (typeof WORLD_MAP_GRID_CELLS)[number];

const WORLD_GRID_BY_COORD = new Map<string, WorldGridCell>();
const WORLD_GRID_BY_MAP_ID = new Map<string, WorldGridCell[]>();

for (const cell of WORLD_MAP_GRID_CELLS) {
  if (!MAPS[cell.mapId]) {
    continue;
  }
  WORLD_GRID_BY_COORD.set(`${cell.gridX},${cell.gridY}`, cell);
  const entries = WORLD_GRID_BY_MAP_ID.get(cell.mapId);
  if (entries) {
    entries.push(cell);
  } else {
    WORLD_GRID_BY_MAP_ID.set(cell.mapId, [cell]);
  }
}

const EDGE_DELTAS: Record<MapEdge, { dx: number; dy: number; opposite: MapEdge }> = {
  up: { dx: 0, dy: -1, opposite: "down" },
  down: { dx: 0, dy: 1, opposite: "up" },
  left: { dx: -1, dy: 0, opposite: "right" },
  right: { dx: 1, dy: 0, opposite: "left" },
};

const MAP_EDGES: MapEdge[] = ["up", "down", "left", "right"];

export function getMap(mapId: string): GameMap {
  const map = MAPS[mapId];
  if (!map) {
    throw new Error(`Mapa no disponible en deploy free: ${mapId}`);
  }
  return map;
}

export function hasMap(mapId: string): boolean {
  return Boolean(MAPS[mapId]);
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

  for (const edge of MAP_EDGES) {
    const gridTransition = getWorldGridEdgeTransition(mapId, edge);
    if (gridTransition?.toMapId && gridTransition.toMapId !== mapId) {
      adjacent.add(gridTransition.toMapId);
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

  const margin = EDGE_TRANSITION_TRIGGER_DISTANCE;
  const directionalEdge =
    facing === "up" && tileY <= margin
      ? "up"
      : facing === "down" && tileY >= map.height - 1 - margin
        ? "down"
        : facing === "left" && tileX <= margin
          ? "left"
          : facing === "right" && tileX >= map.width - 1 - margin
            ? "right"
            : undefined;

  if (directionalEdge) {
    return buildEdgeTransition(map, mapId, tileX, tileY, directionalEdge);
  }

  const candidateEdges: MapEdge[] = [];
  if (tileY === 0) candidateEdges.push("up");
  if (tileY === map.height - 1) candidateEdges.push("down");
  if (tileX === 0) candidateEdges.push("left");
  if (tileX === map.width - 1) candidateEdges.push("right");

  if (candidateEdges.length === 0) {
    return undefined;
  }

  const edge = facing && candidateEdges.includes(facing) ? facing : candidateEdges[0];
  return buildEdgeTransition(map, mapId, tileX, tileY, edge);
}

function getWorldGridEdgeTransition(mapId: string, edge: MapEdge): EdgeTransition | undefined {
  const cells = WORLD_GRID_BY_MAP_ID.get(mapId);
  if (!cells) {
    return undefined;
  }
  const delta = EDGE_DELTAS[edge];
  for (const cell of cells) {
    const neighbor = WORLD_GRID_BY_COORD.get(`${cell.gridX + delta.dx},${cell.gridY + delta.dy}`);
    if (neighbor && MAPS[neighbor.mapId]) {
      return { toMapId: neighbor.mapId, facing: delta.opposite };
    }
  }
  return undefined;
}

function buildEdgeTransition(
  map: GameMap,
  mapId: string,
  tileX: number,
  tileY: number,
  edge: MapEdge
): MapTransition | undefined {
  const edgeTransition = map.edgeTransitions?.[edge] ?? getWorldGridEdgeTransition(mapId, edge);
  if (!edgeTransition || !MAPS[edgeTransition.toMapId]) {
    return undefined;
  }

  const targetMap = getMap(edgeTransition.toMapId);
  const insetX = Math.min(EDGE_TRANSITION_TARGET_INSET, Math.max(1, Math.floor((targetMap.width - 1) / 2)));
  const insetY = Math.min(EDGE_TRANSITION_TARGET_INSET, Math.max(1, Math.floor((targetMap.height - 1) / 2)));

  if (edge === "up" || edge === "down") {
    return {
      tileX,
      tileY,
      toMapId: edgeTransition.toMapId,
      toTileX: Math.max(insetX, Math.min(targetMap.width - 1 - insetX, tileX)),
      toTileY: edge === "up" ? targetMap.height - 1 - insetY : insetY,
      facing: edgeTransition.facing ?? edge,
    };
  }

  return {
    tileX,
    tileY,
    toMapId: edgeTransition.toMapId,
    toTileX: edge === "left" ? targetMap.width - 1 - insetX : insetX,
    toTileY: Math.max(insetY, Math.min(targetMap.height - 1 - insetY, tileY)),
    facing: edgeTransition.facing ?? edge,
  };
}
