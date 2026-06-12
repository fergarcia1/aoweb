export type GridTile = { tileX: number; tileY: number };

const CARDINAL_STEPS: ReadonlyArray<{ dx: number; dy: number }> = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

function tileKey(tileX: number, tileY: number): string {
  return `${tileX},${tileY}`;
}

function parseTileKey(key: string): GridTile {
  const [tileX, tileY] = key.split(",").map((part) => Number(part));
  return { tileX, tileY };
}

function manhattanDistance(
  a: GridTile,
  b: GridTile
): number {
  return Math.abs(a.tileX - b.tileX) + Math.abs(a.tileY - b.tileY);
}

/**
 * Primer paso (tile adyacente al origen) de un camino cardinal hacia una casilla
 * adyacente al objetivo. Útil para IA de persecución con obstáculos.
 */
export function findFirstChaseStep(
  origin: GridTile,
  target: GridTile,
  options: {
    canEnter: (tileX: number, tileY: number) => boolean;
    maxDepth?: number;
  }
): GridTile | null {
  if (manhattanDistance(origin, target) <= 1) {
    return null;
  }

  const maxDepth = options.maxDepth ?? 48;
  const originKey = tileKey(origin.tileX, origin.tileY);
  const targetKey = tileKey(target.tileX, target.tileY);

  const parent = new Map<string, string | null>();
  parent.set(originKey, null);

  const queue: Array<{ tileX: number; tileY: number; depth: number }> = [
    { tileX: origin.tileX, tileY: origin.tileY, depth: 0 },
  ];

  let goalKey: string | null = null;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) {
      continue;
    }

    for (const { dx, dy } of CARDINAL_STEPS) {
      const nextX = current.tileX + dx;
      const nextY = current.tileY + dy;
      const nextKey = tileKey(nextX, nextY);

      if (parent.has(nextKey)) {
        continue;
      }

      if (nextKey === targetKey) {
        continue;
      }

      if (manhattanDistance({ tileX: nextX, tileY: nextY }, target) === 1) {
        if (!options.canEnter(nextX, nextY)) {
          continue;
        }
        parent.set(nextKey, tileKey(current.tileX, current.tileY));
        goalKey = nextKey;
        queue.length = 0;
        break;
      }

      if (!options.canEnter(nextX, nextY)) {
        continue;
      }

      parent.set(nextKey, tileKey(current.tileX, current.tileY));
      queue.push({ tileX: nextX, tileY: nextY, depth: current.depth + 1 });
    }
  }

  if (!goalKey) {
    return null;
  }

  let cursor = goalKey;
  let prev = parent.get(cursor) ?? null;
  while (prev && prev !== originKey) {
    cursor = prev;
    prev = parent.get(cursor) ?? null;
  }

  if (prev !== originKey) {
    return null;
  }

  return parseTileKey(cursor);
}
