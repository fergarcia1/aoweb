import type Phaser from "phaser";
import type { MobModelId } from "../../../game-data/mobs";
import {
  MOB_VISUAL_CONFIGS,
  mobTextureKey,
  resolveDirectionSheetFacingLayout,
  type MobDirection,
} from "./mobVisualConfig";

const FACINGS: MobDirection[] = ["down", "up", "left", "right"];

function queueMobVisualModel(scene: Phaser.Scene, modelId: MobModelId): void {
  const visual = MOB_VISUAL_CONFIGS[modelId];
  if (!visual) return;

  if (visual.type === "directionSheets") {
    FACINGS.forEach((facing) => {
      const path = visual.paths[facing];
      if (!path) return;
      const textureKey = mobTextureKey(modelId, facing);
      if (scene.textures.exists(textureKey)) return;
      const layout = resolveDirectionSheetFacingLayout(visual, facing);
      scene.load.spritesheet(textureKey, path, {
        frameWidth: layout.frameWidth,
        frameHeight: layout.frameHeight,
      });
    });
    return;
  }

  const textureKey = mobTextureKey(modelId);
  if (scene.textures.exists(textureKey)) return;
  scene.load.spritesheet(textureKey, visual.path, {
    frameWidth: visual.frameWidth,
    frameHeight: visual.frameHeight,
  });
}

export function loadMobVisualAssetsForModels(
  scene: Phaser.Scene,
  modelIds: Iterable<MobModelId>
): void {
  for (const modelId of modelIds) {
    queueMobVisualModel(scene, modelId);
  }
}

export function loadMobVisualAssets(scene: Phaser.Scene): void {
  loadMobVisualAssetsForModels(scene, Object.keys(MOB_VISUAL_CONFIGS) as MobModelId[]);
}
