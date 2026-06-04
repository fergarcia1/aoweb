import type Phaser from "phaser";
import type { Facing } from "../../player/playerSprites";
import { MOB_MODELS, type MobModelId } from "../../data/mobs";
import { MOB_VISUAL_CONFIGS, mobTextureKey } from "./mobVisualConfig";
import {
  getMobIdleFrameIndex,
  getMobSpriteFlipX,
  getMobWalkFrameIndices,
} from "./mobFrameIndex";
import { loadMobVisualAssets } from "./loadMobVisualAssets";
import {
  mobWalkAnimKey,
  registerMobWalkAnimations,
} from "./registerMobWalkAnimations";

export { loadMobVisualAssets, registerMobWalkAnimations, mobWalkAnimKey };

export function getMobVisualConfig(modelId: MobModelId) {
  return MOB_VISUAL_CONFIGS[modelId];
}

export function getMobTextureKey(modelId: MobModelId, facing: Facing): string {
  const visual = MOB_VISUAL_CONFIGS[modelId];
  if (visual.type === "directionSheets") {
    return mobTextureKey(modelId, facing);
  }
  return mobTextureKey(modelId);
}

export function applyMobSpriteFacing(
  sprite: Phaser.GameObjects.Sprite,
  modelId: MobModelId,
  facing: Facing,
  frameIndex?: number
): void {
  const visual = MOB_VISUAL_CONFIGS[modelId];
  const textureKey = getMobTextureKey(modelId, facing);
  const frame = frameIndex ?? getMobIdleFrameIndex(visual, facing);

  if (sprite.texture.key !== textureKey) {
    sprite.setTexture(textureKey, frame);
  } else {
    sprite.setFrame(frame);
  }

  sprite.setFlipX(getMobSpriteFlipX(visual, facing));
}

export function playMobWalkAnimation(
  sprite: Phaser.GameObjects.Sprite,
  modelId: MobModelId,
  facing: Facing
): void {
  const visual = MOB_VISUAL_CONFIGS[modelId];
  applyMobSpriteFacing(sprite, modelId, facing);

  const key = mobWalkAnimKey(modelId, facing);
  if (sprite.scene.anims.exists(key)) {
    // Un ciclo de caminata por tile: reiniciar aunque siga la misma dirección.
    if (sprite.anims.currentAnim?.key === key) {
      sprite.anims.restart();
    } else {
      sprite.play(key);
    }
    return;
  }

  const fallback = getMobWalkFrameIndices(visual, facing)[0];
  if (fallback !== undefined) {
    sprite.setFrame(fallback);
  }
}

export function playMobIdleFrame(
  sprite: Phaser.GameObjects.Sprite,
  modelId: MobModelId,
  facing: Facing
): void {
  sprite.anims.stop();
  applyMobSpriteFacing(sprite, modelId, facing, getMobIdleFrameIndex(MOB_VISUAL_CONFIGS[modelId], facing));
}

/** Crea un sprite de mob con textura y frame correctos (soporta directionSheets). */
export function createMobSprite(
  scene: Phaser.Scene,
  modelId: MobModelId,
  worldX: number,
  worldY: number,
  facing: Facing = "down"
): Phaser.GameObjects.Sprite {
  const model = MOB_MODELS[modelId];
  const visual = MOB_VISUAL_CONFIGS[modelId];
  const textureKey = getMobTextureKey(modelId, facing);
  const frame = getMobIdleFrameIndex(visual, facing);

  const sprite = scene.add.sprite(worldX, worldY, textureKey, frame);
  sprite.setOrigin(0.5, 1);
  sprite.setScale(model.scale);
  applyMobSpriteFacing(sprite, modelId, facing);
  return sprite;
}

export function isDirectionSheetsMob(modelId: MobModelId): boolean {
  return MOB_VISUAL_CONFIGS[modelId].type === "directionSheets";
}

export {
  createMobFaceSpriteIfNeeded,
  mobHasFaceOverlay,
  syncMobFaceSprite,
} from "./mobFaceOverlay";
