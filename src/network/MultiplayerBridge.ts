import type Phaser from "phaser";
import type {
  ClientMessage,
  NetInventorySlotState,
  ServerWelcomeMessage,
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
import { isMultiplayerEnabled } from "./multiplayerConfig";
import { buildAuthenticatedWsUrl, clearAuthSession } from "./authApi";
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
  onChatBubble?: (playerId: string, text: string) => void;
  onCombatLine: (text: string) => void;
  onWelcome: (welcome: ServerWelcomeMessage) => void;
  onSnapshot: (snapshot: WorldSnapshot) => void;
  onPlayerJoined: (player: NetPlayerState) => void;
  onPlayerLeft: (playerId: string) => void;
  onPlayerMoved: (player: NetPlayerState) => void;
  onPlayerUpdated: (player: NetPlayerState) => void;
  onMobUpdated: (mob: NetMobState) => void;
  onMobLeft: (mobId: string) => void;
  onGameEvent: (event: GameEvent) => void;
  onPlayerDied: (playerId: string, killerId: string, killerName: string) => void;
  onUseItemAck: (ack: ServerUseItemAckMessage) => void;
  onInventoryUpdated: (
    inventory: NetInventorySlotState[] | undefined,
    gold?: number
  ) => void;
  onBankUpdated: (
    bankGold: number,
    bankInventory: Array<{ slotIndex: number; itemId: string | null; amount: number }>
  ) => void;
  onSpellsUpdated: (learnedSpellIds: number[]) => void;
  onPlayerProgressUpdated: (exp: number, expToNext: number, level: number) => void;
  onWorldItemSpawned: (mapId: string, item: NetWorldItemState) => void;
  onWorldItemUpdated: (mapId: string, item: NetWorldItemState) => void;
  onWorldItemRemoved: (mapId: string, worldItemId: string) => void;
  onPartyUpdate?: (message: import("../../shared/protocol").ServerPartyUpdateMessage) => void;
  onPartyInviteRequest?: (message: import("../../shared/protocol").ServerPartyInviteRequestMessage) => void;
  onAuctionCatalog?: (auctions: import("../../shared/types").NetAuctionState[]) => void;
  getJoinPayload: () => MultiplayerJoinPayload;

  getWorldInteractiveCursor?: () => string;
  onCharacterAlreadyOnline?: (message: string) => void;
  onLogoutComplete?: () => void;
  onPong?: (latency: number) => void;
};

/**
 * Ciclo de vida WS + jugadores remotos. La escena implementa reacciones de juego vía callbacks.
 */
