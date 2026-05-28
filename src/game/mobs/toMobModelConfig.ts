import type { Facing } from "../../player/playerSprites";
import type { MobModelConfig, MobModelId } from "../../data/mobs";
import {
  MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX,
  mobScaleForFrameHeight,
  MOB_TARGET_DISPLAY_HEIGHT_PX,
} from "../../data/mobSheetLayouts";
import {
  MOB_DEFAULT_MOVE_SPEED_RATIO,
  MOB_DIRECTION_ROWS_SWAD,
  mobTextureKey,
  type MobVisualConfig,
} from "./mobVisualConfig";
import { resolveDirectionRows, shouldMirrorRightFromLeft } from "./mobFrameIndex";

function defaultScale(frameHeight: number, modelId: MobModelId): number {
  const useLarge =
    frameHeight >= 64 &&
    (modelId === "lobo" ||
      modelId === "arana" ||
      modelId === "oso" ||
      modelId === "golem_plata" ||
      modelId === "aparicion");
  const target = useLarge ? MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX : MOB_TARGET_DISPLAY_HEIGHT_PX;
  const base = mobScaleForFrameHeight(frameHeight, target);
  if (modelId === "oso") return base * 1.1;
  if (modelId === "golem_plata") return base * 0.85;
  return base;
}

export function toMobModelConfig(
  modelId: MobModelId,
  visual: MobVisualConfig
): MobModelConfig {
  const walkColumns = visual.walkFrames;
  const walkCount = walkColumns.length;

  if (visual.type === "directionSheets") {
    const textureKeysByFacing: Partial<Record<Facing, string>> = {
      down: mobTextureKey(modelId, "down"),
      up: mobTextureKey(modelId, "up"),
      left: mobTextureKey(modelId, "left"),
      right: mobTextureKey(modelId, "right"),
    };

    return {
      textureKey: mobTextureKey(modelId, "down"),
      texturePath: visual.paths.down,
      frameWidth: visual.frameWidth,
      frameHeight: visual.frameHeight,
      idleFrame: 0,
      sheetCols: visual.columns,
      moveFrameCount: walkCount,
      walkStartFrame: walkColumns[0] ?? 0,
      walkAnimFrameCount: walkCount,
      walkColumns,
      moveSpeedRatio: visual.moveSpeedRatio ?? MOB_DEFAULT_MOVE_SPEED_RATIO,
      mirrorRightFromLeft: false,
      dirAxis: "rows",
      dirRows: { ...MOB_DIRECTION_ROWS_SWAD },
      visualOffsetY: visual.visualOffsetY ?? 0,
      scale: visual.scale ?? defaultScale(visual.frameHeight, modelId),
      visualType: "directionSheets",
      textureKeysByFacing,
      texturePathsByFacing: visual.paths,
    };
  }

  const single = visual;

  const model: MobModelConfig = {
    textureKey: mobTextureKey(modelId),
    texturePath: single.path,
    frameWidth: single.frameWidth,
    frameHeight: single.frameHeight,
    idleFrame: single.idleColumn ?? single.walkFrames[0] ?? 0,
    sheetCols: single.columns,
    moveFrameCount: walkCount,
    walkStartFrame: walkColumns[0] ?? 0,
    walkAnimFrameCount: walkCount,
    walkColumns,
    moveSpeedRatio: single.moveSpeedRatio ?? MOB_DEFAULT_MOVE_SPEED_RATIO,
    mirrorRightFromLeft: shouldMirrorRightFromLeft(single),
    dirAxis: "rows",
    dirRows: resolveDirectionRows(single),
    visualOffsetY: single.visualOffsetY ?? 0,
    scale: single.scale ?? defaultScale(single.frameHeight, modelId),
    visualType: "singleSheet",
  };

  if (single.directionFrames) {
    model.directionFrames = {
      down: single.directionFrames.down ?? 0,
      up: single.directionFrames.up ?? 0,
      left: single.directionFrames.left ?? 0,
      right: single.directionFrames.right ?? 0,
    };
    model.walkAnimFrameCount = 1;
    model.moveFrameCount = 1;
    model.walkColumns = [0];
  }

  if (single.facingOriginY) {
    model.facingOriginY = single.facingOriginY;
  }

  return model;
}

export function buildMobModelsFromVisualConfigs(
  configs: Record<MobModelId, MobVisualConfig>
): Record<MobModelId, MobModelConfig> {
  const models = {} as Record<MobModelId, MobModelConfig>;
  for (const modelId of Object.keys(configs) as MobModelId[]) {
    models[modelId] = toMobModelConfig(modelId, configs[modelId]);
  }
  return models;
}
