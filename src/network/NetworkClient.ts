import type {
  ClientMessage,
  NetInventorySlotState,
  ServerMessage,
  ServerPartyInviteRequestMessage,
  ServerPartyUpdateMessage,
  ServerUseItemAckMessage,
  ServerWelcomeMessage,
} from "../../shared/protocol";
import { parseServerMessage } from "../../shared/protocol";
import type {
  Facing,
  GameEvent,
  NetMobState,
  NetPlayerState,
  NetWorldItemState,
  WorldSnapshot,
} from "../../shared/types";
import {
  normalizeNetMobState,
  normalizeNetPlayerState,
  normalizeNetWorldItemState,
  normalizeWorldSnapshot,
} from "../../shared/types";

export type NetworkClientHandlers = {
  onConnected?: () => void;
  onDisconnected?: (info: { code: number; reason: string; willReconnect: boolean }) => void;
  onWelcome?: (welcome: ServerWelcomeMessage) => void;
  onSnapshot?: (snapshot: WorldSnapshot) => void;
  onPlayerJoined?: (player: NetPlayerState) => void;
  onPlayerLeft?: (playerId: string) => void;
  onPlayerMoved?: (player: NetPlayerState) => void;
  onPlayerUpdated?: (player: NetPlayerState) => void;
  onMobUpdated?: (mob: NetMobState) => void;
  onMobLeft?: (mobId: string) => void;
  onChat?: (from: string, text: string, fromPlayerId?: string) => void;
  onCombatLog?: (text: string) => void;
  onGameEvent?: (event: GameEvent) => void;
  onPlayerDied?: (playerId: string, killerId: string, killerName: string) => void;
  onUseItemAck?: (ack: ServerUseItemAckMessage) => void;
  onInventoryUpdated?: (
    inventory: NetInventorySlotState[] | undefined,
    gold?: number
  ) => void;
  onBankUpdated?: (
    bankGold: number,
    bankInventory: Array<{ slotIndex: number; itemId: string | null; amount: number }>
  ) => void;
  onSpellsUpdated?: (learnedSpellIds: number[]) => void;
  onPlayerProgressUpdated?: (exp: number, expToNext: number, level: number) => void;
  onPartyUpdate?: (message: ServerPartyUpdateMessage) => void;
  onPartyInviteRequest?: (message: ServerPartyInviteRequestMessage) => void;
  onAuctionCatalog?: (auctions: import("../../shared/types").NetAuctionState[]) => void;
  onWorldItemSpawned?: (mapId: string, item: NetWorldItemState) => void;

  onWorldItemUpdated?: (mapId: string, item: NetWorldItemState) => void;
  onWorldItemRemoved?: (mapId: string, worldItemId: string) => void;
  onLogoutCountdown?: (secondsLeft: number) => void;
  onLogoutComplete?: () => void;
  onError?: (message: string, code?: string) => void;
  onPong?: (latency: number) => void;
};

export type NetworkClientOptions = {
  /** Reintenta conectar si la caída no fue intencional (cierre del cliente). */
  autoReconnect?: boolean;
};

const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 15_000];
const MAX_RECONNECT_ATTEMPTS = 6;
const NON_RECONNECT_CLOSE_CODES = new Set([4000, 4001, 4002, 4003, 4004]);

export class NetworkClient {
  private socket: WebSocket | null = null;
  private playerId: string | null = null;
  private handlers: NetworkClientHandlers;
  private intentionalClose = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly autoReconnect: boolean;

  constructor(
    private readonly url: string,
    handlers: NetworkClientHandlers = {},
    options: NetworkClientOptions = {}
  ) {
    this.handlers = handlers;
    this.autoReconnect = options.autoReconnect ?? false;
  }

  connect() {
    this.clearReconnectTimer();
    if (this.socket) {
      return;
    }

    this.intentionalClose = false;
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener("open", () => {
      if (this.socket !== socket) {
        socket.close();
        return;
      }
      this.reconnectAttempt = 0;
      this.handlers.onConnected?.();
    });

    socket.addEventListener("close", (event) => {
      if (this.socket !== socket) {
        return;
      }
      this.socket = null;
      this.playerId = null;
      const willReconnect =
        this.autoReconnect &&
        !this.intentionalClose &&
        !NON_RECONNECT_CLOSE_CODES.has(event.code) &&
        this.reconnectAttempt < MAX_RECONNECT_ATTEMPTS;
      this.handlers.onDisconnected?.({
        code: event.code,
        reason: event.reason,
        willReconnect,
      });
      if (willReconnect) {
        this.scheduleReconnect();
      }
    });

    socket.addEventListener("message", (event) => {
      if (this.socket !== socket) {
        return;
      }
      const message = parseServerMessage(String(event.data));
      if (!message) return;
      this.handleServerMessage(message);
    });

    socket.addEventListener("error", () => {
      if (this.socket !== socket) {
        return;
      }
      if (this.autoReconnect) {
        return;
      }
      this.handlers.onError?.("No se pudo conectar al servidor.");
    });
  }

