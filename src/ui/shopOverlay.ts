import Phaser from "phaser";
import { getBuyPrice, getSellPrice, SHOP_SELL_RATIO } from "../data/shopCatalogs";
import { getItemDefinition } from "../items/itemDefinitions";
import type { ItemId } from "../items/itemDefinitions";
import type { InventorySlot } from "../items/inventoryStack";
import { GAME_FONT, GAME_TEXT_RESOLUTION } from "./fonts";
import type { GameViewportRect } from "./deathOverlay";

export type ShopViewState = {
  title: string;
  catalog: ItemId[];
  inventory: InventorySlot[];
  playerGold: number;
};

type ShopOverlayHandlers = {
  onClose: () => void;
  onBuy: (itemId: ItemId, amount: number) => void;
  onSell: (slotIndex: number, amount: number) => void;
};

const COLORS = {
  panelBg: 0x141c28,
  panelBorder: 0xc9a227,
  btnBg: 0x3d4555,
  btnHover: 0x4f596d,
  btnActive: 0x6b5428,
  closeBg: 0xb83232,
  closeHover: 0xd04040,
  slotBg: 0x0e1218,
  slotBorder: 0x4a5568,
  slotSelected: 0x6b5428,
  title: "#d4af37",
  body: "#e6edf3",
  muted: "#9aa3b2",
  gold: "#f1c40f",
};

const INV_COLS = 5;
const INV_ROWS = 4;
const INV_SLOT_COUNT = INV_COLS * INV_ROWS;
const CATALOG_COLS = 5;
const SLOT_SIZE = 32;
const SLOT_GAP = 2;
const ICON_SCALE = 0.52;

type SlotUi = {
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  countLabel: Phaser.GameObjects.Text;
};

type ActionButton = {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
};

