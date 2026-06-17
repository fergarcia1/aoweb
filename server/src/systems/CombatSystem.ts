import type { PlayerSession } from "../PlayerSession";
import type { MobEntity } from "../MobEntity";
import type { WorldContext } from "./WorldContext";
import { ATTRIBUTE_POTION_BUFF_DURATION_MS, ATTRIBUTE_POTION_BUFF_MAX } from "../../../game-data/constants";
import { INVISIBILITY_DURATION_MS } from "../../../game-data/invisibility";
import {
  RESURRECT_CHANNEL_MS,
  RESURRECT_MAX_TILE_DISTANCE,
  RESURRECT_REVIVE_HP_RATIO,
  RESURRECT_SPELL_ID,
  isResurrectSpellId,
  isWithinResurrectRange,
} from "../../../game-data/resurrect";
import {
  getSpellBehavior,
  isAllyStatBuffSpell,
  isInvisibilitySpell,
  isRemoveImmobilizeSpell,
  isResurrectSpell,
  TARGET_NOT_IMMOBILIZED_MESSAGE,
} from "../../../game-data/spellBehaviors";
import {
  applyAntiOneshotToSpellDamage,
  createEmptyPvpSpellHitRecords,
} from "../../../game-data/antiOneshot";
import { mitigatePhysicalDamage } from "../../../game-data/physicalDamageMitigation";
import { MECHANICS } from "../../../shared/gameMechanics";
import { SAFE_ZONE_MAP_IDS } from "../../../game-data/constants";
import {
  ATTACK_COOLDOWN_MS,
  getImmobilizeMobDurationMs,
  getImmobilizePlayerDurationMs,
  getSpellDefinition,
  isAdjacent,
  isImmobilizeSpell,
  rollAttackDamage,
  rollInt,
} from "../../../shared/combat";
import { mobTargetFootprintOccupiesTile } from "../../../shared/mobFootprint";
import { spellRequiresAnilloEspectral } from "../../../game-data/spells";
import { validateAttackIntent } from "../../../shared/multiplayerIntents";
import { canFactionsFight, normalizeFactionId } from "../../../shared/faction";
import type { ServerMessage } from "../../../shared/protocol";

const INMOVILIZAR_SPELL_ID = 8;

type ResurrectChannelState = {
  casterId: string;
  targetId: string;
  mapId: string;
  endsAtMs: number;
  /** Tile del clic del cliente (tolerancia de desync con el fantasma). */
  clickTileX: number;
  clickTileY: number;
};

export class CombatSystem {
  private readonly resurrectChannels = new Map<string, ResurrectChannelState>();

  constructor(private readonly world: WorldContext) {}

  private canFactionsFight(attackerFaction: string, defenderFaction: string): boolean {
    return canFactionsFight(
      normalizeFactionId(attackerFaction),
      normalizeFactionId(defenderFaction)
    );
  }

  private canAttackMob(session: PlayerSession, mob: MobEntity, silent: boolean = false): boolean {
    if (mob.aggroTargetId && mob.aggroTargetId !== session.id) {
      if (!this.world.areInSameParty(session.id, mob.aggroTargetId)) {
        if (!silent) {
          this.world.sendCombatLog(session, "Ese mob está peleando con otra persona.");
        }
        return false;
      }
    }
    mob.aggroUpdatedAt = Date.now();
    return true;
  }

  public tickResurrectChannels(): void {
    const now = Date.now();
    for (const [casterId, channel] of [...this.resurrectChannels.entries()]) {
      if (!this.isResurrectChannelValid(channel, now)) {
        this.cancelResurrectChannel(channel, "La resurrección se interrumpió.");
        continue;
      }
      if (now >= channel.endsAtMs) {
        this.completeResurrectChannel(channel);
        this.resurrectChannels.delete(casterId);
      }
    }
  }

  public cancelResurrectForPlayer(playerId: string): void {
    const channel = this.resurrectChannels.get(playerId);
    if (channel) {
      this.cancelResurrectChannel(channel, "La resurrección se interrumpió.");
      return;
    }
    for (const [casterId, active] of this.resurrectChannels.entries()) {
      if (active.targetId === playerId) {
        this.cancelResurrectChannel(active, "El objetivo ya no puede ser resucitado.");
        this.resurrectChannels.delete(casterId);
      }
    }
  }

  public handleAttack(session: PlayerSession) {
    const now = Date.now();
    if (!validateAttackIntent(now, session.nextAttackAt).ok) return;
    
    session.nextAttackAt = now + MECHANICS.INTERVAL_MELEE_ATTACK;
    session.nextSpellAt = Math.max(session.nextSpellAt, now + MECHANICS.INTERVAL_MELEE_TO_SPELL);

    if (session.hp <= 0) {
      this.world.sendCombatLog(session, "Estás muerto.");
      return;
    }

    const front = this.getFrontTile(session);

    const targetPlayer = this.findPlayerAtTile(session.mapId, front.x, front.y, session.id);
    if (targetPlayer) {
      if (this.isInSafeZone(session)) {
        this.world.sendCombatLog(session, "No podés atacar jugadores en zona segura.");
        return;
      }
      if (this.isInSafeZone(targetPlayer)) {
        this.world.sendCombatLog(session, "Esta es zona segura.");
        return;
      }
      const attackerFaction = normalizeFactionId(session.factionId);
      const defenderFaction = normalizeFactionId(targetPlayer.factionId);
      if (!canFactionsFight(attackerFaction, defenderFaction)) {
        this.world.sendCombatLog(session, "No podés atacar a este jugador (misma facción o alianza).");
        return;
      }
      session.nextAttackAt = now + ATTACK_COOLDOWN_MS;
      const roll = rollAttackDamage(session.attackMin, session.attackMax, {
        canCrit: session.canCrit,
        critChance: session.critChance,
        critDamage: session.critDamage,
      });
      this.applyDamageToPlayer(session, targetPlayer, roll.damage);
      if (roll.isCrit) {
        this.world.sendCombatLog(session, "Golpe critico!");
      }
      return;
    }

    const targetMob = this.findMobAtTile(session.mapId, front.x, front.y);
    if (targetMob && targetMob.alive) {
      if (!this.canAttackMob(session, targetMob)) return;

      session.nextAttackAt = now + ATTACK_COOLDOWN_MS;
      const roll = rollAttackDamage(session.attackMin, session.attackMax, {
        canCrit: session.canCrit,
        critChance: session.critChance,
        critDamage: session.critDamage,
      });
      this.applyDamageToMob(session, targetMob, roll.damage);
      if (roll.isCrit) {
        this.world.sendCombatLog(session, "Golpe critico!");
      }
      return;
    }

    this.world.sendCombatLog(session, "No hay nadie para golpear.");
  }

