import type { GameMap } from "./types";
import { TILE } from "./tileDefinitions";

const MAP_SCALE = 4;

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

function scaleTiles(tiles: GameMap["tiles"], scale: number): GameMap["tiles"] {
  return tiles.flatMap((row) => {
    const stretchedRow = row.flatMap((tile) => Array(scale).fill(tile));
    return Array.from({ length: scale }, () => [...stretchedRow]);
  });
}

function applyBlockedBorder(
  tiles: GameMap["tiles"],
  tileId: GameMap["tiles"][number][number]
) {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  if (w === 0 || h === 0) return;

  for (let x = 0; x < w; x++) {
    tiles[0][x] = tileId;
    tiles[h - 1][x] = tileId;
  }
  for (let y = 0; y < h; y++) {
    tiles[y][0] = tileId;
    tiles[y][w - 1] = tileId;
  }
}

const SCALED_TILES = scaleTiles(BASE_TILES, MAP_SCALE);
applyBlockedBorder(SCALED_TILES, TILE.FOREST_GRASS_BLOCKED);
const MAP_W = SCALED_TILES[0].length;
const MAP_H = SCALED_TILES.length;

/** Segundo mapa — bosque. Entrada por el norte de vuelta al pueblo. */
export const MAP_BOSQUE: GameMap = {
  id: "bosque",
  name: "Bosque del sur",
  width: MAP_W,
  height: MAP_H,
  tiles: SCALED_TILES,
  outsideTile: TILE.FOREST_GRASS,
  transitions: [],
  edgeTransitions: {
    down: { toMapId: "pueblo", facing: "down" },
  },
};