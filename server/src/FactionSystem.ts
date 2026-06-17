import { logger } from "./logger";
import type { PlayerSession } from "./PlayerSession";
import type { ServerMessage } from "../../shared/protocol";
import {
  FACTION_LABELS,
  canRenegade,
  getFactionPromotion,
  normalizeFactionId,
  type CharacterFactionId,
} from "../../shared/faction";
import type { WorldContext } from "./systems/WorldContext";

export class FactionSystem {
  constructor(private readonly world: WorldContext) {}

  tryBecomeRenegade(session: PlayerSession): void {
    const current = normalizeFactionId(session.factionId);
    if (!canRenegade(current)) {
      this.world.sendCombatLog(session, "Solo un ciudadano imperial puede renegar.");
      return;
    }
    this.setFaction(session, "renegado", "Has renegado. Ahora sos un Renegado.");
  }

  onUserKill(killer: PlayerSession, victim: PlayerSession): void {
    if (killer.id === victim.id) {
      return;
    }
    killer.usersKilled = Math.max(0, killer.usersKilled + 1);
    const current = normalizeFactionId(killer.factionId);
    const next = getFactionPromotion(current, killer.usersKilled);
    if (!next) {
      return;
    }
    const label = FACTION_LABELS[next];
    this.setFaction(
      killer,
      next,
      `Ascendiste a ${label} tras ${killer.usersKilled} asesinatos de usuarios.`
    );
  }

  private setFaction(session: PlayerSession, factionId: CharacterFactionId, logMessage?: string): void {
    session.factionId = factionId;
    if (logMessage) {
      this.world.sendCombatLog(session, logMessage);
    }
    this.world.sendPlayerState(session);
    const updated: ServerMessage = {
      type: "player_updated",
      player: session.toNetState(),
    };
    this.world.send(session, updated);
    this.world.broadcastToAoi(session.mapId, session.tileX, session.tileY, updated, session.id);
    void this.world.persistSession(session).catch((error) => {
      logger.error("factionsystem", "[faction] persist failed:", error);
    });
  }
}