  private getPlayersInRange(
    mapId: string,
    tileX: number,
    tileY: number,
    radius: number,
    exceptId?: string
  ): PlayerSession[] {
    const players: PlayerSession[] = [];
    for (const player of this.world.getPlayers().values()) {
      if (!player.joined || player.mapId !== mapId || player.id === exceptId) continue;
      if (player.hp <= 0) continue;
      const dx = Math.abs(player.tileX - tileX);
      const dy = Math.abs(player.tileY - tileY);
      if (dx <= radius && dy <= radius) {
        players.push(player);
      }
    }
    return players;
  }

  private getMobsInRange(
    mapId: string,
    tileX: number,
    tileY: number,
    radius: number
  ): MobEntity[] {
    const mobs: MobEntity[] = [];
    for (const mob of this.world.getMobs().values()) {
      if (!mob.alive || mob.mapId !== mapId) continue;
      const dx = Math.abs(mob.tileX - tileX);
      const dy = Math.abs(mob.tileY - tileY);
      if (dx <= radius && dy <= radius) {
        mobs.push(mob);
      }
    }
    return mobs;
  }

  private handleAoECast(
    session: PlayerSession,
    spell: NonNullable<ReturnType<typeof getSpellDefinition>>,
    targetTileX: number,
    targetTileY: number
  ) {
    session.mp -= spell.manaCost;
    this.world.sendPlayerState(session, { includeAttributeBuffs: true });

    this.world.broadcastGameEvent(session.mapId, targetTileX, targetTileY, {
      kind: "spell_fx",
      spellId: spell.idSpell,
      tileX: targetTileX,
      tileY: targetTileY,
      sourcePlayerId: session.id,
      sourceTileX: session.tileX,
      sourceTileY: session.tileY,
    });

    const players = this.getPlayersInRange(
      session.mapId,
      targetTileX,
      targetTileY,
      spell.aoeRadiusTiles
    );
    const mobs = this.getMobsInRange(
      session.mapId,
      targetTileX,
      targetTileY,
      spell.aoeRadiusTiles
    );

    for (const player of players) {
      this.applySpellEffectsToTarget(session, spell, undefined, player, targetTileX, targetTileY, true);
    }
    for (const mob of mobs) {
      this.applySpellEffectsToTarget(session, spell, mob, undefined, targetTileX, targetTileY, true);
    }
  }

