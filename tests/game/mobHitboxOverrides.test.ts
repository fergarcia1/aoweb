import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearMobHitboxOverrides,
  persistMobHitboxOverrideForDummy,
  resolveMobHitbox,
} from "../../src/scenes/gameSceneModules/mobHitboxOverrides";
import type { DummyState } from "../../src/scenes/gameSceneModules/types";

function mockLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  });
}

function fakeDummy(): DummyState {
  return {
    id: "aparicion_mapa1_1",
    spawnConfig: {
      id: "aparicion_mapa1_1",
      mobId: "aparicion",
      hitboxOffsetY: -32,
      hitboxHeightTiles: 2,
      hitboxWidthTiles: 1,
    },
    hitboxOffsetY: 0,
    hitboxHeightTiles: 2,
    hitboxWidthTiles: 1,
  } as DummyState;
}

describe("mobHitboxOverrides", () => {
  beforeEach(() => {
    mockLocalStorage();
    clearMobHitboxOverrides();
  });

  afterEach(() => {
    clearMobHitboxOverrides();
    vi.unstubAllGlobals();
  });

  it("respeta offsetY=0 aunque el default del mob sea negativo", () => {
    const dummy = fakeDummy();
    persistMobHitboxOverrideForDummy(dummy);
    const resolved = resolveMobHitbox({
      id: dummy.id,
      mobId: "aparicion",
      hitboxOffsetY: -32,
      hitboxHeightTiles: 2,
      hitboxWidthTiles: 1,
    });
    expect(resolved.hitboxOffsetY).toBe(0);
  });
});
