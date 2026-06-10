import { describe, expect, it } from "vitest";
import {
  EXP_TO_NEXT_BY_LEVEL,
  expRequiredForLevel,
} from "../../game-data/progressFormulas";

describe("expRequiredForLevel", () => {
  it("usa la tabla Imperium AO (nivel actual → exp para el siguiente)", () => {
    expect(EXP_TO_NEXT_BY_LEVEL).toHaveLength(49);
    expect(expRequiredForLevel(1)).toBe(20);
    expect(expRequiredForLevel(12)).toBe(740);
    expect(expRequiredForLevel(13)).toBe(1000);
    expect(expRequiredForLevel(49)).toBe(3888888);
  });

  it("clamp en nivel máximo", () => {
    expect(expRequiredForLevel(50)).toBe(3888888);
    expect(expRequiredForLevel(99)).toBe(3888888);
  });
});