export class ShopOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly catalogGroup: Phaser.GameObjects.Container;
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly goldText: Phaser.GameObjects.Text;
  private readonly catalogTitle: Phaser.GameObjects.Text;
  private readonly inventoryTitle: Phaser.GameObjects.Text;
  private readonly detailName: Phaser.GameObjects.Text;
  private readonly detailPrice: Phaser.GameObjects.Text;
  private readonly qtyLabel: Phaser.GameObjects.Text;
  private readonly hintText: Phaser.GameObjects.Text;
  private readonly closeBtn: Phaser.GameObjects.Rectangle;
  private readonly closeLabel: Phaser.GameObjects.Text;
  private readonly buyBtn: ActionButton;
  private readonly sellBtn: ActionButton;
  private readonly qtyInputEl: HTMLInputElement;
  private readonly qtyInputDom: Phaser.GameObjects.DOMElement;

  private readonly catalogSlots: SlotUi[] = [];
  private readonly inventorySlots: SlotUi[] = [];

  private open = false;
  private lastViewport: GameViewportRect = { x: 0, y: 0, width: 800, height: 600 };
  private catalog: ItemId[] = [];
  private selectedCatalogIndex: number | null = null;
  private selectedInventorySlot: number | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly handlers: ShopOverlayHandlers
  ) {
    this.container = scene.add.container(0, 0).setDepth(50_100).setScrollFactor(0);
    this.catalogGroup = scene.add.container(0, 0);
    this.backdrop = scene.add
      .rectangle(0, 0, 10, 10, 0x05070c, 0.62)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.panel = scene.add
      .rectangle(0, 0, 10, 10, COLORS.panelBg, 0.98)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(+2, COLORS.panelBorder, 1);

    this.titleText = this.createTitle(scene, "Comerciante");
    this.goldText = this.createBodyText(scene, "");
    this.catalogTitle = this.createMutedText(scene, "Catalogo");
    this.inventoryTitle = this.createMutedText(scene, "Tu inventario");
    this.detailName = this.createBodyText(scene, "Selecciona un item");
    this.detailPrice = this.createMutedText(scene, "");
    this.qtyLabel = this.createMutedText(scene, "Cantidad");
    this.hintText = this.createMutedText(scene, `Venta al ${Math.round(SHOP_SELL_RATIO * 100)}% del valor`);

    const qtyInput = this.createNumericInput();
    this.qtyInputEl = qtyInput.el;
    this.qtyInputDom = qtyInput.dom;

    this.buyBtn = this.createButton(scene, "Comprar", () => this.confirmBuy());
    this.sellBtn = this.createButton(scene, "Vender", () => this.confirmSell());

    const close = this.createCloseButton(scene, () => this.handlers.onClose());
    this.closeBtn = close.bg;
    this.closeLabel = close.label;

    for (let i = 0; i < INV_SLOT_COUNT; i += 1) {
      this.inventorySlots.push(this.createSlotUi(scene, () => this.selectInventorySlot(i)));
    }

    this.container.add([
      this.backdrop,
      this.panel,
      this.titleText,
      this.goldText,
      this.catalogTitle,
      this.catalogGroup,
      this.inventoryTitle,
      this.detailName,
      this.detailPrice,
      this.qtyLabel,
      this.hintText,
      this.buyBtn.bg,
      this.buyBtn.label,
      this.sellBtn.bg,
      this.sellBtn.label,
      this.closeBtn,
      this.closeLabel,
      ...this.inventorySlots.flatMap((s) => [s.bg, s.icon, s.countLabel]),
    ]);
    this.container.setVisible(false);
  }

  private createNumericInput(): {
    el: HTMLInputElement;
    dom: Phaser.GameObjects.DOMElement;
  } {
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.maxLength = 12;
    input.placeholder = "1";
    input.value = "1";
    input.style.width = "72px";
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

  private createBodyText(scene: Phaser.Scene, text: string) {
    return scene.add
      .text(0, 0, text, {
        fontFamily: GAME_FONT,
        fontSize: "11px",
        color: COLORS.body,
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);
  }

  private createMutedText(scene: Phaser.Scene, text: string) {
    return scene.add
      .text(0, 0, text, {
        fontFamily: GAME_FONT,
        fontSize: "10px",
        color: COLORS.muted,
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);
  }

  private createButton(scene: Phaser.Scene, label: string, onClick: () => void): ActionButton {
    const bg = scene.add
      .rectangle(0, 0, 88, 28, COLORS.btnBg, 1)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(1, COLORS.panelBorder, 1)
      .setInteractive({ useHandCursor: true });
    const text = scene.add
      .text(0, 0, label, {
        fontFamily: GAME_FONT,
        fontSize: "11px",
        color: COLORS.body,
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0.5);
    bg.on("pointerover", () => bg.setFillStyle(COLORS.btnHover));
    bg.on("pointerout", () => bg.setFillStyle(COLORS.btnBg));
    bg.on("pointerdown", onClick);
    return { bg, label: text };
  }

  private createCloseButton(scene: Phaser.Scene, onClick: () => void) {
    const size = 18;
    const bg = scene.add
      .rectangle(0, 0, size, size, COLORS.closeBg, 1)
      .setOrigin(0.5, 0.5)
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
    bg.on("pointerover", () => bg.setFillStyle(COLORS.closeHover));
    bg.on("pointerout", () => bg.setFillStyle(COLORS.closeBg));
    bg.on("pointerdown", onClick);
    return { bg, label };
  }

  private createSlotUi(scene: Phaser.Scene, onClick: () => void): SlotUi {
    const bg = scene.add
      .rectangle(0, 0, SLOT_SIZE, SLOT_SIZE, COLORS.slotBg, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.slotBorder, 1)
      .setInteractive({ useHandCursor: true });
    const icon = scene.add
      .image(0, 0, "__MISSING")
      .setOrigin(0.5, 0.5)
      .setVisible(false);
    const countLabel = scene.add
      .text(0, 0, "", {
        fontFamily: GAME_FONT,
        fontSize: "9px",
        color: COLORS.gold,
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(1, 1);
    bg.on("pointerdown", onClick);
    return { bg, icon, countLabel };
  }

  private setSlotIcon(
    scene: Phaser.Scene,
    icon: Phaser.GameObjects.Image,
    itemId: ItemId
  ): boolean {
    const item = getItemDefinition(itemId);
    if (!item || !scene.textures.exists(item.textureKey)) {
      icon.setVisible(false);
      return false;
    }
    icon.setTexture(item.textureKey);
    icon.setScale(ICON_SCALE);
    icon.setVisible(true);
    return true;
  }

  private rebuildCatalogSlots(scene: Phaser.Scene, catalog: ItemId[]) {
    this.catalogGroup.removeAll(true);
    this.catalogSlots.length = 0;

    catalog.forEach((itemId, index) => {
      const item = getItemDefinition(itemId);
      if (!item) {
        return;
      }
      const slot = this.createSlotUi(scene, () => this.selectCatalogItem(index));
      this.catalogSlots.push(slot);
      this.setSlotIcon(scene, slot.icon, itemId);
      slot.countLabel.setText("");
      this.catalogGroup.add([slot.bg, slot.icon, slot.countLabel]);
    });
  }

  private selectCatalogItem(index: number) {
    this.selectedCatalogIndex = index;
    this.selectedInventorySlot = null;
    this.highlightSelection();
    this.refreshDetail();
  }

  private selectInventorySlot(index: number) {
    this.selectedInventorySlot = index;
    this.selectedCatalogIndex = null;
    this.highlightSelection();
    this.refreshDetail();
  }

  private highlightSelection() {
    this.catalogSlots.forEach((slot, index) => {
      const selected = this.selectedCatalogIndex === index;
      slot.bg.setStrokeStyle(1, selected ? COLORS.slotSelected : COLORS.slotBorder, 1);
    });
    this.inventorySlots.forEach((slot, index) => {
      const selected = this.selectedInventorySlot === index;
      slot.bg.setStrokeStyle(1, selected ? COLORS.slotSelected : COLORS.slotBorder, 1);
    });
  }

  private refreshDetail() {
    if (this.selectedCatalogIndex !== null) {
      const itemId = this.catalog[this.selectedCatalogIndex];
      if (!itemId) return;
      const item = getItemDefinition(itemId);
      if (!item) {
        this.clearDetail();
        return;
      }
      const qty = this.parseQty();
      this.detailName.setText(item.name);
      this.detailPrice.setText(
        `Precio compra: ${getBuyPrice(item.value, qty).toLocaleString("es-AR")} oro`
      );
      this.buyBtn.bg.setVisible(true);
      this.buyBtn.label.setVisible(true);
      this.sellBtn.bg.setVisible(false);
      this.sellBtn.label.setVisible(false);
      return;
    }

    if (this.selectedInventorySlot !== null) {
      const stack = this.lastInventory[this.selectedInventorySlot];
      if (!stack) {
        this.clearDetail();
        return;
      }
      const item = getItemDefinition(stack.itemId);
      if (!item) {
        this.clearDetail();
        return;
      }
      const qty = Math.min(this.parseQty(), stack.count);
      this.detailName.setText(item.name);
      this.detailPrice.setText(
        `Precio venta: ${getSellPrice(item.value, qty).toLocaleString("es-AR")} oro`
      );
      this.buyBtn.bg.setVisible(false);
      this.buyBtn.label.setVisible(false);
      this.sellBtn.bg.setVisible(true);
      this.sellBtn.label.setVisible(true);
      return;
    }

    this.clearDetail();
  }

  private clearDetail() {
    this.detailName.setText("Selecciona un item");
    this.detailPrice.setText("");
    this.buyBtn.bg.setVisible(false);
    this.buyBtn.label.setVisible(false);
    this.sellBtn.bg.setVisible(false);
    this.sellBtn.label.setVisible(false);
  }

  private lastInventory: InventorySlot[] = [];

  private parseQty(): number {
    const parsed = Number.parseInt(this.qtyInputEl.value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  private confirmBuy() {
    if (this.selectedCatalogIndex === null) return;
    const itemId = this.catalog[this.selectedCatalogIndex];
    if (!itemId) return;
    this.handlers.onBuy(itemId, this.parseQty());
  }

  private confirmSell() {
    if (this.selectedInventorySlot === null) return;
    this.handlers.onSell(this.selectedInventorySlot, this.parseQty());
  }

  handleEscape(): boolean {
    if (!this.open) return false;
    this.handlers.onClose();
    return true;
  }

  isOpen() {
    return this.open;
  }

  show(viewport: GameViewportRect, state: ShopViewState) {
    this.open = true;
    this.catalog = state.catalog.filter((itemId) => Boolean(getItemDefinition(itemId)));
    this.selectedCatalogIndex = this.catalog.length > 0 ? 0 : null;
    this.selectedInventorySlot = null;
    this.qtyInputEl.value = "1";
    this.rebuildCatalogSlots(this.container.scene, this.catalog);
    this.container.setVisible(true);
    this.qtyInputDom.setVisible(true);
    this.layout(viewport);
    this.refresh(state);
  }

  hide() {
    this.open = false;
    this.container.setVisible(false);
    this.qtyInputDom.setVisible(false);
    this.selectedCatalogIndex = null;
    this.selectedInventorySlot = null;
  }

  refresh(state: ShopViewState) {
    this.catalog = state.catalog.filter((itemId) => Boolean(getItemDefinition(itemId)));
    this.lastInventory = state.inventory;
    this.titleText.setText(state.title);
    this.goldText.setText(`Oro: ${state.playerGold.toLocaleString("es-AR")}`);
    this.refreshSlotGrid(this.inventorySlots, state.inventory);
    this.highlightSelection();
    this.refreshDetail();
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
      if (!item || !this.container.scene.textures.exists(item.textureKey)) {
        slotUi.icon.setVisible(false);
        slotUi.countLabel.setText("");
        return;
      }
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

    const invGridW = INV_COLS * SLOT_SIZE + (INV_COLS - 1) * SLOT_GAP;
    const invGridH = INV_ROWS * SLOT_SIZE + (INV_ROWS - 1) * SLOT_GAP;
    const catalogRows = Math.max(1, Math.ceil(this.catalog.length / CATALOG_COLS));
    const catalogGridH =
      catalogRows * SLOT_SIZE + Math.max(0, catalogRows - 1) * SLOT_GAP;
    const catalogGridW = CATALOG_COLS * SLOT_SIZE + (CATALOG_COLS - 1) * SLOT_GAP;

    const w = Math.max(invGridW, catalogGridW) * 2 + 72;
    const h = Math.max(invGridH, catalogGridH) + 168;

    this.panel.setSize(w, h);
    this.panel.setPosition(cx, cy);

    this.titleText.setPosition(cx, cy - h / 2 + 12);
    this.goldText.setPosition(cx, cy - h / 2 + 30);
    this.closeBtn.setPosition(cx + w / 2 - 16, cy - h / 2 + 12);
    this.closeLabel.setPosition(cx + w / 2 - 16, cy - h / 2 + 12);

    const leftX = cx - w / 2 + 20;
    const rightX = leftX + Math.max(invGridW, catalogGridW) + 24;
    const gridTop = cy - h / 2 + 52;

    this.catalogTitle.setPosition(leftX + catalogGridW / 2, cy - h / 2 + 44);
    this.catalogGroup.setPosition(leftX, gridTop);
    this.layoutDynamicGrid(this.catalogSlots, 0, 0, CATALOG_COLS);

    this.inventoryTitle.setPosition(rightX + invGridW / 2, cy - h / 2 + 44);
    this.layoutGrid(this.inventorySlots, rightX, gridTop, INV_COLS);

    const detailY = gridTop + Math.max(invGridH, catalogGridH) + 18;
    this.detailName.setPosition(cx, detailY);
    this.detailPrice.setPosition(cx, detailY + 16);
    this.qtyLabel.setPosition(cx - 58, detailY + 38);
    this.qtyInputDom.setPosition(cx + 8, detailY + 44);
    this.hintText.setPosition(cx, detailY + 58);

    this.buyBtn.bg.setPosition(cx - 50, detailY + 78);
    this.buyBtn.label.setPosition(cx - 50, detailY + 78);
    this.sellBtn.bg.setPosition(cx + 50, detailY + 78);
    this.sellBtn.label.setPosition(cx + 50, detailY + 78);
  }

  private layoutGrid(slots: SlotUi[], startX: number, startY: number, cols: number) {
    slots.forEach((slot, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (SLOT_SIZE + SLOT_GAP);
      const y = startY + row * (SLOT_SIZE + SLOT_GAP);
      slot.bg.setPosition(x, y);
      slot.icon.setPosition(x + SLOT_SIZE / 2, y + SLOT_SIZE / 2);
      slot.countLabel.setPosition(x + SLOT_SIZE - 2, y + SLOT_SIZE - 1);
    });
  }

  private layoutDynamicGrid(slots: SlotUi[], startX: number, startY: number, cols: number) {
    this.layoutGrid(slots, startX, startY, cols);
  }

  getContainer() {
    return this.container;
  }

  getDomObjects() {
    return [this.qtyInputDom];
  }

  destroy() {
    this.qtyInputDom.destroy();
    this.container.destroy(true);
  }
}