  private applySpellEffectsToTarget(
    session: PlayerSession,
    spell: NonNullable<ReturnType<typeof getSpellDefinition>>,
    targetMob: MobEntity | undefined,
    targetPlayer: PlayerSession | undefined,
    targetTileX: number,
    targetTileY: number,
    isAoE: boolean = false
  ): boolean {
    const spellId = spell.idSpell;
    const targetsSelf = targetPlayer?.id === session.id;
    const onCasterTile = this.isTileOnCaster(session, targetTileX, targetTileY);
    const allyStatBuff = isAllyStatBuffSpell(spellId) && spell.puedeUsarseEnAliados;

    const healTarget = this.resolveHealTarget(
      session,
      spell,
      targetPlayer,
      targetsSelf,
      targetTileX,
      targetTileY
    );
    let healRestored = 0;
    if (healTarget) {
      const heal = rollInt(spell.healMin, spell.healMax);
      const before = healTarget.hp;
      healTarget.hp = Math.min(healTarget.hpMax, healTarget.hp + heal);
      healRestored = healTarget.hp - before;

      this.world.broadcastGameEvent(session.mapId, healTarget.tileX, healTarget.tileY, {
        kind: "heal",
        targetKind: "player",
        targetId: healTarget.id,
        amount: healRestored,
        tileX: healTarget.tileX,
        tileY: healTarget.tileY,
        sourcePlayerId: session.id,
        sourceTileX: session.tileX,
        sourceTileY: session.tileY,
      });

      // Send player_updated to AOI so other players see the updated HP bar above head
      this.world.broadcastToAoi(healTarget.mapId, healTarget.tileX, healTarget.tileY, {
        type: "player_updated",
        player: healTarget.toNetState(),
      });
      // Send player_updated to the healed player themselves
      this.world.send(healTarget, { type: "player_updated", player: healTarget.toNetState() });
      // Notify party of the HP change
      this.world.notifyPartyOfHpChange(healTarget.id);
    }

    const invisTarget = isInvisibilitySpell(spellId)
      ? this.resolveInvisibilityTarget(
          session,
          spell,
          targetPlayer,
          targetsSelf,
          targetTileX,
          targetTileY
        )
      : undefined;
    if (invisTarget) {
      const until = Date.now() + INVISIBILITY_DURATION_MS;
      invisTarget.invisibleUntil = Math.max(invisTarget.invisibleUntil, until);
    }

    let allyStatBuffApplied = false;
    if (allyStatBuff) {
      const buffTarget = this.resolveSpellBuffTarget(
        session,
        spell,
        targetPlayer,
        targetsSelf,
        targetTileX,
        targetTileY
      );
      if (buffTarget) {
        allyStatBuffApplied = this.applySpellBuffsToPlayer(
          session,
          buffTarget,
          spellId,
          spell.nombre
        );
      }
    }

    const vitalsNotifyTarget =
      healTarget && invisTarget && healTarget.id !== invisTarget.id
        ? healTarget
        : healTarget ?? invisTarget;
    if (vitalsNotifyTarget) {
      this.syncPlayersAfterSpellCast(session, vitalsNotifyTarget);
    }
    if (invisTarget && invisTarget.id !== session.id && invisTarget.id !== healTarget?.id) {
      this.world.sendPlayerState(invisTarget);
    }

    if (healTarget) {
      const logText =
        healTarget.id === session.id
          ? `${session.name}: ${spell.nombre} te cura ${healRestored} HP.`
          : `${session.name}: ${spell.nombre} cura ${healRestored} HP a ${healTarget.name}.`;
      this.world.broadcastCombatLog(
        session.mapId,
        healTarget.tileX,
        healTarget.tileY,
        logText
      );
    }

    if (invisTarget) {
      const logText =
        invisTarget.id === session.id
          ? `${session.name}: ${spell.nombre} te vuelve invisible.`
          : `${session.name}: ${spell.nombre} vuelve invisible a ${invisTarget.name}.`;
      this.world.broadcastCombatLog(
        session.mapId,
        invisTarget.tileX,
        invisTarget.tileY,
        logText
      );
    }

    if (allyStatBuffApplied) {
      return true;
    }
    if (healTarget || invisTarget) {
      return true;
    }

    const spellBehavior = getSpellBehavior(spellId);
    if (spellBehavior?.removeAllEffects) {
      if (targetsSelf) {
        session.clearImmobilized();
        session.clearInvisible();
        session.attributeBuffs = { strength: 0, agility: 0, expiresAtMs: 0 };
        this.world.sendPlayerState(session, { includeAttributeBuffs: true });
        this.world.broadcastCombatLog(
          session.mapId,
          session.tileX,
          session.tileY,
          `${session.name}: ${spell.nombre} remueve todos los efectos mágicos.`
        );
        return true;
      }
    }

    if (targetMob && isImmobilizeSpell(spellId)) {
      if (!this.canAttackMob(session, targetMob, isAoE)) return false;

      const durationMs = getImmobilizeMobDurationMs(spellId);
      targetMob.immobilizedUntil = Math.max(
        targetMob.immobilizedUntil,
        Date.now() + durationMs
      );
      const label = spellId === INMOVILIZAR_SPELL_ID ? "inmoviliza" : "paraliza";
      this.world.broadcastCombatLog(
        session.mapId,
        targetMob.tileX,
        targetMob.tileY,
        `${session.name}: ${spell.nombre} ${label} a ${targetMob.name}.`
      );
      this.world.broadcastMobUpdated(targetMob);
      return true;
    }

    if (isRemoveImmobilizeSpell(spellId)) {
      if (
        this.applyRemoveImmobilize(
          session,
          spell,
          targetMob,
          targetPlayer,
          targetsSelf,
          onCasterTile
        )
      ) {
        return true;
      }
    }

    if (targetPlayer && isImmobilizeSpell(spellId)) {
      if (targetsSelf && !spell.puedeUsarseEnAliados) return false;
      if (this.isInSafeZone(session) || this.isInSafeZone(targetPlayer)) {
        if (!isAoE) this.world.sendCombatLog(session, "Esta es zona segura.");
        return false;
      }
      const attackerFaction = normalizeFactionId(session.factionId);
      const defenderFaction = normalizeFactionId(targetPlayer.factionId);
      if (!canFactionsFight(attackerFaction, defenderFaction)) {
        if (!isAoE) this.world.sendCombatLog(session, "No podés atacar a este jugador (misma facción o alianza).");
        return false;
      }
      const durationMs = getImmobilizePlayerDurationMs(spellId);
      targetPlayer.immobilizedUntil = Math.max(
        targetPlayer.immobilizedUntil,
        Date.now() + durationMs
      );
      const label = spellId === INMOVILIZAR_SPELL_ID ? "inmoviliza" : "paraliza";
      this.world.broadcastCombatLog(
        session.mapId,
        targetPlayer.tileX,
        targetPlayer.tileY,
        `${session.name}: ${spell.nombre} ${label} a ${targetPlayer.name}.`
      );
      this.world.sendPlayerState(targetPlayer);
      return true;
    }

    if (targetMob && (spell.danioMax > 0 || spell.danioMin > 0)) {
      if (spell.puedeUsarseEnAliados) return false;
      if (!this.canAttackMob(session, targetMob, isAoE)) return false;

      const base = rollInt(spell.danioMin, spell.danioMax);
      const damage = Math.max(
        0,
        Math.floor(base * (1 + session.magicDamageBonusPercent))
      );
      this.applyDamageToMob(session, targetMob, damage, spell.nombre);
      return true;
    }

    if (targetPlayer && (spell.danioMax > 0 || spell.danioMin > 0)) {
      if (targetsSelf && !spell.puedeUsarseEnAliados) return false;
      if (this.isInSafeZone(session) || this.isInSafeZone(targetPlayer)) {
        if (!isAoE) this.world.sendCombatLog(session, "Esta es zona segura.");
        return false;
      }
      const attackerFaction = normalizeFactionId(session.factionId);
      const defenderFaction = normalizeFactionId(targetPlayer.factionId);
      if (!canFactionsFight(attackerFaction, defenderFaction)) {
        if (!isAoE) this.world.sendCombatLog(session, "No podés atacar a este jugador (misma facción o alianza).");
        return false;
      }
      const base = rollInt(spell.danioMin, spell.danioMax);
      const damage = Math.max(
        0,
        Math.floor(base * (1 + session.magicDamageBonusPercent))
      );
      this.applyDamageToPlayer(session, targetPlayer, damage, spell.nombre);
      return true;
    }

    if (spell.remueveDebuff && !isRemoveImmobilizeSpell(spellId)) {
      this.world.broadcastCombatLog(
        session.mapId,
        session.tileX,
        session.tileY,
        `${session.name}: ${spell.nombre} remueve ${spell.remueveDebuff}.`
      );
      return true;
    }

    const debuffBehavior = getSpellBehavior(spellId);
    if (debuffBehavior?.buffEffects?.length && !spell.puedeUsarseEnAliados) {
      const buffTarget = this.resolveSpellBuffTarget(
        session,
        spell,
        targetPlayer,
        targetsSelf,
        targetTileX,
        targetTileY
      );
      if (buffTarget && this.applySpellBuffsToPlayer(session, buffTarget, spellId, spell.nombre)) {
        return true;
      }
    }

    return false;
  }

