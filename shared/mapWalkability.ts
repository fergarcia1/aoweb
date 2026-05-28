import { getMap } from "../src/maps/index";
import { getTileDefinition } from "../src/maps/tileDefinitions";

/** Solo tiles del mapa (sin objetos ni mobs). Suficiente para el esqueleto en pueblo. */
export function isMapTileWalkable(mapId: string, tileX: number, tileY: number): boolean {
  const map = getMap(mapId);
  if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) {
    return false;
  }
  const tile = map.tiles[tileY][tileX];
  return getTileDefinition(tile).walkable;
}

export function getMapSpawnTile(mapId: string): { tileX: number; tileY: number } {
  const map = getMap(mapId);
  return {
    tileX: Math.floor(map.width / 2),
    tileY: Math.floor(map.height / 2),
  };
}

/** Primer tile caminable libre, expandiendo en BFS desde el spawn del mapa. */
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

    if (current.dist >= maxRadius) {
      continue;
    }

    const neighbors = [
      { tileX: current.tileX + 1, tileY: current.tileY },
      { tileX: current.tileX - 1, tileY: current.tileY },
      { tileX: current.tileX, tileY: current.tileY + 1 },
      { tileX: current.tileX, tileY: current.tileY - 1 },
    ];

    for (const neighbor of neighbors) {
      const key = `${neighbor.tileX},${neighbor.tileY}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ ...neighbor, dist: current.dist + 1 });
    }
  }

  return { tileX: origin.tileX, tileY: origin.tileY };
}
