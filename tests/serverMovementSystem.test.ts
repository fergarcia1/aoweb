import { describe, expect, it, vi } from "vitest";
import { PlayerSession } from "../server/src/PlayerSession";
import { MovementSystem } from "../server/src/systems/MovementSystem";
import type { WorldContext } from "../server/src/systems/WorldContext";
import { isMapTileWalkable } from "../shared/mapWalkability";
import { getMap } from "../shared/maps";
import type { MapTransition } from "../shared/mapTypes";

function createSession(id: string, name: string): PlayerSession {
  const session = new PlayerSession(id, {} as any);
  session.joined = true;
  session.name = name;
  session.mapId = "mapa2";
  session.tileX = 10;
  session.tileY = 10;
  session.hp = session.hpMax;
  return session;
}

function findWalkableTileWithFreeNeighbor(mapId: string): { tileX: number; tileY: number } {
  const map = getMap(mapId);
  for (let y = 1; y < map.height - 1; y++) {
    for (let x = 1; x < map.width - 1; x++) {
      if (!isMapTileWalkable(mapId, x, y)) continue;
      const hasFreeNeighbor = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => isMapTileWalkable(mapId, x + dx, y + dy));
      if (hasFreeNeighbor) {
        return { tileX: x, tileY: y };
      }
    }
  }
  throw new Error(`No walkable test tile found for ${mapId}`);
}

function createFakeWorld(players: Map<string, PlayerSession>): WorldContext {
  return {
    getPlayers: () => players,
    getMobs: () => new Map(),
    getMapTileOverrides: () => undefined,
    getDynamicMapObjs: () => undefined,
    send: vi.fn(),
    sendCombatLog: vi.fn(),
    schedulePersistSessionDebounced: vi.fn(),
    broadcastToAoi: vi.fn(),
    buildWorldSnapshot: (mapId: string) => ({
      tick: 0,
      mapId,
      players: [...players.values()]
        .filter((player) => player.joined && player.mapId === mapId)
        .map((player) => player.toNetState()),
      mobs: [],
      worldItems: [],
    }),
    isTileOccupied: (tileX, tileY, mapId, exceptPlayerId) =>
      [...players.values()].some(
        (player) =>
          player.joined &&
          player.id !== exceptPlayerId &&
          player.mapId === mapId &&
          player.tileX === tileX &&
          player.tileY === tileY
      ),
  } as unknown as WorldContext;
}

describe("MovementSystem", () => {
  it("reubica al jugador a un tile vecino si el destino del portal esta ocupado", () => {
    const entryTile = findWalkableTileWithFreeNeighbor("mapa1");
    const traveler = createSession("player-1", "Viajero");
    const blocker = createSession("player-2", "Bloqueador");
    blocker.mapId = "mapa1";
    blocker.tileX = entryTile.tileX;
    blocker.tileY = entryTile.tileY;

    const players = new Map([
      [traveler.id, traveler],
      [blocker.id, blocker],
    ]);
    const world = createFakeWorld(players);
    const movement = new MovementSystem(world);
    const transition: MapTransition = {
      tileX: traveler.tileX,
      tileY: traveler.tileY + 1,
      toMapId: "mapa1",
      toTileX: entryTile.tileX,
      toTileY: entryTile.tileY,
      facing: "down",
    };

    movement.changeMap(traveler, transition);

    expect(traveler.mapId).toBe("mapa1");
    expect({ tileX: traveler.tileX, tileY: traveler.tileY }).not.toEqual(entryTile);
    expect(
      Math.abs(traveler.tileX - entryTile.tileX) +
        Math.abs(traveler.tileY - entryTile.tileY)
    ).toBe(1);
    expect(isMapTileWalkable(traveler.mapId, traveler.tileX, traveler.tileY)).toBe(true);
    expect(world.isTileOccupied(traveler.tileX, traveler.tileY, traveler.mapId, traveler.id)).toBe(
      false
    );
    expect(world.send).toHaveBeenCalledWith(
      traveler,
      expect.objectContaining({
        type: "player_moved",
        player: expect.objectContaining({
          tileX: traveler.tileX,
          tileY: traveler.tileY,
        }),
      })
    );
  });
});
