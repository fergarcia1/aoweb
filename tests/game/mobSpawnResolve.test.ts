import { describe, expect, it } from "vitest";
import {
  inferMobIdFromSpawnId,
  resolveMobSpawnConfigForNetMob,
  shouldUseMobNpcBodiesArt,
} from "../../src/data/mobs";

describe("resolveMobSpawnConfigForNetMob", () => {
  it("resuelve lobo por id de spawn", () => {
    const spawn = resolveMobSpawnConfigForNetMob({
      id: "lobo_mapa2_1",
      mobId: "lobo",
      npcId: 133,
    });
    expect(spawn?.modelId).toBe("lobo");
    expect(spawn?.mobId).toBe("lobo");
  });

  it("infiere mobId cuando mobId llega igual al id (normalizeNetMobState)", () => {
    const spawn = resolveMobSpawnConfigForNetMob({
      id: "lobo_mapa2_1",
      mobId: "lobo_mapa2_1",
      npcId: 133,
    });
    expect(spawn?.modelId).toBe("lobo");
  });

  it("usa mobs/npc_bodies para criaturas, no catálogo BMP", () => {
    expect(
      shouldUseMobNpcBodiesArt({
        id: "lobo_mapa2_1",
        mobId: "lobo_mapa2_1",
        npcId: 133,
      })
    ).toBe(true);
  });

  it("inferMobIdFromSpawnId", () => {
    expect(inferMobIdFromSpawnId("goblin_mapa2_5")).toBe("goblin");
    expect(inferMobIdFromSpawnId("showcase_lobo")).toBeUndefined();
  });
});
