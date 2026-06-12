export type { GameMap, GroundOverlay, MapObjectPlacement, MapTransition, TileType } from "./types";
export { getMapObjectDefinition, type MapObjectId } from "./mapObjectDefinitions";
export { MAP_TILE_SIZE, MAP_SCALE, MAP_BASE_TILES } from "./constants";
export {
  BIOME_MAP_TEMPLATES,
  buildBiomeTemplateTiles,
  createMapFromBiomeTemplate,
  getAllBiomeTemplateIds,
  getBiomeTemplate,
} from "./biomeTemplates";
export type { BiomeMapTemplate, BiomeTemplateId, CreateMapFromTemplateConfig } from "./biomeTemplates";
export {
  WORLD_MAP_ART_PATH,
  WORLD_MAP_CELLS,
  getWorldMapBiomeColor,
  getWorldMapCell,
  getWorldMapGridBounds,
  getWorldMapMarkerPosition,
} from "./worldMapLayout";
export type { WorldMapBiome, WorldMapCellConfig } from "./worldMapLayout";
export {
  EDGE_TRANSITION_TRIGGER_DISTANCE,
  START_MAP_ID,
  findTransition,
  getAdjacentMapIds,
  getAllMaps,
  getMap,
  getScopedPreloadMapIds,
} from "../../shared/maps";
