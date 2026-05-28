import type Phaser from "phaser";
import type { Facing } from "../../player/playerSprites";
import { MOB_MODELS, type MobModelId } from "../../data/mobs";
import { getRaceFaceLayout } from "../../player/raceFaceLayout";
import { faceTextureKey, getFaceFrame } from "../../player/raceFaces";
import { MOB_VISUAL_CONFIGS } from "./mobVisualConfig";
import { getMobSpriteFlipX } from "./mobFrameIndex";

export function mobHasFaceOverlay(modelId: MobModelId): boolean {
  const visual = MOB_VISUAL_CONFIGS[modelId];
  return visual.type === "singleSheet" && visual.faceOverlay !== undefined;
}

export function createMobFaceSpriteIfNeeded(
  scene: Phaser.Scene,
  modelId: MobModelId,
  facing: Facing
): Phaser.GameObjects.Sprite | undefined {
  const visual = MOB_VISUAL_CONFIGS[modelId];
  if (visual.type !== "singleSheet" || !visual.faceOverlay) {
    return undefined;
  }

  const { raceId, genderId, faceIndex } = visual.faceOverlay;
  const face = scene.add.sprite(
    0,
    0,
    faceTextureKey(raceId, genderId),
    getFaceFrame(raceId, genderId, faceIndex, facing)
  );
  face.setOrigin(0.5, 1);
  const bodyScale = MOB_MODELS[modelId].scale;
  face.setScale(getRaceFaceLayout(raceId, genderId).scale * bodyScale);
  return face;
}

export function syncMobFaceSprite(
  body: Phaser.GameObjects.Sprite,
  face: Phaser.GameObjects.Sprite,
  modelId: MobModelId,
  facing: Facing
): void {
  const visual = MOB_VISUAL_CONFIGS[modelId];
  if (visual.type !== "singleSheet" || !visual.faceOverlay) {
    return;
  }

  const overlay = visual.faceOverlay;
  const { raceId, genderId, faceIndex } = overlay;
  const facingAdjust = overlay.faceOffsetByFacing?.[facing];
  const faceDropY = (overlay.faceDropY ?? 0) + (facingAdjust?.y ?? 0);
  const faceOffsetX = (overlay.faceOffsetX ?? 0) + (facingAdjust?.x ?? 0);
  const offset = getRaceFaceLayout(raceId, genderId).offset[facing];

  /** Si el cuerpo espeja la fila A para D, la cara usa frame de izquierda. */
  const faceFacing =
    facing === "right" && getMobSpriteFlipX(visual, facing) ? "left" : facing;

  face.setFrame(getFaceFrame(raceId, genderId, faceIndex, faceFacing));
  face.setPosition(
    body.x + offset.x + faceOffsetX,
    body.y - offset.y + faceDropY
  );
  face.setFlipX(body.flipX);
}
