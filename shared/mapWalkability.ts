import { getMap } from "./maps";

import type { GameMap } from "./mapTypes";

import { isTileWalkable, TILE } from "./tileTypes";

import {

  getMapCollisionOverrideSets,

  isMapCollisionAllowTile,

  isMapCollisionDenyTile,

} from "../game-data/maps/mapCollision";

import { resolveNpcFaceAppearance } from "../game-data/imperium/npcCatalogFaceSeed";

import type { ImperiumNpcCatalogEntry } from "../game-data/imperium/npcCatalogTypes";

import { resolveMapTile, getMapTileOverride, type MapTileOverrides } from "./mapTileOverrides";
import { isLegacyShoreWaterTile, isWaterTile } from "./navigation";



export { getMapCollisionOverridesFile } from "../game-data/maps/mapCollision";

export type { MapTileOverrides } from "./mapTileOverrides";

export { doorWalkabilityTile, setDoorTileOverride } from "./mapTileOverrides";



const roofTriggerCache = new WeakMap<GameMap, Set<string>>();



function getRoofTriggerSet(map: GameMap): Set<string> {

  let cached = roofTriggerCache.get(map);

  if (!cached) {

    const overrides = getMapCollisionOverrideSets(map.id);

    const merged = [

      ...(map.roofTriggers ?? []),

      ...(overrides?.extraRoofTriggers ?? []),

    ];

    cached = new Set(merged.map((t) => `${t.tileX},${t.tileY}`));

    roofTriggerCache.set(map, cached);

  }

  return cached;

}



/** Capa L3 del CSM = gráfico de pared / estructura (siempre sólido). */

export function isLegacyWallLayerTile(

  map: GameMap,

  tileX: number,

  tileY: number

): boolean {

  const legacy = map.legacyCsmData;

  if (!legacy) return false;

  return (legacy.L3[tileY]?.[tileX] ?? 0) !== 0;

}



/**

 * Tile caminable en el CSM pero hueco del contorno: GRASS/DIRT sin L3 rodeado de paredes L3.

 * No aplica a interiores (roofTrigger) ni a un solo vecino L3 (vereda al lado de una pared).

 */

export function isLegacyPhantomWallGap(

  map: GameMap,

  tileX: number,

  tileY: number,

  tileOverrides?: MapTileOverrides

): boolean {

  const legacy = map.legacyCsmData;

  if (!legacy || isLegacyWallLayerTile(map, tileX, tileY)) return false;

  if (getRoofTriggerSet(map).has(`${tileX},${tileY}`)) return false;



  const tile = resolveMapTile(map.tiles, tileX, tileY, tileOverrides);

  if (tile === undefined || !isTileWalkable(tile)) return false;



  let adjacentWalls = 0;

  for (const [dx, dy] of CARDINAL_OFFSETS) {

    if ((legacy.L3[tileY + dy]?.[tileX + dx] ?? 0) > 0) {

      adjacentWalls += 1;

    }

  }

  return adjacentWalls >= 2;

}



/** Tile bajo techo (roofTrigger del CSM + extras en mapa1.collision.json). */

export function isLegacyInteriorDoorwayTile(

  map: GameMap,

  tileX: number,

  tileY: number

): boolean {

  return getRoofTriggerSet(map).has(`${tileX},${tileY}`);

}



export function isPlayerUnderLegacyRoof(

  map: GameMap,

  tileX: number,

  tileY: number

): boolean {

  return getRoofTriggerSet(map).has(`${tileX},${tileY}`);

}



export const MINIMAP_LEGACY_ROOF_COLOR = 0x6b4a32;



const CARDINAL_OFFSETS = [[0, -1], [0, 1], [-1, 0], [1, 0]] as const;



const BLOCKED_TILE_IDS = new Set<number>([

  TILE.GRASS_BLOCKED,

  TILE.FOREST_GRASS_BLOCKED,

  TILE.SAND_BLOCKED,

  TILE.WALL,

]);

function isOpenDoorTileOverride(
  tileOverrides: MapTileOverrides | undefined,
  tileX: number,
  tileY: number
): boolean {
  const tile = getMapTileOverride(tileOverrides, tileX, tileY);
  return tile !== undefined && isTileWalkable(tile) && !BLOCKED_TILE_IDS.has(tile);
}



