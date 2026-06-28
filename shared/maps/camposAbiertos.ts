import { MAP_MAPA18 } from "./mapa18";
import { MAP_MAPA25 } from "./mapa25";
import { MAP_MAPA26 } from "./mapa26";
import type { GameMap } from "./types";

const NAME = "Campos abiertos";

function createCamposAbiertosClone(baseMap: GameMap, id: string): GameMap {
  return {
    ...baseMap,
    id,
    name: NAME,
    transitions: [],
    edgeTransitions: undefined,
    roofTriggers: baseMap.roofTriggers ? [...baseMap.roofTriggers] : [],
    objects: baseMap.objects ? [...baseMap.objects] : undefined,
    groundOverlays: baseMap.groundOverlays ? [...baseMap.groundOverlays] : [],
    legacyObjs: baseMap.legacyObjs ? [...baseMap.legacyObjs] : [],
  };
}

export function createCamposAbiertosMap(id: string): GameMap {
  return createCamposAbiertosClone(MAP_MAPA18, id);
}

export function createCamposAbiertosFromMapa25(id: string): GameMap {
  return createCamposAbiertosClone(MAP_MAPA25, id);
}

export function createCamposAbiertosFromMapa26(id: string): GameMap {
  return createCamposAbiertosClone(MAP_MAPA26, id);
}
