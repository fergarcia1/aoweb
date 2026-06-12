import type { WorldContext } from "./WorldContext";
import { MobEntity } from "../MobEntity";
import type { PlayerSession } from "../PlayerSession";
import { isMapTileWalkable } from "../../../shared/mapWalkability";
import type { Facing } from "../../../shared/types";
import { mobFootprintOccupiesTile } from "../../../shared/mobFootprint";
import { getNpcOccupiedTiles } from "../../../shared/npcDefinitions";
import { buildAllInitialMobPlacements } from "../../../shared/mobSpawns";
import { MOB_MODELS, MOB_SPAWN_BY_ID } from "../../../game-data/mobs";
import { isTileBlockedByMapObject } from "../../../shared/mapObjectDefinitions";
import { getMap } from "../../../shared/maps";
import { EDGE_TRANSITION_TRIGGER_DISTANCE } from "../../../shared/mapConstants";
import { rollMobHitDamage, mobCanAttack } from "../../../game-data/mobCombat";
import { createEmptyPvpSpellHitRecords } from "../../../game-data/antiOneshot";
import { mitigatePhysicalDamage } from "../../../game-data/physicalDamageMitigation";
import { MOB_MELEE_ENGAGE_DELAY_MS } from "../../../game-data/constants";
import { findFirstChaseStep } from "../../../shared/gridPathfinding";

function getMobStepDurationMs(modelId: string): number {
  const model = MOB_MODELS[modelId as keyof typeof MOB_MODELS];
  const speedRatio = model?.moveSpeedRatio ?? 1.0;
  return Math.max(200, Math.floor(450 / speedRatio));
}

export class MobSystem {
  constructor(private readonly world: WorldContext) {}

  public tick(): void {
    for (const mob of this.processMobRespawns()) {
      this.world.broadcastMobUpdated(mob);
    }
    this.processMobWander();
    this.processMobCombat();
  }

  public applyFreshMobPlacements() {
    const placements = buildAllInitialMobPlacements();
    const mobs = this.world.getMobs();

    for (const mob of mobs.values()) {
      mob.hp = 0;
      mob.alive = false;
    }

    for (const placement of placements) {
      const existing = mobs.get(placement.spawnId);
      if (existing) {
        existing.tileX = placement.tileX;
        existing.tileY = placement.tileY;
        existing.alive = true;
        existing.hp = existing.maxHp;
        existing.isAggroed = false;
        existing.wasInMeleeRange = false;
        existing.respawnAt = 0;
        existing.scheduleNextWander();
        continue;
      }

      const spawn = MOB_SPAWN_BY_ID.get(placement.spawnId);
      if (!spawn) continue;

      const aiMoveCooldownMs = getMobStepDurationMs(spawn.modelId) || 500;

      const mob = new MobEntity({
        id: placement.spawnId,
        mobId: placement.mobId,
        name: placement.name,
        mapId: placement.mapId,
        tileX: placement.tileX,
        tileY: placement.tileY,
        behavior: placement.behavior,
        hitboxWidthTiles: placement.hitboxWidthTiles,
        hitboxHeightTiles: placement.hitboxHeightTiles,
        hitboxOffsetY: placement.hitboxOffsetY,
        detectionRangeTiles: spawn.detectionRangeTiles,
        leashRangeTiles: spawn.leashRangeTiles,
        minHit: spawn.minHit,
        maxHit: spawn.maxHit,
        maxHp: placement.maxHp,
        npcId: placement.npcId,
        attackCooldownMs: spawn.attackCooldownMs,
        aiMoveCooldownMs,
        respawnMs: spawn.respawnMs,
        goldReward: spawn.gold,
        expReward: spawn.expReward,
        aquatic: spawn.aquatic,
      });


      mob.scheduleNextWander();
      mobs.set(mob.id, mob);
    }
  }

  public maybeRerollMobPlacementsForNewSession() {
    let anyJoined = false;
    for (const p of this.world.getPlayers().values()) {
      if (p.joined) {
        anyJoined = true;
        break;
      }
    }
    if (!anyJoined) {
      this.applyFreshMobPlacements();
    }
  }

