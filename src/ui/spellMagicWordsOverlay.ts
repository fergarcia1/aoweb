import Phaser from "phaser";
import { SPELL_MAGIC_WORDS_DURATION_MS } from "../spells/spellEffects";
import {
  AO_FONT2_BITMAP_KEY,
  AO_FONT2_MAGIC_WORDS_SCALE,
  AO_FONT2_MAGIC_WORDS_TINT,
  isAoFont2Ready,
} from "./aoBitmapFont";
import { GAME_FONT, GAME_TEXT_RESOLUTION } from "./fonts";

/** Píxeles arriba de los pies del sprite (origen 0.5,1) hasta la base del texto. */
const MAGIC_WORDS_OFFSET_Y = 50;

export type SpellMagicWordsAnchor = {
  x: number;
  y: number;
  depth: number;
};

/**
 * Texto flotante de palabras mágicas sobre el lanzador (estilo IAO).
 */
export class SpellMagicWordsOverlay {
  private text?: Phaser.GameObjects.BitmapText | Phaser.GameObjects.Text;
  private hideTimer?: Phaser.Time.TimerEvent;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly getAnchor: () => SpellMagicWordsAnchor | null,
    private readonly ignoreCamera?: Phaser.Cameras.Scene2D.Camera,
    private readonly worldLayer?: Phaser.GameObjects.Container
  ) {}

  show(words: string): void {
    const trimmed = words.trim();
    if (!trimmed) {
      return;
    }

    this.clear();

    const anchor = this.getAnchor();
    if (!anchor) {
      return;
    }

    const y = anchor.y - MAGIC_WORDS_OFFSET_Y;

    if (isAoFont2Ready(this.scene)) {
      this.text = this.scene.add
        .bitmapText(anchor.x, y, AO_FONT2_BITMAP_KEY, trimmed)
        .setOrigin(0.5, 1)
        .setScale(AO_FONT2_MAGIC_WORDS_SCALE)
        .setTintFill(AO_FONT2_MAGIC_WORDS_TINT)
        .setDepth(anchor.depth);
    } else {
      this.text = this.scene.add
        .text(anchor.x, y, trimmed, {
          fontFamily: GAME_FONT,
          fontSize: "10px",
          color: "#ffe08a",
          fontStyle: "italic",
          stroke: "#2a1800",
          strokeThickness: 2,
          resolution: GAME_TEXT_RESOLUTION,
        })
        .setOrigin(0.5, 1)
        .setDepth(anchor.depth);
    }

    if (this.text) {
      if (this.worldLayer) {
        this.worldLayer.add(this.text);
      }
      if (this.ignoreCamera) {
        this.ignoreCamera.ignore(this.text);
      }
    }

    this.hideTimer = this.scene.time.delayedCall(SPELL_MAGIC_WORDS_DURATION_MS, () => {
      this.clear();
    });
  }

  syncPosition(): void {
    if (!this.text?.active) {
      return;
    }
    const anchor = this.getAnchor();
    if (!anchor) {
      return;
    }
    this.text.setPosition(anchor.x, anchor.y - MAGIC_WORDS_OFFSET_Y);
    this.text.setDepth(anchor.depth);
  }

  clear(): void {
    if (this.hideTimer) {
      this.hideTimer.remove(false);
      this.hideTimer = undefined;
    }
    if (this.text) {
      this.text.destroy();
      this.text = undefined;
    }
  }
}
