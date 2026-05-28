/**
 * Layout del mapa mundial: cada mapa jugable ocupa una celda en una grilla 2D.
 * No hace falta numerar como AO (Map 1, Map 2…): usamos mapId + gridX/gridY.
 *
 * Para crecer: agregás una entrada acá y el mapa .ts con sus edgeTransitions.
 * La imagen artística (estilo AO original) es opcional y se superpone después.
 */

export type WorldMapBiome = "grass" | "forest" | "sand" | "snow" | "dungeon" | "water";

export type WorldMapCellConfig = {
  /** Id del GameMap (pueblo, bosque, …). */
  mapId: string;
  /** Columna en la grilla mundial (0 = columna central de arranque). */
  gridX: number;
  /** Fila en la grilla mundial (0 = fila central; Y crece hacia el sur). */
  gridY: number;
  /** Etiqueta corta en el mapa mundial. */
  label?: string;
  biome: WorldMapBiome;
};

/** Imagen decorativa opcional (pincel AO). Si no existe, se dibuja la grilla. */
export const WORLD_MAP_ART_PATH = "/assets/ao/world/world_map.png";

/**
 * Mundo inicial: cruz de 4 mapas alrededor del pueblo.
 * Coincide con edgeTransitions actuales (N/S/E/O).
 */
export const WORLD_MAP_CELLS: WorldMapCellConfig[] = [
  { mapId: "bosque", gridX: 0, gridY: -1, label: "Bosque", biome: "forest" },
  { mapId: "pueblo", gridX: 0, gridY: 0, label: "Caja de arena", biome: "grass" },
  { mapId: "montana", gridX: 0, gridY: 1, label: "Montaña", biome: "grass" },
  { mapId: "desierto", gridX: -1, gridY: 0, label: "Desierto", biome: "sand" },
];

const BIOME_COLORS: Record<WorldMapBiome, number> = {
  grass: 0x3d6b3a,
  forest: 0x2a4f2a,
  sand: 0x8a7340,
  snow: 0xb8c8d8,
  dungeon: 0x4a4a52,
  water: 0x1a3a5c,
};

export function getWorldMapBiomeColor(biome: WorldMapBiome): number {
  return BIOME_COLORS[biome];
}

export function getWorldMapCell(mapId: string): WorldMapCellConfig | undefined {
  return WORLD_MAP_CELLS.find((cell) => cell.mapId === mapId);
}

export function getWorldMapGridBounds(cells: WorldMapCellConfig[] = WORLD_MAP_CELLS): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
} {
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  for (const cell of cells) {
    minX = Math.min(minX, cell.gridX);
    maxX = Math.max(maxX, cell.gridX);
    minY = Math.min(minY, cell.gridY);
    maxY = Math.max(maxY, cell.gridY);
  }
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Posición del marcador en píxeles dentro del panel del mapa mundial.
 * tileX/tileY son la posición del jugador en el mapa actual (72×72).
 */
export function getWorldMapMarkerPosition(options: {
  mapId: string;
  tileX: number;
  tileY: number;
  mapWidth: number;
  mapHeight: number;
  panelX: number;
  panelY: number;
  panelW: number;
  panelH: number;
  topPadding?: number;
  sidePadding?: number;
}): { x: number; y: number } | null {
  const cell = getWorldMapCell(options.mapId);
  if (!cell) return null;

  const bounds = getWorldMapGridBounds();
  const topPadding = options.topPadding ?? 48;
  const sidePadding = options.sidePadding ?? 24;
  const innerW = options.panelW - sidePadding * 2;
  const innerH = options.panelH - topPadding - 20;
  const cellW = innerW / bounds.width;
  const cellH = innerH / bounds.height;

  const col = cell.gridX - bounds.minX;
  const row = cell.gridY - bounds.minY;

  const cellX = options.panelX + sidePadding + col * cellW;
  const cellY = options.panelY + topPadding + row * cellH;

  const tx = clamp01(options.tileX / Math.max(1, options.mapWidth - 1));
  const ty = clamp01(options.tileY / Math.max(1, options.mapHeight - 1));

  return {
    x: cellX + cellW * tx,
    y: cellY + cellH * ty,
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
