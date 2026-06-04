import Phaser from "phaser";
import { TILE_SIZE } from "../../config";
import { tileToFeetWorld } from "../../player/playerSprites";
import { getItemDefinition, type EquipmentSlot, type ItemId } from "../../items/itemDefinitions";
import {
  getImmobilizeMobDurationMs,
  isMobImmobilizedAt,
} from "../../../shared/combat";
import { spellRequiresAnilloEspectral } from "../../data/spells";
import { getSpellEffectConfig, IMMOBILIZE_SPELL_IDS } from "../../spells/spellEffects";
import {
  getSpellBehavior,
  isInvisibilitySpell,
  isRemoveImmobilizeSpell,
  isResurrectSpell,
  isResurrectSpellId,
  TARGET_NOT_IMMOBILIZED_MESSAGE,
} from "../../spells/spellBehaviors";
import { INVISIBILITY_DURATION_MS } from "../../../game-data/invisibility";
import {
  RESURRECT_CHANNEL_MS,
  RESURRECT_MAX_TILE_DISTANCE,
  RESURRECT_SPELL_ID,
  isWithinResurrectRange,
} from "../../../game-data/resurrect";
import type { CoreStats } from "../../game/characterStats";
import { OFFLINE_GAMEPLAY_MESSAGE } from "../../game/mmoMode";
import type { GameUi } from "../../ui/gameUi";
import { GAME_FONT, GAME_TEXT_RESOLUTION } from "../../ui/fonts";
import type { Facing } from "../../player/playerSprites";
import {
  formatImmobilizeDuration,
  formatImmobilizeRemaining,
} from "./inspectFormat";
import {
  ATTACK_COOLDOWN_MS,
  ATTACK_MAX_DAMAGE,
  ATTACK_MIN_DAMAGE,
} from "./constants";
import { getStrengthDamageBonus } from "./progressFormulas";
import type { MobModelId } from "../../data/mobs";
import type {
  DamageType,
  DummyState,
  PlayerCombatSnapshot,
  SpellCastRequest,
} from "./types";

export type GameSceneCombatDeps = {
  scene: Phaser.Scene;
  input: Phaser.Input.InputPlugin;
  time: Phaser.Time.Clock;
  tweens: Phaser.Tweens.TweenManager;
  getUiCamera: () => Phaser.Cameras.Scene2D.Camera | undefined;

  getGameUi: () => GameUi;
  getPlayerProgress: () => { level: number; hp: number; hpMax: number; mp: number; mpMax: number };
  getEquipment: () => Record<EquipmentSlot, ItemId | null>;
  getCoreStats: () => CoreStats;
  getFacing: () => Facing;
  getPlayerTile: () => { x: number; y: number };
  getCurrentMapId: () => string;

  hasLearnedSpell: (spellId: number) => boolean;
  getSelectedClass: () => import("./types").ClassId;
  hasAnilloEspectralInInventory: () => boolean;
  isPlayerDeadOrGhost: () => boolean;
  isMultiplayerActive: () => boolean;
  isPlayerAdmin: () => boolean;

  stopMeditation: () => void;
  refreshHud: () => void;

  onPlayerHpDepleted: () => void;

  sendAttackToServer: (facing: Facing) => void;
  sendCastSpellToServer: (
    spellId: number,
    tileX: number,
    tileY: number,
    targetPlayerId?: string
  ) => void;

  getDummyInAttackRange: () => DummyState | null;
  getDummyHitTile: (dummy: DummyState) => { x: number; y: number };
  killDummy: (dummy: DummyState) => void;
  refreshInspectedDummyLabel: () => void;
  getInspectedDummyId: () => string | null;
  playMobHitSound?: (modelId: MobModelId) => void;

  playSpellEffect: (spellId: number, tileX: number, tileY: number) => void;
  startResurrectChannelEffect: (
    casterId: string,
    tileX: number,
    tileY: number,
    endsAtMs: number
  ) => void;
  getLocalPlayerId: () => string | null;
  setSuppressServerSpellFxUntil: (until: number) => void;
  showSpellMagicWords: (spellId: number, spellNombre: string) => void;
  clearSpellMagicWords: () => void;
  onMeleeImpact?: () => void;
  applySpellAttributeBuff: (stat: "strength" | "agility", amount: number) => void;
  clearAllSpellEffects: () => void;
  applyLocalInvisibility: (durationMs: number) => void;
  isLocalPlayerImmobilized: (now?: number) => boolean;
  clearLocalPlayerImmobilize: () => void;
  findDummyAtTile: (tileX: number, tileY: number) => DummyState | null;
  hasSpellEnemyTargetAtTile: (tileX: number, tileY: number) => boolean;
  findDeadAllyPlayerIdAtTile: (tileX: number, tileY: number) => string | undefined;
  isServerConnected: () => boolean;
};

