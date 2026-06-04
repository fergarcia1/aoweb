import Phaser from "phaser";
import type { CharacterGenderId, CharacterRaceId } from "../data/characters";
import type { Facing } from "./playerSprites";

import {
  FACE_SHEET_COLUMN_COUNT,
  caraToFaceColumnIndex,
  clampFaceColumnIndex,
} from "./faceColumn";

export const FACE_FRAME_W = 20;
export const FACE_FRAME_H = 32;
export const FACE_COUNT = FACE_SHEET_COLUMN_COUNT;

const FRAME_W = FACE_FRAME_W;
const FRAME_H = FACE_FRAME_H;
const SHEET_COLS = FACE_COUNT;
const SHEET_ROWS = 4;

const FACE_ROW_BY_FACING: Record<Facing, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
};

export function faceTextureKey(raceId: CharacterRaceId, genderId: CharacterGenderId): string {
  if (raceId === "fantasma") {
    return "fantasma_faces";
  }
  return `${raceId}_${genderId}_faces`;
}

function faceSheetPath(raceId: CharacterRaceId, genderId: CharacterGenderId): string {
  if (raceId === "fantasma") {
    return `/assets/ao/razes/fantasma_faces.png`;
  }
  return `/assets/ao/razes/${faceTextureKey(raceId, genderId)}.png`;
}

const ALL_RACE_GENDER: Array<{ raceId: CharacterRaceId; genderId: CharacterGenderId }> = [
  { raceId: "human", genderId: "male" },
  { raceId: "human", genderId: "female" },
  { raceId: "elf", genderId: "male" },
  { raceId: "elf", genderId: "female" },
  { raceId: "drow", genderId: "male" },
  { raceId: "drow", genderId: "female" },
  { raceId: "dwarf", genderId: "male" },
  { raceId: "dwarf", genderId: "female" },
  { raceId: "gnome", genderId: "male" },
  { raceId: "gnome", genderId: "female" },
  { raceId: "orc", genderId: "male" },
  { raceId: "orc", genderId: "female" },
  { raceId: "fantasma", genderId: "male" },
];

export function registerRaceFaces(scene: Phaser.Scene): void {
  for (const { raceId, genderId } of ALL_RACE_GENDER) {
    const key = faceTextureKey(raceId, genderId);
    scene.load.spritesheet(key, faceSheetPath(raceId, genderId), {
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
    });
  }
}

export function setupRaceFacesTextures(scene: Phaser.Scene): void {
  const expectedW = SHEET_COLS * FRAME_W;
  const expectedH = SHEET_ROWS * FRAME_H;

  for (const { raceId, genderId } of ALL_RACE_GENDER) {
    const key = faceTextureKey(raceId, genderId);
    const texture = scene.textures.get(key);
    if (texture.key === "__MISSING") continue;
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const source = texture.getSourceImage() as { width?: number; height?: number };
    if (source.width !== expectedW || source.height !== expectedH) {
      console.warn(
        `[${key}] Se esperaba ${expectedW}x${expectedH}, recibido ${source.width}x${source.height}.`
      );
    }
  }
}

export const clampFaceIndex = clampFaceColumnIndex;
export { caraToFaceColumnIndex };

export function getFaceFrame(
  raceId: CharacterRaceId,
  genderId: CharacterGenderId,
  faceColumnIndex: number,
  facing: Facing
): number {
  const column = clampFaceIndex(faceColumnIndex);
  const row = FACE_ROW_BY_FACING[facing];
  return row * SHEET_COLS + column;
}

export function getFaceFrameFromCara(
  raceId: CharacterRaceId,
  genderId: CharacterGenderId,
  cara: number,
  facing: Facing
): number {
  return getFaceFrame(raceId, genderId, caraToFaceColumnIndex(cara), facing);
}

export { resolveStaticNpcFaceColumn } from "./faceColumn";
