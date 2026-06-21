import { logger } from "../logger";
import { ADMIN_GM_HP_MAX, ADMIN_GM_MP_MAX } from "../../../game-data/constants";
import { CLASS_USES_MANA, type CharacterClassId } from "../../../game-data/classes";
import { expRequiredForLevel } from "../../../game-data/progressFormulas";
import {
  getMaxVitalsAtLevel,
  VITAL_GROWTH_MAX_LEVEL,
} from "../../../game-data/vitalProgression";
import {
  findNearestWalkableSpawnTile,
  getMapSpawnTile,
  isMapTileWalkable,
} from "../../../shared/mapWalkability";
import { getMap } from "../../../shared/maps";
import { isWaterTile } from "../../../shared/navigation";
import { addToServerInventory } from "../../../shared/serverInventory";
import { getItemDefinition, type ItemId } from "../../../game-data/items/definitions";
import { isKnownItemId } from "../../../game-data/items/registry";
import type { PlayerSession } from "../PlayerSession";
import type { WorldContext } from "./WorldContext";

const MAX_ADMIN_SPEED_MULTIPLIER = 3;
const MAX_ADMIN_GOLD_GRANT = 2_000_000_000;

export class ChatSystem {
  constructor(private readonly world: WorldContext) {}

  public handleChat(session: PlayerSession, text: string) {
    const trimmed = text.trim().slice(0, 200);
    if (!trimmed) return;

    if (trimmed.startsWith("/")) {
      const parts = trimmed.slice(1).split(" ");
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      if (this.handlePartyCommand(session, command, args)) {
        return;
      }
    }

    this.world.broadcastToAoi(session.mapId, session.tileX, session.tileY, {
      type: "chat",
      from: session.name,
      text: trimmed,
      fromPlayerId: session.id,
    });
  }

