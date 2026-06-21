import type Phaser from "phaser";
import { TILE_SIZE } from "../../config";
import { isAdminCharacterName, type PlayerRole } from "../../data/characters";
import type { ItemId } from "../../../game-data/items/definitions";
import { MultiplayerBridge } from "../../network/MultiplayerBridge";
import { tileToFeetWorld } from "../../player/playerSprites";
import type { NetInventorySlotState, ServerUseItemAckMessage } from "../../../shared/protocol";
import type {
  GameEvent,
  NetMobState,
  NetPlayerEquipment,
  NetPlayerState,
  NetWorldItemState,
  WorldSnapshot,
} from "../../../shared/types";
import { RESURRECT_REVIVE_HP_RATIO } from "../../../game-data/resurrect";
import type { Facing } from "../../player/playerSprites";
import type { MoveDirection } from "./types";
import {
  buildJoinBankSlots,
  buildJoinInventorySlots,
  buildMultiplayerJoinPayload,
} from "./multiplayerJoinPayload";
import { findTransition } from "../../../shared/maps";
import { normalizeNetPlayerState } from "../../../shared/types";
import type { ServerWelcomeMessage } from "../../../shared/protocol";
import { getSpellMagicWordsForCast } from "../../spells/spellMagicWords";

export type GameSceneMultiplayerDeps = {
  scene: Phaser.Scene;
  uiCamera: Phaser.Cameras.Scene2D.Camera;
  depthFromFeetY: (feetY: number) => number;

  getCurrentMapId: () => string;
  isChangingMap: () => boolean;
  getPlayerName: () => string;
  getCharacterId: () => string;
  getIsNewCharacterForJoin: () => boolean;
  getPlayerTile: () => { x: number; y: number };
  setPlayerTile: (tileX: number, tileY: number) => void;
  getFacing: () => Facing;
  setFacing: (facing: Facing) => void;
  isMoving: () => boolean;
  setIsMoving: (moving: boolean) => void;

  getSelectedRace: () => string;
  getSelectedGender: () => string;
  getSelectedClass: () => string;
  getSelectedFaction: () => string;
  getSelectedFaceIndex: () => number;
  getPlayerProgress: () => {
    level: number;
    hp: number;
    hpMax: number;
    mp: number;
    mpMax: number;
    gold: number;
    exp: number;
    expToNext: number;
  };
  getEquipment: () => {
    weapon: ItemId | null;
    shield: ItemId | null;
    helmet: ItemId | null;
    armor: ItemId | null;
  };
  getEquippedOutfit: () => string;
  getInventory: () => Array<{ itemId: ItemId; count: number } | null>;

  setMultiplayerStatus: (message: string) => void;
  addChatLine: (text: string) => void;
  addCombatLine: (text: string) => void;
  playLevelUpSound: () => void;
  playGoldDropSound: () => void;
  playAirHitSound: () => void;
  getWorldInteractiveCursor: () => string;
  syncWorldInteractiveCursors: () => void;

  syncLocalVitalsFromServer: (state: NetPlayerState | null | undefined) => void;
  syncLocalEquipmentFromServer: (state: NetPlayerState | null | undefined) => void;
  syncLocalInventoryFromServer: (
    slots: NetInventorySlotState[] | undefined,
    options?: { slotUiOnly?: boolean }
  ) => void;
  syncLocalGoldFromServer: (gold: number | undefined) => void;
  syncLocalProgressFromServer: (exp: number, expToNext: number, level: number) => void;
  syncLocalWelcomeExtras: (welcome: Partial<ServerWelcomeMessage>) => void;
  getBankState: () => { slots: Array<{ itemId: import("../../items/itemDefinitions").ItemId; count: number } | null>; gold: number };
  getLearnedSpellIds: () => number[];
  syncWorldItemsFromServer: (items: NetWorldItemState[] | null | undefined) => void;
  applyWorldItemSpawned: (mapId: string, item: NetWorldItemState) => void;
  applyWorldItemUpdated: (mapId: string, item: NetWorldItemState) => void;
  applyWorldItemRemoved: (mapId: string, worldItemId: string) => void;
  syncMobsFromServer: (mobs: NetMobState[] | null | undefined) => void;
  applyNetMobState: (mob: NetMobState) => void;
  applyNetMobLeft: (mobId: string) => void;
  handleServerPlayerDied: (playerId: string, killerId: string, killerName: string) => void;
  getUsersKilled: () => number;
  onCharacterAlreadyOnline: (message: string) => void;
  onLogoutComplete: () => void;
  setLatency: (latency: number) => void;
  handleServerUseItemAck: (ack: ServerUseItemAckMessage) => void;
  handleServerPlayerUpdated: (state: NetPlayerState) => void;
  handleServerPartyUpdate: (message: import("../../../shared/protocol").ServerPartyUpdateMessage) => void;
  handleServerPartyInviteRequest: (message: import("../../../shared/protocol").ServerPartyInviteRequestMessage) => void;
  onAuctionCatalog: (auctions: import("../../../shared/types").NetAuctionState[]) => void;

  applyServerPlayerRole: (serverRole?: PlayerRole) => void;

  isAdminCharacterName: (name: string) => boolean;

  snapLocalPlayerToTile: (state: NetPlayerState) => void;
  playFacingAnim: (state: "idle" | "walk") => void;
  isTileWalkable: (tileX: number, tileY: number) => boolean;
  isTileOccupiedByRemotePlayer: (tileX: number, tileY: number) => boolean;
  getLocalPlayerStepDurationMs: () => number;
  getPlayerFeetWorldForTile: (tileX: number, tileY: number) => { x: number; y: number };
  killAllLocalMobs: () => void;
  restoreLocalMobsAfterDisconnect: () => void;

  applyIncomingDamage: (amount: number, type: "physical" | "magic") => number;
  showDamageNumber: (
    x: number,
    y: number,
    amount: number,
    source: "player" | "mob"
  ) => void;
  showHealNumber: (
    x: number,
    y: number,
    amount: number,
    source: "player" | "mob"
  ) => void;
  playSpellEffect: (
    spellId: number,
    tileX: number,
    tileY: number,
    playSound?: boolean
  ) => void;
  playSpellEffectOnTarget: (
    spellId: number,
    target: Phaser.GameObjects.Sprite,
    playSound?: boolean
  ) => void;
  shouldPlayWorldSound: (
    sourceTileX: number,
    sourceTileY: number,
    sourcePlayerId?: string | null
  ) => boolean;
  playSpawnEffectAtTile: (tileX: number, tileY: number) => void;
  startResurrectChannelEffect: (
    casterId: string,
    tileX: number,
    tileY: number,
    endsAtMs: number
  ) => void;
  stopResurrectChannelEffect: (casterId: string) => void;
  getSuppressServerSpellFxUntil: () => number;
  showRemoteSpellMagicWords: (playerId: string, words: string) => void;
  showPlayerChatBubble: (playerId: string, text: string) => void;
  getPlayerSprite: () => Phaser.GameObjects.Sprite;
  getLocalPlayerId: () => string | null;
  applyLocalRevivedFromServer: (hp: number) => void;
  isPlayerDeadOrGhost: () => boolean;
  playFootstepSound: () => void;

  applyMapTransition: (
    transition: {
      toMapId: string;
      toTileX: number;
      toTileY: number;
      facing?: Facing;
    },
    options?: { silent?: boolean }
  ) => void;

  tweenPlayerTo: (
    target: { x: number; y: number },
    duration: number,
    onUpdate: () => void,
    onComplete: () => void
  ) => void;
  killPlayerTweens: () => void;
  setPlayerPosition: (x: number, y: number) => void;
  syncPlayerFacePosition: () => void;
  syncEquippedHeldItemVisuals: () => void;
  syncPlayerNameLabelPosition: () => void;
  refreshMapLocationLabel: () => void;
  refreshMinimap: () => void;
  updateDynamicMapObject: (tileX: number, tileY: number, objIndex: number) => void;

  playMobHitSoundForId: (mobId: string) => void;
  findDummyById: (id: string) => { alive: boolean; sprite: Phaser.GameObjects.Sprite } | null;
  tintDummySprite: (dummy: { sprite: Phaser.GameObjects.Sprite; alive: boolean }, tint: number) => void;
  clearDummyTint: (dummy: { sprite: Phaser.GameObjects.Sprite; alive: boolean }) => void;

  setPlayerHpZero: () => void;
  handlePlayerDeath: () => void;
};