/**
 * Combate local: melee vs dummies, hechizos con targeting y mitigación de daño.
 */
export class GameSceneCombatController {
  private pendingSpellCast: SpellCastRequest | null = null;
  private nextAttackAt = 0;
  private activePlayerDamageText?: Phaser.GameObjects.Text;
  private activePlayerDamageTween?: Phaser.Tweens.Tween;

  constructor(private readonly deps: GameSceneCombatDeps) {}

  hasPendingSpellCast(): boolean {
    return this.pendingSpellCast != null;
  }

  getPendingSpellCast(): SpellCastRequest | null {
    return this.pendingSpellCast;
  }

  spellCanTargetDummy(spell: SpellCastRequest): boolean {
    if (isRemoveImmobilizeSpell(spell.idSpell)) {
      return true;
    }
    return (
      spell.danioMax > 0 ||
      spell.danioMin > 0 ||
      IMMOBILIZE_SPELL_IDS.has(spell.idSpell)
    );
  }

  private isResurrectPending(spell: SpellCastRequest): boolean {
    return (
      isResurrectSpellId(spell.idSpell) ||
      isResurrectSpell(spell.idSpell) ||
      spell.nombre === "Resucitar"
    );
  }

  spellCanTargetPlayer(spell: SpellCastRequest): boolean {
    if (this.isResurrectPending(spell)) {
      return spell.puedeUsarseEnAliados;
    }
    if (isRemoveImmobilizeSpell(spell.idSpell)) {
      return spell.puedeUsarseEnAliados;
    }
    return spell.puedeUsarseEnAliados || spell.healMax > 0 || Boolean(spell.remueveDebuff);
  }

  /** Daño / CC sobre criaturas o jugadores enemigos (no al suelo vacío). */
  private spellRequiresEnemyTarget(spell: SpellCastRequest): boolean {
    if (this.isResurrectPending(spell)) {
      return false;
    }
    if (isRemoveImmobilizeSpell(spell.idSpell)) {
      return false;
    }
    const dealsDamage = spell.danioMax > 0 || spell.danioMin > 0;
    const immobilize = IMMOBILIZE_SPELL_IDS.has(spell.idSpell);
    if (!dealsDamage && !immobilize) {
      return false;
    }
    const healOnly =
      (spell.healMax > 0 || spell.healMin > 0) && !dealsDamage && !immobilize;
    if (healOnly) {
      return false;
    }
    return this.spellCanTargetDummy(spell);
  }

  private rejectMissingEnemyTarget(tileX: number, tileY: number): boolean {
    if (this.deps.hasSpellEnemyTargetAtTile(tileX, tileY)) {
      return false;
    }
    this.deps.getGameUi().addCombatLine("No hay objetivo en ese lugar.");
    this.cancelSpellTargeting("Lanzamiento cancelado.");
    return true;
  }

