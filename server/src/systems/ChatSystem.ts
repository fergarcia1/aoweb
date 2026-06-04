import { ADMIN_GM_HP_MAX, ADMIN_GM_MP_MAX } from "../../../game-data/constants";
import { CLASS_USES_MANA, type CharacterClassId } from "../../../game-data/classes";
import { expRequiredForLevel } from "../../../game-data/progressFormulas";
import {
  getMaxVitalsAtLevel,
  VITAL_GROWTH_MAX_LEVEL,
} from "../../../game-data/vitalProgression";
import { isMapTileWalkable } from "../../../shared/mapWalkability";
import type { PlayerSession } from "../PlayerSession";
import type { WorldContext } from "./WorldContext";

export class ChatSystem {
  constructor(private readonly world: WorldContext) {}

  public handleChat(session: PlayerSession, text: string) {
    const trimmed = text.trim().slice(0, 200);
    if (!trimmed) return;
    this.world.broadcastToAoi(session.mapId, session.tileX, session.tileY, {
      type: "chat",
      from: session.name,
      text: trimmed,
    });
  }

  public handleAdminCommand(session: PlayerSession, command: string, args: string[]) {
    if (!session.isAdmin()) {
      this.world.sendCombatLog(session, "No tenes permisos de administrador.");
      return;
    }

    if (command === "tp") {
      this.handleAdminTeleport(session, args);
      return;
    }

    if (command === "pvp") {
      const isEnabled = this.world.isGlobalPvpEnabled();
      this.world.setGlobalPvpEnabled(!isEnabled);
      this.world.sendCombatLog(
        session,
        `PvP global (ignora zonas seguras) esta ahora: ${!isEnabled ? "ACTIVADO" : "DESACTIVADO"}`
      );
      return;
    }

    if (command === "set") {
      this.handleAdminSet(session, args);
      return;
    }

    this.world.sendCombatLog(session, `Comando admin desconocido: /${command}`);
  }

  private handleAdminSet(session: PlayerSession, args: string[]) {
    const target = args[0]?.toLowerCase();
    if (target !== "lvl" && target !== "level") {
      this.world.sendCombatLog(session, "Uso: /set lvl <1-50>");
      return;
    }

    const rawLevel = Number(args[1]);
    if (!Number.isFinite(rawLevel)) {
      this.world.sendCombatLog(session, "Uso: /set lvl <1-50>");
      return;
    }

    const level = Math.max(1, Math.min(VITAL_GROWTH_MAX_LEVEL, Math.floor(rawLevel)));
    const classId = session.classId as CharacterClassId;
    session.level = level;
    session.exp = 0;
    session.expToNext = expRequiredForLevel(level);

    if (session.isAdmin()) {
      session.hpMax = ADMIN_GM_HP_MAX;
      session.mpMax = ADMIN_GM_MP_MAX;
    } else {
      const vitals = getMaxVitalsAtLevel(session.raceId, classId, level);
      session.hpMax = vitals.hpMax;
      session.mpMax = vitals.mpMax;
    }

    session.hp = session.hpMax;
    session.mp = CLASS_USES_MANA[classId] ? 0 : 0;
    session.isMeditating = false;
    session.nextMeditationRegenAt = 0;

    this.world.send(session, {
      type: "player_progress_updated",
      exp: session.exp,
      expToNext: session.expToNext,
      level: session.level,
    });
    const update = {
      type: "player_updated" as const,
      player: session.toNetState(),
    };
    this.world.send(session, update);
    this.world.broadcastToAoi(session.mapId, session.tileX, session.tileY, update, session.id);
    this.world.schedulePersistSessionDebounced(session);
    this.world.sendCombatLog(
      session,
      `Nivel seteado a ${level}. Mana en 0 para probar meditacion.`
    );
  }

  private handleAdminTeleport(session: PlayerSession, args: string[]) {
    const x = parseInt(args[0], 10);
    const y = parseInt(args[1], 10);

    if (isNaN(x) || isNaN(y)) {
      this.world.sendCombatLog(session, "Uso: /tp <x> <y>");
      return;
    }

    if (!isMapTileWalkable(session.mapId, x, y, this.world.getMapTileOverrides(session.mapId))) {
      this.world.sendCombatLog(session, `Tile (${x}, ${y}) no es caminable.`);
      return;
    }

    const prevX = session.tileX;
    const prevY = session.tileY;
    session.tileX = x;
    session.tileY = y;
    this.world.syncAoiAfterMove(session, prevX, prevY);
    this.world.sendCombatLog(session, `Teletransportado a (${x}, ${y}).`);
  }
}
