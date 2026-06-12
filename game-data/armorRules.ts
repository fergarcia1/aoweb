/** Enanos y gnomos usan armaduras con spritesheet *Bajos_std. */
export const SHORT_RACES = ["dwarf", "gnome"] as const;

export function isShortRace(raceId: string): boolean {
  return SHORT_RACES.includes(raceId as (typeof SHORT_RACES)[number]);
}

export function canRaceEquipArmor(
  raceId: string,
  clasesBajas: boolean,
  hasBajosSpritesheet = false
): { allowed: boolean; reason?: string } {
  const shortRace = isShortRace(raceId);
  if (shortRace && !clasesBajas) {
    if (hasBajosSpritesheet) {
      return { allowed: true };
    }
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
