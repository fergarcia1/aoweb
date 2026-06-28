import { MAP_MAPA109 } from "./mapa109";
import type { GameMap } from "./types";

const NAME = "Oceano Abierto";

export function createOceanoAbiertoMap(id: string): GameMap {
  return {
    ...MAP_MAPA109,
    id,
    name: NAME,
    transitions: [],
    edgeTransitions: undefined,
    roofTriggers: MAP_MAPA109.roofTriggers ? [...MAP_MAPA109.roofTriggers] : [],
    objects: MAP_MAPA109.objects ? [...MAP_MAPA109.objects] : undefined,
    groundOverlays: MAP_MAPA109.groundOverlays ? [...MAP_MAPA109.groundOverlays] : [],
    legacyObjs: MAP_MAPA109.legacyObjs ? [...MAP_MAPA109.legacyObjs] : [],
  };
}
