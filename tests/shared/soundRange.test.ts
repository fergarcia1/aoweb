import { describe, expect, it } from "vitest";
import { isWithinSoundHearingRange } from "../../shared/soundRange";

describe("isWithinSoundHearingRange", () => {
  it("permite oír dentro del radio", () => {
    expect(isWithinSoundHearingRange(20, 30, 25, 35, 15)).toBe(true);
    expect(isWithinSoundHearingRange(20, 30, 35, 45, 15)).toBe(true);
  });

  it("bloquea sonidos lejanos", () => {
    expect(isWithinSoundHearingRange(20, 30, 80, 80, 15)).toBe(false);
  });

  it("usa distancia Chebyshev en diagonal", () => {
    expect(isWithinSoundHearingRange(0, 0, 15, 15, 15)).toBe(true);
    expect(isWithinSoundHearingRange(0, 0, 16, 16, 15)).toBe(false);
  });
});
