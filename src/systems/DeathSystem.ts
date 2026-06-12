import type { StaticNpcDefinition } from "../npcs/types";
import { getPriestSpawnForHome, GHOST_PLAYER_ALPHA, PRIEST_REVIVE_MAX_TILE_DISTANCE } from "../game/deathConfig";
import {
  findWalkableTileBeside,
  getNearestPriestSpawn,
} from "../game/priestSpawn";
import {
  getItemDefinition,
  itemDropsOnDeath,
  type EquipmentSlot,
  type ItemId,
} from "../../game-data/items/definitions";
import { addToInventory, type InventorySlot } from "../items/inventoryStack";
import { GHOST_RACE_ID } from "../data/characters";
import { raceBodyTextureKey, type Outfit, type PlayerArmorVisualOptions } from "../player/playerSprites";
import {
  getActiveCharacterSlotIndex,
  loadCharacterSlots,
  saveCharacterSlots,
} from "../data/characters";
import { getMap } from "../maps/index";
import { isMapTileWalkable } from "../../shared/mapWalkability";

export type DeathPhase = "alive" | "ghost_offer" | "ghost";

export type DeathCallbacks = {
  getPlayerProgress(): { hp: number; hpMax: number };
  setPlayerHp(value: number): void;
  getInventory(): (InventorySlot | null)[];
  clearInventorySlot(index: number): void;
  getEquipment(): Record<EquipmentSlot, ItemId | null>;
  clearEquipmentSlot(slot: EquipmentSlot): void;
  createWorldItem(itemId: ItemId, tileX: number, tileY: number, count: number): void;
  refreshInventoryUi(): void;
  refreshHud(): void;
  stopMeditation(message: string): void;
  cancelSpellTargeting(): void;
  addChatLine(msg: string): void;
  addCombatLine(msg: string): void;
  scheduleProgressSave(): void;
  persistCharacterProgress(): void;
  getPlayerTile(): { x: number; y: number };
  getCurrentMapId(): string;
  setEquippedOutfit(outfit: Outfit): void;
  setEquippedArmorVisual(visual: PlayerArmorVisualOptions | undefined): void;
  getDeathOverlay(): { show(rect: any): void; hide(): void; hideDialog(): void } | undefined;
  getGameViewportRect(): any;
  syncPlayerBodyAndFace(): void;
  syncEquippedHeldItemVisuals(): void;
  playFacingAnim(state: string): void;
  playSpawnEffect(): void;
  getPlayerSprite(): Phaser.GameObjects.Sprite;
  getPlayerFaceSprite(): Phaser.GameObjects.Sprite;
  getEquippedWeaponSprite(): Phaser.GameObjects.Sprite | undefined;
  getEquippedShieldSprite(): Phaser.GameObjects.Sprite | undefined;
  getEquippedHelmetSprite(): Phaser.GameObjects.Sprite | undefined;
  changeMap(transition: { toMapId: string; toTileX: number; toTileY: number; facing: string }): void;
  teleportPlayerLocal(tileX: number, tileY: number): void;
  isTileWalkable(x: number, y: number): boolean;
  getScene(): Phaser.Scene;
  getCharacterSlotIndex(): number | null;
  refreshMapLocationLabel(): void;
  refreshMinimap(): void;
  /** Sincroniza el revive con el servidor en multijugador. */
  notifyServerRevive?: (
    source: "priest" | "ally",
    tileX: number,
    tileY: number,
    mapId: string
  ) => void;
  /** En multijugador el servidor dropea el loot al morir. */
  isServerAuthoritativeLoot?: () => boolean;
  /** Marca revive en sacerdote pendiente de confirmación del servidor. */
  setServerReviveSyncPending?: (value: boolean) => void;
};

export class DeathSystem {
  private deathPhase: DeathPhase = "alive";
  private homeMapId: string;
  private _useGhostAppearance = false;
  private readonly cb: DeathCallbacks;

  constructor(callbacks: DeathCallbacks, homeMapId: string) {
    this.cb = callbacks;
    this.homeMapId = homeMapId;
  }

  get phase(): DeathPhase {
    return this.deathPhase;
  }

  set phase(value: DeathPhase) {
    this.deathPhase = value;
  }

  get useGhostAppearance(): boolean {
    return this._useGhostAppearance;
  }

