import type { PlayerSession } from "../PlayerSession";
import type { ServerMessage } from "../../../shared/protocol";
import type { MobEntity } from "../MobEntity";

export interface WorldContext {
  syncAoiAfterMove(session: import("../PlayerSession").PlayerSession, oldX: number, oldY: number): void;
  broadcastPlayerMoved(session: import("../PlayerSession").PlayerSession): void;
  broadcastToAoi(
    mapId: string,
    tileX: number,
    tileY: number,
    message: ServerMessage,
    exceptId?: string
  ): void;

  sendCombatLog(session: PlayerSession, text: string): void;
  sendPlayerState(session: PlayerSession, options?: { includeAttributeBuffs?: boolean }): void;
    sendInventoryUpdated(session: PlayerSession): void;
  persistSession(session: PlayerSession): Promise<void>;
  schedulePersistSessionDebounced(session: PlayerSession): void;
  send(session: PlayerSession, message: ServerMessage): void;
  broadcastWorldItemState(
    mapId: string,
    tileX: number,
    tileY: number,
    record: any,
    kind: "spawned" | "updated",
    exceptId?: string
  ): void;
  broadcastWorldItemRemoved(
    mapId: string,
    tileX: number,
    tileY: number,
    worldItemId: string,
    exceptId?: string
  ): void;
  getWorldItems(): any; // WorldItemRegistry
  getMobs(): Map<string, MobEntity>;
  getPlayers(): Map<string, PlayerSession>;
  buildWorldSnapshot(mapId: string): import("../../../shared/protocol").WorldSnapshot;
  isTileOccupied(
    tileX: number,
    tileY: number,
    mapId: string,
    exceptPlayerId: string,
    options?: { ignoreGhosts?: boolean }
  ): boolean;
  /** Empuja fantasmas del tile destino cuando un jugador vivo entra (estilo AO). */
  displaceGhostsFromTile(
    mapId: string,
    tileX: number,
    tileY: number,
    incomingFromTileX: number,
    incomingFromTileY: number,
    moverPlayerId: string
  ): boolean;
  broadcastCombatLog(mapId: string, tileX: number, tileY: number, text: string): void;
  broadcastGameEvent(mapId: string, tileX: number, tileY: number, event: import("../../../shared/types").GameEvent): void;
  broadcastMobUpdated(mob: MobEntity): void;
  aggroMobOnPlayerHit(mob: MobEntity, attacker: PlayerSession): void;
  dropPlayerDeathLoot(session: PlayerSession): void;
  grantMobKillGold(killer: PlayerSession, mob: MobEntity): void;
  grantMobKillExp(killer: PlayerSession, mob: MobEntity): void;
  isGlobalPvpEnabled(): boolean;
  setGlobalPvpEnabled(enabled: boolean): void;
  cancelResurrectForPlayer(playerId: string): void;
  tryBecomeRenegade(session: PlayerSession): void;
  onUserKill(killer: PlayerSession, victim: PlayerSession): void;
  handlePartyAction(session: PlayerSession, message: import("../../../shared/protocol").ClientPartyActionMessage): void;
  /** Overrides de tipo de tile (puertas abiertas/cerradas) por mapa. */
  getMapTileOverrides(mapId: string): ReadonlyMap<string, number> | undefined;
  sendBankUpdated(session: PlayerSession): void;
  sendSpellsUpdated(session: PlayerSession): void;
  syncInventoryEquippedFlags(session: PlayerSession): void;
  getDynamicMapObjs(mapId: string): { tileX: number; tileY: number; objIndex: number; isOpen: boolean }[] | undefined;
  setDynamicMapObjs(mapId: string, objs: { tileX: number; tileY: number; objIndex: number; isOpen: boolean }[]): void;
  setDoorTileOverride(mapId: string, tileX: number, tileY: number, isOpen: boolean): void;
}
