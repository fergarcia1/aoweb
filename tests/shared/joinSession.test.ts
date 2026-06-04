import { describe, expect, it } from "vitest";
import {
  applyJoinVitalsToSession,
  resolveJoinFallbackGold,
  resolveJoinGoldFromMessage,
  shouldApplyJoinBankFromClient,
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

describe("joinSession bank", () => {
  it("does not apply client bank when trustPersistedSnapshot is true", () => {
    expect(shouldApplyJoinBankFromClient(true)).toBe(false);
    expect(shouldApplyJoinBankFromClient(false)).toBe(true);
  });
});

describe("joinSession vitals", () => {
  it("keeps persisted hp/mp when trustPersistedSnapshot is true", () => {
    const session = { hp: 200, hpMax: 500, mp: 80, mpMax: 100 };
    applyJoinVitalsToSession(
      session,
      { hp: 500, hpMax: 500, mp: 100, mpMax: 100 },
      { trustPersistedSnapshot: true }
    );
    expect(session.hp).toBe(200);
    expect(session.mp).toBe(80);
    expect(session.hpMax).toBe(500);
  });

  it("applies client vitals on fresh join", () => {
    const session = { hp: 500, hpMax: 500, mp: 100, mpMax: 100 };
    applyJoinVitalsToSession(
      session,
      { hp: 200, hpMax: 500, mp: 40, mpMax: 100 },
      { trustPersistedSnapshot: false }
    );
    expect(session.hp).toBe(200);
    expect(session.mp).toBe(40);
  });
});
