import { randomUUID } from "crypto";
import type { PlayerSession } from "../PlayerSession";
import { normalizeFactionId, type CharacterFactionId } from "../../../shared/faction";

export type Party = {
  id: string;
  leaderId: string;
  memberIds: string[]; // max 5
  // invited player IDs -> expire time ms
  pendingInvites: Map<string, number>;
};

export class PartySystem {
  private parties = new Map<string, Party>();
  // Mapa inverso para acceso rápido: playerId -> partyId
  private playerParties = new Map<string, string>();

  public getParty(partyId: string): Party | undefined {
    return this.parties.get(partyId);
  }

  public getPartyForPlayer(playerId: string): Party | undefined {
    const partyId = this.playerParties.get(playerId);
    if (!partyId) return undefined;
    return this.parties.get(partyId);
  }

  public createParty(leader: PlayerSession): Party | null {
    if (this.playerParties.has(leader.id)) {
      return null; // Already in a party
    }
    const party: Party = {
      id: randomUUID(),
      leaderId: leader.id,
      memberIds: [leader.id],
      pendingInvites: new Map(),
    };
    this.parties.set(party.id, party);
    this.playerParties.set(leader.id, party.id);
    return party;
  }

  private areCompatiblePartyFactions(a: CharacterFactionId, b: CharacterFactionId): boolean {
    const aAlliance = a === "caos" || a === "renegado" ? "chaos" : "imperial";
    const bAlliance = b === "caos" || b === "renegado" ? "chaos" : "imperial";
    return aAlliance === bAlliance;
  }

  public invite(leader: PlayerSession, target: PlayerSession): { ok: true } | { ok: false; reason: string } {
    let party = this.getPartyForPlayer(leader.id);
    if (!party) {
      const createdParty = this.createParty(leader);
      if (!createdParty) return { ok: false, reason: "No se pudo crear el grupo." };
      party = createdParty;
    }
    if (party.leaderId !== leader.id) {
      return { ok: false, reason: "Solo el líder puede invitar." };
    }
    if (party.memberIds.length >= 5) {
      return { ok: false, reason: "El grupo está lleno (máximo 5)." };
    }
    if (this.playerParties.has(target.id)) {
      return { ok: false, reason: "El jugador ya está en un grupo." };
    }

    if (
      !this.areCompatiblePartyFactions(
        normalizeFactionId(leader.factionId),
        normalizeFactionId(target.factionId)
      )
    ) {
      return { ok: false, reason: "Solo podés invitar jugadores de tu misma alianza." };
    }

    party.pendingInvites.set(target.id, Date.now() + 60000); // 60s expire
    return { ok: true };
  }

  public acceptInvite(player: PlayerSession, leaderId: string): { ok: true; party: Party } | { ok: false; reason: string } {
    const party = this.getPartyForPlayer(leaderId);
    if (!party || party.leaderId !== leaderId) {
      return { ok: false, reason: "El grupo ya no existe o el líder cambió." };
    }
    const expire = party.pendingInvites.get(player.id);
    if (!expire || Date.now() > expire) {
      return { ok: false, reason: "La invitación expiró o no existe." };
    }
    if (party.memberIds.length >= 5) {
      return { ok: false, reason: "El grupo ya está lleno." };
    }
    if (this.playerParties.has(player.id)) {
      return { ok: false, reason: "Ya estás en un grupo." };
    }

    party.pendingInvites.delete(player.id);
    party.memberIds.push(player.id);
    this.playerParties.set(player.id, party.id);
    return { ok: true, party };
  }

  public kick(
    leader: PlayerSession,
    targetId: string
  ): { ok: true; party: Party; kickedId: string } | { ok: false; reason: string } {
    const party = this.getPartyForPlayer(leader.id);
    if (!party) return { ok: false, reason: "No estás en un grupo." };
    if (party.leaderId !== leader.id) {
      return { ok: false, reason: "Solo el líder puede expulsar miembros." };
    }
    if (targetId === leader.id) {
      return { ok: false, reason: "No podés expulsarte a vos mismo." };
    }
    if (!party.memberIds.includes(targetId)) {
      return { ok: false, reason: "Ese jugador no está en tu grupo." };
    }

    party.memberIds = party.memberIds.filter((id) => id !== targetId);
    this.playerParties.delete(targetId);
    return { ok: true, party, kickedId: targetId };
  }

  public dissolve(
    leader: PlayerSession
  ): { ok: true; oldParty: Party } | { ok: false; reason: string } {
    const party = this.getPartyForPlayer(leader.id);
    if (!party) return { ok: false, reason: "No estás en un grupo." };
    if (party.leaderId !== leader.id) {
      return { ok: false, reason: "Solo el líder puede disolver el grupo." };
    }

    const oldParty = { ...party, memberIds: [...party.memberIds] };
    this.parties.delete(party.id);
    for (const memberId of party.memberIds) {
      this.playerParties.delete(memberId);
    }
    return { ok: true, oldParty };
  }

  /** Miembros del grupo conectados y en el mismo mapa (para reparto de recompensas). */
  public getMembersPresentOnMap(
    party: Party,
    mapId: string,
    players: ReadonlyMap<string, PlayerSession>
  ): PlayerSession[] {
    const present: PlayerSession[] = [];
    for (const memberId of party.memberIds) {
      const session = players.get(memberId);
      if (session && session.joined && session.mapId === mapId) {
        present.push(session);
      }
    }
    return present;
  }

  public leave(player: PlayerSession): { ok: true; dissolved: boolean; oldParty: Party } | { ok: false; reason: string } {
    const partyId = this.playerParties.get(player.id);
    if (!partyId) return { ok: false, reason: "No estás en un grupo." };
    const party = this.parties.get(partyId);
    if (!party) return { ok: false, reason: "Error interno: grupo no encontrado." };

    const oldParty = { ...party, memberIds: [...party.memberIds] };
    party.memberIds = party.memberIds.filter(id => id !== player.id);
    this.playerParties.delete(player.id);

    if (party.memberIds.length === 0) {
      this.parties.delete(partyId);
      return { ok: true, dissolved: true, oldParty };
    }

    if (party.leaderId === player.id) {
      party.leaderId = party.memberIds[0]; // New leader
    }

    return { ok: true, dissolved: false, oldParty };
  }
}
