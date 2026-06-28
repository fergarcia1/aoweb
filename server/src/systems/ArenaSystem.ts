import {
  ARENA_1V1_SLOTS,
  ARENA_COUNTDOWN_SECONDS,
  ARENA_READY_CHECK_MS,
  ARENA_ROUNDS_TO_WIN,
  areArenaLevelsCompatible,
  isArenaMode,
  type ArenaMode,
  type ArenaSlotConfig,
} from "../../../shared/arena";
import type { ClientArenaActionMessage, ServerMessage } from "../../../shared/protocol";
import type { Facing } from "../../../shared/types";
import { createEmptyPvpSpellHitRecords } from "../../../game-data/antiOneshot";
import type { PlayerSession } from "../PlayerSession";
import type { WorldContext } from "./WorldContext";

type QueueEntry = {
  playerId: string;
  queuedAtMs: number;
  level: number;
};

type ReturnPoint = {
  mapId: string;
  tileX: number;
  tileY: number;
  facing: Facing;
};

type ArenaMatchState = "ready_check" | "countdown" | "fighting" | "round_ended";

type ArenaMatch = {
  id: string;
  mode: "1v1";
  state: ArenaMatchState;
  playerIds: [string, string];
  acceptedIds: Set<string>;
  roundWins: Record<string, number>;
  returnPoints: Record<string, ReturnPoint>;
  readyExpiresAtMs: number;
  slot: ArenaSlotConfig | null;
  timers: ReturnType<typeof setTimeout>[];
};

export class ArenaSystem {
  private readonly queue1v1: QueueEntry[] = [];
  private readonly matches = new Map<string, ArenaMatch>();
  private readonly matchByPlayerId = new Map<string, string>();
  private readonly occupiedSlotIds = new Set<number>();
  private nextMatchId = 1;

  constructor(private readonly world: WorldContext) {}

  handleAction(session: PlayerSession, message: ClientArenaActionMessage): void {
    if (!session.joined) {
      return;
    }
    if (message.action === "join_queue") {
      this.joinQueue(session, message.mode);
      return;
    }
    if (message.action === "cancel_queue") {
      this.cancelForPlayer(session, "Saliste de la cola de arena.");
      return;
    }
    if (message.action === "ready_accept") {
      this.acceptReadyCheck(session);
      return;
    }
    if (message.action === "ready_cancel") {
      this.cancelReadyCheck(session);
    }
  }

  sendState(session: PlayerSession, message?: string): void {
    this.world.send(session, {
      type: "arena_state",
      state: this.buildState(session, message),
    });
  }

  cancelQueueForCombat(session: PlayerSession): void {
    if (this.queue1v1.some((entry) => entry.playerId === session.id)) {
      this.removeFromQueue(session.id);
      this.sendState(session, "Entraste en combate. Cola de arena cancelada.");
      this.sendArenaChat(session, "Entraste en combate. Cola de arena cancelada.");
      return;
    }
    const match = this.getMatchForPlayer(session.id);
    if (match?.state === "ready_check") {
      this.cancelReadyCheck(session, "Entraste en combate. Ready check cancelado.");
    }
  }

  canArenaPlayersFight(attackerId: string, defenderId: string): boolean {
    const match = this.getMatchForPlayer(attackerId);
    return Boolean(
      match &&
        match.state === "fighting" &&
        match.playerIds.includes(defenderId)
    );
  }

  canMoveWithinArena(session: PlayerSession, tileX: number, tileY: number): boolean {
    const match = this.getMatchForPlayer(session.id);
    if (!match?.slot || match.state === "ready_check") {
      return true;
    }
    // minTileX and maxTileX are the border tiles. We only allow movement INSIDE them.
    return (
      session.mapId === match.slot.mapId &&
      tileX > match.slot.minTileX &&
      tileX < match.slot.maxTileX &&
      tileY > match.slot.minTileY &&
      tileY < match.slot.maxTileY
    );
  }