  beginSpellTargeting(spell: SpellCastRequest): boolean {
    this.deps.stopMeditation();
    const gameUi = this.deps.getGameUi();
    const isAdmin = this.deps.isPlayerAdmin();

    if (this.deps.isPlayerDeadOrGhost()) {
      gameUi.addChatLine("No podés lanzar hechizos en esta forma.");
      return false;
    }
    if (!isAdmin && !this.deps.hasLearnedSpell(spell.idSpell)) {
      gameUi.addChatLine(`No conocés ${spell.nombre}.`);
      return false;
    }
    if (!isAdmin && spellRequiresAnilloEspectral(spell.idSpell) && !this.deps.hasAnilloEspectralInInventory()) {
      gameUi.addChatLine("Necesitás un anillo espectral para usar este hechizo.");
      return false;
    }
    if (!isAdmin && !spell.usableBy.includes(this.deps.getSelectedClass())) {
      gameUi.addChatLine(`Tu clase no puede usar ${spell.nombre}.`);
      return false;
    }
    if (!isAdmin && spell.nivelRequerido > this.deps.getPlayerProgress().level) {
      gameUi.addChatLine(
        `${spell.nombre} requiere ser nivel ${spell.nivelRequerido} (sos nivel ${this.deps.getPlayerProgress().level}).`
      );
      return false;
    }

    if (this.pendingSpellCast?.idSpell === spell.idSpell) {
      this.cancelSpellTargeting(`Cancelaste ${spell.nombre}.`);
      return false;
    }

    this.deps.clearSpellMagicWords();
    const normalizedSpell =
      spell.nombre === "Resucitar" || isResurrectSpellId(spell.idSpell)
        ? { ...spell, idSpell: RESURRECT_SPELL_ID }
        : spell;
    this.pendingSpellCast = normalizedSpell;
    this.deps.input.setDefaultCursor("crosshair");
    return true;
  }

  cancelSpellTargeting(message?: string): void {
    this.pendingSpellCast = null;
    this.deps.input.setDefaultCursor("default");
    if (message) {
      this.deps.getGameUi().addChatLine(message);
    }
  }

  private rejectRemoveImmobilizeTarget(): void {
    this.deps.getGameUi().addChatLine(TARGET_NOT_IMMOBILIZED_MESSAGE);
    this.cancelSpellTargeting("Lanzamiento cancelado.");
  }

  private isRemoveImmobilizeTargetValid(
    spell: SpellCastRequest,
    targetTileX?: number,
    targetTileY?: number
  ): boolean {
    if (!isRemoveImmobilizeSpell(spell.idSpell)) {
      return true;
    }

    const now = this.deps.time.now;
    const playerTile = this.deps.getPlayerTile();
    const isSelf =
      targetTileX === undefined && targetTileY === undefined
        ? true
        : targetTileX === playerTile.x && targetTileY === playerTile.y;

    if (isSelf) {
      return this.deps.isLocalPlayerImmobilized(now);
    }

    if (targetTileX !== undefined && targetTileY !== undefined) {
      const dummy = this.deps.findDummyAtTile(targetTileX, targetTileY);
      if (dummy) {
        return isMobImmobilizedAt(dummy.immobilizedUntilMs);
      }
    }

    return false;
  }

  private applyRemoveImmobilizeToTarget(
    spell: SpellCastRequest,
    targetTileX?: number,
    targetTileY?: number
  ): void {
    const gameUi = this.deps.getGameUi();
    const playerTile = this.deps.getPlayerTile();
    const isSelf =
      targetTileX === undefined && targetTileY === undefined
        ? true
        : targetTileX === playerTile.x && targetTileY === playerTile.y;

    if (isSelf) {
      this.deps.clearLocalPlayerImmobilize();
      gameUi.addCombatLine(`${spell.nombre} te libera.`);
      return;
    }

    if (targetTileX !== undefined && targetTileY !== undefined) {
      const dummy = this.deps.findDummyAtTile(targetTileX, targetTileY);
      if (dummy) {
        dummy.immobilizedUntilMs = 0;
        gameUi.addCombatLine(`${spell.nombre} libera a ${dummy.name}.`);
      }
    }
  }

  tryCastResurrectOnGhost(
    targetTileX: number,
    targetTileY: number,
    targetPlayerId?: string
  ): void {
    const spell = this.pendingSpellCast;
    if (!spell || !this.isResurrectPending(spell)) {
      return;
    }

    const gameUi = this.deps.getGameUi();
    if (!this.deps.isMultiplayerActive()) {
      gameUi.addChatLine("Resucitar solo funciona sobre aliados muertos en multijugador.");
      this.cancelSpellTargeting("Lanzamiento cancelado.");
      return;
    }
    if (!this.deps.isServerConnected()) {
      gameUi.addCombatLine("Sin conexión al servidor.");
      this.cancelSpellTargeting("Lanzamiento cancelado.");
      return;
    }
    if (!this.canAffordSpellMana(spell)) {
      return;
    }

    const casterTile = this.deps.getPlayerTile();
    if (!isWithinResurrectRange(casterTile.x, casterTile.y, targetTileX, targetTileY)) {
      gameUi.addCombatLine(
        `El fantasma está demasiado lejos (máx ${RESURRECT_MAX_TILE_DISTANCE} tiles).`
      );
      this.cancelSpellTargeting("Lanzamiento cancelado.");
      return;
    }

    const resolvedTargetId =
      targetPlayerId ??
      this.deps.findDeadAllyPlayerIdAtTile(targetTileX, targetTileY);
    if (!resolvedTargetId) {
      gameUi.addCombatLine(
        "No se encontró al jugador muerto. Hacé click sobre el fantasma o muy cerca."
      );
      this.cancelSpellTargeting("Lanzamiento cancelado.");
      return;
    }

    this.deps.showSpellMagicWords(RESURRECT_SPELL_ID, spell.nombre);
    this.deps.sendCastSpellToServer(
      RESURRECT_SPELL_ID,
      targetTileX,
      targetTileY,
      resolvedTargetId
    );
    this.cancelSpellTargeting();
  }