  set useGhostAppearance(value: boolean) {
    this._useGhostAppearance = value;
  }

  getHomeMapId(): string {
    return this.homeMapId;
  }

  setHomeMapId(value: string) {
    this.homeMapId = value;
  }

  isPlayerDeadOrGhost(): boolean {
    return this.deathPhase !== "alive";
  }

  handlePlayerDeath() {
    if (this.deathPhase !== "alive") return;

    const serverAuthoritative = this.cb.isServerAuthoritativeLoot?.() ?? false;
    this.deathPhase = "ghost_offer";
    this.cb.setPlayerHp(0);
    this.cb.refreshHud();
    if (!serverAuthoritative) {
      this.cb.scheduleProgressSave();
    }
    this.cb.stopMeditation("Caíste en combate.");
    this.cb.cancelSpellTargeting();

    if (!serverAuthoritative) {
      this.dropAllItemsOnDeath();
    }
    this.applyGhostVisual();
    if (!serverAuthoritative) {
      this.cb.persistCharacterProgress();
    }
    this.cb.getDeathOverlay()?.show(this.cb.getGameViewportRect());
    this.cb.addCombatLine("Has muerto. Perdiste tu equipamiento y tu inventario.");
    this.cb.addChatLine(
      "Elegí ir al sacerdote o cancelar para permanecer como fantasma. /hogar te lleva al sacerdote de tu ciudad."
    );
  }

  dropAllItemsOnDeath() {
    if (this.cb.isServerAuthoritativeLoot?.() ?? false) {
      return;
    }

    const inventory = this.cb.getInventory();
    const tile = this.cb.getPlayerTile();
    const serverAuthoritative = this.cb.isServerAuthoritativeLoot?.() ?? false;
    const spawnOnGround = !serverAuthoritative;
    const inventoryWasEmpty = inventory.every((slot) => slot === null);
    let droppedInventoryStacks = 0;
    let droppedEquipmentPieces = 0;
    let keptProtectedItems = 0;

    const equipment = this.cb.getEquipment();
    const droppedItemIds = new Set<ItemId>();

    for (let slotIndex = 0; slotIndex < inventory.length; slotIndex += 1) {
      const stack = inventory[slotIndex];
      if (!stack) continue;

      const item = getItemDefinition(stack.itemId);
      if (!itemDropsOnDeath(item)) {
        keptProtectedItems += 1;
        continue;
      }

      if (spawnOnGround) {
        this.cb.createWorldItem(stack.itemId, tile.x, tile.y, stack.count);
      }
      if (!serverAuthoritative) {
        this.cb.clearInventorySlot(slotIndex);
      }
      droppedItemIds.add(stack.itemId);
      droppedInventoryStacks += 1;
    }

    const equipmentSlots: EquipmentSlot[] = ["weapon", "shield", "helmet", "armor"];
    for (const slot of equipmentSlots) {
      const itemId = equipment[slot];
      if (!itemId) continue;

      if (droppedItemIds.has(itemId)) {
        if (!serverAuthoritative) {
          this.cb.clearEquipmentSlot(slot);
        }
        continue;
      }

      // Inventario ya vacío en MMO: el servidor dropeó todo; no duplicar equipados en el suelo.
      if (serverAuthoritative || inventoryWasEmpty) {
        if (!serverAuthoritative) {
          this.cb.clearEquipmentSlot(slot);
        }
        continue;
      }

      const item = getItemDefinition(itemId);
      if (!itemDropsOnDeath(item)) {
        if (!serverAuthoritative) {
          const { added } = addToInventory(inventory as (InventorySlot | null)[], itemId, 1);
          if (added > 0) {
            this.cb.clearEquipmentSlot(slot);
            keptProtectedItems += 1;
          } else {
            this.cb.addChatLine(
              `No hay espacio para guardar ${item.name}; sigue equipado pero oculto como fantasma.`
            );
          }
        } else {
          keptProtectedItems += 1;
        }
        continue;
      }

      if (spawnOnGround) {
        this.cb.createWorldItem(itemId, tile.x, tile.y, 1);
      }
      if (!serverAuthoritative) {
        this.cb.clearEquipmentSlot(slot);
      }
      droppedEquipmentPieces += 1;
    }

    if (!serverAuthoritative && !this.cb.getEquipment().armor) {
      this.cb.setEquippedOutfit("base");
      this.cb.setEquippedArmorVisual(undefined);
    }

    if (droppedInventoryStacks > 0 || droppedEquipmentPieces > 0 || keptProtectedItems > 0) {
      if (!serverAuthoritative) {
        this.cb.refreshInventoryUi();
      }
    }

    if (droppedInventoryStacks > 0 || droppedEquipmentPieces > 0) {
      if (!serverAuthoritative) {
        this.cb.addChatLine("Soltaste todo lo que llevabas puesto y en tu inventario.");
      }
    }
    if (keptProtectedItems > 0) {
      this.cb.addChatLine("Conservaste los objetos que no se pueden dropear al morir.");
    }
  }

