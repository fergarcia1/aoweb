import type Phaser from "phaser";
import { TILE_SIZE } from "../../config";
import { isAdminCharacterName, type PlayerRole } from "../../data/characters";
import type { ItemId } from "../../items/itemDefinitions";
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
import type { Facing } from "../../player/playerSprites";
import type { MoveDirection } from "./types";

export type GameSceneMultiplayerDeps = {
  scene: Phaser.Scene;
  uiCamera: Phaser.Cameras.Scene2D.Camera;
  depthFromFeetY: (feetY: number) => number;

  getCurrentMapId: () => string;
  getPlayerName: () => string;
  getCharacterId: () => string;
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

  syncLocalVitalsFromServer: (state: NetPlayerState | null | undefined) => void;
  syncLocalEquipmentFromServer: (state: NetPlayerState | null | undefined) => void;
  syncLocalInventoryFromServer: (slots: NetInventorySlotState[] | undefined) => void;
  syncLocalGoldFromServer: (gold: number | undefined) => void;
  syncWorldItemsFromServer: (items: NetWorldItemState[] | null | undefined) => void;
  applyWorldItemSpawned: (mapId: string, item: NetWorldItemState) => void;
  applyWorldItemUpdated: (mapId: string, item: NetWorldItemState) => void;
  applyWorldItemRemoved: (mapId: string, worldItemId: string) => void;
  syncMobsFromServer: (mobs: NetMobState[] | null | undefined) => void;
  applyNetMobState: (mob: NetMobState) => void;
  applyNetMobLeft: (mobId: string) => void;
  handleServerPlayerDied: (playerId: string, killerName: string) => void;
  handleServerUseItemAck: (ack: ServerUseItemAckMessage) => void;
  handleServerPlayerUpdated: (state: NetPlayerState) => void;

  applyServerPlayerRole: (serverRole?: PlayerRole) => void;
  isAdminCharacterName: (name: string) => boolean;

  snapLocalPlayerToTile: (state: NetPlayerState) => void;
  playFacingAnim: (state: "idle" | "walk") => void;
  isTileWalkable: (tileX: number, tileY: number) => boolean;
  isTileOccupiedByRemotePlayer: (tileX: number, tileY: number) => boolean;
  getLocalPlayerStepDurationMs: () => number;
  getPlayerFeetWorldForTile: (tileX: number, tileY: number) => { x: number; y: number };
  killAllLocalMobs: () => void;

  applyIncomingDamage: (amount: number, type: "physical" | "magic") => number;
  showDamageNumber: (
    x: number,
    y: number,
    amount: number,
    source: "player" | "mob"
  ) => void;
  playSpellEffect: (spellId: number, tileX: number, tileY: number) => void;
  getSuppressServerSpellFxUntil: () => number;
  getPlayerSprite: () => Phaser.GameObjects.Sprite;

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

  constructor(private readonly deps: GameSceneMultiplayerDeps) {}

  getBridge(): MultiplayerBridge | null {
    return this.bridge;
  }

  isActive(): boolean {
    return Boolean(this.bridge?.isActive());
  }

  isConnected(): boolean {
    return Boolean(this.bridge?.isConnected());
  }

  getPlayerId(): string | null {
    return this.bridge?.getPlayerId() ?? null;
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
        onCombatLine: (text) => {
          this.deps.addCombatLine(text);
          this.deps.addChatLine(text);
        },
        onWelcome: (_playerId, mapId, player, inventory, gold) => {
          if (player) {
            this.onAuthoritativeJoin(player, mapId, inventory, gold);
          }
          if (player && this.deps.getCurrentMapId() !== mapId) {
            this.deps.addChatLine(
              "Multijugador online solo en Pueblo: fuiste movido al punto de entrada."
            );
          }
        },
        onSnapshot: (snapshot) => this.onWorldSnapshot(snapshot),
        onPlayerJoined: (player) => {
          this.bridge?.updateRemote(player, this.deps.getCurrentMapId());
        },
        onPlayerLeft: () => {},
        onPlayerMoved: (player) => this.onPlayerMoved(player),
        onPlayerUpdated: (player) => this.deps.handleServerPlayerUpdated(player),
        onMobUpdated: (mob) => this.deps.applyNetMobState(mob),
        onMobLeft: (mobId) => this.deps.applyNetMobLeft(mobId),
        onGameEvent: (event) => this.onGameEvent(event),
        onPlayerDied: (playerId, killerName) =>
          this.deps.handleServerPlayerDied(playerId, killerName),
        onUseItemAck: (ack) => this.deps.handleServerUseItemAck(ack),
        onInventoryUpdated: (inventory, gold) => {
          this.deps.syncLocalInventoryFromServer(inventory);
          this.deps.syncLocalGoldFromServer(gold);
        },
        onWorldItemSpawned: (mapId, item) =>
          this.deps.applyWorldItemSpawned(mapId, item),
        onWorldItemUpdated: (mapId, item) =>
          this.deps.applyWorldItemUpdated(mapId, item),
        onWorldItemRemoved: (mapId, worldItemId) =>
          this.deps.applyWorldItemRemoved(mapId, worldItemId),
        getJoinPayload: () => ({
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
          level: this.deps.getPlayerProgress().level,
          hp: this.deps.getPlayerProgress().hp,
          hpMax: this.deps.getPlayerProgress().hpMax,
          mp: this.deps.getPlayerProgress().mp,
          mpMax: this.deps.getPlayerProgress().mpMax,
          equipment: this.buildJoinEquipmentPayload(),
          inventory: this.buildJoinInventoryPayload(),
        }),
      }
    );
    this.bridge.connect();
  }

  disconnect(): void {
    this.networkMovePending = false;
    this.bridge?.disconnect();
    this.bridge = null;
  }

  syncServerInventoryIfActive(): void {
    if (!this.bridge?.isActive()) {
      return;
    }
    this.bridge.sendSyncInventory(this.buildJoinInventoryPayload());
  }

  tryNetworkStep(dir: MoveDirection): void {
    if (!this.isActive() || this.deps.isMoving() || this.networkMovePending) {
      return;
    }

    const tile = this.deps.getPlayerTile();
    const nextX = tile.x + dir.dx;
    const nextY = tile.y + dir.dy;

    if (
      !this.deps.isTileWalkable(nextX, nextY) ||
      this.deps.isTileOccupiedByRemotePlayer(nextX, nextY)
    ) {
      if (this.deps.isMoving()) {
        this.deps.killPlayerTweens();
        this.deps.setIsMoving(false);
      }
      if (this.deps.getFacing() !== dir.facing) {
        this.deps.setFacing(dir.facing);
        this.deps.playFacingAnim("idle");
      }
      this.networkMovePending = true;
      this.bridge!.sendMove(dir.facing);
      return;
    }

    this.networkMovePending = true;
    this.bridge!.sendMove(dir.facing);
  }

  onAuthoritativeJoin(
    player: NetPlayerState,
    mapId: string,
    inventory?: NetInventorySlotState[],
    gold?: number
  ): void {
    this.deps.killAllLocalMobs();
    this.deps.syncLocalVitalsFromServer(player);
    this.deps.syncLocalEquipmentFromServer(player);
    this.deps.syncLocalInventoryFromServer(inventory);
    this.deps.syncLocalGoldFromServer(gold);

    if (player.role || this.deps.isAdminCharacterName(this.deps.getPlayerName())) {
      this.deps.applyServerPlayerRole(player.role);
    }

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

  onPlayerMoved(player: NetPlayerState): void {
    const localId = this.bridge?.getPlayerId();
    if (!localId) return;
    if (player.id === localId) {
      this.syncLocalPlayerFromServer(player);
      return;
    }
    this.bridge?.updateRemote(player, this.deps.getCurrentMapId());
  }

  onGameEvent(event: GameEvent): void {
    if (event.kind === "spell_fx") {
      if (this.deps.scene.time.now < this.deps.getSuppressServerSpellFxUntil()) {
        return;
      }
      this.deps.playSpellEffect(event.spellId, event.tileX, event.tileY);
      return;
    }

    if (event.kind !== "damage") {
      return;
    }

    const { x, y } = tileToFeetWorld(event.tileX, event.tileY, TILE_SIZE);

    if (event.targetKind === "mob") {
      const dummy = this.deps.findDummyById(event.targetId);
      if (dummy?.alive) {
        this.deps.showDamageNumber(dummy.sprite.x, dummy.sprite.y - 38, event.amount, "player");
        this.deps.tintDummySprite(dummy, 0xe4b270);
        this.deps.scene.time.delayedCall(90, () => {
          this.deps.clearDummyTint(dummy);
        });
      } else {
        this.deps.showDamageNumber(x, y - 38, event.amount, "player");
      }
      return;
    }

    if (event.targetKind !== "player") {
      return;
    }

    if (event.targetId === this.bridge?.getPlayerId()) {
      const damage = this.deps.applyIncomingDamage(event.amount, "physical");
      if (damage > 0) {
        const player = this.deps.getPlayerSprite();
        this.deps.showDamageNumber(player.x, player.y - 44, damage, "mob");
      }
      return;
    }

    const remoteSprite = this.bridge?.getRemotePlayers()?.getPlayerSprite(event.targetId);
    if (remoteSprite) {
      this.deps.showDamageNumber(remoteSprite.x, remoteSprite.y - 38, event.amount, "player");
      remoteSprite.setTint(0xff4444);
      this.deps.scene.time.delayedCall(90, () => {
        remoteSprite.clearTint();
      });
    } else {
      this.deps.showDamageNumber(x, y - 38, event.amount, "player");
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
    this.networkMovePending = false;

    const tile = this.deps.getPlayerTile();
    const moved = state.tileX !== tile.x || state.tileY !== tile.y;
    const facingChanged = state.facing !== this.deps.getFacing();

    if (!moved && !facingChanged) {
      return;
    }

    if (moved && !this.bridge?.getSpawnSynced()) {
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
        this.deps.setFacing(state.facing);
        this.deps.playFacingAnim("idle");
        return;
      }
      if (dist === 1) {
        this.deps.killPlayerTweens();
        this.deps.setPlayerTile(state.tileX, state.tileY);
        this.deps.setFacing(state.facing);
        this.deps.setIsMoving(true);
        this.deps.refreshMapLocationLabel();
        this.deps.refreshMinimap();
        const target = this.deps.getPlayerFeetWorldForTile(state.tileX, state.tileY);
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
          }
        );
        return;
      }

      this.snapLocalPlayerToTile(state);
      return;
    }

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

  private buildJoinInventoryPayload() {
    return this.deps.getInventory().map((slot, slotIndex) => ({
      slotIndex,
      itemId: slot?.itemId ?? null,
      amount: slot?.count ?? 0,
      isEquipped: false,
    }));
  }
}
