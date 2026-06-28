import { logger } from "./logger";
import type { PlayerSession } from "./PlayerSession";
import type { ServerMessage } from "../../shared/protocol";
import {
  FACTION_PROMOTION_USER_KILLS,
  canRenegade,
  isHostileFaction,
  normalizeFactionId,
  type CharacterFactionId,
} from "../../shared/faction";
import type { WorldContext } from "./systems/WorldContext";

const ARMADA_MANAGER_INTERACTION_TTL_MS = 90_000;

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

  tryEnlistArmada(session: PlayerSession): void {
    const current = normalizeFactionId(session.factionId);
    if (current === "armada") {
      this.sendFactionChat(session, "Ya perteneces a la Armada Real.");
      return;
    }
    if (current !== "ciudadano") {
      this.sendFactionChat(session, "Solo un ciudadano imperial puede alistarse en la Armada Real.");
      return;
    }
    if (Date.now() - session.lastArmadaManagerInteractionAt > ARMADA_MANAGER_INTERACTION_TTL_MS) {
      this.sendFactionChat(session, "Debes hablar con Elessar antes de usar /alistar.");
      return;
    }
    if (session.armadaEnemyKills < FACTION_PROMOTION_USER_KILLS) {
      this.sendFactionChat(session, "Todavia no cumples los requisitos para enlistarte en la armada!");
      return;
    }
    this.setFaction(session, "armada");
    this.sendFactionChat(session, "Has sido aceptado en la Armada Real.");
  }

  onUserKill(killer: PlayerSession, victim: PlayerSession): void {
    if (killer.id === victim.id) {
      return;
    }
    killer.usersKilled = Math.max(0, killer.usersKilled + 1);
    if (isHostileFaction(normalizeFactionId(victim.factionId))) {
      killer.armadaEnemyKills = Math.max(0, killer.armadaEnemyKills + 1);
    }
    this.world.schedulePersistSessionDebounced(killer);

    const current = normalizeFactionId(killer.factionId);
    if (current !== "renegado" || killer.usersKilled < FACTION_PROMOTION_USER_KILLS) {
      return;
    }
    this.setFaction(
      killer,
      "caos",
      `Ascendiste a Caos tras ${killer.usersKilled} asesinatos de usuarios.`
    );
  }

  private sendFactionChat(session: PlayerSession, text: string): void {
    this.world.send(session, {
      type: "chat",
      from: "Armada",
      text,
    });
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
