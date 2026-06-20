import { WORLD_MAP_GRID_CELLS } from "../../shared/worldMapGrid";
import { getMap, hasMap } from "../../shared/maps";

export type WorldMapBiome = "grass" | "forest" | "sand" | "snow" | "dungeon" | "water" | "city";

export type WorldMapCellConfig = {
  mapId: string;
  gridX: number;
  gridY: number;
  label?: string;
  displayLabel?: string;
  description?: string;
  biome: WorldMapBiome;
};

export const WORLD_MAP_ART_PATH = "/assets/ao/world/world_map.png";

// === Biome Sets ===

const WATER_MAP_IDS = new Set([
  "mapa115", "mapa116", "mapa117", "mapa118", "mapa119", "mapa120", "mapa121", "mapa122", "mapa123",
  "mapa159", "mapa160", "mapa161",
  "mapa137", "mapa126", "mapa131", "mapa105", "mapa129", "mapa149", "mapa133", "mapa138", "mapa127",
  "mapa147", "mapa176", "mapa125", "mapa109", "mapa150", "mapa174", "mapa175", "mapa148", "mapa178",
  "mapa169", "mapa177", "mapa99", "mapa130", "mapa132", "mapa135", "mapa90", "mapa91", "mapa88",
  "mapa93", "mapa94", "mapa95", "mapa96", "mapa76", "mapa103", "mapa98", "mapa100", "mapa101",
  "mapa97", "mapa134", "mapa106", "mapa104", "mapa162", "mapa152", "mapa215", "mapa216",
  "mapa102", "mapa136", "mapa173", "mapa164", "mapa165", "mapa172", "mapa166", "mapa171", "mapa167", "mapa170", "mapa168"
]);

const CITY_MAP_IDS = new Set([
  "mapa1", "mapa34", "mapa20", "mapa58", "mapa59", "mapa60", "mapa61", "mapa218", "mapa111", "mapa112", "mapa151", "mapa64", "mapa63", "mapa62", "mapa156"
]);

/** Eastern sand / desert region */
const SAND_MAP_IDS = new Set([
  "mapa15", "mapa16", "mapa17", "mapa20", "mapa21",
  "mapa148", "mapa168", "mapa167", "mapa166", "mapa165",
  "mapa164", "mapa163", "mapa170", "mapa171", "mapa172",
  "mapa173", "mapa174", "mapa175",
]);

/** Far-north mountain / snow cluster */
const SNOW_MAP_IDS = new Set([
  "mapa227", "mapa228",
  "mapa224", "mapa226", "mapa223",
  "mapa221", "mapa225",
  "mapa219", "mapa222", "mapa220",
  "mapa235", "mapa234",
]);

/** Northwest wilderness forest chain */
const FOREST_MAP_IDS = new Set([
  "mapa216", "mapa218",
  "mapa215", "mapa214", "mapa213", "mapa152",
  "mapa62",  "mapa63",  "mapa64",
  "mapa106", "mapa104", "mapa134",
  "mapa96",  "mapa97",  "mapa98",  "mapa100", "mapa101",
  "mapa103", "mapa76",  "mapa95",  "mapa94",  "mapa93",
  "mapa88",  "mapa89",  "mapa90",  "mapa91",  "mapa92",
  "mapa87",  "mapa78",  "mapa79",  "mapa80",
  "mapa110", "mapa135",
]);

/** Northeast dungeon / cave chain */
const DUNGEON_MAP_IDS = new Set([
  "mapa111", "mapa112", "mapa113", "mapa114",
  "mapa153", "mapa154", "mapa155", "mapa197", "mapa198", "mapa201",
  "mapa162", "mapa124",
]);

function getBiome(mapId: string): WorldMapBiome {
  if (WATER_MAP_IDS.has(mapId))   return "water";
  if (SAND_MAP_IDS.has(mapId))    return "sand";
  if (SNOW_MAP_IDS.has(mapId))    return "snow";
  if (FOREST_MAP_IDS.has(mapId))  return "forest";
  if (DUNGEON_MAP_IDS.has(mapId)) return "dungeon";
  return "grass";
}

const WORLD_MAP_DISPLAY_LABELS: Record<string, string> = {
  mapa1: "Ullathorpe",
  mapa34: "Nix",
  mapa20: "Rinkel",
  mapa59: "Banderbill",
  mapa60: "Banderbill",
  mapa61: "Banderbill",
  mapa62: "Lindos",
  mapa63: "Lindos",
  mapa64: "Lindos",
  mapa119: "Arghal",
  mapa151: "Arghal",
  mapa156: "Arghal",
  mapa218: "Tiama",
  mapa111: "Nueva Esperanza",
  mapa112: "Nueva Esperanza",
  // Ocean labels
  mapa126: "Mar del Norte",
  mapa137: "Océano Abierto",
  mapa129: "Canal de los Vientos",
  mapa149: "Canal del Sur",
  mapa176: "Río Infinito",
  mapa96: "Costa del Oeste",
  mapa162: "Paso de la Muerte",
};