export class MultiplayerBridge {
  private networkClient: NetworkClient | null = null;
  private remotePlayers: RemotePlayerManager | null = null;
  private playerId: string | null = null;
  private spawnSynced = false;
  private skipNextDisconnectNotice = false;
  private joinRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private joinRetryCount = 0;
  private hasShownReconnectNotice = false;

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
      this.uiCamera,
      () => this.callbacks.getWorldInteractiveCursor?.() ?? "pointer"
    );

    const wsUrl = buildAuthenticatedWsUrl();
    this.networkClient = new NetworkClient(
      wsUrl,
      {
      onConnected: () => {
        this.callbacks.onStatus("Conectando al servidor...");
        this.requestJoin();
        this.startJoinRetryLoop();
      },
      onDisconnected: ({ code, reason, willReconnect }) => {
        this.clearJoinRetryLoop();
        this.playerId = null;
        this.spawnSynced = false;
        this.remotePlayers?.clear();
        if (this.skipNextDisconnectNotice) {
          this.skipNextDisconnectNotice = false;
          return;
        }
        if (willReconnect) {
          this.callbacks.onStatus("Reconectando al servidor...");
          if (this.hasShownReconnectNotice) {
            return;
          }
          this.hasShownReconnectNotice = true;
          this.callbacks.onChatLine(
            "Perdiste la conexión con el servidor. Reintentando automáticamente..."
          );
          return;
        }
        if (code === 4003) {
          this.skipNextDisconnectNotice = true;
          return;
        }
        if (code === 4001) {
          clearAuthSession();
          this.callbacks.onStatus("Sesion expirada");
          this.callbacks.onChatLine("Tu sesion expiro o la cuenta ya no existe. Volve a iniciar sesion.");
          return;
        }
        this.callbacks.onStatus("Desconectado del servidor");
        if (code === 1006 && !reason.trim()) {
          this.callbacks.onChatLine(
            "No se pudo reconectar con el servidor. Cuando vuelva a estar online, refresca o reingresa al personaje."
          );
          return;
        }
        const detail =
          code === 4002
            ? " (personaje ya conectado en otra pestaña)"
            : reason.trim()
              ? ` (${reason.trim()})`
              : code > 0
                ? ` (código ${code})`
                : "";
        this.callbacks.onChatLine(`Perdiste la conexión con el servidor${detail}.`);
      },
      onWelcome: (welcome) => {
        this.clearJoinRetryLoop();
        this.hasShownReconnectNotice = false;
        this.playerId = welcome.playerId;
        this.callbacks.onWelcome(welcome);
        this.callbacks.onStatus(`Online — ${welcome.mapId}`);
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
      onPlayerDied: (playerId, killerId, killerName) =>
        this.callbacks.onPlayerDied(playerId, killerId, killerName),
      onUseItemAck: (ack) => this.callbacks.onUseItemAck(ack),
      onInventoryUpdated: (inventory, gold) =>
        this.callbacks.onInventoryUpdated(inventory, gold),
      onBankUpdated: (bankGold, bankInventory) =>
        this.callbacks.onBankUpdated(bankGold, bankInventory),
      onSpellsUpdated: (learnedSpellIds) =>
        this.callbacks.onSpellsUpdated(learnedSpellIds),
      onPlayerProgressUpdated: (exp, expToNext, level) =>
        this.callbacks.onPlayerProgressUpdated(exp, expToNext, level),
      onWorldItemSpawned: (mapId, item) =>
        this.callbacks.onWorldItemSpawned(mapId, item),
      onWorldItemUpdated: (mapId, item) =>
        this.callbacks.onWorldItemUpdated(mapId, item),
      onWorldItemRemoved: (mapId, worldItemId) =>
        this.callbacks.onWorldItemRemoved(mapId, worldItemId),
      onPartyUpdate: (message) => this.callbacks.onPartyUpdate?.(message),
      onPartyInviteRequest: (message) => this.callbacks.onPartyInviteRequest?.(message),
      onLogoutComplete: () => this.callbacks.onLogoutComplete?.(),
      onChat: (from, text, fromPlayerId) => {
        this.callbacks.onChatLine(`${from}: ${text}`);
        if (fromPlayerId) {
          this.callbacks.onChatBubble?.(fromPlayerId, text);
        }
      },
      onError: (message, code) => {
        if (code === "character_already_online") {
          this.skipNextDisconnectNotice = true;
          this.callbacks.onCharacterAlreadyOnline?.(message);
          return;
        }
        this.callbacks.onStatus(message);
        this.callbacks.onChatLine(message);
      },
    },
    { autoReconnect: true }
    );

    registerMultiplayerClient(this.networkClient);
    this.networkClient.connect();
    this.callbacks.onStatus("Conectando...");
  }

  disconnect() {
    this.clearJoinRetryLoop();
    if (this.networkClient) {
      unregisterMultiplayerClient(this.networkClient);
      this.networkClient = null;
    }
    this.remotePlayers?.clear();
    this.remotePlayers = null;
    this.playerId = null;
    this.spawnSynced = false;
    this.skipNextDisconnectNotice = false;
    this.hasShownReconnectNotice = false;
  }

  isActive() {
    return Boolean(this.networkClient?.isConnected() && this.playerId);
  }

  sendPing() {
    this.networkClient?.sendPing();
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

  private sendIfJoined(send: (client: NetworkClient) => void) {
    if (!this.isActive() || !this.networkClient) {
      return;
    }
    send(this.networkClient);
  }

  requestJoin() {
    if (!this.networkClient?.isConnected()) {
      return;
    }
    try {
      const payload = this.callbacks.getJoinPayload();
      console.info("[multiplayer] sending join", {
        name: payload.name,
        characterId: payload.characterId,
        mapId: payload.mapId,
        isNewCharacter: payload.isNewCharacter,
      });
      this.networkClient.sendJoin(payload);
    } catch (error) {
      console.error("[multiplayer] failed to build/send join payload:", error);
      this.callbacks.onStatus("Error preparando conexion");
      this.callbacks.onChatLine(
        "No se pudo preparar la entrada al servidor. Revisa la consola para mas detalles."
      );
      this.networkClient.disconnect();
    }
  }

  private startJoinRetryLoop() {
    this.clearJoinRetryLoop();
    this.joinRetryCount = 0;

    const retry = () => {
      if (!this.networkClient?.isConnected() || this.playerId) {
        this.clearJoinRetryLoop();
        return;
      }
      if (this.joinRetryCount >= 2) {
        this.clearJoinRetryLoop();
        return;
      }

      this.joinRetryCount += 1;
      console.info("[multiplayer] retrying join", { attempt: this.joinRetryCount });
      this.requestJoin();
      this.joinRetryTimer = setTimeout(retry, 4_000);
    };

    this.joinRetryTimer = setTimeout(retry, 4_000);
  }

  private clearJoinRetryLoop() {
    if (this.joinRetryTimer) {
      clearTimeout(this.joinRetryTimer);
      this.joinRetryTimer = null;
    }
    this.joinRetryCount = 0;
  }

  sendMove(facing: Facing) {
    this.sendIfJoined((client) => client.sendMove(facing));
  }

  sendChat(message: string) {
    this.sendIfJoined((client) => client.sendChat(message));
  }

  sendAttack(facing: Facing) {
    this.sendIfJoined((client) => client.sendAttack(facing));
  }

  sendCastSpell(spellId: number, tileX: number, tileY: number, targetPlayerId?: string) {
    this.sendIfJoined((client) => client.sendCastSpell(spellId, tileX, tileY, targetPlayerId));
  }

  sendRevive(source: "priest" | "ally", tileX?: number, tileY?: number, mapId?: string) {
    this.sendIfJoined((client) => client.sendRevive(source, tileX, tileY, mapId));
  }

  sendInteractMap(tileX: number, tileY: number) {
    this.sendIfJoined((client) => client.sendInteractMap(tileX, tileY));
  }

  sendSuicide() {
    this.sendIfJoined((client) => client.sendSuicide());
  }

  sendBecomeRenegade() {
    this.sendIfJoined((client) => client.sendBecomeRenegade());
  }

  sendAdminCommand(command: string, args: string[]) {
    this.sendIfJoined((client) => client.sendAdminCommand(command, args));
  }

  sendUseItem(itemId: string, inventorySlot?: number) {
    this.sendIfJoined((client) => client.sendUseItem(itemId, inventorySlot));
  }

  sendSyncVitals(patch: { hp?: number; mp?: number }) {
    this.sendIfJoined((client) => client.sendSyncVitals(patch));
  }

  sendEquipItem(
    action: "equip" | "unequip",
    options: {
      inventorySlot?: number;
      itemId?: string;
      equipSlot?: "weapon" | "shield" | "helmet" | "armor";
    }
  ) {
    this.sendIfJoined((client) => client.sendEquipItem(action, options));
  }

  sendSyncInventory(
    inventory: Array<{
      slotIndex: number;
      itemId: string | null;
      amount: number;
      isEquipped?: boolean;
    }>
  ) {
    this.sendIfJoined((client) => client.sendSyncInventory(inventory));
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
    this.sendIfJoined((client) => client.sendSyncBank(bankGold, bankInventory, gold));
  }

  sendDropItem(inventorySlot: number, amount: number) {
    this.sendIfJoined((client) => client.sendDropItem(inventorySlot, amount));
  }

  sendDropGold(amount: number) {
    this.sendIfJoined((client) => client.sendDropGold(amount));
  }

  sendPickupWorldItem() {
    this.sendIfJoined((client) => client.sendPickupWorldItem());
  }

  sendBankAction(
    action: Extract<ClientMessage, { type: "bank_action" }>["action"],
    amount: number,
    slotIndex?: number
  ) {
    this.sendIfJoined((client) => client.sendBankAction(action, amount, slotIndex));
  }

  sendShopBuy(role: Extract<ClientMessage, { type: "shop_buy" }>["role"], itemId: string, amount: number) {
    this.sendIfJoined((client) => client.sendShopBuy(role, itemId, amount));
  }

  sendShopSell(role: Extract<ClientMessage, { type: "shop_sell" }>["role"], inventorySlot: number, amount: number) {
    this.sendIfJoined((client) => client.sendShopSell(role, inventorySlot, amount));
  }

  sendSpellShopBuy(spellId: number) {
    this.sendIfJoined((client) => client.sendSpellShopBuy(spellId));
  }

  sendMeditation(active: boolean) {
    this.sendIfJoined((client) => client.sendMeditation(active));
  }

  sendAuctionFetch() {
    this.sendIfJoined((client) => client.sendAuctionFetch());
  }

  sendAuctionList(inventorySlot: number, amount: number, price: number, durationHours: number) {
    this.sendIfJoined((client) => client.sendAuctionList(inventorySlot, amount, price, durationHours));
  }

  sendAuctionBuy(auctionId: string) {
    this.sendIfJoined((client) => client.sendAuctionBuy(auctionId));
  }

  sendAuctionCancel(auctionId: string) {
    this.sendIfJoined((client) => client.sendAuctionCancel(auctionId));
  }

  sendRequestLogout() {
    this.sendIfJoined((client) => client.sendRequestLogout());
  }


  sendPartyAction(
    action: Extract<import("../../shared/protocol").ClientMessage, { type: "party_action" }>["action"],
    targetName?: string,
    leaderId?: string,
    targetId?: string
  ) {
    this.sendIfJoined((client) => client.sendPartyAction(action, targetName, leaderId, targetId));
  }

  updateRemote(player: NetPlayerState, mapId: string) {
    if (!this.playerId) return;
    this.remotePlayers?.updateRemote(player, this.playerId, mapId);
  }

  getRemotePlayerSprite(id: string): Phaser.GameObjects.Sprite | undefined {
    return this.remotePlayers?.getPlayerSprite(id);
  }

  syncFromSnapshot(players: NetPlayerState[], mapId: string) {
    if (!this.playerId) return;
    this.remotePlayers?.syncFromSnapshot(players, this.playerId, mapId);
  }
}
