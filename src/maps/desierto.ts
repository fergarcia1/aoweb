import type { GameMap } from "./types";
import { TILE } from "./tileDefinitions";

const WIDTH = 96;
const HEIGHT = 72;

const tiles: GameMap["tiles"] = Array.from({ length: HEIGHT }, () =>
  Array.from({ length: WIDTH }, () => TILE.SAND)
);

for (let x = 0; x < WIDTH; x++) {
  tiles[0][x] = TILE.SAND_BLOCKED;
  tiles[HEIGHT - 1][x] = TILE.SAND_BLOCKED;
}
for (let y = 0; y < HEIGHT; y++) {
  tiles[y][0] = TILE.SAND_BLOCKED;
  tiles[y][WIDTH - 1] = TILE.SAND_BLOCKED;
}

/** Mapa nuevo vacío para expansión lateral. */
export const MAP_DESIERTO: GameMap = {
  id: "desierto",
  name: "Desierto vacio",
  width: WIDTH,
  height: HEIGHT,
  tiles,
  outsideTile: TILE.SAND,
  transitions: [],
  edgeTransitions: {
    right: { toMapId: "pueblo", facing: "right" },
  },
};
