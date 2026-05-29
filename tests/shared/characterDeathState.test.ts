import { describe, expect, it } from "vitest";
import {
  deathStateFromSavedProgress,
  freshDeathStateForCharacterSwitch,
  isDeadOrGhost,
} from "../../shared/characterDeathState";

describe("characterDeathState", () => {
  it("clears ghost flag when saved phase is alive", () => {
    expect(deathStateFromSavedProgress("alive", true)).toEqual({
      deathPhase: "alive",
      useGhostAppearance: false,
    });
  });

  it("preserves ghost state from save", () => {
    expect(deathStateFromSavedProgress("ghost_offer", false)).toEqual({
      deathPhase: "ghost_offer",
      useGhostAppearance: false,
    });
    expect(deathStateFromSavedProgress("ghost", true)).toEqual({
      deathPhase: "ghost",
      useGhostAppearance: true,
    });
  });

  it("fresh character after slot switch is always alive", () => {
    const state = freshDeathStateForCharacterSwitch();
    expect(state.deathPhase).toBe("alive");
    expect(isDeadOrGhost(state)).toBe(false);
  });
});
