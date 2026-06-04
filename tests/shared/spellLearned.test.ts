import { describe, expect, it } from "vitest";
import { isSpellLearnedByPlayer } from "../../shared/spellLearned";

describe("spellLearned", () => {
  it("detects learned spell ids", () => {
    const learned = new Set([1, 2, 11]);
    expect(isSpellLearnedByPlayer(1, learned)).toBe(true);
    expect(isSpellLearnedByPlayer(4, learned)).toBe(false);
  });
});
