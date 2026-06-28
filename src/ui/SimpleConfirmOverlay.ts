import Phaser from "phaser";
import { GAME_FONT, GAME_TEXT_RESOLUTION } from "./fonts";

type ConfirmOverlayHandlers = {
  onConfirm: () => void;
  onCancel: () => void;
};

const OVERLAY_COLOR = 0x0a0c10;
const OVERLAY_ALPHA = 0.6;

const PALETTE = {
  panel: 0x120807,
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

type Button = {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  fill: number;
  hoverFill: number;
};

export class SimpleConfirmOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Container;
  private readonly panelBg: Phaser.GameObjects.Rectangle;
  private readonly panelFrame: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly messageText: Phaser.GameObjects.Text;
  private readonly acceptBtn: Button;
  private readonly cancelBtn: Button;

  private visible = false;
  private handlers: ConfirmOverlayHandlers | null = null;
  private frameSize = { width: 280, height: 160 };
  private viewport = new Phaser.Geom.Rectangle(0, 0, 0, 0);
  private dragState: { offsetX: number; offsetY: number } | null = null;
  private hasCustomPanelPosition = false;

  constructor(scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setDepth(50_000).setScrollFactor(0);

    this.backdrop = scene.add
      .rectangle(0, 0, 1, 1, OVERLAY_COLOR, OVERLAY_ALPHA)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on(
        "pointerdown",
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData
        ) => {
          event.stopPropagation();
          this.handleCancel();
        }
      );

    this.panelBg = scene.add
      .rectangle(0, 0, 1, 1, PALETTE.panel, 0.96)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(1, PALETTE.border, 0.9)
      .setInteractive({ useHandCursor: true });

    this.panelFrame = scene.add
      .rectangle(0, 0, 1, 1)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(2, PALETTE.borderBright, 0.95);

    this.title = scene.add
      .text(0, 0, "Confirmacion", {
        fontFamily: GAME_FONT,
        fontSize: "14px",
        color: `#${PALETTE.title.toString(16)}`,
        fontStyle: "bold",
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);

    this.messageText = scene.add
      .text(0, 0, "", {
        fontFamily: GAME_FONT,
        fontSize: "12px",
        color: `#${PALETTE.text.toString(16)}`,
        align: "center",
        wordWrap: { width: this.frameSize.width - PANEL_PAD_X * 2 },
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0.5);

    this.acceptBtn = this.createButton(scene, "Si", () => this.handleAccept());
    this.cancelBtn = this.createButton(scene, "No", () => this.handleCancel());

    this.panel = scene.add.container(0, 0, [
      this.panelBg,
      this.panelFrame,
      this.title,
      this.messageText,
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

  private createButton(scene: Phaser.Scene, text: string, onClick: () => void): Button {
    const fill = PALETTE.btn.bg;
    const hoverFill = PALETTE.btn.bgHover;
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

  show(scene: Phaser.Scene, title: string, message: string, handlers: ConfirmOverlayHandlers) {
    const wasVisible = this.visible;
    this.visible = true;
    this.handlers = handlers;
    this.title.setText(title || "Confirmacion");
    this.messageText.setText(message);
    if (!wasVisible) {
      this.hasCustomPanelPosition = false;
      this.dragState = null;
    }
    this.container.setVisible(true);
    this.container.setDepth(50_000);
    scene.children.bringToTop(this.container);
    this.layout(scene.scale.getViewPort());
  }

  hide() {
    this.visible = false;
    this.handlers = null;
    this.dragState = null;
    this.container.setVisible(false);
  }

  isOpen() {
    return this.visible;
  }

  handleKeyDown(event: KeyboardEvent) {
    if (!this.visible) {
      return;
    }

    const key = event.key.toLowerCase();
    if (event.key === "Enter" || key === "y" || key === "s") {
      event.preventDefault();
      event.stopPropagation();
      this.handleAccept();
      return;
    }
    if (event.key === "Escape" || key === "n") {
      event.preventDefault();
      event.stopPropagation();
      this.handleCancel();
    }
  }

  private handleAccept() {
    if (!this.handlers) return;
    const handlers = this.handlers;
    this.hide();
    handlers.onConfirm();
  }

  private handleCancel() {
    if (!this.handlers) return;
    const handlers = this.handlers;
    this.hide();
    handlers.onCancel();
  }

  private layout(viewport: Phaser.Geom.Rectangle) {
    this.viewport = viewport;
    this.backdrop.setPosition(viewport.x, viewport.y).setSize(viewport.width, viewport.height);
    if (this.hasCustomPanelPosition) {
      this.setPanelPosition(this.panel.x, this.panel.y);
    } else {
      this.setPanelPosition(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
    }

    const { width: frameW, height: frameH } = this.frameSize;
    this.panelBg.setSize(frameW, frameH);
    this.panelFrame.setSize(frameW, frameH);

    let y = -frameH / 2 + PANEL_PAD_Y;
    this.title.setPosition(0, y);

    y += this.title.height + 18;
    this.messageText.setPosition(0, y);

    const btnY = frameH / 2 - PANEL_PAD_Y - BTN_H / 2;
    this.acceptBtn.bg.setPosition(-BTN_W / 2 - BTN_GAP / 2, btnY);
    this.acceptBtn.label.setPosition(this.acceptBtn.bg.x, this.acceptBtn.bg.y);
    this.cancelBtn.bg.setPosition(BTN_W / 2 + BTN_GAP / 2, btnY);
    this.cancelBtn.label.setPosition(this.cancelBtn.bg.x, this.cancelBtn.bg.y);
  }

  destroy() {
    this.container.scene?.input.off("pointermove", this.handlePointerMove, this);
    this.container.scene?.input.off("pointerup", this.handlePointerUp, this);
    this.container.destroy(true);
  }
}
