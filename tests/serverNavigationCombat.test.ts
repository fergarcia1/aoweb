import { describe, expect, it, vi } from "vitest";
import { getDefenseStatsFromEquipment } from "../game-data/equipmentCombat";
import { MobEntity } from "../server/src/MobEntity";
import { PlayerSession } from "../server/src/PlayerSession";
import { CombatSystem } from "../server/src/systems/CombatSystem";
import type { WorldContext } from "../server/src/systems/WorldContext";

function createFakeWorld(mob: MobEntity): WorldContext {
  const mobs = new Map([[mob.id, mob]]);
  const players = new Map<string, PlayerSession>();
  return {
    getMobs: () => mobs,
    getPlayers: () => players,
    sendCombatLog: vi.fn(),
    broadcastCombatLog: vi.fn(),
    broadcastGameEvent: vi.fn(),
    broadcastMobUpdated: vi.fn(),
    aggroMobOnPlayerHit: vi.fn((targetMob) => {
      targetMob.isAggroed = true;
    }),
    grantMobKillGold: vi.fn(),
    grantMobKillExp: vi.fn(),
    isGlobalPvpEnabled: () => false,
    setGlobalPvpEnabled: vi.fn(),
    cancelResurrectForPlayer: vi.fn(),
  } as unknown as WorldContext;
}

function createSession(): PlayerSession {
  const session = new PlayerSession("player-1", {} as any);
  session.joined = true;
  session.name = "Navegante";
  session.mapId = "mapa252";
  session.tileX = 20;
  session.tileY = 73;
  session.facing = "down";
  session.hp = session.hpMax;
  session.isNavigating = true;
  session.equipment.weaponId = "weapon_saramiana";
  session.equipment.shieldId = "shield_tortuga";
  session.equipment.helmetId = "helmet_celada";
  session.equipment.armorId = "armor_placas";
  session.equipment.equippedOutfit = "base";
  session.recalcAttackStats();
  session.recalcDefenseStats();
  return session;
}

describe("navigation combat", () => {
  it("permite atacar en barca usando el daño del equipo equipado", () => {
    const session = createSession();
    const mob = new MobEntity({
      id: "mob-1",
      mobId: "dummy",
      name: "Dummy",
      mapId: session.mapId,
      tileX: session.tileX,
      tileY: session.tileY + 1,
      maxHp: 200,
      behavior: "passive",
      hitboxOffsetY: 0,
      hitboxWidthTiles: 1,
      hitboxHeightTiles: 1,
    });
    const world = createFakeWorld(mob);
    const combat = new CombatSystem(world);
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    combat.handleAttack(session);

    expect(session.isNavigating).toBe(true);
    expect(session.attackMin).toBeGreaterThan(8);
    expect(mob.hp).toBe(200 - session.attackMin);
    expect(world.aggroMobOnPlayerHit).toHaveBeenCalledWith(mob, session);

    randomSpy.mockRestore();
  });

  it("mantiene resistencias y bloqueo del equipo aunque el jugador este en barca", () => {
    const session = createSession();
    const expectedDefense = getDefenseStatsFromEquipment(session.equipment);

    expect(session.isNavigating).toBe(true);
    expect(session.damageReductionPercent).toBe(expectedDefense.damageReductionPercent);
    expect(session.magicResistancePercent).toBe(expectedDefense.magicResistancePercent);
    expect(session.shieldBlockChancePercent).toBe(expectedDefense.shieldBlockChancePercent);
    expect(session.shieldBlockReductionPercent).toBe(
      expectedDefense.shieldBlockReductionPercent
    );
  });
});
