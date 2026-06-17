import Phaser from "phaser";
import { GAME_FONT, GAME_TEXT_RESOLUTION } from "./fonts";

export type GameViewportRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DeathOverlayHandlers = {
  onAcceptPriest: () => void;
  onStayGhost: () => void;
};

const OVERLAY_COLOR = 0x0a0c10;
const OVERLAY_ALPHA = 0.6;

const PALETTE = {
  parchment: 0xeadbb9,
  border: 0x6f4e37,
  text: 0x5c4033,
  btn: {
    bg: 0x8a6c5b,
    bgHover: 0xa48474,
    border: 0x5c4033,
    text: 0xfbf0d9,
  },
};

const BTN_W = 90;
const BTN_H = 24;
const BTN_GAP = 12;
const PANEL_PAD_X = 16;
const PANEL_PAD_Y = 16;

type DeathButton = {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  fill: number;
  hoverFill: number;
};

export class DeathOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Container;
  private readonly panelFrame: Phaser.GameObjects.Rectangle;
  private readonly acceptBtn: DeathButton;
  private readonly cancelBtn: DeathButton;
  private visible = false;
  private viewport: GameViewportRect = { x: 0, y: 0, width: 0, height: 0 };
  private frameSize = { width: 224, height: 154 };

  constructor(
    scene: Phaser.Scene,
    private readonly handlers: DeathOverlayHandlers
  ) {
    this.container = scene.add.container(0, 0).setDepth(50_000).setScrollFactor(0);

    this.backdrop = scene.add
      .rectangle(0, 0, 10, 10, OVERLAY_COLOR, OVERLAY_ALPHA)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    const background = scene.add
      .rectangle(0, 0, 10, 10, PALETTE.parchment, 0.95)
      .setOrigin(0.5, 0.5);

    this.panelFrame = scene.add
      .rectangle(0, 0, 10, 10)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(2, PALETTE.border, 0.95);

    const title = scene.add
      .text(0, 0, "Has muerto", {
        fontFamily: GAME_FONT,
        fontSize: "14px",
        color: `#${PALETTE.text.toString(16)}`,
        fontStyle: "bold",
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);

    const body = scene.add
      .text(
        0,
        0,
        "Un sacerdote de tu ciudad puede devolverte la vida.\n¿Deseas ir al sacerdote de tu hogar?",
        {
          fontFamily: GAME_FONT,
          fontSize: "10px",
          color: `#${PALETTE.text.toString(16)}`,
          align: "center",
          wordWrap: { width: this.frameSize.width - PANEL_PAD_X * 2 },
          resolution: GAME_TEXT_RESOLUTION,
        }
      )
      .setOrigin(0.5, 0);

    this.acceptBtn = this.createButton(
      scene,
      "Ir al sacerdote",
      PALETTE.btn.bg,
      PALETTE.btn.bgHover,
      () => {
        this.handlers.onAcceptPriest();
      }
    );
    this.cancelBtn = this.createButton(
      scene,
      "Quedar fantasma",
      PALETTE.btn.bg,
      PALETTE.btn.bgHover,
      () => {
        this.handlers.onStayGhost();
      }
    );

    this.panel = scene.add.container(0, 0, [
      background,
      this.panelFrame,
      title,
      body,
      this.acceptBtn.bg,
      this.acceptBtn.label,
      this.cancelBtn.bg,
      this.cancelBtn.label,
    ]);
    this.container.add([this.backdrop, this.panel]);
    this.container.setVisible(false);

    scene.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (!this.visible || !this.panel.visible || event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      this.handlers.onStayGhost();
    });
  }

  private createButton(
    scene: Phaser.Scene,
    text: string,
    fill: number,
    hoverFill: number,
    onClick: () => void
  ): DeathButton {
    const bg = scene.add
      .rectangle(0, 0, BTN_W, BTN_H, fill, 0.95)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(1, PALETTE.btn.border, 0.95)
      .setInteractive({ useHandCursor: true });

    const label = scene.add
      .text(0, 0, text, {
        fontFamily: GAME_FONT,
        fontSize: "10px",
        color: `#${PALETTE.btn.text.toString(16)}`,
        fontStyle: "bold",
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0.5);
    label.disableInteractive();


    bg.on(
      "pointerdown",
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        onClick();
      }
    );
    bg.on("pointerover", () => bg.setFillStyle(hoverFill, 0.95));
    bg.on("pointerout", () => bg.setFillStyle(fill, 0.95));

    return { bg, label, fill, hoverFill };
  }

  show(viewport: GameViewportRect) {
    this.visible = true;
    this.container.setVisible(true);
    this.panel.setVisible(true);
    this.layout(viewport);
  }

  hide() {
    this.visible = false;
    this.container.setVisible(false);
  }

  /** Cierra el cartel pero mantiene el velo gris (modo fantasma). */
  hideDialog() {
    this.panel.setVisible(false);
  }

  layout(viewport: GameViewportRect) {
    if (!this.visible) return;
    this.viewport = viewport;

    this.backdrop.setPosition(viewport.x, viewport.y);
    this.backdrop.setSize(viewport.width, viewport.height);

    const cx = viewport.x + viewport.width / 2;
    const cy = viewport.y + viewport.height / 2;
    this.panel.setPosition(cx, cy);

    const { width: frameW, height: frameH } = this.frameSize;

    const background = this.panel.list[0] as Phaser.GameObjects.Rectangle;
    background.setSize(frameW, frameH);
    this.panelFrame.setSize(frameW, frameH);

    const title = this.panel.list[2] as Phaser.GameObjects.Text;
    let y = -frameH / 2 + PANEL_PAD_Y;
    title.setPosition(0, y);

    y += title.height + 18;

    const body = this.panel.list[3] as Phaser.GameObjects.Text;
    body.setPosition(0, y);

    const btnY = frameH / 2 - PANEL_PAD_Y - BTN_H / 2;

    this.acceptBtn.bg.setPosition(-BTN_W / 2 - BTN_GAP / 2, btnY);
    this.acceptBtn.label.setPosition(this.acceptBtn.bg.x, this.acceptBtn.bg.y);
    this.cancelBtn.bg.setPosition(BTN_W / 2 + BTN_GAP / 2, btnY);
    this.cancelBtn.label.setPosition(this.cancelBtn.bg.x, this.cancelBtn.bg.y);

    this.container.bringToTop(this.panel);
  }

  getContainer() {
    return this.container;
  }

  destroy() {
    this.container.destroy(true);
  }
}
