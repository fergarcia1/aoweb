import { MAP_MAPA18 } from "./mapa18";
import type { GameMap } from "./types";

const NAME = "Bosques de banderbill";

export function createBosquesDeBanderbillMap(id: string): GameMap {
  return {
    ...MAP_MAPA18,
    id,
    name: NAME,
    transitions: [],
    edgeTransitions: undefined,
    roofTriggers: MAP_MAPA18.roofTriggers ? [...MAP_MAPA18.roofTriggers] : [],
    objects: MAP_MAPA18.objects ? [...MAP_MAPA18.objects] : undefined,
    groundOverlays: MAP_MAPA18.groundOverlays ? [...MAP_MAPA18.groundOverlays] : [],
    legacyObjs: MAP_MAPA18.legacyObjs ? [...MAP_MAPA18.legacyObjs] : [],
  };
}
