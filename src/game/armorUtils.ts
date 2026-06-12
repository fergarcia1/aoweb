import {
  canRaceEquipArmor,
  isShortRace,
  SHORT_RACES,
} from "../../game-data/armorRules";

export { canRaceEquipArmor, isShortRace, SHORT_RACES };

/**
 * Detecta armadura para razas bajas por convención de nombre:
 * `*nombre*Bajos_std` en armors/ (ej. cueroBajos_std.png).
 */
export function inferClasesBajasFromSpritesheetName(nameOrPath: string): boolean {
  const baseName = nameOrPath.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "");
  return /Bajos/i.test(baseName);
}

/** Convierte texture key estándar a variante bajos (cuero_std → cueroBajos_std). */
export function armorBajosTextureKey(stdTextureKey: string): string {
  if (inferClasesBajasFromSpritesheetName(stdTextureKey)) {
    return stdTextureKey;
  }
  if (/_std$/i.test(stdTextureKey)) {
    return stdTextureKey.replace(/_std$/i, "Bajos_std");
  }
  return `${stdTextureKey}Bajos_std`;
}

/** Convierte ruta de asset estándar a variante bajos. */
export function inferBajosSpritesheetPath(stdAssetPath: string): string {
  if (inferClasesBajasFromSpritesheetName(stdAssetPath)) {
    return stdAssetPath;
  }
  return stdAssetPath.replace(/_std(\.[^./]+)$/i, "Bajos_std$1");
}

