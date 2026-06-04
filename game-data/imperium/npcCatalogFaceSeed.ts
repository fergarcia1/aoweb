import type { ImperiumBodyVisualEntry, ImperiumBodyVisualReady } from "./npcBodyVisuals";
import type {
  ImperiumNpcCatalogEntry,
  ImperiumNpcFaceAppearance,
} from "./npcCatalogTypes";
import { getImperiumBodyVisual } from "./npcBodyVisuals";
import { isImperiumBodyVisualReady } from "./npcBodyVisuals";

const RACES = ["human", "elf", "drow", "dwarf", "gnome", "orc"] as const;
const GENDERS = ["male", "female"] as const;
const FACE_COUNT = 11;
const MIN_FRAME_H_FOR_FACE = 28;

function seededIndex(seed: number, salt: number, modulo: number): number {
  const h = (seed * 2654435761 + salt * 1597334677) >>> 0;
  return modulo > 0 ? h % modulo : 0;
}

function shouldAssignFace(
  entry: ImperiumNpcCatalogEntry,
  bodyVisual: ImperiumBodyVisualEntry | undefined
): bodyVisual is ImperiumBodyVisualReady {
  if (entry.visual?.status !== "ready") {
    return false;
  }
  if (!isImperiumBodyVisualReady(bodyVisual)) {
    return false;
  }
  const h = bodyVisual.frameHeight;
  if (h > 0 && h < MIN_FRAME_H_FOR_FACE) {
    return false;
  }
  return true;
}

/** Cara estable por npcId (misma lógica que tools/ao-export/assign-npc-catalog-heads.mjs). */
export function buildSeededNpcFaceAppearance(
  entry: ImperiumNpcCatalogEntry
): ImperiumNpcFaceAppearance | null {
  const bodyVisual = getImperiumBodyVisual(entry.body);
  if (!shouldAssignFace(entry, bodyVisual)) {
    return null;
  }

  const raceId = RACES[seededIndex(entry.npcId, 11, RACES.length)];
  const genderId = GENDERS[seededIndex(entry.npcId, 22, GENDERS.length)];
  const faceIndex = seededIndex(entry.npcId, 33, FACE_COUNT);
  const headOffsetY = bodyVisual.headOffsetY;
  const headOffsetX = bodyVisual.headOffsetX;
  const frameH = bodyVisual.frameHeight;

  return {
    raceId,
    genderId,
    faceIndex,
    faceDropY: Math.round(headOffsetY * 0.4) + (frameH <= 36 ? 10 : 6),
    faceOffsetX: Math.round(headOffsetX * 0.25),
    source: "random_seeded",
  };
}

export function resolveNpcFaceAppearance(
  entry: ImperiumNpcCatalogEntry
): ImperiumNpcFaceAppearance | null {
  const stored = entry.visual?.face;
  if (stored && typeof stored === "object") {
    return stored;
  }
  return buildSeededNpcFaceAppearance(entry);
}
