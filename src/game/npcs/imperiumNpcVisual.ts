import type { Facing } from "../../player/playerSprites";
import {
  getImperiumBodyVisual,
  isImperiumBodyVisualReady,
  type ImperiumBodyVisualReady,
} from "../../../game-data/imperium/npcBodyVisuals";
import type { ImperiumNpcCatalogEntry } from "../../../game-data/imperium/npcCatalogTypes";
import {
  MOB_DEFAULT_MOVE_SPEED_RATIO,
  MOB_DIRECTION_ROWS_WDSA,
  MOB_WALK_ANIM_FRAME_RATE_SCALE,
} from "../mobs/mobVisualConfig";
import { mobScaleForFrameHeight, MOB_TARGET_DISPLAY_HEIGHT_PX } from "../../data/mobSheetLayouts";
import { resolveImperiumNpcFaceConfig } from "./imperiumNpcFaceConfig";
import type { ImperiumNpcFaceConfig } from "./imperiumNpcFaceConfig";

export type { ImperiumNpcFaceConfig } from "./imperiumNpcFaceConfig";

/** Config de spritesheet lista para Phaser (misma convención que mobs). */
export type ImperiumNpcBodySpriteConfig = {
  textureKey: string;
  texturePath: string;
  frameWidth: number;
  frameHeight: number;
  sheetCols: number;
  walkFrames: number[];
  directionRows: Record<Facing, number>;
  idleColumn: number;
  scale: number;
  moveSpeedRatio: number;
  walkFrameRateScale: number;
  mirrorRightFromLeft: boolean;
  headOffsetX: number;
  headOffsetY: number;
  face: ImperiumNpcFaceConfig | null;
};

export function getImperiumNpcBodySpriteConfig(
  bodyId: number
): ImperiumNpcBodySpriteConfig | null {
  const visual = getImperiumBodyVisual(bodyId);
  if (!isImperiumBodyVisualReady(visual)) {
    return null;
  }
  return bodyVisualToSpriteConfig(visual);
}

export function bodyVisualToSpriteConfig(
  visual: ImperiumBodyVisualReady
): ImperiumNpcBodySpriteConfig {
  // Hojas body_*.png del import siguen W D S A; el JSON viejo asumía SWAD por fila.
  const directionRows: Record<Facing, number> = { ...MOB_DIRECTION_ROWS_WDSA };

  return {
    textureKey: visual.textureKey,
    texturePath: visual.texturePath,
    frameWidth: visual.frameWidth,
    frameHeight: visual.frameHeight,
    sheetCols: visual.sheetCols,
    walkFrames: visual.walkFrames,
    directionRows,
    idleColumn: visual.walkFrames[0] ?? 0,
    scale: mobScaleForFrameHeight(visual.frameHeight, MOB_TARGET_DISPLAY_HEIGHT_PX),
    moveSpeedRatio: MOB_DEFAULT_MOVE_SPEED_RATIO,
    walkFrameRateScale: MOB_WALK_ANIM_FRAME_RATE_SCALE,
    mirrorRightFromLeft: visual.mirrorRightFromLeft,
    headOffsetX: visual.headOffsetX,
    headOffsetY: visual.headOffsetY,
    face: null,
  };
}

/** Cuerpo + cara desde entrada de catálogo (si `visual.face` está asignada). */
export function getImperiumNpcSpriteConfigFromCatalog(
  entry: ImperiumNpcCatalogEntry
): ImperiumNpcBodySpriteConfig | null {
  const body = getImperiumNpcBodySpriteConfig(entry.body);
  if (!body) {
    return null;
  }
  body.face = resolveImperiumNpcFaceConfig(entry, body);
  return body;
}
