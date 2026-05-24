import Phaser from "phaser";
import { TILE_SIZE } from "../config";

/** Spritesheet de terreno AO (renombrado desde 20.png). */
export const AO_TERRAIN_TEXTURE_KEY = "ao_terrain_20";

const TERRAIN_IMAGE_PATH = "/assets/ao/terrain/terrain.png";
const SHEET_COLS = 16;

/** Recorte de 1px para evitar líneas verdes entre tiles (bleeding del spritesheet). */
const TILE_INSET = 1;

/**
 * Frames del pasto en 20.png (Grh468–483).
 * Posición en el PNG: x 256–384, y 0–128 → columnas 8–11, filas 0–3.
 */
export const AO_GRASS_FRAMES = [
  8, 9, 10, 11,
  24, 25, 26, 27,
  40, 41, 42, 43,
  56, 57, 58, 59,
] as const;

/**
 * Frames de agua en 20.png (Grh1505–1520).
 * Bloque superior izquierdo: columnas 0–3, filas 0–3.
 */
export const AO_WATER_FRAMES = [
  0, 1, 2, 3,
  16, 17, 18, 19,
  32, 33, 34, 35,
  48, 49, 50, 51,
] as const;

/** Tile agua columna 2, fila 2 (índice 34 en el spritesheet). */
export const AO_WATER_FRAME_COL2_ROW2 = 34;

const insetFrameAliases = new Map<number, string>();

export function registerAoTerrain(scene: Phaser.Scene): void {
  scene.load.spritesheet(AO_TERRAIN_TEXTURE_KEY, TERRAIN_IMAGE_PATH, {
    frameWidth: TILE_SIZE,
    frameHeight: TILE_SIZE,
  });
}

function registerInsetFrame(texture: Phaser.Textures.Texture, frameIndex: number): string {
  const existing = insetFrameAliases.get(frameIndex);
  if (existing) {
    return existing;
  }

  const col = frameIndex % SHEET_COLS;
  const row = Math.floor(frameIndex / SHEET_COLS);
  const alias = `ao_inset_${frameIndex}`;

  texture.add(
    alias,
    0,
    col * TILE_SIZE + TILE_INSET,
    row * TILE_SIZE + TILE_INSET,
    TILE_SIZE - TILE_INSET * 2,
    TILE_SIZE - TILE_INSET * 2
  );

  insetFrameAliases.set(frameIndex, alias);
  return alias;
}

export function setupAoTerrainTexture(scene: Phaser.Scene): void {
  insetFrameAliases.clear();

  const texture = scene.textures.get(AO_TERRAIN_TEXTURE_KEY);
  if (texture.key === "__MISSING") {
    return;
  }

  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

  for (const frame of AO_GRASS_FRAMES) {
    registerInsetFrame(texture, frame);
  }

  for (const frame of AO_WATER_FRAMES) {
    registerInsetFrame(texture, frame);
  }
}

export function pickGrassFrame(tileX: number, tileY: number): number {
  const index = (tileX * 3 + tileY * 7) % AO_GRASS_FRAMES.length;
  return AO_GRASS_FRAMES[index];
}

export function pickWaterFrame(tileX: number, tileY: number): number {
  const index = (tileX * 5 + tileY * 11) % AO_WATER_FRAMES.length;
  return AO_WATER_FRAMES[index];
}

export function createTerrainTile(
  scene: Phaser.Scene,
  x: number,
  y: number,
  frameIndex: number
): Phaser.GameObjects.Image {
  const texture = scene.textures.get(AO_TERRAIN_TEXTURE_KEY);
  const frameName = registerInsetFrame(texture, frameIndex);
  const tile = scene.add.image(x, y, AO_TERRAIN_TEXTURE_KEY, frameName);
  tile.setOrigin(0, 0);
  tile.setDisplaySize(TILE_SIZE, TILE_SIZE);
  return tile;
}
