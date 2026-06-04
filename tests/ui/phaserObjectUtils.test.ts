import { describe, expect, it } from "vitest";
import { isPhaserObjectLive } from "../../src/ui/phaserObjectUtils";

describe("isPhaserObjectLive", () => {
  it("returns false for null/undefined", () => {
    expect(isPhaserObjectLive(null)).toBe(false);
    expect(isPhaserObjectLive(undefined)).toBe(false);
  });

  it("returns false when object is inactive", () => {
    expect(
      isPhaserObjectLive({
        active: false,
        scene: { sys: { isActive: () => true } },
      } as never)
    ).toBe(false);
  });

  it("returns false when scene is inactive", () => {
    expect(
      isPhaserObjectLive({
        active: true,
        scene: { sys: { isActive: () => false } },
      } as never)
    ).toBe(false);
  });

  it("returns true for active object in active scene", () => {
    expect(
      isPhaserObjectLive({
        active: true,
        scene: { sys: { isActive: () => true } },
      } as never)
    ).toBe(true);
  });
});
