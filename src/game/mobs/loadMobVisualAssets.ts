import type Phaser from "phaser";
import type { MobModelId } from "../../../game-data/mobs";
import {
  MOB_VISUAL_CONFIGS,
  mobTextureKey,
  resolveDirectionSheetFacingLayout,
  type MobDirection,
} from "./mobVisualConfig";

const FACINGS: MobDirection[] = ["down", "up", "left", "right"];

function queueMobVisualModel(scene: Phaser.Scene, modelId: MobModelId): number {
  const visual = MOB_VISUAL_CONFIGS[modelId];
  if (!visual) return 0;
  let queued = 0;

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
      queued += 1;
    });
    return queued;
  }

  const textureKey = mobTextureKey(modelId);
  if (scene.textures.exists(textureKey)) return 0;
  scene.load.spritesheet(textureKey, visual.path, {
    frameWidth: visual.frameWidth,
    frameHeight: visual.frameHeight,
  });
  return 1;
}

export function loadMobVisualAssetsForModels(
  scene: Phaser.Scene,
  modelIds: Iterable<MobModelId>
): number {
  let queued = 0;
  for (const modelId of modelIds) {
    queued += queueMobVisualModel(scene, modelId);
  }
  return queued;
}

export function loadMobVisualAssets(scene: Phaser.Scene): number {
  return loadMobVisualAssetsForModels(scene, Object.keys(MOB_VISUAL_CONFIGS) as MobModelId[]);
}
