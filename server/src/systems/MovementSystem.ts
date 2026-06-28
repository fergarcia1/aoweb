import {
  MULTIPLAYER_SERVER_MAP_IDS,
} from "../../../shared/joinValidation";
import {
  validateMoveDirection,
  validateMoveIntent,
  moveCooldownUntil,
} from "../../../shared/multiplayerIntents";
import { deltaFromDirection, facingFromDirection } from "../../../shared/protocol";
import { isMapTileWalkable } from "../../../shared/mapWalkability";
import { getMap, findTransition } from "../../../shared/maps";
import { canNavigateToTile } from "../../../shared/navigation";
import {
  canEnterNewbieDungeon,
  NEWBIE_DUNGEON_ENTRY_DENIED_MESSAGE,
  NEWBIE_DUNGEON_MAP_ID,
} from "../../../shared/newbieDungeon";
import { isTileBlockedByMapObject } from "../../../shared/mapObjectDefinitions";
import type { PlayerSession } from "../PlayerSession";
import type { WorldContext } from "./WorldContext";
import type { ClientMessage } from "../../../shared/protocol";
import type { MapTransition } from "../../../shared/mapTypes";
import { isInAoi } from "../../../shared/aoi";
import { FULL_SNAPSHOT_ON_JOIN_ONLY } from "../../../game-data/constants";

export class MovementSystem {
  constructor(private ctx: WorldContext) {}

  public handleMove(session: PlayerSession, direction: Extract<ClientMessage, { type: "move" }>["direction"]) {
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(session.mapId)) return;

    if (!validateMoveDirection(direction)) {
      return;
    }

    const prevX = session.tileX;
    const prevY = session.tileY;
    const requestedFacing = facingFromDirection(direction);

    const now = Date.now();
    if (session.isImmobilized(now)) {
      if (now >= session.nextImmobilizedMoveRejectAt) {
        session.nextImmobilizedMoveRejectAt = now + 900;
        this.ctx.sendCombatLog(session, "Estas inmovilizado.");
        this.rejectPlayerMove(session, prevX, prevY);
      }
      return;
    }
    session.facing = requestedFacing;

    const isGhost = session.hp <= 0 || session.isDead;

    const { dx, dy } = deltaFromDirection(direction);
    const nextX = session.tileX + dx;
    const nextY = session.tileY + dy;

    if (!this.ctx.canArenaPlayerMove(session, nextX, nextY)) {
      this.rejectPlayerMove(session, prevX, prevY);
      return;
    }

    const map = getMap(session.mapId);
    const tileOverrides = this.ctx.getMapTileOverrides(session.mapId);
    const mapAllowsMove = session.isNavigating
      ? canNavigateToTile(map, nextX, nextY, tileOverrides)
      : isMapTileWalkable(session.mapId, nextX, nextY, tileOverrides);
    const blocked =
      !mapAllowsMove ||
      isTileBlockedByMapObject(map.objects, nextX, nextY) ||
      (!isGhost &&
        this.ctx.isTileOccupied(nextX, nextY, session.mapId, session.id, { ignoreGhosts: true }));

    let effectiveBlocked = blocked;
    if (session.isNavigating && !blocked) {
      if (nextX <= 9 || nextX >= 90 || nextY <= 6 || nextY >= 93) {
        effectiveBlocked = true;
      }
    }

    const transition = findTransition(session.mapId, nextX, nextY, session.facing, effectiveBlocked);
    if (transition) {
      const moveCheck = validateMoveIntent(now, session.nextMoveAt);
      if (!moveCheck.ok) {
        this.rejectPlayerMove(session, prevX, prevY);
        return;
      }
      if (transition.toMapId === NEWBIE_DUNGEON_MAP_ID && !canEnterNewbieDungeon(session.level)) {
        this.ctx.sendCombatLog(session, NEWBIE_DUNGEON_ENTRY_DENIED_MESSAGE);
        this.rejectPlayerMove(session, prevX, prevY);
        return;
      }
      
      session.nextMoveAt = moveCooldownUntil(now, session.speedMultiplier);
      const directMapTransition = map.transitions.some(
        (entry) => entry.tileX === nextX && entry.tileY === nextY
      );
      this.changeMap(
        session,
        directMapTransition
          ? transition
          : this.resolveEdgeTransitionEntryDestination(session, transition, direction)
      );
      return;
    }