  public handleCastSpell(
    session: PlayerSession,
    spellIdRaw: number,
    targetTileX: number,
    targetTileY: number,
    targetPlayerId?: string
  ) {
    const now = Date.now();
    const spellId = this.resolveIncomingSpellId(spellIdRaw);
    if (!Number.isFinite(spellId)) {
      this.world.sendCombatLog(session, "Hechizo inválido.");
      return;
    }

    if (session.isDead || session.hp <= 0) {
      this.world.sendCombatLog(session, "Estás muerto.");
      return;
    }

    if (this.tryHandleResurrectCast(session, spellId, targetTileX, targetTileY, targetPlayerId)) {
      return;
    }

    const spell = getSpellDefinition(spellId);
    if (!spell) {
      this.world.sendCombatLog(session, "Hechizo desconocido.");
      return;
    }

    const castRequirementError = this.validateSpellCastRequirements(session, spell);
    if (castRequirementError) {
      this.world.sendCombatLog(session, castRequirementError);
      return;
    }

    if (session.mp < spell.manaCost) {
      this.world.sendCombatLog(
        session,
        `No tenés suficiente maná para ${spell.nombre} (${session.mp}/${spell.manaCost}).`
      );
      return;
    }

    if (now < session.nextSpellAt) {
      this.world.sendCombatLog(session, "No podés lanzar el hechizo tan rápido.");
      return;
    }

    if (spell.aoe) {
      session.nextSpellAt = now + MECHANICS.INTERVAL_SPELL_CAST;
      this.handleAoECast(session, spell, targetTileX, targetTileY);
      return;
    }

    const targetMob = this.findMobAtTile(session.mapId, targetTileX, targetTileY);
    const targetPlayer = this.findPlayerAtTile(session.mapId, targetTileX, targetTileY, session.id);
    const targetsSelf =
      targetTileX === session.tileX && targetTileY === session.tileY;
    const onCasterTile = this.isTileOnCaster(session, targetTileX, targetTileY);
    const allyStatBuff = isAllyStatBuffSpell(spellId) && spell.puedeUsarseEnAliados;

    if (targetsSelf) {
      if (!spell.puedeUsarseEnAliados && (spell.healMax > 0 || spell.healMin > 0)) {
        this.world.sendCombatLog(session, `${spell.nombre} no puede lanzarse sobre vos.`);
        return;
      }
    } else if (!targetMob && !targetPlayer) {
      const canSelfTarget =
        (allyStatBuff ||
          isRemoveImmobilizeSpell(spellId) ||
          isInvisibilitySpell(spellId) ||
          (spell.healMax > 0 || spell.healMin > 0)) &&
        onCasterTile &&
        spell.puedeUsarseEnAliados;
      if (!canSelfTarget) {
        this.world.sendCombatLog(session, "No hay objetivo en ese tile.");
        return;
      }
    } else if (!targetMob && targetPlayer && spell.healMax > 0 && spell.danioMax === 0 && spell.danioMin === 0) {
      if (this.canFactionsFight(session.factionId, targetPlayer.factionId)) {
        this.world.sendCombatLog(session, `${spell.nombre} no puede lanzarse sobre enemigos.`);
        return;
      }
    } else if (targetMob && spell.healMax > 0 && spell.danioMax === 0 && spell.danioMin === 0) {
      this.world.sendCombatLog(session, `${spell.nombre} no puede lanzarse sobre enemigos.`);
      return;
    }

    if (isRemoveImmobilizeSpell(spellId)) {
      const removeError = this.validateRemoveImmobilizeCast(
        session,
        spell,
        targetMob,
        targetPlayer,
        targetsSelf,
        onCasterTile
      );
      if (removeError) {
        this.world.sendCombatLog(session, removeError);
        return;
      }
    }

    session.mp -= spell.manaCost;
    const applied = this.applySpellEffectsToTarget(
      session,
      spell,
      targetMob,
      targetPlayer,
      targetTileX,
      targetTileY
    );
    if (!applied) {
      session.mp += spell.manaCost;
      return;
    }

    session.nextSpellAt = now + MECHANICS.INTERVAL_SPELL_CAST;
    this.world.broadcastGameEvent(session.mapId, targetTileX, targetTileY, {
      kind: "spell_fx",
      spellId,
      tileX: targetTileX,
      tileY: targetTileY,
      sourcePlayerId: session.id,
      sourceTileX: session.tileX,
      sourceTileY: session.tileY,
    });
    this.world.sendPlayerState(session, { includeAttributeBuffs: true });
  }

  private isTileOnCaster(
    session: PlayerSession,
    tileX: number,
    tileY: number
  ): boolean {
    if (session.tileX === tileX && session.tileY === tileY) {
      return true;
    }
    return isAdjacent(session.tileX, session.tileY, tileX, tileY);
  }

  private validateRemoveImmobilizeCast(
    session: PlayerSession,
    spell: NonNullable<ReturnType<typeof getSpellDefinition>>,
    targetMob: MobEntity | undefined,
    targetPlayer: PlayerSession | undefined,
    targetsSelf: boolean,
    onCasterTile: boolean
  ): string | null {
    if (!spell.puedeUsarseEnAliados) {
      return `${spell.nombre} no puede lanzarse sobre ese objetivo.`;
    }

    if (targetMob) {
      return `${spell.nombre} no puede lanzarse sobre NPCs.`;
    }
    if (targetPlayer?.isImmobilized()) {
      if (
        spell.puedeUsarseEnAliados &&
        this.canFactionsFight(session.factionId, targetPlayer.factionId)
      ) {
        return `${spell.nombre} no puede lanzarse sobre enemigos.`;
      }
      return null;
    }
    if ((targetsSelf || onCasterTile) && session.isImmobilized()) {
      return null;
    }

    return TARGET_NOT_IMMOBILIZED_MESSAGE;
  }

  private applyRemoveImmobilize(
    session: PlayerSession,
    spell: NonNullable<ReturnType<typeof getSpellDefinition>>,
    targetMob: MobEntity | undefined,
    targetPlayer: PlayerSession | undefined,
    targetsSelf: boolean,
    onCasterTile: boolean
  ): boolean {
    if (targetPlayer?.isImmobilized()) {
      targetPlayer.clearImmobilized();
      this.world.broadcastCombatLog(
        session.mapId,
        targetPlayer.tileX,
        targetPlayer.tileY,
        `${session.name}: ${spell.nombre} libera a ${targetPlayer.name}.`
      );
      return true;
    }

    if ((targetsSelf || onCasterTile) && session.isImmobilized()) {
      session.clearImmobilized();
      this.world.broadcastCombatLog(
        session.mapId,
        session.tileX,
        session.tileY,
        `${session.name}: ${spell.nombre} te libera.`
      );
      return true;
    }

    return false;
  }

  /** Un solo push de vitales tras gastar maná (evita pisar cura con HP viejo). */
  private syncPlayersAfterSpellCast(
    caster: PlayerSession,
    healTarget?: PlayerSession
  ): void {
    this.world.sendPlayerState(caster, { includeAttributeBuffs: true });
    if (healTarget && healTarget.id !== caster.id) {
      this.world.sendPlayerState(healTarget, { includeAttributeBuffs: true });
    }
  }

