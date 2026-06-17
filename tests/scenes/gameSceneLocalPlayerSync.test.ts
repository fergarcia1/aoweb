import { describe, expect, it, vi } from "vitest";
import { GameSceneLocalPlayerSync } from "../../src/scenes/gameSceneModules/GameSceneLocalPlayerSync";

function createSyncHarness() {
  const calls = {
    setBuffs: [] as Array<{ strength: number; agility: number }>,
    setExpiresAt: [] as number[],
    setPlayerHp: vi.fn(),
    onLocalPlayerDeath: vi.fn(),
    refreshHud: vi.fn(),
    setPlayerProgressFromServer: vi.fn(),
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
    getEquipment: () => ({ weapon: null, shield: null, helmet: null, armor: null }),
    syncEquippedArmorOutfit: vi.fn(),
    syncEquippedHeldItemVisuals: vi.fn(),
    setEquippedItemIdsOnUi: vi.fn(),
    refreshInventoryUi: vi.fn(),
    refreshInventorySlotsUi: vi.fn(),
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
    setPlayerProgressFromServer: calls.setPlayerProgressFromServer,
    refreshHud: calls.refreshHud,
    isServerReviveSyncPending: () => false,
    clearServerReviveSyncPending: vi.fn(),
    setPlayerHp: calls.setPlayerHp,
    onLocalPlayerDeath: calls.onLocalPlayerDeath,
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

describe("GameSceneLocalPlayerSync.handleServerPlayerUpdated", () => {
  it("dispara muerte local si el servidor confirma hp 0", () => {
    const { sync, calls } = createSyncHarness();

    sync.handleServerPlayerUpdated({
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
      hp: 0,
      hpMax: 100,
      mp: 50,
      mpMax: 100,
      level: 10,
      role: "player",
      equipment: {},
      isMeditating: false,
      invisibleUntilMs: 0,
    });

    expect(calls.setPlayerHp).toHaveBeenCalledWith(0);
    expect(calls.onLocalPlayerDeath).toHaveBeenCalledTimes(1);
    expect(calls.setPlayerProgressFromServer).toHaveBeenCalledWith({
      hp: 0,
      hpMax: 100,
      mp: 50,
      mpMax: 100,
      level: 10,
    });
    expect(calls.refreshHud).toHaveBeenCalled();
  });
});
