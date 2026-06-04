import { MAP_MAPA1 } from "./maps/mapa1";
import { MAP_MAPA2 } from "./maps/mapa2";
import { MAP_MAPA3 } from "./maps/mapa3";
import { MAP_MAPA4 } from "./maps/mapa4";
import { MAP_MAPA5 } from "./maps/mapa5";
import { MAP_MAPA6 } from "./maps/mapa6";
import { MAP_MAPA7 } from "./maps/mapa7";
import { MAP_MAPA8 } from "./maps/mapa8";
import { MAP_MAPA9 } from "./maps/mapa9";
import { MAP_MAPA10 } from "./maps/mapa10";
import { MAP_MAPA44 } from "./maps/mapa44";
import type { GameMap, MapTransition } from "./mapTypes";
import {
  EDGE_TRANSITION_TRIGGER_DISTANCE,
  START_MAP_ID,
} from "./mapConstants";

export type { GameMap, MapTransition } from "./mapTypes";
export { EDGE_TRANSITION_TRIGGER_DISTANCE, START_MAP_ID };

const EDGE_TRANSITION_TARGET_INSET = 10;

const MAPS: Record<string, GameMap> = {
  [MAP_MAPA1.id]: MAP_MAPA1,
  [MAP_MAPA2.id]: MAP_MAPA2,
  [MAP_MAPA3.id]: MAP_MAPA3,
  [MAP_MAPA4.id]: MAP_MAPA4,
  [MAP_MAPA5.id]: MAP_MAPA5,
  [MAP_MAPA6.id]: MAP_MAPA6,
  [MAP_MAPA7.id]: MAP_MAPA7,
  [MAP_MAPA8.id]: MAP_MAPA8,
  [MAP_MAPA9.id]: MAP_MAPA9,
  [MAP_MAPA10.id]: MAP_MAPA10,
  [MAP_MAPA44.id]: MAP_MAPA44,
};

export function getMap(mapId: string): GameMap {
  const map = MAPS[mapId];
  if (!map) {
    throw new Error(`Mapa no encontrado: ${mapId}`);
  }
  return map;
}

export function getAllMaps(): GameMap[] {
  return Object.values(MAPS);
}

export function findTransition(
  mapId: string,
  tileX: number,
  tileY: number,
  facing?: "up" | "down" | "left" | "right"
): MapTransition | undefined {
  const map = getMap(mapId);
  const directTransition = map.transitions.find((t) => t.tileX === tileX && t.tileY === tileY);
  if (directTransition) {
    return directTransition;
  }

  if (!map.edgeTransitions) {
    return undefined;
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
    const edgeTransition = map.edgeTransitions[directionalEdge];
    if (!edgeTransition) {
      return undefined;
    }

    const targetMap = getMap(edgeTransition.toMapId);
    const insetX = Math.min(
      EDGE_TRANSITION_TARGET_INSET,
      Math.max(1, Math.floor((targetMap.width - 1) / 2))
    );
    const insetY = Math.min(
      EDGE_TRANSITION_TARGET_INSET,
      Math.max(1, Math.floor((targetMap.height - 1) / 2))
    );

    if (directionalEdge === "up" || directionalEdge === "down") {
      const toTileX = Math.max(insetX, Math.min(targetMap.width - 1 - insetX, tileX));
      const toTileY = directionalEdge === "up" ? targetMap.height - 1 - insetY : insetY;
      return {
        tileX,
        tileY,
        toMapId: edgeTransition.toMapId,
        toTileX,
        toTileY,
        facing: edgeTransition.facing ?? directionalEdge,
      };
    }

    const toTileY = Math.max(insetY, Math.min(targetMap.height - 1 - insetY, tileY));
    const toTileX = directionalEdge === "left" ? targetMap.width - 1 - insetX : insetX;
    return {
      tileX,
      tileY,
      toMapId: edgeTransition.toMapId,
      toTileX,
      toTileY,
      facing: edgeTransition.facing ?? directionalEdge,
    };
  }

  const candidateEdges: ("up" | "down" | "left" | "right")[] = [];
  if (tileY === 0) candidateEdges.push("up");
  if (tileY === map.height - 1) candidateEdges.push("down");
  if (tileX === 0) candidateEdges.push("left");
  if (tileX === map.width - 1) candidateEdges.push("right");

  if (candidateEdges.length === 0) {
    return undefined;
  }

  const edge = facing && candidateEdges.includes(facing) ? facing : candidateEdges[0];
  const edgeTransition = map.edgeTransitions[edge];
  if (!edgeTransition) {
    return undefined;
  }

  const targetMap = getMap(edgeTransition.toMapId);
  const insetX = Math.min(
    EDGE_TRANSITION_TARGET_INSET,
    Math.max(1, Math.floor((targetMap.width - 1) / 2))
  );
  const insetY = Math.min(
    EDGE_TRANSITION_TARGET_INSET,
    Math.max(1, Math.floor((targetMap.height - 1) / 2))
  );
  if (edge === "up" || edge === "down") {
    const toTileX = Math.max(insetX, Math.min(targetMap.width - 1 - insetX, tileX));
    const toTileY = edge === "up" ? targetMap.height - 1 - insetY : insetY;
    return {
      tileX,
      tileY,
      toMapId: edgeTransition.toMapId,
      toTileX,
      toTileY,
      facing: edgeTransition.facing ?? edge,
    };
  }

  const toTileY = Math.max(insetY, Math.min(targetMap.height - 1 - insetY, tileY));
  const toTileX = edge === "left" ? targetMap.width - 1 - insetX : insetX;
  return {
    tileX,
    tileY,
    toMapId: edgeTransition.toMapId,
    toTileX,
    toTileY,
    facing: edgeTransition.facing ?? edge,
  };
}
