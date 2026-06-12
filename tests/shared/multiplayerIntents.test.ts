import { describe, expect, it } from "vitest";
import { MECHANICS } from "../../shared/gameMechanics";
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
    expect(moveCooldownUntil(now)).toBe(now + MECHANICS.INTERVAL_MOVE_STEP);
  });
});