  private processMobWander() {
    const now = Date.now();
    for (const mob of this.world.getMobs().values()) {
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
    for (const mob of this.world.getMobs().values()) {
      if (!mob.alive || mob.behavior !== "aggressive" || !mobCanAttack(mob.minHit, mob.maxHit) || mob.isImmobilized(now)) continue;

      const target = this.findClosestPlayerForMob(mob, now);
      if (!target || target.hp <= 0) {
        mob.isAggroed = false;
        mob.wasInMeleeRange = false;
        continue;
      }

      const distance = Math.abs(target.tileX - mob.tileX) + Math.abs(target.tileY - mob.tileY);

      if (distance > mob.leashRangeTiles) {
        mob.isAggroed = false;
        mob.wasInMeleeRange = false;
        continue;
      }

      if (!mob.isAggroed && distance <= mob.detectionRangeTiles) {
        mob.isAggroed = true;
      }

      if (!mob.isAggroed) continue;

      if (distance === 1) {
        if (!mob.wasInMeleeRange) {
          mob.wasInMeleeRange = true;
          mob.nextAttackAt = Math.max(
            mob.nextAttackAt,
            now + MOB_MELEE_ENGAGE_DELAY_MS
          );
        }
        if (now >= mob.nextAttackAt) {
          mob.nextAttackAt = now + mob.attackCooldownMs;
          mob.facing = this.facingTowards(mob.tileX, mob.tileY, target.tileX, target.tileY);
          this.applyMobDamageToPlayer(
            mob,
            target,
            rollMobHitDamage(mob.minHit, mob.maxHit)
          );
          this.world.broadcastMobUpdated(mob);
        }
        continue;
      }

      mob.wasInMeleeRange = false;

      if (now < mob.nextMoveAt) continue;

      const step = this.pickMobStepTowards(mob, target.tileX, target.tileY);
      if (!step) continue;

      mob.tileX = step.x;
      mob.tileY = step.y;
      mob.facing = step.facing;
      mob.nextMoveAt = now + mob.aiMoveCooldownMs;
      this.world.broadcastMobUpdated(mob);
    }
  }

  private tryWanderMob(mob: MobEntity) {
    const dirs: Facing[] = ["up", "down", "left", "right"];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }

    for (const dir of dirs) {
      const nextX = mob.tileX + (dir === "left" ? -1 : dir === "right" ? 1 : 0);
      const nextY = mob.tileY + (dir === "up" ? -1 : dir === "down" ? 1 : 0);

      if (
        !isMapTileWalkable(
          mob.mapId,
          nextX,
          nextY,
          this.world.getMapTileOverrides(mob.mapId),
          mob.aquatic
        )
      ) {
        continue;
      }


      const padding = EDGE_TRANSITION_TRIGGER_DISTANCE;
      const map = getMap(mob.mapId);
      if (nextX < padding || nextX >= map.width - padding || nextY < padding || nextY >= map.height - padding) {
        continue;
      }

      if (this.isTileOccupiedByMobOrPlayer(nextX, nextY, mob.mapId, mob.id)) continue;

      mob.tileX = nextX;
      mob.tileY = nextY;
      mob.facing = dir;
      this.world.broadcastMobUpdated(mob);
      break;
    }
  }

