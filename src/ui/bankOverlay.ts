import Phaser from "phaser";
import { getItemDefinition } from "../items/itemDefinitions";
import type { InventorySlot } from "../items/inventoryStack";
import { GAME_FONT, GAME_TEXT_RESOLUTION } from "./fonts";
import type { GameViewportRect } from "./deathOverlay";

export type BankViewState = {
  inventory: InventorySlot[];
  bankSlots: InventorySlot[];
  playerGold: number;
  bankGold: number;
};

type BankOverlayHandlers = {
  onClose: () => void;
  onDepositInventorySlot: (slotIndex: number, amount: number) => void;
  onWithdrawBankSlot: (slotIndex: number, amount: number) => void;
  onDepositGold: (amount: number) => void;
  onWithdrawGold: (amount: number) => void;
};

type BankScreen = "menu" | "vault" | "goldDeposit" | "goldWithdraw";

const COLORS = {
  panelBg: 0x141c28,
  panelBorder: 0xc9a227,
  divider: 0xc9a227,
  btnBg: 0x3d4555,
  btnHover: 0x4f596d,
  btnActive: 0x6b5428,
  closeBg: 0xb83232,
  closeHover: 0xd04040,
  slotBg: 0x0e1218,
  slotBorder: 0x4a5568,
  title: "#d4af37",
  body: "#e6edf3",
  muted: "#9aa3b2",
  gold: "#f1c40f",
};

const SLOT_COLS = 5;
const SLOT_ROWS = 4;
const SLOT_COUNT = SLOT_COLS * SLOT_ROWS;
const SLOT_SIZE = 32;
const SLOT_GAP = 2;
const ICON_SCALE = 0.52;

type SlotUi = {
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  countLabel: Phaser.GameObjects.Text;
};

type MenuButton = {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
};