  tryCastSpellOnPlayer(
    targetTileX?: number,
    targetTileY?: number,
    targetPlayerId?: string
  ): void {
    const spell = this.pendingSpellCast;
    if (!spell) return;

    const gameUi = this.deps.getGameUi();

    if (this.isResurrectPending(spell)) {
      if (targetTileX === undefined || targetTileY === undefined) {
        gameUi.addCombatLine("Elegí un fantasma aliado muerto.");
        this.cancelSpellTargeting("Lanzamiento cancelado.");
        return;
      }
      const ghostId =
        targetPlayerId ??
        this.deps.findDeadAllyPlayerIdAtTile(targetTileX, targetTileY);
      this.tryCastResurrectOnGhost(targetTileX, targetTileY, ghostId);
      return;
    }

    if (!this.isRemoveImmobilizeTargetValid(spell, targetTileX, targetTileY)) {
      this.rejectRemoveImmobilizeTarget();
      return;
    }

    if (this.deps.isMultiplayerActive()) {
      const isSelf = targetTileX === undefined && targetTileY === undefined;

      if (isSelf && !this.spellCanTargetPlayer(spell)) {
        gameUi.addCombatLine(`${spell.nombre} no puede lanzarse sobre vos.`);
        this.cancelSpellTargeting("Lanzamiento cancelado.");
        return;
      }

      if (!this.canAffordSpellMana(spell)) {
        return;
      }

      const tile =
        targetTileX !== undefined && targetTileY !== undefined
          ? { x: targetTileX, y: targetTileY }
          : this.deps.getPlayerTile();

      const playerTile = this.deps.getPlayerTile();
      const targetsEnemyTile =
        tile.x !== playerTile.x || tile.y !== playerTile.y;

      if (this.spellRequiresEnemyTarget(spell)) {
        if (!targetsEnemyTile) {
          gameUi.addCombatLine(`${spell.nombre} no puede lanzarse sobre vos.`);
          this.cancelSpellTargeting("Lanzamiento cancelado.");
          return;
        }
        if (this.rejectMissingEnemyTarget(tile.x, tile.y)) {
          return;
        }
      }

      const behavior = getSpellBehavior(spell.idSpell);
      if (isSelf && behavior?.buffEffects && spell.puedeUsarseEnAliados) {
        for (const buff of behavior.buffEffects) {
          this.deps.applySpellAttributeBuff(buff.stat, buff.amount);
          const label = buff.stat === "strength" ? "Fuerza" : "Agilidad";
          const sign = buff.amount > 0 ? "+" : "";
          gameUi.addCombatLine(`${spell.nombre}: ${sign}${buff.amount} ${label}.`);
        }
        this.deps.refreshHud();
      }

      if (isSelf && isRemoveImmobilizeSpell(spell.idSpell)) {
        this.deps.clearLocalPlayerImmobilize();
        gameUi.addChatLine(`${spell.nombre} te libera.`);
      }

      const targetsSelf =
        isSelf || (tile.x === playerTile.x && tile.y === playerTile.y);
      if (
        targetsSelf &&
        spell.puedeUsarseEnAliados &&
        (spell.healMax > 0 || spell.healMin > 0)
      ) {
        const progress = this.deps.getPlayerProgress();
        const min = Math.max(0, Math.floor(spell.healMin));
        const max = Math.max(min, Math.floor(spell.healMax));
        const healAmount = Phaser.Math.Between(min, max);
        const before = progress.hp;
        progress.hp = Math.min(progress.hpMax, progress.hp + healAmount);
        const restored = progress.hp - before;
        if (restored > 0) {
          gameUi.addCombatLine(`${spell.nombre} te cura ${restored} HP.`);
        }
        this.deps.refreshHud();
      }

      if (targetsSelf && isInvisibilitySpell(spell.idSpell)) {
        this.deps.applyLocalInvisibility(INVISIBILITY_DURATION_MS);
        gameUi.addCombatLine(`${spell.nombre}: te volvés invisible.`);
      }

      this.playLocalSpellFx(spell.idSpell, spell.nombre, tile.x, tile.y);
      this.deps.sendCastSpellToServer(spell.idSpell, tile.x, tile.y);
      this.cancelSpellTargeting();
      return;
    }

    gameUi.addCombatLine(OFFLINE_GAMEPLAY_MESSAGE);
    this.cancelSpellTargeting("Lanzamiento cancelado.");
  }

