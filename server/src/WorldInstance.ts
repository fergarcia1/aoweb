import { logger } from "./logger";
import { findTransition } from "../../shared/maps";
import {
  canStayInNewbieDungeon,
  NEWBIE_DUNGEON_LEVEL_EXCEEDED_MESSAGE,
  NEWBIE_DUNGEON_MAP_ID,
  ULLATHORPE_MAP_ID,
  ULLATHORPE_NEWBIE_RETURN_TILE,
} from "../../shared/newbieDungeon";
import { randomUUID } from "node:crypto";
import { FactionSystem } from "./FactionSystem";
import { ChatSystem } from "./systems/ChatSystem";
import { InventorySystem } from "./systems/InventorySystem";
import { CombatSystem } from "./systems/CombatSystem";
import { MobSystem } from "./systems/MobSystem";
import { MovementSystem } from "./systems/MovementSystem";
import { InteractionSystem } from "./systems/InteractionSystem";
import { AuctionSystem } from "./systems/AuctionSystem";
import type { WorldContext } from "./systems/WorldContext";
import type { WebSocket } from "ws";
import { MAX_ACTIONS_PER_SECOND, tempBanIp } from "./networkSecurity";
import { isInAoi } from "../../shared/aoi";
import {
  applyJoinVitalsToSession,
  resolveJoinFallbackGold,
  resolveJoinGoldFromMessage,
} from "../../shared/joinSession";
import { DEFAULT_MAP_ID, LOGOUT_GRACE_MS, SAFE_ZONE_MAP_IDS, UNSAFE_LOGOUT_COUNTDOWN_SECONDS, WORLD_TICK_MS } from "../../game-data/constants";
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
import {
  splitPartyMobExp,
  splitPartyMobGold,
} from "../../game-data/partyMobRewards";
import { createEmptyPvpSpellHitRecords } from "../../game-data/antiOneshot";
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
import { BOAT_ITEM_IDS, isWaterTile } from "../../shared/navigation";
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
import { PartySystem } from "./systems/PartySystem";
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
  public readonly interactionSystem: InteractionSystem;
  private readonly socketSessions = new Map<WebSocket, PlayerSession>();
  private readonly mobs = new Map<string, MobEntity>();
  private readonly worldItems = new WorldItemRegistry();
  private readonly partySystem = new PartySystem();
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
  private readonly auctionSystem: AuctionSystem;

  constructor(characterRepo: CharacterRepository = new MemoryCharacterRepository()) {
    this.characterRepo = characterRepo;
    this.chatSystem = new ChatSystem(this);
    this.factionSystem = new FactionSystem(this);
    this.inventorySystem = new InventorySystem(this);
    this.combatSystem = new CombatSystem(this);
    this.mobSystem = new MobSystem(this);
    this.movementSystem = new MovementSystem(this);
    this.interactionSystem = new InteractionSystem(this);
    this.auctionSystem = new AuctionSystem(this);
    this.initAllMobs();
    void this.auctionSystem.init();
  }

  public getAuctionRepo() {
    return this.characterRepo as unknown as import("./persistence/repository").AuctionRepository;
  }

  public addToBankSlots(
    session: PlayerSession,
    itemId: string,
    amount: number
  ): { added: number; remaining: number } {
    let toAdd = Math.floor(amount);
    let addedTotal = 0;

    for (const slot of session.bankSlots) {
      if (slot.itemId === itemId) {
        slot.amount += toAdd;
        addedTotal += toAdd;
        toAdd = 0;
        break;
      }
    }

    if (toAdd > 0) {
      for (const slot of session.bankSlots) {
        if (!slot.itemId || slot.amount <= 0) {
          slot.itemId = itemId;
          slot.amount = toAdd;
          addedTotal += toAdd;
          toAdd = 0;
          break;
        }
      }
    }

    return { added: addedTotal, remaining: toAdd };
  }

  public removeFromBankSlot(
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

  public areInSameParty(playerIdA: string, playerIdB: string): boolean {
    if (playerIdA === playerIdB) return true;
    const p1 = this.partySystem.getPartyForPlayer(playerIdA);
    const p2 = this.partySystem.getPartyForPlayer(playerIdB);
    return !!(p1 && p2 && p1.id === p2.id);
  }

  public notifyPartyOfHpChange(playerId: string): void {
    const party = this.partySystem.getPartyForPlayer(playerId);
    if (party) {
      this.broadcastPartyUpdate(party);
    }
  }

  private initAllMobs() {
    this.applyFreshMobPlacements();
  }

  public getDynamicMapObjs(mapId: string) {
    let objs = this.dynamicMapObjs.get(mapId);
    if (!objs) {
      objs = [];
      const map = getMap(mapId);
      let overrides = this.tileOverridesByMap.get(mapId);
      if (map && map.legacyObjs) {
        for (const o of map.legacyObjs) {
          const def = resolveImportedObjDef(o.objIndex);
          const isDoor = def?.objType === 6 && (def.indexAbierta > 0 || def.indexCerrada > 0);
          const isOpen = isDoor ? o.objIndex === def.indexAbierta : false;
          objs.push({ tileX: o.tileX, tileY: o.tileY, objIndex: o.objIndex, isOpen });
          if (isDoor) {
            if (!overrides) {
              overrides = new Map();
              this.tileOverridesByMap.set(mapId, overrides);
            }
            setDoorTileOverride(overrides, o.tileX, o.tileY, isOpen);
          }
        }
      }
      this.dynamicMapObjs.set(mapId, objs);
    }
    return objs;
  }

  public setDynamicMapObjs(mapId: string, objs: { tileX: number; tileY: number; objIndex: number; isOpen: boolean }[]) {
    this.dynamicMapObjs.set(mapId, objs);
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
  public aggroMobOnPlayerHit(mob: MobEntity, attacker: PlayerSession) { this.mobSystem.aggroMobOnPlayerHit(mob, attacker); }

  public getRuntimeStats() {
    let aliveMobs = 0;
    for (const mob of this.mobs.values()) {
      if (mob.alive) {
        aliveMobs += 1;
      }
    }
    return {
      tick: this.tick,
      sessions: this.players.size,
      joinedPlayers: this.countJoinedPlayers(),
      aliveMobs,
      worldItems: this.worldItems.count(),
    };
  }

  async stop() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    logger.info("worldinstance", "[stop] Forzando persistencia de todos los jugadores activos...");
    const promises = [];
    for (const session of this.players.values()) {
      if (session.joined) {
        promises.push(this.persistSession(session));
      }
    }
    await Promise.all(promises);
    logger.info("worldinstance", "[stop] Todos los jugadores persistidos de forma segura.");
  }

  private onTick() {
    try {
      this.tick += 1;
      this.mobSystem.tick();
      this.combatSystem.tickResurrectChannels();
      this.tickMeditations();
      this.tickAttributeBuffs();
      this.autosavePlayersIfDue();
      if (this.tick % 10 === 0) {
        this.cleanupItems();
      }
    } catch (error) {
      logger.error("worldinstance", "[tick] unhandled error:", error);
    }
  }

  private cleanupItems() {
    const expired = this.worldItems.cleanupExpiredItems();
    for (const item of expired) {
      this.broadcastWorldItemRemoved(item.mapId, item.tileX, item.tileY, item.id);
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

  public getMapTileOverrides(mapId: string): ReadonlyMap<string, number> | undefined {
    this.getDynamicMapObjs(mapId);
    return this.tileOverridesByMap.get(mapId);
  }

  public setDoorTileOverride(mapId: string, tileX: number, tileY: number, isOpen: boolean) {
    let overrides = this.tileOverridesByMap.get(mapId);
    if (!overrides) {
      overrides = new Map();
      this.tileOverridesByMap.set(mapId, overrides);
    }
    setDoorTileOverride(overrides, tileX, tileY, isOpen);
  }

  private autosavePlayersIfDue() {
    const now = Date.now();
    if (now - this.lastAutosaveAt < AUTOSAVE_INTERVAL_MS) return;
    this.lastAutosaveAt = now;
    for (const player of this.players.values()) {
      if (!player.joined) continue;
      void this.persistSession(player).catch((error) => {
        logger.error("worldinstance", "[autosave] persist failed:", error);
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

      const amount = Math.max(
        1,
        Math.ceil(session.mpMax * MECHANICS.MEDITATION_MP_REGEN_PERCENT_PER_TICK)
      );
      session.mp = Math.min(session.mpMax, session.mp + amount);
      session.nextMeditationRegenAt = now + MECHANICS.INTERVAL_MEDITATION_REGEN;
      this.broadcastPlayerState(session);
      this.schedulePersistSessionDebounced(session);
      if (session.mp >= session.mpMax) {
        session.mp = session.mpMax;
        this.stopMeditation(session, "Tu mana esta completo.");
        this.schedulePersistSessionDebounced(session);
      }
    }
  }

  handleConnection(socket: WebSocket) {
    const joinDeadline = Date.now() + JOIN_TIMEOUT_MS;
    const joinTimer = setTimeout(() => {
      const session = this.socketSessions.get(socket);
      if ((!session || !session.joined) && socket.readyState === socket.OPEN) {
        console.warn(
          `[join] timeout esperando join/welcome${session ? ` para ${session.name || session.id}` : ""}`
        );
        socket.close(4000, "join timeout");
      }
    }, JOIN_TIMEOUT_MS);

    socket.on("message", (data) => {
      try {
        const raw = typeof data === "string" ? data : data.toString("utf8");

        // Anti-Spam: Payload size limit (16KB max)
        if (raw.length > 16384) {
          logger.warn("worldinstance", `[AntiSpam] Payload demasiado grande (${raw.length} bytes). Cortando conexión.`);
          socket.close(4009, "Payload too large");
          return;
        }

        // Anti-Spam: Rate Limit por socket
        const now = Date.now();
        const state = (socket as any)._spamState || { count: 0, windowStart: now };
        if (now - state.windowStart > 1000) {
          state.count = 1;
          state.windowStart = now;
        } else {
          state.count++;
          if (state.count > MAX_ACTIONS_PER_SECOND) {
             logger.warn("worldinstance", `[AntiSpam] Límite de acciones excedido (${state.count} msg/s). Cortando conexión.`);
             tempBanIp((socket as any).realIp || "unknown");
             socket.close(4008, "Rate limit exceeded");
             return;
          }
        }
        (socket as any)._spamState = state;

        const message = parseClientMessage(raw);
        if (!message) {
          logger.warn("worldinstance", `[ws] mensaje invalido antes/durante join: ${raw.slice(0, 500)}`);
          const session = this.socketSessions.get(socket);
          if (session) {
            this.send(session, { type: "error", message: "Mensaje inválido." });
          }
          return;
        }

        if (message.type === "join") {
          console.log(
            `[join] recibido ${String(message.name ?? "").slice(0, 24)} (${String(
              message.characterId ?? ""
            ).slice(0, 32)})`
          );
          clearTimeout(joinTimer);
          let session = this.socketSessions.get(socket);
          if (!session) {
            session = new PlayerSession(randomUUID(), socket);
            session.accountId =
              (socket as typeof socket & { accountId?: string }).accountId ?? null;
            this.players.set(session.id, session);
            this.socketSessions.set(socket, session);
          }
          this.handleJoin(session, message);
          return;
        }

        const session = this.socketSessions.get(socket);
        if (!session) {
          logger.warn("worldinstance", `[join] mensaje ${message.type} recibido antes de join`);
          if (Date.now() > joinDeadline) {
            socket.close(4001, "join required");
          }
          return;
        }
        this.handleClientMessage(session, message);
      } catch (error) {
        logger.error("worldinstance", "[ws] message handler error:", error);
        const session = this.socketSessions.get(socket);
        if (session) {
          this.send(session, { type: "error", message: "Error interno del servidor." });
        }
      }
    });

    socket.on("error", (error) => {
      logger.error("worldinstance", "[ws] socket error:", error);
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
          logger.error("worldinstance", "[leave] failed to persist session:", error);
        })
        .finally(() => {
          if (this.isInSafeZone(session)) {
            logger.info("worldinstance", `[leave] ${session.name} (${session.id.slice(0, 8)}) — zona segura, removiendo al instante`);
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
      this.interactionSystem.handleBankAction(session, message.action, message.amount, message.slotIndex);
      return;
    }
    if (message.type === "shop_buy") {
      this.stopMeditationForAction(session);
      this.interactionSystem.handleShopBuy(session, message.role, message.itemId, message.amount);
      return;
    }
    if (message.type === "shop_sell") {
      this.stopMeditationForAction(session);
      this.interactionSystem.handleShopSell(session, message.role, message.inventorySlot, message.amount);
      return;
    }
    if (message.type === "spell_shop_buy") {
      this.stopMeditationForAction(session);
      this.interactionSystem.handleSpellShopBuy(session, message.spellId);
      return;
    }
    if (message.type === "revive") {
      this.stopMeditationForAction(session);
      this.interactionSystem.handleRevive(
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
      this.interactionSystem.handleInteractMap(session, message.tileX, message.tileY);
      return;
    }
    if (message.type === "party_action") {
      this.handlePartyAction(session, message);
      return;
    }
    if (message.type === "auction_fetch") {
      this.auctionSystem.sendAuctionCatalog(session);
      return;
    }
    if (message.type === "auction_list") {
      void this.auctionSystem.handleListAuction(
        session,
        message.inventorySlot,
        message.amount,
        message.price,
        message.durationHours
      );
      return;
    }
    if (message.type === "auction_buy") {
      void this.auctionSystem.handleBuyAuction(session, message.auctionId);
      return;
    }
    if (message.type === "auction_cancel") {
      void this.auctionSystem.handleCancelAuction(session, message.auctionId);
      return;
    }
  }


  private handleSyncInventory(
    session: PlayerSession,
    inventory: Extract<ClientMessage, { type: "sync_inventory" }>["inventory"]
  ) {
    if (!session.joined) return;

    // Actualizar los slots del inventario en la sesión del servidor
    session.inventorySlots = inventory.map((slot) => ({
      slotIndex: slot.slotIndex,
      itemId: slot.itemId as any,
      amount: slot.amount,
      isEquipped: slot.isEquipped ?? false,
    }));

    // Sincronizar equipamiento visual si algo cambió (opcional pero recomendado)
    this.inventorySystem.handleSyncVitals(session, {}); 

    // Notificar éxito (aunque el cliente ya lo movió localmente, esto confirma el estado)
    this.sendInventoryUpdated(session);

    // Persistir el nuevo orden en la DB
    void this.persistSession(session).catch((error) => {
      logger.error("worldinstance", "[sync_inventory] failed to persist session:", error);
    });
  }

  private handleSyncBank(
    session: PlayerSession,
    message: Extract<ClientMessage, { type: "sync_bank" }>
  ) {
    if (!session.joined) return;
    this.sendInventoryUpdated(session);
    this.sendBankUpdated(session);
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
    session.accountId =
      (session.socket as typeof session.socket & { accountId?: string }).accountId ??
      session.accountId;
    session.characterId =
      typeof message.characterId === "string" && message.characterId.trim()
        ? message.characterId.trim().slice(0, 64)
        : session.id;
    void this.tryHydrateSessionFromRepository(session, message).catch((error) => {
      logger.error("worldinstance", "[join] failed to hydrate from repository:", error);
      this.send(session, {
        type: "error",
        message:
          "No se pudo cargar tu personaje desde la base de datos. Reinicia el servidor o corre la migracion antes de entrar.",
      });
      session.socket.close(1011, "character repository error");
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
    if (session.accountId && persisted.character.accountId !== session.accountId) {
      this.send(session, {
        type: "error",
        message: persisted.character.accountId
          ? "Ese personaje pertenece a otra cuenta."
          : "Ese personaje todavia no esta vinculado a ninguna cuenta.",
      });
      session.socket.close(4004, "character ownership mismatch");
      return;
    }
    if (!session.accountId && persisted.character.accountId) {
      this.send(session, {
        type: "error",
        message: "Inicia sesion con la cuenta dueña de ese personaje.",
      });
      session.socket.close(4004, "character requires account");
      return;
    }
    if (
      requestedCharacterId &&
      persisted.character.id.trim() &&
      persisted.character.id.trim() !== requestedCharacterId
    ) {
      if (session.accountId) {
        this.send(session, {
          type: "error",
          message: "Ya existe un personaje con ese nombre.",
        });
        session.socket.close(4004, "character name already exists");
        return;
      }
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
    session.accountId = c.accountId ?? session.accountId;
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
    session.usersKilled = Math.max(0, Math.floor(c.usersKilled || 0));
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
    if (this.canUseJoinTile(session, mapId, pending.tileX, pending.tileY)) {
      session.mapId = mapId;
      session.tileX = pending.tileX;
      session.tileY = pending.tileY;
      session.facing = normalizeFacing(pending.facing);
      this.applyNavigationStateForJoinTile(session, mapId, pending.tileX, pending.tileY);
    }
    this.pendingReconnectPositions.delete(characterId);
  }

  private hasNavigationItem(session: PlayerSession): boolean {
    return session.inventorySlots.some(
      (slot) => slot.itemId && slot.amount > 0 && BOAT_ITEM_IDS.has(slot.itemId)
    );
  }

  private canUseJoinTile(
    session: PlayerSession,
    mapId: string,
    tileX: number,
    tileY: number
  ): boolean {
    const tileOverrides = this.tileOverridesByMap.get(mapId);
    if (isMapTileWalkable(mapId, tileX, tileY, tileOverrides)) {
      return true;
    }
    if (!this.hasNavigationItem(session)) {
      return false;
    }
    return isWaterTile(getMap(mapId), tileX, tileY, tileOverrides);
  }

  private applyNavigationStateForJoinTile(
    session: PlayerSession,
    mapId: string,
    tileX: number,
    tileY: number
  ): void {
    const tileOverrides = this.tileOverridesByMap.get(mapId);
    session.isNavigating =
      this.hasNavigationItem(session) && isWaterTile(getMap(mapId), tileX, tileY, tileOverrides);
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
        this.canUseJoinTile(session, mapId, tile.tileX, tile.tileY) &&
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
        logger.error("worldinstance", "[move] debounced persist failed:", error);
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
    this.applyNavigationStateForJoinTile(
      session,
      session.mapId,
      resolvedTile.tileX,
      resolvedTile.tileY
    );
    this.enforceNewbieDungeonLevelCap(session);

    this.maybeRerollMobPlacementsForNewSession();
    session.joined = true;

    this.sendWelcome(session);

    this.movementSystem.sendSnapshot(session);
    this.movementSystem.initAoiOnJoin(session);
    void this.persistSession(session).catch((error) => {
      logger.error("worldinstance", "[join] persist failed:", error);
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
      logger.error("worldinstance", `[persist] upsert failed (${session.name}/${session.characterId}):`, error);
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

  public syncInventoryEquippedFlags(session: PlayerSession) {
    const equippedIds = new Set<string>(
      [session.equipment.weaponId, session.equipment.shieldId, session.equipment.helmetId, session.equipment.armorId]
        .filter((value): value is string => Boolean(value))
    );
    for (const slot of session.inventorySlots) {
      slot.isEquipped = Boolean(slot.itemId && slot.amount > 0 && equippedIds.has(slot.itemId));
    }
  }

  public dropPlayerDeathLoot(session: PlayerSession): void {
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
        isMapTileWalkable(mapId, x, y, this.getMapTileOverrides(mapId))
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

    const recipients = this.resolveMobKillRewardRecipients(killer, mob);
    const goldShare = splitPartyMobGold(mob.goldReward, recipients.length);
    if (goldShare <= 0) {
      return;
    }

    const inPartySplit = recipients.length > 1;
    for (const recipient of recipients) {
      recipient.gold += goldShare;
      const splitNote = inPartySplit ? " (reparto de grupo)" : "";
      this.sendCombatLog(
        recipient,
        `Obtuviste ${goldShare.toLocaleString("es-AR")} de oro por derrotar a ${mob.name}${splitNote}.`
      );
      this.sendInventoryUpdated(recipient);
      void this.persistSession(recipient).catch((error) => {
        logger.error("worldinstance", "[mob_kill_gold] persist failed:", error);
      });
    }
  }

  public grantMobKillExp(killer: PlayerSession, mob: MobEntity): void {
    if (mob.expReward <= 0) {
      return;
    }
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(killer.mapId) || killer.mapId !== mob.mapId) {
      return;
    }

    const recipients = this.resolveMobKillRewardRecipients(killer, mob);
    const { sharePerMember, hasGroupBonus } = splitPartyMobExp(
      mob.expReward,
      recipients.length
    );
    if (sharePerMember <= 0) {
      return;
    }

    for (const recipient of recipients) {
      this.grantExpToPlayer(recipient, sharePerMember, mob.name, hasGroupBonus);
    }
  }

  private resolveMobKillRewardRecipients(
    killer: PlayerSession,
    mob: MobEntity
  ): PlayerSession[] {
    const party = this.partySystem.getPartyForPlayer(killer.id);
    if (!party) {
      return [killer];
    }

    const present = this.partySystem.getMembersPresentOnMap(
      party,
      mob.mapId,
      this.players
    );
    if (present.length === 0) {
      return [killer];
    }
    return present;
  }

  private grantExpToPlayer(
    session: PlayerSession,
    amount: number,
    mobName: string,
    partyBonus: boolean
  ): void {
    const previousLevel = session.level;
    const result = applyExpGain(session.level, session.exp, session.expToNext, amount);
    session.level = result.level;
    session.exp = result.exp;
    session.expToNext = result.expToNext;

    const bonusNote = partyBonus ? " (+15% bonus de grupo)" : "";
    this.sendCombatLog(
      session,
      `Ganaste ${amount.toLocaleString("es-AR")} de experiencia por derrotar a ${mobName}${bonusNote}.`
    );

    if (result.levelsGained > 0) {
      if (!session.isAdmin()) {
        const patch = applyLevelUpVitals({
          race: session.raceId,
          classId: session.classId as CharacterClassId,
          previousLevel,
          newLevel: session.level,
          currentHp: session.hp,
          currentMp: session.mp,
          healToNewMax: false,
        });
        session.hpMax = patch.hpMax;
        session.mpMax = patch.mpMax;
        session.hp = patch.hp;
        session.mp = patch.mp;
      } else {
        session.assignRoleByName();
      }
      this.sendCombatLog(session, `¡Subiste al nivel ${session.level}!`);
      this.sendPlayerState(session);
      this.broadcastToAoi(session.mapId, session.tileX, session.tileY, {
        type: "player_updated",
        player: session.toNetState(),
      });
      this.notifyPartyOfHpChange(session.id);

      if (
        session.mapId === NEWBIE_DUNGEON_MAP_ID &&
        !canStayInNewbieDungeon(session.level)
      ) {
        this.sendCombatLog(session, NEWBIE_DUNGEON_LEVEL_EXCEEDED_MESSAGE);
        this.teleportPlayer(
          session,
          ULLATHORPE_MAP_ID,
          ULLATHORPE_NEWBIE_RETURN_TILE.tileX,
          ULLATHORPE_NEWBIE_RETURN_TILE.tileY,
          "down"
        );
      }
    }

    this.sendPlayerProgressUpdated(session);
    void this.persistSession(session).catch((error) => {
      logger.error("worldinstance", "[mob_kill_exp] persist failed:", error);
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

  private enforceNewbieDungeonLevelCap(session: PlayerSession): void {
    if (session.mapId !== NEWBIE_DUNGEON_MAP_ID || canStayInNewbieDungeon(session.level)) {
      return;
    }
    this.sendCombatLog(session, NEWBIE_DUNGEON_LEVEL_EXCEEDED_MESSAGE);
    session.mapId = ULLATHORPE_MAP_ID;
    session.tileX = ULLATHORPE_NEWBIE_RETURN_TILE.tileX;
    session.tileY = ULLATHORPE_NEWBIE_RETURN_TILE.tileY;
    session.facing = "down";
  }

  private teleportPlayer(
    session: PlayerSession,
    mapId: string,
    tileX: number,
    tileY: number,
    facing: import("../../shared/types").Facing = "down"
  ): void {
    this.movementSystem.changeMap(session, {
      tileX: session.tileX,
      tileY: session.tileY,
      toMapId: mapId,
      toTileX: tileX,
      toTileY: tileY,
      facing,
    });
  }

  private isInSafeZone(player: PlayerSession): boolean {
    return SAFE_ZONE_MAP_IDS.has(player.mapId);
  }

  private resetEphemeralCombatState(session: PlayerSession): void {
    session.clearInvisible();
    session.clearImmobilized();
  }

  private expireAttributeBuffsIfNeeded(session: PlayerSession, now = Date.now()): void {
    if (session.attributeBuffs.expiresAtMs <= now) {
      session.attributeBuffs = { strength: 0, agility: 0, expiresAtMs: 0 };
    }
  }

  private tickAttributeBuffs(): void {
    const now = Date.now();
    for (const session of this.players.values()) {
      const beforeExpiresAt = session.attributeBuffs.expiresAtMs;
      if (beforeExpiresAt <= 0) {
        continue;
      }
      this.expireAttributeBuffsIfNeeded(session, now);
      if (session.attributeBuffs.expiresAtMs !== beforeExpiresAt) {
        this.sendPlayerState(session, { includeAttributeBuffs: true });
        this.schedulePersistSessionDebounced(session);
      }
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
    logger.info("worldinstance", `[logout] cancelado por movimiento — ${session.name} (${session.id.slice(0, 8)})`);
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
    logger.info("worldinstance", `[logout] ${session.name} (${session.id.slice(0, 8)}) map=${session.mapId}`);
    if (this.pendingLogoutCountdownTimers.has(session.id)) {
      this.sendCombatLog(session, "Ya estás desconectando...");
      return;
    }

    if (this.isInSafeZone(session)) {
      void this.completeLogout(session);
      return;
    }

    let secondsLeft = UNSAFE_LOGOUT_COUNTDOWN_SECONDS;
    this.sendCombatLog(session, `Desconectando en ${secondsLeft} segundos.`);
    this.send(session, { type: "logout_countdown", secondsLeft });

    const timer = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        this.clearPendingLogout(session.id);
        void this.completeLogout(session);
        return;
      }
      this.sendCombatLog(session, `Desconectando en ${secondsLeft} segundos.`);
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
      logger.error("worldinstance", "[logout] failed to persist session:", error);
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
      logger.info("worldinstance", `[leave] ${session.name} (${playerId.slice(0, 8)})`);
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
      if (!player.joined || player.id === moverPlayerId || player.mapId !== mapId || player.tileX !== tileX || player.tileY !== tileY) continue;
      if (isPlayerGhostFromVitals(player.hp, player.isDead)) ghostsOnTile.push(player);
    }
    if (ghostsOnTile.length === 0) return true;
    const reserved = new Set<string>([`${tileX},${tileY}`]);
    for (const ghost of ghostsOnTile) {
      const dest = this.findGhostDisplacementTile(mapId, tileX, tileY, incomingFromTileX, incomingFromTileY, ghost.id, reserved);
      if (!dest) return false;
      reserved.add(`${dest.tileX},${dest.tileY}`);
      const prevGx = ghost.tileX;
      const prevGy = ghost.tileY;
      ghost.tileX = dest.tileX;
      ghost.tileY = dest.tileY;
      this.schedulePersistSessionDebounced(ghost);
      this.send(ghost, { type: "player_moved", player: ghost.toNetState() });
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

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nextX = occupiedTileX + dx;
      const nextY = occupiedTileY + dy;
      const key = `${nextX},${nextY}`;
      if (reservedTiles.has(key)) continue;
      if (!isMapTileWalkable(mapId, nextX, nextY, this.getMapTileOverrides(mapId)) || isTileBlockedByMapObject(getMap(mapId).objects, nextX, nextY)) continue;
      if (this.isTileOccupied(nextX, nextY, mapId, ghostId)) continue;
      const score = -(dx * incomingDx + dy * incomingDy);
      candidates.push({ tileX: nextX, tileY: nextY, score });
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      return { tileX: candidates[0].tileX, tileY: candidates[0].tileY };
    }

    return findNearestWalkableSpawnTile(mapId, { tileX: occupiedTileX, tileY: occupiedTileY }, (nextX, nextY) => {
      const key = `${nextX},${nextY}`;
      if (reservedTiles.has(key)) return true;
      if (nextX === occupiedTileX && nextY === occupiedTileY) return true;
      if (!isMapTileWalkable(mapId, nextX, nextY, this.getMapTileOverrides(mapId)) || isTileBlockedByMapObject(getMap(mapId).objects, nextX, nextY)) return true;
      return this.isTileOccupied(nextX, nextY, mapId, ghostId);
    }, 8);
  }

  public sendCombatLog(session: PlayerSession, text: string) {
    this.send(session, { type: "combat_log", text });
  }

  public broadcastCombatLog(mapId: string, tileX: number, tileY: number, text: string) {
    this.broadcastToAoi(mapId, tileX, tileY, { type: "combat_log", text });
  }

  public broadcastGameEvent(mapId: string, tileX: number, tileY: number, event: GameEvent) {
    this.broadcastToAoi(mapId, tileX, tileY, { type: "game_event", event });
  }

  public broadcastMobUpdated(mob: MobEntity) {
    this.broadcastToAoi(mob.mapId, mob.tileX, mob.tileY, { type: "mob_updated", mob: mob.toNetState() });
  }

  public sendPlayerState(session: PlayerSession, options?: { includeAttributeBuffs?: boolean }) {
    this.send(session, { type: "player_updated", player: session.toNetState(options) });
  }

  public broadcastPlayerState(session: PlayerSession, options?: { includeAttributeBuffs?: boolean }) {
    const message: ServerMessage = { type: "player_updated", player: session.toNetState(options) };
    this.send(session, message);
    this.broadcastToAoi(session.mapId, session.tileX, session.tileY, message, session.id);
  }

  public send(session: PlayerSession, message: ServerMessage) {
    if (session.socket.readyState !== session.socket.OPEN) return;
    try {
      session.socket.send(JSON.stringify(message));
    } catch (error) {
      logger.error("worldinstance", `[ws] send failed (${session.name}):`, error);
    }
  }

  public broadcastToAoi(mapId: string, tileX: number, tileY: number, message: ServerMessage, exceptId?: string) {
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

  public sendBankUpdated(session: PlayerSession): void {
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

  public sendSpellsUpdated(session: PlayerSession): void {
    this.send(session, {
      type: "spells_updated",
      learnedSpellIds: [...session.learnedSpellIds],
    });
  }

  public broadcastWorldItemState(mapId: string, tileX: number, tileY: number, record: import("./WorldItemRegistry").WorldItemRecord, kind: "spawned" | "updated") {
    const item = this.worldItems.toNetState(record);
    const message: ServerMessage = kind === "spawned" ? { type: "world_item_spawned", mapId, item } : { type: "world_item_updated", mapId, item };
    this.broadcastToAoi(mapId, tileX, tileY, message);
  }

  public broadcastWorldItemRemoved(mapId: string, tileX: number, tileY: number, worldItemId: string) {
    this.broadcastToAoi(mapId, tileX, tileY, { type: "world_item_removed", mapId, worldItemId });
  }

  public syncAoiAfterMove(session: PlayerSession, oldX: number, oldY: number) { this.movementSystem.syncAoiAfterMove(session, oldX, oldY); }
  public broadcastPlayerMoved(session: PlayerSession) { this.movementSystem.broadcastPlayerMoved(session); }
  public buildWorldSnapshot(mapId: string): import("../../shared/protocol").WorldSnapshot {
    const players: import("../../shared/types").NetPlayerState[] = [];
    for (const player of this.players.values()) {
      if (player.joined && player.mapId === mapId) players.push(player.toNetState());
    }
    const mobs: import("../../shared/types").NetMobState[] = [];
    for (const mob of this.mobs.values()) {
      if (mob.alive && mob.mapId === mapId) mobs.push(mob.toNetState());
    }
    const worldItems = this.worldItems.listForMap(mapId).map((item) => this.worldItems.toNetState(item));
    return { tick: this.tick, mapId, players, mobs, worldItems };
  }

  public handlePartyAction(session: PlayerSession, message: import("../../shared/protocol").ClientPartyActionMessage) {
    if (message.action === "invite") {
      const target = [...this.players.values()].find(p => p.name.toLowerCase() === message.targetName?.toLowerCase());
      if (!target || !target.joined) {
        this.sendCombatLog(session, "No se encontró al jugador.");
        return;
      }
      const res = this.partySystem.invite(session, target);
      if (res.ok) {
        this.sendCombatLog(session, `Invitación enviada a ${target.name}.`);
        this.sendPartyInviteRequest(target, session);
      } else {
        this.sendCombatLog(session, res.reason);
      }
    } else if (message.action === "accept") {
      const res = this.partySystem.acceptInvite(session, message.leaderId || "");
      if (res.ok) this.broadcastPartyUpdate(res.party);
      else this.sendCombatLog(session, res.reason);
    } else if (message.action === "leave") {
      const res = this.partySystem.leave(session);
      if (res.ok) {
        this.sendPartyUpdate(session, null);
        if (!res.dissolved) {
          const party = this.partySystem.getPartyForPlayer(res.oldParty.leaderId);
          if (party) this.broadcastPartyUpdate(party);
        } else {
          for (const id of res.oldParty.memberIds) {
            const member = this.players.get(id);
            if (member) {
              this.sendCombatLog(member, "El grupo ha sido disuelto.");
              this.sendPartyUpdate(member, null);
            }
          }
        }
      } else this.sendCombatLog(session, res.reason);
    } else if (message.action === "kick") {
      const targetId = message.targetId || "";
      const res = this.partySystem.kick(session, targetId);
      if (res.ok) {
        const kicked = this.players.get(res.kickedId);
        if (kicked) {
          this.sendCombatLog(kicked, "Fuiste expulsado del grupo.");
          this.sendPartyUpdate(kicked, null);
        }
        this.broadcastPartyUpdate(res.party);
      } else this.sendCombatLog(session, res.reason);
    } else if (message.action === "dissolve") {
      const res = this.partySystem.dissolve(session);
      if (res.ok) {
        for (const id of res.oldParty.memberIds) {
          const member = this.players.get(id);
          if (member) {
            this.sendCombatLog(member, "El grupo ha sido disuelto.");
            this.sendPartyUpdate(member, null);
          }
        }
      } else this.sendCombatLog(session, res.reason);
    }
  }

  private sendPartyInviteRequest(session: PlayerSession, leader: PlayerSession) {
    this.send(session, { type: "party_invite_request", leaderId: leader.id, leaderName: leader.name });
  }

  private broadcastPartyUpdate(party: import("./systems/PartySystem").Party) {
    const members = party.memberIds.map(id => {
      const p = this.players.get(id);
      return { id, name: p?.name || "Desconocido", level: p?.level || 1, hp: p?.hp || 0, hpMax: p?.hpMax || 1 };
    });
    for (const id of party.memberIds) {
      const member = this.players.get(id);
      if (member) this.send(member, { type: "party_update", partyId: party.id, leaderId: party.leaderId, members });
    }
  }

  private sendPartyUpdate(session: PlayerSession, party: import("./systems/PartySystem").Party | null) {
    if (!party) this.send(session, { type: "party_update", partyId: null, leaderId: null, members: [] });
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
}
