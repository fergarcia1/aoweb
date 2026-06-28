import mapa1Collision from "./mapa1.collision.json";
import mapa20Collision from "./mapa20.collision.json";
import mapa34Collision from "./mapa34.collision.json";
import mapa151Collision from "./mapa151.collision.json";

export type MapCollisionRect = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  label?: string;
};

export type MapCollisionOverridesFile = {
  mapId: string;
  description?: string;
  allow: string[];
  deny: string[];
  denyRects?: MapCollisionRect[];
  roofTriggerRects?: MapCollisionRect[];
};

export type MapCollisionOverrideSets = {
  allow: Set<string>;
  deny: Set<string>;
  extraRoofTriggers: Array<{ tileX: number; tileY: number }>;
};

const FILES: Record<string, MapCollisionOverridesFile> = {
  mapa1: mapa1Collision as MapCollisionOverridesFile,
  mapa20: mapa20Collision as MapCollisionOverridesFile,
  mapa34: mapa34Collision as MapCollisionOverridesFile,
  mapa151: mapa151Collision as MapCollisionOverridesFile,
};

function expandRect(rect: MapCollisionRect): Array<{ tileX: number; tileY: number }> {
  const tiles: Array<{ tileX: number; tileY: number }> = [];
  for (let x = rect.x0; x <= rect.x1; x += 1) {
    for (let y = rect.y0; y <= rect.y1; y += 1) {
      tiles.push({ tileX: x, tileY: y });
    }
  }
  return tiles;
}

function buildSets(file: MapCollisionOverridesFile): MapCollisionOverrideSets {
  const deny = new Set(file.deny);
  for (const rect of file.denyRects ?? []) {
    for (const tile of expandRect(rect)) {
      deny.add(`${tile.tileX},${tile.tileY}`);
    }
  }

  const extraRoofTriggers: Array<{ tileX: number; tileY: number }> = [];
  for (const rect of file.roofTriggerRects ?? []) {
    extraRoofTriggers.push(...expandRect(rect));
  }

  return {
    allow: new Set(file.allow),
    deny,
    extraRoofTriggers,
  };
}

const cache = new Map<string, MapCollisionOverrideSets>();

export function getMapCollisionOverridesFile(
  mapId: string
): MapCollisionOverridesFile | undefined {
  return FILES[mapId];
}

export function getMapCollisionOverrideSets(
  mapId: string
): MapCollisionOverrideSets | undefined {
  let sets = cache.get(mapId);
  if (!sets && FILES[mapId]) {
    sets = buildSets(FILES[mapId]);
    cache.set(mapId, sets);
  }
  return sets;
}

export function isMapCollisionAllowTile(mapId: string, tileX: number, tileY: number): boolean {
  return getMapCollisionOverrideSets(mapId)?.allow.has(`${tileX},${tileY}`) ?? false;
}

export function isMapCollisionDenyTile(mapId: string, tileX: number, tileY: number): boolean {
  return getMapCollisionOverrideSets(mapId)?.deny.has(`${tileX},${tileY}`) ?? false;
}
