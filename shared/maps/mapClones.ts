import type { GameMap } from "./types";

export function cloneMap(baseMap: GameMap, id: string, name: string = baseMap.name.trim()): GameMap {
  return {
    ...baseMap,
    id,
    name,
    transitions: [],
    edgeTransitions: undefined,
    roofTriggers: baseMap.roofTriggers ? [...baseMap.roofTriggers] : [],
    objects: baseMap.objects ? [...baseMap.objects] : undefined,
    groundOverlays: baseMap.groundOverlays ? [...baseMap.groundOverlays] : [],
    legacyObjs: baseMap.legacyObjs ? [...baseMap.legacyObjs] : [],
  };
}
