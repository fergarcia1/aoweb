import { IMPORTED_OBJS } from "../../game-data/imported/objs_imported";
import type { GameMap } from "./types";

/**
 * En Imperium, objIndex 1 en el .csm = cartel con mensaje en objAmount (Carteles.dat).
 * No dibujar hasta resolver grh/texto por mensaje; el grh 26174 tiene «Rinkel» fijo.
 */
export const IMPERIUM_GENERIC_CARTEL_OBJ_INDEX = 1;

export type ImportedObjDef = (typeof IMPORTED_OBJS)[number];
export type LegacyMapObjPlacement = NonNullable<GameMap["legacyObjs"]>[number];

export type GrhIndexEntry = {
  grhId?: number;
  numFrames?: number;
  frames?: number[];
  fileNum?: number;
  sX?: number;
  sY?: number;
  pixelWidth?: number;
  pixelHeight?: number;
};

/** Resuelve definición de Obj.dat por índice del CSM (id), puerta abierta/cerrada o cartel genérico. */
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

/** Carteles genéricos del CSM (obj 1): mensaje en objAmount, gráfico variable — omitir por ahora. */
export function shouldSpawnLegacyCsmObj(placement: LegacyMapObjPlacement): boolean {
  return placement.objIndex !== IMPERIUM_GENERIC_CARTEL_OBJ_INDEX;
}

/** Grh a dibujar para un objIndex tal como viene del mapa (.csm). */
export function getLegacyObjGrhId(
  def: ImportedObjDef,
  mapObjIndex: number
): number {
  return def.grhIndex;
}

function resolveGrhFileNum(
  grhIndex: Record<string, GrhIndexEntry>,
  grhId: number
): number | null {
  if (grhId <= 0) {
    return null;
  }
  let grh = grhIndex[grhId];
  if (!grh) {
    return null;
  }
  if (grh.numFrames && grh.numFrames > 1 && grh.frames?.[0]) {
    grh = grhIndex[grh.frames[0]];
  }
  return grh?.fileNum ?? null;
}

/** FileNums de gráficos de legacyObjs para precargar junto al CSM. */
export function collectLegacyObjGrhFileNums(
  map: GameMap,
  grhIndex: Record<string, GrhIndexEntry>
): number[] {
  const nums = new Set<number>();
  const seenObj = new Set<number>();

  const addDefFileNums = (def: ImportedObjDef, mapObjIndex: number) => {
    const grhId = getLegacyObjGrhId(def, mapObjIndex);
    const fileNum = resolveGrhFileNum(grhIndex, grhId);
    if (fileNum) {
      nums.add(fileNum);
    }
    if (def.indexAbierta > 0) {
      const openFile = resolveGrhFileNum(grhIndex, def.grhIndex + 1);
      if (openFile) {
        nums.add(openFile);
      }
    }
  };

  for (const placement of map.legacyObjs ?? []) {
    if (!shouldSpawnLegacyCsmObj(placement)) {
      continue;
    }
    if (seenObj.has(placement.objIndex)) {
      continue;
    }
    seenObj.add(placement.objIndex);

    const def = resolveImportedObjDef(placement.objIndex);
    if (!def) {
      continue;
    }
    addDefFileNums(def, placement.objIndex);
  }

  return [...nums];
}
