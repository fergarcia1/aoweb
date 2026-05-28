import type Phaser from "phaser";
import type { Facing } from "../player/playerSprites";

const MOB_CHASE_RESUME_DELAY_MS = 180;
const PEACEFUL_WANDER_MIN_MS = 7000;
const PEACEFUL_WANDER_MAX_MS = 8000;

export { PEACEFUL_WANDER_MIN_MS, PEACEFUL_WANDER_MAX_MS };

export type MobAiDummy = {
  id: string;
  behavior: string;
  modelId: string;
  name: string;
  mapId: string;
  tileX: number;
  tileY: number;
  sizeTiles: number;
  hp: number;
  maxHp: number;
  detectionRangeTiles: number;
  leashRangeTiles: number;
  attackDamage: number;
  attackCooldownMs: number;
  aiMoveCooldownMs: number;
  nextAiMoveAt: number;
  nextAttackAt: number;
  immobilizedUntilMs: number;
  isAggroed: boolean;
  isStatic: boolean;
  facing: Facing;
  isMoving: boolean;
  wasAdjacentToPlayer: boolean;
  sprite: Phaser.GameObjects.Sprite;
  hpLabel: Phaser.GameObjects.Text;
  alive: boolean;
  isShowcase?: boolean;
};

export type MobAiCallbacks = {
  getPlayerTile(): { x: number; y: number };
  isMultiplayerActive(): boolean;
  isChangingMap(): boolean;
  getCurrentMapId(): string;
  isTileWalkableForMob(x: number, y: number, source: MobAiDummy): boolean;
  getMobFeetWorld(modelId: string, x: number, y: number): { x: number; y: number };
  getMobStepDurationMs(modelId: string): number;
  applyIncomingDamage(amount: number, type: "physical"): number;
  getScene(): Phaser.Scene;
  setMobAnimationState(dummy: MobAiDummy, state: "idle" | "walk"): void;
  syncDummyWorldPosition(dummy: MobAiDummy): void;
  depthFromFeetY(feetY: number): number;
  syncMobFaceForDummy(dummy: MobAiDummy): void;
  showDamageNumber(x: number, y: number, damage: number, source: string): void;
  playAttackFeedback(tileX: number, tileY: number): void;
  addCombatLine(msg: string): void;
  getPlayerSprite(): Phaser.GameObjects.Sprite;
};

export class MobAiSystem {
  private readonly cb: MobAiCallbacks;

  constructor(callbacks: MobAiCallbacks) {
    this.cb = callbacks;
  }

  update(dummies: MobAiDummy[], now: number) {
    if (this.cb.isChangingMap()) return;
    if (this.cb.isMultiplayerActive()) return;

    const playerTile = this.cb.getPlayerTile();

    for (const dummy of dummies) {
      if (!dummy.alive || dummy.mapId !== this.cb.getCurrentMapId()) continue;
      if (dummy.isShowcase) continue;
      if (dummy.isStatic) {
        this.cb.setMobAnimationState(dummy, "idle");
        continue;
      }
      if (now < dummy.immobilizedUntilMs) {
        this.stopDummyMovement(dummy);
        this.cb.setMobAnimationState(dummy, "idle");
        continue;
      }

      if (dummy.behavior === "peaceful") {
        this.updatePeacefulMobAi(dummy, now);
        continue;
      }

      const distanceToPlayer =
        Math.abs(playerTile.x - dummy.tileX) +
        Math.abs(playerTile.y - dummy.tileY);

      if (distanceToPlayer > dummy.leashRangeTiles) {
        dummy.isAggroed = false;
        this.cb.setMobAnimationState(dummy, "idle");
        continue;
      }

      if (!dummy.isAggroed && distanceToPlayer <= dummy.detectionRangeTiles) {
        dummy.isAggroed = true;
      }

      if (!dummy.isAggroed) {
        this.cb.setMobAnimationState(dummy, "idle");
        continue;
      }

      const isAdjacent = distanceToPlayer === 1;

      if (isAdjacent) {
        dummy.wasAdjacentToPlayer = true;
        if (!dummy.isMoving) {
          dummy.facing = this.resolveFacingTowardsTargetTile(
            dummy.tileX,
            dummy.tileY,
            playerTile.x,
            playerTile.y,
            dummy.facing
          );
          this.tryMobAttackPlayer(dummy, now, playerTile);
          this.cb.setMobAnimationState(dummy, "idle");
        }
        continue;
      }

      if (dummy.wasAdjacentToPlayer) {
        dummy.wasAdjacentToPlayer = false;
        dummy.nextAiMoveAt = Math.max(dummy.nextAiMoveAt, now + MOB_CHASE_RESUME_DELAY_MS);
      }

      if (dummy.isMoving) continue;
      if (now < dummy.nextAiMoveAt) continue;

      const movedFacing = this.tryMoveDummyTowardsTile(dummy, playerTile.x, playerTile.y);
      if (movedFacing) {
        dummy.nextAiMoveAt = now + dummy.aiMoveCooldownMs;
      } else {
        this.cb.setMobAnimationState(dummy, "idle");
      }
    }
  }

  private updatePeacefulMobAi(dummy: MobAiDummy, now: number) {
    dummy.isAggroed = false;

    if (dummy.isMoving) return;

    if (now < dummy.nextAiMoveAt) {
      this.cb.setMobAnimationState(dummy, "idle");
      return;
    }

    if (this.tryPeacefulWander(dummy)) {
      dummy.nextAiMoveAt =
        now + randomBetween(PEACEFUL_WANDER_MIN_MS, PEACEFUL_WANDER_MAX_MS);
    } else {
      dummy.nextAiMoveAt =
        now + randomBetween(PEACEFUL_WANDER_MIN_MS, PEACEFUL_WANDER_MAX_MS);
      this.cb.setMobAnimationState(dummy, "idle");
    }
  }

