import { describe, expect, it } from "vitest";
import {
  canFactionsFight,
  canRenegade,
  FACTION_PROMOTION_USER_KILLS,
  getFactionPromotion,
  isHostileFaction,
  normalizeFactionId,
} from "../../shared/faction";

describe("normalizeFactionId", () => {
  it("maps known factions and legacy imperial", () => {
    expect(normalizeFactionId("caos")).toBe("caos");
    expect(normalizeFactionId("armada")).toBe("armada");
    expect(normalizeFactionId("renegado")).toBe("renegado");
    expect(normalizeFactionId("ciudadano")).toBe("ciudadano");
    expect(normalizeFactionId("imperial")).toBe("ciudadano");
    expect(normalizeFactionId(undefined)).toBe("ciudadano");
  });
});

describe("isHostileFaction", () => {
  it("treats caos and renegado as hostile", () => {
    expect(isHostileFaction("caos")).toBe(true);
    expect(isHostileFaction("renegado")).toBe(true);
    expect(isHostileFaction("ciudadano")).toBe(false);
    expect(isHostileFaction("armada")).toBe(false);
  });
});

describe("canRenegade", () => {
  it("only allows ciudadano to renegar", () => {
    expect(canRenegade("ciudadano")).toBe(true);
    expect(canRenegade("armada")).toBe(false);
    expect(canRenegade("caos")).toBe(false);
    expect(canRenegade("renegado")).toBe(false);
  });
});

describe("getFactionPromotion", () => {
  it("promotes renegado to caos and ciudadano to armada at 100 kills", () => {
    const below = FACTION_PROMOTION_USER_KILLS - 1;
    expect(getFactionPromotion("renegado", below)).toBeNull();
    expect(getFactionPromotion("ciudadano", below)).toBeNull();
    expect(getFactionPromotion("renegado", FACTION_PROMOTION_USER_KILLS)).toBe("caos");
    expect(getFactionPromotion("ciudadano", FACTION_PROMOTION_USER_KILLS)).toBe("armada");
    expect(getFactionPromotion("caos", FACTION_PROMOTION_USER_KILLS)).toBeNull();
    expect(getFactionPromotion("armada", FACTION_PROMOTION_USER_KILLS)).toBeNull();
  });
});

describe("canFactionsFight", () => {
  it("blocks ciudadano vs ciudadano", () => {
    expect(canFactionsFight("ciudadano", "ciudadano")).toBe(false);
  });

  it("allows caos to attack anyone", () => {
    expect(canFactionsFight("caos", "ciudadano")).toBe(true);
    expect(canFactionsFight("caos", "caos")).toBe(true);
  });

  it("allows renegado to attack like caos", () => {
    expect(canFactionsFight("renegado", "ciudadano")).toBe(true);
    expect(canFactionsFight("renegado", "armada")).toBe(true);
    expect(canFactionsFight("ciudadano", "renegado")).toBe(true);
  });

  it("allows ciudadano to attack caos", () => {
    expect(canFactionsFight("ciudadano", "caos")).toBe(true);
  });
});
