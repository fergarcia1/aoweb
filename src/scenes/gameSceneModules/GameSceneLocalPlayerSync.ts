import type { DeathPhase } from "../../systems/DeathSystem";
import type { ItemId } from "../../items/itemDefinitions";
import { getItemDefinition } from "../../items/itemDefinitions";
import { INVENTORY_SLOT_COUNT } from "../../game/characterProgressStorage";
import type { NetInventorySlotState, ServerWelcomeMessage } from "../../../shared/protocol";
import { BANK_SLOT_COUNT } from "../../../game-data/constants";
import type { BankState } from "../../game/bankStorage";
import { normalizeFactionId, type CharacterFactionId } from "../../../shared/faction";
import type { NetPlayerState, NetWorldItemState } from "../../../shared/types";
import type { WorldItemManager } from "./WorldItemManager";
import { isMultiplayerEnabled } from "../../network/multiplayerConfig";

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
  refreshInventorySlotsUi: () => void;
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
  getPlayerName: () => string;
  clearServerReviveSyncPending: () => void;
  isServerReviveSyncPending: () => boolean;
  setServerReviveSyncPending: (value: boolean) => void;
  setPlayerExpFromServer: (exp: number, expToNext?: number) => void;
  setLearnedSpellIdsFromServer: (spellIds: number[]) => void;
  setBankStateFromServer: (
    bankGold: number | undefined,
    bankInventory: ServerWelcomeMessage["bankInventory"]
  ) => void;
  refreshKnownSpellsUi: () => void;
  applyLocalFaction: (factionId: CharacterFactionId) => void;
  recordLocalUserKill: () => void;
  setInvisibleUntilMs: (ms: number) => void;
  setPlayerImmobilizedUntilMs: (ms: number) => void;
  setAttributeBuffsFromServer: (buffs: { strength: number; agility: number }) => void;
  setAttributeBuffExpiresAt: (ms: number) => void;
  onPlayerLevelUp?: (previousLevel: number, newLevel: number) => void;
};

/**
 * Aplica estado autoritativo del servidor al jugador local (vitales, oro, inventario, ├¡tems en el suelo).
 */
export class GameSceneLocalPlayerSync {
  constructor(private readonly deps: GameSceneLocalPlayerSyncDeps) {}

  handleServerPlayerUpdated(state: NetPlayerState): void {
    const localId = this.deps.getLocalPlayerId();
    const isLocalPlayer =
      (localId !== null && state.id === localId) ||
      (localId === null && state.name === this.deps.getPlayerName());
    if (!isLocalPlayer && localId !== null) {
      this.deps.updateRemotePlayer(state, this.deps.getCurrentMapId());
      return;
    }
    if (!isLocalPlayer) {
      return;
    }
    if (isLocalPlayer) {
      this.syncLocalVitalsFromServer(state);
      this.syncLocalEphemeralStateFromServer(state);
      this.syncLocalEquipmentFromServer(state);
      const faction = normalizeFactionId(state.factionId);
      this.deps.applyLocalFaction(faction);
    }
  }

  handleServerPlayerDied(playerId: string, killerId: string, killerName: string): void {
    const localId = this.deps.getLocalPlayerId();
    if (localId && killerId === localId && playerId !== localId) {
      this.deps.recordLocalUserKill();
    }
    if (playerId === localId) {
      this.deps.setPlayerHp(0);
      this.deps.setEquipmentFromServer({
        weaponId: null,
        shieldId: null,
        helmetId: null,
        armorId: null,
        equippedOutfit: "base",
      });
      this.deps.syncEquippedArmorOutfit();
      this.deps.syncEquippedHeldItemVisuals();
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
      if (this.deps.isServerReviveSyncPending()) {
        this.ensureServerReviveSynced();
        return;
      }
      // En multijugador el overlay de muerte lo dispara player_died (después de inventory_updated).
      if (!isMultiplayerEnabled()) {
        this.deps.setPlayerHp(0);
        this.deps.onLocalPlayerDeath();
      }
      this.deps.setPlayerProgressFromServer({
        hp: 0,
        hpMax: state.hpMax,
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

  /** Buffs de combate efímeros (invisibilidad, stats temporales) — autoritativo del servidor. */
  syncLocalEphemeralStateFromServer(state: NetPlayerState | null | undefined): void {
    if (!state) {
      return;
    }
    const now = Date.now();
    const invisUntil = state.invisibleUntilMs ?? 0;
    this.deps.setInvisibleUntilMs(invisUntil > now ? invisUntil : 0);

    const buffExpiresAt = state.buffExpiresAtMs ?? 0;
    if (state.attributeBuffs && buffExpiresAt > now) {
      this.deps.setAttributeBuffsFromServer({
        strength: Math.max(0, Math.floor(state.attributeBuffs.strength)),
        agility: Math.max(0, Math.floor(state.attributeBuffs.agility)),
      });
      this.deps.setAttributeBuffExpiresAt(buffExpiresAt);
    } else {
      this.deps.setAttributeBuffsFromServer({ strength: 0, agility: 0 });
      this.deps.setAttributeBuffExpiresAt(0);
    }
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

  syncLocalProgressFromServer(exp: number, expToNext: number, level: number): void {
    this.deps.setPlayerExpFromServer(
      Math.max(0, Math.floor(exp)),
      Math.max(1, Math.floor(expToNext))
    );
    const nextLevel = Math.max(1, Math.floor(level));
    const prevLevel = this.deps.getPlayerProgress().level;
    if (nextLevel > prevLevel) {
      this.deps.onPlayerLevelUp?.(prevLevel, nextLevel);
    }
    if (prevLevel !== nextLevel) {
      this.deps.getPlayerProgress().level = nextLevel;
    }
    this.deps.refreshHud();
  }

  /** Banco, hechizos aprendidos y EXP desde welcome (PostgreSQL). */
  syncLocalWelcomeExtras(welcome: Partial<ServerWelcomeMessage>): void {
    if (typeof welcome.exp === "number" && Number.isFinite(welcome.exp)) {
      this.deps.setPlayerExpFromServer(
        Math.max(0, Math.floor(welcome.exp)),
        typeof welcome.expToNext === "number" && Number.isFinite(welcome.expToNext)
          ? Math.max(1, Math.floor(welcome.expToNext))
          : undefined
      );
    }
    if (typeof welcome.level === "number" && Number.isFinite(welcome.level)) {
      this.deps.getPlayerProgress().level = Math.max(1, Math.floor(welcome.level));
    }
    if (Array.isArray(welcome.learnedSpellIds)) {
      this.deps.setLearnedSpellIdsFromServer(welcome.learnedSpellIds);
    }
    if (
      typeof welcome.bankGold === "number" ||
      Array.isArray(welcome.bankInventory)
    ) {
      this.deps.setBankStateFromServer(welcome.bankGold, welcome.bankInventory);
    }
    this.deps.refreshHud();
    this.deps.refreshKnownSpellsUi();
  }

  syncLocalInventoryFromServer(
    slots: NetInventorySlotState[] | undefined,
    options?: { slotUiOnly?: boolean }
  ): void {
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
    if (options?.slotUiOnly) {
      this.deps.refreshInventorySlotsUi();
      return;
    }
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
