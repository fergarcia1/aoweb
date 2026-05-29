import type {
  Facing,
  GameEvent,
  MoveDirectionId,
  NetMobState,
  NetPlayerEquipment,
  NetPlayerState,
  PlayerRole,
  WorldSnapshot,
} from "./types";

export type {
  Facing,
  GameEvent,
  MoveDirectionId,
  NetMobState,
  NetPlayerEquipment,
  NetPlayerState,
  PlayerRole,
  WorldSnapshot,
} from "./types";

export type ClientJoinMessage = {
  type: "join";
  name: string;
  /** Id estable de personaje del cliente (opcional). */
  characterId?: string;
  mapId: string;
  raceId: string;
  genderId: string;
  classId: string;
  factionId: string;
  faceIndex: number;
  tileX?: number;
  tileY?: number;
  facing?: Facing;
  level?: number;
  hp?: number;
  hpMax?: number;
  mp?: number;
  mpMax?: number;
  gold?: number;
  equipment?: NetPlayerEquipment;
  inventory?: Array<{
    slotIndex: number;
    itemId: string | null;
    amount: number;
    isEquipped?: boolean;
  }>;
};

export type ClientMoveMessage = {
  type: "move";
  direction: MoveDirectionId;
};

export type ClientChatMessage = {
  type: "chat";
  text: string;
};

export type ClientAttackMessage = {
  type: "attack";
  /** Dirección visual del cliente al golpear (el servidor no recibe giros sin movimiento). */
  facing?: Facing;
};

export type ClientCastSpellMessage = {
  type: "cast_spell";
  spellId: number;
  targetTileX: number;
  targetTileY: number;
};

export type ClientAdminCommandMessage = {
  type: "admin_command";
  command: string;
  args: string[];
};

export type ClientUseItemMessage = {
  type: "use_item";
  itemId: string;
  inventorySlot?: number;
};

export type ClientEquipItemMessage = {
  type: "equip_item";
  action: "equip" | "unequip";
  inventorySlot?: number;
  /** Si el slot cambió en cliente, el servidor puede ubicar el ítem por id. */
  itemId?: string;
  equipSlot?: "weapon" | "shield" | "helmet" | "armor";
};

export type ClientSyncInventoryMessage = {
  type: "sync_inventory";
  inventory: Array<{
    slotIndex: number;
    itemId: string | null;
    amount: number;
    isEquipped?: boolean;
  }>;
};

export type ClientDropItemMessage = {
  type: "drop_item";
  inventorySlot: number;
  amount: number;
};

export type ClientDropGoldMessage = {
  type: "drop_gold";
  amount: number;
};

export type ClientPickupWorldItemMessage = {
  type: "pickup_world_item";
};

export type ClientReviveMessage = {
  type: "revive";
  /** priest = sacerdote (/hogar o NPC); ally = revivir de aliado. */
  source: "priest" | "ally";
  /** Posición del cliente al revivir (sacerdote / hogar). */
  tileX?: number;
  tileY?: number;
  mapId?: string;
};

export type ClientMessage =
  | ClientJoinMessage
  | ClientMoveMessage
  | ClientChatMessage
  | ClientAttackMessage
  | ClientCastSpellMessage
  | ClientAdminCommandMessage
  | ClientUseItemMessage
  | ClientEquipItemMessage
  | ClientSyncInventoryMessage
  | ClientDropItemMessage
  | ClientDropGoldMessage
  | ClientPickupWorldItemMessage
  | ClientReviveMessage;

export type NetInventorySlotState = {
  slotIndex: number;
  itemId: string | null;
  amount: number;
  isEquipped?: boolean;
};

export type ServerWelcomeMessage = {
  type: "welcome";
  playerId: string;
  mapId: string;
  /** Estado autoritativo del personaje (posición, vitales, equipo). */
  player: NetPlayerState;
  /** Inventario autoritativo del servidor tras el join. */
  inventory?: NetInventorySlotState[];
  gold?: number;
};

