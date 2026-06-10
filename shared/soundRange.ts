import { tileDistanceChebyshev } from "./aoi";
import { SOUND_HEARING_RADIUS_TILES } from "./constants";

export function isWithinSoundHearingRange(
  listenerTileX: number,
  listenerTileY: number,
  sourceTileX: number,
  sourceTileY: number,
  radius: number = SOUND_HEARING_RADIUS_TILES
): boolean {
  return tileDistanceChebyshev(listenerTileX, listenerTileY, sourceTileX, sourceTileY) <= radius;
}
