import { describe, expect, it } from "vitest";
import { canFactionsFight, normalizeFactionId } from "../../shared/faction";

describe("normalizeFactionId", () => {
  it("maps caos and legacy imperial", () => {
    expect(normalizeFactionId("caos")).toBe("caos");
    expect(normalizeFactionId("ciudadano")).toBe("ciudadano");
    expect(normalizeFactionId("imperial")).toBe("ciudadano");
    expect(normalizeFactionId(undefined)).toBe("ciudadano");
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

  it("allows ciudadano to attack caos", () => {
    expect(canFactionsFight("ciudadano", "caos")).toBe(true);
  });
});
