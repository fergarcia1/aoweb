import { describe, expect, it, vi } from "vitest";
import { getDefenseStatsFromEquipment } from "../game-data/equipmentCombat";
import { MobEntity } from "../server/src/MobEntity";
import { PlayerSession } from "../server/src/PlayerSession";
import { CombatSystem } from "../server/src/systems/CombatSystem";
import type { WorldContext } from "../server/src/systems/WorldContext";
import { ATTACK_COOLDOWN_MS } from "../shared/combat";
import { MECHANICS } from "../shared/gameMechanics";

function createFakeWorld(mob: MobEntity): WorldContext {
  const mobs = new Map([[mob.id, mob]]);
  const players = new Map<string, PlayerSession>();
  return {
    getMobs: () => mobs,
    getPlayers: () => players,
    sendCombatLog: vi.fn(),
    send: vi.fn(),
    sendPlayerState: vi.fn(),
    sendInventoryUpdated: vi.fn(),
    broadcastToAoi: vi.fn(),
    broadcastCombatLog: vi.fn(),
    broadcastGameEvent: vi.fn(),
    broadcastMobUpdated: vi.fn(),
    dropPlayerDeathLoot: vi.fn(),
    aggroMobOnPlayerHit: vi.fn((targetMob) => {
      targetMob.isAggroed = true;
    }),
    grantMobKillGold: vi.fn(),
    grantMobKillExp: vi.fn(),
    isGlobalPvpEnabled: () => false,
    setGlobalPvpEnabled: vi.fn(),
    cancelResurrectForPlayer: vi.fn(),
    onUserKill: vi.fn(),
    notifyPartyOfHpChange: vi.fn(),
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

  it("bloquea el spam de hechizos hasta que pasan 200 ms", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T20:00:00.000Z"));

    const session = createSession();
    session.mp = 100;
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

    combat.handleCastSpell(session, 2, mob.tileX, mob.tileY);
    const hpAfterFirstCast = mob.hp;
    expect(world.sendPlayerState).toHaveBeenCalledWith(session, {
      includeAttributeBuffs: true,
    });

    combat.handleCastSpell(session, 2, mob.tileX, mob.tileY);
    expect(mob.hp).toBe(hpAfterFirstCast);
    expect(session.mp).toBe(80);

    vi.setSystemTime(new Date(Date.now() + MECHANICS.INTERVAL_SPELL_CAST));
    combat.handleCastSpell(session, 2, mob.tileX, mob.tileY);

    expect(mob.hp).toBeLessThan(hpAfterFirstCast);
    expect(session.mp).toBe(60);

    randomSpy.mockRestore();
    vi.useRealTimers();
  });

  it("permite intercalar golpe, spell y golpe con timing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T20:10:00.000Z"));

    const session = createSession();
    session.mp = 100;
    const mob = new MobEntity({
      id: "mob-1",
      mobId: "dummy",
      name: "Dummy",
      mapId: session.mapId,
      tileX: session.tileX,
      tileY: session.tileY + 1,
      maxHp: 1000,
      behavior: "passive",
      hitboxOffsetY: 0,
      hitboxWidthTiles: 1,
      hitboxHeightTiles: 1,
    });
    const world = createFakeWorld(mob);
    const combat = new CombatSystem(world);
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    combat.handleAttack(session);
    const hpAfterHit = mob.hp;

    vi.setSystemTime(new Date(Date.now() + MECHANICS.INTERVAL_MELEE_TO_SPELL - 1));
    combat.handleCastSpell(session, 2, mob.tileX, mob.tileY);
    expect(mob.hp).toBe(hpAfterHit);
    expect(session.mp).toBe(100);
    expect(world.sendCombatLog).toHaveBeenCalledWith(
      session,
      "No podés lanzar el hechizo tan rápido."
    );

    vi.setSystemTime(new Date(Date.now() + 1));
    combat.handleCastSpell(session, 2, mob.tileX, mob.tileY);
    const hpAfterSpell = mob.hp;
    expect(hpAfterSpell).toBeLessThan(hpAfterHit);
    expect(session.mp).toBe(80);

    vi.setSystemTime(new Date(Date.now() + ATTACK_COOLDOWN_MS - MECHANICS.INTERVAL_MELEE_TO_SPELL));
    combat.handleAttack(session);
    expect(mob.hp).toBeLessThan(hpAfterSpell);

    randomSpy.mockRestore();
    vi.useRealTimers();
  });

  it("emite fx confirmado para hechizos de cura", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T20:20:00.000Z"));

    const session = createSession();
    session.hp = 40;
    session.hpMax = 100;
    session.mp = 100;
    const mob = new MobEntity({
      id: "mob-1",
      mobId: "dummy",
      name: "Dummy",
      mapId: session.mapId,
      tileX: session.tileX,
      tileY: session.tileY + 1,
      maxHp: 1000,
      behavior: "passive",
      hitboxOffsetY: 0,
      hitboxWidthTiles: 1,
      hitboxHeightTiles: 1,
    });
    const world = createFakeWorld(mob);
    const combat = new CombatSystem(world);
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    combat.handleCastSpell(session, 3, session.tileX, session.tileY);

    expect(session.hp).toBeGreaterThan(40);
    expect(session.mp).toBe(80);
    expect(world.broadcastGameEvent).toHaveBeenCalledWith(
      session.mapId,
      session.tileX,
      session.tileY,
      expect.objectContaining({ kind: "spell_fx", spellId: 3 })
    );

    randomSpy.mockRestore();
    vi.useRealTimers();
  });

  it("emite muerte aunque haya quedado deathLootProcessed de una vida anterior", () => {
    const victim = createSession();
    victim.hp = 10;
    victim.deathLootProcessed = true;
    victim.isDead = false;

    const killer = createSession();
    killer.id = "player-2";
    killer.name = "Asesino";

    const mob = new MobEntity({
      id: "mob-1",
      mobId: "dummy",
      name: "Dummy",
      mapId: victim.mapId,
      tileX: victim.tileX,
      tileY: victim.tileY + 1,
      maxHp: 1000,
      behavior: "passive",
      hitboxOffsetY: 0,
      hitboxWidthTiles: 1,
      hitboxHeightTiles: 1,
    });
    const world = createFakeWorld(mob);
    const combat = new CombatSystem(world);

    (combat as unknown as { handlePlayerKilled: (killer: PlayerSession, victim: PlayerSession) => void })
      .handlePlayerKilled(killer, victim);

    expect(victim.isDead).toBe(true);
    expect(victim.hp).toBe(0);
    expect(world.dropPlayerDeathLoot).not.toHaveBeenCalled();
    expect(world.sendInventoryUpdated).not.toHaveBeenCalled();
    expect(world.send).toHaveBeenCalledWith(
      victim,
      expect.objectContaining({ type: "player_died", playerId: victim.id })
    );
    expect(world.broadcastToAoi).toHaveBeenCalledWith(
      victim.mapId,
      victim.tileX,
      victim.tileY,
      expect.objectContaining({ type: "player_died", playerId: victim.id }),
      victim.id
    );
  });
});
