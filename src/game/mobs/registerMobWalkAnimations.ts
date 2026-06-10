import type Phaser from "phaser";
import { STEP_DURATION_MS } from "../../config";
import type { Facing } from "../../player/playerSprites";
import type { MobModelId } from "../../../game-data/mobs";
import {
  MOB_DEFAULT_MOVE_SPEED_RATIO,
  MOB_VISUAL_CONFIGS,
  MOB_WALK_ANIM_FRAME_RATE_SCALE,
  mobTextureKey,
  resolveDirectionSheetFacingLayout,
} from "./mobVisualConfig";
import { getMobWalkFrameIndices } from "./mobFrameIndex";

const FACINGS: Facing[] = ["down", "up", "left", "right"];

function getMobMoveSpeedRatio(modelId: MobModelId): number {
  return MOB_VISUAL_CONFIGS[modelId].moveSpeedRatio ?? MOB_DEFAULT_MOVE_SPEED_RATIO;
}

function getMobStepDurationMs(modelId: MobModelId): number {
  const ratio = getMobMoveSpeedRatio(modelId);
  return Math.ceil(STEP_DURATION_MS / ratio);
}

function computeMobWalkFrameRate(modelId: MobModelId, walkCount: number): number {
  const stepSeconds = getMobStepDurationMs(modelId) / 1000;
  const syncedRate = walkCount / stepSeconds;
  return Math.max(1, syncedRate * MOB_WALK_ANIM_FRAME_RATE_SCALE);
}

function mobAnimationKey(modelId: MobModelId, facing: Facing): string {
  return `mob_${modelId}_walk_${facing}`;
}

function getTextureFrameMax(scene: Phaser.Scene, textureKey: string): number {
  const texture = scene.textures.get(textureKey);
  if (!texture || texture.key === "__MISSING") {
    return -1;
  }
  return texture.frameTotal - 1;
}

export function registerMobWalkAnimations(scene: Phaser.Scene): void {
  (Object.keys(MOB_VISUAL_CONFIGS) as MobModelId[]).forEach((modelId) => {
    const visual = MOB_VISUAL_CONFIGS[modelId];

    FACINGS.forEach((facing) => {
      const walkKey = mobAnimationKey(modelId, facing);
      if (scene.anims.exists(walkKey)) {
        scene.anims.remove(walkKey);
      }

      const textureKey =
        visual.type === "directionSheets"
          ? mobTextureKey(modelId, facing)
          : mobTextureKey(modelId);

      const walkFrames =
        visual.type === "directionSheets"
          ? resolveDirectionSheetFacingLayout(visual, facing).walkFrames
          : getMobWalkFrameIndices(visual, facing);

      const frameIndices = walkFrames.filter((frame) => {
        const max = getTextureFrameMax(scene, textureKey);
        return max >= 0 && frame >= 0 && frame <= max;
      });

      if (frameIndices.length === 0) {
        return;
      }

      const frameRate = computeMobWalkFrameRate(modelId, frameIndices.length);

      scene.anims.create({
        key: walkKey,
        frames: frameIndices.map((frame) => ({ key: textureKey, frame })),
        frameRate: Math.max(1, frameRate),
        repeat: -1,
      });
    });
  });
}

export function mobWalkAnimKey(modelId: MobModelId, facing: Facing): string {
  return mobAnimationKey(modelId, facing);
}
