import type { GameMap } from "./types";
import { TILE } from "./tileDefinitions";

const WIDTH = 96;
const HEIGHT = 72;

const tiles: GameMap["tiles"] = Array.from({ length: HEIGHT }, () =>
  Array.from({ length: WIDTH }, () => TILE.FOREST_GRASS)
);

for (let x = 0; x < WIDTH; x++) {
  tiles[0][x] = TILE.FOREST_GRASS_BLOCKED;
  tiles[HEIGHT - 1][x] = TILE.FOREST_GRASS_BLOCKED;
}
for (let y = 0; y < HEIGHT; y++) {
  tiles[y][0] = TILE.FOREST_GRASS_BLOCKED;
  tiles[y][WIDTH - 1] = TILE.FOREST_GRASS_BLOCKED;
}

/** Mapa nuevo vacío para expansión vertical. */
export const MAP_MONTANA: GameMap = {
  id: "montana",
  name: "Montana vacia",
  width: WIDTH,
  height: HEIGHT,
  tiles,
  outsideTile: TILE.FOREST_GRASS,
  transitions: [],
  edgeTransitions: {
    up: { toMapId: "pueblo", facing: "up" },
  },
};
