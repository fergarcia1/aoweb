import type { GameMap } from "./types";
import { TILE } from "./tileDefinitions";
import { MAP_TILE_SIZE } from "./constants";
import { applyBlockedBorder } from "./mapTileUtils";

const tiles: GameMap["tiles"] = Array.from({ length: MAP_TILE_SIZE }, () =>
  Array.from({ length: MAP_TILE_SIZE }, () => TILE.SAND)
);

applyBlockedBorder(tiles, TILE.SAND_BLOCKED);

/** Mapa nuevo vacío para expansión lateral. */
export const MAP_DESIERTO: GameMap = {
  id: "desierto",
  name: "Desierto vacio",
  width: MAP_TILE_SIZE,
  height: MAP_TILE_SIZE,
  tiles,
  outsideTile: TILE.SAND,
  transitions: [],
  edgeTransitions: {
    right: { toMapId: "pueblo", facing: "right" },
  },
};
