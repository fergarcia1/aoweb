import Phaser from "phaser";
import { TILE_SIZE } from "../config";
import {
  ULLATHORPE_MAP_ID,
  ULLATHORPE_NEWBIE_PORTAL_TILE,
} from "../../shared/newbieDungeon";

export const PORTAL_ANIMATION_TEXTURE_KEY = "portal_animation";
export const PORTAL_ANIMATION_TEXTURE_PATH = "assets/ao/portalAnimation.png";
export const PORTAL_ANIMATION_ANIM_KEY = "portal_animation_loop";

/** Spritesheet 512×512: 8 frames en grilla 4 columnas × 2 filas. */
const PORTAL_SHEET_SIZE = 512;
const PORTAL_SHEET_COLUMNS = 4;
const PORTAL_SHEET_ROWS = 2;
const PORTAL_FRAME_WIDTH = PORTAL_SHEET_SIZE / PORTAL_SHEET_COLUMNS;
const PORTAL_FRAME_HEIGHT = PORTAL_SHEET_SIZE / PORTAL_SHEET_ROWS;
const PORTAL_FRAME_COUNT = PORTAL_SHEET_COLUMNS * PORTAL_SHEET_ROWS;
const PORTAL_FRAME_RATE = 8;
const PORTAL_DISPLAY_HEIGHT = Math.round(128 * 1.3);

export type MapPortalPlacement = {
  mapId: string;
  tileX: number;
  tileY: number;
};

/** Portales animados por mapa (extensible). */
export const MAP_PORTAL_PLACEMENTS: MapPortalPlacement[] = [
  {
    mapId: ULLATHORPE_MAP_ID,
    tileX: ULLATHORPE_NEWBIE_PORTAL_TILE.tileX,
    tileY: ULLATHORPE_NEWBIE_PORTAL_TILE.tileY,
  },
];

export function preloadPortalAnimationAssets(scene: Phaser.Scene): void {
  if (scene.textures.exists(PORTAL_ANIMATION_TEXTURE_KEY)) {
    return;
  }
  scene.load.spritesheet(PORTAL_ANIMATION_TEXTURE_KEY, PORTAL_ANIMATION_TEXTURE_PATH, {
    frameWidth: PORTAL_FRAME_WIDTH,
    frameHeight: PORTAL_FRAME_HEIGHT,
  });
}

export function registerPortalAnimations(scene: Phaser.Scene): void {
  if (scene.anims.exists(PORTAL_ANIMATION_ANIM_KEY)) {
    return;
  }
  if (!scene.textures.exists(PORTAL_ANIMATION_TEXTURE_KEY)) {
    return;
  }
  scene.anims.create({
    key: PORTAL_ANIMATION_ANIM_KEY,
    frames: scene.anims.generateFrameNumbers(PORTAL_ANIMATION_TEXTURE_KEY, {
      start: 0,
      end: PORTAL_FRAME_COUNT - 1,
    }),
    frameRate: PORTAL_FRAME_RATE,
    repeat: -1,
  });
}

export function spawnMapPortalSprites(
  scene: Phaser.Scene,
  mapId: string,
  depthFromFeetY: (feetY: number) => number
): Phaser.GameObjects.Sprite[] {
  const sprites: Phaser.GameObjects.Sprite[] = [];
  if (!scene.textures.exists(PORTAL_ANIMATION_TEXTURE_KEY)) {
    return sprites;
  }
  registerPortalAnimations(scene);

  for (const placement of MAP_PORTAL_PLACEMENTS) {
    if (placement.mapId !== mapId) {
      continue;
    }
    const feetX = placement.tileX * TILE_SIZE + TILE_SIZE / 2;
    const feetY = placement.tileY * TILE_SIZE + TILE_SIZE;
    const sprite = scene.add
      .sprite(feetX, feetY - 4, PORTAL_ANIMATION_TEXTURE_KEY, 0)
      .setOrigin(0.5, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(
        (PORTAL_DISPLAY_HEIGHT * PORTAL_FRAME_WIDTH) / PORTAL_FRAME_HEIGHT,
        PORTAL_DISPLAY_HEIGHT
      )
      .setDepth(depthFromFeetY(feetY));
    if (scene.anims.exists(PORTAL_ANIMATION_ANIM_KEY)) {
      sprite.play(PORTAL_ANIMATION_ANIM_KEY);
    }
    sprites.push(sprite);
  }

  return sprites;
}
