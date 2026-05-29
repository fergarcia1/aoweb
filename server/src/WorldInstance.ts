import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import { isInAoi } from "../../shared/aoi";
import {
  resolveJoinFallbackGold,
  resolveJoinGoldFromMessage,
} from "../../shared/joinSession";
import { DEFAULT_MAP_ID, SAFE_ZONE_MAP_IDS, WORLD_TICK_MS } from "../../shared/constants";
import {
  clampPlayerLevel,
  clampVitalPair,
  MULTIPLAYER_SERVER_MAP_IDS,
  normalizeFacing,
  resolveMultiplayerMapId,
  sanitizeJoinEquipment,
  sanitizeJoinInventory,
} from "../../shared/joinValidation";
import {
  ATTACK_COOLDOWN_MS,
  getSpellDefinition,
  isAdjacent,
  isImmobilizeSpell,
  rollAttackDamage,
  rollInt,
} from "../../shared/combat";
import { mobFootprintOccupiesTile } from "../../shared/mobFootprint";
import {
  buildAllInitialMobPlacements,
  pickRandomMobSpawnTile,
} from "../../shared/mobSpawns";
import {
  expireAttributeBuffs,
  tryUseConsumableOnVitals,
} from "../../game-data/consumables";
import type { CharacterClassId } from "../../game-data/items/catalog";
import { getConsumableById } from "../../game-data/consumables";
import { isKnownItemId } from "../../game-data/items/registry";
import { outfitForArmorItemId } from "../../game-data/outfits";
import { canUseItem } from "../../src/game/itemUsability";
import {
  getItemDefinition,
  itemDropsOnDeath,
  type EquipmentSlot,
  type ItemId,
} from "../../game-data/items/definitions";
import {
  moveCooldownUntil,
  validateAttackIntent,
  validateMoveDirection,
  validateMoveIntent,
} from "../../shared/multiplayerIntents";
import { deltaFromDirection, facingFromDirection, parseClientMessage } from "../../shared/protocol";
import type { ClientMessage, ServerMessage } from "../../shared/protocol";
import {
  findNearestWalkableSpawnTile,
  getMapSpawnTile,
  isMapTileWalkable,
} from "../../shared/mapWalkability";
import { MOB_MODELS, MOB_SPAWNS, type MobModelId } from "../../src/data/mobs";
import { MOB_DEFAULT_MOVE_SPEED_RATIO } from "../../src/game/mobs/mobVisualConfig";
import { STEP_DURATION_MS } from "../../game-data/constants";
import { canFactionsFight, normalizeFactionId } from "../../shared/faction";
import type { Facing } from "../../shared/types";
import { getMap } from "../../src/maps/index";
import { getMapObjectDefinition } from "../../src/maps/mapObjectDefinitions";
import type { MapObjectPlacement } from "../../src/maps/types";
import { getNpcOccupiedTiles } from "../../src/npcs/npcDefinitions";
import type { GameEvent } from "../../shared/types";
import { addToServerInventory, removeFromServerSlot } from "../../shared/serverInventory";
import { PlayerSession } from "./PlayerSession";
import { MobEntity } from "./MobEntity";
import { WorldItemRegistry } from "./WorldItemRegistry";
import {
  buildSnapshotFromPlayerSession,
  MemoryCharacterRepository,
  type CharacterRepository,
  type PersistedCharacterSnapshot,
} from "./persistence";

const INMOVILIZADO_MS = 6000;
const JOIN_TIMEOUT_MS = 15_000;
const AUTOSAVE_INTERVAL_MS = 30_000;

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

export class WorldInstance {
  private readonly players = new Map<string, PlayerSession>();
  private readonly socketSessions = new Map<WebSocket, PlayerSession>();
  private readonly mobs = new Map<string, MobEntity>();
  private readonly worldItems = new WorldItemRegistry();
  private readonly characterRepo: CharacterRepository;
  private tick = 0;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private lastAutosaveAt = Date.now();

  constructor(characterRepo: CharacterRepository = new MemoryCharacterRepository()) {
    this.characterRepo = characterRepo;
    this.initAllMobs();
  }

  private initAllMobs() {
    this.applyFreshMobPlacements();
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
    for (const placement of buildAllInitialMobPlacements()) {
      const spawn = MOB_SPAWNS.find((entry) => entry.id === placement.spawnId);
      const existing = this.mobs.get(placement.spawnId);
      if (existing) {
        existing.tileX = placement.tileX;
        existing.tileY = placement.tileY;
        existing.alive = true;
        existing.hp = existing.maxHp;
        existing.respawnAt = 0;
        continue;
      }
      if (!spawn) {
        continue;
      }
      this.mobs.set(
        placement.spawnId,
        new MobEntity({
          id: placement.spawnId,
          mobId: placement.mobId,
          name: placement.name,
          mapId: placement.mapId,
          tileX: placement.tileX,
          tileY: placement.tileY,
          maxHp: placement.maxHp,
          behavior: placement.behavior,
          hitboxOffsetY: placement.hitboxOffsetY,
          hitboxWidthTiles: placement.hitboxWidthTiles,
          hitboxHeightTiles: placement.hitboxHeightTiles,
          detectionRangeTiles: spawn.detectionRangeTiles,
          leashRangeTiles: spawn.leashRangeTiles,
          attackDamage: spawn.attackDamage,
          attackCooldownMs: spawn.attackCooldownMs,
          respawnMs: spawn.respawnMs,
          aiMoveCooldownMs: getMobStepDurationMs(spawn.modelId),
        })
      );
    }
  }

  private aggroMobOnPlayerHit(mob: MobEntity, attacker: PlayerSession) {
    if (!mob.alive || mob.behavior !== "aggressive" || mob.attackDamage <= 0) {
      return;
    }
    mob.isAggroed = true;
    mob.facing = this.facingTowards(mob.tileX, mob.tileY, attacker.tileX, attacker.tileY);
  }

  private maybeRerollMobPlacementsForNewSession() {
    if (this.countJoinedPlayers() > 0) {
      return;
    }
    this.applyFreshMobPlacements();
  }

  private isTileBlockedForMobSpawn(
    mapId: string,
    tileX: number,
    tileY: number,
    excludeMobId?: string
  ): boolean {
    if (!isMapTileWalkable(mapId, tileX, tileY)) {
      return true;
    }
    if (isTileBlockedByMapObject(getMap(mapId).objects, tileX, tileY)) {
      return true;
    }
    if (getNpcOccupiedTiles(mapId).some((tile) => tile.x === tileX && tile.y === tileY)) {
      return true;
    }
    for (const mob of this.mobs.values()) {
      if (mob.id === excludeMobId || mob.mapId !== mapId || !mob.alive) {
        continue;
      }
      if (mob.tileX === tileX && mob.tileY === tileY) {
        return true;
      }
    }
    for (const player of this.players.values()) {
      if (!player.joined || player.mapId !== mapId) {
        continue;
      }
      if (player.tileX === tileX && player.tileY === tileY) {
        return true;
      }
    }
    return false;
  }

  private pickRandomMobSpawnTileForMap(mapId: string, excludeMobId?: string) {
    return pickRandomMobSpawnTile(mapId, (tileX, tileY) =>
      this.isTileBlockedForMobSpawn(mapId, tileX, tileY, excludeMobId)
    );
  }

