import type {
  ClientMessage,
  NetInventorySlotState,
  ServerMessage,
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
  normalizeNetPlayerState,
  normalizeNetWorldItemState,
  normalizeWorldSnapshot,
} from "../../shared/types";

export type NetworkClientHandlers = {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onWelcome?: (
    playerId: string,
    mapId: string,
    player: NetPlayerState | null,
    inventory: NetInventorySlotState[] | undefined,
    gold?: number
  ) => void;
  onSnapshot?: (snapshot: WorldSnapshot) => void;
  onPlayerJoined?: (player: NetPlayerState) => void;
  onPlayerLeft?: (playerId: string) => void;
  onPlayerMoved?: (player: NetPlayerState) => void;
  onPlayerUpdated?: (player: NetPlayerState) => void;
  onMobUpdated?: (mob: NetMobState) => void;
  onMobLeft?: (mobId: string) => void;
  onChat?: (from: string, text: string) => void;
  onCombatLog?: (text: string) => void;
  onGameEvent?: (event: GameEvent) => void;
  onPlayerDied?: (playerId: string, killerName: string) => void;
  onUseItemAck?: (ack: ServerUseItemAckMessage) => void;
  onInventoryUpdated?: (
    inventory: NetInventorySlotState[] | undefined,
    gold?: number
  ) => void;
  onWorldItemSpawned?: (mapId: string, item: NetWorldItemState) => void;
  onWorldItemUpdated?: (mapId: string, item: NetWorldItemState) => void;
  onWorldItemRemoved?: (mapId: string, worldItemId: string) => void;
  onError?: (message: string) => void;
};

export class NetworkClient {
  private socket: WebSocket | null = null;
  private playerId: string | null = null;
  private handlers: NetworkClientHandlers;

  constructor(
    private readonly url: string,
    handlers: NetworkClientHandlers = {}
  ) {
    this.handlers = handlers;
  }

  connect() {
    if (this.socket) {
      return;
    }

    this.socket = new WebSocket(this.url);

    this.socket.addEventListener("open", () => {
      this.handlers.onConnected?.();
    });

    this.socket.addEventListener("close", () => {
      this.socket = null;
      this.playerId = null;
      this.handlers.onDisconnected?.();
    });

    this.socket.addEventListener("message", (event) => {
      const message = parseServerMessage(String(event.data));
      if (!message) return;
      this.handleServerMessage(message);
    });

    this.socket.addEventListener("error", () => {
      this.handlers.onError?.("No se pudo conectar al servidor.");
    });
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
    this.playerId = null;
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

  sendMove(direction: Extract<ClientMessage, { type: "move" }>["direction"]) {
    this.send({ type: "move", direction });
  }

  sendChat(text: string) {
    this.send({ type: "chat", text });
  }

  sendAttack(facing?: Facing) {
    this.send(facing ? { type: "attack", facing } : { type: "attack" });
  }

  sendCastSpell(spellId: number, targetTileX: number, targetTileY: number) {
    this.send({ type: "cast_spell", spellId, targetTileX, targetTileY });
  }

  sendRevive(source: "priest" | "ally", tileX?: number, tileY?: number, mapId?: string) {
    this.send({ type: "revive", source, tileX, tileY, mapId });
  }

  sendAdminCommand(command: string, args: string[]) {
    this.send({ type: "admin_command", command, args });
  }

  sendUseItem(itemId: string, inventorySlot?: number) {
    this.send({ type: "use_item", itemId, inventorySlot });
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

  sendDropItem(inventorySlot: number, amount: number) {
    this.send({ type: "drop_item", inventorySlot, amount });
  }

  sendDropGold(amount: number) {
    this.send({ type: "drop_gold", amount });
  }

  sendPickupWorldItem() {
    this.send({ type: "pickup_world_item" });
  }

  private send(message: ClientMessage) {
    if (!this.isConnected() || !this.socket) {
      return;
    }
    this.socket.send(JSON.stringify(message));
  }

  private handleServerMessage(message: ServerMessage) {
    if (message.type === "welcome") {
      const welcome = message as ServerWelcomeMessage;
      this.playerId = welcome.playerId;
      const player = normalizeNetPlayerState(welcome.player);
      this.handlers.onWelcome?.(
        welcome.playerId,
        welcome.mapId,
        player,
        welcome.inventory,
        welcome.gold
      );
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
      this.handlers.onMobUpdated?.(message.mob);
      return;
    }
    if (message.type === "mob_left") {
      this.handlers.onMobLeft?.(message.mobId);
      return;
    }
    if (message.type === "chat") {
      this.handlers.onChat?.(message.from, message.text);
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
      this.handlers.onPlayerDied?.(message.playerId, message.killerName);
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
    if (message.type === "error") {
      this.handlers.onError?.(message.message);
    }
  }
}