  applyGhostVisual() {
    const scene = this.cb.getScene();
    const bodyKey = raceBodyTextureKey(GHOST_RACE_ID, "male");
    const player = this.cb.getPlayerSprite();
    const face = this.cb.getPlayerFaceSprite();

    if (!scene.textures.exists(bodyKey)) {
      this._useGhostAppearance = false;
      player.clearTint();
      player.setAlpha(1);
      face.clearTint();
      face.setAlpha(1);
      this.cb.syncPlayerBodyAndFace();
      this.cb.addChatLine(
        "Faltan fantasma_std.png / fantasma_faces.png en public/assets/ao/razes/."
      );
      return;
    }

    this._useGhostAppearance = true;
    const weapon = this.cb.getEquippedWeaponSprite();
    if (weapon) weapon.setVisible(false);
    const shield = this.cb.getEquippedShieldSprite();
    if (shield) shield.setVisible(false);
    const helmet = this.cb.getEquippedHelmetSprite();
    if (helmet) helmet.setVisible(false);

    player.clearTint();
    player.setAlpha(GHOST_PLAYER_ALPHA);
    face.clearTint();
    face.setAlpha(GHOST_PLAYER_ALPHA);
    this.cb.syncPlayerBodyAndFace();
    this.cb.playFacingAnim("idle");
  }

  clearGhostVisual() {
    this._useGhostAppearance = false;
    const player = this.cb.getPlayerSprite();
    const face = this.cb.getPlayerFaceSprite();
    player.clearTint();
    player.setAlpha(1);
    face.clearTint();
    face.setAlpha(1);
    this.cb.syncPlayerBodyAndFace();
    const weapon = this.cb.getEquippedWeaponSprite();
    if (weapon) {
      weapon.clearTint();
      weapon.setAlpha(1);
    }
    const shield = this.cb.getEquippedShieldSprite();
    if (shield) {
      shield.clearTint();
      shield.setAlpha(1);
    }
    const helmet = this.cb.getEquippedHelmetSprite();
    if (helmet) {
      helmet.clearTint();
      helmet.setAlpha(1);
    }
    this.cb.syncEquippedHeldItemVisuals();
  }

  stayAsGhost() {
    if (this.deathPhase !== "ghost_offer") return;
    this.deathPhase = "ghost";
    this.cb.getDeathOverlay()?.hideDialog();
    this.cb.scheduleProgressSave();
    this.cb.addChatLine(
      "Permaneces como fantasma. Un aliado puede revivirte o usá /hogar para ir al sacerdote."
    );
  }

  acceptPriestRevival() {
    if (this.deathPhase === "alive") return;
    this.teleportToNearestPriest();
    this.reviveAtPriest();
  }

  goToHomePriestViaCommand() {
    if (this.deathPhase === "alive") {
      this.cb.addChatLine("Solo podés usar /hogar cuando estás muerto o en forma fantasma.");
      return;
    }
    this.teleportToNearestPriest();
    this.reviveAtPriest();
  }

  private isNearHomePriest(): boolean {
    const priest = getPriestSpawnForHome(this.homeMapId);
    if (priest.mapId !== this.cb.getCurrentMapId()) {
      return false;
    }
    const tile = this.cb.getPlayerTile();
    const distance = Math.max(
      Math.abs(tile.x - priest.tileX),
      Math.abs(tile.y - priest.tileY)
    );
    return distance <= PRIEST_REVIVE_MAX_TILE_DISTANCE;
  }

