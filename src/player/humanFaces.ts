import Phaser from "phaser";
import type { Facing } from "./playerSprites";

export const HUMAN_FACE_TEXTURE_KEY = "human_faces";
const HUMAN_FACE_SHEET_PATH_NEW = "/assets/ao/razes/human_faces.png";

export const HUMAN_FACE_FRAME_W = 20;
export const HUMAN_FACE_FRAME_H = 32;
const FRAME_W = HUMAN_FACE_FRAME_W;
const FRAME_H = HUMAN_FACE_FRAME_H;

/** Estilos de cara = columnas del spritesheet (c1…c11). */
export const HUMAN_FACE_COUNT = 11;
const SHEET_COLS = HUMAN_FACE_COUNT;
const SHEET_ROWS = 4;

/**
 * Filas en human_faces.png (mismo criterio que el cuerpo STD):
 * f1 = S (sur), f2 = W (norte/espalda), f3 = A (oeste), f4 = D (este)
 */
const FACE_ROW_BY_FACING: Record<Facing, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
};

export function registerHumanFaces(scene: Phaser.Scene): void {
  scene.load.spritesheet(HUMAN_FACE_TEXTURE_KEY, HUMAN_FACE_SHEET_PATH_NEW, {
    frameWidth: FRAME_W,
    frameHeight: FRAME_H,
  });
}

export function setupHumanFacesTexture(scene: Phaser.Scene): void {
  const texture = scene.textures.get(HUMAN_FACE_TEXTURE_KEY);

  if (texture.key !== "__MISSING") {
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const source = texture.getSourceImage() as { width?: number; height?: number };
    const expectedW = SHEET_COLS * FRAME_W;
    const expectedH = SHEET_ROWS * FRAME_H;
    if (source.width !== expectedW || source.height !== expectedH) {
      console.warn(
        `[human_faces] Se esperaba ${expectedW}x${expectedH}, recibido ${source.width}x${source.height}.`
      );
    }
  }
}

/** Columna 0-based: cara 1 → 0, cara 2 → 1, … */
export function clampHumanFaceIndex(faceIndex: number): number {
  if (HUMAN_FACE_COUNT <= 0) return 0;
  const normalized = faceIndex % HUMAN_FACE_COUNT;
  return normalized < 0 ? normalized + HUMAN_FACE_COUNT : normalized;
}

/** Convierte número de cara (1-based) a índice de columna (0-based). */
export function caraToFaceColumnIndex(cara: number): number {
  return clampHumanFaceIndex(Math.floor(cara) - 1);
}

/**
 * Índice de frame Phaser: fila(dirección) × columnas + columna(cara).
 * Cara 1 = c1 → frames 0, 11, 22, 33 (f1…f4). Cara 2 = c2 → 1, 12, 23, 34, etc.
 */
export function getHumanFaceFrame(faceColumnIndex: number, facing: Facing): number {
  const column = clampHumanFaceIndex(faceColumnIndex);
  const row = FACE_ROW_BY_FACING[facing];
  return row * SHEET_COLS + column;
}

export function getHumanFaceFrameFromCara(cara: number, facing: Facing): number {
  return getHumanFaceFrame(caraToFaceColumnIndex(cara), facing);
}
