import type Phaser from "phaser";
import type {
  ClientMessage,
  NetInventorySlotState,
  ServerUseItemAckMessage,
} from "../../shared/protocol";
import type {
  Facing,
  GameEvent,
  NetMobState,
  NetPlayerState,
  NetWorldItemState,
  WorldSnapshot,
} from "../../shared/types";
import { NetworkClient } from "./NetworkClient";
import { getMultiplayerWsUrl, isMultiplayerEnabled } from "./multiplayerConfig";
import {
  disconnectActiveMultiplayer,
  registerMultiplayerClient,
  unregisterMultiplayerClient,
} from "./multiplayerSession";
import { RemotePlayerManager } from "./RemotePlayerManager";

export type MultiplayerJoinPayload = Omit<Extract<ClientMessage, { type: "join" }>, "type">;

export type MultiplayerBridgeCallbacks = {
  onStatus: (message: string) => void;
  onChatLine: (text: string) => void;
  onCombatLine: (text: string) => void;
  onWelcome: (
    playerId: string,
    mapId: string,
    player: NetPlayerState | null,
    inventory: NetInventorySlotState[] | undefined,
    gold?: number
  ) => void;
  onSnapshot: (snapshot: WorldSnapshot) => void;
  onPlayerJoined: (player: NetPlayerState) => void;
  onPlayerLeft: (playerId: string) => void;
  onPlayerMoved: (player: NetPlayerState) => void;
  onPlayerUpdated: (player: NetPlayerState) => void;
  onMobUpdated: (mob: NetMobState) => void;
  onMobLeft: (mobId: string) => void;
  onGameEvent: (event: GameEvent) => void;
  onPlayerDied: (playerId: string, killerName: string) => void;
  onUseItemAck: (ack: ServerUseItemAckMessage) => void;
  onInventoryUpdated: (
    inventory: NetInventorySlotState[] | undefined,
    gold?: number
  ) => void;
  onWorldItemSpawned: (mapId: string, item: NetWorldItemState) => void;
  onWorldItemUpdated: (mapId: string, item: NetWorldItemState) => void;
  onWorldItemRemoved: (mapId: string, worldItemId: string) => void;
  getJoinPayload: () => MultiplayerJoinPayload;
};

/**
 * Ciclo de vida WS + jugadores remotos. La escena implementa reacciones de juego vía callbacks.
 */
