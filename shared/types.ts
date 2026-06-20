export type Facing = "up" | "down" | "left" | "right";

export type MoveDirectionId = "up" | "down" | "left" | "right";

export type PlayerRole = "player" | "admin";

import { normalizeFactionId } from "./faction";

export type NetMapTransition = {
  tileX: number;
  tileY: number;
  toMapId: string;
  toTileX: number;
  toTileY: number;
  facing?: Facing;
};

export type NetPlayerEquipment = {
  weaponId: string | null;
  shieldId: string | null;
  helmetId: string | null;
  armorId: string | null;
  equippedOutfit: string;
};

export type NetPlayerState = {
  id: string;
  name: string;
  mapId: string;
  tileX: number;
  tileY: number;
  facing: Facing;
  raceId: string;
  genderId: string;
  classId: string;
  factionId: string;
  faceIndex: number;
  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;
  level: number;
  role: PlayerRole;
  equipment: NetPlayerEquipment;
  /** El servidor acepto que el jugador esta meditando. */
  isMeditating?: boolean;
  /** El servidor acepto modo navegacion en barca. */
  isNavigating?: boolean;
  /** Solo en player_updated cuando cambian buffs de atributos (hechizos/pociones). */
  attributeBuffs?: { strength: number; agility: number };
  buffExpiresAtMs?: number;
  /** Epoch ms; 0 = sin invisibilidad. */
  invisibleUntilMs?: number;
};

export type NetMobState = {
  id: string;
  mobId: string;
  /** ID numérico del catálogo Imperium (NPCs.dat) — presente solo en NPCs del catálogo. */
  npcId?: number;
  name: string;
  mapId: string;
  tileX: number;
  tileY: number;
  facing: Facing;
  hp: number;
  hpMax: number;
  alive: boolean;
  /** Epoch ms; 0 = sin inmovilizar/paralizar. */
  immobilizedUntilMs: number;
};

/** Estado de mob en red; null si el mensaje no trae id válido. */
export function normalizeNetMobState(
  raw: Partial<NetMobState> | null | undefined
): NetMobState | null {
  if (!raw || typeof raw.id !== "string" || !raw.id) {
    return null;
  }
  const facing =
    raw.facing === "up" ||
    raw.facing === "down" ||
    raw.facing === "left" ||
    raw.facing === "right"
      ? raw.facing
      : "down";
  const hpMax =
    typeof raw.hpMax === "number" && Number.isFinite(raw.hpMax)
      ? Math.max(1, Math.floor(raw.hpMax))
      : 100;
  const immobilizedUntilMs =
    typeof raw.immobilizedUntilMs === "number" && Number.isFinite(raw.immobilizedUntilMs)
      ? Math.max(0, Math.floor(raw.immobilizedUntilMs))
      : 0;

  return {
    id: raw.id,
    mobId: typeof raw.mobId === "string" ? raw.mobId : raw.id,
    npcId: typeof raw.npcId === "number" && Number.isFinite(raw.npcId) ? raw.npcId : undefined,
    name: typeof raw.name === "string" ? raw.name : "Mob",
    mapId: typeof raw.mapId === "string" ? raw.mapId : "mapa1",
    tileX: typeof raw.tileX === "number" ? Math.floor(raw.tileX) : 0,
    tileY: typeof raw.tileY === "number" ? Math.floor(raw.tileY) : 0,
    facing,
    hp:
      typeof raw.hp === "number" && Number.isFinite(raw.hp)
        ? Math.max(0, Math.floor(raw.hp))
        : hpMax,
    hpMax,
    alive: raw.alive !== false,
    immobilizedUntilMs,
  };
}

export type NetWorldItemState = {
  id: string;
  tileX: number;
  tileY: number;
  itemId: string;
  count: number;
};

export type WorldSnapshot = {
  tick: number;
  mapId: string;
  players: NetPlayerState[];
  mobs: NetMobState[];
  worldItems?: NetWorldItemState[];
};

