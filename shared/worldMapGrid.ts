export type WorldMapGridCell = {
  mapId: string;
  gridX: number;
  gridY: number;
};

type AtlasCell = number | null;

// Atlas layout copied from the current world spreadsheet. Cells marked 0.x in
// the sheet are intentionally omitted until those maps are created/cloned.
const ATLAS_ROWS: AtlasCell[][] = [
  [null, null],
  [227, null],
  [221, 225, null],
  [219, 222, 220],
  [235, 218, 234, null, null, null, null, null, null, 201],
  [null, 216, null, null, null, null, null, null, null, 198],
  [null, 215, null, null, null, null, null, 111, 112, 197],
  [null, 152, null, null, null, null, null, 114, 113, 153],
  [null, 62, 64, 162, 267, 86, 137, 122, 123, 154],
  [null, 63, 104, 268, 262, 260, 261, 148, 126, 131, 105, 139],
  [null, 106, 136, 269, 258, 61, 259, 271, 163, 149, 129, 133, 138],
  [null, 134, 97, 270, 159, 60, 160, 161, 272, 147, 120, 127],
  [124, null, 96, 75, 66, 59, 264, 263, 265, 176, 125, 109],
  [null, 100, 101, 73, 65, 58, 158, 157, 156, 151, 150, 121],
  [null, 98, 102, 69, 278, 55, 276, 285, 282, 266, 174, 175],
  [null, null, 103, 273, 71, 54, 277, 280, 164, 173, 47, 180],
  [null, null, 96, 76, 67, 53, 275, 281, 165, 172, 181, 182],
  [null, null, 95, 274, 68, 7, 26, 279, 166, 171],
  [null, null, 94, 72, 74, 6, 18, 24, 167, 170],
  [null, null, 93, 284, 70, 5, 13, 283, 168, 21],
  [null, null, 10, 9, 8, 1, 11, 12, 15, 16, 17],
  [null, 91, 88, 38, 39, 2, 14, 27, 257, 20, 178, 169, 252],
  [null, 90, 89, 46, 36, 3, 25, 23, 130, 99, 177],
  [null, null, 92, 79, 35, 4, 22, 19, 132, null, null],
  [null, null, 87, 78, 34, 32, 29, 28],
  [110, null, 135, 80, 88, 31, 30],
];

export const WORLD_MAP_GRID_CELLS: WorldMapGridCell[] = ATLAS_ROWS.flatMap((row, gridY) =>
  row.flatMap((mapNumber, gridX): WorldMapGridCell[] =>
    mapNumber === null ? [] : [{ mapId: `mapa${mapNumber}`, gridX, gridY }]
  )
);
