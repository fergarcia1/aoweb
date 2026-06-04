import type { CharacterGenderId, CharacterRaceId } from "../../data/characters";
import { resolveNpcFaceAppearance } from "../../../game-data/imperium/npcCatalogFaceSeed";
import type {
  ImperiumNpcCatalogEntry,
  ImperiumNpcFaceAppearance,
  ImperiumNpcFaceRaceId,
} from "../../../game-data/imperium/npcCatalogTypes";
import type { ImperiumNpcBodySpriteConfig } from "./imperiumNpcVisual";

export type ImperiumNpcFaceConfig = {
  raceId: CharacterRaceId;
  genderId: CharacterGenderId;
  faceIndex: number;
  faceDropY: number;
  faceOffsetX: number;
};

const FACE_RACES = new Set<ImperiumNpcFaceRaceId>([
  "human",
  "elf",
  "drow",
  "dwarf",
  "gnome",
  "orc",
]);

export function isImperiumNpcFaceRaceId(value: string): value is ImperiumNpcFaceRaceId {
  return FACE_RACES.has(value as ImperiumNpcFaceRaceId);
}

export function catalogFaceToConfig(
  face: ImperiumNpcFaceAppearance
): ImperiumNpcFaceConfig | null {
  if (!isImperiumNpcFaceRaceId(face.raceId)) {
    return null;
  }
  const genderId: CharacterGenderId =
    face.genderId === "female" ? "female" : "male";
  return {
    raceId: face.raceId,
    genderId,
    faceIndex: Math.max(0, Math.min(10, Math.floor(face.faceIndex))),
    faceDropY: face.faceDropY ?? 8,
    faceOffsetX: face.faceOffsetX ?? 0,
  };
}

export function getCatalogEntryFace(
  entry: ImperiumNpcCatalogEntry
): ImperiumNpcFaceAppearance | null {
  return resolveNpcFaceAppearance(entry);
}

export function resolveImperiumNpcFaceConfig(
  entry: ImperiumNpcCatalogEntry,
  _bodyConfig: ImperiumNpcBodySpriteConfig
): ImperiumNpcFaceConfig | null {
  const appearance = getCatalogEntryFace(entry);
  if (!appearance) {
    return null;
  }
  return catalogFaceToConfig(appearance);
}