  teleportToNearestPriest() {
    const tile = this.cb.getPlayerTile();
    const priest = getNearestPriestSpawn(
      this.cb.getCurrentMapId(),
      tile.x,
      tile.y,
      this.homeMapId
    );
    const beside = findWalkableTileBeside(priest.tileX, priest.tileY, (x, y) =>
      isMapTileWalkable(priest.mapId, x, y)
    );

    if (priest.mapId !== this.cb.getCurrentMapId()) {
      this.cb.changeMap({
        toMapId: priest.mapId,
        toTileX: beside.tileX,
        toTileY: beside.tileY,
        facing: "down",
      });
      return;
    }

    this.cb.teleportPlayerLocal(beside.tileX, beside.tileY);
  }

  teleportToHomePriest() {
    this.teleportToNearestPriest();
  }

  tryReviveAtPriestNpc(priest: StaticNpcDefinition) {
    if (!this.isPlayerDeadOrGhost()) return;
    if (priest.mapId !== this.homeMapId) {
      this.cb.addChatLine(
        "Este sacerdote no es de tu ciudad. Marcá /hogar en la ciudad correcta o usá /hogar."
      );
      return;
    }
    const tile = this.cb.getPlayerTile();
    const distance = Math.max(
      Math.abs(tile.x - priest.tileX),
      Math.abs(tile.y - priest.tileY)
    );
    if (distance > PRIEST_REVIVE_MAX_TILE_DISTANCE) {
      this.cb.addChatLine(
        `Tenés que estar a ${PRIEST_REVIVE_MAX_TILE_DISTANCE} tiles o menos del sacerdote.`
      );
      return;
    }
    this.reviveAtPriest();
  }

  reviveAtPriest() {
    this.deathPhase = "alive";
    this.cb.getDeathOverlay()?.hide();
    this.clearGhostVisual();
    const progress = this.cb.getPlayerProgress();
    this.cb.setPlayerHp(progress.hpMax);
    this.cb.refreshHud();
    const tile = this.cb.getPlayerTile();
    this.cb.setServerReviveSyncPending?.(true);
    this.cb.notifyServerRevive?.("priest", tile.x, tile.y, this.cb.getCurrentMapId());
    this.cb.scheduleProgressSave();
    this.cb.addCombatLine("El sacerdote te devolvió la vida.");
    const priest = getNearestPriestSpawn(
      this.cb.getCurrentMapId(),
      tile.x,
      tile.y,
      this.homeMapId
    );
    this.cb.addChatLine(`Fuiste revivido por el sacerdote en ${getMap(priest.mapId).name}.`);
    this.cb.playSpawnEffect();
  }

  reviveFromAlly() {
    if (this.deathPhase === "alive") return;
    const progress = this.cb.getPlayerProgress();
    this.applyRevivedFromServer(Math.max(1, Math.floor(progress.hpMax * 0.35)));
    const tile = this.cb.getPlayerTile();
    this.cb.notifyServerRevive?.("ally", tile.x, tile.y, this.cb.getCurrentMapId());
    this.cb.addCombatLine("Un aliado te revivió.");
  }

  /** Revive autoritativo del servidor (hechizo Resucitar); no reenvía revive al servidor. */
  applyRevivedFromServer(hp: number) {
    if (this.deathPhase === "alive") return;
    this.deathPhase = "alive";
    this.cb.getDeathOverlay()?.hide();
    this.clearGhostVisual();
    this.cb.setPlayerHp(Math.max(1, Math.floor(hp)));
    this.cb.refreshHud();
    this.cb.scheduleProgressSave();
    this.cb.playSpawnEffect();
  }

  markHomeCity() {
    this.homeMapId = this.cb.getCurrentMapId();
    this.persistHomeMapId();
    const map = getMap(this.homeMapId);
    this.cb.addChatLine(`Marcaste ${map.name} como tu hogar (/hogar).`);
  }

  persistHomeMapId() {
    const slotIndex = this.cb.getCharacterSlotIndex() ?? getActiveCharacterSlotIndex();
    if (slotIndex === null) return;
    const slots = loadCharacterSlots();
    const character = slots[slotIndex];
    if (!character) return;
    slots[slotIndex] = { ...character, homeMapId: this.homeMapId };
    saveCharacterSlots(slots);
  }
}
