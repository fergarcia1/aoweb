import { describe, expect, it } from "vitest";
import {
  resolveJoinFallbackGold,
  resolveJoinGoldFromMessage,
} from "../../shared/joinSession";

describe("joinSession gold", () => {
  it("uses client gold when valid on join override", () => {
    expect(resolveJoinGoldFromMessage(500, 0)).toBe(500);
    expect(resolveJoinGoldFromMessage(99.7, 10)).toBe(99);
  });

  it("keeps session gold when join message omits gold", () => {
    expect(resolveJoinGoldFromMessage(undefined, 1200)).toBe(1200);
    expect(resolveJoinGoldFromMessage(NaN, 50)).toBe(50);
  });

  it("fallback join uses 0 without client gold", () => {
    expect(resolveJoinFallbackGold(undefined)).toBe(0);
    expect(resolveJoinFallbackGold(250)).toBe(250);
  });
});