const MAP_DESCRIPTIONS: Record<string, string> = {
  mapa1: "La ciudad de los novatos. Tranquila y segura.",
  mapa34: "Ciudad gélida en el norte, hogar de grandes guerreros.",
  mapa59: "Capital del Imperio, protegida por las murallas de Banderbill.",
  mapa40: "Un puerto comercial clave con clima templado.",
  mapa119: "Bastión de las fuerzas oscuras en el sur.",
  // Ocean descriptions
  mapa126: "Aguas frías y peligrosas que rodean el continente norteño.",
  mapa137: "Un vasto e imponente océano donde solo los barcos más fuertes sobreviven.",
  mapa129: "Un canal estrecho conocido por sus fuertes ráfagas de viento.",
  mapa149: "La principal ruta marítima hacia las tierras del sur.",
  mapa176: "Un río legendario que se dice que no tiene fin.",
  mapa96: "Tierras costeras donde el mar golpea con fuerza los acantilados.",
  mapa162: "Un pasaje traicionero lleno de arrecifes y piratas.",
};

function getMapLabel(mapId: string): string {
  try {
    const name = getMap(mapId).name.trim();
    if (name) return name;
  } catch {
    // The atlas can contain future placeholder ids before their maps exist.
  }
  return `Mapa ${mapId.replace("mapa", "")}`;
}

export const WORLD_MAP_CELLS: WorldMapCellConfig[] = WORLD_MAP_GRID_CELLS.filter((cell) => hasMap(cell.mapId)).map((cell) => {
  const isWater = WATER_MAP_IDS.has(cell.mapId);
  const isCity = CITY_MAP_IDS.has(cell.mapId);
  const defaultLabel = isWater ? "Océano" : cell.mapId.replace("mapa", "");
  const defaultDesc = isWater ? "Vastas extensiones de agua salada." : `Mapa ${cell.mapId.replace("mapa", "")}. Territorio inexplorado.`;

  const mapLabel = getMapLabel(cell.mapId);

  let biome = getBiome(cell.mapId);
  if (isCity) biome = "city";

  return {
    ...cell,
    label: mapLabel,
    displayLabel: WORLD_MAP_DISPLAY_LABELS[cell.mapId] ?? defaultLabel,
    description: MAP_DESCRIPTIONS[cell.mapId] ?? (isWater ? defaultDesc : mapLabel),
    biome,
  };
});

const BIOME_COLORS: Record<WorldMapBiome, number> = {
  grass:   0x3d6b3a,
  forest:  0x2a4f2a,
  sand:    0xccac55,
  snow:    0xb8c8d8,
  dungeon: 0x4a4a52,
  water:   0x2a6a9e,
  city:    0xcd853f,
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
 * tileX/tileY son la posición del jugador en el mapa actual (100x100).
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
  sidebarW?: number;
}): { x: number; y: number } | null {
  const cell = getWorldMapCell(options.mapId);
  if (!cell) return null;

  const bounds = getWorldMapGridBounds();
  const topPadding  = options.topPadding  ?? 48;
  const sidePadding = options.sidePadding ?? 24;
  const sidebarW = options.sidebarW ?? 0;

  const innerW = options.panelW - sidePadding * 2 - sidebarW;
  const innerH = options.panelH - topPadding - 20;

  // Square cells: same logic as the renderer.
  const rawCellW = innerW / bounds.width;
  const rawCellH = innerH / bounds.height;
  const cellSize = Math.min(28, rawCellW, rawCellH);

  // Center the grid inside the panel (mirror of the renderer offset).
  const gridW = cellSize * bounds.width;
  const gridH = cellSize * bounds.height;
  const offsetX = Math.floor((innerW - gridW) / 2);
  const offsetY = Math.floor((innerH - gridH) / 2);

  const col = cell.gridX - bounds.minX;
  const row = cell.gridY - bounds.minY;

  const cellX = options.panelX + sidePadding + sidebarW + offsetX + col * cellSize;
  const cellY = options.panelY + topPadding  + offsetY + row * cellSize;

  const tx = clamp01(options.tileX / Math.max(1, options.mapWidth  - 1));
  const ty = clamp01(options.tileY / Math.max(1, options.mapHeight - 1));

  return {
    x: cellX + cellSize * tx,
    y: cellY + cellSize * ty,
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