export function normalizeNetPlayerEquipment(
  raw: Partial<NetPlayerEquipment> | null | undefined
): NetPlayerEquipment {
  const id = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null;
  return {
    weaponId: id(raw?.weaponId),
    shieldId: id(raw?.shieldId),
    helmetId: id(raw?.helmetId),
    armorId: id(raw?.armorId),
    equippedOutfit:
      typeof raw?.equippedOutfit === "string" && raw.equippedOutfit.trim()
        ? raw.equippedOutfit.trim()
        : "base",
  };
}

/** Estado de jugador en red; null si el mensaje no trae id válido. */
export function normalizeNetPlayerState(
  raw: Partial<NetPlayerState> | null | undefined
): NetPlayerState | null {
  if (!raw || typeof raw.id !== "string" || !raw.id) {
    return null;
  }
  const facing =
    raw.facing === "up" ||
    raw.facing === "down" ||
    raw.facing === "left" ||
    raw.facing === "right"
      ? raw.facing
      : "down";
  const hpMax =
    typeof raw.hpMax === "number" && Number.isFinite(raw.hpMax)
      ? Math.max(1, Math.floor(raw.hpMax))
      : 100;
  const mpMax =
    typeof raw.mpMax === "number" && Number.isFinite(raw.mpMax)
      ? Math.max(0, Math.floor(raw.mpMax))
      : 50;
  return {
    id: raw.id,
    name: typeof raw.name === "string" ? raw.name : "Viajero",
    mapId: typeof raw.mapId === "string" ? raw.mapId : "mapa1",
    tileX: typeof raw.tileX === "number" ? Math.floor(raw.tileX) : 0,
    tileY: typeof raw.tileY === "number" ? Math.floor(raw.tileY) : 0,
    facing,
    raceId: typeof raw.raceId === "string" ? raw.raceId : "human",
    genderId: typeof raw.genderId === "string" ? raw.genderId : "male",
    classId: typeof raw.classId === "string" ? raw.classId : "paladin",
    factionId: normalizeFactionId(raw.factionId),
    faceIndex:
      typeof raw.faceIndex === "number" && Number.isFinite(raw.faceIndex)
        ? Math.max(0, Math.floor(raw.faceIndex))
        : 0,
    hpMax,
    hp:
      typeof raw.hp === "number" && Number.isFinite(raw.hp)
        ? Math.min(hpMax, Math.max(0, Math.floor(raw.hp)))
        : hpMax,
    mpMax,
    mp:
      typeof raw.mp === "number" && Number.isFinite(raw.mp)
        ? Math.min(mpMax, Math.max(0, Math.floor(raw.mp)))
        : mpMax,
    level:
      typeof raw.level === "number" && Number.isFinite(raw.level)
        ? Math.max(1, Math.floor(raw.level))
        : 1,
    role: raw.role === "admin" ? "admin" : "player",
    equipment: normalizeNetPlayerEquipment(raw.equipment),
    isMeditating: raw.isMeditating === true,
    isNavigating: raw.isNavigating === true,
    invisibleUntilMs:
      typeof raw.invisibleUntilMs === "number" && Number.isFinite(raw.invisibleUntilMs)
        ? Math.max(0, Math.floor(raw.invisibleUntilMs))
        : 0,
    ...(typeof raw.attributeBuffs === "object" &&
    raw.attributeBuffs &&
    typeof raw.attributeBuffs.strength === "number" &&
    typeof raw.attributeBuffs.agility === "number"
      ? {
          attributeBuffs: {
            strength: Math.floor(raw.attributeBuffs.strength),
            agility: Math.floor(raw.attributeBuffs.agility),
          },
          buffExpiresAtMs:
            typeof raw.buffExpiresAtMs === "number" && Number.isFinite(raw.buffExpiresAtMs)
              ? Math.max(0, Math.floor(raw.buffExpiresAtMs))
              : 0,
        }
      : {}),
  };
}