  private resolveHealTarget(
    caster: PlayerSession,
    spell: NonNullable<ReturnType<typeof getSpellDefinition>>,
    targetPlayer: PlayerSession | undefined,
    targetsSelf: boolean,
    targetTileX: number,
    targetTileY: number
  ): PlayerSession | undefined {
    if (!(spell.healMax > 0 || spell.healMin > 0) || !spell.puedeUsarseEnAliados) {
      return undefined;
    }

    if (targetPlayer) {
      return targetPlayer;
    }

    const onCaster =
      targetsSelf || this.isTileOnCaster(caster, targetTileX, targetTileY);
    if (onCaster) {
      return caster;
    }

    // Si no hay jugador en el tile y no era sobre el caster (ya filtrado arriba), falla.
    if (!targetPlayer) {
      return undefined;
    }

    return undefined;
  }

  private resolveInvisibilityTarget(
    caster: PlayerSession,
    spell: NonNullable<ReturnType<typeof getSpellDefinition>>,
    targetPlayer: PlayerSession | undefined,
    targetsSelf: boolean,
    targetTileX: number,
    targetTileY: number
  ): PlayerSession | undefined {
    if (!isInvisibilitySpell(spell.idSpell) || !spell.puedeUsarseEnAliados) {
      return undefined;
    }

    if (targetPlayer) {
      if (this.canFactionsFight(caster.factionId, targetPlayer.factionId)) {
        return undefined;
      }
      return targetPlayer;
    }

    const onCaster =
      targetsSelf || this.isTileOnCaster(caster, targetTileX, targetTileY);
    if (onCaster) {
      return caster;
    }

    if (!targetPlayer) {
      return undefined;
    }

    return undefined;
  }

  private resolveSpellBuffTarget(
    caster: PlayerSession,
    spell: NonNullable<ReturnType<typeof getSpellDefinition>>,
    targetPlayer: PlayerSession | undefined,
    targetsSelf: boolean,
    targetTileX: number,
    targetTileY: number
  ): PlayerSession | undefined {
    const behavior = getSpellBehavior(spell.idSpell);
    if (!behavior?.buffEffects?.length) {
      return undefined;
    }

    if (targetPlayer) {
      if (targetPlayer.id === caster.id) {
        return spell.puedeUsarseEnAliados ? caster : undefined;
      }
      if (spell.puedeUsarseEnAliados) {
        if (this.canFactionsFight(caster.factionId, targetPlayer.factionId)) {
          return undefined;
        }
        return targetPlayer;
      }
      if (this.canFactionsFight(caster.factionId, targetPlayer.factionId)) {
        return targetPlayer;
      }
      return undefined;
    }

    const onCaster =
      targetsSelf || this.isTileOnCaster(caster, targetTileX, targetTileY);
    if (onCaster && spell.puedeUsarseEnAliados) {
      return caster;
    }

    return undefined;
  }

  private applySpellBuffsToPlayer(
    caster: PlayerSession,
    target: PlayerSession,
    spellId: number,
    spellName: string
  ): boolean {
    const behavior = getSpellBehavior(spellId);
    if (!behavior?.buffEffects?.length) {
      return false;
    }

    const now = Date.now();
    for (const buff of behavior.buffEffects) {
      if (buff.stat === "strength") {
        target.attributeBuffs.strength = Math.min(
          ATTRIBUTE_POTION_BUFF_MAX,
          target.attributeBuffs.strength + buff.amount
        );
      } else {
        target.attributeBuffs.agility = Math.min(
          ATTRIBUTE_POTION_BUFF_MAX,
          target.attributeBuffs.agility + buff.amount
        );
      }
    }
    target.attributeBuffs.expiresAtMs = now + ATTRIBUTE_POTION_BUFF_DURATION_MS;

    this.world.sendPlayerState(target, { includeAttributeBuffs: true });

    const effectParts = behavior.buffEffects.map((buff) => {
      const label = buff.stat === "strength" ? "Fuerza" : "Agilidad";
      const sign = buff.amount > 0 ? "+" : "";
      return `${sign}${buff.amount} ${label}`;
    });
    const targetLabel = target.id === caster.id ? "sí mismo" : target.name;
    this.world.broadcastCombatLog(
      caster.mapId,
      target.tileX,
      target.tileY,
      `${caster.name}: ${spellName} otorga ${effectParts.join(", ")} a ${targetLabel}.`
    );
    return true;
  }

  private applyDamageToMob(
    session: PlayerSession,
    mob: MobEntity,
    rawDamage: number,
    spellName?: string
  ) {
    this.world.aggroMobOnPlayerHit(mob, session);
    const damage = Math.max(0, Math.floor(rawDamage));
    mob.hp = Math.max(0, mob.hp - damage);

    const wasAlive = mob.alive;
    if (mob.hp <= 0) {
      mob.alive = false;
      mob.respawnAt = Date.now() + mob.respawnMs;
    }

    this.world.broadcastGameEvent(session.mapId, mob.tileX, mob.tileY, {
      kind: "damage",
      targetKind: "mob",
      targetId: mob.id,
      amount: damage,
      tileX: mob.tileX,
      tileY: mob.tileY,
      sourcePlayerId: session.id,
      sourceTileX: session.tileX,
      sourceTileY: session.tileY,
    });
    this.world.broadcastMobUpdated(mob);

    if (mob.alive) {
      const action = spellName ? `${spellName} golpea` : "Golpea";
      this.world.broadcastCombatLog(
        session.mapId,
        mob.tileX,
        mob.tileY,
        `${session.name} ${action} a ${mob.name} por ${damage}.`
      );
    } else {
      const action = spellName ? `${spellName} elimina` : "Elimina";
      this.world.broadcastCombatLog(
        session.mapId,
        mob.tileX,
        mob.tileY,
        `${session.name} ${action} a ${mob.name} (${damage}).`
      );
      if (wasAlive) {
        this.world.grantMobKillGold(session, mob);
        this.world.grantMobKillExp(session, mob);
      }
    }
  }

  private getMobInFrontOfPlayer(session: PlayerSession): MobEntity | undefined {
    const front = this.getFrontTile(session);
    return this.findMobAtTile(session.mapId, front.x, front.y);
  }

  private getFrontTile(session: PlayerSession) {
    if (session.facing === "up") return { x: session.tileX, y: session.tileY - 1 };
    if (session.facing === "down") return { x: session.tileX, y: session.tileY + 1 };
    if (session.facing === "left") return { x: session.tileX - 1, y: session.tileY };
    return { x: session.tileX + 1, y: session.tileY };
  }

