import type { GameMap } from "./types";
import { TILE } from "./tileDefinitions";

const MAP_SCALE = 4;
const BASE_TILES: GameMap["tiles"] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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

function replaceTile(
  tiles: GameMap["tiles"],
  from: GameMap["tiles"][number][number],
  to: GameMap["tiles"][number][number]
) {
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[y].length; x++) {
      if (tiles[y][x] === from) {
        tiles[y][x] = to;
      }
    }
  }
}

const SCALED_TILES = scaleTiles(BASE_TILES, MAP_SCALE);
replaceTile(SCALED_TILES, TILE.WATER, TILE.GRASS);
SCALED_TILES[14][18] = TILE.TREE;
SCALED_TILES[20][31] = TILE.TREE;
applyBlockedBorder(SCALED_TILES, TILE.GRASS_BLOCKED);
const W = SCALED_TILES[0].length;
const H = SCALED_TILES.length;

/** Mapa inicial — pueblo base sin agua. */
export const MAP_PUEBLO: GameMap = {
  id: "pueblo",
  name: "Pueblo (inicio)",
  width: W,
  height: H,
  tiles: SCALED_TILES,
  outsideTile: TILE.GRASS,
  transitions: [],
  edgeTransitions: {
    up: { toMapId: "bosque", facing: "up" },
    down: { toMapId: "montana", facing: "down" },
    left: { toMapId: "desierto", facing: "left" },
    right: { toMapId: "bosque", facing: "right" },
  },
};
