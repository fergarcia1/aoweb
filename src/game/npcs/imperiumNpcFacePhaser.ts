import type Phaser from "phaser";
import type { Facing } from "../../player/playerSprites";
import { faceTextureKey, getFaceFrame } from "../../player/raceFaces";
import { getRaceFaceLayout } from "../../player/raceFaceLayout";
import type { ImperiumNpcFaceConfig } from "./imperiumNpcFaceConfig";

export function createImperiumNpcFaceSprite(
  scene: Phaser.Scene,
  face: ImperiumNpcFaceConfig,
  facing: Facing,
  bodyScale: number
): Phaser.GameObjects.Sprite {
  const sprite = scene.add.sprite(
    0,
    0,
    faceTextureKey(face.raceId, face.genderId),
    getFaceFrame(face.raceId, face.genderId, face.faceIndex, facing)
  );
  sprite.setOrigin(0.5, 1);
  sprite.setScale(getRaceFaceLayout(face.raceId, face.genderId).scale * bodyScale);
  return sprite;
}

export function syncImperiumNpcFaceSprite(
  body: Phaser.GameObjects.Sprite,
  faceSprite: Phaser.GameObjects.Sprite,
  face: ImperiumNpcFaceConfig,
  facing: Facing,
  bodyFlipX: boolean
): void {
  const faceFacing = facing === "right" && bodyFlipX ? "left" : facing;

  faceSprite.setFrame(
    getFaceFrame(face.raceId, face.genderId, face.faceIndex, faceFacing)
  );

  const offset = getRaceFaceLayout(face.raceId, face.genderId).offset[facing];
  faceSprite.setPosition(
    body.x + offset.x + face.faceOffsetX,
    body.y - offset.y + face.faceDropY
  );
  faceSprite.setFlipX(bodyFlipX);
}
