import { findTransition } from "../../shared/maps";
import { randomUUID } from "node:crypto";
import { FactionSystem } from "./FactionSystem";
import { ChatSystem } from "./systems/ChatSystem";
import { InventorySystem } from "./systems/InventorySystem";
import { CombatSystem } from "./systems/CombatSystem";
import { MobSystem } from "./systems/MobSystem";
import { MovementSystem } from "./systems/MovementSystem";
import type { WorldContext } from "./systems/WorldContext";
import type { WebSocket } from "ws";
import { isInAoi } from "../../shared/aoi";
import {
  applyJoinVitalsToSession,
  resolveJoinFallbackGold,
  resolveJoinGoldFromMessage,
} from "../../shared/joinSession";
import { DEFAULT_MAP_ID, LOGOUT_GRACE_MS, SAFE_ZONE_MAP_IDS, UNSAFE_LOGOUT_COUNTDOWN_SECONDS, WORLD_TICK_MS } from "../../shared/constants";
import {
  clampPlayerLevel,
  clampVitalPair,
  MULTIPLAYER_SERVER_MAP_IDS,
  normalizeFacing,
  resolveMultiplayerMapId,
  sanitizeJoinBankSlots,
  sanitizeJoinEquipment,
  sanitizeJoinInventory,
  sanitizeJoinLearnedSpellIds,
} from "../../shared/joinValidation";
import { clearOrphanServerEquipment } from "../../shared/equipmentInventorySync";
import {
  buildStarterLoadout,
  getStarterLearnedSpellIds,
  isStarterInventoryEmpty,
} from "../../game-data/starterLoadout";
import {
  ATTACK_COOLDOWN_MS,
  getSpellDefinition,
  isAdjacent,
  isImmobilizeSpell,
  rollAttackDamage,
  rollInt,
} from "../../shared/combat";
import { mobFootprintOccupiesTile, mobTargetFootprintOccupiesTile } from "../../shared/mobFootprint";
import {
  buildAllInitialMobPlacements,
  pickRandomMobSpawnTile,
} from "../../shared/mobSpawns";
import {
  expireAttributeBuffs,
  tryUseConsumableOnVitals,
} from "../../game-data/consumables";
import { getConsumableById } from "../../game-data/consumables";
import { isKnownItemId } from "../../game-data/items/registry";
import { outfitForArmorItemId } from "../../game-data/outfits";
import { applyExpGain } from "../../game-data/playerExpProgression";
import { applyLevelUpVitals, getMaxVitalsAtLevel } from "../../game-data/vitalProgression";
import type { CharacterClassId } from "../../game-data/classes";
import { canUseItem } from "../../game-data/itemUsability";
import {
  getItemDefinition,
  getItemMaxStack,
  itemDropsOnDeath,
  type EquipmentSlot,
  type ItemId,
} from "../../game-data/items/definitions";
import {
  getBuyPrice,
  getSellPrice,
  getShopCatalogForRole,
  isSpellMerchantRole,
  type MerchantRole,
} from "../../game-data/shopCatalogs";
import { getMageVendorSpellCatalog } from "../../game-data/spellShopCatalog";
import { isSpellLearnedByPlayer } from "../../shared/spellLearned";
import { MECHANICS } from "../../shared/gameMechanics";
import {
  moveCooldownUntil,
  validateAttackIntent,
  validateMoveDirection,
  validateMoveIntent,
} from "../../shared/multiplayerIntents";
import { findNearestWalkableDropTile } from "../../shared/deathLootPlacement";
import { isWorldItemDropTileAllowed } from "../../shared/mapEdgeZones";
import { findWalkableTileBeside, getNearestPriestSpawn } from "../../shared/priestSpawn";
import { deltaFromDirection, facingFromDirection, parseClientMessage } from "../../shared/protocol";
import type { ClientMessage, ServerMessage } from "../../shared/protocol";
import { isMerchantRole } from "../../shared/npcData";
import { resolveImportedObjDef } from "../../shared/legacyMapObjects";
import {
  findNearestWalkableSpawnTile,
  getMapSpawnTile,
  isMapTileWalkable,
  setDoorTileOverride,
} from "../../shared/mapWalkability";
import { MOB_MODELS, MOB_SPAWNS, type MobModelId } from "../../game-data/mobs";
import { MOB_DEFAULT_MOVE_SPEED_RATIO } from "../../game-data/mobVisualConfig";
import { STEP_DURATION_MS } from "../../game-data/constants";
import { canFactionsFight, normalizeFactionId } from "../../shared/faction";
import type { Facing } from "../../shared/types";
import { getMap } from "../../shared/maps";
import { getMapObjectDefinition } from "../../shared/mapObjectDefinitions";
import type { MapObjectPlacement, MapTransition } from "../../shared/mapTypes";
import {
  BANKER_INTERACT_MAX_TILE_DISTANCE,
  MERCHANT_INTERACT_MAX_TILE_DISTANCE,
  getNpcOccupiedTiles,
  getNpcsForMap,
} from "../../shared/npcDefinitions";
import type { GameEvent } from "../../shared/types";
import { addToServerInventory, removeFromServerSlot } from "../../shared/serverInventory";
import { collectDeathLootStacks } from "../../shared/deathLootCollect";
import { isPlayerGhostFromVitals } from "../../shared/characterDeathState";
import { PlayerSession } from "./PlayerSession";
import { MobEntity } from "./MobEntity";
import { WorldItemRegistry } from "./WorldItemRegistry";
import {
  buildSnapshotFromPlayerSession,
  MemoryCharacterRepository,
  type CharacterRepository,
  type PersistedCharacterSnapshot,
} from "./persistence";

const JOIN_TIMEOUT_MS = 15_000;
const AUTOSAVE_INTERVAL_MS = 30_000;
const MOVE_PERSIST_DEBOUNCE_MS = 3_000;
const PENDING_RECONNECT_TTL_MS = 120_000;

type PendingReconnectPosition = {
  mapId: string;
  tileX: number;
  tileY: number;
  facing: string;
  savedAtMs: number;
};

function getMobStepDurationMs(modelId: MobModelId): number {
  const ratio = MOB_MODELS[modelId]?.moveSpeedRatio ?? MOB_DEFAULT_MOVE_SPEED_RATIO;
  return Math.max(200, Math.ceil(STEP_DURATION_MS / ratio));
}

function isTileBlockedByMapObject(
  objects: MapObjectPlacement[] | undefined,
  tileX: number,
  tileY: number
): boolean {
  if (!objects?.length) {
    return false;
  }
  return objects.some((placement) => {
    const def = getMapObjectDefinition(placement.objectId);
    const left = placement.tileX - Math.floor(def.footprintW / 2);
    const top = placement.tileY - def.footprintH + 1;
    const right = left + def.footprintW - 1;
    const bottom = top + def.footprintH - 1;
    return tileX >= left && tileX <= right && tileY >= top && tileY <= bottom;
  });
}

export class WorldInstance implements WorldContext {
  private readonly players = new Map<string, PlayerSession>();
  private globalPvpEnabled = false;
  public readonly chatSystem: ChatSystem;
  public readonly factionSystem: FactionSystem;
  public readonly inventorySystem: InventorySystem;
  public readonly combatSystem: CombatSystem;
  public readonly mobSystem: MobSystem;
  public readonly movementSystem: MovementSystem;
  private readonly socketSessions = new Map<WebSocket, PlayerSession>();
  private readonly mobs = new Map<string, MobEntity>();
  private readonly worldItems = new WorldItemRegistry();
  private readonly characterRepo: CharacterRepository;
  private readonly dynamicMapObjs = new Map<string, { tileX: number; tileY: number; objIndex: number; isOpen: boolean }[]>();
  /** Puertas y otros cambios de tile sin mutar el GameMap importado. */
  private readonly tileOverridesByMap = new Map<string, Map<string, number>>();
  private tick = 0;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private lastAutosaveAt = Date.now();
  private readonly pendingReconnectPositions = new Map<string, PendingReconnectPosition>();
  private readonly persistDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly pendingLogoutGraceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly pendingLogoutCountdownTimers = new Map<
    string,
    ReturnType<typeof setInterval>
  >();
  private readonly logoutCompletingIds = new Set<string>();

  constructor(characterRepo: CharacterRepository = new MemoryCharacterRepository()) {
    this.characterRepo = characterRepo;
    this.chatSystem = new ChatSystem(this);
    this.factionSystem = new FactionSystem(this);
    this.inventorySystem = new InventorySystem(this);
    this.combatSystem = new CombatSystem(this);
    this.mobSystem = new MobSystem(this);
    this.movementSystem = new MovementSystem(this);
    this.initAllMobs();
  }

  private initAllMobs() {
    this.applyFreshMobPlacements();
  }

  private getDynamicObjs(mapId: string) {
    let objs = this.dynamicMapObjs.get(mapId);
    if (!objs) {
      objs = [];
      const map = getMap(mapId);
      if (map && map.legacyObjs) {
        for (const o of map.legacyObjs) {
          objs.push({ tileX: o.tileX, tileY: o.tileY, objIndex: o.objIndex, isOpen: false });
        }
      }
      this.dynamicMapObjs.set(mapId, objs);
    }
    return objs;
  }

  private countJoinedPlayers(): number {
    let count = 0;
    for (const player of this.players.values()) {
      if (player.joined) {
        count += 1;
      }
    }
    return count;
  }

  private findJoinedSessionByCharacterId(
    characterId: string,
    exceptSessionId: string
  ): PlayerSession | undefined {
    const normalized = characterId.trim();
    if (!normalized) {
      return undefined;
    }
    for (const player of this.players.values()) {
      if (player.id === exceptSessionId || !player.joined) {
        continue;
      }
      if (player.characterId === normalized) {
        return player;
      }
    }
    return undefined;
  }

