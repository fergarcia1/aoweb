import type { CharacterRaceId } from "../data/characters";
import { isShortRace } from "../game/armorUtils";

/** Alto visible objetivo (bbox opaco, frame idle abajo) para humanos/elfos. */
const TARGET_HEIGHT_NORMAL_PX = 38;

/** Alto visible objetivo para razas bajas (gnomo, enano). */
const TARGET_HEIGHT_SHORT_PX = 32;

/** Alto opaco del frame idle (fila S, col 0) en spritesheets 32×48. */
const TEXTURE_OPAQUE_HEIGHT_PX: Record<string, number> = {
  tunicaSacerdote_std: 27,
  atuendoBanquero_std: 37,
  cueroBajos_std: 28,
  placas_std: 40,
  placasDoradas_std: 40,
  ropaEleganteBajos_std: 25,
  citizenClothesBajos_std: 30,
};

export function getStaticNpcBodyScale(
  textureKey: string,
  raceId: CharacterRaceId
): number {
  const opaqueHeight = TEXTURE_OPAQUE_HEIGHT_PX[textureKey];
  if (!opaqueHeight) {
    return 1;
  }
  const target = isShortRace(raceId)
    ? TARGET_HEIGHT_SHORT_PX
    : TARGET_HEIGHT_NORMAL_PX;
  return Math.round((target / opaqueHeight) * 100) / 100;
}
