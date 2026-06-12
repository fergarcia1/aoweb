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
const OVERLAY_ALPHA = 0.62;

const PANEL = {
  bg: 0x151515,
  border: 0x4a4a4a,
};

const BTN = {
  primary: 0x2a3446,
  primaryHover: 0x354055,
  secondary: 0x1b1f2a,
  secondaryHover: 0x252b38,
  border: 0x5c5c5c,
  text: "#e6edf3",
  textMuted: "#9aa3b2",
};

const BTN_W = 100;
const BTN_H = 20;
const BTN_GAP = 6;
const PANEL_PAD_X = 14;
const PANEL_PAD_Y = 10;

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
  private dragged = false;
  private viewport: GameViewportRect = { x: 0, y: 0, width: 0, height: 0 };
  private frameSize = { width: 220, height: 120 };

  constructor(
    scene: Phaser.Scene,
    private readonly handlers: DeathOverlayHandlers
  ) {
    this.container = scene.add.container(0, 0).setDepth(50_000).setScrollFactor(0);

    this.backdrop = scene.add
      .rectangle(0, 0, 10, 10, OVERLAY_COLOR, OVERLAY_ALPHA)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.panelFrame = scene.add
      .rectangle(0, 0, 10, 10, PANEL.bg, 0.72)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(1, PANEL.border, 0.8);

    const title = scene.add
      .text(0, 0, "Has muerto", {
        fontFamily: GAME_FONT,
        fontSize: "12px",
        color: "#e6edf3",
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
          fontSize: "9px",
          color: "#9aa3b2",
          align: "center",
          wordWrap: { width: 180 },
          resolution: GAME_TEXT_RESOLUTION,
        }
      )
      .setOrigin(0.5, 0);

    this.acceptBtn = this.createButton(
      scene,
      "Ir al sacerdote",
      BTN.primary,
      BTN.primaryHover,
      true,
      () => {
        this.handlers.onAcceptPriest();
      }
    );
    this.cancelBtn = this.createButton(
      scene,
      "Quedar fantasma",
      BTN.secondary,
      BTN.secondaryHover,
      false,
      () => {
        this.handlers.onStayGhost();
      }
    );

    this.panel = scene.add.container(0, 0, [
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

    this.panelFrame.setInteractive({ draggable: true, useHandCursor: true });
    scene.input.setDraggable(this.panelFrame);
    this.panelFrame.on("drag", (pointer: Phaser.Input.Pointer) => {
      this.dragged = true;
      const clamped = this.clampPanelPosition(pointer.x, pointer.y);
      this.panel.setPosition(clamped.x, clamped.y);
    });
  }

  private clampPanelPosition(x: number, y: number): { x: number; y: number } {
    const halfW = this.frameSize.width / 2;
    const halfH = this.frameSize.height / 2;
    const minX = this.viewport.x + halfW;
    const maxX = this.viewport.x + Math.max(halfW, this.viewport.width - halfW);
    const minY = this.viewport.y + halfH;
    const maxY = this.viewport.y + Math.max(halfH, this.viewport.height - halfH);
    return {
      x: Phaser.Math.Clamp(x, minX, maxX),
      y: Phaser.Math.Clamp(y, minY, maxY),
    };
  }

  private createButton(
    scene: Phaser.Scene,
    text: string,
    fill: number,
    hoverFill: number,
    emphasized: boolean,
    onClick: () => void
  ): DeathButton {
    const bg = scene.add
      .rectangle(0, 0, BTN_W, BTN_H, fill, 1)
      .setOrigin(0.5, 0)
      .setStrokeStyle(1, emphasized ? PANEL.border : BTN.border, 1)
      .setInteractive({ useHandCursor: true });
    const label = scene.add
      .text(0, BTN_H / 2, text, {
        fontFamily: GAME_FONT,
        fontSize: "9px",
        color: emphasized ? BTN.text : BTN.textMuted,
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
    bg.on("pointerover", () => bg.setFillStyle(hoverFill, 1));
    bg.on("pointerout", () => bg.setFillStyle(fill, 1));

    return { bg, label, fill, hoverFill };
  }

  show(viewport: GameViewportRect) {
    this.visible = true;
    this.dragged = false;
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

    const panelW = Math.min(220, viewport.width - 24);
    const cx = viewport.x + viewport.width / 2;
    const cy = viewport.y + viewport.height / 2;

    const body = this.panel.list[2] as Phaser.GameObjects.Text;
    body.setWordWrapWidth(panelW - PANEL_PAD_X * 2);

    const contentW = BTN_W * 2 + BTN_GAP;
    const frameW = Math.max(panelW, contentW + PANEL_PAD_X * 2);
    const titleH = 14;
    const bodyH = body.height;
    const frameH = PANEL_PAD_Y * 2 + titleH + 6 + bodyH + 10 + BTN_H;

    this.panelFrame.setSize(frameW, frameH);
    this.panelFrame.setPosition(0, 0);
    this.frameSize = { width: frameW, height: frameH };

    const title = this.panel.list[1] as Phaser.GameObjects.Text;
    let y = -frameH / 2 + PANEL_PAD_Y;
    title.setPosition(0, y);
    y += titleH + 6;
    body.setPosition(0, y);
    y += bodyH + 10;

    this.acceptBtn.bg.setPosition(-BTN_W / 2 - BTN_GAP / 2, y);
    this.acceptBtn.label.setPosition(this.acceptBtn.bg.x, y + BTN_H / 2);
    this.cancelBtn.bg.setPosition(BTN_W / 2 + BTN_GAP / 2, y);
    this.cancelBtn.label.setPosition(this.cancelBtn.bg.x, y + BTN_H / 2);

    if (!this.dragged) {
      this.panel.setPosition(cx, cy);
    } else {
      const clamped = this.clampPanelPosition(this.panel.x, this.panel.y);
      this.panel.setPosition(clamped.x, clamped.y);
    }
    this.container.bringToTop(this.panel);
  }

  getContainer() {
    return this.container;
  }

  destroy() {
    this.container.destroy(true);
  }
}