  handlePlayerDefeated(
    attacker: PlayerSession,
    victim: PlayerSession,
    damage: number
  ): boolean {
    const match = this.getMatchForPlayer(victim.id);
    if (
      !match ||
      match.state !== "fighting"
    ) {
      return false;
    }

    const opponent = this.getOpponent(match, victim.id);
    if (!opponent?.joined) {
      return false;
    }
    const winner =
      match.playerIds.includes(attacker.id) && attacker.id !== victim.id
        ? attacker
        : opponent;
    const loser = victim;

    match.state = "round_ended";
    this.world.broadcastGameEvent(victim.mapId, victim.tileX, victim.tileY, {
      kind: "damage",
      targetKind: "player",
      targetId: victim.id,
      amount: Math.max(0, Math.floor(damage)),
      tileX: victim.tileX,
      tileY: victim.tileY,
      sourcePlayerId: attacker.id,
      sourceTileX: attacker.tileX,
      sourceTileY: attacker.tileY,
    });

    match.roundWins[winner.id] = (match.roundWins[winner.id] ?? 0) + 1;
    this.restoreRoundVitals(loser);
    this.restoreRoundVitals(winner);
    this.world.sendPlayerState(loser, { includeAttributeBuffs: true });
    this.world.sendPlayerState(winner, { includeAttributeBuffs: true });

    const scoreForWinner = this.getScore(match, winner.id);
    this.broadcastArenaRound(match, "round_won", `${winner.name} gana la ronda.`);
    this.broadcastArenaChat(
      match,
      `${winner.name} gana la ronda de arena (${scoreForWinner.you}-${scoreForWinner.opponent}).`
    );

    if ((match.roundWins[winner.id] ?? 0) >= ARENA_ROUNDS_TO_WIN) {
      this.finishMatch(match, winner.id);
      return true;
    }

    this.queueTimer(match, () => {
      this.startCountdown(match);
    }, 1_250);
    return true;
  }

  handlePlayerDisconnected(session: PlayerSession): void {
    const match = this.getMatchForPlayer(session.id);
    if (!match) {
      this.removeFromQueue(session.id);
      return;
    }
    if (match.state === "ready_check") {
      this.cancelReadyCheck(session, `${session.name} se desconecto.`);
      return;
    }
    const opponent = this.getOpponent(match, session.id);
    if (opponent) {
      this.broadcastArenaState(match, `${session.name} se desconecto. Tiene 10 segundos para volver.`);
    }
  }

  handlePlayerRemoved(playerId: string): void {
    this.removeFromQueue(playerId);
    const match = this.getMatchForPlayer(playerId);
    if (!match) {
      return;
    }
    if (match.state === "ready_check") {
      this.cancelReadyCheckById(playerId, "Ready check cancelado.");
      return;
    }
    const opponentId = match.playerIds.find((id) => id !== playerId);
    if (opponentId) {
      this.finishMatch(match, opponentId);
    } else {
      this.cleanupMatch(match);
    }
  }

  isPlayerInArena(playerId: string): boolean {
    return this.matchByPlayerId.has(playerId);
  }

  private joinQueue(session: PlayerSession, mode: ArenaMode | undefined): void {
    if (!isArenaMode(mode)) {
      this.sendState(session, "Modo de arena invalido.");
      return;
    }
    if (mode !== "1v1") {
      this.sendState(session, "Ese modo todavia no esta disponible.");
      return;
    }
    if (session.isDead || session.hp <= 0) {
      this.sendState(session, "No podes entrar a arena estando muerto.");
      return;
    }
    if (this.matchByPlayerId.has(session.id)) {
      this.sendState(session, "Ya estas en una arena.");
      return;
    }
    if (this.queue1v1.some((entry) => entry.playerId === session.id)) {
      this.sendState(session, "Ya estas en cola 1v1.");
      return;
    }

    const opponentEntry = this.queue1v1.find((entry) => {
      const opponent = this.world.getPlayers().get(entry.playerId);
      return (
        opponent?.joined &&
        opponent.id !== session.id &&
        areArenaLevelsCompatible(opponent.level, session.level)
      );
    });

    if (opponentEntry) {
      this.removeFromQueue(opponentEntry.playerId);
      const opponent = this.world.getPlayers().get(opponentEntry.playerId);
      if (opponent?.joined) {
        this.createReadyCheck(opponent, session);
        return;
      }
    }

    this.queue1v1.push({
      playerId: session.id,
      level: session.level,
      queuedAtMs: Date.now(),
    });
    this.sendState(session, "Estas en cola para arenas 1v1.");
  }

