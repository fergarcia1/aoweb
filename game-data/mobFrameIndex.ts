import type { Facing } from "../shared/types";
import {
  MOB_DIRECTION_ROWS_SWAD,
  resolveDirectionSheetFacingLayout,
  type MobDirection,
  type MobVisualConfig,
  type SingleSheetMobVisualConfig,
} from "./mobVisualConfig";

export function resolveDirectionRows(
  visual: SingleSheetMobVisualConfig
): Record<MobDirection, number> {
  return {
    down: visual.directionRows?.down ?? MOB_DIRECTION_ROWS_SWAD.down,
    up: visual.directionRows?.up ?? MOB_DIRECTION_ROWS_SWAD.up,
    left: visual.directionRows?.left ?? MOB_DIRECTION_ROWS_SWAD.left,
    right: visual.directionRows?.right ?? MOB_DIRECTION_ROWS_SWAD.right,
  };
}

/** ¿Usar fila A espejada para derecha? (fila D vacía en el PNG). */
export function shouldMirrorRightFromLeft(visual: MobVisualConfig): boolean {
  if (visual.type === "directionSheets") {
    return false;
  }
  if (visual.mirrorRightFromLeft === false) {
    return false;
  }
  if (visual.mirrorRightFromLeft === true) {
    return true;
  }
  return false;
}

/** Fila real en la hoja para una dirección de juego (sin espejo). */
export function getMobDirectionRow(
  visual: MobVisualConfig,
  facing: Facing
): number {
  if (visual.type === "directionSheets") {
    return 0;
  }
  return resolveDirectionRows(visual)[facing];
}

/** Columnas de caminata dentro de la fila (valores de `walkFrames`). */
export function getMobWalkColumnIndices(
  visual: MobVisualConfig,
  facing: Facing
): number[] {
  if (visual.type === "directionSheets") {
    return resolveDirectionSheetFacingLayout(visual, facing).walkFrames;
  }

  const limit = visual.walkColumnCountByFacing?.[facing];
  if (limit !== undefined && limit < visual.walkFrames.length) {
    return visual.walkFrames.slice(0, limit);
  }
  return visual.walkFrames;
}

export function getMobWalkFrameIndices(
  visual: MobVisualConfig,
  facing: Facing
): number[] {
  if (visual.type === "directionSheets") {
    return resolveDirectionSheetFacingLayout(visual, facing).walkFrames;
  }

  let rowFacing: Facing = facing;
  if (shouldMirrorRightFromLeft(visual) && facing === "right") {
    rowFacing = "left";
  }

  const row = getMobDirectionRow(visual, rowFacing);
  return getMobWalkColumnIndices(visual, facing).map((col) => row * visual.columns + col);
}

export function getMobIdleFrameIndex(
  visual: MobVisualConfig,
  facing: Facing
): number {
  if (visual.type === "directionSheets") {
    return resolveDirectionSheetFacingLayout(visual, facing).walkFrames[0] ?? 0;
  }

  if (visual.directionFrames) {
    return visual.directionFrames[facing] ?? 0;
  }

  let rowFacing: Facing = facing;
  if (shouldMirrorRightFromLeft(visual) && facing === "right") {
    rowFacing = "left";
  }

  const row = getMobDirectionRow(visual, rowFacing);
  const idleCol = visual.idleColumn ?? visual.walkFrames[0] ?? 0;
  return row * visual.columns + idleCol;
}

export function getMobSpriteFlipX(
  visual: MobVisualConfig,
  facing: Facing
): boolean {
  if (visual.type === "directionSheets") {
    return false;
  }
  return shouldMirrorRightFromLeft(visual) && facing === "right";
}
