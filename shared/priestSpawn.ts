import { STATIC_NPCS } from "./npcDefinitions";

export type PriestSpawn = {
  mapId: string;
  tileX: number;
  tileY: number;
};

export function getAllPriestSpawns(): PriestSpawn[] {
  return STATIC_NPCS.filter((npc) => npc.role === "priest").map((npc) => ({
    mapId: npc.mapId,
    tileX: npc.tileX,
    tileY: npc.tileY,
  }));
}

export function getNearestPriestSpawn(
  fromMapId: string,
  fromTileX: number,
  fromTileY: number,
  fallback: PriestSpawn
): PriestSpawn {
  const priests = getAllPriestSpawns();
  if (priests.length === 0) {
    return fallback;
  }

  let best = priests[0]!;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const priest of priests) {
    const crossMapPenalty = priest.mapId === fromMapId ? 0 : 10_000;
    const distance =
      Math.abs(priest.tileX - fromTileX) + Math.abs(priest.tileY - fromTileY);
    const score = crossMapPenalty + distance;
    if (score < bestScore) {
      bestScore = score;
      best = priest;
    }
  }
  return best;
}

export function findWalkableTileBeside(
  tileX: number,
  tileY: number,
  isWalkable: (x: number, y: number) => boolean
): { tileX: number; tileY: number } {
  const candidates = [
    { tileX: tileX - 1, tileY },
    { tileX: tileX + 1, tileY },
    { tileX, tileY: tileY - 1 },
    { tileX, tileY: tileY + 1 },
  ];
  for (const candidate of candidates) {
    if (isWalkable(candidate.tileX, candidate.tileY)) {
      return candidate;
    }
  }
  return { tileX, tileY };
}
