/** Facciones jugables. */
export type CharacterFactionId = "ciudadano" | "armada" | "caos" | "renegado";

export const FACTION_LABELS: Record<CharacterFactionId, string> = {
  ciudadano: "Imperial",
  armada: "Armada Real",
  caos: "Caos",
  renegado: "Renegado",
};

/** Asesinatos de usuarios para ascender de facción. */
export const FACTION_PROMOTION_USER_KILLS = 100;

export function normalizeFactionId(value: unknown): CharacterFactionId {
  if (value === "caos") return "caos";
  if (value === "armada") return "armada";
  if (value === "renegado") return "renegado";
  if (value === "imperial") return "ciudadano";
  return "ciudadano";
}

/** Caos y renegados pueden atacar a cualquiera (mismas normas hostiles). */
export function isHostileFaction(faction: CharacterFactionId): boolean {
  return faction === "caos" || faction === "renegado";
}

export function canRenegade(faction: CharacterFactionId): boolean {
  return faction === "ciudadano";
}

export function getFactionPromotion(
  faction: CharacterFactionId,
  usersKilled: number
): CharacterFactionId | null {
  if (usersKilled < FACTION_PROMOTION_USER_KILLS) {
    return null;
  }
  if (faction === "renegado") {
    return "caos";
  }
  if (faction === "ciudadano") {
    return "armada";
  }
  return null;
}

export function canFactionsFight(
  attacker: CharacterFactionId,
  defender: CharacterFactionId
): boolean {
  if (attacker === "ciudadano" && defender === "ciudadano") return false;
  if (attacker === "armada" && defender === "armada") return false;
  if (attacker === "armada" && defender === "ciudadano") return false;
  if (attacker === "ciudadano" && defender === "armada") return false;
  return true;
}
