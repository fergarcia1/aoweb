import type Phaser from "phaser";
import type { MobModelId } from "../../data/mobs";
import {
  MOB_VISUAL_CONFIGS,
  mobTextureKey,
  resolveDirectionSheetFacingLayout,
  type MobDirection,
} from "./mobVisualConfig";

const FACINGS: MobDirection[] = ["down", "up", "left", "right"];

export function loadMobVisualAssets(scene: Phaser.Scene): void {
  (Object.keys(MOB_VISUAL_CONFIGS) as MobModelId[]).forEach((modelId) => {
    const visual = MOB_VISUAL_CONFIGS[modelId];

    if (visual.type === "directionSheets") {
      FACINGS.forEach((facing) => {
        const path = visual.paths[facing];
        if (!path) return;
        const layout = resolveDirectionSheetFacingLayout(visual, facing);
        scene.load.spritesheet(mobTextureKey(modelId, facing), path, {
          frameWidth: layout.frameWidth,
          frameHeight: layout.frameHeight,
        });
      });
      return;
    }

    scene.load.spritesheet(mobTextureKey(modelId), visual.path, {
      frameWidth: visual.frameWidth,
      frameHeight: visual.frameHeight,
    });
  });
}
