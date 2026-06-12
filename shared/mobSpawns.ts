import { MAP_MOB_SPAWNS_BY_MAP_ID, MOB_DEFINITIONS } from "../game-data/mobs";
import { getMap } from "./maps";
import { getNpcOccupiedTiles } from "./npcDefinitions";
import { DEFAULT_MOB_HITBOX, DEFAULT_MAP_ID } from "./constants";
import { getMapSpawnTile, isMapTileWalkable } from "./mapWalkability";
import { EDGE_TRANSITION_TRIGGER_DISTANCE } from "./mapConstants";

export const TRAINING_DUMMY_ID = "training_dummy_spawn";
export const TRAINING_DUMMY_HP = 10_000;
/** Hitbox del muñeco de entrenamiento (debe coincidir con el cliente). */
export const TRAINING_DUMMY_HITBOX_OFFSET_Y = DEFAULT_MOB_HITBOX.offsetY;
export const TRAINING_DUMMY_HITBOX_WIDTH_TILES = DEFAULT_MOB_HITBOX.widthTiles;
export const TRAINING_DUMMY_HITBOX_HEIGHT_TILES = DEFAULT_MOB_HITBOX.heightTiles;

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
  return [...MAP_MOB_SPAWNS_BY_MAP_ID.keys()];
}

/** Todos los tiles caminables del mapa (opcional: sin el tile de spawn de jugadores). */
export function collectMobSpawnCandidateTiles(
  mapId: string,
  options?: { excludePlayerSpawnTile?: boolean; isAquatic?: boolean }
): { x: number; y: number }[] {
  const mapDef = getMap(mapId);
  const spawn = getMapSpawnTile(mapId);
  const excludeSpawn = options?.excludePlayerSpawnTile ?? true;
  const npcBlocked = new Set(
    getNpcOccupiedTiles(mapId).map((tile) => tileKey(tile.x, tile.y))
  );
  const candidates: { x: number; y: number }[] = [];

  const padding = EDGE_TRANSITION_TRIGGER_DISTANCE;

  for (let y = padding; y < mapDef.height - padding; y += 1) {
    for (let x = padding; x < mapDef.width - padding; x += 1) {
      if (!isMapTileWalkable(mapId, x, y, undefined, options?.isAquatic)) continue;
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
  npcId?: number;
};

/** Mobs de un mapa: cantidad según `mapSpawns`, tiles al azar sin repetir. */
export function buildInitialMobPlacements(mapId: string): MobPlacement[] {
  const mapEntries = MAP_MOB_SPAWNS_BY_MAP_ID.get(mapId);
  if (!mapEntries?.length) {
    return [];
  }

  const spawn = getMapSpawnTile(mapId);
  const landCandidates = collectMobSpawnCandidateTiles(mapId, {
    isAquatic: false,
  });
  const waterCandidates = collectMobSpawnCandidateTiles(mapId, {
    isAquatic: true,
  });
  shuffleInPlace(landCandidates);
  shuffleInPlace(waterCandidates);

  const npcBlocked = new Set(
    getNpcOccupiedTiles(mapId).map((tile) => tileKey(tile.x, tile.y))
  );
  const used = new Set<string>();

  let landIndex = 0;
  let waterIndex = 0;

  const takeRandomFreeTile = (isAquatic: boolean): { x: number; y: number } => {
    const candidates = isAquatic ? waterCandidates : landCandidates;
    let idx = isAquatic ? waterIndex : landIndex;

    while (idx < candidates.length) {
      const tile = candidates[idx];
      idx += 1;
      if (isAquatic) waterIndex = idx;
      else landIndex = idx;

      const key = tileKey(tile.x, tile.y);
      if (used.has(key) || npcBlocked.has(key)) continue;
      used.add(key);
      return tile;
    }
    return { x: spawn.tileX + 1, y: spawn.tileY };
  };

  const placements: MobPlacement[] = [];

  for (const entry of mapEntries) {
    const base = MOB_DEFINITIONS[entry.mobId];
    for (let index = 0; index < entry.count; index += 1) {
      const isExplicitTile = entry.tileX !== undefined && entry.tileY !== undefined;
      const tile = isExplicitTile
        ? { x: entry.tileX!, y: entry.tileY! }
        : takeRandomFreeTile(!!base.aquatic);
      if (isExplicitTile) {
        used.add(tileKey(tile.x, tile.y));
      }
      placements.push({
        spawnId: `${entry.mobId}_${entry.mapId}_${index + 1}`,
        mobId: entry.mobId,
        name: base.name,
        maxHp: base.maxHp,
        tileX: tile.x,
        tileY: tile.y,
        mapId,
        behavior: base.behavior,
        hitboxOffsetY: base.hitboxOffsetY,
        hitboxWidthTiles: base.hitboxWidthTiles,
        hitboxHeightTiles: base.hitboxHeightTiles,
        npcId: base.npcId,
      });
    }
  }

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
        : takeRandomFreeTile(false);

    placements.push({
      spawnId: TRAINING_DUMMY_ID,
      mobId: "gallina",
      name: "Muñeco de entrenamiento",
      maxHp: TRAINING_DUMMY_HP,
      tileX: trainingTile.x,
      tileY: trainingTile.y,
      mapId,
      behavior: "static",
      hitboxOffsetY: TRAINING_DUMMY_HITBOX_OFFSET_Y,
      hitboxWidthTiles: TRAINING_DUMMY_HITBOX_WIDTH_TILES,
      hitboxHeightTiles: TRAINING_DUMMY_HITBOX_HEIGHT_TILES,
      npcId: undefined, // Let the dummy use modelId logic
    });
  }

  return placements;
}


/** Placements iniciales para todos los mapas definidos en `mobs.json`. */
export function buildAllInitialMobPlacements(): MobPlacement[] {
  const placements: MobPlacement[] = [];
  for (const mapId of getMapIdsWithMobSpawns()) {
    try {
      placements.push(...buildInitialMobPlacements(mapId));
    } catch (error) {
      if (error instanceof Error && error.message.includes("Mapa no disponible en Render Free")) {
        continue;
      }
      throw error;
    }
  }
  return placements;
}
