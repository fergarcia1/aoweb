import { describe, expect, it } from "vitest";
import { resolveGameScenePreloadContext } from "../../src/scenes/gameSceneModules/gameScenePreloadContext";
import { buildStarterLoadout } from "../../game-data/starterLoadout";

describe("resolveGameScenePreloadContext", () => {
  it("usa mapa inicial y equipo starter para personaje nuevo", () => {
    const context = resolveGameScenePreloadContext({
      characterId: null,
      homeMapId: "mapa1",
      classId: "paladin",
      raceId: "human",
    });

    const starter = buildStarterLoadout("paladin");

    expect(context.mapId).toBe("mapa1");
    expect(context.preloadMapIds.has("mapa1")).toBe(true);
    expect(context.preloadMapIds.has("mapa2")).toBe(true);
    expect(context.itemIds.has(starter.weaponItemId as never)).toBe(true);
    expect(context.itemIds.has(starter.armorItemId as never)).toBe(true);
    expect(context.mobModelIds.size).toBeGreaterThan(0);
  });

  it("no incluye todos los ítems del catálogo", () => {
    const context = resolveGameScenePreloadContext({
      characterId: null,
      homeMapId: "mapa1",
      classId: "guerrero",
      raceId: "human",
    });

    expect(context.itemIds.size).toBeLessThan(20);
  });
});