export function isMinimapLegacyRoofTile(

  map: GameMap,

  tileX: number,

  tileY: number

): boolean {

  const legacy = map.legacyCsmData;

  if (!legacy) return false;



  const l3 = legacy.L3[tileY]?.[tileX] ?? 0;

  const l4 = legacy.L4[tileY]?.[tileX] ?? 0;

  if (l3 > 0 || l4 > 0) return true;

  if (getRoofTriggerSet(map).has(`${tileX},${tileY}`)) return true;



  let adjacentBuilding = 0;

  for (const [dx, dy] of CARDINAL_OFFSETS) {

    const nx = tileX + dx;

    const ny = tileY + dy;

    if ((legacy.L3[ny]?.[nx] ?? 0) > 0 || (legacy.L4[ny]?.[nx] ?? 0) > 0) {

      adjacentBuilding += 1;

    }

  }

  return adjacentBuilding >= 2;

}



export function isLegacyBlockedDoorwayTile(

  map: GameMap,

  tileX: number,

  tileY: number,

  tileOverrides?: MapTileOverrides

): boolean {

  if (isMapCollisionAllowTile(map.id, tileX, tileY)) {

    return true;

  }



  if (!getRoofTriggerSet(map).has(`${tileX},${tileY}`)) {

    return false;

  }

  const tile = resolveMapTile(map.tiles, tileX, tileY, tileOverrides);

  if (tile === undefined || !BLOCKED_TILE_IDS.has(tile)) {

    return false;

  }



  for (const [dx, dy] of CARDINAL_OFFSETS) {

    const nx = tileX + dx;

    const ny = tileY + dy;

    const neighbor = resolveMapTile(map.tiles, nx, ny, tileOverrides);

    if (neighbor === undefined) {

      continue;

    }

    if (BLOCKED_TILE_IDS.has(neighbor)) {

      continue;

    }

    if (!isTileWalkable(neighbor)) {

      continue;

    }

    if (!getRoofTriggerSet(map).has(`${nx},${ny}`)) {

      return true;

    }

  }



  return false;

}



export function isLegacyInvisibleObjectBlock(
  map: GameMap,
  tileX: number,
  tileY: number,
  tileOverrides?: MapTileOverrides
): boolean {

  const legacy = map.legacyCsmData;

  if (!legacy) return false;

  if ((legacy.L2[tileY]?.[tileX] ?? 0) !== 0) return false;

  if ((legacy.L3[tileY]?.[tileX] ?? 0) !== 0) return false;

  if ((legacy.L4[tileY]?.[tileX] ?? 0) !== 0) return false;



  let blockedIn3x3 = 0;

  let blockedCardinals = 0;

  for (let dy = -1; dy <= 1; dy += 1) {

    for (let dx = -1; dx <= 1; dx += 1) {

      const nx = tileX + dx;

      const ny = tileY + dy;

      const neighbor = resolveMapTile(map.tiles, nx, ny, tileOverrides);

      if (neighbor !== undefined && BLOCKED_TILE_IDS.has(neighbor)) {

        blockedIn3x3 += 1;

      }

      if (dx === 0 || dy === 0) {

        if ((legacy.L3[ny]?.[nx] ?? 0) !== 0) return false;

        if ((legacy.L4[ny]?.[nx] ?? 0) !== 0) return false;

        if ((legacy.L2[ny]?.[nx] ?? 0) !== 0) return false;

      }

      if (dx !== 0 && dy !== 0) {

        if ((legacy.L3[ny]?.[nx] ?? 0) !== 0) return false;

        if ((legacy.L4[ny]?.[nx] ?? 0) !== 0) return false;

      }

      if (dx === 0 && dy === 0) {

        continue;

      }

      if (dx === 0 || dy === 0) {

        const cardinalNeighbor = resolveMapTile(map.tiles, nx, ny, tileOverrides);

        if (cardinalNeighbor !== undefined && BLOCKED_TILE_IDS.has(cardinalNeighbor)) {

          blockedCardinals += 1;

        }

      }

    }

  }

  if (blockedIn3x3 >= 3 || blockedCardinals >= 2) {

    return false;

  }



  return true;

}