  private findClosestPlayerForMob(mob: MobEntity, now: number): PlayerSession | null {
    let closest: PlayerSession | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const player of this.world.getPlayers().values()) {
      if (
        !player.joined ||
        player.mapId !== mob.mapId ||
        player.hp <= 0 ||
        player.isInvisible(now)
      ) {
        continue;
      }
      const distance = Math.abs(player.tileX - mob.tileX) + Math.abs(player.tileY - mob.tileY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = player;
      }
    }
    return closest;
  }

  private pickMobStepTowards(mob: MobEntity, targetTileX: number, targetTileY: number): { x: number; y: number; facing: Facing } | null {
    const step = findFirstChaseStep(
      { tileX: mob.tileX, tileY: mob.tileY },
      { tileX: targetTileX, tileY: targetTileY },
      {
        maxDepth: 40,
        canEnter: (tileX, tileY) => this.canMobStepOntoTile(mob, tileX, tileY, targetTileX, targetTileY),
      }
    );
    if (!step) {
      return null;
    }

    return {
      x: step.tileX,
      y: step.tileY,
      facing: this.facingTowards(mob.tileX, mob.tileY, step.tileX, step.tileY),
    };
  }

  private canMobStepOntoTile(
    mob: MobEntity,
    tileX: number,
    tileY: number,
    targetTileX: number,
    targetTileY: number
  ): boolean {
    if (tileX === targetTileX && tileY === targetTileY) {
      return false;
    }
    if (
      !isMapTileWalkable(
        mob.mapId,
        tileX,
        tileY,
        this.world.getMapTileOverrides(mob.mapId),
        mob.aquatic
      )
    ) {
      return false;
    }


    const map = getMap(mob.mapId);
    const padding = EDGE_TRANSITION_TRIGGER_DISTANCE;
    if (
      tileX < padding ||
      tileX >= map.width - padding ||
      tileY < padding ||
      tileY >= map.height - padding
    ) {
      return false;
    }

    const gameMap = getMap(mob.mapId);
    if (isTileBlockedByMapObject(gameMap.objects, tileX, tileY)) {
      return false;
    }

    return !this.isTileOccupiedByMobOrPlayer(tileX, tileY, mob.mapId, mob.id);
  }

  private facingTowards(fromX: number, fromY: number, toX: number, toY: number): Facing {
    const dx = toX - fromX;
    const dy = toY - fromY;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx < 0 ? "left" : dx > 0 ? "right" : "down";
    }
    return dy < 0 ? "up" : dy > 0 ? "down" : "down";
  }

  private applyMobDamageToPlayer(mob: MobEntity, victim: PlayerSession, rawDamage: number) {
    if (victim.hp <= 0) return;

    const physical = mitigatePhysicalDamage(rawDamage, {
      damageReductionPercent: victim.damageReductionPercent,
      shieldBlockChancePercent: victim.shieldBlockChancePercent,
      shieldBlockReductionPercent: victim.shieldBlockReductionPercent,
    });
    const mitigated = physical.damage;
    victim.hp = Math.max(0, victim.hp - mitigated);

    this.world.broadcastGameEvent(victim.mapId, victim.tileX, victim.tileY, {
      kind: "damage",
      targetKind: "player",
      targetId: victim.id,
      amount: mitigated,
      tileX: victim.tileX,
      tileY: victim.tileY,
      sourceTileX: mob.tileX,
      sourceTileY: mob.tileY,
    });

    this.world.broadcastToAoi(victim.mapId, victim.tileX, victim.tileY, {
      type: "player_updated",
      player: victim.toNetState(),
    });
    this.world.send(victim, { type: "player_updated", player: victim.toNetState() });
    const blockNote = physical.blocked ? " (bloqueaste con el escudo)" : "";
    this.world.sendCombatLog(victim, `${mob.name} te golpea por ${mitigated}${blockNote}.`);

    if (victim.hp <= 0) {
      this.handlePlayerKilledByMob(mob, victim);
    }
  }

  private handlePlayerKilledByMob(mob: MobEntity, victim: PlayerSession) {
    if (victim.isDead || victim.deathLootProcessed) {
      return;
    }
    victim.isDead = true;
    victim.hp = 0;
    victim.recentPvpSpellHits = createEmptyPvpSpellHitRecords();
    this.world.dropPlayerDeathLoot(victim);
    this.world.sendInventoryUpdated(victim);
    this.world.sendPlayerState(victim);
    const msg = `${victim.name} fue matado por ${mob.name}.`;
    this.world.broadcastCombatLog(victim.mapId, victim.tileX, victim.tileY, msg);
    const diedMsg = {
      type: "player_died" as const,
      playerId: victim.id,
      killerId: mob.id,
      killerName: mob.name,
    };
    const updatedMsg = {
      type: "player_updated" as const,
      player: victim.toNetState(),
    };
    this.world.send(victim, diedMsg);
    this.world.send(victim, updatedMsg);
    this.world.broadcastToAoi(victim.mapId, victim.tileX, victim.tileY, diedMsg, victim.id);
    this.world.broadcastToAoi(victim.mapId, victim.tileX, victim.tileY, updatedMsg);
  }

  private processMobRespawns(): MobEntity[] {
    const now = Date.now();
    const respawned: MobEntity[] = [];

    for (const mob of this.world.getMobs().values()) {
      if (mob.alive) continue;
      if (now >= mob.respawnAt) {
        const spawn = this.pickRandomMobSpawnTileForMap(
          mob.mapId,
          mob.id,
          mob.aquatic
        );
        if (spawn) {
          mob.tileX = spawn.tileX;
          mob.tileY = spawn.tileY;
          mob.alive = true;
          mob.hp = mob.maxHp;
          mob.isAggroed = false;
          mob.wasInMeleeRange = false;
          mob.immobilizedUntil = 0;
          mob.scheduleNextWander();
          respawned.push(mob);
        } else {
          mob.respawnAt = now + 1000;
        }
      }
    }
    return respawned;
  }

  public isTileBlockedForMobSpawn(
    mapId: string,
    tileX: number,
    tileY: number,
    excludeMobId?: string,
    isAquatic?: boolean
  ): boolean {
    if (
      !isMapTileWalkable(
        mapId,
        tileX,
        tileY,
        this.world.getMapTileOverrides(mapId),
        isAquatic
      )
    ) {
      return true;
    }

    const map = getMap(mapId);
    if (isTileBlockedByMapObject(map.objects, tileX, tileY)) return true;

    const npcTiles = getNpcOccupiedTiles(mapId);
    if (npcTiles.some((t: any) => t.x === tileX && t.y === tileY)) return true;

    if (this.isTileOccupiedByMobOrPlayer(tileX, tileY, mapId, excludeMobId))
      return true;

    return false;
  }

  private pickRandomMobSpawnTileForMap(
    mapId: string,
    excludeMobId?: string,
    isAquatic?: boolean
  ): { tileX: number; tileY: number } | null {
    const map = getMap(mapId);
    let attempts = 0;

    // El mapa tiene bordes que actúan como transiciones (ej. <= 10 o >= mapWidth-10).
    // Evitamos spawnear mobs en esas franjas para que no aparezcan "fuera" del límite de visión o áreas inaccesibles.
    const padding = EDGE_TRANSITION_TRIGGER_DISTANCE;
    const spawnWidth = Math.max(1, map.width - padding * 2);
    const spawnHeight = Math.max(1, map.height - padding * 2);

    while (attempts < 50) {
      attempts++;
      const tx = padding + Math.floor(Math.random() * spawnWidth);
      const ty = padding + Math.floor(Math.random() * spawnHeight);
      if (!this.isTileBlockedForMobSpawn(mapId, tx, ty, excludeMobId, isAquatic)) {
        return { tileX: tx, tileY: ty };
      }
    }
    return null;
  }

  public aggroMobOnPlayerHit(mob: MobEntity, attacker: PlayerSession) {
    if (
      !mob.alive ||
      mob.behavior !== "aggressive" ||
      !mobCanAttack(mob.minHit, mob.maxHit) ||
      attacker.isInvisible()
    ) {
      return;
    }
    mob.isAggroed = true;
    mob.facing = this.facingTowards(mob.tileX, mob.tileY, attacker.tileX, attacker.tileY);
  }

  public mobOccupiesTile(mob: MobEntity, tileX: number, tileY: number): boolean {
    return mobFootprintOccupiesTile(tileX, tileY, mob.tileX, mob.tileY, mob.hitboxWidthTiles, mob.hitboxHeightTiles);
  }

  public isTileOccupiedByMobOrPlayer(tileX: number, tileY: number, mapId: string, exceptMobId?: string): boolean {
    for (const mob of this.world.getMobs().values()) {
      if (!mob.alive || mob.mapId !== mapId) continue;
      if (exceptMobId && mob.id === exceptMobId) continue;
      if (this.mobOccupiesTile(mob, tileX, tileY)) return true;
    }
    for (const player of this.world.getPlayers().values()) {
      if (!player.joined || player.mapId !== mapId) continue;
      if (player.tileX === tileX && player.tileY === tileY) return true;
    }
    return false;
  }
}
