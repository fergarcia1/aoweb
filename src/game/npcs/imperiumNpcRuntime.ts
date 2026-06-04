/**
 * Utilidades runtime para mobs del catálogo Imperium (npcId numérico).
 * Paralelo a mobVisualRuntime.ts, pero opera con ImperiumNpcBodySpriteConfig
 * en lugar de MobModelId.
 */
import type Phaser from "phaser";
import { STEP_DURATION_MS } from "../../config";
import type { Facing } from "../../player/playerSprites";
import type { ImperiumNpcBodySpriteConfig } from "./imperiumNpcVisual";

/** Clave de animación de caminata para un NPC del catálogo. */
export function imperiumNpcWalkAnimKey(npcId: number, facing: Facing): string {
  return `imperium_npc_${npcId}_walk_${facing}`;
}

/**
 * Devuelve el índice de frame idle para la dirección dada,
 * usando la primera columna de walk como idle (convención AO).
 */
function getIdleFrame(config: ImperiumNpcBodySpriteConfig, facing: Facing): number {
  const row = config.directionRows[facing];
  const col = config.idleColumn;
  return row * config.sheetCols + col;
}

/**
 * Devuelve los índices de frame de caminata para la dirección dada.
 */
function getWalkFrames(config: ImperiumNpcBodySpriteConfig, facing: Facing): number[] {
  const row = config.directionRows[facing];
  return config.walkFrames.map((col) => row * config.sheetCols + col);
}

/** Devuelve si el sprite debe estar volteado horizontalmente para esta dirección. */
function getSpriteFlipX(config: ImperiumNpcBodySpriteConfig, facing: Facing): boolean {
  if (config.mirrorRightFromLeft) {
    return facing === "right";
  }
  return false;
}

/** Aplica facing (frame + flipX) a un sprite de NPC del catálogo. */
export function applyImperiumNpcFacing(
  sprite: Phaser.GameObjects.Sprite,
  config: ImperiumNpcBodySpriteConfig,
  facing: Facing
): void {
  const frame = getIdleFrame(config, facing);
  sprite.setFrame(frame);
  sprite.setFlipX(getSpriteFlipX(config, facing));
}

/** Registra las animaciones de caminata para un NPC del catálogo (si no existen). */
export function registerImperiumNpcWalkAnims(
  scene: Phaser.Scene,
  npcId: number,
  config: ImperiumNpcBodySpriteConfig
): void {
  const facings: Facing[] = ["down", "up", "left", "right"];
  const stepSeconds = Math.ceil(STEP_DURATION_MS / config.moveSpeedRatio) / 1000;
  const walkCount = config.walkFrames.length;
  const frameRate = Math.max(1, (walkCount / stepSeconds) * config.walkFrameRateScale);

  const texture = scene.textures.get(config.textureKey);
  if (!texture || texture.key === "__MISSING") {
    return;
  }
  const maxFrame = texture.frameTotal - 1;

  for (const facing of facings) {
    const animKey = imperiumNpcWalkAnimKey(npcId, facing);
    if (scene.anims.exists(animKey)) {
      continue;
    }

    // Para mirrorRightFromLeft usamos la fila de "left" también para "right"
    const effectiveFacing =
      config.mirrorRightFromLeft && facing === "right" ? "left" : facing;
    const frames = getWalkFrames(config, effectiveFacing).filter(
      (f) => f >= 0 && f <= maxFrame
    );
    if (frames.length === 0) continue;

    scene.anims.create({
      key: animKey,
      frames: frames.map((frame) => ({ key: config.textureKey, frame })),
      frameRate: Math.round(frameRate),
      repeat: -1,
    });
  }
}

/** Crea un sprite Phaser para un NPC del catálogo. */
export function createImperiumNpcSpriteFromConfig(
  scene: Phaser.Scene,
  config: ImperiumNpcBodySpriteConfig,
  worldX: number,
  worldY: number,
  facing: Facing = "down"
): Phaser.GameObjects.Sprite {
  const frame = getIdleFrame(config, facing);
  const sprite = scene.add.sprite(worldX, worldY, config.textureKey, frame);
  sprite.setOrigin(0.5, 1);
  sprite.setScale(config.scale);
  sprite.setFlipX(getSpriteFlipX(config, facing));
  return sprite;
}

/** Reproduce la animación de caminata de un NPC del catálogo. */
export function playImperiumNpcWalkAnim(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  npcId: number,
  config: ImperiumNpcBodySpriteConfig,
  facing: Facing
): void {
  sprite.setFlipX(getSpriteFlipX(config, facing));
  const key = imperiumNpcWalkAnimKey(npcId, facing);
  if (scene.anims.exists(key)) {
    if (sprite.anims.currentAnim?.key === key) {
      sprite.anims.restart();
    } else {
      sprite.play(key);
    }
    return;
  }
  // Fallback: frame idle
  applyImperiumNpcFacing(sprite, config, facing);
}

/** Detiene animación y pone el frame idle del NPC del catálogo. */
export function playImperiumNpcIdleFrame(
  sprite: Phaser.GameObjects.Sprite,
  config: ImperiumNpcBodySpriteConfig,
  facing: Facing
): void {
  sprite.anims.stop();
  applyImperiumNpcFacing(sprite, config, facing);
}