  private createReadyCheck(a: PlayerSession, b: PlayerSession): void {
    const match: ArenaMatch = {
      id: `arena-${this.nextMatchId++}`,
      mode: "1v1",
      state: "ready_check",
      playerIds: [a.id, b.id],
      acceptedIds: new Set(),
      roundWins: { [a.id]: 0, [b.id]: 0 },
      returnPoints: {
        [a.id]: this.captureReturnPoint(a),
        [b.id]: this.captureReturnPoint(b),
      },
      readyExpiresAtMs: Date.now() + ARENA_READY_CHECK_MS,
      slot: null,
      timers: [],
    };
    this.matches.set(match.id, match);
    this.matchByPlayerId.set(a.id, match.id);
    this.matchByPlayerId.set(b.id, match.id);
    this.queueTimer(match, () => this.handleReadyTimeout(match), ARENA_READY_CHECK_MS);
    this.sendReadyCheck(match, a);
    this.sendReadyCheck(match, b);
  }

  private acceptReadyCheck(session: PlayerSession): void {
    const match = this.getMatchForPlayer(session.id);
    if (!match || match.state !== "ready_check") {
      this.sendState(session, "No tenes ready check activo.");
      return;
    }
    match.acceptedIds.add(session.id);
    this.sendState(session, "Aceptaste. Esperando al rival...");
    if (match.acceptedIds.size >= match.playerIds.length) {
      this.startMatch(match);
    }
  }

  private cancelReadyCheck(session: PlayerSession, reason = "Cancelaste la arena."): void {
    this.cancelReadyCheckById(session.id, reason);
  }

  private cancelReadyCheckById(playerId: string, reason: string): void {
    const match = this.getMatchForPlayer(playerId);
    if (!match || match.state !== "ready_check") {
      const player = this.world.getPlayers().get(playerId);
      if (player) {
        this.removeFromQueue(playerId);
        this.sendState(player, reason);
      }
      return;
    }

    const canceled = this.world.getPlayers().get(playerId);
    if (canceled) {
      this.sendState(canceled, reason);
    }
    const otherId = match.playerIds.find((id) => id !== playerId);
    this.cleanupMatch(match);
    if (!otherId) {
      return;
    }
    const other = this.world.getPlayers().get(otherId);
    if (other?.joined) {
      this.queue1v1.push({
        playerId: other.id,
        level: other.level,
        queuedAtMs: Date.now(),
      });
      this.sendState(other, "El rival cancelo. Seguis buscando 1v1...");
    }
  }

  private handleReadyTimeout(match: ArenaMatch): void {
    if (match.state !== "ready_check" || !this.matches.has(match.id)) {
      return;
    }
    const accepted = [...match.acceptedIds];
    const allPlayers = [...match.playerIds];
    this.cleanupMatch(match);
    for (const playerId of allPlayers) {
      const player = this.world.getPlayers().get(playerId);
      if (!player?.joined) continue;
      if (accepted.includes(playerId)) {
        this.queue1v1.push({ playerId, level: player.level, queuedAtMs: Date.now() });
        this.sendState(player, "El rival no acepto. Seguis buscando 1v1...");
      } else {
        this.sendState(player, "Ready check expirado.");
      }
    }
  }

  private startMatch(match: ArenaMatch): void {
    const slot = this.reserveSlot();
    if (!slot) {
      this.broadcastArenaState(match, "No hay slots de arena libres. Seguis buscando.");
      const players = this.getMatchPlayers(match);
      this.cleanupMatch(match);
      for (const player of players) {
        this.queue1v1.push({ playerId: player.id, level: player.level, queuedAtMs: Date.now() });
        this.sendState(player, "No hay slots libres. Seguis en cola 1v1...");
      }
      return;
    }
    match.slot = slot;
    this.startCountdown(match);
  }

  private startCountdown(match: ArenaMatch): void {
    if (!match.slot || !this.matches.has(match.id)) {
      return;
    }
    match.state = "countdown";
    this.broadcastArenaState(match);
    const [a, b] = this.getMatchPlayers(match);
    if (!a || !b) {
      this.cleanupMatch(match);
      return;
    }

    this.restoreRoundVitals(a);
    this.restoreRoundVitals(b);
    const until = Date.now() + (ARENA_COUNTDOWN_SECONDS + 1) * 1_000;
    a.immobilizedUntil = until;
    b.immobilizedUntil = until;
    this.world.teleportPlayerToArena(a, match.slot.mapId, match.slot.spawnA);
    this.world.teleportPlayerToArena(b, match.slot.mapId, match.slot.spawnB);
    this.world.sendPlayerState(a, { includeAttributeBuffs: true });
    this.world.sendPlayerState(b, { includeAttributeBuffs: true });

    for (let seconds = ARENA_COUNTDOWN_SECONDS; seconds >= 1; seconds -= 1) {
      const delay = (ARENA_COUNTDOWN_SECONDS - seconds) * 1_000;
      this.queueTimer(match, () => {
        this.broadcastArenaRound(match, "countdown", `El duelo comienza en ${seconds}...`, seconds);
        this.broadcastArenaChat(match, `El duelo comienza en ${seconds}...`);
      }, delay);
    }
    this.queueTimer(match, () => this.startRound(match), ARENA_COUNTDOWN_SECONDS * 1_000);
  }

