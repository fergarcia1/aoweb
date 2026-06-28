import { WORLD_MAP_GRID_CELLS } from "../../shared/worldMapGrid";
import { getMap, hasMap } from "../../shared/maps";
import {
  CHAOS_CITY_MAP_IDS,
  CITY_MAP_IDS,
  IMPERIAL_CITY_MAP_IDS,
  NEUTRAL_CITY_MAP_IDS,
} from "../../shared/worldMapZones";

export type WorldMapBiome =
  | "grass"
  | "forest"
  | "sand"
  | "snow"
  | "dungeon"
  | "water"
  | "city"
  | "orange"
  | "land"
  | "neutralCity"
  | "imperialCity"
  | "chaosCity";

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
  "mapa137", "mapa126", "mapa131", "mapa105", "mapa129", "mapa149", "mapa133", "mapa138", "mapa127",
  "mapa147", "mapa176", "mapa125", "mapa109", "mapa266", "mapa267", "mapa268", "mapa269", "mapa270", "mapa271", "mapa272", "mapa150", "mapa174", "mapa175", "mapa148", "mapa178",
  "mapa169", "mapa177", "mapa99", "mapa130", "mapa132", "mapa135", "mapa90", "mapa91", "mapa88",
  "mapa93", "mapa94", "mapa95", "mapa96", "mapa76", "mapa103", "mapa98", "mapa100", "mapa101",
  "mapa97", "mapa134", "mapa106", "mapa104", "mapa162", "mapa258", "mapa259", "mapa260", "mapa261", "mapa262", "mapa152", "mapa215", "mapa216",
  "mapa102", "mapa136", "mapa173", "mapa164", "mapa165", "mapa172", "mapa166", "mapa171", "mapa167", "mapa170", "mapa168",
  "mapa257"
]);

const CITY_WORLD_MAP_IDS = new Set<string>(CITY_MAP_IDS.filter((mapId) => mapId !== "mapa156"));

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
  "mapa263", "mapa264",
]);

/** Northeast dungeon / cave chain */
const DUNGEON_MAP_IDS = new Set([
  "mapa111", "mapa112", "mapa113", "mapa114",
  "mapa153", "mapa154", "mapa155", "mapa197", "mapa198", "mapa201",
  "mapa162", "mapa124",
]);

const ORANGE_WORLD_MAP_IDS = new Set(["mapa227", "mapa201", "mapa252", "mapa76", "mapa139"]);

const LAND_WORLD_MAP_IDS = new Set(["mapa113", "mapa114", "mapa156", "mapa159", "mapa160", "mapa161", "mapa265", "mapa273", "mapa274", "mapa275", "mapa276", "mapa277", "mapa278", "mapa279", "mapa280", "mapa281", "mapa282", "mapa283", "mapa284", "mapa285"]);

const MARINE_WORLD_MAP_IDS = new Set([
  "mapa181", "mapa47", "mapa80", "mapa78", "mapa87", "mapa79", "mapa92", "mapa89", "mapa86", "mapa235", "mapa234",
  "mapa154", "mapa153", "mapa197", "mapa198", "mapa163", "mapa180",
]);

const NEUTRAL_CITY_WORLD_MAP_IDS = new Set<string>(NEUTRAL_CITY_MAP_IDS);

const IMPERIAL_CITY_WORLD_MAP_IDS = new Set<string>(IMPERIAL_CITY_MAP_IDS);

const CHAOS_CITY_WORLD_MAP_IDS = new Set<string>(CHAOS_CITY_MAP_IDS);

function getBiome(mapId: string): WorldMapBiome {
  if (CHAOS_CITY_WORLD_MAP_IDS.has(mapId)) return "chaosCity";
  if (IMPERIAL_CITY_WORLD_MAP_IDS.has(mapId)) return "imperialCity";
  if (NEUTRAL_CITY_WORLD_MAP_IDS.has(mapId)) return "neutralCity";
  if (MARINE_WORLD_MAP_IDS.has(mapId)) return "water";
  if (LAND_WORLD_MAP_IDS.has(mapId)) return "land";
  if (ORANGE_WORLD_MAP_IDS.has(mapId)) return "orange";
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
  mapa157: "Camino Real",
  mapa156: "Arghal",
  mapa218: "Tiama",
  mapa111: "Nueva Esperanza",
  mapa112: "Nueva Esperanza",
  // Ocean labels
  mapa88: "Oceano Abierto",
  mapa89: "Oceano Abierto",
  mapa90: "Oceano Abierto",
  mapa91: "Oceano Abierto",
  mapa92: "Oceano Abierto",
  mapa126: "Mar del Norte",
  mapa137: "Oceano Abierto",
  mapa257: "Océano Abierto",
  mapa129: "Canal de los Vientos",
  mapa147: "Oceano Abierto",
  mapa148: "Oceano Abierto",
  mapa149: "Oceano Abierto",
  mapa164: "Oceano Abierto",
  mapa165: "Oceano Abierto",
  mapa166: "Oceano Abierto",
  mapa167: "Oceano Abierto",
  mapa168: "Oceano Abierto",
  mapa169: "Oceano Abierto",
  mapa170: "Oceano Abierto",
  mapa171: "Oceano Abierto",
  mapa172: "Oceano Abierto",
  mapa173: "Oceano Abierto",
  mapa174: "Oceano Abierto",
  mapa175: "Oceano Abierto",
  mapa176: "Oceano Abierto",
  mapa177: "Oceano Abierto",
  mapa178: "Oceano Abierto",
  mapa266: "Oceano Abierto",
  mapa267: "Oceano Abierto",
  mapa268: "Oceano Abierto",
  mapa269: "Oceano Abierto",
  mapa270: "Oceano Abierto",
  mapa271: "Oceano Abierto",
  mapa272: "Oceano Abierto",
  mapa96: "Costa del Oeste",
  mapa162: "Paso de la Muerte",
  mapa258: "Costas de banderbill",
  mapa259: "Costas de banderbill",
  mapa260: "Costas de banderbill",
  mapa261: "Costas de banderbill",
  mapa262: "Costas de banderbill",
  mapa263: "Bosques de banderbill",
  mapa264: "Bosques de banderbill",
  mapa265: "Bosque encantado",
  mapa273: "Campos abiertos",
  mapa274: "Campos abiertos",
  mapa275: "Campos abiertos",
  mapa276: "Campos abiertos",
  mapa277: "Campos abiertos",
  mapa278: "Campos abiertos",
  mapa279: "Campos Abiertos",
  mapa280: "Campos Abiertos",
  mapa281: "Campos Abiertos",
  mapa282: "Bosques de Nix",
  mapa283: "Campos Abiertos",
  mapa284: "Sendero del Norte",
  mapa285: "Campos Abiertos",
};

