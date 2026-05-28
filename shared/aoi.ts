import { AOI_RADIUS_TILES } from "./constants";

/** Distancia Chebyshev (rey en ajedrez) — coherente con tiles diagonales. */
export function tileDistanceChebyshev(
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

export function isInAoi(
  viewerTileX: number,
  viewerTileY: number,
  entityTileX: number,
  entityTileY: number,
  radius: number = AOI_RADIUS_TILES
): boolean {
  return tileDistanceChebyshev(viewerTileX, viewerTileY, entityTileX, entityTileY) <= radius;
}