  /** Rechaza el join si el personaje ya está online en otra sesión. */
  private rejectDuplicateCharacterLogin(session: PlayerSession): boolean {
    const existing = this.findJoinedSessionByCharacterId(
      session.characterId,
      session.id
    );
    if (!existing) {
      return false;
    }

    // Reconexión tras F5: la sesión anterior suele estar cerrando WS pero aún en memoria.
    if (existing.socket.readyState !== 1) {
      this.clearPendingLogout(existing.id);
      this.capturePendingReconnectPosition(existing);
      this.removePlayer(existing.id);
      return false;
    }

    console.log(
      `[join] rechazado personaje duplicado ${session.characterId} (${session.name}); activo en ${existing.id.slice(0, 8)}`
    );

    this.send(session, {
      type: "error",
      code: "character_already_online",
      message: "Este personaje ya está conectado en otra sesión.",
    });

    this.players.delete(session.id);
    this.socketSessions.delete(session.socket);
    if (session.socket.readyState === session.socket.OPEN) {
      session.socket.close(4002, "character already online");
    }
    return true;
  }

  /** Nuevas posiciones aleatorias para todos los mobs (sin repetir tiles en el mapa). */
  private applyFreshMobPlacements() {
    this.mobSystem.applyFreshMobPlacements();
  }

  

  private maybeRerollMobPlacementsForNewSession() {
    this.mobSystem.maybeRerollMobPlacementsForNewSession();
  }

  

  

