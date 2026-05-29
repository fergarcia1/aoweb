import type { DeathPhase } from "../../systems/DeathSystem";
import type { ItemId } from "../../items/itemDefinitions";
import { getItemDefinition } from "../../items/itemDefinitions";
import { INVENTORY_SLOT_COUNT } from "../../game/characterProgressStorage";
import type { NetInventorySlotState } from "../../../shared/protocol";
import type { NetPlayerState, NetWorldItemState } from "../../../shared/types";
import type { WorldItemManager } from "./WorldItemManager";

export type GameSceneLocalPlayerSyncDeps = {
  getDeathPhase: () => DeathPhase;
  getPlayerProgress: () => {
    hp: number;
    level: number;
    mp: number;
    mpMax: number;
    hpMax: number;
    gold: number;
  };
  setPlayerProgressFromServer: (patch: {
    hp: number;
    hpMax: number;
    mp: number;
    mpMax: number;
    level: number;
  }) => void;
  setPlayerHp: (hp: number) => void;
  getEquipment: () => Record<"weapon" | "shield" | "helmet" | "armor", ItemId | null>;
  setEquipmentFromServer: (equipment: NetPlayerState["equipment"]) => void;
  getInventory: () => Array<{ itemId: ItemId; count: number } | null>;
  setInventoryFromServer: (slots: Array<{ itemId: ItemId; count: number } | null>) => void;
  setGoldFromServer: (gold: number) => void;
  refreshHud: () => void;
  refreshInventoryUi: () => void;
  syncEquippedArmorOutfit: () => void;
  syncEquippedHeldItemVisuals: () => void;
  setEquippedItemIdsOnUi: (ids: ItemId[]) => void;
  isMultiplayerActive: () => boolean;
  getCurrentMapId: () => string;
  getWorldItemManager: () => WorldItemManager;
  requestServerRevive: (
    source: "priest" | "ally",
    tileX: number,
    tileY: number,
    mapId: string
  ) => void;
  getPlayerTile: () => { x: number; y: number };
  onLocalPlayerDeath: () => void;
  addCombatLine: (text: string) => void;
  setRemotePlayerGhost: (playerId: string) => void;
  updateRemotePlayer: (state: NetPlayerState, mapId: string) => void;
  getLocalPlayerId: () => string | null;
  clearServerReviveSyncPending: () => void;
  isServerReviveSyncPending: () => boolean;
  setServerReviveSyncPending: (value: boolean) => void;
};

/**
 * Aplica estado autoritativo del servidor al jugador local (vitales, oro, inventario, ítems en el suelo).
 */
export class GameSceneLocalPlayerSync {
  constructor(private readonly deps: GameSceneLocalPlayerSyncDeps) {}

  handleServerPlayerUpdated(state: NetPlayerState): void {
    const localId = this.deps.getLocalPlayerId();
    if (!localId) return;
    if (state.id === localId) {
      this.syncLocalVitalsFromServer(state);
      this.syncLocalEquipmentFromServer(state);
      return;
    }
    this.deps.updateRemotePlayer(state, this.deps.getCurrentMapId());
  }

  handleServerPlayerDied(playerId: string, killerName: string): void {
    if (playerId === this.deps.getLocalPlayerId()) {
      this.deps.setPlayerHp(0);
      this.deps.onLocalPlayerDeath();
      this.deps.addCombatLine(`Has sido asesinado por ${killerName}.`);
      return;
    }
    this.deps.setRemotePlayerGhost(playerId);
  }

  syncLocalVitalsFromServer(state: NetPlayerState | null | undefined): void {
    if (!state) {
      return;
    }
    const progress = this.deps.getPlayerProgress();
    const serverThinksDead = state.hp <= 0;
    const clientIsAlive = this.deps.getDeathPhase() === "alive" && progress.hp > 0;
    if (serverThinksDead && clientIsAlive) {
      this.ensureServerReviveSynced();
      this.deps.setPlayerProgressFromServer({
        hp: progress.hp,
        hpMax: progress.hpMax,
        mp: state.mp,
        mpMax: state.mpMax,
        level: state.level,
      });
      this.deps.refreshHud();
      return;
    }
    if (state.hp > 0) {
      this.deps.clearServerReviveSyncPending();
    }
    this.deps.setPlayerProgressFromServer({
      hp: state.hp,
      hpMax: state.hpMax,
      mp: state.mp,
      mpMax: state.mpMax,
      level: state.level,
    });
    this.deps.refreshHud();
  }

