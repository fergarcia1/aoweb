import Phaser from "phaser";
import { TILE_SIZE } from "../../config";
import { tileToFeetWorld } from "../../player/playerSprites";
import { getItemDefinition, type EquipmentSlot, type ItemId } from "../../items/itemDefinitions";
import { rollAttackDamage } from "../../../shared/combat";
import { spellRequiresAnilloEspectral } from "../../data/spells";
import { getSpellEffectConfig, IMMOBILIZE_SPELL_IDS } from "../../spells/spellEffects";
import type { CoreStats } from "../../game/characterStats";
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
  INMOVILIZADO_MOB_DURATION_MS,
} from "./constants";
import {
  getMissChanceFromAgility,
  getStrengthDamageBonus,
} from "./progressFormulas";
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
  getPlayerProgress: () => { hp: number; hpMax: number; mp: number; mpMax: number };
  getEquipment: () => Record<EquipmentSlot, ItemId | null>;
  getCoreStats: () => CoreStats;
  getFacing: () => Facing;
  getPlayerTile: () => { x: number; y: number };
  getCurrentMapId: () => string;

  hasLearnedSpell: (spellId: number) => boolean;
  getMagicSkillLevel: () => number;
  hasAnilloEspectralInInventory: () => boolean;
  isPlayerDeadOrGhost: () => boolean;
  isMultiplayerActive: () => boolean;

  stopMeditation: () => void;
  refreshHud: () => void;
  tryImproveMagicOnSpellCast: () => void;
  onPlayerHpDepleted: () => void;

  sendAttackToServer: (facing: Facing) => void;
  sendCastSpellToServer: (spellId: number, tileX: number, tileY: number) => void;

  getDummyInAttackRange: () => DummyState | null;
  getDummyHitTile: (dummy: DummyState) => { x: number; y: number };
  killDummy: (dummy: DummyState) => void;
  refreshInspectedDummyLabel: () => void;
  getInspectedDummyId: () => string | null;

  playSpellEffect: (spellId: number, tileX: number, tileY: number) => void;
  setSuppressServerSpellFxUntil: (until: number) => void;
  onMeleeImpact?: () => void;
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
    return (
      spell.danioMax > 0 ||
      spell.danioMin > 0 ||
      IMMOBILIZE_SPELL_IDS.has(spell.idSpell)
    );
  }

  spellCanTargetPlayer(spell: SpellCastRequest): boolean {
    return spell.puedeUsarseEnAliados || spell.healMax > 0 || Boolean(spell.remueveDebuff);
  }

  beginSpellTargeting(spell: SpellCastRequest): boolean {
    this.deps.stopMeditation();
    const gameUi = this.deps.getGameUi();

    if (this.deps.isPlayerDeadOrGhost()) {
      gameUi.addChatLine("No podés lanzar hechizos en esta forma.");
      return false;
    }
    if (!this.deps.hasLearnedSpell(spell.idSpell)) {
      gameUi.addChatLine(`No conocés ${spell.nombre}.`);
      return false;
    }
    if (spellRequiresAnilloEspectral(spell.idSpell) && !this.deps.hasAnilloEspectralInInventory()) {
      gameUi.addChatLine("Necesitas un anillo espectral para usar este hechizo.");
      return false;
    }
    if (spell.nivelMagiaRequerido > this.deps.getMagicSkillLevel()) {
      gameUi.addChatLine(
        `${spell.nombre} requiere ${spell.nivelMagiaRequerido} puntos de Magia (tenés ${this.deps.getMagicSkillLevel()}).`
      );
      return false;
    }

    if (this.pendingSpellCast?.idSpell === spell.idSpell) {
      this.cancelSpellTargeting(`Cancelaste ${spell.nombre}.`);
      return false;
    }

    this.pendingSpellCast = spell;
    this.deps.input.setDefaultCursor("crosshair");
    gameUi.addChatLine(
      `Objetivo de ${spell.nombre}: hacé click en ${this.getSpellTargetHint(spell)} (ESC para cancelar).`
    );
    return true;
  }

  cancelSpellTargeting(message?: string): void {
    this.pendingSpellCast = null;
    this.deps.input.setDefaultCursor("default");
    if (message) {
      this.deps.getGameUi().addChatLine(message);
    }
  }

  tryCastSpellOnPlayer(): void {
    const spell = this.pendingSpellCast;
    if (!spell) return;

    const gameUi = this.deps.getGameUi();

    if (this.deps.isMultiplayerActive()) {
      if (!this.spellCanTargetPlayer(spell)) {
        gameUi.addCombatLine(`${spell.nombre} no puede lanzarse sobre aliados.`);
        this.cancelSpellTargeting("Lanzamiento cancelado.");
        return;
      }
      if (!this.canAffordSpellMana(spell)) {
        return;
      }
      const tile = this.deps.getPlayerTile();
      this.playLocalSpellFx(spell.idSpell, tile.x, tile.y);
      this.deps.sendCastSpellToServer(spell.idSpell, tile.x, tile.y);
      this.cancelSpellTargeting(`${spell.nombre} lanzado.`);
      return;
    }

    if (!this.spellCanTargetPlayer(spell)) {
      gameUi.addCombatLine(`${spell.nombre} no puede lanzarse sobre aliados.`);
      this.cancelSpellTargeting("Lanzamiento cancelado.");
      return;
    }
    if (!this.spendManaForSpell(spell)) {
      return;
    }

    let anyEffect = false;
    const progress = this.deps.getPlayerProgress();

    if (spell.healMax > 0 || spell.healMin > 0) {
      const min = Math.max(0, Math.floor(spell.healMin));
      const max = Math.max(min, Math.floor(spell.healMax));
      const healAmount = Phaser.Math.Between(min, max);
      const before = progress.hp;
      progress.hp = Math.min(progress.hpMax, progress.hp + healAmount);
      const restored = progress.hp - before;
      gameUi.addCombatLine(`${spell.nombre} te cura ${restored} HP.`);
      anyEffect = true;
    }

    if (spell.remueveDebuff) {
      gameUi.addCombatLine(`${spell.nombre} remueve ${spell.remueveDebuff}.`);
      anyEffect = true;
    }

    const tile = this.deps.getPlayerTile();
    this.playLocalSpellFx(spell.idSpell, tile.x, tile.y);

    if (!anyEffect) {
      gameUi.addCombatLine(`${spell.nombre} no tuvo efecto sobre ese objetivo.`);
    }

    this.deps.tryImproveMagicOnSpellCast();
    this.deps.refreshHud();
    this.cancelSpellTargeting(`${spell.nombre} lanzado.`);
  }

  tryCastSpellOnDummy(dummy: DummyState): void {
    const spell = this.pendingSpellCast;
    if (!spell) return;

    const gameUi = this.deps.getGameUi();
    const mapId = this.deps.getCurrentMapId();

    if (this.deps.isMultiplayerActive()) {
      if (!dummy.alive || dummy.mapId !== mapId) {
        gameUi.addCombatLine("Ese objetivo no está disponible.");
        this.cancelSpellTargeting("Lanzamiento cancelado.");
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
      this.playLocalSpellFx(spell.idSpell, dummy.tileX, dummy.tileY);
      this.deps.sendCastSpellToServer(spell.idSpell, dummy.tileX, dummy.tileY);
      this.cancelSpellTargeting(`${spell.nombre} lanzado.`);
      return;
    }

    if (!dummy.alive || dummy.mapId !== mapId) {
      gameUi.addCombatLine("Ese objetivo no está disponible.");
      this.cancelSpellTargeting("Lanzamiento cancelado.");
      return;
    }
    if (!this.spellCanTargetDummy(spell)) {
      gameUi.addCombatLine(`${spell.nombre} no puede lanzarse sobre enemigos.`);
      this.cancelSpellTargeting("Lanzamiento cancelado.");
      return;
    }
    if (!this.spendManaForSpell(spell)) {
      return;
    }

    this.playLocalSpellFx(spell.idSpell, dummy.tileX, dummy.tileY);

    if (IMMOBILIZE_SPELL_IDS.has(spell.idSpell)) {
      this.applyInmovilizadoDebuffToDummy(dummy, spell.nombre);
      this.deps.tryImproveMagicOnSpellCast();
      this.cancelSpellTargeting(`${spell.nombre} lanzado.`);
      return;
    }

    const min = Math.max(0, Math.floor(spell.danioMin));
    const max = Math.max(min, Math.floor(spell.danioMax));
    const baseDamage = Phaser.Math.Between(min, max);
    const combat = this.getCombatSnapshot();
    const damage = Math.max(
      0,
      Math.floor(baseDamage * (1 + combat.magicDamageBonusPercent))
    );
    const result = this.dealDamageToDummy(dummy, damage);

    if (!getSpellEffectConfig(spell.idSpell)) {
      this.playAttackFeedback(dummy.tileX, dummy.tileY);
    }
    dummy.sprite.setTint(0x9b4dff);
    this.deps.time.delayedCall(90, () => {
      if (dummy.alive) dummy.sprite.clearTint();
    });

    gameUi.addCombatLine(`${spell.nombre} golpea a ${dummy.name} por ${result.damageApplied}.`);

    this.deps.tryImproveMagicOnSpellCast();
    this.cancelSpellTargeting(`${spell.nombre} lanzado.`);
  }

  tryAttackDummy(): void {
    if (this.deps.isPlayerDeadOrGhost()) {
      return;
    }
    if (this.deps.isMultiplayerActive()) {
      this.deps.sendAttackToServer(this.deps.getFacing());
      return;
    }

    const now = this.deps.time.now;
    if (now < this.nextAttackAt) {
      return;
    }

    const targetDummy = this.deps.getDummyInAttackRange();
    const gameUi = this.deps.getGameUi();
    if (!targetDummy) {
      gameUi.addCombatLine("No hay nadie para golpear.");
      return;
    }

    const coreStats = this.deps.getCoreStats();
    const missChance = getMissChanceFromAgility(coreStats.agility);
    const didMiss = Math.random() < missChance;
    const combat = this.getCombatSnapshot();
    this.nextAttackAt = now + ATTACK_COOLDOWN_MS;

    if (didMiss) {
      this.playAttackFeedback(targetDummy.tileX, targetDummy.tileY);
      gameUi.addCombatLine(`Fallaste el golpe (${Math.round(missChance * 100)}% falla).`);
      return;
    }

    const roll = rollAttackDamage(combat.attackMin, combat.attackMax, {
      canCrit: combat.weaponCanCrit,
      critChance: combat.weaponCritChance,
      critDamage: combat.weaponCritDamage,
    });
    const result = this.dealDamageToDummy(targetDummy, roll.damage);

    const hitTile = this.deps.getDummyHitTile(targetDummy);
    this.playAttackFeedback(hitTile.x, hitTile.y);

    targetDummy.sprite.setTint(0xe4b270);
    const baseScaleX = targetDummy.sprite.scaleX;
    const baseScaleY = targetDummy.sprite.scaleY;
    this.deps.tweens.add({
      targets: targetDummy.sprite,
      scaleX: baseScaleX * 1.08,
      scaleY: baseScaleY * 0.92,
      yoyo: true,
      duration: 70,
      ease: "Quad.Out",
    });

    this.deps.time.delayedCall(90, () => {
      if (targetDummy.alive) {
        targetDummy.sprite.clearTint();
      }
    });

    gameUi.addCombatLine(
      `Golpeaste a ${targetDummy.name} por ${result.damageApplied}${roll.isCrit ? " (critico)" : ""}.`
    );
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
    if (dummy.behavior === "aggressive" && dummy.attackDamage > 0) {
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

  private getSpellTargetHint(spell: SpellCastRequest): string {
    if (this.spellCanTargetDummy(spell) && this.spellCanTargetPlayer(spell)) {
      return "enemigo o aliado";
    }
    if (this.spellCanTargetDummy(spell)) {
      return "enemigo";
    }
    return "aliado";
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

  private playLocalSpellFx(spellId: number, tileX: number, tileY: number): void {
    this.deps.playSpellEffect(spellId, tileX, tileY);
    this.deps.setSuppressServerSpellFxUntil(this.deps.time.now + 300);
  }

  private applyInmovilizadoDebuffToDummy(dummy: DummyState, sourceName: string): void {
    const now = this.deps.time.now;
    const wasImmobilized = now < dummy.immobilizedUntilMs;
    dummy.immobilizedUntilMs = Math.max(
      dummy.immobilizedUntilMs,
      now + INMOVILIZADO_MOB_DURATION_MS
    );

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
      `${sourceName} inmoviliza a ${dummy.name} por ${formatImmobilizeDuration(
        INMOVILIZADO_MOB_DURATION_MS
      )}.`
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
