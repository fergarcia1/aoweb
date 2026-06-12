import { describe, expect, it, vi } from "vitest";
import { GameSceneLocalPlayerSync } from "../../src/scenes/gameSceneModules/GameSceneLocalPlayerSync";

function createSyncHarness() {
  const calls = {
    setBuffs: [] as Array<{ strength: number; agility: number }>,
    setExpiresAt: [] as number[],
  };

  const sync = new GameSceneLocalPlayerSync({
    getLocalPlayerId: () => "p1",
    getPlayerName: () => "Hero",
    getCurrentMapId: () => "mapa1",
    updateRemotePlayer: vi.fn(),
    syncLocalVitalsFromServer: vi.fn(),
    setAttributeBuffsFromServer: (buffs) => {
      calls.setBuffs.push(buffs);
    },
    setAttributeBuffExpiresAt: (ms) => {
      calls.setExpiresAt.push(ms);
    },
    setInvisibleUntilMs: vi.fn(),
    setNavigatingFromServer: vi.fn(),
    setEquipmentFromServer: vi.fn(),
    applyLocalFaction: vi.fn(),
    getDeathPhase: () => "alive" as const,
    getPlayerProgress: () => ({
      level: 1,
      hp: 100,
      hpMax: 100,
      mp: 100,
      mpMax: 100,
      exp: 0,
      expToNext: 100,
      gold: 0,
    }),
    setPlayerProgressFromServer: vi.fn(),
    refreshHud: vi.fn(),
    isServerReviveSyncPending: () => false,
    clearServerReviveSyncPending: vi.fn(),
    setPlayerHp: vi.fn(),
    onLocalPlayerDeath: vi.fn(),
  });

  return { sync, calls };
}

describe("GameSceneLocalPlayerSync.syncLocalEphemeralStateFromServer", () => {
  it("no borra buffs si player_updated solo trae vitales", () => {
    const { sync, calls } = createSyncHarness();

    sync.syncLocalEphemeralStateFromServer({
      id: "p1",
      name: "Hero",
      mapId: "mapa1",
      tileX: 1,
      tileY: 2,
      facing: "down",
      raceId: "human",
      genderId: "male",
      classId: "mago",
      factionId: "imperial",
      faceIndex: 0,
      hp: 90,
      hpMax: 100,
      mp: 50,
      mpMax: 100,
      level: 10,
      role: "player",
      equipment: {},
      isMeditating: false,
      invisibleUntilMs: 0,
    });

    expect(calls.setBuffs).toHaveLength(0);
    expect(calls.setExpiresAt).toHaveLength(0);
  });

  it("aplica buffs cuando el servidor los envía con expiración futura", () => {
    const { sync, calls } = createSyncHarness();
    const expiresAt = Date.now() + 60_000;

    sync.syncLocalEphemeralStateFromServer({
      id: "p1",
      name: "Hero",
      mapId: "mapa1",
      tileX: 1,
      tileY: 2,
      facing: "down",
      raceId: "human",
      genderId: "male",
      classId: "mago",
      factionId: "imperial",
      faceIndex: 0,
      hp: 90,
      hpMax: 100,
      mp: 50,
      mpMax: 100,
      level: 10,
      role: "player",
      equipment: {},
      isMeditating: false,
      invisibleUntilMs: 0,
      attributeBuffs: { strength: 8, agility: 8 },
      buffExpiresAtMs: expiresAt,
    });

    expect(calls.setBuffs).toEqual([{ strength: 8, agility: 8 }]);
    expect(calls.setExpiresAt).toEqual([expiresAt]);
  });
});