/** Asegura arrays en snapshots (servidor viejo o mensajes parciales). */
export function normalizeWorldSnapshot(
  raw: Partial<WorldSnapshot> | null | undefined
): WorldSnapshot {
  const players = Array.isArray(raw?.players)
    ? raw.players
        .map((entry) => normalizeNetPlayerState(entry))
        .filter((entry): entry is NetPlayerState => entry !== null)
    : [];
  const worldItems = Array.isArray(raw?.worldItems)
    ? raw.worldItems
        .map((entry) => normalizeNetWorldItemState(entry))
        .filter((entry): entry is NetWorldItemState => entry !== null)
    : [];

  return {
    tick: typeof raw?.tick === "number" ? raw.tick : 0,
    mapId: typeof raw?.mapId === "string" ? raw.mapId : "mapa1",
    players,
    mobs: Array.isArray(raw?.mobs)
      ? raw.mobs
          .map((entry) => normalizeNetMobState(entry))
          .filter((entry): entry is NetMobState => entry !== null)
      : [],
    worldItems,
  };
}

export function normalizeNetWorldItemState(
  raw: Partial<NetWorldItemState> | null | undefined
): NetWorldItemState | null {
  if (!raw) return null;
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : null;
  const tileX = typeof raw.tileX === "number" && Number.isFinite(raw.tileX) ? Math.floor(raw.tileX) : null;
  const tileY = typeof raw.tileY === "number" && Number.isFinite(raw.tileY) ? Math.floor(raw.tileY) : null;
  const itemId = typeof raw.itemId === "string" && raw.itemId.trim() ? raw.itemId.trim() : null;
  const count = typeof raw.count === "number" && Number.isFinite(raw.count) ? Math.floor(raw.count) : null;

  if (id == null || tileX == null || tileY == null || itemId == null || count == null) {
    console.error("[CLIENT-SYNC] normalizeNetWorldItemState falló:", { id, tileX, tileY, itemId, count, raw });
    return null;
  }
  return { id, tileX, tileY, itemId, count };
}

export type DamageEvent = {
  kind: "damage";
  targetKind: "mob" | "player";
  targetId: string;
  amount: number;
  tileX: number;
  tileY: number;
  critical?: boolean;
  /** Tile del origen del ruido (jugador atacante o mob). */
  sourceTileX?: number;
  sourceTileY?: number;
  /** Jugador que generó el sonido (golpe/hechizo); ausente si fue un mob. */
  sourcePlayerId?: string;
};

export type HealEvent = {
  kind: "heal";
  targetKind: "player";
  targetId: string;
  amount: number;
  tileX: number;
  tileY: number;
  /** Tile del origen del efecto (hechicero). */
  sourceTileX?: number;
  sourceTileY?: number;
  sourcePlayerId?: string;
};

export type SpellFxEvent = {
  kind: "spell_fx";
  spellId: number;
  tileX: number;
  tileY: number;
  sourcePlayerId?: string;
  sourceTileX?: number;
  sourceTileY?: number;
};

export type ResurrectChannelEvent = {
  kind: "resurrect_channel";
  casterId: string;
  casterName: string;
  targetId: string;
  targetName: string;
  transitions?: NetMapTransition[];
  roofTriggers?: { tileX: number; tileY: number }[];
  /** Overlays que se dibujan sobre el pasto (caminos, arena, etc) */
  tileX: number;
  tileY: number;
  /** Tile del lanzador (FX de canalización). */
  casterTileX: number;
  casterTileY: number;
  endsAtMs: number;
};

export type ResurrectCompleteEvent = {
  kind: "resurrect_complete";
  casterId: string;
  targetId: string;
  targetName: string;
  tileX: number;
  tileY: number;
};

export type ResurrectCancelEvent = {
  kind: "resurrect_cancel";
  casterId: string;
  targetId: string;
  reason: string;
};

export type MapObjectUpdateEvent = {
  kind: "map_object_updated";
  tileX: number;
  tileY: number;
  objIndex: number;
};

export type NetAuctionState = {
  id: string;
  sellerId: string;
  sellerName: string;
  itemId: string;
  amount: number;
  price: number;
  expiresAtMs: number;
};

export type GameEvent =
  | DamageEvent
  | HealEvent
  | SpellFxEvent
  | ResurrectChannelEvent
  | ResurrectCompleteEvent
  | ResurrectCancelEvent
  | MapObjectUpdateEvent;
