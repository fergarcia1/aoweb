import { getPriestSpawnForHome } from "./deathConfig";
import {
  findWalkableTileBeside,
  getNearestPriestSpawn as getNearestSharedPriestSpawn,
  type PriestSpawn,
} from "../../shared/priestSpawn";

export type { PriestSpawn };
export { findWalkableTileBeside };

/** Sacerdote mas cercano al tile dado (prioriza el mapa actual). */
export function getNearestPriestSpawn(
  fromMapId: string,
  fromTileX: number,
  fromTileY: number,
  homeMapId?: string
): PriestSpawn {
  return getNearestSharedPriestSpawn(
    fromMapId,
    fromTileX,
    fromTileY,
    getPriestSpawnForHome(homeMapId ?? fromMapId)
  );
}