  start() {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => this.onTick(), WORLD_TICK_MS);
  }

  public getPlayers() { return this.players; }
  public getMobs() { return this.mobs; }
  public getWorldItems() { return this.worldItems; }
  public aggroMobOnPlayerHit(mob: import("./MobEntity").MobEntity, attacker: import("./PlayerSession").PlayerSession) { this.mobSystem.aggroMobOnPlayerHit(mob, attacker); }

  stop() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  

  private onTick() {
    try {
      this.tick += 1;
      this.mobSystem.tick();
      this.combatSystem.tickResurrectChannels();
      this.tickMeditations();
      this.autosavePlayersIfDue();
    } catch (error) {
      console.error("[tick] unhandled error:", error);
    }
  }

  cancelResurrectForPlayer(playerId: string): void {
    this.combatSystem.cancelResurrectForPlayer(playerId);
  }

  tryBecomeRenegade(session: PlayerSession): void {
    this.factionSystem.tryBecomeRenegade(session);
  }

  onUserKill(killer: PlayerSession, victim: PlayerSession): void {
    this.factionSystem.onUserKill(killer, victim);
  }

  getMapTileOverrides(mapId: string): ReadonlyMap<string, number> | undefined {
    return this.tileOverridesByMap.get(mapId);
  }

  private autosavePlayersIfDue() {
    const now = Date.now();
    if (now - this.lastAutosaveAt < AUTOSAVE_INTERVAL_MS) return;
    this.lastAutosaveAt = now;
    for (const player of this.players.values()) {
      if (!player.joined) continue;
      void this.persistSession(player).catch((error) => {
        console.error("[autosave] persist failed:", error);
      });
    }
  }

  private normalizeSessionVitalsFromProgress(
    session: PlayerSession,
    options?: { fillCurrent?: boolean }
  ) {
    if (session.isAdmin()) {
      return;
    }
    const vitals = getMaxVitalsAtLevel(
      session.raceId,
      session.classId as CharacterClassId,
      session.level
    );
    session.hpMax = vitals.hpMax;
    session.mpMax = vitals.mpMax;
    if (options?.fillCurrent) {
      session.hp = session.hpMax;
      session.mp = session.mpMax;
      return;
    }
    session.hp = Math.min(session.hpMax, Math.max(0, Math.floor(session.hp)));
    session.mp = Math.min(session.mpMax, Math.max(0, Math.floor(session.mp)));
  }

  private handleMeditation(session: PlayerSession, active: boolean) {
    if (active) {
      this.startMeditation(session);
    } else {
      this.stopMeditation(session);
    }
  }

  private startMeditation(session: PlayerSession) {
    if (!session.joined) return;
    if (session.isDead || session.hp <= 0) {
      this.sendCombatLog(session, "No podes meditar estando muerto.");
      this.stopMeditation(session);
      return;
    }
    if (session.mpMax <= 0 || session.mp >= session.mpMax) {
      this.sendCombatLog(session, "Ya tenes el mana al maximo.");
      this.stopMeditation(session);
      return;
    }
    session.isMeditating = true;
    session.nextMeditationRegenAt = Date.now() + MECHANICS.INTERVAL_MEDITATION_REGEN;
    this.broadcastPlayerState(session);
  }

  private stopMeditation(session: PlayerSession, message?: string) {
    if (!session.isMeditating) return;
    session.isMeditating = false;
    session.nextMeditationRegenAt = 0;
    if (message) {
      this.sendCombatLog(session, message);
    }
    this.broadcastPlayerState(session);
  }

  private stopMeditationForAction(session: PlayerSession) {
    this.stopMeditation(session);
  }

  private tickMeditations() {
    const now = Date.now();
    for (const session of this.players.values()) {
      if (!session.joined || !session.isMeditating) {
        continue;
      }
      if (session.isDead || session.hp <= 0 || session.mpMax <= 0) {
        this.stopMeditation(session);
        continue;
      }
      if (session.mp >= session.mpMax) {
        session.mp = session.mpMax;
        this.stopMeditation(session, "Tu mana esta completo.");
        continue;
      }
      if (now < session.nextMeditationRegenAt) {
        continue;
      }

      const before = session.mp;
      const amount = Math.max(
        1,
        Math.ceil(session.mpMax * MECHANICS.MEDITATION_MP_REGEN_PERCENT_PER_TICK)
      );
      session.mp = Math.min(session.mpMax, session.mp + amount);
      session.nextMeditationRegenAt = now + MECHANICS.INTERVAL_MEDITATION_REGEN;
      if (session.mp !== before) {
        this.broadcastPlayerState(session);
        this.schedulePersistSessionDebounced(session);
      }
      if (session.mp >= session.mpMax) {
        session.mp = session.mpMax;
        this.stopMeditation(session, "Tu mana esta completo.");
        this.schedulePersistSessionDebounced(session);
      }
    }
  }

  

  

  

  

  

  

  

  

  

  /** Respawns pendientes; cada uno reaparece en un tile aleatorio del mapa. */
  

  handleConnection(socket: WebSocket) {
    const joinDeadline = Date.now() + JOIN_TIMEOUT_MS;
    const joinTimer = setTimeout(() => {
      if (!this.socketSessions.has(socket) && socket.readyState === socket.OPEN) {
        socket.close(4000, "join timeout");
      }
    }, JOIN_TIMEOUT_MS);

    socket.on("message", (data) => {
      try {
        const raw = typeof data === "string" ? data : data.toString("utf8");
        const message = parseClientMessage(raw);
        if (!message) {
          const session = this.socketSessions.get(socket);
          if (session) {
            this.send(session, { type: "error", message: "Mensaje inválido." });
          }
          return;
        }

        if (message.type === "join") {
          clearTimeout(joinTimer);
          let session = this.socketSessions.get(socket);
          if (!session) {
            session = new PlayerSession(randomUUID(), socket);
            this.players.set(session.id, session);
            this.socketSessions.set(socket, session);
          }
          this.handleJoin(session, message);
          return;
        }

        const session = this.socketSessions.get(socket);
        if (!session) {
          if (Date.now() > joinDeadline) {
            socket.close(4001, "join required");
          }
          return;
        }
        this.handleClientMessage(session, message);
      } catch (error) {
        console.error("[ws] message handler error:", error);
        const session = this.socketSessions.get(socket);
        if (session) {
          this.send(session, { type: "error", message: "Error interno del servidor." });
        }
      }
    });

    socket.on("error", (error) => {
      console.error("[ws] socket error:", error);
    });

    socket.on("close", () => {
      clearTimeout(joinTimer);
      const session = this.socketSessions.get(socket);
      this.socketSessions.delete(socket);
      if (!session) {
        return;
      }

      if (!session.joined) {
        this.removePlayer(session.id);
        return;
      }

      if (this.logoutCompletingIds.has(session.id)) {
        this.logoutCompletingIds.delete(session.id);
        return;
      }

      this.clearPendingLogout(session.id);
      session.isMeditating = false;
      session.nextMeditationRegenAt = 0;
      this.capturePendingReconnectPosition(session);
      const snapshot = buildSnapshotFromPlayerSession(session);
      void this.characterRepo
        .upsert(snapshot)
        .catch((error) => {
          console.error("[leave] failed to persist session:", error);
        })
        .finally(() => {
          if (this.isInSafeZone(session)) {
            console.log(`[leave] ${session.name} (${session.id.slice(0, 8)}) — zona segura, removiendo al instante`);
            this.removePlayer(session.id);
            return;
          }
          console.log(
            `[leave] ${session.name} (${session.id.slice(0, 8)}) — zona insegura, permanece ${LOGOUT_GRACE_MS / 1000}s`
          );
          this.scheduleLogoutGraceRemoval(session.id);
        });
    });
  }

  private handleClientMessage(session: PlayerSession, message: ClientMessage) {
    if (message.type === "join") {
      this.handleJoin(session, message);
      return;
    }
    if (!session.joined) {
      this.send(session, { type: "error", message: "Enviá join antes de jugar." });
      return;
    }
    if (message.type === "request_logout") {
      this.handleRequestLogout(session);
      return;
    }
    if (message.type === "move") {
      if (this.pendingLogoutCountdownTimers.has(session.id)) {
        this.cancelLogoutCountdown(session);
      }
      this.stopMeditationForAction(session);
      this.movementSystem.handleMove(session, message.direction);
      return;
    }
    if (this.pendingLogoutCountdownTimers.has(session.id)) {
      this.sendCombatLog(session, "Estás desconectando...");
      return;
    }
    if (message.type === "attack") {
      this.stopMeditationForAction(session);
      if (message.facing) {
        session.facing = normalizeFacing(message.facing);
        this.movementSystem.broadcastPlayerMoved(session);
      }
      this.combatSystem.handleAttack(session);
      return;
    }
    if (message.type === "cast_spell") {
      this.stopMeditationForAction(session);
      const raw = message as {
        spellId?: unknown;
        idSpell?: unknown;
        targetTileX: number;
        targetTileY: number;
        targetPlayerId?: string;
      };
      const spellId = Math.floor(Number(raw.spellId ?? raw.idSpell));
      this.combatSystem.handleCastSpell(
        session,
        spellId,
        message.targetTileX,
        message.targetTileY,
        message.targetPlayerId
      );
      return;
    }
    if (message.type === "suicide") {
      this.stopMeditationForAction(session);
      this.combatSystem.handleSuicide(session);
      return;
    }
    if (message.type === "meditation") {
      this.handleMeditation(session, message.active === true);
      return;
    }
    if (message.type === "become_renegade") {
      this.factionSystem.tryBecomeRenegade(session);
      return;
    }
    if (message.type === "chat") {
      this.chatSystem.handleChat(session, message.text);
      return;
    }
    if (message.type === "admin_command") {
      this.chatSystem.handleAdminCommand(session, message.command, message.args);
      return;
    }
    if (message.type === "use_item") {
      this.stopMeditationForAction(session);
      this.inventorySystem.handleUseItem(session, message.itemId, message.inventorySlot);
      return;
    }
    if (message.type === "sync_vitals") {
      this.inventorySystem.handleSyncVitals(session, {
        hp: message.hp,
        mp: message.mp,
      });
      return;
    }
    if (message.type === "sync_inventory") {
      this.handleSyncInventory(session, message.inventory);
      return;
    }
    if (message.type === "sync_bank") {
      this.handleSyncBank(session, message);
      return;
    }
    if (message.type === "equip_item") {
      this.stopMeditationForAction(session);
      this.inventorySystem.handleEquipItem(
        session,
        message.action,
        message.inventorySlot,
        message.equipSlot,
        message.itemId
      );
      return;
    }
    if (message.type === "drop_item") {
      this.stopMeditationForAction(session);
      this.inventorySystem.handleDropItem(session, message.inventorySlot, message.amount);
      return;
    }
    if (message.type === "drop_gold") {
      this.stopMeditationForAction(session);
      this.inventorySystem.handleDropGold(session, message.amount);
      return;
    }
    if (message.type === "pickup_world_item") {
      this.stopMeditationForAction(session);
      this.inventorySystem.handlePickupWorldItem(session);
      return;
    }
    if (message.type === "bank_action") {
      this.stopMeditationForAction(session);
      this.handleBankAction(session, message.action, message.amount, message.slotIndex);
      return;
    }
    if (message.type === "shop_buy") {
      this.stopMeditationForAction(session);
      this.handleShopBuy(session, message.role, message.itemId, message.amount);
      return;
    }
    if (message.type === "shop_sell") {
      this.stopMeditationForAction(session);
      this.handleShopSell(session, message.role, message.inventorySlot, message.amount);
      return;
    }
    if (message.type === "spell_shop_buy") {
      this.stopMeditationForAction(session);
      this.handleSpellShopBuy(session, message.spellId);
      return;
    }
    if (message.type === "revive") {
      this.stopMeditationForAction(session);
      this.handleRevive(
        session,
        message.source,
        message.tileX,
        message.tileY,
        message.mapId
      );
      return;
    }
    if (message.type === "interact_map") {
      this.stopMeditationForAction(session);
      this.handleInteractMap(session, message.tileX, message.tileY);
      return;
    }
  }

  private handleInteractMap(session: PlayerSession, tileX: number, tileY: number) {
    if (!session.joined || session.isDead) return;
    const dist = Math.abs(session.tileX - tileX) + Math.abs(session.tileY - tileY);
    if (dist > 2) return; // Too far

    const objs = this.getDynamicObjs(session.mapId);
    const obj = objs.find(o => o.tileX === tileX && o.tileY === tileY);
    if (!obj) return;

    const def = resolveImportedObjDef(obj.objIndex);
    
    if (def && def.objType === 6) {
      const isCurrentlyOpen = obj.objIndex === def.indexAbierta;
      const nextIndex = isCurrentlyOpen ? def.indexCerrada : def.indexAbierta;
      
      if (nextIndex && nextIndex > 0) {
        obj.objIndex = nextIndex;
        obj.isOpen = !isCurrentlyOpen;

        let overrides = this.tileOverridesByMap.get(session.mapId);
        if (!overrides) {
          overrides = new Map();
          this.tileOverridesByMap.set(session.mapId, overrides);
        }
        setDoorTileOverride(overrides, tileX, tileY, obj.isOpen);

        this.broadcastToAoi(session.mapId, tileX, tileY, {
          type: "game_event",
          event: {
            kind: "map_object_updated",
            tileX,
            tileY,
            objIndex: nextIndex
          }
        });
      }
    }
  }

  private handleRevive(
    session: PlayerSession,
    source: "priest" | "ally",
    tileX?: number,
    tileY?: number,
    mapId?: string
  ) {
    if (!session.joined) {
      return;
    }
    if (!session.isDead && session.hp > 0) {
      return;
    }

    session.isDead = false;
    session.deathLootProcessed = false;
    if (source === "priest") {
      session.hp = session.hpMax;
      this.applyServerPriestRevivePosition(session);
    } else {
      session.hp = Math.max(1, Math.floor(session.hpMax * 0.35));
      this.applyRevivePosition(session, tileX, tileY, mapId);
    }

    this.sendPlayerState(session);
    this.sendInventoryUpdated(session);
    this.send(session, {
      type: "player_moved",
      player: session.toNetState(),
    });
    this.movementSystem.broadcastPlayerMoved(session);
    void this.persistSession(session).catch((error) => {
      console.error("[revive] persist failed:", error);
    });
  }

  /** Revive en sacerdote: posición autoritativa en el sacerdote más cercano. */
  private applyServerPriestRevivePosition(session: PlayerSession) {
    const priest = getNearestPriestSpawn(
      session.mapId,
      session.tileX,
      session.tileY,
      {
        mapId: session.mapId,
        tileX: getMapSpawnTile(session.mapId).tileX,
        tileY: getMapSpawnTile(session.mapId).tileY,
      }
    );
    const targetMapId = priest.mapId;
    const beside = findWalkableTileBeside(
      priest.tileX,
      priest.tileY,
      (tileX, tileY) =>
        isMapTileWalkable(
          targetMapId,
          tileX,
          tileY,
          this.tileOverridesByMap.get(targetMapId)
        ) && !this.isTileOccupied(tileX, tileY, targetMapId, session.id)
    );

    if (targetMapId !== session.mapId) {
      for (const otherId of session.aoiVisiblePlayerIds) {
        const other = this.players.get(otherId);
        if (other) {
          other.aoiVisiblePlayerIds.delete(session.id);
          this.send(other, { type: "player_left", playerId: session.id });
        }
      }
      session.aoiVisiblePlayerIds.clear();
      session.mapId = targetMapId;
      this.movementSystem.initAoiOnJoin(session);
    }

    session.tileX = beside.tileX;
    session.tileY = beside.tileY;
    session.facing = "down";
  }

  /** Aplica tile de revive del cliente si es caminable y no está ocupado. */
  private applyRevivePosition(
    session: PlayerSession,
    tileX?: number,
    tileY?: number,
    mapId?: string
  ) {
    if (
      typeof tileX !== "number" ||
      typeof tileY !== "number" ||
      !Number.isFinite(tileX) ||
      !Number.isFinite(tileY)
    ) {
      return;
    }
    const targetMapId =
      typeof mapId === "string" && mapId.trim() ? mapId.trim() : session.mapId;
    const nextX = Math.floor(tileX);
    const nextY = Math.floor(tileY);
    if (!isMapTileWalkable(targetMapId, nextX, nextY, this.tileOverridesByMap.get(targetMapId))) {
      return;
    }
    if (this.isTileOccupied(nextX, nextY, targetMapId, session.id)) {
      return;
    }
    session.mapId = targetMapId;
    session.tileX = nextX;
    session.tileY = nextY;
  }

  private handleSyncInventory(
    session: PlayerSession,
    inventory: Extract<ClientMessage, { type: "sync_inventory" }>["inventory"]
  ) {
    if (!session.joined) return;
    this.sendInventoryUpdated(session);
  }

  private handleSyncBank(
    session: PlayerSession,
    message: Extract<ClientMessage, { type: "sync_bank" }>
  ) {
    if (!session.joined) return;
    this.sendInventoryUpdated(session);
    this.sendBankUpdated(session);
  }

  private sendBankUpdated(session: PlayerSession): void {
    this.send(session, {
      type: "bank_updated",
      bankGold: session.bankGold,
      bankInventory: session.bankSlots.map((slot) => ({
        slotIndex: slot.slotIndex,
        itemId: slot.itemId,
        amount: slot.amount,
      })),
    });
  }

  private sendSpellsUpdated(session: PlayerSession): void {
    this.send(session, {
      type: "spells_updated",
      learnedSpellIds: [...session.learnedSpellIds],
    });
  }

  private isNearNpcRole(
    session: PlayerSession,
    role: string,
    maxDistance: number
  ): boolean {
    return getNpcsForMap(session.mapId).some((npc) => {
      if (npc.role !== role) return false;
      const distance = Math.max(
        Math.abs(session.tileX - npc.tileX),
        Math.abs(session.tileY - npc.tileY)
      );
      return distance <= maxDistance;
    });
  }

  private addToBankSlots(
    session: PlayerSession,
    itemId: string,
    count: number
  ): { added: number; remaining: number } {
    if (count <= 0 || !isKnownItemId(itemId)) {
      return { added: 0, remaining: count };
    }
    const maxStack = getItemMaxStack(itemId as ItemId);
    let remaining = count;

    for (const slot of session.bankSlots) {
      if (remaining <= 0) break;
      if (!slot.itemId || slot.itemId !== itemId || slot.amount <= 0) continue;
      const add = Math.min(maxStack - slot.amount, remaining);
      if (add <= 0) continue;
      slot.amount += add;
      remaining -= add;
    }

    for (const slot of session.bankSlots) {
      if (remaining <= 0) break;
      if (slot.itemId && slot.amount > 0) continue;
      const add = Math.min(maxStack, remaining);
      slot.itemId = itemId;
      slot.amount = add;
      remaining -= add;
    }

    return { added: count - remaining, remaining };
  }

  private removeFromBankSlot(
    session: PlayerSession,
    slotIndex: number,
    amount: number
  ): { removed: number; itemId: string | null } {
    const slot = session.bankSlots[slotIndex];
    if (!slot?.itemId || slot.amount <= 0 || amount <= 0) {
      return { removed: 0, itemId: null };
    }
    const removed = Math.min(slot.amount, Math.floor(amount));
    const itemId = slot.itemId;
    slot.amount -= removed;
    if (slot.amount <= 0) {
      slot.itemId = null;
      slot.amount = 0;
    }
    return { removed, itemId };
  }

  private handleBankAction(
    session: PlayerSession,
    action: "deposit_item" | "withdraw_item" | "deposit_gold" | "withdraw_gold",
    amountRaw: number,
    slotIndexRaw?: number
  ): void {
    if (!session.joined || session.hp <= 0) return;
    if (!this.isNearNpcRole(session, "banker", BANKER_INTERACT_MAX_TILE_DISTANCE)) {
      this.sendCombatLog(session, "Tenés que estar cerca del banquero.");
      return;
    }

    const amount = Math.max(1, Math.floor(Number(amountRaw)));
    if (!Number.isFinite(amount)) return;
    const slotIndex =
      typeof slotIndexRaw === "number" && Number.isFinite(slotIndexRaw)
        ? Math.floor(slotIndexRaw)
        : -1;

    session.inventorySlots = sanitizeJoinInventory(session.inventorySlots);
    session.bankSlots = sanitizeJoinBankSlots(session.bankSlots);

    if (action === "deposit_gold" || action === "withdraw_gold") {
      if (action === "deposit_gold") {
        const transfer = Math.min(amount, session.gold);
        if (transfer <= 0) {
          this.sendCombatLog(session, "No tenés oro para depositar.");
          return;
        }
        session.gold -= transfer;
        session.bankGold += transfer;
        this.sendCombatLog(session, `Depositaste ${transfer.toLocaleString("es-AR")} monedas de oro.`);
      } else {
        const transfer = Math.min(amount, session.bankGold);
        if (transfer <= 0) {
          this.sendCombatLog(session, "No tenés oro en el banco.");
          return;
        }
        session.bankGold -= transfer;
        session.gold += transfer;
        this.sendCombatLog(session, `Retiraste ${transfer.toLocaleString("es-AR")} monedas de oro del banco.`);
      }
      this.sendInventoryUpdated(session);
      this.sendBankUpdated(session);
      void this.persistSession(session);
      return;
    }

    if (slotIndex < 0) return;

    if (action === "deposit_item") {
      const slot = session.inventorySlots[slotIndex];
      if (!slot?.itemId || slot.amount <= 0 || !isKnownItemId(slot.itemId)) return;
      if (slot.isEquipped || Object.values(session.equipment).includes(slot.itemId)) {
        this.sendCombatLog(session, "Desequipá ese objeto antes de guardarlo en el banco.");
        return;
      }
      const itemId = slot.itemId;
      const { removed } = removeFromServerSlot(session.inventorySlots, slotIndex, amount);
      if (removed <= 0) return;
      const { added, remaining } = this.addToBankSlots(session, itemId, removed);
      if (remaining > 0) {
        addToServerInventory(session.inventorySlots, itemId, remaining);
      }
      if (added <= 0) {
        this.sendCombatLog(session, "No hay espacio en el banco para ese objeto.");
      } else {
        const item = getItemDefinition(itemId as ItemId);
        this.sendCombatLog(session, `Depositaste ${item.name} x${added} en el banco.`);
      }
    } else {
      const { removed, itemId } = this.removeFromBankSlot(session, slotIndex, amount);
      if (removed <= 0 || !itemId) return;
      const { added, remaining } = addToServerInventory(session.inventorySlots, itemId, removed);
      if (remaining > 0) {
        this.addToBankSlots(session, itemId, remaining);
      }
      if (added <= 0) {
        this.sendCombatLog(session, "No hay espacio en tu inventario.");
      } else {
        const item = getItemDefinition(itemId as ItemId);
        this.sendCombatLog(session, `Retiraste ${item.name} x${added} del banco.`);
      }
    }

    this.syncInventoryEquippedFlags(session);
    this.sendInventoryUpdated(session);
    this.sendBankUpdated(session);
    void this.persistSession(session);
  }

  private validateShopAccess(session: PlayerSession, role: MerchantRole): boolean {
    if (!session.joined || session.hp <= 0) return false;
    if (!isMerchantRole(role)) return false;
    if (!this.isNearNpcRole(session, role, MERCHANT_INTERACT_MAX_TILE_DISTANCE)) {
      this.sendCombatLog(session, "Tenés que estar cerca del comerciante.");
      return false;
    }
    return true;
  }

  private handleShopBuy(
    session: PlayerSession,
    role: MerchantRole,
    itemId: string,
    amountRaw: number
  ): void {
    if (!this.validateShopAccess(session, role) || isSpellMerchantRole(role)) return;
    if (!isKnownItemId(itemId) || !getShopCatalogForRole(role).includes(itemId as ItemId)) {
      this.sendCombatLog(session, "Ese objeto no está a la venta.");
      return;
    }
    const qty = Math.min(1_000, Math.max(1, Math.floor(Number(amountRaw))));
    if (!Number.isFinite(qty)) return;
    const item = getItemDefinition(itemId as ItemId);
    const usability = canUseItem(
      session.classId as CharacterClassId,
      session.raceId as any,
      session.level,
      item,
      session.isAdmin()
    );
    if (!usability.allowed) {
      this.sendCombatLog(session, usability.reason ?? "No podés usar ese objeto.");
      return;
    }
    if (session.gold < getBuyPrice(item.value, 1)) {
      this.sendCombatLog(session, "No tenés suficiente oro.");
      return;
    }
    const affordableQty = Math.min(qty, Math.floor(session.gold / getBuyPrice(item.value, 1)));
    const { added } = addToServerInventory(session.inventorySlots, itemId, affordableQty);
    if (added <= 0) {
      this.sendCombatLog(session, "No tenés espacio en el inventario.");
      return;
    }
    const cost = getBuyPrice(item.value, added);
    session.gold -= cost;
    this.sendCombatLog(session, `Compraste ${item.name} x${added} por ${cost.toLocaleString("es-AR")} de oro.`);
    this.sendInventoryUpdated(session);
    void this.persistSession(session);
  }

  private handleShopSell(
    session: PlayerSession,
    role: MerchantRole,
    inventorySlotRaw: number,
    amountRaw: number
  ): void {
    if (!this.validateShopAccess(session, role) || isSpellMerchantRole(role)) return;
    const slotIndex = Math.floor(Number(inventorySlotRaw));
    const amount = Math.max(1, Math.floor(Number(amountRaw)));
    if (!Number.isFinite(slotIndex) || !Number.isFinite(amount)) return;
    const slot = session.inventorySlots[slotIndex];
    if (!slot?.itemId || slot.amount <= 0 || !isKnownItemId(slot.itemId)) return;
    if (slot.isEquipped || Object.values(session.equipment).includes(slot.itemId)) {
      this.sendCombatLog(session, "Desequipá ese objeto antes de venderlo.");
      return;
    }
    const itemId = slot.itemId;
    const { removed } = removeFromServerSlot(session.inventorySlots, slotIndex, amount);
    if (removed <= 0) return;
    const item = getItemDefinition(itemId as ItemId);
    const gained = getSellPrice(item.value, removed);
    session.gold += gained;
    this.sendCombatLog(session, `Vendiste ${item.name} x${removed} por ${gained.toLocaleString("es-AR")} de oro.`);
    this.sendInventoryUpdated(session);
    void this.persistSession(session);
  }

  private handleSpellShopBuy(session: PlayerSession, spellIdRaw: number): void {
    if (!this.validateShopAccess(session, "mage")) return;
    const spellId = Math.floor(Number(spellIdRaw));
    if (!Number.isFinite(spellId)) return;
    const spell = getMageVendorSpellCatalog().find((entry) => entry.idSpell === spellId);
    if (!spell) {
      this.sendCombatLog(session, "Ese hechizo no está a la venta.");
      return;
    }
    if (isSpellLearnedByPlayer(spellId, session.learnedSpellIds)) {
      this.sendCombatLog(session, `Ya conocés ${spell.nombre}.`);
      return;
    }
    if (!session.isAdmin() && !spell.usableBy.includes(session.classId as any)) {
      this.sendCombatLog(session, `Tu clase no puede aprender ${spell.nombre}.`);
      return;
    }
    if (!session.isAdmin() && spell.nivelRequerido > session.level) {
      this.sendCombatLog(session, `Necesitás ser nivel ${spell.nivelRequerido} para aprender ${spell.nombre}.`);
      return;
    }
    const cost = Math.max(0, Math.floor(spell.valor));
    if (session.gold < cost) {
      this.sendCombatLog(session, "No tenés suficiente oro.");
      return;
    }
    session.gold -= cost;
    session.learnedSpellIds.add(spellId);
    this.sendCombatLog(session, `Aprendiste ${spell.nombre} por ${cost.toLocaleString("es-AR")} de oro.`);
    this.sendInventoryUpdated(session);
    this.sendSpellsUpdated(session);
    void this.persistSession(session);
  }

  

  

  private toEquipmentKey(slot: EquipmentSlot): "weaponId" | "shieldId" | "helmetId" | "armorId" {
    if (slot === "weapon") return "weaponId";
    if (slot === "shield") return "shieldId";
    if (slot === "helmet") return "helmetId";
    return "armorId";
  }

  private handleJoin(
    session: PlayerSession,
    message: Extract<ClientMessage, { type: "join" }>
  ) {
    this.resetEphemeralCombatState(session);
    const incomingName = message.name.trim().slice(0, 24) || "Viajero";
    session.name = incomingName;
    session.accountId = null;
    session.characterId =
      typeof message.characterId === "string" && message.characterId.trim()
        ? message.characterId.trim().slice(0, 64)
        : session.id;
    void this.tryHydrateSessionFromRepository(session, message).catch((error) => {
      console.error("[join] failed to hydrate from repository:", error);
      this.applyJoinFallback(session, message);
    });
  }

  private applyJoinFallback(
    session: PlayerSession,
    message: Extract<ClientMessage, { type: "join" }>
  ) {
    if (this.rejectDuplicateCharacterLogin(session)) {
      return;
    }

    const mapId = resolveMultiplayerMapId(message.mapId);

    session.assignRoleByName();
    session.mapId = mapId;
    session.raceId = message.raceId;
    session.genderId = message.genderId;
    session.classId = message.classId;
    session.factionId = normalizeFactionId(message.factionId);
    session.faceIndex = Math.max(0, Math.floor(message.faceIndex ?? 0));
    session.level = 1;
    session.exp = 0;
    session.gold = 0;
    session.bankGold = 0;
    session.equipment = sanitizeJoinEquipment(undefined);
    session.inventorySlots = sanitizeJoinInventory(undefined);
    session.bankSlots = sanitizeJoinBankSlots(undefined);
    session.learnedSpellIds = new Set();
    this.applyStarterLoadoutForNewCharacter(session, message);
    session.recalcDefenseStats();
    session.recalcAttackStats();

    session.assignRoleByName();
    this.normalizeSessionVitalsFromProgress(session, { fillCurrent: true });
    session.facing = normalizeFacing(message.facing);
    session.usersKilled = Math.max(
      0,
      Math.floor(
        typeof message.usersKilled === "number" && Number.isFinite(message.usersKilled)
          ? message.usersKilled
          : 0
      )
    );

    const resolvedTile = this.resolveJoinTilePosition(session, message, message.mapId);
    session.tileX = resolvedTile.tileX;
    session.tileY = resolvedTile.tileY;

    this.maybeRerollMobPlacementsForNewSession();
    session.joined = true;

    this.sendWelcome(session);

    this.movementSystem.sendSnapshot(session);
    this.movementSystem.initAoiOnJoin(session);
    console.log(
      `[join] ${session.name} (${session.id.slice(0, 8)}) en ${mapId} @ ${session.tileX},${session.tileY}`
    );
  }

  private async tryHydrateSessionFromRepository(
    session: PlayerSession,
    message: Extract<ClientMessage, { type: "join" }>
  ) {
    const persisted = await this.characterRepo.getByName(session.name);
    const requestedCharacterId =
      typeof message.characterId === "string" && message.characterId.trim()
        ? message.characterId.trim().slice(0, 64)
        : null;
    if (!persisted) {
      this.applyJoinFallback(session, message);
      return;
    }
    if (
      requestedCharacterId &&
      persisted.character.id.trim() &&
      persisted.character.id.trim() !== requestedCharacterId
    ) {
      this.applyJoinFallback(session, message);
      return;
    }
    this.applyPersistedSnapshot(session, persisted);
    this.applyPendingReconnectPosition(session);
    this.applyJoinClientOverrides(session, message, { trustPersistedSnapshot: true });
    this.normalizeSessionVitalsFromProgress(session);
    session.assignRoleByName();
    this.finalizeJoinFromSession(session, message);
  }

  private applyPersistedSnapshot(session: PlayerSession, persisted: PersistedCharacterSnapshot) {
    const c = persisted.character;
    session.characterId = c.id;
    session.accountId = c.accountId;
    session.name = c.name;
    session.role = c.role;
    session.mapId = resolveMultiplayerMapId(c.mapId);
    session.tileX = c.tileX;
    session.tileY = c.tileY;
    session.facing = normalizeFacing(c.facing);
    session.raceId = c.raceId;
    session.genderId = c.genderId;
    session.classId = c.classId;
    session.factionId = normalizeFactionId(c.factionId);
    session.faceIndex = Math.max(0, Math.floor(c.faceIndex));
    session.level = clampPlayerLevel(c.level);
    session.equipment = sanitizeJoinEquipment({
      weaponId: c.equipment.weaponItemId,
      shieldId: c.equipment.shieldItemId,
      helmetId: c.equipment.helmetItemId,
      armorId: c.equipment.armorItemId,
      equippedOutfit: c.equipment.equippedOutfit,
    });
    session.recalcDefenseStats();
    session.recalcAttackStats();
    session.hp = Math.max(0, Math.floor(c.hp));
    session.hpMax = Math.max(1, Math.floor(c.hpMax));
    session.mp = Math.max(0, Math.floor(c.mp));
    session.mpMax = Math.max(0, Math.floor(c.mpMax));
    session.gold = Math.max(0, Math.floor(c.gold));
    session.attributeBuffs = {
      strength: Math.max(0, Math.floor(c.attributeBuffs.strengthBonus)),
      agility: Math.max(0, Math.floor(c.attributeBuffs.agilityBonus)),
      expiresAtMs: Math.max(0, Math.floor(c.attributeBuffs.expiresAtMs)),
    };
    this.expireAttributeBuffsIfNeeded(session);
    session.inventorySlots = sanitizeJoinInventory(persisted.inventorySlots);
    if (clearOrphanServerEquipment(session.equipment, session.inventorySlots)) {
      session.recalcDefenseStats();
      session.recalcAttackStats();
    }
    session.bankGold = Math.max(0, Math.floor(c.bankGold));
    session.bankSlots = sanitizeJoinBankSlots(persisted.bankSlots);
    session.exp = Math.max(0, Math.floor(c.exp));
    session.expToNext = Math.max(1, Math.floor(c.expToNext));
    session.learnedSpellIds = new Set(
      persisted.spells
        .map((entry) => Math.floor(entry.spellId))
        .filter((id) => Number.isFinite(id) && id > 0)
    );
    this.syncInventoryEquippedFlags(session);
  }

  /**
   * Mientras no exista intent autoritativo de equipar/mover inventario,
   * usamos el join del cliente como última verdad para equipo/inventario.
   */
  private applyJoinClientOverrides(
    session: PlayerSession,
    message: Extract<ClientMessage, { type: "join" }>,
    options?: { trustPersistedSnapshot?: boolean }
  ) {
    const clientEquipment = sanitizeJoinEquipment(message.equipment);
    const trustSnapshot = options?.trustPersistedSnapshot === true;
    if (!trustSnapshot) {
      session.equipment = clientEquipment;
    }
    // Banco autoritativo en PostgreSQL cuando hay snapshot persistido (igual que vitales).
    if (!trustSnapshot) {
      if (Array.isArray(message.bankInventory)) {
        session.bankSlots = sanitizeJoinBankSlots(message.bankInventory);
      }
      if (typeof message.bankGold === "number" && Number.isFinite(message.bankGold)) {
        session.bankGold = Math.max(0, Math.floor(message.bankGold));
      }
    }
    if (!trustSnapshot) {
      session.inventorySlots = sanitizeJoinInventory(message.inventory);
      session.learnedSpellIds = sanitizeJoinLearnedSpellIds(message.learnedSpellIds);
      if (typeof message.exp === "number" && Number.isFinite(message.exp)) {
        session.exp = Math.max(0, Math.floor(message.exp));
      }
      if (typeof message.expToNext === "number" && Number.isFinite(message.expToNext)) {
        session.expToNext = Math.max(1, Math.floor(message.expToNext));
      }
      if (typeof message.level === "number" && Number.isFinite(message.level)) {
        session.level = clampPlayerLevel(message.level);
      }
      session.gold = resolveJoinGoldFromMessage(message.gold, session.gold);
    } else {
      session.gold = Math.max(0, Math.floor(session.gold));
    }
    this.syncInventoryEquippedFlags(session);

    applyJoinVitalsToSession(session, message, {
      trustPersistedSnapshot: options?.trustPersistedSnapshot === true,
    });
    session.assignRoleByName();

    session.recalcDefenseStats();
    session.recalcAttackStats();
    this.ensureStarterLearnedSpellsIfEmpty(session);
  }

  /** Personajes con mana y sin hechizos persistidos (p. ej. join con inventario inicial ya lleno). */
  private ensureStarterLearnedSpellsIfEmpty(session: PlayerSession): void {
    if (session.learnedSpellIds.size > 0) {
      return;
    }
    const starters = getStarterLearnedSpellIds(session.classId as CharacterClassId);
    if (starters.length > 0) {
      session.learnedSpellIds = new Set(starters);
    }
  }

  private applyStarterLoadoutForNewCharacter(
    session: PlayerSession,
    message: Extract<ClientMessage, { type: "join" }>
  ) {
    this.ensureStarterLearnedSpellsIfEmpty(session);
    if (!isStarterInventoryEmpty(session.inventorySlots)) {
      return;
    }
    const classId = session.classId as CharacterClassId;
    const loadout = buildStarterLoadout(classId);
    const slots = sanitizeJoinInventory(null);
    for (const entry of loadout.inventorySlots) {
      slots[entry.slotIndex] = {
        slotIndex: entry.slotIndex,
        itemId: entry.itemId,
        amount: entry.amount,
        isEquipped: false,
      };
    }
    session.inventorySlots = slots;
    session.equipment = sanitizeJoinEquipment({
      weaponId: loadout.equipment.weaponId,
      armorId: loadout.equipment.armorId,
      equippedOutfit: "citizen",
    });
    this.syncInventoryEquippedFlags(session);
  }

  private capturePendingReconnectPosition(session: PlayerSession): void {
    const characterId = session.characterId.trim();
    if (!characterId || !session.joined) {
      return;
    }
    this.pendingReconnectPositions.set(characterId, {
      mapId: session.mapId,
      tileX: session.tileX,
      tileY: session.tileY,
      facing: session.facing,
      savedAtMs: Date.now(),
    });
  }

  private applyPendingReconnectPosition(session: PlayerSession): void {
    const characterId = session.characterId.trim();
    if (!characterId) {
      return;
    }
    const pending = this.pendingReconnectPositions.get(characterId);
    if (!pending) {
      return;
    }
    if (Date.now() - pending.savedAtMs > PENDING_RECONNECT_TTL_MS) {
      this.pendingReconnectPositions.delete(characterId);
      return;
    }

    const mapId = pending.mapId;
    if (
      isMapTileWalkable(
        mapId,
        pending.tileX,
        pending.tileY,
        this.tileOverridesByMap.get(mapId)
      )
    ) {
      session.mapId = mapId;
      session.tileX = pending.tileX;
      session.tileY = pending.tileY;
      session.facing = normalizeFacing(pending.facing);
    }
    this.pendingReconnectPositions.delete(characterId);
  }

  private resolveJoinTilePosition(
    session: PlayerSession,
    message: Extract<ClientMessage, { type: "join" }>,
    requestedMapId: string
  ): { tileX: number; tileY: number } {
    const mapId = session.mapId;
    const spawnOrigin = getMapSpawnTile(mapId);
    type Tile = { tileX: number; tileY: number };

    const isValidTile = (tile: Tile | null): tile is Tile => {
      if (!tile) {
        return false;
      }
      return (
        isMapTileWalkable(mapId, tile.tileX, tile.tileY, this.tileOverridesByMap.get(mapId)) &&
        !this.isTileOccupied(tile.tileX, tile.tileY, mapId, session.id)
      );
    };

    const clientRequestedThisMap = resolveMultiplayerMapId(requestedMapId) === mapId;
    const clientTile: Tile | null =
      clientRequestedThisMap &&
      typeof message.tileX === "number" &&
      typeof message.tileY === "number" &&
      Number.isFinite(message.tileX) &&
      Number.isFinite(message.tileY)
        ? { tileX: Math.floor(message.tileX), tileY: Math.floor(message.tileY) }
        : null;

    const sessionTile: Tile | null =
      Number.isFinite(session.tileX) && Number.isFinite(session.tileY)
        ? { tileX: Math.floor(session.tileX), tileY: Math.floor(session.tileY) }
        : null;

    const candidates: Tile[] = [];
    if (isValidTile(clientTile)) {
      candidates.push(clientTile);
    }
    if (
      sessionTile &&
      isValidTile(sessionTile) &&
      !candidates.some(
        (candidate) =>
          candidate.tileX === sessionTile.tileX && candidate.tileY === sessionTile.tileY
      )
    ) {
      candidates.push(sessionTile);
    }

    if (candidates.length > 0) {
      let best = candidates[0];
      let bestDist =
        Math.abs(best.tileX - spawnOrigin.tileX) + Math.abs(best.tileY - spawnOrigin.tileY);
      for (let index = 1; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        const dist =
          Math.abs(candidate.tileX - spawnOrigin.tileX) +
          Math.abs(candidate.tileY - spawnOrigin.tileY);
        if (dist > bestDist) {
          best = candidate;
          bestDist = dist;
        }
      }
      return best;
    }

    const origin = sessionTile ?? clientTile ?? spawnOrigin;
    return findNearestWalkableSpawnTile(mapId, origin, (tileX, tileY) =>
      this.isTileOccupied(tileX, tileY, mapId, session.id)
    );
  }

  public schedulePersistSessionDebounced(
    session: PlayerSession,
    delayMs = MOVE_PERSIST_DEBOUNCE_MS
  ): void {
    if (!session.joined) {
      return;
    }
    const existing = this.persistDebounceTimers.get(session.id);
    if (existing) {
      clearTimeout(existing);
    }
    const timer = setTimeout(() => {
      this.persistDebounceTimers.delete(session.id);
      void this.persistSession(session).catch((error) => {
        console.error("[move] debounced persist failed:", error);
      });
    }, delayMs);
    this.persistDebounceTimers.set(session.id, timer);
  }

  private clearPersistDebounceTimer(playerId: string): void {
    const timer = this.persistDebounceTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.persistDebounceTimers.delete(playerId);
    }
  }

  private finalizeJoinFromSession(
    session: PlayerSession,
    message: Extract<ClientMessage, { type: "join" }>
  ) {
    if (this.rejectDuplicateCharacterLogin(session)) {
      return;
    }

    const resolvedTile = this.resolveJoinTilePosition(session, message, message.mapId);
    session.tileX = resolvedTile.tileX;
    session.tileY = resolvedTile.tileY;

    this.maybeRerollMobPlacementsForNewSession();
    session.joined = true;

    this.sendWelcome(session);

    this.movementSystem.sendSnapshot(session);
    this.movementSystem.initAoiOnJoin(session);
    void this.persistSession(session).catch((error) => {
      console.error("[join] persist failed:", error);
    });
    console.log(
      `[join] ${session.name} (${session.id.slice(0, 8)}) en ${session.mapId} @ ${session.tileX},${session.tileY}`
    );
  }

  private sendWelcome(session: PlayerSession) {
    this.send(session, {
      type: "welcome",
      playerId: session.id,
      mapId: session.mapId,
      player: session.toNetState({ includeAttributeBuffs: true }),
      inventory: session.inventorySlots.map((slot) => ({
        slotIndex: slot.slotIndex,
        itemId: slot.itemId,
        amount: slot.amount,
        isEquipped: slot.isEquipped,
      })),
      gold: session.gold,
      bankGold: session.bankGold,
      bankInventory: session.bankSlots.map((slot) => ({
        slotIndex: slot.slotIndex,
        itemId: slot.itemId,
        amount: slot.amount,
      })),
      learnedSpellIds: [...session.learnedSpellIds],
      exp: session.exp,
      expToNext: session.expToNext,
      level: session.level,
    });
  }

  public isGlobalPvpEnabled(): boolean {
    return this.globalPvpEnabled;
  }

  public setGlobalPvpEnabled(enabled: boolean): void {
    this.globalPvpEnabled = enabled;
  }

  public async persistSession(session: PlayerSession) {
    if (!session.joined) return;
    const snapshot = buildSnapshotFromPlayerSession(session);
    try {
      await this.characterRepo.upsert(snapshot);
    } catch (error) {
      // Nunca propagar: una falla de persistencia no debe tumbar el tick ni el WS.
      console.error(`[persist] upsert failed (${session.name}/${session.characterId}):`, error);
    }
  }

  private consumeInventorySlot(session: PlayerSession, slotIndex: number) {
    const slot = session.inventorySlots[slotIndex];
    if (!slot || slot.amount <= 0) return;
    slot.amount -= 1;
    if (slot.amount <= 0) {
      slot.amount = 0;
      slot.itemId = null;
      slot.isEquipped = false;
    }
  }

  private syncInventoryEquippedFlags(session: PlayerSession) {
    const equippedIds = new Set<string>(
      [session.equipment.weaponId, session.equipment.shieldId, session.equipment.helmetId, session.equipment.armorId]
        .filter((value): value is string => Boolean(value))
    );
    for (const slot of session.inventorySlots) {
      slot.isEquipped = Boolean(slot.itemId && slot.amount > 0 && equippedIds.has(slot.itemId));
    }
  }

  

  /** Movimiento rechazado: el cliente predice el paso y necesita corrección autoritativa. */
  

  
  

  

  

  

  private applyDamageToMob(
    session: PlayerSession,
    mob: MobEntity,
    rawDamage: number,
    spellName?: string
  ) {
    this.aggroMobOnPlayerHit(mob, session);
    const damage = Math.max(0, Math.floor(rawDamage));
    mob.hp = Math.max(0, mob.hp - damage);

    if (mob.hp <= 0) {
      mob.alive = false;
      mob.respawnAt = Date.now() + mob.respawnMs;
    }

    this.broadcastGameEvent(session.mapId, mob.tileX, mob.tileY, {
      kind: "damage",
      targetKind: "mob",
      targetId: mob.id,
      amount: damage,
      tileX: mob.tileX,
      tileY: mob.tileY,
    });
    this.broadcastMobUpdated(mob);

    if (mob.alive) {
      const action = spellName ? `${spellName} golpea` : "Golpea";
      this.broadcastCombatLog(
        session.mapId,
        mob.tileX,
        mob.tileY,
        `${session.name} ${action} a ${mob.name} por ${damage}.`
      );
    } else {
      const action = spellName ? `${spellName} elimina` : "Elimina";
      this.broadcastCombatLog(
        session.mapId,
        mob.tileX,
        mob.tileY,
        `${session.name} ${action} a ${mob.name} (${damage}).`
      );
    }
  }

  private getMobInFrontOfPlayer(session: PlayerSession): MobEntity | undefined {
    const front = this.getFrontTile(session);
    return this.findMobAtTile(session.mapId, front.x, front.y);
  }

  private getFrontTile(session: PlayerSession) {
    if (session.facing === "up") return { x: session.tileX, y: session.tileY - 1 };
    if (session.facing === "down") return { x: session.tileX, y: session.tileY + 1 };
    if (session.facing === "left") return { x: session.tileX - 1, y: session.tileY };
    return { x: session.tileX + 1, y: session.tileY };
  }

  private findMobAtTile(mapId: string, tileX: number, tileY: number) {
    for (const mob of this.mobs.values()) {
      if (!mob.alive || mob.mapId !== mapId) continue;
      if (
        mobTargetFootprintOccupiesTile(
          tileX,
          tileY,
          mob.tileX,
          mob.tileY,
          mob.hitboxOffsetTiles,
          mob.hitboxWidthTiles,
          mob.hitboxHeightTiles
        )
      ) {
        return mob;
      }
      if (isAdjacent(mob.tileX, mob.tileY, tileX, tileY)) return mob;
    }
    return undefined;
  }

  private findPlayerAtTile(mapId: string, tileX: number, tileY: number, exceptId: string): PlayerSession | undefined {
    for (const player of this.players.values()) {
      if (!player.joined || player.mapId !== mapId || player.id === exceptId) continue;
      if (player.hp <= 0) continue;
      if (player.tileX === tileX && player.tileY === tileY) return player;
      if (isAdjacent(player.tileX, player.tileY, tileX, tileY)) return player;
    }
    return undefined;
  }

  

  private isInSafeZone(player: PlayerSession): boolean {
    return SAFE_ZONE_MAP_IDS.has(player.mapId);
  }

  /** Invisibilidad / inmovilizar no persisten entre sesiones; buffs de stats sí (con expiry). */
  private resetEphemeralCombatState(session: PlayerSession): void {
    session.clearInvisible();
    session.clearImmobilized();
  }

  private expireAttributeBuffsIfNeeded(session: PlayerSession, now = Date.now()): void {
    if (session.attributeBuffs.expiresAtMs <= now) {
      session.attributeBuffs = { strength: 0, agility: 0, expiresAtMs: 0 };
    }
  }

  private clearPendingLogout(playerId: string): void {
    const countdown = this.pendingLogoutCountdownTimers.get(playerId);
    if (countdown) {
      clearInterval(countdown);
      this.pendingLogoutCountdownTimers.delete(playerId);
    }
    const grace = this.pendingLogoutGraceTimers.get(playerId);
    if (grace) {
      clearTimeout(grace);
      this.pendingLogoutGraceTimers.delete(playerId);
    }
  }

  private cancelLogoutCountdown(session: PlayerSession): void {
    const countdown = this.pendingLogoutCountdownTimers.get(session.id);
    if (!countdown) {
      return;
    }
    clearInterval(countdown);
    this.pendingLogoutCountdownTimers.delete(session.id);
    this.sendCombatLog(session, "Desconexión cancelada.");
    console.log(
      `[logout] cancelado por movimiento — ${session.name} (${session.id.slice(0, 8)})`
    );
  }

  private scheduleLogoutGraceRemoval(playerId: string): void {
    if (this.pendingLogoutGraceTimers.has(playerId)) {
      return;
    }
    const timer = setTimeout(() => {
      this.pendingLogoutGraceTimers.delete(playerId);
      this.removePlayer(playerId);
    }, LOGOUT_GRACE_MS);
    this.pendingLogoutGraceTimers.set(playerId, timer);
  }

  private handleRequestLogout(session: PlayerSession): void {
    console.log(`[logout] ${session.name} (${session.id.slice(0, 8)}) map=${session.mapId}`);
    if (this.pendingLogoutCountdownTimers.has(session.id)) {
      this.sendCombatLog(session, "Ya estás desconectando...");
      return;
    }

    if (this.isInSafeZone(session)) {
      void this.completeLogout(session);
      return;
    }

    let secondsLeft = UNSAFE_LOGOUT_COUNTDOWN_SECONDS;
    this.sendCombatLog(session, `Desconectando en ${secondsLeft}...`);
    this.send(session, { type: "logout_countdown", secondsLeft });

    const timer = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        this.clearPendingLogout(session.id);
        void this.completeLogout(session);
        return;
      }
      this.sendCombatLog(session, `Desconectando en ${secondsLeft}...`);
      this.send(session, { type: "logout_countdown", secondsLeft });
    }, 1_000);

    this.pendingLogoutCountdownTimers.set(session.id, timer);
  }

  private async completeLogout(session: PlayerSession): Promise<void> {
    this.clearPendingLogout(session.id);
    this.logoutCompletingIds.add(session.id);
    this.capturePendingReconnectPosition(session);

    const snapshot = buildSnapshotFromPlayerSession(session);
    try {
      await this.characterRepo.upsert(snapshot);
    } catch (error) {
      console.error("[logout] failed to persist session:", error);
    }

    this.send(session, { type: "logout_complete" });
    if (session.socket.readyState === session.socket.OPEN) {
      session.socket.close(4003, "logout");
    }
    this.removePlayer(session.id);
    this.logoutCompletingIds.delete(session.id);
  }

  private removePlayer(playerId: string) {
    this.clearPendingLogout(playerId);
    this.clearPersistDebounceTimer(playerId);
    const session = this.players.get(playerId);
    if (!session) return;

    if (session.joined) {
      for (const otherId of session.aoiVisiblePlayerIds) {
        const other = this.players.get(otherId);
        if (other) {
          other.aoiVisiblePlayerIds.delete(playerId);
          this.send(other, { type: "player_left", playerId });
        }
      }
      session.aoiVisiblePlayerIds.clear();
      console.log(`[leave] ${session.name} (${playerId.slice(0, 8)})`);
    }

    this.cancelResurrectForPlayer(playerId);
    this.players.delete(playerId);
  }

  public isTileOccupied(
    tileX: number,
    tileY: number,
    mapId: string,
    exceptPlayerId: string,
    options?: { ignoreGhosts?: boolean }
  ) {
    for (const player of this.players.values()) {
      if (!player.joined || player.id === exceptPlayerId || player.mapId !== mapId) continue;
      if (options?.ignoreGhosts && isPlayerGhostFromVitals(player.hp, player.isDead)) continue;
      if (player.tileX === tileX && player.tileY === tileY) return true;
    }
    for (const mob of this.mobs.values()) {
      if (!mob.alive || mob.mapId !== mapId) continue;
      if (this.mobSystem.mobOccupiesTile(mob, tileX, tileY)) return true;
    }
    if (getNpcOccupiedTiles(mapId).some((tile) => tile.x === tileX && tile.y === tileY)) {
      return true;
    }
    return false;
  }

  /** Empuja fantasmas del tile destino; devuelve false si alguno no tiene adónde ir. */
  public displaceGhostsFromTile(
    mapId: string,
    tileX: number,
    tileY: number,
    incomingFromTileX: number,
    incomingFromTileY: number,
    moverPlayerId: string
  ): boolean {
    const ghostsOnTile: PlayerSession[] = [];
    for (const player of this.players.values()) {
      if (
        !player.joined ||
        player.id === moverPlayerId ||
        player.mapId !== mapId ||
        player.tileX !== tileX ||
        player.tileY !== tileY
      ) {
        continue;
      }
      if (isPlayerGhostFromVitals(player.hp, player.isDead)) {
        ghostsOnTile.push(player);
      }
    }

    if (ghostsOnTile.length === 0) {
      return true;
    }

    const reserved = new Set<string>([`${tileX},${tileY}`]);

    for (const ghost of ghostsOnTile) {
      const dest = this.findGhostDisplacementTile(
        mapId,
        tileX,
        tileY,
        incomingFromTileX,
        incomingFromTileY,
        ghost.id,
        reserved
      );
      if (!dest) {
        return false;
      }
      reserved.add(`${dest.tileX},${dest.tileY}`);

      const prevGx = ghost.tileX;
      const prevGy = ghost.tileY;
      ghost.tileX = dest.tileX;
      ghost.tileY = dest.tileY;
      this.schedulePersistSessionDebounced(ghost);
      this.send(ghost, {
        type: "player_moved",
        player: ghost.toNetState(),
      });
      this.syncAoiAfterMove(ghost, prevGx, prevGy);
      this.broadcastPlayerMoved(ghost);
    }

    return true;
  }

  private findGhostDisplacementTile(
    mapId: string,
    occupiedTileX: number,
    occupiedTileY: number,
    incomingFromTileX: number,
    incomingFromTileY: number,
    ghostId: string,
    reservedTiles: Set<string>
  ): { tileX: number; tileY: number } | null {
    const incomingDx = occupiedTileX - incomingFromTileX;
    const incomingDy = occupiedTileY - incomingFromTileY;
    const candidates: Array<{ tileX: number; tileY: number; score: number }> = [];

    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nextX = occupiedTileX + dx;
      const nextY = occupiedTileY + dy;
      const key = `${nextX},${nextY}`;
      if (reservedTiles.has(key)) continue;
      if (
        !isMapTileWalkable(mapId, nextX, nextY, this.tileOverridesByMap.get(mapId)) ||
        isTileBlockedByMapObject(getMap(mapId).objects, nextX, nextY)
      ) {
        continue;
      }
      if (this.isTileOccupied(nextX, nextY, mapId, ghostId)) {
        continue;
      }
      const score = -(dx * incomingDx + dy * incomingDy);
      candidates.push({ tileX: nextX, tileY: nextY, score });
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      return { tileX: candidates[0].tileX, tileY: candidates[0].tileY };
    }

    return findNearestWalkableSpawnTile(
      mapId,
      { tileX: occupiedTileX, tileY: occupiedTileY },
      (nextX, nextY) => {
        const key = `${nextX},${nextY}`;
        if (reservedTiles.has(key)) return true;
        if (nextX === occupiedTileX && nextY === occupiedTileY) return true;
        if (
          !isMapTileWalkable(mapId, nextX, nextY, this.tileOverridesByMap.get(mapId)) ||
          isTileBlockedByMapObject(getMap(mapId).objects, nextX, nextY)
        ) {
          return true;
        }
        return this.isTileOccupied(nextX, nextY, mapId, ghostId);
      },
      8
    );
  }

  private buildSnapshotForSession(session: PlayerSession) {
    const { mapId, tileX, tileY, id } = session;
    const players = [...this.players.values()]
      .filter(
        (p) =>
          p.joined &&
          p.mapId === mapId &&
          p.id !== id &&
          isInAoi(tileX, tileY, p.tileX, p.tileY)
      )
      .map((p) => p.toNetState());
    const mobs = [...this.mobs.values()]
      .filter((m) => m.mapId === mapId && isInAoi(tileX, tileY, m.tileX, m.tileY))
      .map((m) => m.toNetState());
    const worldItems = this.worldItems
      .listInAoi(mapId, tileX, tileY)
      .map((item) => this.worldItems.toNetState(item));

    return {
      tick: this.tick,
      mapId,
      players,
      mobs,
      worldItems,
    };
  }

  /** Estado inicial al join (solo entidades en AOI); ver FULL_SNAPSHOT_ON_JOIN_ONLY. */
  

  

  

  public sendCombatLog(session: PlayerSession, text: string) {
    this.send(session, { type: "combat_log", text });
  }

  public broadcastCombatLog(
    mapId: string,
    tileX: number,
    tileY: number,
    text: string
  ) {
    this.broadcastToAoi(mapId, tileX, tileY, { type: "combat_log", text });
  }

  public broadcastGameEvent(
    mapId: string,
    tileX: number,
    tileY: number,
    event: GameEvent
  ) {
    this.broadcastToAoi(mapId, tileX, tileY, { type: "game_event", event });
  }

  public broadcastMobUpdated(mob: MobEntity) {
    this.broadcastToAoi(mob.mapId, mob.tileX, mob.tileY, {
      type: "mob_updated",
      mob: mob.toNetState(),
    });
  }

  /** HP/MP autoritativos al jugador local (curas, gasto de maná, etc.). */
  public sendPlayerState(session: PlayerSession, options?: { includeAttributeBuffs?: boolean }) {
    this.send(session, {
      type: "player_updated",
      player: session.toNetState(options),
    });
  }

  private broadcastPlayerState(
    session: PlayerSession,
    options?: { includeAttributeBuffs?: boolean }
  ) {
    const message: ServerMessage = {
      type: "player_updated",
      player: session.toNetState(options),
    };
    this.send(session, message);
    this.broadcastToAoi(session.mapId, session.tileX, session.tileY, message, session.id);
  }

  public send(session: PlayerSession, message: ServerMessage) {
    if (session.socket.readyState !== session.socket.OPEN) return;
    try {
      session.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error(`[ws] send failed (${session.name}):`, error);
    }
  }

  /** Jugadores en el mismo mapa dentro del radio AOI respecto a (tileX, tileY). */
  public broadcastToAoi(
    mapId: string,
    tileX: number,
    tileY: number,
    message: ServerMessage,
    exceptId?: string
  ) {
    for (const player of this.players.values()) {
      if (!player.joined || player.mapId !== mapId) continue;
      if (exceptId && player.id === exceptId) continue;
      if (!isInAoi(player.tileX, player.tileY, tileX, tileY)) continue;
      this.send(player, message);
    }
  }

  public sendInventoryUpdated(session: PlayerSession) {
    this.send(session, {
      type: "inventory_updated",
      inventory: session.inventorySlots.map((slot) => ({
        slotIndex: slot.slotIndex,
        itemId: slot.itemId,
        amount: slot.amount,
        isEquipped: slot.isEquipped,
      })),
      gold: session.gold,
    });
  }

  public broadcastWorldItemState(
    mapId: string,
    tileX: number,
    tileY: number,
    record: import("./WorldItemRegistry").WorldItemRecord,
    kind: "spawned" | "updated"
  ) {
    const item = this.worldItems.toNetState(record);
    const message: ServerMessage =
      kind === "spawned"
        ? { type: "world_item_spawned", mapId, item }
        : { type: "world_item_updated", mapId, item };
    this.broadcastToAoi(mapId, tileX, tileY, message);
  }

  public broadcastWorldItemRemoved(
    mapId: string,
    tileX: number,
    tileY: number,
    worldItemId: string
  ) {
    this.broadcastToAoi(mapId, tileX, tileY, {
      type: "world_item_removed",
      mapId,
      worldItemId,
    });
  }

  private unequipItemIdIfNeeded(session: PlayerSession, itemId: string) {
    const keys = ["weaponId", "shieldId", "helmetId", "armorId"] as const;
    for (const key of keys) {
      if (session.equipment[key] === itemId) {
        session.equipment[key] = null;
      }
    }
    session.equipment.equippedOutfit =
      outfitForArmorItemId(session.equipment.armorId) ?? "base";
    session.recalcDefenseStats();
    session.recalcAttackStats();
  }

  

  

  private spawnDeathLootAt(
    mapId: string,
    itemId: string,
    count: number,
    tileX: number,
    tileY: number
  ): void {
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(mapId) || count <= 0) {
      return;
    }

    const before = this.worldItems.findAtTile(mapId, tileX, tileY);
    const record = this.worldItems.spawn(mapId, itemId, tileX, tileY, count);
    if (!record) {
      return;
    }

    const kind = before?.id === record.id ? "updated" : "spawned";
    this.broadcastWorldItemState(mapId, tileX, tileY, record, kind);
  }

  public dropPlayerDeathLoot(session: PlayerSession) {
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(session.mapId)) {
      return;
    }
    if (session.deathLootProcessed) {
      return;
    }
    session.deathLootProcessed = true;

    session.inventorySlots = sanitizeJoinInventory(session.inventorySlots);
    this.syncInventoryEquippedFlags(session);

    const mapId = session.mapId;
    const originX = session.tileX;
    const originY = session.tileY;

    const lootStacks = collectDeathLootStacks(
      session.inventorySlots,
      session.equipment,
      {
        isKnownItemId: (itemId) => isKnownItemId(itemId),
        itemDropsOnDeath: (itemId) => itemDropsOnDeath(getItemDefinition(itemId as ItemId)),
        addOrphanToInventory: (itemId) => {
          const { added } = addToServerInventory(session.inventorySlots, itemId, 1);
          return added > 0;
        },
      }
    );

    for (const slot of session.inventorySlots) {
      if (!slot.itemId || slot.amount <= 0) continue;
      if (!isKnownItemId(slot.itemId)) {
        slot.itemId = null;
        slot.amount = 0;
        slot.isEquipped = false;
        continue;
      }
      const item = getItemDefinition(slot.itemId as ItemId);
      if (!itemDropsOnDeath(item)) continue;
      slot.itemId = null;
      slot.amount = 0;
      slot.isEquipped = false;
    }

    session.equipment.weaponId = null;
    session.equipment.shieldId = null;
    session.equipment.helmetId = null;
    session.equipment.armorId = null;
    session.equipment.equippedOutfit =
      outfitForArmorItemId(session.equipment.armorId) ?? "base";
    this.syncInventoryEquippedFlags(session);
    session.recalcDefenseStats();
    session.recalcAttackStats();

    const occupied = new Set<string>();
    for (const worldItem of this.worldItems.listForMap(mapId)) {
      occupied.add(`${worldItem.tileX},${worldItem.tileY}`);
    }

    const canDrop = (tileX: number, tileY: number) =>
      isWorldItemDropTileAllowed(mapId, tileX, tileY, (x, y) =>
        isMapTileWalkable(mapId, x, y, this.tileOverridesByMap.get(mapId))
      ) && !occupied.has(`${tileX},${tileY}`);

    for (const stack of lootStacks) {
      const dropTile = findNearestWalkableDropTile(originX, originY, canDrop, 32);
      if (!dropTile) {
        continue;
      }
      occupied.add(`${dropTile.tileX},${dropTile.tileY}`);
      this.spawnDeathLootAt(
        mapId,
        stack.itemId,
        stack.amount,
        dropTile.tileX,
        dropTile.tileY
      );
    }
  }

  public grantMobKillGold(killer: PlayerSession, mob: MobEntity): void {
    if (mob.goldReward <= 0) {
      return;
    }
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(killer.mapId) || killer.mapId !== mob.mapId) {
      return;
    }

    killer.gold += mob.goldReward;
    this.sendCombatLog(
      killer,
      `Obtuviste ${mob.goldReward.toLocaleString("es-AR")} de oro por derrotar a ${mob.name}.`
    );
    this.sendInventoryUpdated(killer);
    void this.persistSession(killer).catch((error) => {
      console.error("[mob_kill_gold] persist failed:", error);
    });
  }

  public grantMobKillExp(killer: PlayerSession, mob: MobEntity): void {
    if (mob.expReward <= 0) {
      return;
    }
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(killer.mapId) || killer.mapId !== mob.mapId) {
      return;
    }

    const previousLevel = killer.level;
    const result = applyExpGain(killer.level, killer.exp, killer.expToNext, mob.expReward);
    killer.level = result.level;
    killer.exp = result.exp;
    killer.expToNext = result.expToNext;

    this.sendCombatLog(
      killer,
      `Ganaste ${mob.expReward.toLocaleString("es-AR")} de experiencia por derrotar a ${mob.name}.`
    );

    if (result.levelsGained > 0) {
      if (!killer.isAdmin()) {
        const patch = applyLevelUpVitals({
          race: killer.raceId,
          classId: killer.classId as CharacterClassId,
          previousLevel,
          newLevel: killer.level,
          currentHp: killer.hp,
          currentMp: killer.mp,
          healToNewMax: false,
        });
        killer.hpMax = patch.hpMax;
        killer.mpMax = patch.mpMax;
        killer.hp = patch.hp;
        killer.mp = patch.mp;
      } else {
        killer.assignRoleByName();
      }
      this.sendCombatLog(killer, `¡Subiste al nivel ${killer.level}!`);
      this.sendPlayerState(killer);
    }

    this.sendPlayerProgressUpdated(killer);
    void this.persistSession(killer).catch((error) => {
      console.error("[mob_kill_exp] persist failed:", error);
    });
  }

  public sendPlayerProgressUpdated(session: PlayerSession): void {
    this.send(session, {
      type: "player_progress_updated",
      exp: session.exp,
      expToNext: session.expToNext,
      level: session.level,
    });
  }

  

  public syncAoiAfterMove(session: PlayerSession, oldX: number, oldY: number) { this.movementSystem.syncAoiAfterMove(session, oldX, oldY); }
  public broadcastPlayerMoved(session: PlayerSession) { this.movementSystem.broadcastPlayerMoved(session); }
  public buildWorldSnapshot(mapId: string): import("../../shared/protocol").WorldSnapshot {
    const players: import("../../shared/types").NetPlayerState[] = [];
    for (const player of this.players.values()) {
      if (player.joined && player.mapId === mapId) {
        players.push(player.toNetState());
      }
    }
    const mobs: import("../../shared/types").NetMobState[] = [];
    for (const mob of this.mobs.values()) {
      if (mob.alive && mob.mapId === mapId) {
        mobs.push(mob.toNetState());
      }
    }
    const worldItems = this.worldItems.listForMap(mapId).map((item) => this.worldItems.toNetState(item));
    return {
      tick: this.tick,
      mapId,
      players,
      mobs,
      worldItems,
    };
  }

}
