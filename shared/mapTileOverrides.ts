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
  "76,54": "78,54",
  "78,54": "76,54",
  "76,68": "78,68",
  "78,68": "76,68",
};

function setLegacyDoorFootprint(
  overrides: Map<string, number>,
  tileX: number,
  tileY: number,
  value: number
): void {
  overrides.set(mapTileOverrideKey(tileX, tileY), value);
  // En los mapas legacy, la coordenada del obj de puerta suele ser la mitad derecha.
  // La mitad izquierda comparte estado de colision aunque no siempre venga en una tabla.
  overrides.set(mapTileOverrideKey(tileX - 1, tileY), value);
}

export function setDoorTileOverride(
  overrides: Map<string, number>,
  tileX: number,
  tileY: number,
  isOpen: boolean
): void {
  const key = mapTileOverrideKey(tileX, tileY);
  const val = doorWalkabilityTile(isOpen);
  setLegacyDoorFootprint(overrides, tileX, tileY, val);

  const partnerKey = LINKED_LEGACY_DOOR_BASES[key];
  if (partnerKey) {
    const [partnerX, partnerY] = partnerKey.split(",").map(Number);
    if (Number.isFinite(partnerX) && Number.isFinite(partnerY)) {
      setLegacyDoorFootprint(overrides, partnerX, partnerY, val);
    }
  }
}
