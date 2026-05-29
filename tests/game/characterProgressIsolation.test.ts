import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteCharacterProgress,
  loadCharacterProgress,
  saveCharacterProgress,
  type SavedCharacterProgress,
} from "../../src/game/characterProgressStorage";

function makeSnapshot(
  characterId: string,
  overrides: Partial<SavedCharacterProgress> = {}
): SavedCharacterProgress {
  return {
    version: 1,
    mapId: "pueblo",
    tileX: 1,
    tileY: 2,
    facing: "down",
    inventory: Array(24).fill(null),
    equipment: { weapon: null, shield: null, helmet: null, armor: null },
    equippedOutfit: "base",
    playerProgress: {
      level: 1,
      exp: 0,
      expToNext: 100,
      hp: 100,
      hpMax: 100,
      mp: 50,
      mpMax: 50,
      gold: 100,
    },
    skillLevels: { magia: 0, armas: 0, escudos: 0, talar: 0, pesca: 0, mineria: 0 },
    learnedSpellIds: [],
    macroBindings: [],
    killStats: { creaturesKilled: 0, criminalsKilled: 0, usersKilled: 0 },
    deathPhase: "alive",
    useGhostAppearance: false,
    worldItemsByMap: {},
    ...overrides,
  };
}

describe("characterProgressIsolation", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores death state per character id", () => {
    saveCharacterProgress(
      "lonler-id",
      makeSnapshot("lonler-id", {
        deathPhase: "ghost_offer",
        useGhostAppearance: true,
        playerProgress: {
          level: 1,
          exp: 0,
          expToNext: 100,
          hp: 0,
          hpMax: 100,
          mp: 0,
          mpMax: 50,
          gold: 50,
        },
      })
    );
    saveCharacterProgress(
      "grok-id",
      makeSnapshot("grok-id", {
        deathPhase: "alive",
        playerProgress: {
          level: 1,
          exp: 0,
          expToNext: 100,
          hp: 100,
          hpMax: 100,
          mp: 50,
          mpMax: 50,
          gold: 200,
        },
      })
    );

    const lonler = loadCharacterProgress("lonler-id");
    const grok = loadCharacterProgress("grok-id");

    expect(lonler?.deathPhase).toBe("ghost_offer");
    expect(grok?.deathPhase).toBe("alive");
    expect(grok?.playerProgress.gold).toBe(200);
  });

  it("delete only removes one character save", () => {
    saveCharacterProgress("a", makeSnapshot("a"));
    saveCharacterProgress("b", makeSnapshot("b"));
    deleteCharacterProgress("a");
    expect(loadCharacterProgress("a")).toBeNull();
    expect(loadCharacterProgress("b")).not.toBeNull();
  });
});
