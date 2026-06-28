import { TILE } from "./tileDefinitions";
import type { GameMap, TileType } from "./types";

const WIDTH = 100;
const HEIGHT = 100;

const tiles: TileType[][] = Array.from({ length: HEIGHT }, () =>
  Array.from({ length: WIDTH }, () => TILE.WATER)
);

export const MAP_MAPA257: GameMap = {
  id: "mapa257",
  name: "Oceano Abierto",
  width: WIDTH,
  height: HEIGHT,
  tiles,
  transitions: [],
  edgeTransitions: {
    right: { toMapId: "mapa20" },
  },
  outsideTile: TILE.WATER,
  backgroundColor: "#1b4f7a",
  roofTriggers: [],
  legacyObjs: [],
  groundOverlays: [],
};
