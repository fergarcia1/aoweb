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

  it("conserva la regla acuatica al resolver mobs sin spawn explicito", () => {
    const spawn = resolveMobSpawnConfigForNetMob({
      id: "sirena_showcase_1",
      mobId: "sirena",
      npcId: 644,
      mapId: "mapa61",
    });
    expect(spawn?.modelId).toBe("sirena");
    expect(spawn?.aquatic).toBe(true);
  });

  it("mantiene la configuracion caster de la bruja", () => {
    const spawn = resolveMobSpawnConfigForNetMob({
      id: "bruja_drow_mapa2_1",
      mobId: "bruja_drow",
      npcId: 550,
      mapId: "mapa2",
    });

    expect(spawn?.caster).toEqual({
      spellId: 36,
      cooldownMs: 5000,
      minDamage: 45,
      maxDamage: 75,
    });
  });
});
