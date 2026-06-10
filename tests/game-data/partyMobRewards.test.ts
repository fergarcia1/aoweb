import { describe, expect, it } from "vitest";
import {
  PARTY_EXP_GROUP_BONUS,
  splitPartyMobExp,
  splitPartyMobGold,
} from "../../game-data/partyMobRewards";

describe("splitPartyMobExp", () => {
  it("da toda la exp sin bonus si hay un solo miembro", () => {
    expect(splitPartyMobExp(100, 1)).toEqual({
      sharePerMember: 100,
      hasGroupBonus: false,
    });
  });

  it("reparte equitativamente y aplica +15% con 2+ miembros", () => {
    const { sharePerMember, hasGroupBonus } = splitPartyMobExp(100, 2);
    expect(hasGroupBonus).toBe(true);
    expect(sharePerMember).toBe(Math.floor(Math.floor(100 / 2) * (1 + PARTY_EXP_GROUP_BONUS)));
  });

  it("reparte entre tres miembros con bonus", () => {
    const { sharePerMember } = splitPartyMobExp(90, 3);
    expect(sharePerMember).toBe(Math.floor(Math.floor(90 / 3) * (1 + PARTY_EXP_GROUP_BONUS)));
  });
});

describe("splitPartyMobGold", () => {
  it("reparte el oro en partes iguales", () => {
    expect(splitPartyMobGold(100, 2)).toBe(50);
    expect(splitPartyMobGold(101, 2)).toBe(50);
    expect(splitPartyMobGold(90, 3)).toBe(30);
  });
});