  private startRound(match: ArenaMatch): void {
    if (!this.matches.has(match.id)) {
      return;
    }
    match.state = "fighting";
    this.broadcastArenaState(match);
    for (const player of this.getMatchPlayers(match)) {
      player.clearImmobilized();
      this.world.sendPlayerState(player, { includeAttributeBuffs: true });
    }
    this.broadcastArenaRound(match, "started", "Arena iniciada.");
    this.broadcastArenaChat(match, "Arena iniciada.");
  }

  private finishMatch(match: ArenaMatch, winnerId: string): void {
    const winner = this.world.getPlayers().get(winnerId);
    const loserId = match.playerIds.find((id) => id !== winnerId);
    const loser = loserId ? this.world.getPlayers().get(loserId) : undefined;
    if (winner?.joined) {
      winner.arenaWins1v1 += 1;
      this.restoreRoundVitals(winner);
      this.world.sendPlayerState(winner, { includeAttributeBuffs: true });
      this.world.persistSession(winner);
    }
    if (loser?.joined) {
      this.restoreRoundVitals(loser);
      this.world.sendPlayerState(loser, { includeAttributeBuffs: true });
      this.world.persistSession(loser);
    }

    if (winner) {
      this.world.send(winner, {
        type: "arena_round",
        mode: "1v1",
        status: "match_won",
        score: this.getScore(match, winner.id),
        opponent: loser ? this.toSummary(loser) : undefined,
        message: "Ganaste la arena 1v1.",
      });
    }
    if (loser) {
      this.world.send(loser, {
        type: "arena_round",
        mode: "1v1",
        status: "match_lost",
        score: this.getScore(match, loser.id),
        opponent: winner ? this.toSummary(winner) : undefined,
        message: winner ? `${winner.name} gano la arena 1v1.` : "Perdiste la arena 1v1.",
      });
    }

    const players = this.getMatchPlayers(match);
    this.cleanupMatch(match);
    for (const player of players) {
      const point = match.returnPoints[player.id];
      if (point) {
        this.world.teleportPlayerToArena(player, point.mapId, point);
      }
      this.sendState(
        player,
        player.id === winnerId ? "Ganaste la arena 1v1." : "Perdiste la arena 1v1."
      );
    }
  }

  private cancelForPlayer(session: PlayerSession, reason: string): void {
    if (this.removeFromQueue(session.id)) {
      this.sendState(session, reason);
      return;
    }
    const match = this.getMatchForPlayer(session.id);
    if (match?.state === "ready_check") {
      this.cancelReadyCheck(session, reason);
      return;
    }
    this.sendState(session, "No estas en cola.");
  }

  private buildState(session: PlayerSession, message?: string): import("../../../shared/arena").ArenaStatePayload {
    const queued = this.queue1v1.some((entry) => entry.playerId === session.id);
    const match = this.getMatchForPlayer(session.id);
    if (match) {
      const opponent = this.getOpponent(match, session.id);
      const status =
        match.state === "ready_check" && match.acceptedIds.has(session.id)
          ? "accepted"
          : match.state === "ready_check"
            ? "ready_check"
            : match.state === "countdown"
              ? "countdown"
              : match.state === "fighting"
                ? "fighting"
                : "round_ended";
      return {
        status,
        mode: match.mode,
        wins1v1: session.arenaWins1v1,
        queueSize1v1: this.queue1v1.length,
        readyCheckExpiresAtMs:
          match.state === "ready_check" ? match.readyExpiresAtMs : undefined,
        opponent: opponent ? this.toSummary(opponent) : undefined,
        score: this.getScore(match, session.id),
        message,
      };
    }
    return {
      status: queued ? "queued" : "idle",
      mode: queued ? "1v1" : null,
      wins1v1: session.arenaWins1v1,
      queueSize1v1: this.queue1v1.length,
      message,
    };
  }

