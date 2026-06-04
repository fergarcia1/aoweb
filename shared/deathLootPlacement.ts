export type DropTile = { tileX: number; tileY: number };

/** Busca el tile caminable más cercano (distancia Manhattan) apto para dropear. */
export function findNearestWalkableDropTile(
  originX: number,
  originY: number,
  canDrop: (tileX: number, tileY: number) => boolean,
  maxDistance = 32
): DropTile | null {
  if (canDrop(originX, originY)) {
    return { tileX: originX, tileY: originY };
  }

  for (let distance = 1; distance <= maxDistance; distance += 1) {
    for (let dy = -distance; dy <= distance; dy += 1) {
      for (let dx = -distance; dx <= distance; dx += 1) {
        if (Math.abs(dx) + Math.abs(dy) !== distance) {
          continue;
        }
        const tileX = originX + dx;
        const tileY = originY + dy;
        if (canDrop(tileX, tileY)) {
          return { tileX, tileY };
        }
      }
    }
  }

  return null;
}

/** Reserva tiles únicos para esparcir varios ítems alrededor del origen. */
export function findSpreadDropTiles(
  originX: number,
  originY: number,
  count: number,
  canDrop: (tileX: number, tileY: number) => boolean,
  maxDistance = 32
): DropTile[] {
  const results: DropTile[] = [];
  const occupied = new Set<string>();

  const canUse = (tileX: number, tileY: number) => {
    const key = `${tileX},${tileY}`;
    if (occupied.has(key)) {
      return false;
    }
    return canDrop(tileX, tileY);
  };

  for (let index = 0; index < count; index += 1) {
    const tile = findNearestWalkableDropTile(originX, originY, canUse, maxDistance);
    if (!tile) {
      break;
    }
    occupied.add(`${tile.tileX},${tile.tileY}`);
    results.push(tile);
  }

  return results;
}
