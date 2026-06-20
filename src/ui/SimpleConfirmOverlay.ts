import Phaser from "phaser";
import { GAME_FONT, GAME_TEXT_RESOLUTION } from "./fonts";

type ConfirmOverlayHandlers = {
  onConfirm: () => void;
  onCancel: () => void;
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
  
  private title: Phaser.GameObjects.Text;
  private messageText: Phaser.GameObjects.Text;
  private acceptBtn: Button;
  private cancelBtn: Button;

  private visible = false;
  private handlers: ConfirmOverlayHandlers | null = null;
  private frameSize = { width: 280, height: 160 };

  constructor(scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setDepth(50_000).setScrollFactor(0);

    this.backdrop = scene.add
      .rectangle(0, 0, 1, 1, OVERLAY_COLOR, OVERLAY_ALPHA)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.handleCancel());

    const background = scene.add
      .rectangle(0, 0, 1, 1, PALETTE.parchment, 0.95)
      .setOrigin(0.5, 0.5);

    const panelFrame = scene.add
      .rectangle(0, 0, 1, 1)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(2, PALETTE.border, 0.95);

    this.title = scene.add.text(0, 0, "Confirmación", {
      fontFamily: GAME_FONT,
      fontSize: "14px",
      color: `#${PALETTE.text.toString(16)}`,
      fontStyle: "bold",
      resolution: GAME_TEXT_RESOLUTION,
    }).setOrigin(0.5, 0);

    this.messageText = scene.add.text(0, 0, "", {
      fontFamily: GAME_FONT,
      fontSize: "12px",
      color: `#${PALETTE.text.toString(16)}`,
      align: "center",
      wordWrap: { width: this.frameSize.width - PANEL_PAD_X * 2 },
      resolution: GAME_TEXT_RESOLUTION,
    }).setOrigin(0.5, 0.5);

    this.acceptBtn = this.createButton(scene, "Sí", () => this.handleAccept());
    this.cancelBtn = this.createButton(scene, "No", () => this.handleCancel());

    this.panel = scene.add.container(0, 0, [
      background,
      panelFrame,
      this.title,
      this.messageText,
      this.acceptBtn.bg,
      this.acceptBtn.label,
      this.cancelBtn.bg,
      this.cancelBtn.label,
    ]);
    
    this.container.add([this.backdrop, this.panel]);
    this.container.setVisible(false);
  }

  private createButton(scene: Phaser.Scene, text: string, onClick: () => void): Button {
    const fill = PALETTE.btn.bg;
    const hoverFill = PALETTE.btn.bgHover;
    const bg = scene.add
      .rectangle(0, 0, BTN_W, BTN_H, fill, 0.95)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(1, PALETTE.btn.border, 0.95)
      .setInteractive({ useHandCursor: true });
    const label = scene.add.text(0, 0, text, {
        fontFamily: GAME_FONT,
        fontSize: "10px",
        color: `#${PALETTE.btn.text.toString(16)}`,
        fontStyle: "bold",
        resolution: GAME_TEXT_RESOLUTION,
      }).setOrigin(0.5, 0.5);
    label.disableInteractive();
    bg.on("pointerdown", (p: Phaser.Input.Pointer, lx:number, ly:number, e:Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      onClick();
    });
    bg.on("pointerover", () => bg.setFillStyle(hoverFill, 0.95));
    bg.on("pointerout", () => bg.setFillStyle(fill, 0.95));
    return { bg, label, fill, hoverFill };
  }
  
  show(scene: Phaser.Scene, title: string, message: string, handlers: ConfirmOverlayHandlers) {
    this.visible = true;
    this.handlers = handlers;
    this.title.setText(title);
    this.messageText.setText(message);
    this.container.setVisible(true);
    this.layout(scene.scale.getViewPort());
  }
  
  hide() {
    this.visible = false;
    this.handlers = null;
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
      this.handleAccept();
      return;
    }
    if (event.key === "Escape" || key === "n") {
      this.handleCancel();
    }
  }

  private handleAccept() {
    if (!this.handlers) return;
    this.handlers.onConfirm();
    this.hide();
  }

  private handleCancel() {
    if (!this.handlers) return;
    this.handlers.onCancel();
    this.hide();
  }

  private layout(viewport: Phaser.Geom.Rectangle) {
    this.backdrop.setPosition(viewport.x, viewport.y).setSize(viewport.width, viewport.height);
    this.panel.setPosition(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);

    const { width: frameW, height: frameH } = this.frameSize;
    (this.panel.list[0] as Phaser.GameObjects.Rectangle).setSize(frameW, frameH); // background
    (this.panel.list[1] as Phaser.GameObjects.Rectangle).setSize(frameW, frameH); // panelFrame

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
    this.container.destroy(true);
  }
}