const MAP_DESCRIPTIONS: Record<string, string> = {
  mapa1: "La ciudad de los novatos. Tranquila y segura.",
  mapa34: "Ciudad gélida en el norte, hogar de grandes guerreros.",
  mapa59: "Capital del Imperio, protegida por las murallas de Banderbill.",
  mapa40: "Un puerto comercial clave con clima templado.",
  mapa119: "Bastión de las fuerzas oscuras en el sur.",
  // Ocean descriptions
  mapa88: "Oceano abierto.",
  mapa89: "Oceano abierto.",
  mapa90: "Oceano abierto.",
  mapa91: "Oceano abierto.",
  mapa92: "Oceano abierto.",
  mapa126: "Aguas frías y peligrosas que rodean el continente norteño.",
  mapa137: "Oceano abierto.",
  mapa129: "Un canal estrecho conocido por sus fuertes ráfagas de viento.",
  mapa147: "Oceano abierto.",
  mapa148: "Oceano abierto.",
  mapa149: "Oceano abierto.",
  mapa164: "Oceano abierto.",
  mapa165: "Oceano abierto.",
  mapa166: "Oceano abierto.",
  mapa167: "Oceano abierto.",
  mapa168: "Oceano abierto.",
  mapa169: "Oceano abierto.",
  mapa170: "Oceano abierto.",
  mapa171: "Oceano abierto.",
  mapa172: "Oceano abierto.",
  mapa173: "Oceano abierto.",
  mapa174: "Oceano abierto.",
  mapa175: "Oceano abierto.",
  mapa176: "Oceano abierto.",
  mapa177: "Oceano abierto.",
  mapa178: "Oceano abierto.",
  mapa266: "Oceano abierto.",
  mapa267: "Oceano abierto.",
  mapa268: "Oceano abierto.",
  mapa269: "Oceano abierto.",
  mapa270: "Oceano abierto.",
  mapa271: "Oceano abierto.",
  mapa272: "Oceano abierto.",
  mapa96: "Tierras costeras donde el mar golpea con fuerza los acantilados.",
  mapa257: "Aguas abiertas al oeste de Rinkel.",
  mapa162: "Un pasaje traicionero lleno de arrecifes y piratas.",
  mapa258: "Costas cercanas a Banderbill.",
  mapa259: "Costas cercanas a Banderbill.",
  mapa260: "Costas cercanas a Banderbill.",
  mapa261: "Costas cercanas a Banderbill.",
  mapa262: "Costas cercanas a Banderbill.",
  mapa263: "Bosques cercanos a Banderbill.",
  mapa264: "Bosques cercanos a Banderbill.",
  mapa265: "Un bosque encantado al norte de Arghal.",
  mapa273: "Campos abiertos.",
  mapa274: "Campos abiertos.",
  mapa275: "Campos abiertos.",
  mapa276: "Campos abiertos.",
  mapa277: "Campos abiertos.",
  mapa278: "Campos abiertos.",
  mapa279: "Campos abiertos.",
  mapa280: "Campos abiertos.",
  mapa281: "Campos abiertos.",
  mapa282: "Bosques de Nix.",
  mapa283: "Campos abiertos.",
  mapa284: "Sendero del Norte.",
  mapa285: "Campos abiertos.",
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
  const isCity = CITY_WORLD_MAP_IDS.has(cell.mapId);
  const defaultLabel = isWater ? "Océano" : cell.mapId.replace("mapa", "");
  const defaultDesc = isWater ? "Vastas extensiones de agua salada." : `Mapa ${cell.mapId.replace("mapa", "")}. Territorio inexplorado.`;

  const mapLabel = getMapLabel(cell.mapId);

  let biome = getBiome(cell.mapId);
  if (isCity && biome === "grass") biome = "city";

  return {
    ...cell,
    label: mapLabel,
    displayLabel: WORLD_MAP_DISPLAY_LABELS[cell.mapId] ?? defaultLabel,
    description: MAP_DESCRIPTIONS[cell.mapId] ?? (isWater ? defaultDesc : mapLabel),
    biome,
  };
});

const BIOME_COLORS: Record<WorldMapBiome, number> = {
  grass: 0x3f7a3a,
  forest: 0x2f6632,
  sand: 0xd0a94b,
  snow: 0xc2ced8,
  dungeon: 0x56515b,
  water: 0x2f9fbd,
  city: 0xc17a36,
  orange: 0xe9822b,
  land: 0x3f7a3a,
  neutralCity: 0x96999f,
  imperialCity: 0x2f6fe4,
  chaosCity: 0xc83b35,
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