  syncLocalEquipmentFromServer(state: NetPlayerState | null | undefined): void {
    if (!state?.equipment) {
      return;
    }
    this.deps.setEquipmentFromServer(state.equipment);
    this.deps.syncEquippedArmorOutfit();
    this.deps.syncEquippedHeldItemVisuals();
    const equipment = this.deps.getEquipment();
    this.deps.setEquippedItemIdsOnUi(
      Object.values(equipment).filter((id): id is ItemId => id != null)
    );
    this.deps.refreshInventoryUi();
  }

  syncLocalGoldFromServer(gold: number | undefined): void {
    if (typeof gold !== "number" || !Number.isFinite(gold)) {
      return;
    }
    this.deps.setGoldFromServer(Math.max(0, Math.floor(gold)));
    this.deps.refreshHud();
  }

  syncLocalInventoryFromServer(slots: NetInventorySlotState[] | undefined): void {
    if (!Array.isArray(slots)) {
      return;
    }
    const parsed: Array<{ itemId: ItemId; count: number } | null> =
      Array(INVENTORY_SLOT_COUNT).fill(null);
    for (const slot of slots) {
      const slotIndex =
        typeof slot.slotIndex === "number" && Number.isFinite(slot.slotIndex)
          ? Math.floor(slot.slotIndex)
          : -1;
      if (slotIndex < 0 || slotIndex >= INVENTORY_SLOT_COUNT) {
        continue;
      }
      const amount =
        typeof slot.amount === "number" && Number.isFinite(slot.amount)
          ? Math.max(0, Math.floor(slot.amount))
          : 0;
      const itemId =
        typeof slot.itemId === "string" && slot.itemId.trim() ? slot.itemId.trim() : null;
      if (!itemId || amount <= 0) {
        continue;
      }
      try {
        const definition = getItemDefinition(itemId as ItemId);
        parsed[slotIndex] = { itemId: definition.id, count: amount };
      } catch {
        continue;
      }
    }
    this.deps.setInventoryFromServer(parsed);
    const equipment = this.deps.getEquipment();
    this.deps.setEquippedItemIdsOnUi(
      Object.values(equipment).filter((id): id is ItemId => id != null)
    );
    this.deps.refreshInventoryUi();
  }

  syncWorldItemsFromServer(items: NetWorldItemState[] | null | undefined): void {
    if (!this.deps.isMultiplayerActive()) {
      return;
    }
    this.deps.getWorldItemManager().syncFromNetStates(items);
  }

  applyWorldItemSpawned(mapId: string, item: NetWorldItemState): void {
    if (!this.deps.isMultiplayerActive() || mapId !== this.deps.getCurrentMapId()) {
      return;
    }
    this.deps.getWorldItemManager().applyNetSpawned(mapId, item);
  }

  applyWorldItemUpdated(mapId: string, item: NetWorldItemState): void {
    if (!this.deps.isMultiplayerActive() || mapId !== this.deps.getCurrentMapId()) {
      return;
    }
    this.deps.getWorldItemManager().applyNetUpdated(mapId, item);
  }

  applyWorldItemRemoved(mapId: string, worldItemId: string): void {
    if (!this.deps.isMultiplayerActive() || mapId !== this.deps.getCurrentMapId()) {
      return;
    }
    this.deps.getWorldItemManager().applyNetRemoved(mapId, worldItemId);
  }

  ensureServerReviveSynced(): void {
    if (!this.deps.isMultiplayerActive()) {
      return;
    }
    const progress = this.deps.getPlayerProgress();
    if (this.deps.getDeathPhase() !== "alive" || progress.hp <= 0) {
      return;
    }
    if (this.deps.isServerReviveSyncPending()) {
      return;
    }
    this.deps.setServerReviveSyncPending(true);
    const tile = this.deps.getPlayerTile();
    this.deps.requestServerRevive("priest", tile.x, tile.y, this.deps.getCurrentMapId());
  }
}