  private broadcastArenaState(match: ArenaMatch, message?: string): void {
    for (const player of this.getMatchPlayers(match)) {
      this.sendState(player, message);
    }
  }

  private sendReadyCheck(match: ArenaMatch, session: PlayerSession): void {
    const opponent = this.getOpponent(match, session.id);
    if (!opponent) {
      return;
    }
    this.world.send(session, {
      type: "arena_ready_check",
      mode: "1v1",
      opponent: this.toSummary(opponent),
      expiresAtMs: match.readyExpiresAtMs,
    });
    this.sendState(session);
  }

  private broadcastArenaRound(
    match: ArenaMatch,
    status: Extract<ServerMessage, { type: "arena_round" }>["status"],
    message?: string,
    secondsLeft?: number
  ): void {
    for (const player of this.getMatchPlayers(match)) {
      this.world.send(player, {
        type: "arena_round",
        mode: "1v1",
        status,
        secondsLeft,
        score: this.getScore(match, player.id),
        opponent: this.getOpponent(match, player.id)
          ? this.toSummary(this.getOpponent(match, player.id)!)
          : undefined,
        message,
      });
      this.sendState(player);
    }
  }

  private sendArenaChat(session: PlayerSession, text: string): void {
    this.world.send(session, {
      type: "chat",
      from: "Arenas",
      text,
    });
  }

  private broadcastArenaChat(match: ArenaMatch, text: string): void {
    for (const player of this.getMatchPlayers(match)) {
      this.sendArenaChat(player, text);
    }
  }

  private getScore(match: ArenaMatch, playerId: string): { you: number; opponent: number } {
    const opponentId = match.playerIds.find((id) => id !== playerId);
    return {
      you: match.roundWins[playerId] ?? 0,
      opponent: opponentId ? match.roundWins[opponentId] ?? 0 : 0,
    };
  }

  private getMatchForPlayer(playerId: string): ArenaMatch | undefined {
    const matchId = this.matchByPlayerId.get(playerId);
    return matchId ? this.matches.get(matchId) : undefined;
  }

  private getMatchPlayers(match: ArenaMatch): PlayerSession[] {
    return match.playerIds
      .map((id) => this.world.getPlayers().get(id))
      .filter((player): player is PlayerSession => Boolean(player?.joined));
  }

  private getOpponent(match: ArenaMatch, playerId: string): PlayerSession | undefined {
    const opponentId = match.playerIds.find((id) => id !== playerId);
    return opponentId ? this.world.getPlayers().get(opponentId) : undefined;
  }

  private reserveSlot(): ArenaSlotConfig | null {
    const slot = ARENA_1V1_SLOTS.find((candidate) => !this.occupiedSlotIds.has(candidate.id));
    if (!slot) {
      return null;
    }
    this.occupiedSlotIds.add(slot.id);
    return slot;
  }

  private cleanupMatch(match: ArenaMatch): void {
    for (const timer of match.timers) {
      clearTimeout(timer);
    }
    match.timers = [];
    if (match.slot) {
      this.occupiedSlotIds.delete(match.slot.id);
    }
    this.matches.delete(match.id);
    for (const playerId of match.playerIds) {
      this.matchByPlayerId.delete(playerId);
    }
  }

  private queueTimer(match: ArenaMatch, callback: () => void, delayMs: number): void {
    const timer = setTimeout(callback, delayMs);
    match.timers.push(timer);
  }

  private removeFromQueue(playerId: string): boolean {
    const index = this.queue1v1.findIndex((entry) => entry.playerId === playerId);
    if (index < 0) {
      return false;
    }
    this.queue1v1.splice(index, 1);
    return true;
  }

  private restoreRoundVitals(session: PlayerSession): void {
    session.hp = session.hpMax;
    session.mp = session.mpMax;
    session.isDead = false;
    session.deathLootProcessed = false;
    session.recentPvpSpellHits = createEmptyPvpSpellHitRecords();
    session.clearImmobilized();
    session.clearInvisible();
    session.attributeBuffs = { strength: 0, agility: 0, expiresAtMs: 0 };
    session.recalcAttackStats();
  }

  private captureReturnPoint(session: PlayerSession): ReturnPoint {
    return {
      mapId: session.mapId,
      tileX: session.tileX,
      tileY: session.tileY,
      facing: session.facing,
    };
  }

  private toSummary(session: PlayerSession): { id: string; name: string; level: number } {
    return {
      id: session.id,
      name: session.name,
      level: session.level,
    };
  }
}
