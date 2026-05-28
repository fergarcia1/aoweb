import { MAP_MOB_SPAWNS, MOB_SPAWNS } from "../src/data/mobs";
import { getMap } from "../src/maps/index";
import { getNpcOccupiedTiles } from "../src/npcs/npcDefinitions";
import { DEFAULT_MAP_ID } from "./constants";
import { getMapSpawnTile, isMapTileWalkable } from "./mapWalkability";

export const TRAINING_DUMMY_ID = "training_dummy_spawn";
export const TRAINING_DUMMY_HP = 10_000;
/** Hitbox del muñeco de entrenamiento (debe coincidir con el cliente). */
export const TRAINING_DUMMY_HITBOX_WIDTH_TILES = 1;
export const TRAINING_DUMMY_HITBOX_HEIGHT_TILES = 2;

function tileKey(tileX: number, tileY: number) {
  return `${tileX},${tileY}`;
}

function shuffleInPlace<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/** Mapas con entradas en `mobs.json` → `mapSpawns`. */
export function getMapIdsWithMobSpawns(): string[] {
  return [...new Set(MAP_MOB_SPAWNS.map((entry) => entry.mapId))];
}

/** Todos los tiles caminables del mapa (opcional: sin el tile de spawn de jugadores). */
export function collectMobSpawnCandidateTiles(
  mapId: string,
  options?: { excludePlayerSpawnTile?: boolean }
): { x: number; y: number }[] {
  const mapDef = getMap(mapId);
  const spawn = getMapSpawnTile(mapId);
  const excludeSpawn = options?.excludePlayerSpawnTile ?? true;
  const npcBlocked = new Set(
    getNpcOccupiedTiles(mapId).map((tile) => tileKey(tile.x, tile.y))
  );
  const candidates: { x: number; y: number }[] = [];

  for (let y = 0; y < mapDef.height; y += 1) {
    for (let x = 0; x < mapDef.width; x += 1) {
      if (!isMapTileWalkable(mapId, x, y)) continue;
      if (excludeSpawn && x === spawn.tileX && y === spawn.tileY) continue;
      if (npcBlocked.has(tileKey(x, y))) continue;
      candidates.push({ x, y });
    }
  }

  return candidates;
}

/** Un tile aleatorio libre en todo el mapa. */
export function pickRandomMobSpawnTile(
  mapId: string,
  isBlocked: (tileX: number, tileY: number) => boolean
): { x: number; y: number } {
  const candidates = collectMobSpawnCandidateTiles(mapId);
  shuffleInPlace(candidates);

  for (const tile of candidates) {
    if (!isBlocked(tile.x, tile.y)) {
      return tile;
    }
  }

  const spawn = getMapSpawnTile(mapId);
  return { x: spawn.tileX + 1, y: spawn.tileY };
}

export type MobPlacement = {
  spawnId: string;
  mobId: string;
  name: string;
  maxHp: number;
  tileX: number;
  tileY: number;
  mapId: string;
  behavior: string;
  hitboxOffsetY: number;
  hitboxWidthTiles: number;
  hitboxHeightTiles: number;
};

/** Mobs de un mapa: cantidad según `mapSpawns`, tiles al azar sin repetir. */
export function buildInitialMobPlacements(mapId: string): MobPlacement[] {
  const mapSpawns = MOB_SPAWNS.filter((spawn) => spawn.mapId === mapId);
  if (mapSpawns.length === 0) {
    return [];
  }

  const spawn = getMapSpawnTile(mapId);
  const candidates = collectMobSpawnCandidateTiles(mapId);
  shuffleInPlace(candidates);

  const npcBlocked = new Set(
    getNpcOccupiedTiles(mapId).map((tile) => tileKey(tile.x, tile.y))
  );
  const used = new Set<string>();
  let candidateIndex = 0;

  const takeRandomFreeTile = (): { x: number; y: number } => {
    while (candidateIndex < candidates.length) {
      const tile = candidates[candidateIndex];
      candidateIndex += 1;
      const key = tileKey(tile.x, tile.y);
      if (used.has(key) || npcBlocked.has(key)) continue;
      used.add(key);
      return tile;
    }
    return { x: spawn.tileX + 1, y: spawn.tileY };
  };

  const placements: MobPlacement[] = mapSpawns.map((mobSpawn) => {
    const tile = takeRandomFreeTile();
    return {
      spawnId: mobSpawn.id,
      mobId: mobSpawn.mobId,
      name: mobSpawn.name,
      maxHp: mobSpawn.maxHp,
      tileX: tile.x,
      tileY: tile.y,
      mapId,
      behavior: mobSpawn.behavior,
      hitboxOffsetY: mobSpawn.hitboxOffsetY,
      hitboxWidthTiles: mobSpawn.hitboxWidthTiles,
      hitboxHeightTiles: mobSpawn.hitboxHeightTiles,
    };
  });

  if (mapId === DEFAULT_MAP_ID) {
    const preferredTraining = {
      x: spawn.tileX,
      y: Math.max(0, spawn.tileY - 2),
    };
    const trainingKey = tileKey(preferredTraining.x, preferredTraining.y);
    const trainingTile =
      isMapTileWalkable(mapId, preferredTraining.x, preferredTraining.y) &&
      !used.has(trainingKey)
        ? preferredTraining
        : takeRandomFreeTile();

    placements.push({
      spawnId: TRAINING_DUMMY_ID,
      mobId: "gallina",
      name: "Muñeco de entrenamiento",
      maxHp: TRAINING_DUMMY_HP,
      tileX: trainingTile.x,
      tileY: trainingTile.y,
      mapId,
      behavior: "static",
      hitboxOffsetY: -32,
      hitboxWidthTiles: TRAINING_DUMMY_HITBOX_WIDTH_TILES,
      hitboxHeightTiles: TRAINING_DUMMY_HITBOX_HEIGHT_TILES,
    });
  }

  return placements;
}

/** Placements iniciales para todos los mapas definidos en `mobs.json`. */
export function buildAllInitialMobPlacements(): MobPlacement[] {
  return getMapIdsWithMobSpawns().flatMap((mapId) => buildInitialMobPlacements(mapId));
}
