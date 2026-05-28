import type Phaser from "phaser";
import type { Facing } from "../player/playerSprites";
import type { EquipmentSlot, ItemDefinition, ItemId } from "../items/itemDefinitions";
import { getItemDefinition } from "../items/itemDefinitions";

/** Filas SWAD en hojas equipadas 192×192 (6×4 celdas de 32×48). */
const EQUIP_ROW_BY_FACING: Record<Facing, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
};

const DEFAULT_EQUIP_SHEET_COLS = 6;

const WEAPON_DEPTH_OFFSET = 0.015;

/** Ajuste fino del escudo equipado (pies del personaje = origen). */
export const SHIELD_OFFSET_BY_FACING: Record<Facing, { x: number; y: number }> = {
  down: { x: -6, y: -2 },
  up: { x: 6, y: -2 },
  left: { x: 4, y: -2 },
  right: { x: -4, y: -2 },
};

/** S/A: escudo delante del cuerpo; W/D: cuerpo delante. */
export const SHIELD_DEPTH_OFFSET_BY_FACING: Record<Facing, number> = {
  down: 0.012,
  up: -0.015,
  left: 0.018,
  right: -0.015,
};

/** Offset del casco respecto a los pies (misma convención que la cara: y se resta). */
export const HELMET_OFFSET_BY_FACING: Record<Facing, { x: number; y: number }> = {
  down: { x: -0.5, y: 44 },
  up: { x: -0.5, y: 42 },
  left: { x: 2, y: 43 },
  right: { x: -2, y: 43 },
};

/** Casco/gorro delante del cuerpo y sobre la cara en todas las direcciones. */
export const HELMET_DEPTH_OFFSET_BY_FACING: Record<Facing, number> = {
  down: 0.035,
  up: 0.035,
  left: 0.035,
  right: 0.035,
};

export type EquippedGearSyncContext = {
  player: Phaser.GameObjects.Sprite;
  facing: Facing;
  isMoving: boolean;
  useGhostAppearance: boolean;
  equipment: Record<EquipmentSlot, ItemId | null>;
  weaponSprite?: Phaser.GameObjects.Sprite;
  shieldSprite?: Phaser.GameObjects.Sprite;
  helmetSprite?: Phaser.GameObjects.Sprite;
  walkSwayX?: number;
  walkSwayY?: number;
};

function getEquippedSheetFacing(item: ItemDefinition, facing: Facing): Facing {
  const isProfile = facing === "left" || facing === "right";
  const mirrorRight = item.equippedMirrorRightFromLeft !== false;
  if (isProfile && facing === "right" && mirrorRight) {
    return "left";
  }
  return facing;
}

function getEquippedOverlayFlipX(item: ItemDefinition, facing: Facing): boolean {
  const mirrorRight = item.equippedMirrorRightFromLeft !== false;
  return facing === "right" && mirrorRight;
}

export function getPlayerHeadWalkSway(
  player: Phaser.GameObjects.Sprite,
  facing: Facing,
  isMoving: boolean
): { x: number; y: number } {
  if (!isMoving) {
    return { x: 0, y: 0 };
  }

  const anim = player.anims.currentAnim;
  const frame = player.anims.currentFrame;
  const frameTotal = Math.max(1, anim?.frames.length ?? 1);
  const rawFrameIndex = frame?.index ?? 0;
  const frameIndex = ((rawFrameIndex % frameTotal) + frameTotal) % frameTotal;
  const phase = (frameIndex / Math.max(1, frameTotal - 1)) * Math.PI * 2;

  if (facing === "left" || facing === "right") {
    return {
      x: Math.sin(phase) * 0.12,
      y: Math.abs(Math.sin(phase)) * 0.03,
    };
  }

  return {
    x: Math.sin(phase) * 0.08,
    y: Math.cos(phase) * 0.1,
  };
}

export function getEquippedDirectionalFrame(
  item: ItemDefinition,
  ctx: Pick<EquippedGearSyncContext, "player" | "facing" | "isMoving">
): number {
  const idleFrame = item.equippedIdleFrame ?? 0;
  const walkFrame = item.equippedWalkFrame ?? idleFrame;
  const hasDirectionalSheet =
    Boolean(item.equippedFrameWidth) && Boolean(item.equippedFrameHeight);

  if (!hasDirectionalSheet) {
    const bodyFrameIndex = ctx.player.anims.currentFrame?.index ?? 0;
    const useWalkFrame = ctx.isMoving && bodyFrameIndex % 2 === 1;
    return useWalkFrame ? walkFrame : idleFrame;
  }

  const sheetCols = item.equippedSheetCols ?? DEFAULT_EQUIP_SHEET_COLS;
  const sheetFacing = getEquippedSheetFacing(item, ctx.facing);
  const defaultWalkCols: Record<Facing, number> = {
    down: 6,
    up: 6,
    left: sheetCols,
    right: sheetCols,
  };
  const walkColCount =
    item.equippedWalkColumnsByFacing?.[sheetFacing] ?? defaultWalkCols[sheetFacing];
  const startCol = item.equippedWalkStartColByFacing?.[sheetFacing] ?? 0;

  let col = startCol;
  const animKey = ctx.player.anims.currentAnim?.key ?? "";
  if (ctx.isMoving && animKey.includes("walk")) {
    const step = ctx.player.anims.currentFrame?.index ?? 0;
    col = startCol + (step % walkColCount);
  }

  return EQUIP_ROW_BY_FACING[sheetFacing] * sheetCols + col;
}

