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
  tileX: number;
  tileY: number;
  facing: Facing = "down";
  hp: number;
  readonly maxHp: number;
  alive = true;
  immobilizedUntil = 0;
  respawnAt = 0;
  nextWanderAt = 0;

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
