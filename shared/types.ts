export type Facing = "up" | "down" | "left" | "right";

export type MoveDirectionId = "up" | "down" | "left" | "right";

export type PlayerRole = "player" | "admin";

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
};

export type NetMobState = {
  id: string;
  mobId: string;
  name: string;
  mapId: string;
  tileX: number;
  tileY: number;
  facing: Facing;
  hp: number;
  hpMax: number;
  alive: boolean;
};

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
    mapId: typeof raw.mapId === "string" ? raw.mapId : "pueblo",
    tileX: typeof raw.tileX === "number" ? Math.floor(raw.tileX) : 0,
    tileY: typeof raw.tileY === "number" ? Math.floor(raw.tileY) : 0,
    facing,
    raceId: typeof raw.raceId === "string" ? raw.raceId : "human",
    genderId: typeof raw.genderId === "string" ? raw.genderId : "male",
    classId: typeof raw.classId === "string" ? raw.classId : "paladin",
    factionId: typeof raw.factionId === "string" ? raw.factionId : "imperial",
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
    mapId: typeof raw?.mapId === "string" ? raw.mapId : "pueblo",
    players,
    mobs: Array.isArray(raw?.mobs) ? raw.mobs : [],
    worldItems,
  };
}

export function normalizeNetWorldItemState(
  raw: Partial<NetWorldItemState> | null | undefined
): NetWorldItemState | null {
  if (!raw || typeof raw.id !== "string" || !raw.id.trim()) {
    return null;
  }
  const itemId =
    typeof raw.itemId === "string" && raw.itemId.trim() ? raw.itemId.trim() : null;
  if (!itemId) {
    return null;
  }
  const count =
    typeof raw.count === "number" && Number.isFinite(raw.count)
      ? Math.max(1, Math.floor(raw.count))
      : 1;
  return {
    id: raw.id.trim(),
    tileX: typeof raw.tileX === "number" ? Math.floor(raw.tileX) : 0,
    tileY: typeof raw.tileY === "number" ? Math.floor(raw.tileY) : 0,
    itemId,
    count,
  };
}

export type DamageEvent = {
  kind: "damage";
  targetKind: "mob" | "player";
  targetId: string;
  amount: number;
  tileX: number;
  tileY: number;
  critical?: boolean;
};

export type SpellFxEvent = {
  kind: "spell_fx";
  spellId: number;
  tileX: number;
  tileY: number;
};

export type GameEvent = DamageEvent | SpellFxEvent;