  private findMobAtTile(mapId: string, tileX: number, tileY: number) {
    for (const mob of this.world.getMobs().values()) {
      if (!mob.alive || mob.mapId !== mapId) continue;
      if (
        mobTargetFootprintOccupiesTile(
          tileX,
          tileY,
          mob.tileX,
          mob.tileY,
          mob.hitboxOffsetTiles,
          mob.hitboxWidthTiles,
          mob.hitboxHeightTiles
        )
      ) {
        return mob;
      }
      if (isAdjacent(mob.tileX, mob.tileY, tileX, tileY)) return mob;
    }
    return undefined;
  }

  private validateSpellCastRequirements(
    session: PlayerSession,
    spell: NonNullable<ReturnType<typeof getSpellDefinition>>
  ): string | null {
    if (session.isAdmin()) {
      return null;
    }
    if (spellRequiresAnilloEspectral(spell.idSpell) && !this.sessionHasAnilloEspectral(session)) {
      return "Necesitás un anillo espectral para usar este hechizo.";
    }
    if (!spell.usableBy.includes(session.classId as (typeof spell.usableBy)[number])) {
      return `Tu clase no puede usar ${spell.nombre}.`;
    }
    if (spell.nivelRequerido > session.level) {
      return `${spell.nombre} requiere ser nivel ${spell.nivelRequerido}.`;
    }
    return null;
  }

  private sessionHasAnilloEspectral(session: PlayerSession): boolean {
    return session.inventorySlots.some(
      (slot) => slot.itemId === "anillo_espectral" && slot.amount > 0
    );
  }

  private findPlayerAtTile(mapId: string, tileX: number, tileY: number, exceptId: string): PlayerSession | undefined {
    for (const player of this.world.getPlayers().values()) {
      if (!player.joined || player.mapId !== mapId || player.id === exceptId) continue;
      if (player.hp <= 0) continue;
      if (player.tileX === tileX && player.tileY === tileY) return player;
      if (isAdjacent(player.tileX, player.tileY, tileX, tileY)) return player;
    }
    return undefined;
  }

  private applyDamageToPlayer(
    attacker: PlayerSession,
    victim: PlayerSession,
    rawDamage: number,
    spellName?: string
  ) {
    let spellDamage = rawDamage;
    if (spellName && attacker.id !== victim.id) {
      const antiOneshot = applyAntiOneshotToSpellDamage(
        rawDamage,
        victim.recentPvpSpellHits,
        attacker.id,
        Date.now()
      );
      victim.recentPvpSpellHits = antiOneshot.records;
      spellDamage = antiOneshot.damage;
    }

    let mitigated: number;
    let shieldBlocked = false;
    if (spellName) {
      mitigated = Math.max(
        1,
        Math.floor(spellDamage * (1 - victim.magicResistancePercent))
      );
    } else {
      const physical = mitigatePhysicalDamage(spellDamage, {
        damageReductionPercent: victim.damageReductionPercent,
        shieldBlockChancePercent: victim.shieldBlockChancePercent,
        shieldBlockReductionPercent: victim.shieldBlockReductionPercent,
      });
      mitigated = physical.damage;
      shieldBlocked = physical.blocked;
    }
    victim.hp = Math.max(0, victim.hp - mitigated);

    this.world.broadcastGameEvent(victim.mapId, victim.tileX, victim.tileY, {
      kind: "damage",
      targetKind: "player",
      targetId: victim.id,
      amount: mitigated,
      tileX: victim.tileX,
      tileY: victim.tileY,
      sourcePlayerId: attacker.id,
      sourceTileX: attacker.tileX,
      sourceTileY: attacker.tileY,
    });

    this.world.broadcastToAoi(victim.mapId, victim.tileX, victim.tileY, {
      type: "player_updated",
      player: victim.toNetState(),
    });
    this.world.send(victim, { type: "player_updated", player: victim.toNetState() });
    this.world.notifyPartyOfHpChange(victim.id);

    if (victim.hp > 0) {
      const action = spellName ? `${spellName} golpea` : "Golpea";
      const blockNote = shieldBlocked ? " (bloqueado con escudo)" : "";
      this.world.broadcastCombatLog(
        victim.mapId,
        victim.tileX,
        victim.tileY,
        `${attacker.name} ${action} a ${victim.name} por ${mitigated}${blockNote}.`
      );
      return;
    }

    this.handlePlayerKilled(attacker, victim);
  }

  private isInSafeZone(player: PlayerSession): boolean {
    if (this.world.isGlobalPvpEnabled()) return false;
    return SAFE_ZONE_MAP_IDS.has(player.mapId);
  }

  public handleSuicide(session: PlayerSession): void {
    if (!session.joined) {
      return;
    }
    if (this.isPlayerDeadForResurrect(session)) {
      this.world.sendCombatLog(session, "Ya estás muerto.");
      return;
    }
    this.handlePlayerKilled(session, session);
  }

  private handlePlayerKilled(killer: PlayerSession, victim: PlayerSession) {
    if (victim.isDead) {
      return;
    }
    const suicide = killer.id === victim.id;
    logger.info("combatsystem", `Player ${victim.name} (${victim.id}) killed by ${suicide ? "themselves" : killer.name + " (" + killer.id + ")"}`);
    const shouldDropLoot = !victim.deathLootProcessed;
    victim.isDead = true;
    victim.hp = 0;
    victim.recentPvpSpellHits = createEmptyPvpSpellHitRecords();
    // We don't have access to InventorySystem here directly, but handlePlayerKilled
    // logic includes inventory drop. 
    // We can just keep the original structure in WorldInstance by calling back into it.
    // Or we add `inventorySystem` to WorldContext or expose `dropPlayerDeathLoot` on `WorldContext`.
    
    // For now, let's expose dropPlayerDeathLoot in WorldContext.
    if (shouldDropLoot) {
      this.world.dropPlayerDeathLoot(victim);
      this.world.sendInventoryUpdated(victim);
    }

    const suicide = killer.id === victim.id;
    if (!suicide) {
      this.world.onUserKill(killer, victim);
    }
    this.world.broadcastCombatLog(
      victim.mapId,
      victim.tileX,
      victim.tileY,
      suicide ? `${victim.name} ha muerto.` : `${killer.name} ha matado a ${victim.name}.`
    );

    const diedMsg: ServerMessage = {
      type: "player_died",
      playerId: victim.id,
      killerId: suicide ? victim.id : killer.id,
      killerName: suicide ? "/morir" : killer.name,
    };
    const updatedMsg: ServerMessage = {
      type: "player_updated",
      player: victim.toNetState(),
    };
    this.world.sendPlayerState(victim);
    this.world.send(victim, diedMsg);
    this.world.send(victim, updatedMsg);
    this.world.broadcastToAoi(victim.mapId, victim.tileX, victim.tileY, diedMsg, victim.id);
    this.world.broadcastToAoi(victim.mapId, victim.tileX, victim.tileY, updatedMsg);
    this.cancelResurrectForPlayer(victim.id);
  }