  private tryPeacefulWander(dummy: MobAiDummy): boolean {
    const directions: Facing[] = ["up", "down", "left", "right"];
    shuffleArray(directions);

    for (const facing of directions) {
      const nextTileX =
        dummy.tileX + (facing === "left" ? -1 : facing === "right" ? 1 : 0);
      const nextTileY =
        dummy.tileY + (facing === "up" ? -1 : facing === "down" ? 1 : 0);
      if (!this.cb.isTileWalkableForMob(nextTileX, nextTileY, dummy)) continue;
      if (this.startDummyStep(dummy, nextTileX, nextTileY, facing)) {
        return true;
      }
    }

    return false;
  }

  tryMoveDummyTowardsTile(
    dummy: MobAiDummy,
    targetTileX: number,
    targetTileY: number
  ): Facing | null {
    const dx = targetTileX - dummy.tileX;
    const dy = targetTileY - dummy.tileY;
    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);
    const prioritizeX = Math.abs(dx) >= Math.abs(dy);

    const options: { x: number; y: number }[] = prioritizeX
      ? [
          { x: dummy.tileX + stepX, y: dummy.tileY },
          { x: dummy.tileX, y: dummy.tileY + stepY },
          { x: dummy.tileX, y: dummy.tileY + (stepY === 0 ? 1 : -stepY) },
          { x: dummy.tileX + (stepX === 0 ? 1 : -stepX), y: dummy.tileY },
        ]
      : [
          { x: dummy.tileX, y: dummy.tileY + stepY },
          { x: dummy.tileX + stepX, y: dummy.tileY },
          { x: dummy.tileX + (stepX === 0 ? 1 : -stepX), y: dummy.tileY },
          { x: dummy.tileX, y: dummy.tileY + (stepY === 0 ? 1 : -stepY) },
        ];

    for (const option of options) {
      if (!this.cb.isTileWalkableForMob(option.x, option.y, dummy)) continue;

      const movedFacing: Facing =
        option.x > dummy.tileX
          ? "right"
          : option.x < dummy.tileX
          ? "left"
          : option.y > dummy.tileY
          ? "down"
          : "up";
      if (this.startDummyStep(dummy, option.x, option.y, movedFacing)) {
        return movedFacing;
      }
    }

    return null;
  }

  startDummyStep(
    dummy: MobAiDummy,
    nextTileX: number,
    nextTileY: number,
    facing: Facing
  ): boolean {
    if (dummy.isMoving) return false;

    const scene = this.cb.getScene();
    scene.tweens.killTweensOf(dummy.sprite);
    scene.tweens.killTweensOf(dummy.hpLabel);

    dummy.tileX = nextTileX;
    dummy.tileY = nextTileY;
    dummy.facing = facing;
    dummy.isMoving = true;

    const target = this.cb.getMobFeetWorld(dummy.modelId, nextTileX, nextTileY);
    const stepDurationMs = this.cb.getMobStepDurationMs(dummy.modelId);
    this.cb.setMobAnimationState(dummy, "walk");

    scene.tweens.add({
      targets: dummy.sprite,
      x: target.x,
      y: target.y,
      duration: stepDurationMs,
      ease: "Linear",
      onUpdate: () => {
        dummy.hpLabel.setPosition(dummy.sprite.x, dummy.sprite.y - 30);
        const depth = this.cb.depthFromFeetY(dummy.sprite.y);
        dummy.sprite.setDepth(depth);
        dummy.hpLabel.setDepth(depth + 3);
        this.cb.syncMobFaceForDummy(dummy);
      },
      onComplete: () => {
        dummy.isMoving = false;
        this.cb.syncDummyWorldPosition(dummy);
        if (dummy.alive) {
          this.cb.setMobAnimationState(dummy, "idle");
        }
      },
    });

    return true;
  }

  stopDummyMovement(dummy: MobAiDummy) {
    if (!dummy.isMoving) return;
    const scene = this.cb.getScene();
    scene.tweens.killTweensOf(dummy.sprite);
    scene.tweens.killTweensOf(dummy.hpLabel);
    dummy.isMoving = false;
    this.cb.syncDummyWorldPosition(dummy);
  }

  private tryMobAttackPlayer(dummy: MobAiDummy, now: number, playerTile: { x: number; y: number }) {
    if (now < dummy.nextAttackAt) return;

    dummy.facing = this.resolveFacingTowardsTargetTile(
      dummy.tileX,
      dummy.tileY,
      playerTile.x,
      playerTile.y,
      dummy.facing
    );
    this.cb.setMobAnimationState(dummy, "idle");

    dummy.nextAttackAt = now + dummy.attackCooldownMs;
    const damageApplied = this.cb.applyIncomingDamage(dummy.attackDamage, "physical");
    const player = this.cb.getPlayerSprite();
    this.cb.showDamageNumber(player.x, player.y - 44, damageApplied, "mob");
    this.cb.playAttackFeedback(playerTile.x, playerTile.y);
    this.cb.addCombatLine(`${dummy.name} te golpea por ${damageApplied}.`);
  }

  resolveFacingTowardsTargetTile(
    fromTileX: number,
    fromTileY: number,
    toTileX: number,
    toTileY: number,
    fallbackFacing: Facing
  ): Facing {
    const dx = toTileX - fromTileX;
    const dy = toTileY - fromTileY;
    if (dx === 0 && dy === 0) return fallbackFacing;

    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? "right" : "left";
    }
    return dy >= 0 ? "down" : "up";
  }
}

function randomBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
