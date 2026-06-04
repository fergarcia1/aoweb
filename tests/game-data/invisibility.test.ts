import { describe, expect, it } from "vitest";
import {
  getInvisibilityAlpha,
  INVISIBILITY_DURATION_MS,
  INVISIBILITY_PARTIAL_ALPHA,
  INVISIBILITY_YOYO_CYCLE_MS,
} from "../../game-data/invisibility";

describe("invisibility alpha yoyo", () => {
  const until = 10_000;
  const startedAt = until - INVISIBILITY_DURATION_MS;

  it("returns 1 when effect expired", () => {
    expect(getInvisibilityAlpha(until + 1, until)).toBe(1);
    expect(getInvisibilityAlpha(0, 0)).toBe(1);
  });

  it("starts and ends each cycle at full invisibility", () => {
    expect(getInvisibilityAlpha(startedAt, until)).toBe(0);
    expect(
      getInvisibilityAlpha(startedAt + INVISIBILITY_YOYO_CYCLE_MS, until)
    ).toBe(0);
  });

  it("peaks at partial alpha mid-cycle", () => {
    const mid = startedAt + INVISIBILITY_YOYO_CYCLE_MS / 2;
    const alpha = getInvisibilityAlpha(mid, until);
    expect(alpha).toBeCloseTo(INVISIBILITY_PARTIAL_ALPHA, 5);
  });

  it("is continuous across cycle boundary (no jump)", () => {
    const end = startedAt + INVISIBILITY_YOYO_CYCLE_MS - 1;
    const startNext = startedAt + INVISIBILITY_YOYO_CYCLE_MS;
    expect(getInvisibilityAlpha(end, until)).toBeCloseTo(
      getInvisibilityAlpha(startNext, until),
      5
    );
  });

  it("ramps smoothly between endpoints", () => {
    const quarter = startedAt + INVISIBILITY_YOYO_CYCLE_MS / 4;
    const alpha = getInvisibilityAlpha(quarter, until);
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThan(INVISIBILITY_PARTIAL_ALPHA);
  });
});
