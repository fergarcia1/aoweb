/** Facciones jugables: Ciudadanos (azul) y Caos (rojo). */
export type CharacterFactionId = "ciudadano" | "caos";

export const FACTION_LABELS: Record<CharacterFactionId, string> = {
  ciudadano: "Ciudadano",
  caos: "Caos",
};

/** Acepta guardados viejos con `imperial` como sinónimo de ciudadano. */
export function normalizeFactionId(value: unknown): CharacterFactionId {
  return value === "caos" ? "caos" : "ciudadano";
}

/** Ciudadanos no atacan ciudadanos; Caos puede atacar a cualquiera. */
export function canFactionsFight(
  attacker: CharacterFactionId,
  defender: CharacterFactionId
): boolean {
  if (attacker === "ciudadano" && defender === "ciudadano") {
    return false;
  }
  return true;
}
