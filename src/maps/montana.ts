import type { GameMap } from "./types";
import { TILE } from "./tileDefinitions";
import { MAP_TILE_SIZE } from "./constants";
import { applyBlockedBorder } from "./mapTileUtils";

const tiles: GameMap["tiles"] = Array.from({ length: MAP_TILE_SIZE }, () =>
  Array.from({ length: MAP_TILE_SIZE }, () => TILE.FOREST_GRASS)
);

applyBlockedBorder(tiles, TILE.FOREST_GRASS_BLOCKED);

/** Mapa nuevo vacío para expansión vertical. */
export const MAP_MONTANA: GameMap = {
  id: "montana",
  name: "Montana vacia",
  width: MAP_TILE_SIZE,
  height: MAP_TILE_SIZE,
  tiles,
  outsideTile: TILE.FOREST_GRASS,
  transitions: [],
  edgeTransitions: {
    up: { toMapId: "pueblo", facing: "up" },
  },
};
