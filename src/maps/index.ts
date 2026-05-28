import { MAP_BOSQUE } from "./bosque";
import { MAP_DESIERTO } from "./desierto";
import { MAP_MONTANA } from "./montana";
import { MAP_PUEBLO } from "./pueblo";
import type { GameMap, MapTransition } from "./types";

export type { GameMap, GroundOverlay, MapObjectPlacement, MapTransition, TileType } from "./types";
export { getMapObjectDefinition, type MapObjectId } from "./mapObjectDefinitions";
export { MAP_TILE_SIZE, MAP_SCALE, MAP_BASE_TILES } from "./constants";
export {
  BIOME_MAP_TEMPLATES,
  buildBiomeTemplateTiles,
  createMapFromBiomeTemplate,
  getAllBiomeTemplateIds,
  getBiomeTemplate,
} from "./biomeTemplates";
export type { BiomeMapTemplate, BiomeTemplateId, CreateMapFromTemplateConfig } from "./biomeTemplates";
export {
  WORLD_MAP_ART_PATH,
  WORLD_MAP_CELLS,
  getWorldMapBiomeColor,
  getWorldMapCell,
  getWorldMapGridBounds,
  getWorldMapMarkerPosition,
} from "./worldMapLayout";
export type { WorldMapBiome, WorldMapCellConfig } from "./worldMapLayout";
export const EDGE_TRANSITION_TRIGGER_DISTANCE = 10;
const EDGE_TRANSITION_TARGET_INSET = 10;

const MAPS: Record<string, GameMap> = {
  [MAP_PUEBLO.id]: MAP_PUEBLO,
  [MAP_BOSQUE.id]: MAP_BOSQUE,
  [MAP_DESIERTO.id]: MAP_DESIERTO,
  [MAP_MONTANA.id]: MAP_MONTANA,
};

export const START_MAP_ID = MAP_PUEBLO.id;

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
