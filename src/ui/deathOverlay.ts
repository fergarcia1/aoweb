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
  panel: 0x120807,
  panelAlt: 0x1d0b09,
  border: 0x9b2d24,
  borderBright: 0xd6a23a,
  title: 0xffd26a,
  text: 0xf1dcc7,
  btn: {
    bg: 0x7a261a,
    bgHover: 0x963124,
    border: 0xd6a23a,
    text: 0xffffff,
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
  private readonly panelBg: Phaser.GameObjects.Rectangle;
  private readonly panelFrame: Phaser.GameObjects.Rectangle;
  private readonly acceptBtn: DeathButton;
  private readonly cancelBtn: DeathButton;
  private visible = false;
  private viewport: GameViewportRect = { x: 0, y: 0, width: 0, height: 0 };
  private frameSize = { width: 224, height: 154 };
  private dragState: { offsetX: number; offsetY: number } | null = null;
  private hasCustomPanelPosition = false;

  constructor(
    scene: Phaser.Scene,
    private readonly handlers: DeathOverlayHandlers
  ) {
    this.container = scene.add.container(0, 0).setDepth(50_000).setScrollFactor(0);

    this.backdrop = scene.add
      .rectangle(0, 0, 10, 10, OVERLAY_COLOR, OVERLAY_ALPHA)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setInteractive()
      .on(
        "pointerdown",
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData
        ) => {
          event.stopPropagation();
        }
      );

    this.panelBg = scene.add
      .rectangle(0, 0, 10, 10, PALETTE.panel, 0.96)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(1, PALETTE.border, 0.9)
      .setInteractive({ useHandCursor: true });

    this.panelFrame = scene.add
      .rectangle(0, 0, 10, 10)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(2, PALETTE.borderBright, 0.95);

    const title = scene.add
      .text(0, 0, "Has muerto", {
        fontFamily: GAME_FONT,
        fontSize: "14px",
        color: `#${PALETTE.title.toString(16)}`,
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
      this.panelBg,
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

    this.panelBg.on(
      "pointerdown",
      (
        pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        this.dragState = {
          offsetX: this.panel.x - pointer.x,
          offsetY: this.panel.y - pointer.y,
        };
        this.hasCustomPanelPosition = true;
        this.container.bringToTop(this.panel);
      }
    );
    scene.input.on("pointermove", this.handlePointerMove, this);
    scene.input.on("pointerup", this.handlePointerUp, this);

    scene.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (!this.visible || !this.panel.visible || event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      this.handlers.onStayGhost();
    });
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.visible || !this.dragState) return;
    this.setPanelPosition(pointer.x + this.dragState.offsetX, pointer.y + this.dragState.offsetY);
  }

  private handlePointerUp() {
    this.dragState = null;
  }

  private setPanelPosition(x: number, y: number) {
    const { width: frameW, height: frameH } = this.frameSize;
    const minX = this.viewport.x + frameW / 2;
    const maxX = this.viewport.x + this.viewport.width - frameW / 2;
    const minY = this.viewport.y + frameH / 2;
    const maxY = this.viewport.y + this.viewport.height - frameH / 2;
    this.panel.setPosition(
      Phaser.Math.Clamp(x, minX, Math.max(minX, maxX)),
      Phaser.Math.Clamp(y, minY, Math.max(minY, maxY))
    );
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
    const wasVisible = this.visible;
    this.visible = true;
    this.container.setVisible(true);
    this.container.setDepth(50_000);
    this.container.scene?.children.bringToTop(this.container);
    this.panel.setVisible(true);
    if (!wasVisible) {
      this.hasCustomPanelPosition = false;
      this.dragState = null;
    }
    this.layout(viewport);
  }

  hide() {
    this.visible = false;
    this.dragState = null;
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

    if (this.hasCustomPanelPosition) {
      this.setPanelPosition(this.panel.x, this.panel.y);
    } else {
      const cx = viewport.x + viewport.width / 2;
      const cy = viewport.y + viewport.height / 2;
      this.setPanelPosition(cx, cy);
    }

    const { width: frameW, height: frameH } = this.frameSize;

    this.panelBg.setSize(frameW, frameH);
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
    this.container.scene?.input.off("pointermove", this.handlePointerMove, this);
    this.container.scene?.input.off("pointerup", this.handlePointerUp, this);
    this.container.destroy(true);
  }
}
