/**
 * Precarga todas las hojas de sprites de cuerpos del catálogo Imperium.
 * Llamar desde GameScene.preload().
 */
import type Phaser from "phaser";
import { listReadyImperiumBodyVisuals } from "../../../game-data/imperium/npcBodyVisuals";

export function loadAllImperiumNpcVisualAssets(scene: Phaser.Scene): void {
  for (const visual of listReadyImperiumBodyVisuals()) {
    if (scene.textures.exists(visual.textureKey)) {
      continue;
    }
    scene.load.spritesheet(visual.textureKey, visual.texturePath, {
      frameWidth: visual.frameWidth,
      frameHeight: visual.frameHeight,
    });
  }
}