export class BankOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly backdrop: Phaser.GameObjects.Rectangle;

  private readonly menuGroup: Phaser.GameObjects.Container;
  private readonly vaultGroup: Phaser.GameObjects.Container;
  private readonly goldGroup: Phaser.GameObjects.Container;

  private readonly menuPanel: Phaser.GameObjects.Rectangle;
  private readonly menuTitle: Phaser.GameObjects.Text;
  private readonly menuWelcome: Phaser.GameObjects.Text;
  private readonly menuDivider: Phaser.GameObjects.Rectangle;
  private readonly menuStatus: Phaser.GameObjects.Text;
  private readonly menuDepositBtn: MenuButton;
  private readonly menuWithdrawBtn: MenuButton;
  private readonly menuVaultBtn: MenuButton;
  private readonly menuCloseBtn: Phaser.GameObjects.Rectangle;
  private readonly menuCloseLabel: Phaser.GameObjects.Text;

  private readonly vaultPanel: Phaser.GameObjects.Rectangle;
  private readonly vaultTitle: Phaser.GameObjects.Text;
  private readonly vaultInvTitle: Phaser.GameObjects.Text;
  private readonly vaultGoldText: Phaser.GameObjects.Text;
  private readonly vaultQtyLabel: Phaser.GameObjects.Text;
  private readonly vaultHint: Phaser.GameObjects.Text;
  private readonly vaultBackBtn: MenuButton;
  private readonly vaultCloseBtn: Phaser.GameObjects.Rectangle;
  private readonly vaultCloseLabel: Phaser.GameObjects.Text;
  private readonly vaultInputEl: HTMLInputElement;
  private readonly vaultInputDom: Phaser.GameObjects.DOMElement;
  private readonly vaultSlots: SlotUi[] = [];
  private readonly inventorySlots: SlotUi[] = [];

  private readonly goldPanel: Phaser.GameObjects.Rectangle;
  private readonly goldTitle: Phaser.GameObjects.Text;
  private readonly goldPlayerText: Phaser.GameObjects.Text;
  private readonly goldVaultText: Phaser.GameObjects.Text;
  private readonly goldAmountLabel: Phaser.GameObjects.Text;
  private readonly goldConfirmBtn: MenuButton;
  private readonly goldBackBtn: MenuButton;
  private readonly goldCloseBtn: Phaser.GameObjects.Rectangle;
  private readonly goldCloseLabel: Phaser.GameObjects.Text;
  private readonly goldInputEl: HTMLInputElement;
  private readonly goldInputDom: Phaser.GameObjects.DOMElement;

  private screen: BankScreen = "menu";
  private open = false;
  private lastViewport: GameViewportRect = { x: 0, y: 0, width: 800, height: 600 };

  constructor(
    scene: Phaser.Scene,
    private readonly handlers: BankOverlayHandlers
  ) {
    this.container = scene.add.container(0, 0).setDepth(50_100).setScrollFactor(0);
    this.backdrop = scene.add
      .rectangle(0, 0, 10, 10, 0x05070c, 0.62)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.menuGroup = scene.add.container(0, 0);
    this.vaultGroup = scene.add.container(0, 0).setVisible(false);
    this.goldGroup = scene.add.container(0, 0).setVisible(false);

    this.menuPanel = this.createPanel(scene);
    this.menuTitle = this.createTitle(scene, "BANCO GOLIATH");
    this.menuWelcome = scene.add
      .text(0, 0, "Bienvenido a la Cadena Bancaria Goliath.\nDesde 1642 resguardando tu oro con la\nseguridad que solo la magia puede ofrecer.", {
        fontFamily: GAME_FONT,
        fontSize: "10px",
        color: COLORS.body,
        align: "center",
        wordWrap: { width: 300 },
        lineSpacing: 2,
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);
    this.menuDivider = scene.add
      .rectangle(0, 0, 280, 1, COLORS.divider, 1)
      .setOrigin(0.5, 0);
    this.menuStatus = scene.add
      .text(0, 0, "", {
        fontFamily: GAME_FONT,
        fontSize: "10px",
        color: COLORS.gold,
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);
    this.menuDepositBtn = this.createMenuButton(scene, "Depositar Oro", () => {
      this.setScreen("goldDeposit");
    });
    this.menuWithdrawBtn = this.createMenuButton(scene, "Retirar Oro", () => {
      this.setScreen("goldWithdraw");
    });
    this.menuVaultBtn = this.createMenuButton(scene, "Boveda", () => {
      this.setScreen("vault");
    });
    const menuClose = this.createCloseButton(scene, () => this.handlers.onClose());
    this.menuCloseBtn = menuClose.bg;
    this.menuCloseLabel = menuClose.label;
    this.menuGroup.add([
      this.menuPanel,
      this.menuTitle,
      this.menuWelcome,
      this.menuDivider,
      this.menuStatus,
      this.menuDepositBtn.bg,
      this.menuDepositBtn.label,
      this.menuWithdrawBtn.bg,
      this.menuWithdrawBtn.label,
      this.menuVaultBtn.bg,
      this.menuVaultBtn.label,
      this.menuCloseBtn,
      this.menuCloseLabel,
    ]);

    this.vaultPanel = this.createPanel(scene);
    this.vaultTitle = this.createTitle(scene, "BOVEDA");
    this.vaultInvTitle = scene.add
      .text(0, 0, "Inventario", {
        fontFamily: GAME_FONT,
        fontSize: "11px",
        color: COLORS.body,
        fontStyle: "bold",
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);
    this.vaultGoldText = scene.add
      .text(0, 0, "", {
        fontFamily: GAME_FONT,
        fontSize: "10px",
        color: COLORS.gold,
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0, 0.5);
    this.vaultHint = scene.add
      .text(0, 0, "Click en inventario para depositar, en boveda para retirar", {
        fontFamily: GAME_FONT,
        fontSize: "9px",
        color: COLORS.muted,
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);
    this.vaultQtyLabel = scene.add
      .text(0, 0, "Cantidad:", {
        fontFamily: GAME_FONT,
        fontSize: "11px",
        color: COLORS.title,
        fontStyle: "bold",
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0.5);
    const vaultInput = this.createNumericInput("Ej: 10");
    this.vaultInputEl = vaultInput.el;
    this.vaultInputDom = vaultInput.dom;
    this.vaultBackBtn = this.createMenuButton(scene, "Volver", () => this.setScreen("menu"));
    const vaultClose = this.createCloseButton(scene, () => this.handlers.onClose());
    this.vaultCloseBtn = vaultClose.bg;
    this.vaultCloseLabel = vaultClose.label;

    for (let i = 0; i < SLOT_COUNT; i += 1) {
      this.vaultSlots.push(this.createSlot(scene, i, "bank"));
      this.inventorySlots.push(this.createSlot(scene, i, "inventory"));
    }

    this.vaultGroup.add([
      this.vaultPanel,
      this.vaultTitle,
      this.vaultInvTitle,
      this.vaultGoldText,
      this.vaultQtyLabel,
      this.vaultHint,
      this.vaultBackBtn.bg,
      this.vaultBackBtn.label,
      ...this.vaultSlots.flatMap((s) => [s.bg, s.icon, s.countLabel]),
      ...this.inventorySlots.flatMap((s) => [s.bg, s.icon, s.countLabel]),
      this.vaultCloseBtn,
      this.vaultCloseLabel,
    ]);

    this.goldPanel = this.createPanel(scene);
    this.goldTitle = this.createTitle(scene, "Depositar Oro");
    this.goldPlayerText = scene.add
      .text(0, 0, "", {
        fontFamily: GAME_FONT,
        fontSize: "10px",
        color: COLORS.body,
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);
    this.goldVaultText = scene.add
      .text(0, 0, "", {
        fontFamily: GAME_FONT,
        fontSize: "10px",
        color: COLORS.gold,
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);
    this.goldAmountLabel = scene.add
      .text(0, 0, "Cantidad:", {
        fontFamily: GAME_FONT,
        fontSize: "11px",
        color: COLORS.title,
        fontStyle: "bold",
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0.5);

    const goldInput = this.createNumericInput("Ej: 1000");
    goldInput.el.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.confirmGoldAction();
      }
    });
    this.goldInputEl = goldInput.el;
    this.goldInputDom = goldInput.dom;

    this.goldConfirmBtn = this.createMenuButton(scene, "Confirmar", () => {
      this.confirmGoldAction();
    });
    this.goldBackBtn = this.createMenuButton(scene, "Volver", () => this.setScreen("menu"));
    const goldClose = this.createCloseButton(scene, () => this.handlers.onClose());
    this.goldCloseBtn = goldClose.bg;
    this.goldCloseLabel = goldClose.label;

    this.goldGroup.add([
      this.goldPanel,
      this.goldTitle,
      this.goldPlayerText,
      this.goldVaultText,
      this.goldAmountLabel,
      this.goldConfirmBtn.bg,
      this.goldConfirmBtn.label,
      this.goldBackBtn.bg,
      this.goldBackBtn.label,
      this.goldCloseBtn,
      this.goldCloseLabel,
    ]);

    this.container.add([this.backdrop, this.menuGroup, this.vaultGroup, this.goldGroup]);
    this.container.setVisible(false);
  }

  private createNumericInput(placeholder: string): {
    el: HTMLInputElement;
    dom: Phaser.GameObjects.DOMElement;
  } {
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.maxLength = 12;
    input.placeholder = placeholder;
    input.value = "1";
    input.style.width = "140px";
    input.style.height = "26px";
    input.style.padding = "2px 8px";
    input.style.border = "1px solid #c9a227";
    input.style.borderRadius = "3px";
    input.style.background = "#0e1218";
    input.style.color = "#f1c40f";
    input.style.font = "12px Verdana, Arial, sans-serif";
    input.style.textAlign = "center";
    input.style.outline = "none";
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "");
    });
    const dom = this.container.scene.add
      .dom(0, 0, input)
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(50_101)
      .setVisible(false);
    return { el: input, dom };
  }

  private createPanel(scene: Phaser.Scene) {
    return scene.add
      .rectangle(0, 0, 10, 10, COLORS.panelBg, 0.98)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(+2, COLORS.panelBorder, 1);
  }

  private createTitle(scene: Phaser.Scene, text: string) {
    return scene.add
      .text(0, 0, text, {
        fontFamily: GAME_FONT,
        fontSize: "14px",
        color: COLORS.title,
        fontStyle: "bold",
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);
  }

  private createCloseButton(scene: Phaser.Scene, onClick: () => void) {
    const size = 18;
    const bg = scene.add
      .rectangle(0, 0, size, size, COLORS.closeBg, 1)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(1, 0x7a2020, 1)
      .setInteractive({ useHandCursor: true });
    const label = scene.add
      .text(0, 0, "X", {
        fontFamily: GAME_FONT,
        fontSize: "11px",
        color: "#ffffff",
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
    bg.on("pointerover", () => bg.setFillStyle(COLORS.closeHover, 1));
    bg.on("pointerout", () => bg.setFillStyle(COLORS.closeBg, 1));
    return { bg, label };
  }

  private createMenuButton(scene: Phaser.Scene, label: string, onClick: () => void): MenuButton {
    const w = 148;
    const h = 28;
    const bg = scene.add
      .rectangle(0, 0, w, h, COLORS.btnBg, 1)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(1, 0x5c677a, 1)
      .setInteractive({ useHandCursor: true });
    const text = scene.add
      .text(0, 0, label, {
        fontFamily: GAME_FONT,
        fontSize: "11px",
        color: COLORS.body,
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0.5);
    text.disableInteractive();
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
    bg.on("pointerover", () => bg.setFillStyle(COLORS.btnHover, 1));
    bg.on("pointerout", () => bg.setFillStyle(COLORS.btnBg, 1));
    return { bg, label: text };
  }

  private createSlot(
    scene: Phaser.Scene,
    slotIndex: number,
    side: "inventory" | "bank"
  ): SlotUi {
    const bg = scene.add
      .rectangle(0, 0, SLOT_SIZE, SLOT_SIZE, COLORS.slotBg, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.slotBorder, 1)
      .setInteractive({ useHandCursor: true });
    const icon = scene.add
      .image(SLOT_SIZE / 2, SLOT_SIZE / 2, "__MISSING")
      .setOrigin(0.5, 0.5)
      .setVisible(false);
    const countLabel = scene.add
      .text(SLOT_SIZE - 2, SLOT_SIZE - 1, "", {
        fontFamily: GAME_FONT,
        fontSize: "8px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(1, 1);

    bg.on(
      "pointerdown",
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        if (side === "inventory") {
          this.handlers.onDepositInventorySlot(slotIndex, this.parseTransferInput());
        } else {
          this.handlers.onWithdrawBankSlot(slotIndex, this.parseTransferInput());
        }
      }
    );

    return { bg, icon, countLabel };
  }

  private parseNumericInput(input: HTMLInputElement): number {
    const raw = input.value.trim();
    if (!raw) {
      return 1;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  private parseGoldInput(): number {
    return this.parseNumericInput(this.goldInputEl);
  }

  private parseTransferInput(): number {
    return this.parseNumericInput(this.vaultInputEl);
  }

  private syncDomInputsVisibility() {
    const showGold =
      this.open && (this.screen === "goldDeposit" || this.screen === "goldWithdraw");
    const showVault = this.open && this.screen === "vault";
    this.goldInputDom.setVisible(showGold);
    this.vaultInputDom.setVisible(showVault);

    window.setTimeout(() => {
      if (showGold) {
        this.goldInputEl.focus();
        this.goldInputEl.select();
        this.vaultInputEl.blur();
        return;
      }
      if (showVault) {
        this.vaultInputEl.focus();
        this.vaultInputEl.select();
        this.goldInputEl.blur();
        return;
      }
      this.goldInputEl.blur();
      this.vaultInputEl.blur();
    }, 0);
  }

  private confirmGoldAction() {
    const amount = this.parseGoldInput();
    if (this.screen === "goldDeposit") {
      this.handlers.onDepositGold(amount);
    } else if (this.screen === "goldWithdraw") {
      this.handlers.onWithdrawGold(amount);
    }
  }

  private setScreen(screen: BankScreen) {
    this.screen = screen;
    this.menuGroup.setVisible(screen === "menu");
    this.vaultGroup.setVisible(screen === "vault");
    this.goldGroup.setVisible(screen === "goldDeposit" || screen === "goldWithdraw");
    if (screen === "goldDeposit") {
      this.goldTitle.setText("Depositar Oro");
    } else if (screen === "goldWithdraw") {
      this.goldTitle.setText("Retirar Oro");
    }
    if (screen === "vault") {
      this.vaultInputEl.value = "1";
    }
    if (screen === "goldDeposit" || screen === "goldWithdraw") {
      this.goldInputEl.value = "1";
    }
    this.syncDomInputsVisibility();
    this.layout(this.lastViewport);
  }

  handleEscape(): boolean {
    if (!this.open) return false;
    if (this.screen === "menu") {
      this.handlers.onClose();
      return true;
    }
    this.setScreen("menu");
    return true;
  }

  isOpen() {
    return this.open;
  }

  show(viewport: GameViewportRect, state: BankViewState) {
    this.open = true;
    this.setScreen("menu");
    this.container.setVisible(true);
    this.layout(viewport);
    this.refresh(state);
  }

  hide() {
    this.open = false;
    this.container.setVisible(false);
    this.screen = "menu";
    this.syncDomInputsVisibility();
  }

  refresh(state: BankViewState) {
    this.menuStatus.setText(
      `Oro en boveda: ${state.bankGold.toLocaleString("es-AR")}  |  Oro: ${state.playerGold.toLocaleString("es-AR")}`
    );
    this.vaultGoldText.setText(
      `Oro en boveda: ${state.bankGold.toLocaleString("es-AR")}  |  Oro: ${state.playerGold.toLocaleString("es-AR")}`
    );
    this.goldPlayerText.setText(`Oro en mano: ${state.playerGold.toLocaleString("es-AR")}`);
    this.goldVaultText.setText(`Oro en boveda: ${state.bankGold.toLocaleString("es-AR")}`);
    this.refreshSlotGrid(this.inventorySlots, state.inventory);
    this.refreshSlotGrid(this.vaultSlots, state.bankSlots);
  }

  private refreshSlotGrid(slots: SlotUi[], data: InventorySlot[]) {
    slots.forEach((slotUi, index) => {
      const stack = data[index] ?? null;
      if (!stack) {
        slotUi.icon.setVisible(false);
        slotUi.countLabel.setText("");
        return;
      }
      const item = getItemDefinition(stack.itemId);
      slotUi.icon.setTexture(item.textureKey);
      slotUi.icon.setScale(ICON_SCALE);
      slotUi.icon.setVisible(true);
      slotUi.countLabel.setText(stack.count > 1 ? String(stack.count) : "");
    });
  }

  layout(viewport: GameViewportRect) {
    if (!this.open) return;
    this.lastViewport = viewport;

    this.backdrop.setPosition(viewport.x, viewport.y);
    this.backdrop.setSize(viewport.width, viewport.height);

    const cx = viewport.x + viewport.width / 2;
    const cy = viewport.y + viewport.height / 2;

    if (this.screen === "menu") {
      this.layoutMenu(cx, cy);
    } else if (this.screen === "vault") {
      this.layoutVault(cx, cy);
    } else {
      this.layoutGold(cx, cy);
    }
  }

  private layoutMenu(cx: number, cy: number) {
    const w = 340;
    const h = 300;
    this.menuPanel.setSize(w, h);
    this.menuPanel.setPosition(cx, cy);
    this.menuTitle.setPosition(cx, cy - h / 2 + 12);
    this.menuWelcome.setPosition(cx, cy - h / 2 + 36);
    this.menuDivider.setPosition(cx, cy - h / 2 + 92);
    this.menuStatus.setPosition(cx, cy - h / 2 + 102);

    const btnW = 148;
    const leftX = cx - btnW / 2 - 6;
    const rightX = cx + btnW / 2 + 6;
    const row1Y = cy - h / 2 + 132;
    const row2Y = row1Y + 38;
    const row3Y = row2Y + 38;

    this.menuDepositBtn.bg.setPosition(leftX, row1Y);
    this.menuDepositBtn.label.setPosition(leftX, row1Y);
    this.menuWithdrawBtn.bg.setPosition(rightX, row1Y);
    this.menuWithdrawBtn.label.setPosition(rightX, row1Y);
    this.menuVaultBtn.bg.setPosition(cx, row2Y);
    this.menuVaultBtn.label.setPosition(cx, row2Y);

    this.menuCloseBtn.setPosition(cx + w / 2 - 16, cy - h / 2 + 12);
    this.menuCloseLabel.setPosition(cx + w / 2 - 16, cy - h / 2 + 12);
  }

  private layoutVault(cx: number, cy: number) {
    const gridW = SLOT_COLS * SLOT_SIZE + (SLOT_COLS - 1) * SLOT_GAP;
    const gridH = SLOT_ROWS * SLOT_SIZE + (SLOT_ROWS - 1) * SLOT_GAP;
    const w = gridW * 2 + 56;
    const h = gridH + 118;
    this.vaultPanel.setSize(w, h);
    this.vaultPanel.setPosition(cx, cy);
    this.vaultTitle.setPosition(cx, cy - h / 2 + 12);

    const leftX = cx - w / 2 + 20;
    const rightX = leftX + gridW + 16;
    const gridY = cy - h / 2 + 38;

    this.layoutGrid(this.vaultSlots, leftX, gridY);
    this.vaultInvTitle.setPosition(rightX + gridW / 2, cy - h / 2 + 28);
    this.layoutGrid(this.inventorySlots, rightX, gridY);

    const qtyY = gridY + gridH + 14;
    this.vaultQtyLabel.setPosition(cx - 84, qtyY);
    this.vaultInputDom.setPosition(cx + 12, qtyY);
    this.vaultHint.setPosition(cx, qtyY + 22);
    this.vaultGoldText.setPosition(cx - w / 2 + 20, cy + h / 2 - 18);
    this.vaultBackBtn.bg.setPosition(cx, cy + h / 2 - 18);
    this.vaultBackBtn.label.setPosition(cx, cy + h / 2 - 18);

    this.vaultCloseBtn.setPosition(cx + w / 2 - 16, cy - h / 2 + 12);
    this.vaultCloseLabel.setPosition(cx + w / 2 - 16, cy - h / 2 + 12);
  }

  private layoutGold(cx: number, cy: number) {
    const w = 320;
    const h = 210;
    this.goldPanel.setSize(w, h);
    this.goldPanel.setPosition(cx, cy);
    this.goldTitle.setPosition(cx, cy - h / 2 + 12);
    this.goldPlayerText.setPosition(cx, cy - h / 2 + 36);
    this.goldVaultText.setPosition(cx, cy - h / 2 + 52);

    const inputY = cy - h / 2 + 88;
    this.goldAmountLabel.setPosition(cx - 84, inputY);
    this.goldInputDom.setPosition(cx + 12, inputY);

    this.goldConfirmBtn.bg.setPosition(cx - 78, cy + h / 2 - 28);
    this.goldConfirmBtn.label.setPosition(cx - 78, cy + h / 2 - 28);
    this.goldBackBtn.bg.setPosition(cx + 78, cy + h / 2 - 28);
    this.goldBackBtn.label.setPosition(cx + 78, cy + h / 2 - 28);

    this.goldCloseBtn.setPosition(cx + w / 2 - 16, cy - h / 2 + 12);
    this.goldCloseLabel.setPosition(cx + w / 2 - 16, cy - h / 2 + 12);
  }

  private layoutGrid(slots: SlotUi[], startX: number, startY: number) {
    slots.forEach((slot, index) => {
      const col = index % SLOT_COLS;
      const row = Math.floor(index / SLOT_COLS);
      const x = startX + col * (SLOT_SIZE + SLOT_GAP);
      const y = startY + row * (SLOT_SIZE + SLOT_GAP);
      slot.bg.setPosition(x, y);
      slot.icon.setPosition(x + SLOT_SIZE / 2, y + SLOT_SIZE / 2);
      slot.countLabel.setPosition(x + SLOT_SIZE - 2, y + SLOT_SIZE - 1);
    });
  }

  getContainer() {
    return this.container;
  }

  getDomObjects() {
    return [this.goldInputDom, this.vaultInputDom];
  }

  destroy() {
    this.goldInputDom.destroy();
    this.vaultInputDom.destroy();
    this.container.destroy(true);
  }
}