/**
 * Multijugador: bridge WS, sync del jugador local y delegación de eventos del servidor.
 */
export class GameSceneMultiplayerController {
  private bridge: MultiplayerBridge | null = null;
  private networkMovePending = false;
  private syncInventoryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly deps: GameSceneMultiplayerDeps) {}

  getBridge(): MultiplayerBridge | null {
    return this.bridge;
  }

  isActive(): boolean {
    return Boolean(this.bridge?.isActive());
  }

  sendPing() {
    this.bridge?.sendPing();
  }

  isConnected(): boolean {
    return Boolean(this.bridge?.isConnected());
  }

  getPlayerId(): string | null {
    return this.bridge?.getPlayerId() ?? null;
  }

  getLocalPlayerId(): string | null {
    return this.getPlayerId();
  }

  sendPartyAction(
    action: Extract<import("../../../shared/protocol").ClientMessage, { type: "party_action" }>["action"],
    targetName?: string,
    leaderId?: string,
    targetId?: string
  ): void {
    this.bridge?.sendPartyAction(action, targetName, leaderId, targetId);
  }

  connect(): void {
    this.disconnect();
    this.bridge = new MultiplayerBridge(
      this.deps.scene,
      this.deps.depthFromFeetY,
      this.deps.uiCamera,
      {
        onStatus: (message) => this.deps.setMultiplayerStatus(message),
        onChatLine: (text) => this.deps.addChatLine(text),
        onChatBubble: (playerId, text) => this.deps.showPlayerChatBubble(playerId, text),
        onCombatLine: (text) => {
          if (/subiste al nivel/i.test(text)) {
            this.deps.playLevelUpSound();
          }
          if (/^tiraste .+ de oro/i.test(text)) {
            this.deps.playGoldDropSound();
          }
          if (text === "No hay nadie para golpear.") {
            this.deps.playAirHitSound();
          }
          if (text === "No tienes mana suficiente para lanzar ese hechizo") {
            this.deps.addChatLine(text);
          }
          this.deps.addCombatLine(text);
        },
        onWelcome: (welcome) => {
          const player = normalizeNetPlayerState(welcome.player);
          if (player) {
            this.onAuthoritativeJoin(
              player,
              welcome.mapId,
              welcome.inventory,
              welcome.gold,
              welcome
            );
          }
          if (player && this.deps.getCurrentMapId() !== welcome.mapId) {
            this.deps.addChatLine(
              "Multijugador online solo en Ullathorpe: fuiste movido al punto de entrada."
            );
          }
        },
        getWorldInteractiveCursor: () => this.deps.getWorldInteractiveCursor(),
        onSnapshot: (snapshot) => {
          this.onWorldSnapshot(snapshot);
          this.deps.syncWorldInteractiveCursors();
        },
        onPlayerJoined: (player) => {
          this.bridge?.updateRemote(player, this.deps.getCurrentMapId());
          this.deps.syncWorldInteractiveCursors();
        },
        onPlayerLeft: () => {},
        onPlayerMoved: (player) => this.onPlayerMoved(player),
        onPlayerUpdated: (player) => this.deps.handleServerPlayerUpdated(player),
        onMobUpdated: (mob) => this.deps.applyNetMobState(mob),
        onMobLeft: (mobId) => this.deps.applyNetMobLeft(mobId),
        onGameEvent: (event) => this.onGameEvent(event),
        onPlayerDied: (playerId, killerId, killerName) =>
          this.deps.handleServerPlayerDied(playerId, killerId, killerName),
        onCharacterAlreadyOnline: (message) =>
          this.deps.onCharacterAlreadyOnline(message),
        onLogoutComplete: () => this.deps.onLogoutComplete(),
        onPong: (latency) => this.deps.setLatency(latency),
        onUseItemAck: (ack) => this.deps.handleServerUseItemAck(ack),
        onAuctionCatalog: (auctions) => {
          this.deps.onAuctionCatalog(auctions);
        },
        onInventoryUpdated: (inventory, gold) => {

          this.deps.syncLocalInventoryFromServer(inventory, { slotUiOnly: true });
          this.deps.syncLocalGoldFromServer(gold);
        },
        onBankUpdated: (bankGold, bankInventory) => {
          this.deps.syncLocalWelcomeExtras({ bankGold, bankInventory });
        },
        onSpellsUpdated: (learnedSpellIds) => {
          this.deps.syncLocalWelcomeExtras({ learnedSpellIds });
        },
        onPlayerProgressUpdated: (exp, expToNext, level) => {
          this.deps.syncLocalProgressFromServer(exp, expToNext, level);
        },
        onWorldItemSpawned: (mapId, item) =>
          this.deps.applyWorldItemSpawned(mapId, item),
        onWorldItemUpdated: (mapId, item) =>
          this.deps.applyWorldItemUpdated(mapId, item),
        onWorldItemRemoved: (mapId, worldItemId) =>
          this.deps.applyWorldItemRemoved(mapId, worldItemId),
        onPartyUpdate: (message) => this.deps.handleServerPartyUpdate(message),
        onPartyInviteRequest: (message) => this.deps.handleServerPartyInviteRequest(message),
        getJoinPayload: () => {
          const progress = this.deps.getPlayerProgress();
          return buildMultiplayerJoinPayload({
            name: this.deps.getPlayerName(),
            characterId: this.deps.getCharacterId(),
            mapId: this.deps.getCurrentMapId(),
            raceId: this.deps.getSelectedRace(),
            genderId: this.deps.getSelectedGender(),
            classId: this.deps.getSelectedClass(),
            factionId: this.deps.getSelectedFaction(),
            faceIndex: this.deps.getSelectedFaceIndex(),
            tileX: this.deps.getPlayerTile().x,
            tileY: this.deps.getPlayerTile().y,
            facing: this.deps.getFacing(),
            level: progress.level,
            hp: progress.hp,
            hpMax: progress.hpMax,
            mp: progress.mp,
            mpMax: progress.mpMax,
            gold: progress.gold,
            bankGold: this.deps.getBankState().gold,
            bankInventory: buildJoinBankSlots(this.deps.getBankState().slots),
            learnedSpellIds: this.deps.getLearnedSpellIds(),
            exp: progress.exp,
            expToNext: progress.expToNext,
            usersKilled: this.deps.getUsersKilled(),
            isNewCharacter: this.deps.getIsNewCharacterForJoin(),
            equipment: this.buildJoinEquipmentPayload(),
            inventory: buildJoinInventorySlots(this.deps.getInventory()),
          });
        },
      }
    );
    this.bridge.connect();
  }

  disconnect(options?: { skipRestoreLocalMobs?: boolean }): void {
    this.networkMovePending = false;
    this.bridge?.disconnect();
    this.bridge = null;
    if (!options?.skipRestoreLocalMobs) {
      this.deps.restoreLocalMobsAfterDisconnect();
    }
  }

  syncServerInventoryIfActive(): void {
    if (!this.bridge?.isActive()) {
      return;
    }
    if (this.syncInventoryTimer) {
      clearTimeout(this.syncInventoryTimer);
    }
    this.syncInventoryTimer = setTimeout(() => {
      this.syncInventoryTimer = null;
      if (!this.bridge?.isActive()) return;
      this.bridge.sendSyncInventory(buildJoinInventorySlots(this.deps.getInventory()));
    }, 150);
  }

  syncServerBankIfActive(): void {
    if (!this.bridge?.isActive()) {
      return;
    }
    const bank = this.deps.getBankState();
    this.bridge.sendSyncBank(
      bank.gold,
      buildJoinBankSlots(bank.slots),
      this.deps.getPlayerProgress().gold
    );
  }

  getRemotePlayers() {
    return this.bridge?.getRemotePlayers();
  }

  sendAttack(facing: Facing) {
    this.bridge?.sendAttack(facing);
  }

  prepareForMapTransition(): void {
    this.networkMovePending = false;
    this.deps.killPlayerTweens();
    this.deps.setIsMoving(false);
  }

  tryNetworkStep(dir: MoveDirection): void {
    if (
      !this.isActive() ||
      this.deps.isChangingMap() ||
      this.deps.isMoving() ||
      this.networkMovePending
    ) {
      return;
    }

    const tile = this.deps.getPlayerTile();
    const nextX = tile.x + dir.dx;
    const nextY = tile.y + dir.dy;

    const isBlocked =
      !this.deps.isTileWalkable(nextX, nextY) ||
      (!this.deps.isPlayerDeadOrGhost() &&
        this.deps.isTileOccupiedByRemotePlayer(nextX, nextY));

    const transition = findTransition(this.deps.getCurrentMapId(), nextX, nextY, dir.facing, isBlocked);

    if (transition) {
      this.networkMovePending = true;
      this.deps.setFacing(dir.facing);
      this.bridge!.sendMove(dir.facing);
      return;
    }

    if (isBlocked) {
      if (this.deps.isMoving()) {
        this.deps.killPlayerTweens();
        this.deps.setIsMoving(false);
      }
      const facingChanged = this.deps.getFacing() !== dir.facing;
      if (facingChanged) {
        this.deps.setFacing(dir.facing);
        this.deps.playFacingAnim("idle");
        this.bridge!.sendMove(dir.facing);
      }
      return;
    }

    this.networkMovePending = true;
    this.startLocalStepTween(nextX, nextY, dir.facing);
    this.bridge!.sendMove(dir.facing);
  }

  /** Animación inmediata del paso (predicción cliente); el servidor confirma con player_moved. */
  private startLocalStepTween(tileX: number, tileY: number, facing: Facing): void {
    if (this.deps.isChangingMap()) {
      this.networkMovePending = false;
      this.deps.setPlayerTile(tileX, tileY);
      this.deps.setFacing(facing);
      this.snapLocalPlayerToTile({
        id: this.bridge?.getPlayerId() ?? "",
        tileX,
        tileY,
        facing,
        mapId: this.deps.getCurrentMapId(),
      } as NetPlayerState);
      return;
    }

    this.deps.killPlayerTweens();
    this.deps.setPlayerTile(tileX, tileY);
    this.deps.setFacing(facing);
    this.deps.setIsMoving(true);
    this.deps.playFootstepSound();
    this.deps.refreshMapLocationLabel();
    this.deps.refreshMinimap();
    const target = this.deps.getPlayerFeetWorldForTile(tileX, tileY);
    this.deps.playFacingAnim("walk");
    this.deps.tweenPlayerTo(
      target,
      this.deps.getLocalPlayerStepDurationMs(),
      () => {
        this.deps.syncPlayerFacePosition();
        this.deps.syncEquippedHeldItemVisuals();
      },
      () => {
        this.deps.setPlayerPosition(target.x, target.y);
        this.deps.syncPlayerFacePosition();
        this.deps.syncEquippedHeldItemVisuals();
        this.deps.setIsMoving(false);
        this.deps.playFacingAnim("idle");
        this.networkMovePending = false;
      }
    );
  }

  onAuthoritativeJoin(
    player: NetPlayerState,
    mapId: string,
    inventory?: NetInventorySlotState[],
    gold?: number,
    welcome?: Partial<ServerWelcomeMessage>
  ): void {
    this.deps.killAllLocalMobs();
    this.deps.syncLocalVitalsFromServer(player);
    this.deps.syncLocalEquipmentFromServer(player);
    this.deps.syncLocalInventoryFromServer(inventory);
    this.deps.syncLocalGoldFromServer(gold);
    if (welcome) {
      this.deps.syncLocalWelcomeExtras(welcome);
    }

    if (player.role || this.deps.isAdminCharacterName(this.deps.getPlayerName())) {
      this.deps.applyServerPlayerRole(player.role);
    }
    this.deps.handleServerPlayerUpdated(player);

    if (mapId !== this.deps.getCurrentMapId()) {
      this.deps.applyMapTransition(
        {
          toMapId: mapId,
          toTileX: player.tileX,
          toTileY: player.tileY,
          facing: player.facing,
        },
        { silent: true }
      );
    } else {
      this.snapLocalPlayerToTile(player);
    }
    this.bridge?.setSpawnSynced(true);
  }

  onWorldSnapshot(snapshot: WorldSnapshot): void {
    const localId = this.bridge?.getPlayerId();
    if (!localId || snapshot.mapId !== this.deps.getCurrentMapId()) {
      return;
    }
    const players = Array.isArray(snapshot.players) ? snapshot.players : [];
    const localState = players.find((player) => player.id === localId);
    if (localState) {
      this.syncLocalPlayerFromServer(localState);
      this.deps.syncLocalVitalsFromServer(localState);
      this.deps.syncLocalEquipmentFromServer(localState);
      if (localState.role || this.deps.isAdminCharacterName(this.deps.getPlayerName())) {
        this.deps.applyServerPlayerRole(localState.role);
      }
    }

    this.bridge?.syncFromSnapshot(players, this.deps.getCurrentMapId());
    this.deps.syncMobsFromServer(snapshot.mobs);
    this.deps.syncWorldItemsFromServer(snapshot.worldItems ?? null);
  }

  sendDropItem(inventorySlot: number, amount: number): void {
    this.bridge?.sendDropItem(inventorySlot, amount);
  }

  sendDropGold(amount: number): void {
    this.bridge?.sendDropGold(amount);
  }

  sendPickupWorldItem(): void {
    this.bridge?.sendPickupWorldItem();
  }

  sendBankAction(
    action: "deposit_item" | "withdraw_item" | "deposit_gold" | "withdraw_gold",
    amount: number,
    slotIndex?: number
  ): void {
    this.bridge?.sendBankAction(action, amount, slotIndex);
  }

  sendShopBuy(role: Extract<import("../../../shared/protocol").ClientMessage, { type: "shop_buy" }>["role"], itemId: string, amount: number): void {
    this.bridge?.sendShopBuy(role, itemId, amount);
  }

  sendShopSell(role: Extract<import("../../../shared/protocol").ClientMessage, { type: "shop_sell" }>["role"], inventorySlot: number, amount: number): void {
    this.bridge?.sendShopSell(role, inventorySlot, amount);
  }

  sendSpellShopBuy(spellId: number): void {
    this.bridge?.sendSpellShopBuy(spellId);
  }

  sendRevive(
    source: "priest" | "ally",
    tileX?: number,
    tileY?: number,
    mapId?: string
  ): void {
    this.bridge?.sendRevive(source, tileX, tileY, mapId);
  }

  sendBecomeRenegade(): void {
    this.bridge?.sendBecomeRenegade();
  }

  sendSuicide(): void {
    this.bridge?.sendSuicide();
  }

  sendRequestLogout(): void {
    this.bridge?.sendRequestLogout();
  }

  onAuctionCatalog(auctions: import("../../../shared/types").NetAuctionState[]): void {
    this.deps.onAuctionCatalog(auctions);
  }

  onPlayerMoved(player: NetPlayerState): void {

    const localId = this.bridge?.getPlayerId();
    if (!localId) return;
    if (player.id === localId) {
      this.syncLocalPlayerFromServer(player);
      return;
    }
    this.bridge?.updateRemote(player, this.deps.getCurrentMapId());
    this.deps.refreshMinimap();
  }

  onGameEvent(event: GameEvent): void {
    if (event.kind === "spell_fx") {
      if (this.deps.scene.time.now < this.deps.getSuppressServerSpellFxUntil()) {
        return;
      }
      const spellSourceX = event.sourceTileX ?? event.tileX;
      const spellSourceY = event.sourceTileY ?? event.tileY;
      const spellAudible = this.deps.shouldPlayWorldSound(
        spellSourceX,
        spellSourceY,
        event.sourcePlayerId
      );
      const localId = this.deps.getLocalPlayerId();
      const targetPlayerId = event.targetPlayerId;
      const targetSprite =
        targetPlayerId && targetPlayerId === localId
          ? this.deps.getPlayerSprite()
          : targetPlayerId
            ? this.bridge?.getRemotePlayers()?.getPlayerSprite(targetPlayerId)
            : undefined;

      if (targetSprite) {
        this.deps.playSpellEffectOnTarget(event.spellId, targetSprite, spellAudible);
      } else {
        this.deps.playSpellEffect(event.spellId, event.tileX, event.tileY, spellAudible);
      }

      if (event.sourcePlayerId && event.sourcePlayerId !== this.deps.getLocalPlayerId()) {
        const words = getSpellMagicWordsForCast(event.spellId);
        if (words) {
          this.deps.showRemoteSpellMagicWords(event.sourcePlayerId, words);
        }
      }
      return;
    }

    if (event.kind === "resurrect_channel") {
      const localId = this.deps.getLocalPlayerId();
      const channelSec = Math.round((event.endsAtMs - Date.now()) / 1000);
      this.deps.startResurrectChannelEffect(
        event.casterId,
        event.casterTileX,
        event.casterTileY,
        event.endsAtMs
      );
      if (localId && event.casterId === localId) {
        this.deps.addCombatLine(
          `Canalizando resurrección sobre ${event.targetName} (${Math.max(1, channelSec)}s)...`
        );
      } else if (localId && event.targetId === localId) {
        this.deps.addCombatLine(
          `${event.casterName} te está resucitando (${Math.max(1, channelSec)}s)...`
        );
      }
      return;
    }

    if (event.kind === "map_object_updated") {
      this.deps.updateDynamicMapObject(event.tileX, event.tileY, event.objIndex);
      return;
    }

    if (event.kind === "resurrect_complete") {
      this.deps.stopResurrectChannelEffect(event.casterId);
      const localId = this.deps.getLocalPlayerId();
      if (localId && event.targetId === localId && this.deps.isPlayerDeadOrGhost()) {
        const hpMax = this.deps.getPlayerProgress().hpMax;
        const hp = Math.max(1, Math.floor(hpMax * RESURRECT_REVIVE_HP_RATIO));
        this.deps.applyLocalRevivedFromServer(hp);
        this.deps.addCombatLine("Un aliado te revivió con Resucitar.");
      } else {
        this.deps.playSpawnEffectAtTile(event.tileX, event.tileY);
      }
      if (localId && event.casterId === localId) {
        this.deps.addCombatLine(`Resucitaste a ${event.targetName}.`);
      }
      return;
    }

    if (event.kind === "resurrect_cancel") {
      this.deps.stopResurrectChannelEffect(event.casterId);
      const localId = this.deps.getLocalPlayerId();
      if (localId && event.casterId === localId) {
        this.deps.addCombatLine(event.reason);
      }
      return;
    }

    if (event.kind === "heal") {
      const sourceX = event.sourceTileX ?? event.tileX;
      const sourceY = event.sourceTileY ?? event.tileY;
      const { x: worldX, y: worldY } = tileToFeetWorld(sourceX, sourceY, TILE_SIZE);
      
      const healerId = event.sourcePlayerId;
      const isLocalHealer = healerId === this.bridge?.getPlayerId();
      
      if (isLocalHealer) {
        const player = this.deps.getPlayerSprite();
        this.deps.showHealNumber(player.x, player.y - 44, event.amount, "player");
      } else if (healerId) {
        const remoteSprite = this.bridge?.getRemotePlayers()?.getPlayerSprite(healerId);
        if (remoteSprite) {
          this.deps.showHealNumber(remoteSprite.x, remoteSprite.y - 38, event.amount, "player");
        } else {
          this.deps.showHealNumber(worldX, worldY - 38, event.amount, "player");
        }
      } else {
        this.deps.showHealNumber(worldX, worldY - 38, event.amount, "player");
      }
      return;
    }

    if (event.kind !== "damage") {
      return;
    }

    const { x, y } = tileToFeetWorld(event.tileX, event.tileY, TILE_SIZE);
    const sourceX = event.sourceTileX ?? event.tileX;
    const sourceY = event.sourceTileY ?? event.tileY;
    const { x: sourceWorldX, y: sourceWorldY } = tileToFeetWorld(sourceX, sourceY, TILE_SIZE);

    if (event.targetKind === "mob") {
      const dummy = this.deps.findDummyById(event.targetId);
      if (dummy?.alive) {
        if (event.amount > 0) {
          if (
            this.deps.shouldPlayWorldSound(sourceX, sourceY, event.sourcePlayerId)
          ) {
            this.deps.playMobHitSoundForId(event.targetId);
          }
        }
        
        const isLocalAttacker = event.sourcePlayerId === this.bridge?.getPlayerId();
        if (isLocalAttacker) {
          const player = this.deps.getPlayerSprite();
          this.deps.showDamageNumber(player.x, player.y - 44, event.amount, "player");
        } else if (event.sourcePlayerId) {
          const remoteSprite = this.bridge?.getRemotePlayers()?.getPlayerSprite(event.sourcePlayerId);
          if (remoteSprite) {
            this.deps.showDamageNumber(remoteSprite.x, remoteSprite.y - 38, event.amount, "player");
          } else {
            this.deps.showDamageNumber(sourceWorldX, sourceWorldY - 38, event.amount, "player");
          }
        } else {
          // Si no hay sourcePlayerId, asumimos que fue un mob o trampa en ese tile de origen
          this.deps.showDamageNumber(sourceWorldX, sourceWorldY - 38, event.amount, "player");
        }

        this.deps.tintDummySprite(dummy, 0xe4b270);
        this.deps.scene.time.delayedCall(90, () => {
          this.deps.clearDummyTint(dummy);
        });
      } else {
        this.deps.showDamageNumber(sourceWorldX, sourceWorldY - 38, event.amount, "player");
      }
      return;
    }

    if (event.targetKind !== "player") {
      return;
    }

    // El objetivo es el jugador local
    if (event.targetId === this.bridge?.getPlayerId()) {
      const damage = Math.max(0, Math.floor(event.amount));
      if (damage > 0) {
        // En este caso, el origen del daño suele ser un mob o un enemigo
        if (event.sourcePlayerId) {
          const remoteSprite = this.bridge?.getRemotePlayers()?.getPlayerSprite(event.sourcePlayerId);
          if (remoteSprite) {
            this.deps.showDamageNumber(remoteSprite.x, remoteSprite.y - 38, damage, "player");
          } else {
            this.deps.showDamageNumber(sourceWorldX, sourceWorldY - 38, damage, "player");
          }
        } else {
          // Si no hay sourcePlayerId, probablemente un mob (usamos sourceWorldX/Y)
          this.deps.showDamageNumber(sourceWorldX, sourceWorldY - 38, damage, "mob");
        }
      }
      return;
    }

    // El objetivo es un jugador remoto
    const remoteSprite = this.bridge?.getRemotePlayers()?.getPlayerSprite(event.targetId);
    if (remoteSprite) {
      const isLocalAttacker = event.sourcePlayerId === this.bridge?.getPlayerId();
      if (isLocalAttacker) {
        const player = this.deps.getPlayerSprite();
        this.deps.showDamageNumber(player.x, player.y - 44, event.amount, "player");
      } else if (event.sourcePlayerId) {
        const attackerSprite = this.bridge?.getRemotePlayers()?.getPlayerSprite(event.sourcePlayerId);
        if (attackerSprite) {
          this.deps.showDamageNumber(attackerSprite.x, attackerSprite.y - 38, event.amount, "player");
        } else {
          this.deps.showDamageNumber(sourceWorldX, sourceWorldY - 38, event.amount, "player");
        }
      } else {
        this.deps.showDamageNumber(sourceWorldX, sourceWorldY - 38, event.amount, "player");
      }

      remoteSprite.setTint(0xff4444);
      this.deps.scene.time.delayedCall(90, () => {
        remoteSprite.clearTint();
      });
    } else {
      this.deps.showDamageNumber(sourceWorldX, sourceWorldY - 38, event.amount, "player");
    }
  }

  snapLocalPlayerToTile(state: NetPlayerState): void {
    this.networkMovePending = false;
    this.deps.killPlayerTweens();
    this.deps.setIsMoving(false);
    this.deps.setPlayerTile(state.tileX, state.tileY);
    this.deps.setFacing(state.facing);
    const pos = this.deps.getPlayerFeetWorldForTile(state.tileX, state.tileY);
    this.deps.setPlayerPosition(pos.x, pos.y);
    this.deps.syncPlayerFacePosition();
    this.deps.syncEquippedHeldItemVisuals();
    this.deps.syncPlayerNameLabelPosition();
    this.deps.refreshMapLocationLabel();
    this.deps.refreshMinimap();
    this.deps.playFacingAnim("idle");
  }

  syncLocalPlayerFromServer(state: NetPlayerState): void {
    if (this.deps.isChangingMap()) {
      this.networkMovePending = false;
      this.snapLocalPlayerToTile(state);
      return;
    }

    if (state.mapId !== this.deps.getCurrentMapId()) {
      this.networkMovePending = false;
      this.deps.applyMapTransition(
        {
          toMapId: state.mapId,
          toTileX: state.tileX,
          toTileY: state.tileY,
          facing: state.facing,
        },
        { silent: true }
      );
      return;
    }

    const tile = this.deps.getPlayerTile();
    const moved = state.tileX !== tile.x || state.tileY !== tile.y;
    const facingChanged = state.facing !== this.deps.getFacing();

    if (!moved && !facingChanged) {
      this.networkMovePending = false;
      return;
    }

    if (moved && !this.bridge?.getSpawnSynced()) {
      this.networkMovePending = false;
      this.bridge?.setSpawnSynced(true);
      this.snapLocalPlayerToTile(state);
      return;
    }

    if (moved && !this.deps.isTileWalkable(state.tileX, state.tileY)) {
      this.deps.setFacing(state.facing);
      this.deps.playFacingAnim("idle");
      return;
    }

    if (this.deps.isMoving()) {
      const currentTile = this.deps.getPlayerTile();
      const desynced = state.tileX !== currentTile.x || state.tileY !== currentTile.y;
      if (desynced) {
        this.snapLocalPlayerToTile(state);
        return;
      }
      this.networkMovePending = false;
      if (facingChanged) {
        this.deps.setFacing(state.facing);
        this.deps.playFacingAnim("walk");
      }
      return;
    }

    if (moved) {
      const currentTile = this.deps.getPlayerTile();
      const dist =
        Math.abs(state.tileX - currentTile.x) + Math.abs(state.tileY - currentTile.y);
      if (dist === 0) {
        this.networkMovePending = false;
        this.deps.setFacing(state.facing);
        this.deps.playFacingAnim("idle");
        return;
      }
      if (dist === 1) {
        this.networkMovePending = false;
        this.startLocalStepTween(state.tileX, state.tileY, state.facing);
        return;
      }

      this.snapLocalPlayerToTile(state);
      return;
    }

    this.networkMovePending = false;
    this.deps.setFacing(state.facing);
    this.deps.playFacingAnim("idle");
  }

  private buildJoinEquipmentPayload(): NetPlayerEquipment {
    const equipment = this.deps.getEquipment();
    return {
      weaponId: equipment.weapon,
      shieldId: equipment.shield,
      helmetId: equipment.helmet,
      armorId: equipment.armor,
      equippedOutfit: this.deps.getEquippedOutfit() as NetPlayerEquipment["equippedOutfit"],
    };
  }

}
