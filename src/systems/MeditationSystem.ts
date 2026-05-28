import type Phaser from "phaser";

const MEDITATION_TEXTURE_KEY = "spell_meditation_fx";
const MEDITATION_ANIM_KEY = "spell_meditation_anim";
const MEDITATION_FRAME_SEQUENCE = [0, 2, 4, 6, 8, 10];
const MEDITATION_FX_OFFSET_Y = -6;
const MEDITATION_MP_REGEN_INTERVAL_MS = 1000;
const MEDITATION_MP_REGEN_PERCENT_PER_TICK = 0.12;

export type MeditationCallbacks = {
  isPlayerDeadOrGhost(): boolean;
  getPlayerMp(): number;
  getPlayerMpMax(): number;
  setPlayerMp(value: number): void;
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
      this.cb.addChatLine("No podés meditar estando muerto o en forma fantasma.");
      return;
    }
    if (this.cb.getPlayerMp() >= this.cb.getPlayerMpMax()) {
      this.cb.addChatLine("Ya tenés el maná al máximo.");
      return;
    }

    this.cb.cancelSpellTargeting();
    this.isMeditating = true;
    this.regenTimerMs = 0;
    this.ensureFx();
    this.syncFxPosition();
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

    this.regenTimerMs += deltaMs;
    const manaPerTick = this.cb.getPlayerMpMax() * MEDITATION_MP_REGEN_PERCENT_PER_TICK;
    while (this.regenTimerMs >= MEDITATION_MP_REGEN_INTERVAL_MS) {
      this.regenTimerMs -= MEDITATION_MP_REGEN_INTERVAL_MS;
      this.cb.setPlayerMp(
        Math.min(this.cb.getPlayerMpMax(), this.cb.getPlayerMp() + manaPerTick)
      );
      this.cb.refreshHud();
    }
    if (this.cb.getPlayerMp() >= this.cb.getPlayerMpMax()) {
      this.cb.setPlayerMp(this.cb.getPlayerMpMax());
      this.cb.refreshHud();
      this.stop("Tu maná está completo.");
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
    if (!this.fx) {
      const scene = this.cb.getScene();
      this.fx = scene.add
        .sprite(
          Math.round(feet.x),
          Math.round(feet.y + MEDITATION_FX_OFFSET_Y),
          MEDITATION_TEXTURE_KEY,
          MEDITATION_FRAME_SEQUENCE[0]
        )
        .setOrigin(0.5, 1)
        .setDepth(this.cb.getPlayerDepth() + 0.06)
        .setScale(1);
      const uiCam = this.cb.getUiCamera();
      if (uiCam) {
        uiCam.ignore(this.fx);
      }
    }
    this.fx.setVisible(true);
    this.fx.play(MEDITATION_ANIM_KEY, true);
  }
}