  start() {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => this.onTick(), WORLD_TICK_MS);
  }

  stop() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private onTick() {
    this.tick += 1;
    for (const mob of this.processMobRespawns()) {
      this.broadcastMobUpdated(mob);
    }
    this.processMobWander();
    this.processMobCombat();
    this.autosavePlayersIfDue();
  }

  private autosavePlayersIfDue() {
    const now = Date.now();
    if (now - this.lastAutosaveAt < AUTOSAVE_INTERVAL_MS) return;
    this.lastAutosaveAt = now;
    for (const player of this.players.values()) {
      if (!player.joined) continue;
      void this.persistSession(player);
    }
  }

  private processMobWander() {
    const now = Date.now();
    for (const mob of this.mobs.values()) {
      if (!mob.alive || mob.behavior !== "peaceful") continue;
      if (now < mob.nextWanderAt) continue;
      if (mob.isImmobilized(now)) {
        mob.scheduleNextWander();
        continue;
      }
      this.tryWanderMob(mob);
      mob.scheduleNextWander();
    }
  }

  private processMobCombat() {
    const now = Date.now();

    for (const mob of this.mobs.values()) {
      if (!mob.alive) continue;
      if (mob.behavior !== "aggressive") continue;
      if (mob.attackDamage <= 0) continue;
      if (mob.isImmobilized(now)) continue;

      const target = this.findClosestPlayerForMob(mob);
      if (!target || target.hp <= 0) {
        mob.isAggroed = false;
        continue;
      }

      const distance =
        Math.abs(target.tileX - mob.tileX) + Math.abs(target.tileY - mob.tileY);

      if (distance > mob.leashRangeTiles) {
        mob.isAggroed = false;
        continue;
      }

      if (!mob.isAggroed && distance <= mob.detectionRangeTiles) {
        mob.isAggroed = true;
      }

      if (!mob.isAggroed) continue;

      if (distance === 1) {
        if (now >= mob.nextAttackAt) {
          mob.nextAttackAt = now + mob.attackCooldownMs;
          mob.facing = this.facingTowards(mob.tileX, mob.tileY, target.tileX, target.tileY);
          this.applyMobDamageToPlayer(mob, target, mob.attackDamage);
          this.broadcastMobUpdated(mob);
        }
        continue;
      }

      if (now < mob.nextMoveAt) continue;

      const step = this.pickMobStepTowards(mob, target.tileX, target.tileY);
      if (!step) continue;

      mob.tileX = step.x;
      mob.tileY = step.y;
      mob.facing = step.facing;
      mob.nextMoveAt = now + mob.aiMoveCooldownMs;
      this.broadcastMobUpdated(mob);
    }
  }

  private findClosestPlayerForMob(mob: MobEntity): PlayerSession | null {
    let closest: PlayerSession | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const player of this.players.values()) {
      if (!player.joined || player.mapId !== mob.mapId || player.hp <= 0) continue;
      const distance =
        Math.abs(player.tileX - mob.tileX) + Math.abs(player.tileY - mob.tileY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = player;
      }
    }

    return closest;
  }

  private pickMobStepTowards(
    mob: MobEntity,
    targetTileX: number,
    targetTileY: number
  ): { x: number; y: number; facing: Facing } | null {
    const dx = targetTileX - mob.tileX;
    const dy = targetTileY - mob.tileY;
    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);
    const prioritizeX = Math.abs(dx) >= Math.abs(dy);

    const candidates: Array<{ x: number; y: number; facing: Facing }> = prioritizeX
      ? [
          { x: mob.tileX + stepX, y: mob.tileY, facing: stepX < 0 ? "left" : stepX > 0 ? "right" : mob.facing },
          { x: mob.tileX, y: mob.tileY + stepY, facing: stepY < 0 ? "up" : stepY > 0 ? "down" : mob.facing },
        ]
      : [
          { x: mob.tileX, y: mob.tileY + stepY, facing: stepY < 0 ? "up" : stepY > 0 ? "down" : mob.facing },
          { x: mob.tileX + stepX, y: mob.tileY, facing: stepX < 0 ? "left" : stepX > 0 ? "right" : mob.facing },
        ];

    for (const candidate of candidates) {
      if (candidate.x === mob.tileX && candidate.y === mob.tileY) continue;
      if (!isMapTileWalkable(mob.mapId, candidate.x, candidate.y)) continue;
      if (this.isTileOccupiedByMobOrPlayer(candidate.x, candidate.y, mob.mapId, mob.id)) {
        continue;
      }
      return candidate;
    }

    return null;
  }

  private facingTowards(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): Facing {
    const dx = toX - fromX;
    const dy = toY - fromY;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx < 0 ? "left" : dx > 0 ? "right" : "down";
    }
    return dy < 0 ? "up" : dy > 0 ? "down" : "down";
  }

  private applyMobDamageToPlayer(mob: MobEntity, victim: PlayerSession, rawDamage: number) {
    if (victim.hp <= 0) return;

    const mitigated = Math.max(
      1,
      Math.floor(rawDamage * (1 - victim.damageReductionPercent))
    );
    victim.hp = Math.max(0, victim.hp - mitigated);

    this.broadcastGameEvent(victim.mapId, victim.tileX, victim.tileY, {
      kind: "damage",
      targetKind: "player",
      targetId: victim.id,
      amount: mitigated,
      tileX: victim.tileX,
      tileY: victim.tileY,
    });

    this.broadcastToAoi(victim.mapId, victim.tileX, victim.tileY, {
      type: "player_updated",
      player: victim.toNetState(),
    });
    this.send(victim, { type: "player_updated", player: victim.toNetState() });
    this.sendCombatLog(victim, `${mob.name} te golpea por ${mitigated}.`);

    if (victim.hp <= 0) {
      this.handlePlayerKilledByMob(mob, victim);
    }
  }

  private handlePlayerKilledByMob(mob: MobEntity, victim: PlayerSession) {
    this.dropPlayerDeathLoot(victim);
    this.sendInventoryUpdated(victim);

    this.broadcastCombatLog(
      victim.mapId,
      victim.tileX,
      victim.tileY,
      `${mob.name} ha matado a ${victim.name}.`
    );

    const diedMsg: ServerMessage = {
      type: "player_died",
      playerId: victim.id,
      killerName: mob.name,
    };
    this.send(victim, diedMsg);
    this.broadcastToAoi(victim.mapId, victim.tileX, victim.tileY, diedMsg, victim.id);
  }

  private tryWanderMob(mob: MobEntity) {
    const directions: Array<{ dx: number; dy: number; facing: typeof mob.facing }> = [
      { dx: 0, dy: -1, facing: "up" },
      { dx: 0, dy: 1, facing: "down" },
      { dx: -1, dy: 0, facing: "left" },
      { dx: 1, dy: 0, facing: "right" },
    ];
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }

    for (const dir of directions) {
      const nx = mob.tileX + dir.dx;
      const ny = mob.tileY + dir.dy;
      if (!isMapTileWalkable(mob.mapId, nx, ny)) continue;
      if (this.isTileOccupiedByMobOrPlayer(nx, ny, mob.mapId, mob.id)) continue;
      mob.tileX = nx;
      mob.tileY = ny;
      mob.facing = dir.facing;
      this.broadcastMobUpdated(mob);
      return;
    }
  }

  private isTileOccupiedByMobOrPlayer(tileX: number, tileY: number, mapId: string, exceptMobId: string): boolean {
    for (const other of this.mobs.values()) {
      if (!other.alive || other.mapId !== mapId || other.id === exceptMobId) continue;
      if (this.mobOccupiesTile(other, tileX, tileY)) return true;
    }
    for (const player of this.players.values()) {
      if (!player.joined || player.mapId !== mapId) continue;
      if (player.tileX === tileX && player.tileY === tileY) return true;
    }
    return false;
  }

  /** Respawns pendientes; cada uno reaparece en un tile aleatorio del mapa. */
  private processMobRespawns(): MobEntity[] {
    const respawned: MobEntity[] = [];
    const now = Date.now();
    for (const mob of this.mobs.values()) {
      if (mob.alive || now < mob.respawnAt) continue;
      const tile = this.pickRandomMobSpawnTileForMap(mob.mapId, mob.id);
      mob.tileX = tile.x;
      mob.tileY = tile.y;
      mob.alive = true;
      mob.hp = mob.maxHp;
      mob.respawnAt = 0;
      mob.isAggroed = false;
      respawned.push(mob);
    }
    return respawned;
  }

  handleConnection(socket: WebSocket) {
    const joinDeadline = Date.now() + JOIN_TIMEOUT_MS;
    const joinTimer = setTimeout(() => {
      if (!this.socketSessions.has(socket) && socket.readyState === socket.OPEN) {
        socket.close(4000, "join timeout");
      }
    }, JOIN_TIMEOUT_MS);

    socket.on("message", (data) => {
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
    });

    socket.on("close", () => {
      clearTimeout(joinTimer);
      const session = this.socketSessions.get(socket);
      this.socketSessions.delete(socket);
      if (session) {
        void this.persistSession(session).catch((error) => {
          console.error("[leave] failed to persist session:", error);
        });
        this.removePlayer(session.id);
      }
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
    if (message.type === "move") {
      this.handleMove(session, message.direction);
      return;
    }
    if (message.type === "attack") {
      if (message.facing) {
        session.facing = normalizeFacing(message.facing);
      }
      this.handleAttack(session);
      return;
    }
    if (message.type === "cast_spell") {
      this.handleCastSpell(session, message.spellId, message.targetTileX, message.targetTileY);
      return;
    }
    if (message.type === "chat") {
      this.handleChat(session, message.text);
      return;
    }
    if (message.type === "admin_command") {
      this.handleAdminCommand(session, message.command, message.args);
      return;
    }
    if (message.type === "use_item") {
      this.handleUseItem(session, message.itemId, message.inventorySlot);
      return;
    }
    if (message.type === "sync_inventory") {
      this.handleSyncInventory(session, message.inventory);
      return;
    }
    if (message.type === "equip_item") {
      this.handleEquipItem(
        session,
        message.action,
        message.inventorySlot,
        message.equipSlot,
        message.itemId
      );
      return;
    }
    if (message.type === "drop_item") {
      this.handleDropItem(session, message.inventorySlot, message.amount);
      return;
    }
    if (message.type === "drop_gold") {
      this.handleDropGold(session, message.amount);
      return;
    }
    if (message.type === "pickup_world_item") {
      this.handlePickupWorldItem(session);
      return;
    }
    if (message.type === "revive") {
      this.handleRevive(
        session,
        message.source,
        message.tileX,
        message.tileY,
        message.mapId
      );
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
    if (session.hp > 0) {
      return;
    }

    if (source === "priest") {
      session.hp = session.hpMax;
      this.applyRevivePosition(session, tileX, tileY, mapId);
    } else {
      session.hp = Math.max(1, Math.floor(session.hpMax * 0.35));
    }

    this.sendPlayerState(session);
    this.send(session, {
      type: "player_moved",
      player: session.toNetState(),
    });
    this.broadcastPlayerMoved(session);
    void this.persistSession(session).catch((error) => {
      console.error("[revive] persist failed:", error);
    });
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
    if (!isMapTileWalkable(targetMapId, nextX, nextY)) {
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
    session.inventorySlots = sanitizeJoinInventory(inventory);
    this.syncInventoryEquippedFlags(session);
    void this.persistSession(session).catch((error) => {
      console.error("[sync_inventory] persist failed:", error);
    });
  }

  private handleUseItem(session: PlayerSession, itemId: string, inventorySlot?: number) {
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(session.mapId)) {
      this.sendCombatLog(session, "No podés usar objetos fuera del Pueblo en multijugador.");
      return;
    }

    if (!isKnownItemId(itemId) || !getConsumableById(itemId)) {
      this.sendCombatLog(session, "No podés usar ese objeto aquí.");
      return;
    }
    const preferredSlotIndex =
      typeof inventorySlot === "number" && Number.isFinite(inventorySlot)
        ? Math.floor(inventorySlot)
        : -1;
    const preferredSlot =
      preferredSlotIndex >= 0 && preferredSlotIndex < session.inventorySlots.length
        ? session.inventorySlots[preferredSlotIndex]
        : undefined;
    const slot =
      preferredSlot && preferredSlot.amount > 0 && preferredSlot.itemId === itemId
        ? preferredSlot
        : session.inventorySlots.find((entry) => entry.itemId === itemId && entry.amount > 0);
    if (!slot) {
      this.sendCombatLog(session, "No tenés esa poción en el inventario.");
      return;
    }

    const classId = session.classId as CharacterClassId;
    const now = Date.now();
    session.attributeBuffs = expireAttributeBuffs(session.attributeBuffs, now);

    const result = tryUseConsumableOnVitals(
      itemId,
      classId,
      {
        hp: { current: session.hp, max: session.hpMax },
        mp: { current: session.mp, max: session.mpMax },
      },
      session.attributeBuffs,
      now
    );

    if (!result.ok) {
      this.sendCombatLog(session, result.message);
      return;
    }

    if (result.clientOnly) {
      this.consumeInventorySlot(session, slot.slotIndex);
      this.send(session, {
        type: "use_item_ack",
        itemId,
        inventorySlot: slot.slotIndex,
        message: result.message,
        clientOnly: true,
      });
      void this.persistSession(session).catch((error) => {
        console.error("[use_item] persist failed:", error);
      });
      return;
    }

    if (typeof result.hp === "number") {
      session.hp = result.hp;
    }
    if (typeof result.mp === "number") {
      session.mp = result.mp;
    }
    if (result.attributeBuffs) {
      session.attributeBuffs = result.attributeBuffs;
    }
    this.consumeInventorySlot(session, slot.slotIndex);

    this.send(session, {
      type: "use_item_ack",
      itemId,
      inventorySlot: slot.slotIndex,
      hp: session.hp,
      mp: session.mp,
      attributeBuffs: {
        strength: session.attributeBuffs.strength,
        agility: session.attributeBuffs.agility,
      },
      buffExpiresAtMs: session.attributeBuffs.expiresAtMs,
      message: result.message,
    });
    this.sendPlayerState(session);
    this.sendInventoryUpdated(session);
    void this.persistSession(session).catch((error) => {
      console.error("[use_item] persist failed:", error);
    });
  }

  private handleEquipItem(
    session: PlayerSession,
    action: "equip" | "unequip",
    inventorySlot?: number,
    equipSlot?: EquipmentSlot,
    itemId?: string
  ) {
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(session.mapId)) {
      this.sendCombatLog(session, "No podés equipar objetos fuera del Pueblo en multijugador.");
      return;
    }

    if (action === "equip") {
      const preferredSlotIndex =
        typeof inventorySlot === "number" && Number.isFinite(inventorySlot)
          ? Math.floor(inventorySlot)
          : -1;
      const preferredSlot =
        preferredSlotIndex >= 0 && preferredSlotIndex < session.inventorySlots.length
          ? session.inventorySlots[preferredSlotIndex]
          : undefined;
      const normalizedItemId =
        typeof itemId === "string" && itemId.trim() ? itemId.trim() : null;
      const sourceSlot =
        preferredSlot &&
        preferredSlot.amount > 0 &&
        preferredSlot.itemId &&
        (!normalizedItemId || preferredSlot.itemId === normalizedItemId)
          ? preferredSlot
          : normalizedItemId
            ? session.inventorySlots.find(
                (entry) => entry.itemId === normalizedItemId && entry.amount > 0
              )
            : session.inventorySlots.find((entry) => entry.itemId && entry.amount > 0);
      if (!sourceSlot || !sourceSlot.itemId || sourceSlot.amount <= 0) {
        this.sendCombatLog(session, "Ese casillero está vacío.");
        return;
      }
      if (!isKnownItemId(sourceSlot.itemId)) {
        this.sendCombatLog(session, "No podés equipar ese objeto.");
        return;
      }

      const item = getItemDefinition(sourceSlot.itemId as ItemId);
      if (!item.equipSlot) {
        this.sendCombatLog(session, `${item.name} no se puede equipar.`);
        return;
      }
      const usability = canUseItem(
        session.classId as CharacterClassId,
        session.raceId as Parameters<typeof canUseItem>[1],
        session.level,
        item
      );
      if (!usability.allowed) {
        this.sendCombatLog(session, usability.reason ?? "No podés equipar ese objeto.");
        return;
      }

      const targetSlot = item.equipSlot;
      const targetEquipmentKey = this.toEquipmentKey(targetSlot);
      session.equipment[targetEquipmentKey] = sourceSlot.itemId;
      session.equipment.equippedOutfit = outfitForArmorItemId(session.equipment.armorId) ?? "base";
      this.syncInventoryEquippedFlags(session);
      session.recalcDefenseStats();
      session.recalcAttackStats();
      this.sendCombatLog(session, `Equipaste ${item.name}.`);
      this.sendPlayerState(session);
      void this.persistSession(session);
      return;
    }

    if (!equipSlot) {
      this.sendCombatLog(session, "Slot de equipo inválido.");
      return;
    }
    const equippedKey = this.toEquipmentKey(equipSlot);
    const equippedItemId = session.equipment[equippedKey];
    if (!equippedItemId) {
      return;
    }
    const item = getItemDefinition(equippedItemId as ItemId);
    session.equipment[equippedKey] = null;
    session.equipment.equippedOutfit = outfitForArmorItemId(session.equipment.armorId) ?? "base";
    this.syncInventoryEquippedFlags(session);
    session.recalcDefenseStats();
    session.recalcAttackStats();
    this.sendCombatLog(session, `Te quitaste ${item.name}.`);
    this.sendPlayerState(session);
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
    const clientRequestedThisMap = message.mapId === mapId;
    const spawnOrigin = getMapSpawnTile(mapId);

    session.assignRoleByName();
    session.mapId = mapId;
    session.raceId = message.raceId;
    session.genderId = message.genderId;
    session.classId = message.classId;
    session.factionId = normalizeFactionId(message.factionId);
    session.faceIndex = Math.max(0, Math.floor(message.faceIndex ?? 0));
    session.level = clampPlayerLevel(message.level);
    session.equipment = sanitizeJoinEquipment(message.equipment);
    session.inventorySlots = sanitizeJoinInventory(message.inventory);
    session.recalcDefenseStats();
    session.recalcAttackStats();

    const hpPair = clampVitalPair(message.hp, message.hpMax, 100);
    const mpPair = clampVitalPair(message.mp, message.mpMax, 50);
    session.hpMax = hpPair.max;
    session.hp = hpPair.current;
    session.mpMax = mpPair.max;
    session.mp = mpPair.current;
    session.gold = resolveJoinFallbackGold(message.gold);
    session.facing = normalizeFacing(message.facing);

    const requestedTile =
      clientRequestedThisMap &&
      typeof message.tileX === "number" &&
      typeof message.tileY === "number" &&
      Number.isFinite(message.tileX) &&
      Number.isFinite(message.tileY)
        ? {
            tileX: Math.floor(message.tileX),
            tileY: Math.floor(message.tileY),
          }
        : null;

    if (
      requestedTile &&
      isMapTileWalkable(mapId, requestedTile.tileX, requestedTile.tileY) &&
      !this.isTileOccupied(requestedTile.tileX, requestedTile.tileY, mapId, session.id)
    ) {
      session.tileX = requestedTile.tileX;
      session.tileY = requestedTile.tileY;
    } else {
      const origin = requestedTile ?? spawnOrigin;
      const spawn = findNearestWalkableSpawnTile(mapId, origin, (tileX, tileY) =>
        this.isTileOccupied(tileX, tileY, mapId, session.id)
      );
      session.tileX = spawn.tileX;
      session.tileY = spawn.tileY;
    }

    this.maybeRerollMobPlacementsForNewSession();
    session.joined = true;

    this.sendWelcome(session);

    this.sendSnapshot(session);
    this.initAoiOnJoin(session);
    console.log(
      `[join] ${session.name} (${session.id.slice(0, 8)}) en ${mapId} @ ${session.tileX},${session.tileY}`
    );
  }

  private async tryHydrateSessionFromRepository(
    session: PlayerSession,
    message: Extract<ClientMessage, { type: "join" }>
  ) {
    const persisted = await this.characterRepo.getByName(session.name);
    if (!persisted) {
      this.applyJoinFallback(session, message);
      return;
    }
    this.applyPersistedSnapshot(session, persisted);
    this.applyJoinClientOverrides(session, message, { trustPersistedInventory: true });
    this.finalizeJoinFromSession(session, message.mapId);
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
    session.inventorySlots = persisted.inventorySlots
      .map((slot) => ({
        slotIndex: Math.max(0, Math.floor(slot.slotIndex)),
        itemId: typeof slot.itemId === "string" ? slot.itemId : null,
        amount: Math.max(0, Math.floor(slot.amount)),
        isEquipped: slot.isEquipped === true,
      }))
      .sort((a, b) => a.slotIndex - b.slotIndex);
    this.syncInventoryEquippedFlags(session);
  }

  /**
   * Mientras no exista intent autoritativo de equipar/mover inventario,
   * usamos el join del cliente como última verdad para equipo/inventario.
   */
  private applyJoinClientOverrides(
    session: PlayerSession,
    message: Extract<ClientMessage, { type: "join" }>,
    options?: { trustPersistedInventory?: boolean }
  ) {
    session.equipment = sanitizeJoinEquipment(message.equipment);
    if (!options?.trustPersistedInventory) {
      session.inventorySlots = sanitizeJoinInventory(message.inventory);
    }
    this.syncInventoryEquippedFlags(session);

    const hpPair = clampVitalPair(message.hp, message.hpMax, session.hpMax);
    const mpPair = clampVitalPair(message.mp, message.mpMax, session.mpMax);
    session.hpMax = hpPair.max;
    session.hp = hpPair.current;
    session.mpMax = mpPair.max;
    session.mp = mpPair.current;
    if (typeof message.level === "number" && Number.isFinite(message.level)) {
      session.level = clampPlayerLevel(message.level);
    }
    session.gold = resolveJoinGoldFromMessage(message.gold, session.gold);

    session.recalcDefenseStats();
    session.recalcAttackStats();
  }

  private finalizeJoinFromSession(session: PlayerSession, requestedMapId: string) {
    if (this.rejectDuplicateCharacterLogin(session)) {
      return;
    }

    const spawnOrigin = getMapSpawnTile(session.mapId);
    const clientRequestedThisMap = requestedMapId === session.mapId;
    const requestedTile =
      clientRequestedThisMap && Number.isFinite(session.tileX) && Number.isFinite(session.tileY)
        ? { tileX: Math.floor(session.tileX), tileY: Math.floor(session.tileY) }
        : null;

    if (
      requestedTile &&
      isMapTileWalkable(session.mapId, requestedTile.tileX, requestedTile.tileY) &&
      !this.isTileOccupied(requestedTile.tileX, requestedTile.tileY, session.mapId, session.id)
    ) {
      session.tileX = requestedTile.tileX;
      session.tileY = requestedTile.tileY;
    } else {
      const origin = requestedTile ?? spawnOrigin;
      const spawn = findNearestWalkableSpawnTile(session.mapId, origin, (tileX, tileY) =>
        this.isTileOccupied(tileX, tileY, session.mapId, session.id)
      );
      session.tileX = spawn.tileX;
      session.tileY = spawn.tileY;
    }

    this.maybeRerollMobPlacementsForNewSession();
    session.joined = true;

    this.sendWelcome(session);

    this.sendSnapshot(session);
    this.initAoiOnJoin(session);
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
      player: session.toNetState(),
      inventory: session.inventorySlots.map((slot) => ({
        slotIndex: slot.slotIndex,
        itemId: slot.itemId,
        amount: slot.amount,
        isEquipped: slot.isEquipped,
      })),
      gold: session.gold,
    });
  }

  private async persistSession(session: PlayerSession) {
    if (!session.joined) return;
    const snapshot = buildSnapshotFromPlayerSession(session);
    await this.characterRepo.upsert(snapshot);
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

  private handleMove(session: PlayerSession, direction: Extract<ClientMessage, { type: "move" }>["direction"]) {
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(session.mapId)) return;

    if (!validateMoveDirection(direction)) {
      return;
    }

    const now = Date.now();
    const moveCheck = validateMoveIntent(now, session.nextMoveAt);
    if (!moveCheck.ok) {
      this.rejectPlayerMove(session, session.tileX, session.tileY);
      return;
    }
    session.nextMoveAt = moveCooldownUntil(now);

    const { dx, dy } = deltaFromDirection(direction);
    const nextX = session.tileX + dx;
    const nextY = session.tileY + dy;

    const prevX = session.tileX;
    const prevY = session.tileY;

    if (!isMapTileWalkable(session.mapId, nextX, nextY)) {
      session.facing = facingFromDirection(direction);
      this.rejectPlayerMove(session, prevX, prevY);
      return;
    }

    const map = getMap(session.mapId);
    if (isTileBlockedByMapObject(map.objects, nextX, nextY)) {
      session.facing = facingFromDirection(direction);
      this.rejectPlayerMove(session, prevX, prevY);
      return;
    }

    if (this.isTileOccupied(nextX, nextY, session.mapId, session.id)) {
      session.facing = facingFromDirection(direction);
      this.rejectPlayerMove(session, prevX, prevY);
      return;
    }

    session.tileX = nextX;
    session.tileY = nextY;
    session.facing = facingFromDirection(direction);

    this.send(session, {
      type: "player_moved",
      player: session.toNetState(),
    });
    this.syncAoiAfterMove(session, prevX, prevY);
  }

  /** Movimiento rechazado: el cliente predice el paso y necesita corrección autoritativa. */
  private rejectPlayerMove(session: PlayerSession, prevX: number, prevY: number) {
    session.tileX = prevX;
    session.tileY = prevY;
    this.send(session, {
      type: "player_moved",
      player: session.toNetState(),
    });
    this.broadcastPlayerMoved(session);
  }

  private broadcastPlayerMoved(session: PlayerSession) {
    this.broadcastToAoi(
      session.mapId,
      session.tileX,
      session.tileY,
      {
        type: "player_moved",
        player: session.toNetState(),
      },
      session.id
    );
  }

  private handleAttack(session: PlayerSession) {
    if (session.hp <= 0) {
      this.sendCombatLog(session, "Estás muerto.");
      return;
    }

    const now = Date.now();
    if (!validateAttackIntent(now, session.nextAttackAt).ok) return;

    const front = this.getFrontTile(session);

    const targetPlayer = this.findPlayerAtTile(session.mapId, front.x, front.y, session.id);
    if (targetPlayer) {
      if (this.isInSafeZone(session)) {
        this.sendCombatLog(session, "No podés atacar jugadores en zona segura.");
        return;
      }
      if (this.isInSafeZone(targetPlayer)) {
        this.sendCombatLog(session, "Esta es zona segura.");
        return;
      }
      const attackerFaction = normalizeFactionId(session.factionId);
      const defenderFaction = normalizeFactionId(targetPlayer.factionId);
      if (!canFactionsFight(attackerFaction, defenderFaction)) {
        this.sendCombatLog(session, "No podés atacar a un ciudadano.");
        return;
      }
      session.nextAttackAt = now + ATTACK_COOLDOWN_MS;
      const roll = rollAttackDamage(session.attackMin, session.attackMax, {
        canCrit: session.canCrit,
        critChance: session.critChance,
        critDamage: session.critDamage,
      });
      this.applyDamageToPlayer(session, targetPlayer, roll.damage);
      if (roll.isCrit) {
        this.sendCombatLog(session, "Golpe critico!");
      }
      return;
    }

    const targetMob = this.findMobAtTile(session.mapId, front.x, front.y);
    if (targetMob && targetMob.alive) {
      session.nextAttackAt = now + ATTACK_COOLDOWN_MS;
      const roll = rollAttackDamage(session.attackMin, session.attackMax, {
        canCrit: session.canCrit,
        critChance: session.critChance,
        critDamage: session.critDamage,
      });
      this.applyDamageToMob(session, targetMob, roll.damage);
      if (roll.isCrit) {
        this.sendCombatLog(session, "Golpe critico!");
      }
      return;
    }

    this.sendCombatLog(session, "No hay nadie para golpear.");
  }

  private handleCastSpell(
    session: PlayerSession,
    spellId: number,
    targetTileX: number,
    targetTileY: number
  ) {
    if (session.hp <= 0) {
      this.sendCombatLog(session, "Estás muerto.");
      return;
    }

    const spell = getSpellDefinition(spellId);
    if (!spell) {
      this.sendCombatLog(session, "Hechizo desconocido.");
      return;
    }

    if (session.mp < spell.manaCost) {
      this.sendCombatLog(
        session,
        `No tenés suficiente maná para ${spell.nombre} (${session.mp}/${spell.manaCost}).`
      );
      return;
    }

    const targetMob = this.findMobAtTile(session.mapId, targetTileX, targetTileY);
    const targetPlayer = this.findPlayerAtTile(session.mapId, targetTileX, targetTileY, session.id);
    const targetsSelf =
      targetTileX === session.tileX && targetTileY === session.tileY;

    if (targetsSelf) {
      if (!spell.puedeUsarseEnAliados && (spell.healMax > 0 || spell.healMin > 0)) {
        this.sendCombatLog(session, `${spell.nombre} no puede lanzarse sobre vos.`);
        return;
      }
    } else if (!targetMob && !targetPlayer) {
      this.sendCombatLog(session, "No hay objetivo en ese tile.");
      return;
    } else if (!targetMob && targetPlayer && spell.healMax > 0 && spell.danioMax === 0 && spell.danioMin === 0) {
      this.sendCombatLog(session, `${spell.nombre} no puede lanzarse sobre enemigos.`);
      return;
    } else if (targetMob && spell.healMax > 0 && spell.danioMax === 0 && spell.danioMin === 0) {
      this.sendCombatLog(session, `${spell.nombre} no puede lanzarse sobre enemigos.`);
      return;
    }

    session.mp -= spell.manaCost;
    this.sendPlayerState(session);

    this.broadcastGameEvent(session.mapId, targetTileX, targetTileY, {
      kind: "spell_fx",
      spellId,
      tileX: targetTileX,
      tileY: targetTileY,
    });

    if (targetsSelf && (spell.healMax > 0 || spell.healMin > 0)) {
      const heal = rollInt(spell.healMin, spell.healMax);
      const before = session.hp;
      session.hp = Math.min(session.hpMax, session.hp + heal);
      const restored = session.hp - before;
      this.sendPlayerState(session);
      this.broadcastCombatLog(
        session.mapId,
        session.tileX,
        session.tileY,
        `${session.name}: ${spell.nombre} cura ${restored} HP.`
      );
      return;
    }

    if (targetMob && isImmobilizeSpell(spellId)) {
      targetMob.immobilizedUntil = Math.max(targetMob.immobilizedUntil, Date.now() + INMOVILIZADO_MS);
      this.broadcastCombatLog(
        session.mapId,
        targetMob.tileX,
        targetMob.tileY,
        `${session.name}: ${spell.nombre} inmoviliza a ${targetMob.name}.`
      );
      return;
    }

    if (targetMob && (spell.danioMax > 0 || spell.danioMin > 0)) {
      const base = rollInt(spell.danioMin, spell.danioMax);
      const damage = Math.max(
        0,
        Math.floor(base * (1 + session.magicDamageBonusPercent))
      );
      this.applyDamageToMob(session, targetMob, damage, spell.nombre);
      return;
    }

    if (targetPlayer && (spell.danioMax > 0 || spell.danioMin > 0)) {
      if (this.isInSafeZone(session) || this.isInSafeZone(targetPlayer)) {
        this.sendCombatLog(session, "Esta es zona segura.");
        return;
      }
      const attackerFaction = normalizeFactionId(session.factionId);
      const defenderFaction = normalizeFactionId(targetPlayer.factionId);
      if (!canFactionsFight(attackerFaction, defenderFaction)) {
        this.sendCombatLog(session, "No podés atacar a un ciudadano.");
        return;
      }
      const base = rollInt(spell.danioMin, spell.danioMax);
      const damage = Math.max(
        0,
        Math.floor(base * (1 + session.magicDamageBonusPercent))
      );
      this.applyDamageToPlayer(session, targetPlayer, damage, spell.nombre);
      return;
    }

    if (spell.remueveDebuff) {
      this.broadcastCombatLog(
        session.mapId,
        session.tileX,
        session.tileY,
        `${session.name}: ${spell.nombre} remueve ${spell.remueveDebuff}.`
      );
      return;
    }

    this.broadcastCombatLog(
      session.mapId,
      session.tileX,
      session.tileY,
      `${session.name}: ${spell.nombre} no tuvo efecto.`
    );
  }

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
      if (mob.tileX === tileX && mob.tileY === tileY) return mob;
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

  private applyDamageToPlayer(
    attacker: PlayerSession,
    victim: PlayerSession,
    rawDamage: number,
    spellName?: string
  ) {
    const reduction = spellName ? victim.magicResistancePercent : victim.damageReductionPercent;
    const mitigated = Math.max(1, Math.floor(rawDamage * (1 - reduction)));
    victim.hp = Math.max(0, victim.hp - mitigated);

    this.broadcastGameEvent(victim.mapId, victim.tileX, victim.tileY, {
      kind: "damage",
      targetKind: "player",
      targetId: victim.id,
      amount: mitigated,
      tileX: victim.tileX,
      tileY: victim.tileY,
    });

    this.broadcastToAoi(victim.mapId, victim.tileX, victim.tileY, {
      type: "player_updated",
      player: victim.toNetState(),
    });
    this.send(victim, { type: "player_updated", player: victim.toNetState() });

    if (victim.hp > 0) {
      const action = spellName ? `${spellName} golpea` : "Golpea";
      this.broadcastCombatLog(
        victim.mapId,
        victim.tileX,
        victim.tileY,
        `${attacker.name} ${action} a ${victim.name} por ${mitigated}.`
      );
      return;
    }

    this.handlePlayerKilled(attacker, victim);
  }

  private isInSafeZone(player: PlayerSession): boolean {
    return SAFE_ZONE_MAP_IDS.has(player.mapId);
  }

  private handlePlayerKilled(killer: PlayerSession, victim: PlayerSession) {
    this.dropPlayerDeathLoot(victim);
    this.sendInventoryUpdated(victim);

    this.broadcastCombatLog(
      victim.mapId,
      victim.tileX,
      victim.tileY,
      `${killer.name} ha matado a ${victim.name}.`
    );

    const diedMsg: ServerMessage = {
      type: "player_died",
      playerId: victim.id,
      killerName: killer.name,
    };
    this.send(victim, diedMsg);
    this.broadcastToAoi(victim.mapId, victim.tileX, victim.tileY, diedMsg, victim.id);
  }

  private handleChat(session: PlayerSession, text: string) {
    const trimmed = text.trim().slice(0, 200);
    if (!trimmed) return;
    this.broadcastToAoi(session.mapId, session.tileX, session.tileY, {
      type: "chat",
      from: session.name,
      text: trimmed,
    });
  }

  private handleAdminCommand(session: PlayerSession, command: string, args: string[]) {
    if (!session.isAdmin()) {
      this.sendCombatLog(session, "No tenés permisos de administrador.");
      return;
    }

    if (command === "tp") {
      this.handleAdminTeleport(session, args);
      return;
    }

    this.sendCombatLog(session, `Comando admin desconocido: /${command}`);
  }

  private handleAdminTeleport(session: PlayerSession, args: string[]) {
    const x = parseInt(args[0], 10);
    const y = parseInt(args[1], 10);

    if (isNaN(x) || isNaN(y)) {
      this.sendCombatLog(session, "Uso: /tp <x> <y>");
      return;
    }

    if (!isMapTileWalkable(session.mapId, x, y)) {
      this.sendCombatLog(session, `Tile (${x}, ${y}) no es caminable.`);
      return;
    }

    const prevX = session.tileX;
    const prevY = session.tileY;
    session.tileX = x;
    session.tileY = y;
    this.syncAoiAfterMove(session, prevX, prevY);
    this.sendCombatLog(session, `Teletransportado a (${x}, ${y}).`);
  }

  private mobOccupiesTile(mob: MobEntity, tileX: number, tileY: number): boolean {
    const blocksByBaseAnchor = mobFootprintOccupiesTile(
      tileX,
      tileY,
      mob.tileX,
      mob.tileY,
      mob.hitboxWidthTiles,
      mob.hitboxHeightTiles
    );
    if (blocksByBaseAnchor) {
      return true;
    }
    return mobFootprintOccupiesTile(
      tileX,
      tileY,
      mob.tileX,
      mob.tileY + mob.hitboxOffsetTiles,
      mob.hitboxWidthTiles,
      mob.hitboxHeightTiles
    );
  }

  private isTileOccupied(tileX: number, tileY: number, mapId: string, exceptPlayerId: string) {
    for (const player of this.players.values()) {
      if (!player.joined || player.id === exceptPlayerId || player.mapId !== mapId) continue;
      if (player.tileX === tileX && player.tileY === tileY) return true;
    }
    for (const mob of this.mobs.values()) {
      if (!mob.alive || mob.mapId !== mapId) continue;
      if (this.mobOccupiesTile(mob, tileX, tileY)) return true;
    }
    if (getNpcOccupiedTiles(mapId).some((tile) => tile.x === tileX && tile.y === tileY)) {
      return true;
    }
    return false;
  }

  private removePlayer(playerId: string) {
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

    this.players.delete(playerId);
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
  private sendSnapshot(session: PlayerSession) {
    this.send(session, {
      type: "world_snapshot",
      snapshot: this.buildSnapshotForSession(session),
    });
  }

  private initAoiOnJoin(session: PlayerSession) {
    session.aoiVisiblePlayerIds.clear();
    for (const other of this.players.values()) {
      if (!other.joined || other.id === session.id || other.mapId !== session.mapId) {
        continue;
      }
      if (!isInAoi(session.tileX, session.tileY, other.tileX, other.tileY)) {
        continue;
      }
      session.aoiVisiblePlayerIds.add(other.id);
      other.aoiVisiblePlayerIds.add(session.id);
      this.send(other, {
        type: "player_joined",
        player: session.toNetState(),
      });
    }
  }

  private syncAoiAfterMove(session: PlayerSession, prevX: number, prevY: number) {
    if (prevX === session.tileX && prevY === session.tileY) {
      this.broadcastPlayerMoved(session);
      return;
    }

    for (const other of this.players.values()) {
      if (!other.joined || other.id === session.id || other.mapId !== session.mapId) {
        continue;
      }

      const wasIn = isInAoi(prevX, prevY, other.tileX, other.tileY);
      const nowIn = isInAoi(session.tileX, session.tileY, other.tileX, other.tileY);

      if (!wasIn && nowIn) {
        session.aoiVisiblePlayerIds.add(other.id);
        other.aoiVisiblePlayerIds.add(session.id);
        this.send(session, { type: "player_joined", player: other.toNetState() });
        this.send(other, { type: "player_joined", player: session.toNetState() });
        continue;
      }

      if (wasIn && !nowIn) {
        session.aoiVisiblePlayerIds.delete(other.id);
        other.aoiVisiblePlayerIds.delete(session.id);
        this.send(session, { type: "player_left", playerId: other.id });
        this.send(other, { type: "player_left", playerId: session.id });
      }
    }

    for (const mob of this.mobs.values()) {
      if (mob.mapId !== session.mapId) continue;
      const wasIn = isInAoi(prevX, prevY, mob.tileX, mob.tileY);
      const nowIn = isInAoi(session.tileX, session.tileY, mob.tileX, mob.tileY);
      if (!wasIn && nowIn) {
        this.send(session, { type: "mob_updated", mob: mob.toNetState() });
      } else if (wasIn && !nowIn) {
        this.send(session, { type: "mob_left", mobId: mob.id });
      }
    }

    this.broadcastPlayerMoved(session);
  }

  private sendCombatLog(session: PlayerSession, text: string) {
    this.send(session, { type: "combat_log", text });
  }

  private broadcastCombatLog(
    mapId: string,
    tileX: number,
    tileY: number,
    text: string
  ) {
    this.broadcastToAoi(mapId, tileX, tileY, { type: "combat_log", text });
  }

  private broadcastGameEvent(
    mapId: string,
    tileX: number,
    tileY: number,
    event: GameEvent
  ) {
    this.broadcastToAoi(mapId, tileX, tileY, { type: "game_event", event });
  }

  private broadcastMobUpdated(mob: MobEntity) {
    this.broadcastToAoi(mob.mapId, mob.tileX, mob.tileY, {
      type: "mob_updated",
      mob: mob.toNetState(),
    });
  }

  /** HP/MP autoritativos al jugador local (curas, gasto de maná, etc.). */
  private sendPlayerState(session: PlayerSession) {
    this.send(session, {
      type: "player_updated",
      player: session.toNetState(),
    });
  }

  private send(session: PlayerSession, message: ServerMessage) {
    if (session.socket.readyState !== session.socket.OPEN) return;
    session.socket.send(JSON.stringify(message));
  }

  /** Jugadores en el mismo mapa dentro del radio AOI respecto a (tileX, tileY). */
  private broadcastToAoi(
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

  private sendInventoryUpdated(session: PlayerSession) {
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

  private broadcastWorldItemState(
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

  private broadcastWorldItemRemoved(
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

  private handleDropItem(session: PlayerSession, inventorySlot: number, amount: number) {
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(session.mapId)) {
      this.sendCombatLog(session, "No podés tirar objetos fuera del Pueblo en multijugador.");
      return;
    }

    const slotIndex = Math.floor(inventorySlot);
    if (slotIndex < 0 || slotIndex >= session.inventorySlots.length) {
      return;
    }

    const slot = session.inventorySlots[slotIndex];
    if (!slot?.itemId || slot.amount <= 0) {
      this.sendCombatLog(session, "Ese casillero está vacío.");
      return;
    }

    const itemId = slot.itemId;
    if (!isKnownItemId(itemId)) {
      this.sendCombatLog(session, "No podés tirar ese objeto.");
      return;
    }

    const safeAmount = Math.min(Math.max(1, Math.floor(amount)), slot.amount);
    const tileX = session.tileX;
    const tileY = session.tileY;
    const existing = this.worldItems.findAtTile(session.mapId, tileX, tileY);
    if (existing && existing.itemId !== itemId) {
      this.sendCombatLog(session, "No hay espacio en ese casillero del suelo.");
      return;
    }

    const beforeId = existing?.id ?? null;
    const { removed } = removeFromServerSlot(session.inventorySlots, slotIndex, safeAmount);
    if (removed <= 0) {
      return;
    }

    if (!slot.itemId || slot.amount <= 0) {
      slot.isEquipped = false;
      this.unequipItemIdIfNeeded(session, itemId);
    }
    this.syncInventoryEquippedFlags(session);

    const record = this.worldItems.spawn(
      session.mapId,
      itemId,
      tileX,
      tileY,
      removed
    );
    if (!record) {
      addToServerInventory(session.inventorySlots, itemId, removed);
      this.syncInventoryEquippedFlags(session);
      this.sendCombatLog(session, "No hay espacio para tirar el objeto.");
      return;
    }

    const kind = beforeId === record.id ? "updated" : "spawned";
    this.broadcastWorldItemState(session.mapId, tileX, tileY, record, kind);
    this.sendInventoryUpdated(session);

    const item = getItemDefinition(itemId as ItemId);
    this.sendCombatLog(
      session,
      removed > 1 ? `Tiraste ${item.name} x${removed}.` : `Tiraste ${item.name}.`
    );
    void this.persistSession(session);
  }

  private handleDropGold(session: PlayerSession, amount: number) {
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(session.mapId)) {
      this.sendCombatLog(session, "No podés tirar oro fuera del Pueblo en multijugador.");
      return;
    }

    const maxDrop = Math.min(session.gold, 100_000);
    const safeAmount = Math.min(Math.max(1, Math.floor(amount)), maxDrop);
    if (safeAmount <= 0) {
      this.sendCombatLog(session, "No tenés oro para tirar.");
      return;
    }

    session.gold -= safeAmount;
    const tileX = session.tileX;
    const tileY = session.tileY;

    let remaining = safeAmount;
    while (remaining > 0) {
      const stackSize = Math.min(remaining, 10_000);
      const before = this.worldItems.findAtTile(session.mapId, tileX, tileY);
      const record = this.worldItems.spawn(
        session.mapId,
        "gold",
        tileX,
        tileY,
        stackSize
      );
      if (!record) {
        session.gold += remaining;
        this.sendInventoryUpdated(session);
        this.sendCombatLog(session, "No hay espacio para tirar oro.");
        return;
      }
      const kind = before?.id === record.id ? "updated" : "spawned";
      this.broadcastWorldItemState(session.mapId, tileX, tileY, record, kind);
      remaining -= stackSize;
    }

    this.sendInventoryUpdated(session);
    this.sendCombatLog(
      session,
      `Tiraste ${safeAmount.toLocaleString("es-AR")} de oro.`
    );
    void this.persistSession(session);
  }

  private findNearestWorldItemDropTile(
    mapId: string,
    originX: number,
    originY: number
  ): { tileX: number; tileY: number } | null {
    const canDrop = (tileX: number, tileY: number) =>
      isMapTileWalkable(mapId, tileX, tileY) &&
      !this.worldItems.findAtTile(mapId, tileX, tileY);

    if (canDrop(originX, originY)) {
      return { tileX: originX, tileY: originY };
    }

    const maxDistance = 24;
    for (let distance = 1; distance <= maxDistance; distance += 1) {
      for (let dy = -distance; dy <= distance; dy += 1) {
        for (let dx = -distance; dx <= distance; dx += 1) {
          if (Math.abs(dx) + Math.abs(dy) !== distance) continue;
          const tileX = originX + dx;
          const tileY = originY + dy;
          if (canDrop(tileX, tileY)) {
            return { tileX, tileY };
          }
        }
      }
    }
    return null;
  }

  private spawnDeathLootAt(
    session: PlayerSession,
    itemId: string,
    count: number
  ): void {
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(session.mapId) || count <= 0) {
      return;
    }

    const dropTile = this.findNearestWorldItemDropTile(
      session.mapId,
      session.tileX,
      session.tileY
    );
    if (!dropTile) {
      return;
    }

    const before = this.worldItems.findAtTile(
      session.mapId,
      dropTile.tileX,
      dropTile.tileY
    );
    const record = this.worldItems.spawn(
      session.mapId,
      itemId,
      dropTile.tileX,
      dropTile.tileY,
      count
    );
    if (!record) {
      return;
    }

    const kind = before?.id === record.id ? "updated" : "spawned";
    this.broadcastWorldItemState(
      session.mapId,
      dropTile.tileX,
      dropTile.tileY,
      record,
      kind
    );
  }

  private dropPlayerDeathLoot(session: PlayerSession) {
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(session.mapId)) {
      return;
    }

    const equipmentSlots: EquipmentSlot[] = ["weapon", "shield", "helmet", "armor"];

    for (const slot of session.inventorySlots) {
      if (!slot.itemId || slot.amount <= 0) continue;
      if (!isKnownItemId(slot.itemId)) {
        slot.itemId = null;
        slot.amount = 0;
        slot.isEquipped = false;
        continue;
      }

      const item = getItemDefinition(slot.itemId as ItemId);
      if (!itemDropsOnDeath(item)) {
        continue;
      }

      this.spawnDeathLootAt(session, slot.itemId, slot.amount);
      slot.itemId = null;
      slot.amount = 0;
      slot.isEquipped = false;
    }

    for (const equipSlot of equipmentSlots) {
      const itemId = session.equipment[`${equipSlot}Id`];
      if (!itemId || !isKnownItemId(itemId)) continue;

      const item = getItemDefinition(itemId as ItemId);
      if (!itemDropsOnDeath(item)) {
        const { added } = addToServerInventory(session.inventorySlots, itemId, 1);
        if (added > 0) {
          session.equipment[`${equipSlot}Id`] = null;
        }
        continue;
      }

      this.spawnDeathLootAt(session, itemId, 1);
      session.equipment[`${equipSlot}Id`] = null;
    }

    session.equipment.equippedOutfit =
      outfitForArmorItemId(session.equipment.armorId) ?? "base";
    this.syncInventoryEquippedFlags(session);
    session.recalcDefenseStats();
    session.recalcAttackStats();
  }

  private handlePickupWorldItem(session: PlayerSession) {
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(session.mapId)) {
      this.sendCombatLog(session, "No podés agarrar objetos fuera del Pueblo en multijugador.");
      return;
    }

    const worldItem = this.worldItems.findAtTile(
      session.mapId,
      session.tileX,
      session.tileY
    );
    if (!worldItem) {
      this.sendCombatLog(session, "No hay ningún item para agarrar.");
      return;
    }

    const { mapId, tileX, tileY } = worldItem;

    if (worldItem.itemId === "gold") {
      session.gold += worldItem.count;
      this.worldItems.remove(worldItem.id);
      this.broadcastWorldItemRemoved(mapId, tileX, tileY, worldItem.id);
      this.sendInventoryUpdated(session);
      this.sendCombatLog(
        session,
        `Agarraste ${worldItem.count.toLocaleString("es-AR")} de oro.`
      );
      void this.persistSession(session);
      return;
    }

    if (!isKnownItemId(worldItem.itemId)) {
      this.sendCombatLog(session, "No podés agarrar ese objeto.");
      return;
    }

    const { added, remaining } = addToServerInventory(
      session.inventorySlots,
      worldItem.itemId,
      worldItem.count
    );
    if (added <= 0) {
      this.sendCombatLog(session, "No tenés espacio en el inventario.");
      return;
    }

    const item = getItemDefinition(worldItem.itemId as ItemId);
    if (remaining <= 0) {
      this.worldItems.remove(worldItem.id);
      this.broadcastWorldItemRemoved(mapId, tileX, tileY, worldItem.id);
    } else {
      const updated = this.worldItems.updateCount(worldItem.id, remaining);
      if (updated) {
        this.broadcastWorldItemState(mapId, tileX, tileY, updated, "updated");
      }
    }

    this.sendInventoryUpdated(session);
    this.sendCombatLog(
      session,
      added > 1 ? `Agarraste ${item.name} x${added}.` : `Agarraste ${item.name}.`
    );
    void this.persistSession(session);
  }
}
