/** Bonus de EXP por miembro cuando hay 2+ jugadores del grupo en el mismo mapa. */
export const PARTY_EXP_GROUP_BONUS = 0.15;

export function splitPartyMobExp(
  totalExp: number,
  memberCount: number
): { sharePerMember: number; hasGroupBonus: boolean } {
  const safeTotal = Math.max(0, Math.floor(totalExp));
  const count = Math.max(1, Math.floor(memberCount));
  const baseShare = Math.floor(safeTotal / count);
  const hasGroupBonus = count >= 2;
  const sharePerMember = hasGroupBonus
    ? Math.floor(baseShare * (1 + PARTY_EXP_GROUP_BONUS))
    : baseShare;
  return { sharePerMember, hasGroupBonus };
}

export function splitPartyMobGold(totalGold: number, memberCount: number): number {
  const safeTotal = Math.max(0, Math.floor(totalGold));
  const count = Math.max(1, Math.floor(memberCount));
  return Math.floor(safeTotal / count);
}
