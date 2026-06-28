import { TILE } from "./tileTypes";

/** Estado local de tipo de tile por coordenada (`"tileX,tileY"` → TileId). */
export type MapTileOverrides = ReadonlyMap<string, number>;

export function mapTileOverrideKey(tileX: number, tileY: number): string {
  return `${tileX},${tileY}`;
}

export function getMapTileOverride(
  overrides: MapTileOverrides | undefined,
  tileX: number,
  tileY: number
): number | undefined {
  return overrides?.get(mapTileOverrideKey(tileX, tileY));
}

export function resolveMapTile(
  tiles: number[][],
  tileX: number,
  tileY: number,
  overrides?: MapTileOverrides
): number | undefined {
  const overridden = getMapTileOverride(overrides, tileX, tileY);
  if (overridden !== undefined) {
    return overridden;
  }
  return tiles[tileY]?.[tileX];
}

/** Tile de suelo para puerta abierta/cerrada (mismo criterio que Imperium Obj tipo 6). */
export function doorWalkabilityTile(isOpen: boolean): number {
  return isOpen ? TILE.GRASS : TILE.GRASS_BLOCKED;
}

const LINKED_LEGACY_DOOR_BASES: Record<string, string> = {
  // mapa1: templo y banco — hojas siempre se abren/cierran juntas
  "mapa1@76,54": "mapa1@78,54",
  "mapa1@78,54": "mapa1@76,54",
  "mapa1@76,68": "mapa1@78,68",
  "mapa1@78,68": "mapa1@76,68",
  // mapa34: templo de nix (puertas dobles)
  "mapa34@25,67": "mapa34@27,67",
  "mapa34@27,67": "mapa34@25,67",
  // mapa34: banco de nix (puertas dobles)
  "mapa34@20,48": "mapa34@22,48",
  "mapa34@22,48": "mapa34@20,48",
};

/** Puertas cuyo footprint es estrictamente de 1 tile (no afectan tiles adyacentes). */
const DOOR_FOOTPRINT_SINGLE: Set<string> = new Set([
  "mapa34@18,67", // Puerta simple de magia de Nix
]);

/** Puertas cuyo segundo tile de footprint está a la DERECHA (+1) en lugar de a la izquierda (-1). */
const DOOR_FOOTPRINT_RIGHT: Set<string> = new Set([
  // mapa1 — hoja izquierda de cada puerta doble
  "mapa1@76,54", "mapa1@76,68",
  // mapa34 - hoja izquierda del templo de nix y banco de nix
  "mapa34@25,67", "mapa34@20,48",
]);

/** Devuelve la coordenada del partner enlazado, si existe. */
export function getLinkedDoorPartner(mapId: string, tileX: number, tileY: number): { tileX: number; tileY: number } | null {
  const key = `${mapId}@${tileX},${tileY}`;
  const partnerKey = LINKED_LEGACY_DOOR_BASES[key];
  if (!partnerKey) return null;
  const coords = partnerKey.split("@")[1];
  if (!coords) return null;
  const [px, py] = coords.split(",").map(Number);
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
  return { tileX: px, tileY: py };
}

function setLegacyDoorFootprint(
  doorKey: string,
  overrides: Map<string, number>,
  tileX: number,
  tileY: number,
  value: number,
  modifiedKeys: string[]
): void {
  const k1 = mapTileOverrideKey(tileX, tileY);
  overrides.set(k1, value);
  modifiedKeys.push(k1);

  if (DOOR_FOOTPRINT_SINGLE.has(doorKey)) {
    return; // Solo afecta a 1 tile
  }

  const offset = DOOR_FOOTPRINT_RIGHT.has(doorKey) ? 1 : -1;
  const k2 = mapTileOverrideKey(tileX + offset, tileY);
  overrides.set(k2, value);
  modifiedKeys.push(k2);
}

export function setDoorTileOverride(
  mapId: string,
  overrides: Map<string, number>,
  tileX: number,
  tileY: number,
  isOpen: boolean
): string[] {
  const modifiedKeys: string[] = [];
  const key = `${mapId}@${tileX},${tileY}`;
  const val = doorWalkabilityTile(isOpen);
  
  setLegacyDoorFootprint(key, overrides, tileX, tileY, val, modifiedKeys);

  const partnerKey = LINKED_LEGACY_DOOR_BASES[key];
  if (partnerKey) {
    const coords = partnerKey.split("@")[1];
    if (coords) {
      const [partnerX, partnerY] = coords.split(",").map(Number);
      if (Number.isFinite(partnerX) && Number.isFinite(partnerY)) {
        setLegacyDoorFootprint(partnerKey, overrides, partnerX, partnerY, val, modifiedKeys);
      }
    }
  }

  return modifiedKeys;
}
