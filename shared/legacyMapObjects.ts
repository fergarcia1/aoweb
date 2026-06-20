import { IMPORTED_OBJS } from "../game-data/imported/objs_imported";
import type { GameMap } from "./mapTypes";

export const IMPERIUM_GENERIC_CARTEL_OBJ_INDEX = 1;

export type ImportedObjDef = (typeof IMPORTED_OBJS)[number];
export type LegacyMapObjPlacement = NonNullable<GameMap["legacyObjs"]>[number];

export function resolveImportedObjDef(objIndex: number): ImportedObjDef | null {
  const byId = IMPORTED_OBJS.find((o) => o.id === objIndex);
  if (byId) {
    return byId;
  }

  const byDoorState = IMPORTED_OBJS.find(
    (o) => o.indexAbierta === objIndex || o.indexCerrada === objIndex
  );
  if (byDoorState) {
    return byDoorState;
  }

  return null;
}

export function shouldSpawnLegacyCsmObj(placement: LegacyMapObjPlacement): boolean {
  return placement.objIndex !== IMPERIUM_GENERIC_CARTEL_OBJ_INDEX;
}

export function getLegacyObjGrhId(
  def: ImportedObjDef,
  mapObjIndex: number
): number {
  return def.grhIndex;
}
