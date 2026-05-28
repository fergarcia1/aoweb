import Phaser from "phaser";
import { registerArmorSpritesheet } from "../player/playerSprites";
import { NPC_BODY_TEXTURES } from "./npcDefinitions";

export function registerNpcAssets(scene: Phaser.Scene): void {
  for (const { key, path } of NPC_BODY_TEXTURES) {
    registerArmorSpritesheet(scene, key, path);
  }
}