export function syncEquippedWeaponVisual(ctx: EquippedGearSyncContext): void {
  const sprite = ctx.weaponSprite;
  if (!sprite) {
    return;
  }

  const equippedWeaponId = ctx.equipment.weapon;
  if (!equippedWeaponId || ctx.useGhostAppearance) {
    sprite.setVisible(false);
    return;
  }

  const weaponDef = getItemDefinition(equippedWeaponId);
  const weaponTexture = weaponDef.equippedTextureKey ?? weaponDef.textureKey;
  sprite.setTexture(weaponTexture);
  sprite.setFrame(getEquippedDirectionalFrame(weaponDef, ctx));
  sprite.setScale(weaponDef.equippedScale ?? 1);
  sprite.setPosition(ctx.player.x, ctx.player.y);
  sprite.setDepth(ctx.player.depth + WEAPON_DEPTH_OFFSET);
  sprite.setVisible(true);
  sprite.setFlipX(getEquippedOverlayFlipX(weaponDef, ctx.facing));
}

export function syncEquippedShieldVisual(ctx: EquippedGearSyncContext): void {
  const sprite = ctx.shieldSprite;
  if (!sprite) {
    return;
  }

  const equippedShieldId = ctx.equipment.shield;
  if (!equippedShieldId || ctx.useGhostAppearance) {
    sprite.setVisible(false);
    return;
  }

  const shieldDef = getItemDefinition(equippedShieldId);
  if (!shieldDef.equippedAssetPath) {
    sprite.setVisible(false);
    return;
  }

  const shieldTexture = shieldDef.equippedTextureKey ?? shieldDef.textureKey;
  sprite.setTexture(shieldTexture);
  sprite.setFrame(getEquippedDirectionalFrame(shieldDef, ctx));
  sprite.setScale(shieldDef.equippedScale ?? 1);
  const baseOffset = SHIELD_OFFSET_BY_FACING[ctx.facing];
  const facingAdjust = shieldDef.equippedOffsetByFacing?.[ctx.facing];
  sprite.setPosition(
    ctx.player.x + baseOffset.x + (facingAdjust?.x ?? 0),
    ctx.player.y + baseOffset.y + (facingAdjust?.y ?? 0)
  );
  sprite.setDepth(ctx.player.depth + SHIELD_DEPTH_OFFSET_BY_FACING[ctx.facing]);
  sprite.setVisible(true);
  sprite.setFlipX(getEquippedOverlayFlipX(shieldDef, ctx.facing));
}

export function syncEquippedHelmetVisual(ctx: EquippedGearSyncContext): void {
  const sprite = ctx.helmetSprite;
  if (!sprite) {
    return;
  }

  const equippedHelmetId = ctx.equipment.helmet;
  if (!equippedHelmetId || ctx.useGhostAppearance) {
    sprite.setVisible(false);
    return;
  }

  const helmetDef = getItemDefinition(equippedHelmetId);
  if (!helmetDef.equippedAssetPath) {
    sprite.setVisible(false);
    return;
  }

  const sway =
    ctx.walkSwayX !== undefined && ctx.walkSwayY !== undefined
      ? { x: ctx.walkSwayX, y: ctx.walkSwayY }
      : getPlayerHeadWalkSway(ctx.player, ctx.facing, ctx.isMoving);

  const helmetTexture = helmetDef.equippedTextureKey ?? helmetDef.textureKey;
  sprite.setTexture(helmetTexture);
  sprite.setFrame(getEquippedDirectionalFrame(helmetDef, ctx));
  sprite.setScale(helmetDef.equippedScale ?? 1);
  const baseOffset = HELMET_OFFSET_BY_FACING[ctx.facing];
  const facingAdjust = helmetDef.equippedOffsetByFacing?.[ctx.facing];
  sprite.setPosition(
    ctx.player.x + baseOffset.x + (facingAdjust?.x ?? 0) + sway.x,
    ctx.player.y - baseOffset.y + (facingAdjust?.y ?? 0) + sway.y
  );
  const depthAdjust = helmetDef.equippedDepthOffsetByFacing?.[ctx.facing] ?? 0;
  sprite.setDepth(
    ctx.player.depth + HELMET_DEPTH_OFFSET_BY_FACING[ctx.facing] + depthAdjust
  );
  sprite.setVisible(true);
  sprite.setFlipX(getEquippedOverlayFlipX(helmetDef, ctx.facing));
}

export function syncEquippedHeldItemVisuals(ctx: EquippedGearSyncContext): void {
  syncEquippedWeaponVisual(ctx);
  syncEquippedShieldVisual(ctx);
  syncEquippedHelmetVisual(ctx);
}

export function createEquippedOverlaySprite(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Sprite {
  const sprite = scene.add.sprite(x, y, "__MISSING");
  sprite.setOrigin(0.5, 1);
  sprite.setVisible(false);
  return sprite;
}