  private scheduleReconnect() {
    this.clearReconnectTimer();
    const delay =
      RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.intentionalClose || this.socket) {
        return;
      }
      this.connect();
    }, delay);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  disconnect() {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    const socket = this.socket;
    this.socket = null;
    this.playerId = null;
    socket?.close();
  }

  isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  getPlayerId() {
    return this.playerId;
  }

  sendJoin(payload: Omit<Extract<ClientMessage, { type: "join" }>, "type">) {
    this.send({ type: "join", ...payload });
  }

  sendPing() {
    this.send({ type: "ping", timestamp: performance.now() });
  }

  sendMove(direction: Extract<ClientMessage, { type: "move" }>["direction"]) {
    this.send({ type: "move", direction });
  }

  sendChat(text: string) {
    this.send({ type: "chat", text });
  }

  sendBecomeRenegade() {
    this.send({ type: "become_renegade" });
  }

  sendAttack(facing?: Facing) {
    this.send(facing ? { type: "attack", facing } : { type: "attack" });
  }

  sendCastSpell(
    spellId: number,
    targetTileX: number,
    targetTileY: number,
    targetPlayerId?: string
  ) {
    const payload: {
      type: "cast_spell";
      spellId: number;
      targetTileX: number;
      targetTileY: number;
      targetPlayerId?: string;
    } = {
      type: "cast_spell",
      spellId: Math.floor(Number(spellId)),
      targetTileX: Math.floor(targetTileX),
      targetTileY: Math.floor(targetTileY),
    };
    if (targetPlayerId) {
      payload.targetPlayerId = targetPlayerId;
    }
    this.send(payload);
  }

  sendRevive(source: "priest" | "ally", tileX?: number, tileY?: number, mapId?: string) {
    this.send({ type: "revive", source, tileX, tileY, mapId });
  }

  sendInteractMap(tileX: number, tileY: number) {
    this.send({ type: "interact_map", tileX, tileY });
  }

  sendSuicide() {
    this.send({ type: "suicide" });
  }

  sendAdminCommand(command: string, args: string[]) {
    this.send({ type: "admin_command", command, args });
  }

  sendUseItem(itemId: string, inventorySlot?: number) {
    this.send({ type: "use_item", itemId, inventorySlot });
  }

  sendSyncVitals(patch: { hp?: number; mp?: number }) {
    this.send({ type: "sync_vitals", ...patch });
  }

  sendEquipItem(
    action: "equip" | "unequip",
    options: {
      inventorySlot?: number;
      itemId?: string;
      equipSlot?: "weapon" | "shield" | "helmet" | "armor";
    }
  ) {
    this.send({ type: "equip_item", action, ...options });
  }

  sendSyncInventory(
    inventory: Array<{
      slotIndex: number;
      itemId: string | null;
      amount: number;
      isEquipped?: boolean;
    }>
  ) {
    this.send({ type: "sync_inventory", inventory });
  }

  sendSyncBank(
    bankGold: number,
    bankInventory: Array<{
      slotIndex: number;
      itemId: string | null;
      amount: number;
    }>,
    gold?: number
  ) {
    this.send({
      type: "sync_bank",
      bankGold,
      bankInventory,
      ...(typeof gold === "number" && Number.isFinite(gold) ? { gold } : {}),
    });
  }

  sendDropItem(inventorySlot: number, amount: number) {
    this.send({ type: "drop_item", inventorySlot, amount });
  }

  sendDropGold(amount: number) {
    this.send({ type: "drop_gold", amount });
  }

  sendPickupWorldItem() {
    this.send({ type: "pickup_world_item" });
  }

  sendBankAction(
    action: Extract<ClientMessage, { type: "bank_action" }>["action"],
    amount: number,
    slotIndex?: number
  ) {
    this.send({ type: "bank_action", action, amount, slotIndex });
  }

  sendShopBuy(role: Extract<ClientMessage, { type: "shop_buy" }>["role"], itemId: string, amount: number) {
    this.send({ type: "shop_buy", role, itemId, amount });
  }

  sendShopSell(role: Extract<ClientMessage, { type: "shop_sell" }>["role"], inventorySlot: number, amount: number) {
    this.send({ type: "shop_sell", role, inventorySlot, amount });
  }

  sendSpellShopBuy(spellId: number) {
    this.send({ type: "spell_shop_buy", spellId });
  }

  sendMeditation(active: boolean) {
    this.send({ type: "meditation", active });
  }

  sendAuctionFetch() {
    this.send({ type: "auction_fetch" });
  }

  sendAuctionList(inventorySlot: number, amount: number, price: number, durationHours: number) {
    this.send({ type: "auction_list", inventorySlot, amount, price, durationHours });
  }

  sendAuctionBuy(auctionId: string) {
    this.send({ type: "auction_buy", auctionId });
  }

  sendAuctionCancel(auctionId: string) {
    this.send({ type: "auction_cancel", auctionId });
  }

  sendRequestLogout() {
    this.send({ type: "request_logout" });
  }


  sendPartyAction(
    action: Extract<ClientMessage, { type: "party_action" }>["action"],
    targetName?: string,
    leaderId?: string,
    targetId?: string
  ) {
    this.send({ type: "party_action", action, targetName, leaderId, targetId });
  }

  private send(message: ClientMessage) {
    if (!this.isConnected() || !this.socket) {
      return;
    }
    this.socket.send(JSON.stringify(message));
  }

  private handleServerMessage(message: ServerMessage) {
    if (message.type === "pong") {
      const latency = Math.max(1, Math.round(performance.now() - message.timestamp));
      this.handlers.onPong?.(latency);
      return;
    }
    if (message.type === "welcome") {
      const welcome = message as ServerWelcomeMessage;
      this.playerId = welcome.playerId;
      this.handlers.onWelcome?.(welcome);
      return;
    }
    if (message.type === "world_snapshot") {
      this.handlers.onSnapshot?.(normalizeWorldSnapshot(message.snapshot));
      return;
    }
    if (message.type === "player_joined") {
      const player = normalizeNetPlayerState(message.player);
      if (player) {
        this.handlers.onPlayerJoined?.(player);
      }
      return;
    }
    if (message.type === "player_left") {
      this.handlers.onPlayerLeft?.(message.playerId);
      return;
    }
    if (message.type === "player_moved") {
      const player = normalizeNetPlayerState(message.player);
      if (player) {
        this.handlers.onPlayerMoved?.(player);
      }
      return;
    }
    if (message.type === "player_updated") {
      const player = normalizeNetPlayerState(message.player);
      if (player) {
        this.handlers.onPlayerUpdated?.(player);
      }
      return;
    }
    if (message.type === "mob_updated") {
      const mob = normalizeNetMobState(message.mob);
      if (mob) {
        this.handlers.onMobUpdated?.(mob);
      }
      return;
    }
    if (message.type === "mob_left") {
      this.handlers.onMobLeft?.(message.mobId);
      return;
    }
    if (message.type === "chat") {
      this.handlers.onChat?.(message.from, message.text, message.fromPlayerId);
      return;
    }
    if (message.type === "combat_log") {
      this.handlers.onCombatLog?.(message.text);
      return;
    }
    if (message.type === "game_event") {
      this.handlers.onGameEvent?.(message.event);
      return;
    }
    if (message.type === "player_died") {
      this.handlers.onPlayerDied?.(message.playerId, message.killerId, message.killerName);
      return;
    }
    if (message.type === "use_item_ack") {
      this.handlers.onUseItemAck?.(message);
      return;
    }
    if (message.type === "inventory_updated") {
      this.handlers.onInventoryUpdated?.(message.inventory, message.gold);
      return;
    }
    if (message.type === "bank_updated") {
      this.handlers.onBankUpdated?.(message.bankGold, message.bankInventory);
      return;
    }
    if (message.type === "spells_updated") {
      this.handlers.onSpellsUpdated?.(message.learnedSpellIds);
      return;
    }
    if (message.type === "player_progress_updated") {
      this.handlers.onPlayerProgressUpdated?.(
        message.exp,
        message.expToNext,
        message.level
      );
      return;
    }
    if (message.type === "world_item_spawned") {
      const item = normalizeNetWorldItemState(message.item);
      if (item) {
        this.handlers.onWorldItemSpawned?.(message.mapId, item);
      }
      return;
    }
    if (message.type === "world_item_updated") {
      const item = normalizeNetWorldItemState(message.item);
      if (item) {
        this.handlers.onWorldItemUpdated?.(message.mapId, item);
      }
      return;
    }
    if (message.type === "world_item_removed") {
      this.handlers.onWorldItemRemoved?.(message.mapId, message.worldItemId);
      return;
    }
    if (message.type === "logout_countdown") {
      this.handlers.onLogoutCountdown?.(message.secondsLeft);
      return;
    }
    if (message.type === "logout_complete") {
      this.intentionalClose = true;
      this.clearReconnectTimer();
      this.handlers.onLogoutComplete?.();
      return;
    }
    if (message.type === "party_update") {
      this.handlers.onPartyUpdate?.(message);
      return;
    }
    if (message.type === "party_invite_request") {
      this.handlers.onPartyInviteRequest?.(message);
      return;
    }
    if (message.type === "auction_catalog") {
      this.handlers.onAuctionCatalog?.(message.auctions);
      return;
    }
    if (message.type === "error") {
      this.handlers.onError?.(message.message, message.code);
    }

  }
}

