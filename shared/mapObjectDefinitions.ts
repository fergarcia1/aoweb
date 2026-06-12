/** Objetos de escenario (edificios prefabricados del export AO). */
export type MapObjectId = "edificio_kamal_prefab";

export type MapObjectDefinition = {
  textureKey: string;
  texturePath: string;
  widthPx: number;
  heightPx: number;
  /** Ancho del footprint en tiles (colisión). */
  footprintW: number;
  /** Alto del footprint en tiles (colisión). */
  footprintH: number;
};

export const MAP_OBJECT_DEFINITIONS: Record<MapObjectId, MapObjectDefinition> = {
  /** (KAMAL) Edificio1 — recorte de Graficos/5130.png (AO original). */
  edificio_kamal_prefab: {
    textureKey: "ao_building_edificio_kamal",
    texturePath: "/assets/ao/imperium/buildings/edificio_kamal_prefab.png",
    widthPx: 480,
    heightPx: 192,
    footprintW: 15,
    footprintH: 6,
  },
};

export function getMapObjectDefinition(objectId: MapObjectId): MapObjectDefinition {
  const def = MAP_OBJECT_DEFINITIONS[objectId];
  if (!def) {
    throw new Error(`Objeto de mapa desconocido: ${objectId}`);
  }
  return def;
}

import type { MapObjectPlacement } from "./mapTypes";
export function isTileBlockedByMapObject(objects: MapObjectPlacement[] | undefined, tileX: number, tileY: number): boolean {
  if (!objects) return false;
  return objects.some((placement) => {
    const def = getMapObjectDefinition(placement.objectId);
    const left = placement.tileX - Math.floor(def.footprintW / 2);
    const top = placement.tileY - def.footprintH + 1;
    const right = left + def.footprintW - 1;
    const bottom = top + def.footprintH - 1;
    return tileX >= left && tileX <= right && tileY >= top && tileY <= bottom;
  });
}