export type ServerWorldSnapshotMessage = {
  type: "world_snapshot";
  snapshot: WorldSnapshot;
};

export type ServerPlayerJoinedMessage = {
  type: "player_joined";
  player: NetPlayerState;
};

export type ServerPlayerLeftMessage = {
  type: "player_left";
  playerId: string;
};

export type ServerPlayerMovedMessage = {
  type: "player_moved";
  player: NetPlayerState;
};

export type ServerPlayerUpdatedMessage = {
  type: "player_updated";
  player: NetPlayerState;
};

export type ServerMobUpdatedMessage = {
  type: "mob_updated";
  mob: NetMobState;
};

export type ServerMobLeftMessage = {
  type: "mob_left";
  mobId: string;
};

export type ServerChatMessage = {
  type: "chat";
  from: string;
  text: string;
};

export type ServerCombatLogMessage = {
  type: "combat_log";
  text: string;
};

export type ServerGameEventMessage = {
  type: "game_event";
  event: GameEvent;
};

export type ServerPlayerDiedMessage = {
  type: "player_died";
  playerId: string;
  killerName: string;
};

export type ServerErrorCode = "character_already_online";

export type ServerErrorMessage = {
  type: "error";
  message: string;
  code?: ServerErrorCode;
};

export type ServerUseItemAckMessage = {
  type: "use_item_ack";
  itemId: string;
  inventorySlot?: number;
  hp?: number;
  mp?: number;
  attributeBuffs?: { strength: number; agility: number };
  buffExpiresAtMs?: number;
  message: string;
  /** El cliente debe resolver el efecto (p. ej. scrolls). */
  clientOnly?: boolean;
};

export type ServerInventoryUpdatedMessage = {
  type: "inventory_updated";
  inventory: NetInventorySlotState[];
  gold?: number;
};

export type ServerWorldItemSpawnedMessage = {
  type: "world_item_spawned";
  mapId: string;
  item: import("./types").NetWorldItemState;
};

export type ServerWorldItemUpdatedMessage = {
  type: "world_item_updated";
  mapId: string;
  item: import("./types").NetWorldItemState;
};

export type ServerWorldItemRemovedMessage = {
  type: "world_item_removed";
  mapId: string;
  worldItemId: string;
};

export type ServerMessage =
  | ServerWelcomeMessage
  | ServerWorldSnapshotMessage
  | ServerPlayerJoinedMessage
  | ServerPlayerLeftMessage
  | ServerPlayerMovedMessage
  | ServerPlayerUpdatedMessage
  | ServerMobUpdatedMessage
  | ServerMobLeftMessage
  | ServerChatMessage
  | ServerCombatLogMessage
  | ServerGameEventMessage
  | ServerPlayerDiedMessage
  | ServerUseItemAckMessage
  | ServerInventoryUpdatedMessage
  | ServerWorldItemSpawnedMessage
  | ServerWorldItemUpdatedMessage
  | ServerWorldItemRemovedMessage
  | ServerErrorMessage;

export function parseClientMessage(raw: string): ClientMessage | null {
  try {
    const data = JSON.parse(raw) as ClientMessage;
    if (!data || typeof data !== "object" || !("type" in data)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function parseServerMessage(raw: string): ServerMessage | null {
  try {
    const data = JSON.parse(raw) as ServerMessage;
    if (!data || typeof data !== "object" || !("type" in data)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function facingFromDirection(direction: MoveDirectionId): Facing {
  return direction;
}

export function deltaFromDirection(direction: MoveDirectionId): { dx: number; dy: number } {
  if (direction === "up") return { dx: 0, dy: -1 };
  if (direction === "down") return { dx: 0, dy: 1 };
  if (direction === "left") return { dx: -1, dy: 0 };
  return { dx: 1, dy: 0 };
}