  tryCastSpellOnDummy(dummy: DummyState): void {
    const spell = this.pendingSpellCast;
    if (!spell) return;

    const gameUi = this.deps.getGameUi();
    const mapId = this.deps.getCurrentMapId();
    const hitTile = this.deps.getDummyHitTile(dummy);

    if (isRemoveImmobilizeSpell(spell.idSpell)) {
      if (!isMobImmobilizedAt(dummy.immobilizedUntilMs)) {
        this.rejectRemoveImmobilizeTarget();
        return;
      }
    }

    if (this.deps.isMultiplayerActive()) {
      if (!dummy.alive || dummy.mapId !== mapId) {
        gameUi.addCombatLine("Ese objetivo no está disponible.");
        this.cancelSpellTargeting("Lanzamiento cancelado.");
        return;
      }
      if (isRemoveImmobilizeSpell(spell.idSpell)) {
        if (!this.canAffordSpellMana(spell)) {
          return;
        }
        this.playLocalSpellFx(spell.idSpell, spell.nombre, hitTile.x, hitTile.y);
        this.deps.sendCastSpellToServer(spell.idSpell, hitTile.x, hitTile.y);
        this.cancelSpellTargeting();
        return;
      }
      if (!this.spellCanTargetDummy(spell)) {
        gameUi.addCombatLine(`${spell.nombre} no puede lanzarse sobre enemigos.`);
        this.cancelSpellTargeting("Lanzamiento cancelado.");
        return;
      }
      if (!this.canAffordSpellMana(spell)) {
        return;
      }
      if (IMMOBILIZE_SPELL_IDS.has(spell.idSpell)) {
        this.applyInmovilizadoDebuffToDummy(dummy, spell.nombre, spell.idSpell);
      }
      this.playLocalSpellFx(spell.idSpell, spell.nombre, hitTile.x, hitTile.y);
      this.deps.sendCastSpellToServer(spell.idSpell, hitTile.x, hitTile.y);
      this.cancelSpellTargeting();
      return;
    }

    gameUi.addCombatLine(OFFLINE_GAMEPLAY_MESSAGE);
    this.cancelSpellTargeting("Lanzamiento cancelado.");
  }

  tryAttackDummy(): void {
    if (this.deps.isPlayerDeadOrGhost()) {
      return;
    }

    this.deps.clearSpellMagicWords();

    const now = this.deps.time.now;
    if (now < this.nextAttackAt) {
      return;
    }
    this.nextAttackAt = now + ATTACK_COOLDOWN_MS;

    if (this.deps.isMultiplayerActive()) {
      this.deps.sendAttackToServer(this.deps.getFacing());
      return;
    }

    this.deps.getGameUi().addCombatLine(OFFLINE_GAMEPLAY_MESSAGE);
  }

