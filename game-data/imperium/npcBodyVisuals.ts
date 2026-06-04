import bodyVisualsFile from "./npcBodyVisuals.json";
import type { ImperiumNpcVisualStatus } from "./npcCatalogTypes";

export type ImperiumBodyVisualReady = {
  status: "ready";
  bodyId: number;
  texturePath: string;
  textureKey: string;
  frameWidth: number;
  frameHeight: number;
  sheetCols: number;
  walkFrames: number[];
  directionRows: Record<"down" | "up" | "left" | "right", number>;
  headOffsetX: number;
  headOffsetY: number;
  walkGrhs: number[];
  mirrorRightFromLeft: boolean;
};

export type ImperiumBodyVisualFailed = {
  status: Exclude<ImperiumNpcVisualStatus, "ready" | "not_built" | "no_body">;
  bodyId: number;
  missingBmp?: number[];
};

export type ImperiumBodyVisualEntry = ImperiumBodyVisualReady | ImperiumBodyVisualFailed;

type BodyVisualsFile = {
  meta: {
    generatedAt: string;
    bodyCount: number;
    stats: Record<string, number>;
  };
  byBodyId: Record<string, ImperiumBodyVisualEntry>;
};

const file = bodyVisualsFile as BodyVisualsFile;

export const IMPERIUM_BODY_VISUALS_META = file.meta;

const byBodyId = new Map<number, ImperiumBodyVisualEntry>();
for (const [key, entry] of Object.entries(file.byBodyId)) {
  byBodyId.set(Number(key), entry);
}

export function getImperiumBodyVisual(bodyId: number): ImperiumBodyVisualEntry | undefined {
  if (!bodyId || bodyId <= 0) return undefined;
  return byBodyId.get(bodyId);
}

export function isImperiumBodyVisualReady(
  entry: ImperiumBodyVisualEntry | undefined
): entry is ImperiumBodyVisualReady {
  return entry?.status === "ready";
}

export function listReadyImperiumBodyVisuals(): ImperiumBodyVisualReady[] {
  return [...byBodyId.values()].filter(isImperiumBodyVisualReady);
}
