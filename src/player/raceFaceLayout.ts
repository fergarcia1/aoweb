import type { CharacterGenderId, CharacterRaceId } from "../data/characters";
import type { Facing } from "./playerSprites";

export type FaceLayout = {
  scale: number;
  offset: Record<Facing, { x: number; y: number }>;
};

const BASE_OFFSET = {
  down: { x: -0.5, y: 36 },
  up: { x: -0.5, y: 36 },
  left: { x: 2, y: 35 },
  right: { x: -2, y: 35 },
} as const;

function layout(
  scale: number,
  offsetY: number,
  offsetX = 0
): FaceLayout {
  return {
    scale,
    offset: {
      down: { x: BASE_OFFSET.down.x + offsetX, y: offsetY },
      up: { x: BASE_OFFSET.up.x + offsetX, y: offsetY },
      left: { x: BASE_OFFSET.left.x + offsetX, y: offsetY - 1 },
      right: { x: BASE_OFFSET.right.x + offsetX, y: offsetY - 1 },
    },
  };
}

/** Ajuste por raza/sexo: cuello más bajo en el sprite → offsetY menor. */
const RACE_FACE_LAYOUT: Record<string, FaceLayout> = {
  human_male: layout(0.75, 36),
  human_female: layout(0.75, 36),
  elf_male: layout(0.75, 35),
  elf_female: layout(0.75, 35),
  drow_male: layout(0.75, 35),
  drow_female: layout(0.75, 35),
  dwarf_male: {
    scale: 0.78,
    offset: {
      down: { x: -0.5, y: 23 },
      up: { x: -0.5, y: 26 },
      left: { x: 2, y: 26 },
      right: { x: -1, y: 26 },
    },
  },
  dwarf_female: {
    scale: 0.78,
    offset: {
      down: { x: -0.5, y: 27 },
      up: { x: -0.5, y: 32 },
      left: { x: 2, y: 31 },
      right: { x: -2, y: 31 },
    },
  },
  gnome_male: layout(0.75, 27),
  gnome_female: layout(0.75, 27),
  orc_male: layout(0.82, 39),
  orc_female: layout(0.82, 39),
  fantasma_male: {
    scale: 0.75,
    offset: {
      down: { x: -1.5, y: 30 },
      up: { x: -0.5, y: 28 },
      left: { x: 0, y: 31 },
      right: { x: 0, y: 30 },
    },
  },
  fantasma_female: {
    scale: 0.75,
    offset: {
      down: { x: -1.5, y: 30 },
      up: { x: -0.5, y: 28 },
      left: { x: 0, y: 31 },
      right: { x: 0, y: 30 },
    },
  },
};

export function getRaceFaceLayout(
  raceId: CharacterRaceId,
  genderId: CharacterGenderId
): FaceLayout {
  return RACE_FACE_LAYOUT[`${raceId}_${genderId}`] ?? layout(0.75, 36);
}
