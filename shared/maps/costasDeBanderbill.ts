import { MAP_MAPA162 } from "./mapa162";
import type { GameMap } from "./types";

const NAME = "Costas de banderbill";

export function createCostasDeBanderbillMap(id: string): GameMap {
  return {
    ...MAP_MAPA162,
    id,
    name: NAME,
    transitions: [],
    edgeTransitions: undefined,
    roofTriggers: MAP_MAPA162.roofTriggers ? [...MAP_MAPA162.roofTriggers] : [],
    objects: MAP_MAPA162.objects ? [...MAP_MAPA162.objects] : undefined,
    groundOverlays: MAP_MAPA162.groundOverlays ? [...MAP_MAPA162.groundOverlays] : [],
    legacyObjs: MAP_MAPA162.legacyObjs ? [...MAP_MAPA162.legacyObjs] : [],
  };
}