export class MultiplayerBridge {
  private networkClient: NetworkClient | null = null;
  private remotePlayers: RemotePlayerManager | null = null;
  private playerId: string | null = null;
  private spawnSynced = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depthFromFeetY: (feetY: number) => number,
    private readonly uiCamera: Phaser.Cameras.Scene2D.Camera,
    private readonly callbacks: MultiplayerBridgeCallbacks
  ) {}

  connect() {
    if (!isMultiplayerEnabled()) {
      this.callbacks.onStatus("Solo (multijugador desactivado)");
      return;
    }

    disconnectActiveMultiplayer();

    this.remotePlayers = new RemotePlayerManager(
      this.scene,
      (feetY) => this.depthFromFeetY(feetY),
      this.uiCamera
    );

    const wsUrl = getMultiplayerWsUrl();
    this.networkClient = new NetworkClient(wsUrl, {
      onConnected: () => {
        this.callbacks.onStatus("Conectando al servidor...");
        this.requestJoin();
      },
      onDisconnected: () => {
        this.playerId = null;
        this.spawnSynced = false;
        this.remotePlayers?.clear();
        this.callbacks.onStatus("Desconectado del servidor");
        this.callbacks.onChatLine("Perdiste la conexión con el servidor.");
      },
      onWelcome: (playerId, mapId, player, inventory, gold) => {
        this.playerId = playerId;
        this.callbacks.onWelcome(playerId, mapId, player, inventory, gold);
        this.callbacks.onStatus(`Online — ${mapId}`);
        this.callbacks.onChatLine("Conectado al servidor multijugador.");
      },
      onSnapshot: (snapshot) => this.callbacks.onSnapshot(snapshot),
      onPlayerJoined: (player) => {
        if (!this.playerId) return;
        this.callbacks.onPlayerJoined(player);
      },
      onPlayerLeft: (playerId) => {
        this.remotePlayers?.removeRemote(playerId);
        this.callbacks.onPlayerLeft(playerId);
      },
      onPlayerMoved: (player) => {
        if (!this.playerId) return;
        this.callbacks.onPlayerMoved(player);
      },
      onPlayerUpdated: (player) => this.callbacks.onPlayerUpdated(player),
      onMobUpdated: (mob) => this.callbacks.onMobUpdated(mob),
      onMobLeft: (mobId) => this.callbacks.onMobLeft(mobId),
      onCombatLog: (text) => this.callbacks.onCombatLine(text),
      onGameEvent: (event) => this.callbacks.onGameEvent(event),
      onPlayerDied: (playerId, killerName) =>
        this.callbacks.onPlayerDied(playerId, killerName),
      onUseItemAck: (ack) => this.callbacks.onUseItemAck(ack),
      onChat: (from, text) => {
        this.callbacks.onChatLine(`${from}: ${text}`);
      },
      onError: (message) => {
        this.callbacks.onStatus(message);
        this.callbacks.onChatLine(message);
      },
    });

    registerMultiplayerClient(this.networkClient);
    this.networkClient.connect();
    this.callbacks.onStatus("Conectando...");
  }

  disconnect() {
    if (this.networkClient) {
      unregisterMultiplayerClient(this.networkClient);
    }
    this.networkClient = null;
    this.remotePlayers?.clear();
    this.remotePlayers = null;
    this.playerId = null;
    this.spawnSynced = false;
  }

  isActive() {
    return Boolean(this.networkClient?.isConnected() && this.playerId);
  }

  isConnected() {
    return Boolean(this.networkClient?.isConnected());
  }

  getPlayerId() {
    return this.playerId;
  }

  getSpawnSynced() {
    return this.spawnSynced;
  }

  setSpawnSynced(value: boolean) {
    this.spawnSynced = value;
  }

  getRemotePlayers() {
    return this.remotePlayers;
  }

  requestJoin() {
    if (!this.networkClient?.isConnected()) {
      return;
    }
    this.networkClient.sendJoin(this.callbacks.getJoinPayload());
  }

  sendMove(facing: Facing) {
    this.networkClient?.sendMove(facing);
  }

  sendChat(message: string) {
    this.networkClient?.sendChat(message);
  }

  sendAttack(facing: Facing) {
    this.networkClient?.sendAttack(facing);
  }

  sendCastSpell(spellId: number, tileX: number, tileY: number) {
    this.networkClient?.sendCastSpell(spellId, tileX, tileY);
  }

  sendAdminCommand(command: string, args: string[]) {
    this.networkClient?.sendAdminCommand(command, args);
  }

  sendUseItem(itemId: string, inventorySlot?: number) {
    this.networkClient?.sendUseItem(itemId, inventorySlot);
  }

  sendEquipItem(
    action: "equip" | "unequip",
    options: {
      inventorySlot?: number;
      itemId?: string;
      equipSlot?: "weapon" | "shield" | "helmet" | "armor";
    }
  ) {
    this.networkClient?.sendEquipItem(action, options);
  }

  sendSyncInventory(
    inventory: Array<{
      slotIndex: number;
      itemId: string | null;
      amount: number;
      isEquipped?: boolean;
    }>
  ) {
    this.networkClient?.sendSyncInventory(inventory);
  }

  sendDropItem(inventorySlot: number, amount: number) {
    this.networkClient?.sendDropItem(inventorySlot, amount);
  }

  sendDropGold(amount: number) {
    this.networkClient?.sendDropGold(amount);
  }

  sendPickupWorldItem() {
    this.networkClient?.sendPickupWorldItem();
  }

  updateRemote(player: NetPlayerState, mapId: string) {
    if (!this.playerId) return;
    this.remotePlayers?.updateRemote(player, this.playerId, mapId);
  }

  syncFromSnapshot(players: NetPlayerState[], mapId: string) {
    if (!this.playerId) return;
    this.remotePlayers?.syncFromSnapshot(players, this.playerId, mapId);
  }
}
