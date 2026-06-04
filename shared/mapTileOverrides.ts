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

export function setDoorTileOverride(
  overrides: Map<string, number>,
  tileX: number,
  tileY: number,
  isOpen: boolean
): void {
  overrides.set(mapTileOverrideKey(tileX, tileY), doorWalkabilityTile(isOpen));
}
