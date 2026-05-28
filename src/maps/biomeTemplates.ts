import { MAP_SCALE, MAP_TILE_SIZE } from "./constants";
import { applyBlockedBorder, cropTiles, scaleTiles } from "./mapTileUtils";
import { TILE } from "./tileDefinitions";
import type { GameMap, TileType } from "./types";
import type { WorldMapBiome } from "./worldMapLayout";

/**
 * Plantillas base para mapas nuevos (72×72 tiles).
 * Crear un mapa: `createMapFromBiomeTemplate("bosque", { id: "bosque_norte", name: "..." })`
 * y luego agregar edgeTransitions / objects según haga falta.
 */
export type BiomeTemplateId = "bosque" | "desierto" | "mar";

export type BiomeMapTemplate = {
  id: BiomeTemplateId;
  displayName: string;
  biome: WorldMapBiome;
  width: number;
  height: number;
  outsideTile: TileType;
  fillTile: TileType;
  borderTile: TileType;
  /**
   * Grilla de diseño 18×18 (se escala ×{@link MAP_SCALE} a 72×72).
   * Si se omite, se rellena con `fillTile` y borde `borderTile`.
   */
  designTiles?: TileType[][];
};

const G = TILE.FOREST_GRASS;
const A = TILE.WATER;
const T = TILE.TREE;

/** Diseño fuente del bosque (24×18 → escala ×4 y recorte a 72×72). */
const BOSQUE_DESIGN_BASE: TileType[][] = [
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

export const BIOME_MAP_TEMPLATES: Record<BiomeTemplateId, BiomeMapTemplate> = {
  bosque: {
    id: "bosque",
    displayName: "Bosque",
    biome: "forest",
    width: MAP_TILE_SIZE,
    height: MAP_TILE_SIZE,
    outsideTile: TILE.FOREST_GRASS,
    fillTile: TILE.FOREST_GRASS,
    borderTile: TILE.FOREST_GRASS_BLOCKED,
    designTiles: BOSQUE_DESIGN_BASE,
  },
  desierto: {
    id: "desierto",
    displayName: "Desierto",
    biome: "sand",
    width: MAP_TILE_SIZE,
    height: MAP_TILE_SIZE,
    outsideTile: TILE.SAND,
    fillTile: TILE.SAND,
    borderTile: TILE.SAND_BLOCKED,
  },
  mar: {
    id: "mar",
    displayName: "Mar",
    biome: "water",
    width: MAP_TILE_SIZE,
    height: MAP_TILE_SIZE,
    outsideTile: TILE.WATER,
    fillTile: TILE.WATER,
    borderTile: TILE.WATER,
  },
};

function cloneTiles(tiles: TileType[][]): TileType[][] {
  return tiles.map((row) => [...row]);
}

function buildFlatTemplateTiles(template: BiomeMapTemplate): TileType[][] {
  const tiles = Array.from({ length: template.height }, () =>
    Array.from({ length: template.width }, () => template.fillTile)
  );
  applyBlockedBorder(tiles, template.borderTile);
  return tiles;
}

/** Genera la grilla 72×72 de una plantilla (copia mutable). */
export function buildBiomeTemplateTiles(templateId: BiomeTemplateId): TileType[][] {
  const template = BIOME_MAP_TEMPLATES[templateId];
  if (template.designTiles) {
    const scaled = cropTiles(
      scaleTiles(template.designTiles, MAP_SCALE),
      template.width,
      template.height
    );
    const tiles = cloneTiles(scaled);
    applyBlockedBorder(tiles, template.borderTile);
    return tiles;
  }
  return buildFlatTemplateTiles(template);
}

export type CreateMapFromTemplateConfig = {
  id: string;
  name: string;
  transitions?: GameMap["transitions"];
  edgeTransitions?: GameMap["edgeTransitions"];
  objects?: GameMap["objects"];
  groundOverlays?: GameMap["groundOverlays"];
};

/**
 * Arma un `GameMap` jugable a partir de una plantilla de bioma.
 * Los bordes y transiciones se definen por mapa al enlazar el mundo.
 */
export function createMapFromBiomeTemplate(
  templateId: BiomeTemplateId,
  config: CreateMapFromTemplateConfig
): GameMap {
  const template = BIOME_MAP_TEMPLATES[templateId];
  return {
    id: config.id,
    name: config.name,
    width: template.width,
    height: template.height,
    tiles: buildBiomeTemplateTiles(templateId),
    outsideTile: template.outsideTile,
    transitions: config.transitions ?? [],
    edgeTransitions: config.edgeTransitions,
    objects: config.objects,
    groundOverlays: config.groundOverlays,
  };
}

export function getBiomeTemplate(templateId: BiomeTemplateId): BiomeMapTemplate {
  return BIOME_MAP_TEMPLATES[templateId];
}

export function getAllBiomeTemplateIds(): BiomeTemplateId[] {
  return Object.keys(BIOME_MAP_TEMPLATES) as BiomeTemplateId[];
}
