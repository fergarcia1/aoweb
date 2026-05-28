import { getPriestNpcForMap } from "../npcs/npcDefinitions";
import { getMapSpawnTile } from "../../shared/mapWalkability";
import { START_MAP_ID } from "../maps/index";

export const DEFAULT_HOME_MAP_ID = START_MAP_ID;

/** Tile del sacerdote de la ciudad marcada como /hogar. */
export function getPriestSpawnForHome(homeMapId: string): {
  mapId: string;
  tileX: number;
  tileY: number;
} {
  const priest = getPriestNpcForMap(homeMapId);
  if (priest) {
    return {
      mapId: priest.mapId,
      tileX: priest.tileX,
      tileY: priest.tileY,
    };
  }

  const spawn = getMapSpawnTile(homeMapId);
  return {
    mapId: homeMapId,
    tileX: spawn.tileX + 2,
    tileY: spawn.tileY,
  };
}

/** Fantasma se desplaza un 20 % más rápido que un jugador vivo. */
export const GHOST_MOVE_SPEED_RATIO = 1.2;

/** Distancia máxima (Chebyshev) al sacerdote para revivir con click derecho. */
export const PRIEST_REVIVE_MAX_TILE_DISTANCE = 5;

/** Visual provisional hasta cargar el sprite de fantasma. */
export const GHOST_PLAYER_ALPHA = 0.5;
export const GHOST_PLAYER_TINT = 0x8fa3b8;

export const DEATH_OVERLAY_COLOR = 0x0a0c10;
export const DEATH_OVERLAY_ALPHA = 0.62;