  private handleResurrectCast(
    session: PlayerSession,
    spell: NonNullable<ReturnType<typeof getSpellDefinition>>,
    targetTileX: number,
    targetTileY: number,
    targetPlayerId?: string
  ): void {
    if (!spell.puedeUsarseEnAliados) {
      this.world.sendCombatLog(session, `${spell.nombre} no puede usarse así.`);
      return;
    }

    if (this.resurrectChannels.has(session.id)) {
      this.world.sendCombatLog(session, "Ya estás resucitando a alguien.");
      return;
    }

    const target = this.findDeadPlayerForResurrect(
      session,
      targetTileX,
      targetTileY,
      targetPlayerId
    );
    if (!target) {
      this.sendResurrectTargetNotFound(session, targetPlayerId);
      return;
    }

    const attackerFaction = normalizeFactionId(session.factionId);
    const defenderFaction = normalizeFactionId(target.factionId);
    if (canFactionsFight(attackerFaction, defenderFaction)) {
      this.world.sendCombatLog(session, "No podés resucitar enemigos.");
      return;
    }

    if (!this.isCasterNearDeadTarget(session, target, targetTileX, targetTileY)) {
      this.world.sendCombatLog(
        session,
        `Tenés que estar a ${RESURRECT_MAX_TILE_DISTANCE} tiles o menos del fantasma.`
      );
      return;
    }

    session.mp -= spell.manaCost;
    this.world.sendPlayerState(session);

    const endsAtMs = Date.now() + RESURRECT_CHANNEL_MS;
    const channel: ResurrectChannelState = {
      casterId: session.id,
      targetId: target.id,
      mapId: session.mapId,
      endsAtMs,
      clickTileX: targetTileX,
      clickTileY: targetTileY,
    };
    this.resurrectChannels.set(session.id, channel);

    const channelEvent = {
      kind: "resurrect_channel" as const,
      casterId: session.id,
      casterName: session.name,
      targetId: target.id,
      targetName: target.name,
      endsAtMs,
      tileX: target.tileX,
      tileY: target.tileY,
      casterTileX: session.tileX,
      casterTileY: session.tileY,
    };
    this.emitGameEvent(session.mapId, target.tileX, target.tileY, channelEvent, session);

    const startMsg = `${session.name} comienza a resucitar a ${target.name}...`;
    this.world.sendCombatLog(session, startMsg);
    this.world.broadcastCombatLog(session.mapId, target.tileX, target.tileY, startMsg);
  }

  private findDeadPlayerForResurrect(
    session: PlayerSession,
    targetTileX: number,
    targetTileY: number,
    targetPlayerId?: string
  ): PlayerSession | undefined {
    if (targetPlayerId) {
      const byId = this.world.getPlayers().get(targetPlayerId);
      if (
        byId?.joined &&
        byId.mapId === session.mapId &&
        byId.id !== session.id &&
        this.isPlayerDeadForResurrect(byId)
      ) {
        return byId;
      }
    }

    const atClickTile = this.findDeadPlayerAtTile(
      session.mapId,
      targetTileX,
      targetTileY,
      session.id
    );
    if (atClickTile) {
      return atClickTile;
    }

    return this.findNearestDeadPlayerForResurrect(
      session,
      targetTileX,
      targetTileY
    );
  }

  private findNearestDeadPlayerForResurrect(
    session: PlayerSession,
    targetTileX: number,
    targetTileY: number
  ): PlayerSession | undefined {
    let best: PlayerSession | undefined;
    let bestDist = Infinity;
    for (const player of this.world.getPlayers().values()) {
      if (!player.joined || player.mapId !== session.mapId || player.id === session.id) {
        continue;
      }
      if (!this.isPlayerDeadForResurrect(player)) {
        continue;
      }
      const distFromCaster = Math.abs(player.tileX - session.tileX) + Math.abs(player.tileY - session.tileY);
      const distFromClick = Math.abs(player.tileX - targetTileX) + Math.abs(player.tileY - targetTileY);
      const dist = Math.min(distFromCaster, distFromClick);
      if (dist > RESURRECT_MAX_TILE_DISTANCE) {
        continue;
      }
      if (dist < bestDist) {
        bestDist = dist;
        best = player;
      }
    }
    return best;
  }

  private findDeadPlayerAtTile(
    mapId: string,
    tileX: number,
    tileY: number,
    exceptId: string
  ): PlayerSession | undefined {
    for (const player of this.world.getPlayers().values()) {
      if (!player.joined || player.mapId !== mapId || player.id === exceptId) {
        continue;
      }
      if (!this.isPlayerDeadForResurrect(player)) {
        continue;
      }
      if (player.tileX === tileX && player.tileY === tileY) {
        return player;
      }
      if (isAdjacent(player.tileX, player.tileY, tileX, tileY)) {
        return player;
      }
    }
    return undefined;
  }

  private emitGameEvent(
    mapId: string,
    tileX: number,
    tileY: number,
    event: import("../../../shared/types").GameEvent,
    directTo?: PlayerSession
  ): void {
    if (directTo?.joined) {
      this.world.send(directTo, { type: "game_event", event });
    }
    this.world.broadcastToAoi(
      mapId,
      tileX,
      tileY,
      { type: "game_event", event },
      directTo?.id
    );
  }

  private resolveIncomingSpellId(spellIdRaw: unknown): number {
    const id = Math.floor(Number(spellIdRaw));
    if (!Number.isFinite(id)) {
      return NaN;
    }
    const def = getSpellDefinition(id);
    if (def?.nombre === "Resucitar") {
      return RESURRECT_SPELL_ID;
    }
    return id;
  }

