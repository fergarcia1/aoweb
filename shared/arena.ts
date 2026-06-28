import type { Facing } from "./types";

export type ArenaMode = "1v1" | "2v2" | "3v3";

export type ArenaClientAction =
  | "join_queue"
  | "cancel_queue"
  | "ready_accept"
  | "ready_cancel";

export type ArenaPlayerStatus =
  | "idle"
  | "queued"
  | "ready_check"
  | "accepted"
  | "countdown"
  | "fighting"
  | "round_ended"
  | "finished";

export type ArenaSlotConfig = {
  id: number;
  mapId: string;
  minTileX: number;
  minTileY: number;
  maxTileX: number;
  maxTileY: number;
  spawnA: { tileX: number; tileY: number; facing: Facing };
  spawnB: { tileX: number; tileY: number; facing: Facing };
};

export type ArenaPlayerSummary = {
  id: string;
  name: string;
  level: number;
};

export type ArenaScore = {
  you: number;
  opponent: number;
};

export type ArenaStatePayload = {
  status: ArenaPlayerStatus;
  mode: ArenaMode | null;
  wins1v1: number;
  queueSize1v1: number;
  readyCheckExpiresAtMs?: number;
  opponent?: ArenaPlayerSummary;
  score?: ArenaScore;
  message?: string;
};

export const ARENA_LEVEL_RANGE = 2;
export const ARENA_READY_CHECK_MS = 15_000;
export const ARENA_COUNTDOWN_SECONDS = 3;
export const ARENA_ROUNDS_TO_WIN = 2;

const ARENA_1V1_MAP_ID = "mapa244";

export const ARENA_1V1_SLOTS: ArenaSlotConfig[] = [
  {
    id: 1,
    mapId: ARENA_1V1_MAP_ID,
    minTileX: 10,
    minTileY: 10,
    maxTileX: 17,
    maxTileY: 17,
    spawnA: { tileX: 11, tileY: 11, facing: "right" },
    spawnB: { tileX: 16, tileY: 16, facing: "left" },
  },
  {
    id: 2,
    mapId: ARENA_1V1_MAP_ID,
    minTileX: 28,
    minTileY: 10,
    maxTileX: 33,
    maxTileY: 17,
    spawnA: { tileX: 29, tileY: 11, facing: "right" },
    spawnB: { tileX: 32, tileY: 16, facing: "left" },
  },
  {
    id: 3,
    mapId: ARENA_1V1_MAP_ID,
    minTileX: 42,
    minTileY: 10,
    maxTileX: 49,
    maxTileY: 17,
    spawnA: { tileX: 43, tileY: 11, facing: "right" },
    spawnB: { tileX: 48, tileY: 16, facing: "left" },
  },
  {
    id: 4,
    mapId: ARENA_1V1_MAP_ID,
    minTileX: 58,
    minTileY: 10,
    maxTileX: 65,
    maxTileY: 17,
    spawnA: { tileX: 59, tileY: 11, facing: "right" },
    spawnB: { tileX: 64, tileY: 16, facing: "left" },
  },
  {
    id: 5,
    mapId: ARENA_1V1_MAP_ID,
    minTileX: 74,
    minTileY: 10,
    maxTileX: 81,
    maxTileY: 17,
    spawnA: { tileX: 75, tileY: 11, facing: "right" },
    spawnB: { tileX: 80, tileY: 16, facing: "left" },
  },
];

export function areArenaLevelsCompatible(a: number, b: number): boolean {
  return Math.abs(Math.floor(a) - Math.floor(b)) <= ARENA_LEVEL_RANGE;
}

export function isArenaMode(value: unknown): value is ArenaMode {
  return value === "1v1" || value === "2v2" || value === "3v3";
}
