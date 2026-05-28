import type { GameMap } from "./types";

export function scaleTiles(tiles: GameMap["tiles"], scale: number): GameMap["tiles"] {
  return tiles.flatMap((row) => {
    const stretchedRow = row.flatMap((tile) => Array(scale).fill(tile));
    return Array.from({ length: scale }, () => [...stretchedRow]);
  });
}

export function cropTiles(
  tiles: GameMap["tiles"],
  width: number,
  height: number
): GameMap["tiles"] {
  return tiles.slice(0, height).map((row) => row.slice(0, width));
}

export function applyBlockedBorder(
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

export function replaceTile(
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
