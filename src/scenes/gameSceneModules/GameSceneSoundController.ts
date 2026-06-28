import type Phaser from "phaser";
import {
  playAlternatingNamedWavs,
  playNamedWav,
} from "../../audio/namedWav";
import { playSpellNamedWav, playSpellWav } from "../../audio/spellWav";
import { getSpellNamedWav, getSpellWav } from "../../../game-data/spellEffects";
import { resolveMobHitSoundId } from "../../../game-data/mobCombatSounds";
import { getSpellEffectConfig } from "../../../game-data/spellEffects";
import { isWithinSoundHearingRange } from "../../../shared/soundRange";
import type { MobModelId } from "../../../game-data/mobs";

export type GameSceneSoundDeps = {
  scene: Phaser.Scene;
  getPlayerTile: () => { x: number; y: number };
  getLocalPlayerId: () => string | null;
};

export class GameSceneSoundController {
  private lastSpellCastSoundAt = 0;
  private lastSpellCastSoundId = 0;
  private lastLevelUpSoundAt = 0;

  constructor(private deps: GameSceneSoundDeps) {}

  public playSpellCastSound(spellId: number) {
    const now = this.deps.scene.time.now;
    if (
      this.lastSpellCastSoundId === spellId &&
      now - this.lastSpellCastSoundAt < 350
    ) {
      return;
    }
    const named = getSpellNamedWav(spellId);
    if (named && playSpellNamedWav(this.deps.scene, named)) {
      this.lastSpellCastSoundAt = now;
      this.lastSpellCastSoundId = spellId;
      return;
    }
    const wav = getSpellWav(spellId);
    if (playSpellWav(this.deps.scene, wav)) {
      this.lastSpellCastSoundAt = now;
      this.lastSpellCastSoundId = spellId;
      return;
    }
    if (getSpellEffectConfig(spellId)?.playHitSound) {
      this.playSyntheticHitSound();
      this.lastSpellCastSoundAt = now;
      this.lastSpellCastSoundId = spellId;
    }
  }

  public shouldPlayWorldSound(
    sourceTileX: number,
    sourceTileY: number,
    sourcePlayerId?: string | null
  ): boolean {
    const localId = this.deps.getLocalPlayerId();
    if (sourcePlayerId && localId && sourcePlayerId === localId) {
      return true;
    }
    const playerTile = this.deps.getPlayerTile();
    return isWithinSoundHearingRange(
      playerTile.x,
      playerTile.y,
      sourceTileX,
      sourceTileY
    );
  }

  public playMobHitSound(modelId: MobModelId): void {
    const soundId = resolveMobHitSoundId(modelId);
    if (soundId) {
      playNamedWav(this.deps.scene, soundId, 0.48);
    }
  }

  public playPotionUseSound(): void {
    playNamedWav(this.deps.scene, "pocionAzul", 0.5);
  }

  public playLevelUpSoundOnce(): void {
    const now = Date.now();
    if (now - this.lastLevelUpSoundAt < 800) {
      return;
    }
    this.lastLevelUpSoundAt = now;
    playNamedWav(this.deps.scene, "lvlUp", 0.65);
  }

  public playGoldDropSound(): void {
    playNamedWav(this.deps.scene, "goldDrop", 0.5);
  }

  public playAirHitSound(): void {
    playNamedWav(this.deps.scene, "golpeAire", 0.45);
  }

  public playMeleeMissSound(): void {
    playNamedWav(this.deps.scene, "golpeAim", 0.46);
  }

  public playWeaponEquipSound(): void {
    playNamedWav(this.deps.scene, "weaponEquip", 0.5);
  }

  public playArmorEquipSound(): void {
    playNamedWav(this.deps.scene, "equiparArmor", 0.5);
  }

  public playCriticalHitSound(): void {
    playNamedWav(this.deps.scene, "apu", 0.55);
  }

  public playArrowHitSound(): void {
    playNamedWav(this.deps.scene, "arrowHit", 0.5);
  }

  public playArrowMissSound(): void {
    playNamedWav(this.deps.scene, "arrowMiss", 0.48);
  }

  public playClanCreatedSound(): void {
    playNamedWav(this.deps.scene, "creacionClan", 0.58);
  }

  public playDropSound(): void {
    playNamedWav(this.deps.scene, "drop", 0.5);
  }

  public playDoorSound(): void {
    playNamedWav(this.deps.scene, "openingDoor", 0.5);
  }

  public playShieldBlockSound(): void {
    playNamedWav(this.deps.scene, "shieldBlock", 0.52);
  }

  public playPlayerDeathSound(): void {
    playNamedWav(this.deps.scene, "muerte", 0.58);
  }

  public playHeavyMobFootstepSound(): void {
    playAlternatingNamedWavs(
      this.deps.scene,
      ["pasoGolem", "pasoGolem2"],
      0.44,
      "mob_golem_step"
    );
  }

  public playSpawnSound(): void {
    playNamedWav(this.deps.scene, "spawnInWorld", 0.55);
  }

  public playSyntheticHitSound() {
    if (!("context" in this.deps.scene.sound)) {
      return;
    }

    const context = (this.deps.scene.sound as any).context as AudioContext;
    if (!context) return;

    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(170, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.07);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}
