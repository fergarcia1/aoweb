import type { GameMap } from "./types";
import { TILE } from "./tileDefinitions";
import { MAP_SCALE, MAP_TILE_SIZE } from "./constants";
import { applyBlockedBorder, cropTiles, scaleTiles } from "./mapTileUtils";

const G = TILE.FOREST_GRASS;
const A = TILE.WATER;
const T = TILE.TREE;
const BASE_TILES: GameMap["tiles"] = [
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, A, A, G, G, G, G, G, G, A, A, G, G, G, G, G, G, G, G],
  [G, G, G, G, A, A, A, A, A, G, G, G, G, A, A, A, A, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
];

const SCALED_TILES = cropTiles(
  scaleTiles(BASE_TILES, MAP_SCALE),
  MAP_TILE_SIZE,
  MAP_TILE_SIZE
);
applyBlockedBorder(SCALED_TILES, TILE.FOREST_GRASS_BLOCKED);

/** Segundo mapa — bosque. Entrada por el norte de vuelta al pueblo. */
export const MAP_BOSQUE: GameMap = {
  id: "bosque",
  name: "Bosque del sur",
  width: MAP_TILE_SIZE,
  height: MAP_TILE_SIZE,
  tiles: SCALED_TILES,
  outsideTile: TILE.FOREST_GRASS,
  transitions: [],
  edgeTransitions: {
    down: { toMapId: "pueblo", facing: "down" },
  },
  objects: [
    {
      objectId: "edificio_kamal_prefab",
      tileX: 36,
      tileY: 28,
    },
  ],
};
