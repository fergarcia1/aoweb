import { describe, expect, it } from "vitest";
import { STEP_DURATION_MS } from "../../game-data/constants";
import {
  moveCooldownUntil,
  validateMoveDirection,
  validateMoveIntent,
} from "../../shared/multiplayerIntents";

describe("multiplayerIntents", () => {
  it("validates move directions", () => {
    expect(validateMoveDirection("up")).toBe(true);
    expect(validateMoveDirection("diagonal")).toBe(false);
  });

  it("enforces step cooldown", () => {
    const now = 1000;
    expect(validateMoveIntent(now, now + 50).ok).toBe(false);
    expect(validateMoveIntent(now, now).ok).toBe(true);
    expect(moveCooldownUntil(now)).toBe(now + STEP_DURATION_MS);
  });
});
