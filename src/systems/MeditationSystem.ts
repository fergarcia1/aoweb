import type Phaser from "phaser";
import {
  applyMeditationSpriteVisuals,
  MEDITATION_FX_OFFSET_Y,
  getMeditationVisualConfig,
  type MeditationVisualConfig,
} from "./meditationVisuals";

const MEDITATION_MP_REGEN_INTERVAL_MS = 1000;
const MEDITATION_MP_REGEN_PERCENT_PER_TICK = 0.08;

export type MeditationCallbacks = {
  isPlayerDeadOrGhost(): boolean;
  isMultiplayerActive(): boolean;
  getPlayerMp(): number;
  getPlayerMpMax(): number;
  setPlayerMp(value: number): void;
  getPlayerLevel(): number;
  getPlayerFactionId(): string;
  requestServerMeditation?: (active: boolean) => void;
  refreshHud(): void;
  addChatLine(msg: string): void;
  cancelSpellTargeting(): void;
  getPlayerFeetWorld(): { x: number; y: number };
  getPlayerDepth(): number;
  getScene(): Phaser.Scene;
  getUiCamera(): Phaser.Cameras.Scene2D.Camera | undefined;
};

export class MeditationSystem {
  private isMeditating = false;
  private regenTimerMs = 0;
  private fx?: Phaser.GameObjects.Sprite;
  private fxConfig?: MeditationVisualConfig;
  private readonly cb: MeditationCallbacks;

  constructor(callbacks: MeditationCallbacks) {
    this.cb = callbacks;
  }

  get active(): boolean {
    return this.isMeditating;
  }

  toggle(source: "command" | "hotkey") {
    if (this.isMeditating) {
      this.stop("Dejaste de meditar.");
      return;
    }
    this.start(source);
  }

  start(source: "command" | "hotkey") {
    if (this.cb.isPlayerDeadOrGhost()) {
      this.cb.addChatLine("No podes meditar estando muerto o en forma fantasma.");
      return;
    }
    if (this.cb.getPlayerMp() >= this.cb.getPlayerMpMax()) {
      this.cb.addChatLine("Ya tenes el mana al maximo.");
      return;
    }

    this.cb.cancelSpellTargeting();
    this.isMeditating = true;
    this.regenTimerMs = 0;
    this.ensureFx();
    this.syncFxPosition();
    if (this.cb.isMultiplayerActive()) {
      this.cb.requestServerMeditation?.(true);
    }
    this.cb.addChatLine(
      source === "command"
        ? "Comenzaste a meditar."
        : "Comenzaste a meditar (N para cancelar)."
    );
  }

  stop(message?: string) {
    if (!this.isMeditating) return;
    this.isMeditating = false;
    this.regenTimerMs = 0;
    if (this.cb.isMultiplayerActive()) {
      this.cb.requestServerMeditation?.(false);
    }
    if (this.fx) {
      this.fx.setVisible(false);
      this.fx.stop();
    }
    if (message) {
      this.cb.addChatLine(message);
    }
  }

  update(deltaMs: number) {
    if (!this.isMeditating) return;

    this.ensureFx();
    if (this.cb.isMultiplayerActive()) {
      if (this.cb.getPlayerMp() >= this.cb.getPlayerMpMax()) {
        this.stop("Tu mana esta completo.");
      }
      return;
    }

    this.regenTimerMs += deltaMs;
    const manaPerTick = this.cb.getPlayerMpMax() * MEDITATION_MP_REGEN_PERCENT_PER_TICK;
    while (this.regenTimerMs >= MEDITATION_MP_REGEN_INTERVAL_MS) {
      this.regenTimerMs -= MEDITATION_MP_REGEN_INTERVAL_MS;
      const nextMp = Math.min(
        this.cb.getPlayerMpMax(),
        this.cb.getPlayerMp() + manaPerTick
      );
      this.cb.setPlayerMp(nextMp);
      this.cb.refreshHud();
    }
    if (this.cb.getPlayerMp() >= this.cb.getPlayerMpMax()) {
      const fullMp = this.cb.getPlayerMpMax();
      this.cb.setPlayerMp(fullMp);
      this.cb.refreshHud();
      this.stop("Tu mana esta completo.");
    }
  }

  syncFxPosition() {
    if (!this.fx || !this.isMeditating) return;
    const feet = this.cb.getPlayerFeetWorld();
    this.fx.setPosition(
      Math.round(feet.x),
      Math.round(feet.y + MEDITATION_FX_OFFSET_Y)
    );
    this.fx.setDepth(this.cb.getPlayerDepth() + 0.06);
  }

  private ensureFx() {
    const feet = this.cb.getPlayerFeetWorld();
    const config = getMeditationVisualConfig(
      this.cb.getPlayerFactionId(),
      this.cb.getPlayerLevel()
    );
    if (!this.fx) {
      const scene = this.cb.getScene();
      this.fx = scene.add
        .sprite(
          Math.round(feet.x),
          Math.round(feet.y + MEDITATION_FX_OFFSET_Y),
          config.key,
          0
        )
        .setOrigin(0.5, 1)
        .setDepth(this.cb.getPlayerDepth() + 0.06);
      const uiCam = this.cb.getUiCamera();
      if (uiCam) {
        uiCam.ignore(this.fx);
      }
    }
    if (!this.fxConfig || this.fxConfig.key !== config.key) {
      this.fx.setTexture(config.key, 0);
      applyMeditationSpriteVisuals(this.fx, config);
      this.fxConfig = config;
    }
    this.fx.setVisible(true);
    this.fx.play(config.animKey, true);
  }
}
