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
import { isTileBlockedByMapObject } from "../../../shared/mapObjectDefinitions";
import type { PlayerSession } from "../PlayerSession";
import type { WorldContext } from "./WorldContext";
import type { ClientMessage } from "../../../shared/protocol";
import type { MapTransition } from "../../../shared/mapTypes";
import { isInAoi } from "../../../shared/aoi";
import { FULL_SNAPSHOT_ON_JOIN_ONLY } from "../../../shared/constants";

export class MovementSystem {
  constructor(private ctx: WorldContext) {}

  public handleMove(session: PlayerSession, direction: Extract<ClientMessage, { type: "move" }>["direction"]) {
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(session.mapId)) return;

    if (!validateMoveDirection(direction)) {
      return;
    }

    const prevX = session.tileX;
    const prevY = session.tileY;
    session.facing = facingFromDirection(direction);

    const now = Date.now();
    if (session.isImmobilized(now)) {
      this.ctx.sendCombatLog(session, "Estás inmovilizado.");
      this.rejectPlayerMove(session, prevX, prevY);
      return;
    }

    const isGhost = session.hp <= 0 || session.isDead;

    const { dx, dy } = deltaFromDirection(direction);
    const nextX = session.tileX + dx;
    const nextY = session.tileY + dy;

    const transition = findTransition(session.mapId, nextX, nextY, session.facing);
    if (transition) {
      const moveCheck = validateMoveIntent(now, session.nextMoveAt);
      if (!moveCheck.ok) {
        this.rejectPlayerMove(session, prevX, prevY);
        return;
      }
      session.nextMoveAt = moveCooldownUntil(now);
      this.changeMap(session, transition);
      return;
    }

    const blocked =
      !isMapTileWalkable(session.mapId, nextX, nextY, this.ctx.getMapTileOverrides(session.mapId)) ||
      isTileBlockedByMapObject(getMap(session.mapId).objects, nextX, nextY) ||
      (!isGhost &&
        this.ctx.isTileOccupied(nextX, nextY, session.mapId, session.id, { ignoreGhosts: true }));

    if (blocked) {
      this.rejectPlayerMove(session, prevX, prevY);
      return;
    }

    const moveCheck = validateMoveIntent(now, session.nextMoveAt);
    if (!moveCheck.ok) {
      this.rejectPlayerMove(session, prevX, prevY);
      return;
    }
    session.nextMoveAt = moveCooldownUntil(now);

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

  private changeMap(session: PlayerSession, transition: MapTransition) {
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

    session.mapId = transition.toMapId;
    session.tileX = transition.toTileX;
    session.tileY = transition.toTileY;
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
  }
}