    if (blocked) {
      this.rejectPlayerMove(session, prevX, prevY);
      return;
    }

    const moveCheck = validateMoveIntent(now, session.nextMoveAt);
    if (!moveCheck.ok) {
      this.rejectPlayerMove(session, prevX, prevY);
      return;
    }
    session.nextMoveAt = moveCooldownUntil(now, session.speedMultiplier);

    if (
      !isGhost &&
      !this.ctx.displaceGhostsFromTile(
        session.mapId,
        nextX,
        nextY,
        prevX,
        prevY,
        session.id
      )
    ) {
      this.rejectPlayerMove(session, prevX, prevY);
      return;
    }

    session.tileX = nextX;
    session.tileY = nextY;
    if (!isGhost) {
      this.ctx.cancelResurrectForPlayer(session.id);
    }
    this.ctx.schedulePersistSessionDebounced(session);

    this.ctx.send(session, {
      type: "player_moved",
      player: session.toNetState(),
    });
    this.syncAoiAfterMove(session, prevX, prevY);
  }

  private rejectPlayerMove(session: PlayerSession, prevX: number, prevY: number) {
    session.tileX = prevX;
    session.tileY = prevY;
    this.ctx.send(session, {
      type: "player_moved",
      player: session.toNetState(),
    });
    this.broadcastPlayerMoved(session);
  }

  private resolveEdgeTransitionEntryDestination(
    session: PlayerSession,
    transition: MapTransition,
    direction: Extract<ClientMessage, { type: "move" }>["direction"]
  ): MapTransition {
    const targetMap = getMap(transition.toMapId);
    const clampX = Math.max(0, Math.min(targetMap.width - 1, transition.toTileX));
    const clampY = Math.max(0, Math.min(targetMap.height - 1, transition.toTileY));

    if (direction === "down") {
      for (let y = 0; y < targetMap.height; y += 1) {
        if (this.canUseTransitionDestination(session, targetMap.id, clampX, y)) {
          return { ...transition, toTileX: clampX, toTileY: y };
        }
      }
    } else if (direction === "up") {
      for (let y = targetMap.height - 1; y >= 0; y -= 1) {
        if (this.canUseTransitionDestination(session, targetMap.id, clampX, y)) {
          return { ...transition, toTileX: clampX, toTileY: y };
        }
      }
    } else if (direction === "right") {
      for (let x = 0; x < targetMap.width; x += 1) {
        if (this.canUseTransitionDestination(session, targetMap.id, x, clampY)) {
          return { ...transition, toTileX: x, toTileY: clampY };
        }
      }
    } else if (direction === "left") {
      for (let x = targetMap.width - 1; x >= 0; x -= 1) {
        if (this.canUseTransitionDestination(session, targetMap.id, x, clampY)) {
          return { ...transition, toTileX: x, toTileY: clampY };
        }
      }
    }

    return { ...transition, toTileX: clampX, toTileY: clampY };
  }

  public broadcastPlayerMoved(session: PlayerSession) {
    this.ctx.broadcastToAoi(
      session.mapId,
      session.tileX,
      session.tileY,
      {
        type: "player_moved",
        player: session.toNetState(),
      },
      session.id
    );
  }

  public changeMap(session: PlayerSession, transition: MapTransition) {
    const prevMapId = session.mapId;
    const prevX = session.tileX;
    const prevY = session.tileY;

    for (const otherId of session.aoiVisiblePlayerIds) {
      const other = this.ctx.getPlayers().get(otherId);
      if (other) {
        other.aoiVisiblePlayerIds.delete(session.id);
        this.ctx.send(other, { type: "player_left", playerId: session.id });
      }
    }
    session.aoiVisiblePlayerIds.clear();

    const destination = this.resolveTransitionDestination(session, transition);
    session.mapId = transition.toMapId;
    session.tileX = destination.tileX;
    session.tileY = destination.tileY;
    if (transition.facing) {
      session.facing = transition.facing;
    }
    this.ctx.schedulePersistSessionDebounced(session);

    this.ctx.send(session, {
      type: "player_moved",
      player: session.toNetState(),
    });

    this.initAoiOnJoin(session);
    this.sendSnapshot(session);
  }

  private resolveTransitionDestination(
    session: PlayerSession,
    transition: MapTransition
  ): { tileX: number; tileY: number } {
    const isGhost = session.hp <= 0 || session.isDead;
    const target = { tileX: transition.toTileX, tileY: transition.toTileY };
    if (isGhost || this.canUseTransitionDestination(session, transition.toMapId, target.tileX, target.tileY)) {
      return target;
    }

    const candidates = [
      { tileX: target.tileX + 1, tileY: target.tileY },
      { tileX: target.tileX - 1, tileY: target.tileY },
      { tileX: target.tileX, tileY: target.tileY + 1 },
      { tileX: target.tileX, tileY: target.tileY - 1 },
    ];

    return (
      candidates.find((candidate) =>
        this.canUseTransitionDestination(
          session,
          transition.toMapId,
          candidate.tileX,
          candidate.tileY
        )
      ) ?? target
    );
  }

  private canUseTransitionDestination(
    session: PlayerSession,
    mapId: string,
    tileX: number,
    tileY: number
  ): boolean {
    const map = getMap(mapId);
    const tileOverrides = this.ctx.getMapTileOverrides(mapId);
    return (
      isMapTileWalkable(mapId, tileX, tileY, tileOverrides) &&
      !isTileBlockedByMapObject(map.objects, tileX, tileY) &&
      !this.ctx.isTileOccupied(tileX, tileY, mapId, session.id)
    );
  }

  public initAoiOnJoin(session: PlayerSession) {
    session.aoiVisiblePlayerIds.clear();
    for (const other of this.ctx.getPlayers().values()) {
      if (
        other.id !== session.id &&
        other.joined &&
        other.mapId === session.mapId &&
        isInAoi(session.tileX, session.tileY, other.tileX, other.tileY)
      ) {
        session.aoiVisiblePlayerIds.add(other.id);
        other.aoiVisiblePlayerIds.add(session.id);

        this.ctx.send(other, {
          type: "player_joined",
          player: session.toNetState(),
        });
      }
    }
  }

  public syncAoiAfterMove(session: PlayerSession, oldX: number, oldY: number) {
    const previousVisible = new Set(session.aoiVisiblePlayerIds);
    const currentVisible = new Set<string>();

    for (const other of this.ctx.getPlayers().values()) {
      if (
        other.id !== session.id &&
        other.joined &&
        other.mapId === session.mapId &&
        isInAoi(session.tileX, session.tileY, other.tileX, other.tileY)
      ) {
        currentVisible.add(other.id);
      }
    }

    for (const oldId of previousVisible) {
      if (!currentVisible.has(oldId)) {
        session.aoiVisiblePlayerIds.delete(oldId);
        const other = this.ctx.getPlayers().get(oldId);
        if (other) {
          other.aoiVisiblePlayerIds.delete(session.id);
          this.ctx.send(other, {
            type: "player_left",
            playerId: session.id,
          });
        }
        this.ctx.send(session, {
          type: "player_left",
          playerId: oldId,
        });
      }
    }

    for (const newId of currentVisible) {
      if (!previousVisible.has(newId)) {
        session.aoiVisiblePlayerIds.add(newId);
        const other = this.ctx.getPlayers().get(newId);
        if (other) {
          other.aoiVisiblePlayerIds.add(session.id);
          this.ctx.send(other, {
            type: "player_joined",
            player: session.toNetState(),
          });
        }
        this.ctx.send(session, {
          type: "player_joined",
          player: other!.toNetState(),
        });
      }
    }

    this.broadcastPlayerMoved(session);

    if (!FULL_SNAPSHOT_ON_JOIN_ONLY) {
      this.sendSnapshot(session);
    }
  }

  public sendSnapshot(session: PlayerSession) {
    this.ctx.send(session, {
      type: "world_snapshot",
      snapshot: this.ctx.buildWorldSnapshot(session.mapId),
    });

    const dynamicObjs = this.ctx.getDynamicMapObjs(session.mapId);
    if (dynamicObjs) {
      for (const obj of dynamicObjs) {
        this.ctx.send(session, {
          type: "game_event",
          event: {
            kind: "map_object_updated",
            tileX: obj.tileX,
            tileY: obj.tileY,
            objIndex: obj.objIndex,
          },
        });
      }
    }
  }
}
