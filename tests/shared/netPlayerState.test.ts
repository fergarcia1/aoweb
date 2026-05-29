import { describe, expect, it } from "vitest";
import {
  normalizeNetPlayerEquipment,
  normalizeNetPlayerState,
  normalizeWorldSnapshot,
} from "../../shared/types";

describe("normalizeNetPlayerState", () => {
  it("returns null without id", () => {
    expect(normalizeNetPlayerState({ name: "Test" })).toBeNull();
  });

  it("clamps hp and fills defaults", () => {
    const state = normalizeNetPlayerState({
      id: "p1",
      hp: 999,
      hpMax: 100,
      mp: -5,
      mpMax: 50,
      facing: "invalid" as "down",
    });
    expect(state).not.toBeNull();
    expect(state!.hp).toBe(100);
    expect(state!.mp).toBe(0);
    expect(state!.facing).toBe("down");
    expect(state!.equipment.equippedOutfit).toBe("base");
  });

  it("normalizes legacy imperial faction to ciudadano", () => {
    const state = normalizeNetPlayerState({
      id: "p1",
      factionId: "imperial",
    });
    expect(state!.factionId).toBe("ciudadano");
  });

  it("keeps caos faction", () => {
    const state = normalizeNetPlayerState({
      id: "p1",
      factionId: "caos",
    });
    expect(state!.factionId).toBe("caos");
  });
});

describe("normalizeNetPlayerEquipment", () => {
  it("trims ids and defaults outfit", () => {
    const eq = normalizeNetPlayerEquipment({
      weaponId: "  sword  ",
      equippedOutfit: "",
    });
    expect(eq.weaponId).toBe("sword");
    expect(eq.equippedOutfit).toBe("base");
  });
});

describe("normalizeWorldSnapshot", () => {
  it("filters invalid players", () => {
    const snap = normalizeWorldSnapshot({
      mapId: "pueblo",
      players: [{ id: "ok" }, { name: "no-id" }] as Parameters<typeof normalizeWorldSnapshot>[0]["players"],
      mobs: [],
    });
    expect(snap.players).toHaveLength(1);
    expect(snap.players[0]!.id).toBe("ok");
  });
});
