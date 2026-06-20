import type { GameMap } from "./mapTypes";
import { resolveImportedObjDef } from "./legacyMapObjects";

export type LegacyDoorInteractionTile = {
  tileX: number;
  tileY: number;
};

function isLegacyDoorObj(objIndex: number): boolean {
  const def = resolveImportedObjDef(objIndex);
  return Boolean(def?.objType === 6 && (def.indexAbierta > 0 || def.indexCerrada > 0));
}

function containsDoorClickTile(
  doorTileX: number,
  doorTileY: number,
  clickTileX: number,
  clickTileY: number
): boolean {
  return (
    clickTileX >= doorTileX - 1 &&
    clickTileX <= doorTileX &&
    clickTileY >= doorTileY - 1 &&
    clickTileY <= doorTileY
  );
}

export function findLegacyDoorInteractionTile(
  map: GameMap,
  clickTileX: number,
  clickTileY: number
): LegacyDoorInteractionTile | null {
  for (const obj of map.legacyObjs ?? []) {
    if (!isLegacyDoorObj(obj.objIndex)) {
      continue;
    }
    if (containsDoorClickTile(obj.tileX, obj.tileY, clickTileX, clickTileY)) {
      return { tileX: obj.tileX, tileY: obj.tileY };
    }
  }
  return null;
}