  getCombatSnapshot(): PlayerCombatSnapshot {
    const coreStats = this.deps.getCoreStats();
    let attackMin = ATTACK_MIN_DAMAGE;
    let attackMax = ATTACK_MAX_DAMAGE;
    let damageReductionPercent = 0;
    let magicResistancePercent = 0;
    let magicDamageBonusPercent = 0;
    const strBonus = getStrengthDamageBonus(coreStats.strength);
    attackMin += strBonus.minBonus;
    attackMax += strBonus.maxBonus;

    for (const equippedItemId of Object.values(this.deps.getEquipment())) {
      if (!equippedItemId) continue;
      const item = getItemDefinition(equippedItemId);
      const mods = item.combatModifiers;
      if (!mods) continue;

      attackMin += mods.attackMinBonus ?? 0;
      attackMax += mods.attackMaxBonus ?? 0;
      damageReductionPercent += mods.damageReductionPercent ?? 0;
      magicResistancePercent += mods.magicResistancePercent ?? 0;
      magicDamageBonusPercent += mods.magicDamageBonusPercent ?? 0;
    }

    attackMin = Math.max(1, Math.floor(attackMin));
    attackMax = Math.max(attackMin, Math.floor(attackMax));
    damageReductionPercent = Phaser.Math.Clamp(damageReductionPercent, 0, 0.9);
    magicResistancePercent = Phaser.Math.Clamp(magicResistancePercent, 0, 0.9);

    let weaponCanCrit = false;
    let weaponCritChance = 0;
    let weaponCritDamage = 1.5;
    const equippedWeaponId = this.deps.getEquipment().weapon;
    if (equippedWeaponId) {
      const weapon = getItemDefinition(equippedWeaponId);
      if (weapon.type === "weapon" && weapon.canCrit) {
        weaponCanCrit = true;
        weaponCritChance = weapon.critChance ?? 0;
        weaponCritDamage = weapon.critDamage ?? 1.5;
      }
    }

    return {
      attackMin,
      attackMax,
      damageReductionPercent,
      magicResistancePercent,
      magicDamageBonusPercent,
      weaponCanCrit,
      weaponCritChance,
      weaponCritDamage,
    };
  }

  applyIncomingDamage(rawDamage: number, damageType: DamageType = "physical"): number {
    if (rawDamage <= 0) {
      return 0;
    }
    const combat = this.getCombatSnapshot();
    const mitigationPercent =
      damageType === "magic"
        ? combat.magicResistancePercent
        : combat.damageReductionPercent;
    const reduced = Math.max(0, Math.floor(rawDamage * (1 - mitigationPercent)));
    const progress = this.deps.getPlayerProgress();
    progress.hp = Math.max(0, progress.hp - reduced);
    this.deps.refreshHud();
    if (progress.hp <= 0) {
      this.deps.onPlayerHpDepleted();
    }
    return reduced;
  }

  showDamageNumber(
    worldX: number,
    worldY: number,
    damage: number,
    source: "player" | "mob" = "player"
  ): void {
    if (source === "player") {
      this.clearActivePlayerDamageNumber();
    }

    const { scene } = this.deps;
    const damageValue = Math.max(0, Math.floor(damage));
    const textValue = damageValue > 200 ? `${damageValue}!¡` : `${damageValue}`;
    const damageText = scene.add
      .text(worldX, worldY, textValue, {
        fontFamily: GAME_FONT,
        fontSize: "15px",
        color: "#ff3333",
        stroke: "#240000",
        strokeThickness: 4,
        fontStyle: "bold",
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 1)
      .setDepth(24);

    const uiCamera = this.deps.getUiCamera();
    if (uiCamera) {
      uiCamera.ignore(damageText);
    }

    const tween = this.deps.tweens.add({
      targets: damageText,
      y: worldY - 20,
      alpha: 0,
      duration: 800,
      ease: "Cubic.Out",
      onComplete: () => {
        if (source === "player") {
          this.activePlayerDamageText = undefined;
          this.activePlayerDamageTween = undefined;
        }
        damageText.destroy();
      },
    });

    if (source === "player") {
      this.activePlayerDamageText = damageText;
      this.activePlayerDamageTween = tween;
    }
  }

  playAttackFeedback(tileX: number, tileY: number): void {
    this.deps.clearSpellMagicWords();
    const { x, y } = tileToFeetWorld(tileX, tileY, TILE_SIZE);
    const { scene } = this.deps;

    const hitFx = scene.add
      .rectangle(x, y - 18, 18, 18, 0xffe06b, 0.8)
      .setDepth(20)
      .setAngle(45);
    const uiCamera = this.deps.getUiCamera();
    if (uiCamera) {
      uiCamera.ignore(hitFx);
    }

    this.deps.tweens.add({
      targets: hitFx,
      alpha: 0,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 120,
      ease: "Linear",
      onComplete: () => hitFx.destroy(),
    });

    this.deps.onMeleeImpact?.();
  }

  private dealDamageToDummy(
    dummy: DummyState,
    rawDamage: number
  ): { damageApplied: number; killed: boolean } {
    if (dummy.isShowcase) {
      return { damageApplied: 0, killed: false };
    }
    const damageApplied = Math.max(0, Math.floor(rawDamage));
    dummy.hp = Math.max(0, dummy.hp - damageApplied);
    if (dummy.behavior === "aggressive" && dummy.maxHit > 0) {
      dummy.isAggroed = true;
      const playerTile = this.deps.getPlayerTile();
      dummy.facing = this.resolveFacingTowards(
        dummy.tileX,
        dummy.tileY,
        playerTile.x,
        playerTile.y,
        dummy.facing
      );
    }
    this.showDamageNumber(dummy.sprite.x, dummy.sprite.y - 38, damageApplied, "player");
    if (damageApplied > 0) {
      this.deps.playMobHitSound?.(dummy.modelId);
    }

    if (dummy.hp > 0) {
      if (dummy.id === this.deps.getInspectedDummyId()) {
        this.deps.refreshInspectedDummyLabel();
      }
      return { damageApplied, killed: false };
    }

    this.deps.killDummy(dummy);
    return { damageApplied, killed: true };
  }

  private resolveFacingTowards(
    fromTileX: number,
    fromTileY: number,
    toTileX: number,
    toTileY: number,
    fallbackFacing: Facing
  ): Facing {
    const dx = toTileX - fromTileX;
    const dy = toTileY - fromTileY;
    if (dx === 0 && dy === 0) {
      return fallbackFacing;
    }
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? "right" : "left";
    }
    return dy >= 0 ? "down" : "up";
  }

