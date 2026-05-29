import type { Facing, NetMobState } from "../../shared/types";

const WANDER_MIN_MS = 4000;
const WANDER_MAX_MS = 7000;

export class MobEntity {
  readonly id: string;
  readonly mobId: string;
  readonly name: string;
  readonly mapId: string;
  readonly behavior: string;
  readonly hitboxWidthTiles: number;
  readonly hitboxHeightTiles: number;
  readonly hitboxOffsetTiles: number;
  readonly detectionRangeTiles: number;
  readonly leashRangeTiles: number;
  readonly attackDamage: number;
  readonly attackCooldownMs: number;
  readonly aiMoveCooldownMs: number;
  readonly respawnMs: number;
  tileX: number;
  tileY: number;
  facing: Facing = "down";
  hp: number;
  readonly maxHp: number;
  alive = true;
  immobilizedUntil = 0;
  respawnAt = 0;
  nextWanderAt = 0;
  nextAttackAt = 0;
  nextMoveAt = 0;
  isAggroed = false;

  constructor(config: {
    id: string;
    mobId: string;
    name: string;
    mapId: string;
    tileX: number;
    tileY: number;
    maxHp: number;
    behavior: string;
    hitboxOffsetY: number;
    hitboxWidthTiles: number;
    hitboxHeightTiles: number;
    detectionRangeTiles?: number;
    leashRangeTiles?: number;
    attackDamage?: number;
    attackCooldownMs?: number;
    aiMoveCooldownMs?: number;
    respawnMs?: number;
  }) {
    this.id = config.id;
    this.mobId = config.mobId;
    this.name = config.name;
    this.mapId = config.mapId;
    this.behavior = config.behavior;
    this.hitboxWidthTiles = Math.max(1, config.hitboxWidthTiles);
    this.hitboxHeightTiles = Math.max(1, config.hitboxHeightTiles);
    this.hitboxOffsetTiles = Math.round((config.hitboxOffsetY ?? 0) / 32);
    this.tileX = config.tileX;
    this.tileY = config.tileY;
    this.maxHp = config.maxHp;
    this.hp = config.maxHp;
    this.detectionRangeTiles = Math.max(0, config.detectionRangeTiles ?? 0);
    this.leashRangeTiles = Math.max(1, config.leashRangeTiles ?? 20);
    this.attackDamage = Math.max(0, config.attackDamage ?? 0);
    this.attackCooldownMs = Math.max(200, config.attackCooldownMs ?? 1000);
    this.aiMoveCooldownMs = Math.max(200, config.aiMoveCooldownMs ?? 450);
    this.respawnMs = Math.max(500, config.respawnMs ?? 10_000);
    this.nextWanderAt = Date.now() + randomWanderDelay();
  }

  isImmobilized(now = Date.now()) {
    return now < this.immobilizedUntil;
  }

  scheduleNextWander() {
    this.nextWanderAt = Date.now() + randomWanderDelay();
  }

  toNetState(): NetMobState {
    return {
      id: this.id,
      mobId: this.mobId,
      name: this.name,
      mapId: this.mapId,
      tileX: this.tileX,
      tileY: this.tileY,
      facing: this.facing,
      hp: this.hp,
      hpMax: this.maxHp,
      alive: this.alive,
    };
  }
}

function randomWanderDelay(): number {
  return WANDER_MIN_MS + Math.floor(Math.random() * (WANDER_MAX_MS - WANDER_MIN_MS));
}
