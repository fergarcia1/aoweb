import type { CharacterRaceId } from "../data/characters";

/** Enanos y gnomos usan armaduras con spritesheet *Bajos_std. */
export const SHORT_RACES: readonly CharacterRaceId[] = ["dwarf", "gnome"];

export function isShortRace(raceId: CharacterRaceId): boolean {
  return SHORT_RACES.includes(raceId);
}

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

export function canRaceEquipArmor(
  raceId: CharacterRaceId,
  clasesBajas: boolean
): { allowed: boolean; reason?: string } {
  const shortRace = isShortRace(raceId);
  if (shortRace && !clasesBajas) {
    return {
      allowed: false,
      reason: "Los enanos y gnomos solo pueden equipar armaduras para razas bajas.",
    };
  }
  if (!shortRace && clasesBajas) {
    return {
      allowed: false,
      reason: "Tu raza no puede equipar armaduras exclusivas de enanos o gnomos.",
    };
  }
  return { allowed: true };
}