  private tryHandleResurrectCast(
    session: PlayerSession,
    spellId: number,
    targetTileX: number,
    targetTileY: number,
    targetPlayerId?: string
  ): boolean {
    if (targetPlayerId) {
      const hinted = this.world.getPlayers().get(targetPlayerId);
      if (
        hinted?.joined &&
        hinted.id !== session.id &&
        this.isPlayerDeadForResurrect(hinted)
      ) {
        const spell = getSpellDefinition(RESURRECT_SPELL_ID);
        if (!spell) {
          this.world.sendCombatLog(session, "Hechizo Resucitar no configurado.");
          return true;
        }
        if (session.mp < spell.manaCost) {
          this.world.sendCombatLog(
            session,
            `No tenés suficiente maná para ${spell.nombre} (${session.mp}/${spell.manaCost}).`
          );
          return true;
        }
        this.handleResurrectCast(session, spell, targetTileX, targetTileY, targetPlayerId);
        return true;
      }
    }

    const spellEarly = getSpellDefinition(spellId);
    if (!this.isResurrectCast(spellId, spellEarly)) {
      return false;
    }

    const spell = getSpellDefinition(RESURRECT_SPELL_ID) ?? spellEarly;
    if (!spell) {
      this.world.sendCombatLog(session, "Hechizo Resucitar no configurado.");
      return true;
    }
    if (session.mp < spell.manaCost) {
      this.world.sendCombatLog(
        session,
        `No tenés suficiente maná para ${spell.nombre} (${session.mp}/${spell.manaCost}).`
      );
      return true;
    }
    this.handleResurrectCast(session, spell, targetTileX, targetTileY, targetPlayerId);
    return true;
  }

  private sendResurrectTargetNotFound(
    session: PlayerSession,
    targetPlayerId?: string
  ): void {
    if (targetPlayerId) {
      const hinted = this.world.getPlayers().get(targetPlayerId);
      if (hinted?.joined && hinted.id !== session.id) {
        if (hinted.mapId !== session.mapId) {
          this.world.sendCombatLog(
            session,
            `Ese aliado murió en otro mapa (${hinted.mapId}). Vos estás en ${session.mapId}: tienen que estar en el mismo mapa para Resucitar.`
          );
          return;
        }
        if (!this.isPlayerDeadForResurrect(hinted)) {
          this.world.sendCombatLog(
            session,
            "Ese jugador no está muerto en el servidor (fantasma desactualizado). Que vuelva a morir o reconecte."
          );
          return;
        }
        if (
          !this.isCasterNearDeadTarget(
            session,
            hinted,
            hinted.tileX,
            hinted.tileY
          )
        ) {
          this.world.sendCombatLog(
            session,
            `Estás demasiado lejos del fantasma (máx ${RESURRECT_MAX_TILE_DISTANCE} tiles).`
          );
          return;
        }
      }
    }
    this.world.sendCombatLog(
      session,
      `No hay un aliado muerto a ${RESURRECT_MAX_TILE_DISTANCE} tiles en este mapa. Hacé click sobre el fantasma.`
    );
  }

  private isResurrectCast(
    spellId: number,
    spell: ReturnType<typeof getSpellDefinition> | undefined
  ): boolean {
    return (
      spellId === RESURRECT_SPELL_ID ||
      isResurrectSpellId(spellId) ||
      isResurrectSpell(spellId) ||
      spell?.nombre === "Resucitar"
    );
  }

  private isPlayerDeadForResurrect(player: PlayerSession): boolean {
    return player.isDead || player.hp <= 0;
  }

  private isCasterNearDeadTarget(
    caster: PlayerSession,
    target: PlayerSession,
    clickTileX?: number,
    clickTileY?: number
  ): boolean {
    if (caster.mapId !== target.mapId) {
      return false;
    }
    if (
      isWithinResurrectRange(
        caster.tileX,
        caster.tileY,
        target.tileX,
        target.tileY
      )
    ) {
      return true;
    }
    if (clickTileX !== undefined && clickTileY !== undefined) {
      return isWithinResurrectRange(
        caster.tileX,
        caster.tileY,
        clickTileX,
        clickTileY
      );
    }
    return false;
  }

  private isResurrectChannelValid(
    channel: ResurrectChannelState,
    nowMs: number
  ): boolean {
    const caster = this.world.getPlayers().get(channel.casterId);
    const target = this.world.getPlayers().get(channel.targetId);
    if (!caster?.joined || !target?.joined) {
      return false;
    }
    if (caster.hp <= 0 || !this.isPlayerDeadForResurrect(target)) {
      return false;
    }
    if (caster.mapId !== channel.mapId || target.mapId !== channel.mapId) {
      return false;
    }
    if (
      !this.isCasterNearDeadTarget(
        caster,
        target,
        channel.clickTileX,
        channel.clickTileY
      )
    ) {
      return false;
    }
    if (nowMs >= channel.endsAtMs + 500) {
      return false;
    }
    return true;
  }

  private completeResurrectChannel(channel: ResurrectChannelState): void {
    const caster = this.world.getPlayers().get(channel.casterId);
    const target = this.world.getPlayers().get(channel.targetId);
    if (!caster || !target || !this.isPlayerDeadForResurrect(target)) {
      return;
    }

    target.isDead = false;
    target.deathLootProcessed = false;
    target.recentPvpSpellHits = createEmptyPvpSpellHitRecords();
    target.hp = Math.max(1, Math.floor(target.hpMax * RESURRECT_REVIVE_HP_RATIO));
    this.world.sendPlayerState(target);
    this.world.send(target, {
      type: "player_moved",
      player: target.toNetState(),
    });
    this.world.broadcastPlayerMoved(target);
    this.world.notifyPartyOfHpChange(target.id);

    const completeEvent = {
      kind: "resurrect_complete" as const,
      casterId: caster.id,
      targetId: target.id,
      targetName: target.name,
      tileX: target.tileX,
      tileY: target.tileY,
    };
    this.emitGameEvent(target.mapId, target.tileX, target.tileY, completeEvent, caster);

    const doneMsg = `${caster.name} resucitó a ${target.name}.`;
    this.world.sendCombatLog(caster, doneMsg);
    this.world.broadcastCombatLog(target.mapId, target.tileX, target.tileY, doneMsg);
  }

  private cancelResurrectChannel(
    channel: ResurrectChannelState,
    reason: string
  ): void {
    this.resurrectChannels.delete(channel.casterId);
    const target = this.world.getPlayers().get(channel.targetId);
    const tileX = target?.tileX ?? 0;
    const tileY = target?.tileY ?? 0;
    const caster = this.world.getPlayers().get(channel.casterId);
    this.emitGameEvent(
      channel.mapId,
      tileX,
      tileY,
      {
        kind: "resurrect_cancel",
        casterId: channel.casterId,
        targetId: channel.targetId,
        reason,
      },
      caster
    );
    if (caster?.joined) {
      this.world.sendCombatLog(caster, reason);
    }
  }
}