  private canAffordSpellMana(spell: SpellCastRequest): boolean {
    const progress = this.deps.getPlayerProgress();
    if (progress.mp < spell.manaCost) {
      this.deps.getGameUi().addCombatLine(
        `No tenés suficiente maná para ${spell.nombre} (${progress.mp}/${spell.manaCost}).`
      );
      return false;
    }
    return true;
  }

  private spendManaForSpell(spell: SpellCastRequest): boolean {
    if (!this.canAffordSpellMana(spell)) {
      return false;
    }
    this.deps.getPlayerProgress().mp -= spell.manaCost;
    this.deps.refreshHud();
    return true;
  }

  private playLocalSpellFx(
    spellId: number,
    spellNombre: string,
    tileX: number,
    tileY: number
  ): void {
    this.deps.showSpellMagicWords(spellId, spellNombre);
    this.deps.playSpellEffect(spellId, tileX, tileY);
    this.deps.setSuppressServerSpellFxUntil(this.deps.time.now + 300);
  }

  private applyInmovilizadoDebuffToDummy(
    dummy: DummyState,
    sourceName: string,
    spellId: number
  ): void {
    const now = Date.now();
    const durationMs = getImmobilizeMobDurationMs(spellId);
    const wasImmobilized = isMobImmobilizedAt(dummy.immobilizedUntilMs, now);
    dummy.immobilizedUntilMs = Math.max(dummy.immobilizedUntilMs, now + durationMs);
    dummy.netMoveQueue = [];
    this.deps.tweens.killTweensOf(dummy.sprite);
    dummy.isMoving = false;
    dummy.netMoveTargetTile = undefined;

    const gameUi = this.deps.getGameUi();
    if (wasImmobilized) {
      gameUi.addCombatLine(
        `${sourceName} refuerza Inmovilizado en ${dummy.name} (${formatImmobilizeRemaining(
          dummy.immobilizedUntilMs - now
        )}).`
      );
      return;
    }
    gameUi.addCombatLine(
      `${sourceName} inmoviliza a ${dummy.name} por ${formatImmobilizeDuration(durationMs)}.`
    );
  }

  private clearActivePlayerDamageNumber(): void {
    if (this.activePlayerDamageTween) {
      this.activePlayerDamageTween.stop();
      this.activePlayerDamageTween = undefined;
    }
    if (this.activePlayerDamageText) {
      this.activePlayerDamageText.destroy();
      this.activePlayerDamageText = undefined;
    }
  }
}