  private handlePartyCommand(session: PlayerSession, command: string, args: string[]): boolean {
    if (command === "creargrupo" || command === "party") {
      // @ts-ignore
      this.world.handlePartyAction(session, { type: "party_action", action: "invite", targetName: session.name });
      return true;
    }
    if (command === "invitar") {
      const targetName = args.join(" ");
      // @ts-ignore
      this.world.handlePartyAction(session, { type: "party_action", action: "invite", targetName });
      return true;
    }
    if (command === "aceptar") {
      this.world.sendCombatLog(session, "Por favor usa el botón de aceptar en el cartel de invitación.");
      return true;
    }
    if (command === "salirgrupo") {
      // @ts-ignore
      this.world.handlePartyAction(session, { type: "party_action", action: "leave" });
      return true;
    }
    return false;
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

    if (command === "tpmap") {
      this.handleAdminTeleportMap(session, args);
      return;
    }

    if (command === "speed") {
      const multiplier = parseInt(args[0], 10);
      if (isNaN(multiplier) || multiplier < 1 || multiplier > MAX_ADMIN_SPEED_MULTIPLIER) {
        this.world.sendCombatLog(session, `Uso: /speed <1-${MAX_ADMIN_SPEED_MULTIPLIER}>`);
        return;
      }
      session.speedMultiplier = multiplier;
      this.world.send(session, {
        type: "player_updated",
        player: session.toNetState(),
      });
      this.world.sendCombatLog(session, `Velocidad admin x${multiplier}`);
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

    if (command === "give") {
      this.handleAdminGive(session, args);
      return;
    }

    if (command === "gold") {
      this.handleAdminGold(session, args);
      return;
    }

    this.world.sendCombatLog(session, `Comando admin desconocido: /${command}`);
  }

  private handleAdminGold(session: PlayerSession, args: string[]) {
    const amount = parseInt(args[0] ?? "", 10);
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_ADMIN_GOLD_GRANT) {
      this.world.sendCombatLog(session, `Uso: /gold <1-${MAX_ADMIN_GOLD_GRANT}> [personaje]`);
      return;
    }

    const targetName = args.slice(1).join(" ").trim() || session.name;
    const target = [...this.world.getPlayers().values()].find(
      (player) => player.joined && player.name.toLowerCase() === targetName.toLowerCase()
    );
    if (!target) {
      this.world.sendCombatLog(session, `No se encontro al personaje "${targetName}".`);
      return;
    }

    const grant = Math.floor(amount);
    target.gold = Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(target.gold)) + grant);
    this.world.sendInventoryUpdated(target);
    void this.world.persistSession(target).catch((error) => {
      logger.error("chatsystem", "[admin_gold] persist failed:", error);
    });

    this.world.sendCombatLog(target, `Recibiste ${grant.toLocaleString("es-AR")} monedas de oro.`);
    if (target.id !== session.id) {
      this.world.sendCombatLog(session, `Entregaste ${grant.toLocaleString("es-AR")} monedas de oro a ${target.name}.`);
    }
  }

  private handleAdminGive(session: PlayerSession, args: string[]) {
    const amount = parseInt(args[0] ?? "", 10);
    const itemId = args[1];
    if (!Number.isFinite(amount) || amount <= 0 || !itemId) {
      this.world.sendCombatLog(session, "Uso: /give <cantidad> <itemId> [personaje]");
      return;
    }

    if (!isKnownItemId(itemId)) {
      this.world.sendCombatLog(session, `Item desconocido: ${itemId}.`);
      return;
    }

    const targetName = args.slice(2).join(" ").trim() || session.name;
    const target = [...this.world.getPlayers().values()].find(
      (player) => player.joined && player.name.toLowerCase() === targetName.toLowerCase()
    );
    if (!target) {
      this.world.sendCombatLog(session, `No se encontro al personaje "${targetName}".`);
      return;
    }

    const { added, remaining } = addToServerInventory(target.inventorySlots, itemId, amount);
    if (added <= 0) {
      this.world.sendCombatLog(session, "No hay espacio en el inventario.");
      return;
    }

    this.world.syncInventoryEquippedFlags(target);
    this.world.sendInventoryUpdated(target);
    void this.world.persistSession(target).catch((error) => {
      logger.error("chatsystem", "[admin_give] persist failed:", error);
    });

    const item = getItemDefinition(itemId as ItemId);
    const message = `Recibiste ${item.name} x${added}.${remaining > 0 ? ` (${remaining} no entraron)` : ""}`;
    this.world.sendCombatLog(target, message);
    if (target.id !== session.id) {
      this.world.sendCombatLog(session, `Entregaste ${item.name} x${added} a ${target.name}.`);
    }
  }

  private handleAdminSet(session: PlayerSession, args: string[]) {
    const targetAction = args[0]?.toLowerCase();
    if (targetAction !== "lvl" && targetAction !== "level") {
      this.world.sendCombatLog(session, "Uso: /set lvl <1-50> [personaje]");
      return;
    }

    const rawLevel = Number(args[1]);
    if (!Number.isFinite(rawLevel)) {
      this.world.sendCombatLog(session, "Uso: /set lvl <1-50> [personaje]");
      return;
    }

    const targetName = args.slice(2).join(" ").trim() || session.name;
    const targetPlayer = [...this.world.getPlayers().values()].find(
      (player) => player.joined && player.name.toLowerCase() === targetName.toLowerCase()
    );
    if (!targetPlayer) {
      this.world.sendCombatLog(session, `No se encontro al personaje "${targetName}".`);
      return;
    }

    const level = Math.max(1, Math.min(VITAL_GROWTH_MAX_LEVEL, Math.floor(rawLevel)));
    const classId = targetPlayer.classId as CharacterClassId;
    targetPlayer.level = level;
    targetPlayer.exp = 0;
    targetPlayer.expToNext = expRequiredForLevel(level);

    if (targetPlayer.isAdmin()) {
      targetPlayer.hpMax = ADMIN_GM_HP_MAX;
      targetPlayer.mpMax = ADMIN_GM_MP_MAX;
    } else {
      const vitals = getMaxVitalsAtLevel(targetPlayer.raceId, classId, level);
      targetPlayer.hpMax = vitals.hpMax;
      targetPlayer.mpMax = vitals.mpMax;
    }

    targetPlayer.hp = targetPlayer.hpMax;
    targetPlayer.mp = CLASS_USES_MANA[classId] ? targetPlayer.mpMax : 0;
    targetPlayer.isMeditating = false;
    targetPlayer.nextMeditationRegenAt = 0;

    this.world.send(targetPlayer, {
      type: "player_progress_updated",
      exp: targetPlayer.exp,
      expToNext: targetPlayer.expToNext,
      level: targetPlayer.level,
    });
    const update = {
      type: "player_updated" as const,
      player: targetPlayer.toNetState(),
    };
    this.world.send(targetPlayer, update);
    this.world.broadcastToAoi(
      targetPlayer.mapId,
      targetPlayer.tileX,
      targetPlayer.tileY,
      update,
      targetPlayer.id
    );
    this.world.notifyPartyOfHpChange(targetPlayer.id);
    this.world.schedulePersistSessionDebounced(targetPlayer);

    this.world.sendCombatLog(
      targetPlayer,
      `Nivel seteado a ${level}. Mana restaurado.`
    );
    if (targetPlayer.id !== session.id) {
      this.world.sendCombatLog(session, `Seteaste el nivel de ${targetPlayer.name} a ${level}.`);
    }
  }

  private handleAdminTeleport(session: PlayerSession, args: string[]) {
    const x = parseInt(args[0], 10);
    const y = parseInt(args[1], 10);

    if (isNaN(x) || isNaN(y)) {
      this.world.sendCombatLog(session, "Uso: /tp <x> <y>");
      return;
    }

    const overrides = this.world.getMapTileOverrides(session.mapId);
    const isWalkable = isMapTileWalkable(session.mapId, x, y, overrides);
    const isWater = isMapTileWalkable(session.mapId, x, y, overrides, true);

    if (!isWalkable && !isWater) {
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

  private handleAdminTeleportMap(session: PlayerSession, args: string[]) {
    const mapId =
      args[0]?.toLowerCase() === "mapa" && /^\d+$/.test(args[1] ?? "")
        ? `mapa${args[1]}`
        : args[0];
    const coordArgs =
      args[0]?.toLowerCase() === "mapa" && /^\d+$/.test(args[1] ?? "")
        ? args.slice(2)
        : args.slice(1);
    if (!mapId) {
      this.world.sendCombatLog(session, "Uso: /tpmap <mapId> [x] [y]");
      return;
    }

    try {
      getMap(mapId);
    } catch {
      this.world.sendCombatLog(session, `Mapa no encontrado: ${mapId}. No fuiste teletransportado.`);
      return;
    }

    if (coordArgs.length === 1) {
      this.world.sendCombatLog(session, "Uso: /tpmap <mapId> [x] [y]");
      return;
    }

    const hasExplicitCoords = coordArgs.length >= 2;
    const spawn = getMapSpawnTile(mapId);
    const safeSpawn = findNearestWalkableSpawnTile(mapId, spawn, () => false);
    const x = hasExplicitCoords ? parseInt(coordArgs[0], 10) : safeSpawn.tileX;
    const y = hasExplicitCoords ? parseInt(coordArgs[1], 10) : safeSpawn.tileY;

    if (isNaN(x) || isNaN(y)) {
      this.world.sendCombatLog(session, "Uso: /tpmap <mapId> [x] [y] (x e y deben ser números)");
      return;
    }

    const overrides = this.world.getMapTileOverrides(mapId);
    const isWalkable = isMapTileWalkable(mapId, x, y, overrides);
    const isWater = isMapTileWalkable(mapId, x, y, overrides, true);

    if (!isWalkable && !isWater) {
      this.world.sendCombatLog(session, `Tile (${x}, ${y}) no es caminable en ${mapId}. No fuiste teletransportado.`);
      return;
    }

    const prevX = session.tileX;
    const prevY = session.tileY;
    const prevMapId = session.mapId;

    session.mapId = mapId;
    session.tileX = x;
    session.tileY = y;

    if (prevMapId !== mapId) {
      this.world.send(session, {
        type: "player_moved",
        player: session.toNetState(),
      });
      // Synchronize AOI for the new map immediately.
      this.world.syncAoiAfterMove(session, session.tileX, session.tileY);
      this.world.sendCombatLog(session, `Teletransportado al mapa ${mapId} en (${x}, ${y}).`);
    } else {
      this.world.syncAoiAfterMove(session, prevX, prevY);
      this.world.sendCombatLog(session, `Teletransportado en el mapa ${mapId} a (${x}, ${y}).`);
    }
  }
}
