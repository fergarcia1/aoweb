/**
 * Precarga todas las hojas de sprites de cuerpos del catálogo Imperium.
 * Llamar desde GameScene.preload().
 */
import type Phaser from "phaser";
import { listReadyImperiumBodyVisuals } from "../../../game-data/imperium/npcBodyVisuals";

export function loadImperiumNpcVisualAssetsForBodyIds(
  scene: Phaser.Scene,
  bodyIds: Iterable<number>
): void {
  const wanted = new Set(bodyIds);
  if (wanted.size === 0) {
    return;
  }

  for (const visual of listReadyImperiumBodyVisuals()) {
    if (!wanted.has(visual.bodyId)) {
      continue;
    }
    if (scene.textures.exists(visual.textureKey)) {
      continue;
    }
    scene.load.spritesheet(visual.textureKey, visual.texturePath, {
      frameWidth: visual.frameWidth,
      frameHeight: visual.frameHeight,
    });
  }
}

export function loadAllImperiumNpcVisualAssets(scene: Phaser.Scene): void {
  loadImperiumNpcVisualAssetsForBodyIds(
    scene,
    listReadyImperiumBodyVisuals().map((visual) => visual.bodyId)
  );
}
