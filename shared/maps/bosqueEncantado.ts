import { MAP_MAPA160 } from "./mapa160";
import type { GameMap } from "./types";

const NAME = "Bosque encantado";

export function createBosqueEncantadoMap(id: string): GameMap {
  return {
    ...MAP_MAPA160,
    id,
    name: NAME,
    transitions: [],
    edgeTransitions: undefined,
    roofTriggers: MAP_MAPA160.roofTriggers ? [...MAP_MAPA160.roofTriggers] : [],
    objects: MAP_MAPA160.objects ? [...MAP_MAPA160.objects] : undefined,
    groundOverlays: MAP_MAPA160.groundOverlays ? [...MAP_MAPA160.groundOverlays] : [],
    legacyObjs: MAP_MAPA160.legacyObjs ? [...MAP_MAPA160.legacyObjs] : [],
  };
}
