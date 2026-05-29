import { describe, expect, it } from "vitest";
import { shouldApplyScheduledPersist } from "../../shared/progressPersistGuard";

describe("progressPersistGuard", () => {
  it("allows persist when character id unchanged", () => {
    expect(shouldApplyScheduledPersist("char-a", "char-a")).toBe(true);
  });

  it("blocks persist after character switch", () => {
    expect(shouldApplyScheduledPersist("char-lonler", "char-grok")).toBe(false);
    expect(shouldApplyScheduledPersist("char-a", null)).toBe(false);
  });
});
