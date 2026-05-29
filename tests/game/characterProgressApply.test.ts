import { describe, expect, it } from "vitest";
import { applySavedProgressToSceneState } from "../../src/scenes/gameSceneModules/characterProgressApply";
import type { SavedCharacterProgress } from "../../src/game/characterProgressStorage";

function baseProgress(
  overrides: Partial<SavedCharacterProgress> = {}
): SavedCharacterProgress {
  return {
    version: 1,
    mapId: "pueblo",
    tileX: 3,
    tileY: 4,
    facing: "up",
    inventory: Array(24).fill(null),
    equipment: { weapon: null, shield: null, helmet: null, armor: null },
    equippedOutfit: "base",
    playerProgress: {
      level: 2,
      exp: 0,
      expToNext: 100,
      hp: 50,
      hpMax: 100,
      mp: 25,
      mpMax: 50,
      gold: 10,
    },
    skillLevels: {
      magia: 0,
      armas: 0,
      escudos: 0,
      talar: 0,
      pesca: 0,
      mineria: 0,
    },
    learnedSpellIds: [1],
    macroBindings: [],
    killStats: { creaturesKilled: 0, criminalsKilled: 0, usersKilled: 0 },
    deathPhase: "ghost",
    useGhostAppearance: true,
    worldItemsByMap: {},
    ...overrides,
  };
}

describe("characterProgressApply", () => {
  it("applies map, vitals, and normalizes alive ghost flag", () => {
    let mapId = "";
    let deathPhase: string = "";
    let useGhost = true;

    applySavedProgressToSceneState({
      progress: baseProgress({ deathPhase: "alive", useGhostAppearance: true }),
      setMapPosition: (id, x, y, facing) => {
        mapId = `${id}:${x},${y}:${facing}`;
      },
      setInventory: () => undefined,
      setEquipment: () => undefined,
      setEquippedOutfit: () => undefined,
      clearEquippedArmorVisual: () => undefined,
      setPlayerProgress: () => undefined,
      setSkillLevels: () => undefined,
      setLearnedSpellIds: () => undefined,
      setMacroBindings: () => undefined,
      setKillStats: () => undefined,
      setDeathState: (phase, ghost) => {
        deathPhase = phase;
        useGhost = ghost;
      },
      onWorldItemsStorageReload: () => undefined,
    });

    expect(mapId).toBe("pueblo:3,4:up");
    expect(deathPhase).toBe("alive");
    expect(useGhost).toBe(false);
  });

  it("keeps ghost state from save", () => {
    let deathPhase = "alive";
    applySavedProgressToSceneState({
      progress: baseProgress(),
      setMapPosition: () => undefined,
      setInventory: () => undefined,
      setEquipment: () => undefined,
      setEquippedOutfit: () => undefined,
      clearEquippedArmorVisual: () => undefined,
      setPlayerProgress: () => undefined,
      setSkillLevels: () => undefined,
      setLearnedSpellIds: () => undefined,
      setMacroBindings: () => undefined,
      setKillStats: () => undefined,
      setDeathState: (phase) => {
        deathPhase = phase;
      },
      onWorldItemsStorageReload: () => undefined,
    });
    expect(deathPhase).toBe("ghost");
  });
});