/**

 * Walkability de un tile del mapa (sin contar objetos ni mobs).

 * Overrides: game-data/maps/mapa1.collision.json

 */

export function isMapTileWalkable(
  mapId: string,
  tileX: number,
  tileY: number,
  tileOverrides?: MapTileOverrides,
  isAquatic?: boolean
): boolean {

  const map = getMap(mapId);

  if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) {

    return false;

  }

  const isWater = isWaterTile(map, tileX, tileY, tileOverrides);

  if (isAquatic) {
    // Aquatic mobs can ONLY move on water tiles.
    return isWater;
  }

  // Non-aquatic mobs/players:
  if (isWater && !isLegacyShoreWaterTile(map, tileX, tileY)) {
    // Cannot walk on deep water.
    return false;
  }

  if (isMapCollisionDenyTile(mapId, tileX, tileY)) {

    return false;

  }



  if (isMapCollisionAllowTile(mapId, tileX, tileY)) {

    return true;

  }



  if (map.legacyCsmData) {

    if (
      isLegacyWallLayerTile(map, tileX, tileY) &&
      !isOpenDoorTileOverride(tileOverrides, tileX, tileY)
    ) {

      return false;

    }

    if (isLegacyPhantomWallGap(map, tileX, tileY, tileOverrides)) {

      return false;

    }

    if (getRoofTriggerSet(map).has(`${tileX},${tileY}`)) {

      const roofTile = resolveMapTile(map.tiles, tileX, tileY, tileOverrides);

      if (roofTile === undefined) {

        return false;

      }

      if (!BLOCKED_TILE_IDS.has(roofTile)) {

        return true;

      }

      if (isLegacyBlockedDoorwayTile(map, tileX, tileY, tileOverrides)) {

        return true;

      }

    }

  }



  const tile = resolveMapTile(map.tiles, tileX, tileY, tileOverrides);

  if (tile === undefined) {

    return false;

  }



  if (isTileWalkable(tile)) {

    return true;

  }



  if (tile === TILE.GRASS_BLOCKED) {

    if (map.legacyCsmData && isLegacyInvisibleObjectBlock(map, tileX, tileY, tileOverrides)) {

      return true;

    }

    return false;

  }



  return false;

}



export function getMapSpawnTile(mapId: string): { tileX: number; tileY: number } {
  if (mapId === "mapa1") {
    return { tileX: 57, tileY: 44 };
  }

  const map = getMap(mapId);

  return {

    tileX: Math.floor(map.width / 2),

    tileY: Math.floor(map.height / 2),

  };

}



export function findNearestWalkableSpawnTile(

  mapId: string,

  origin: { tileX: number; tileY: number },

  isBlocked: (tileX: number, tileY: number) => boolean,

  maxRadius = 24

): { tileX: number; tileY: number } {

  const queue: Array<{ tileX: number; tileY: number; dist: number }> = [

    { tileX: origin.tileX, tileY: origin.tileY, dist: 0 },

  ];

  const visited = new Set<string>([`${origin.tileX},${origin.tileY}`]);



  while (queue.length > 0) {

    const current = queue.shift()!;

    if (

      isMapTileWalkable(mapId, current.tileX, current.tileY) &&

      !isBlocked(current.tileX, current.tileY)

    ) {

      return { tileX: current.tileX, tileY: current.tileY };

    }

    if (current.dist >= maxRadius) continue;

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {

      const neighbor = { tileX: current.tileX + dx, tileY: current.tileY + dy };

      const key = `${neighbor.tileX},${neighbor.tileY}`;

      if (!visited.has(key)) {

        visited.add(key);

        queue.push({ ...neighbor, dist: current.dist + 1 });

      }

    }

  }



  return { tileX: origin.tileX, tileY: origin.tileY };

}



/** Re-export para tests y runtime de caras NPC. */

export function getCatalogNpcFaceAppearance(entry: ImperiumNpcCatalogEntry) {

  return resolveNpcFaceAppearance(entry);

}


