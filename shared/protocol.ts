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
  bankGold?: number;
  bankInventory?: Array<{
    slotIndex: number;
    itemId: string | null;
    amount: number;
  }>;
  learnedSpellIds?: number[];
  exp?: number;
  expToNext?: number;
  /** Asesinatos de usuarios (progreso local; usado para ascensos de facción). */
  usersKilled?: number;
  /** Primera entrada al mundo con este personaje (sin progreso guardado aún). */
  isNewCharacter?: boolean;
};

export type ClientBecomeRenegadeMessage = {
  type: "become_renegade";
};

export type ClientRequestLogoutMessage = {
  type: "request_logout";
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
  /** Resucitar: id del jugador muerto (evita desync de tile con el fantasma). */
  targetPlayerId?: string;
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

export type ClientSyncBankMessage = {
  type: "sync_bank";
  bankGold: number;
  bankInventory: Array<{
    slotIndex: number;
    itemId: string | null;
    amount: number;
  }>;
  /** Oro en mano (cambia al depositar/retirar del banco). */
  gold?: number;
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

export type ClientBankActionMessage = {
  type: "bank_action";
  action: "deposit_item" | "withdraw_item" | "deposit_gold" | "withdraw_gold";
  slotIndex?: number;
  amount: number;
};

export type ClientShopBuyMessage = {
  type: "shop_buy";
  role: import("./npcData").MerchantRole;
  itemId: string;
  amount: number;
};

export type ClientShopSellMessage = {
  type: "shop_sell";
  role: import("./npcData").MerchantRole;
  inventorySlot: number;
  amount: number;
};

export type ClientSpellShopBuyMessage = {
  type: "spell_shop_buy";
  spellId: number;
};

export type ClientMeditationMessage = {
  type: "meditation";
  active: boolean;
};

export type ClientSuicideMessage = {
  type: "suicide";
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

export type ClientInteractMapMessage = {
  type: "interact_map";
  tileX: number;
  tileY: number;
};

/** Sincroniza vitales calculados en cliente (p. ej. meditación) con el servidor. */
export type ClientSyncVitalsMessage = {
  type: "sync_vitals";
  hp?: number;
  mp?: number;
};

export type ClientPartyActionMessage = {
  type: "party_action";
  action: "invite" | "accept" | "leave" | "dissolve" | "kick";
  targetName?: string;
  targetId?: string;
  leaderId?: string;
};

export type ClientAuctionListMessage = {
  type: "auction_list";
  inventorySlot: number;
  amount: number;
  price: number;
  durationHours: number;
};

export type ClientAuctionBuyMessage = {
  type: "auction_buy";
  auctionId: string;
};

export type ClientAuctionCancelMessage = {
  type: "auction_cancel";
  auctionId: string;
};

export type ClientAuctionFetchMessage = {
  type: "auction_fetch";
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
  | ClientSyncBankMessage
  | ClientDropItemMessage
  | ClientDropGoldMessage
  | ClientPickupWorldItemMessage
  | ClientBankActionMessage
  | ClientShopBuyMessage
  | ClientShopSellMessage
  | ClientSpellShopBuyMessage
  | ClientMeditationMessage
  | ClientSuicideMessage
  | ClientReviveMessage
  | ClientInteractMapMessage
  | ClientSyncVitalsMessage
  | ClientPartyActionMessage
  | ClientBecomeRenegadeMessage
  | ClientRequestLogoutMessage
  | ClientAuctionListMessage
  | ClientAuctionBuyMessage
  | ClientAuctionCancelMessage
  | ClientAuctionFetchMessage;


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
  bankGold?: number;
  bankInventory?: Array<{
    slotIndex: number;
    itemId: string | null;
    amount: number;
  }>;
  learnedSpellIds?: number[];
  exp?: number;
  expToNext?: number;
  level?: number;
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
  fromPlayerId?: string;
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
  killerId: string;
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
  navigationMode?: "boat" | null;
  message: string;
  /** El cliente debe resolver el efecto (p. ej. scrolls). */
  clientOnly?: boolean;
};

export type ServerInventoryUpdatedMessage = {
  type: "inventory_updated";
  inventory: NetInventorySlotState[];
  gold?: number;
};

export type ServerBankUpdatedMessage = {
  type: "bank_updated";
  bankGold: number;
  bankInventory: Array<{
    slotIndex: number;
    itemId: string | null;
    amount: number;
  }>;
};

export type ServerSpellsUpdatedMessage = {
  type: "spells_updated";
  learnedSpellIds: number[];
};

export type ServerPlayerProgressUpdatedMessage = {
  type: "player_progress_updated";
  exp: number;
  expToNext: number;
  level: number;
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

export type ServerLogoutCountdownMessage = {
  type: "logout_countdown";
  secondsLeft: number;
};

export type ServerLogoutCompleteMessage = {
  type: "logout_complete";
};

export type ServerPartyUpdateMessage = {
  type: "party_update";
  partyId: string | null;
  leaderId: string | null;
  members: Array<{ id: string; name: string; level: number; hp: number; hpMax: number }>;
};

export type ServerPartyInviteRequestMessage = {
  type: "party_invite_request";
  leaderId: string;
  leaderName: string;
};

export type ServerAuctionCatalogMessage = {
  type: "auction_catalog";
  auctions: import("./types").NetAuctionState[];
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
  | ServerBankUpdatedMessage
  | ServerSpellsUpdatedMessage
  | ServerPlayerProgressUpdatedMessage
  | ServerWorldItemSpawnedMessage
  | ServerWorldItemUpdatedMessage
  | ServerWorldItemRemovedMessage
  | ServerLogoutCountdownMessage
  | ServerLogoutCompleteMessage
  | ServerPartyUpdateMessage
  | ServerPartyInviteRequestMessage
  | ServerAuctionCatalogMessage
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
