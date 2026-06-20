import Phaser from "phaser";
import { getItemDefinition, tryGetItemDefinition } from "../items/itemDefinitions";
import type { ItemId } from "../items/itemDefinitions";
import type { InventorySlot } from "../items/inventoryStack";
import { GAME_FONT, GAME_TEXT_RESOLUTION } from "./fonts";
import type { GameViewportRect } from "./deathOverlay";
import type { NetAuctionState } from "../../shared/types";
import { SHOP_SLOT_ICON_SCALE } from "./shopSlotIconScale";

export type AuctionViewState = {
  auctions: NetAuctionState[];
  inventory: InventorySlot[];
  playerGold: number;
  playerId: string;
};

type AuctionOverlayHandlers = {
  onClose: () => void;
  onBuy: (auctionId: string) => void;
  onList: (slotIndex: number, amount: number, price: number, durationHours: number) => void;
  onCancel: (auctionId: string) => void;
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
  tabBg: 0x1a2433,
  tabActive: 0x2a364a,
};

const INV_COLS = 5;
const INV_ROWS = 4;
const INV_SLOT_COUNT = INV_COLS * INV_ROWS;
const SLOT_SIZE = 32;
const SLOT_GAP = 2;
const ICON_SCALE = SHOP_SLOT_ICON_SCALE;

type SlotUi = {
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  countLabel: Phaser.GameObjects.Text;
};

export class AuctionOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly goldText: Phaser.GameObjects.Text;
  private readonly closeBtn: Phaser.GameObjects.Rectangle;
  private readonly closeLabel: Phaser.GameObjects.Text;

  private readonly tabBuyBtn: Phaser.GameObjects.Rectangle;
  private readonly tabBuyLabel: Phaser.GameObjects.Text;
  private readonly tabSellBtn: Phaser.GameObjects.Rectangle;
  private readonly tabSellLabel: Phaser.GameObjects.Text;

  private readonly buyContainer: Phaser.GameObjects.Container;
  private readonly sellContainer: Phaser.GameObjects.Container;

  private readonly inventorySlots: SlotUi[] = [];
  private readonly auctionListDom: Phaser.GameObjects.DOMElement;
  private readonly auctionListEl: HTMLDivElement;

  private readonly sellDetailName: Phaser.GameObjects.Text;
  private readonly priceInputEl: HTMLInputElement;
  private readonly priceInputDom: Phaser.GameObjects.DOMElement;
  private readonly durationSelectEl: HTMLSelectElement;
  private readonly durationSelectDom: Phaser.GameObjects.DOMElement;
  private readonly listBtn: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text };

  private open = false;
  private activeTab: "buy" | "sell" = "buy";
  private selectedInventorySlot: number | null = null;
  private lastState?: AuctionViewState;

  constructor(
    scene: Phaser.Scene,
    private readonly handlers: AuctionOverlayHandlers
  ) {
    this.container = scene.add.container(0, 0).setDepth(50_100).setScrollFactor(0);
    
    this.backdrop = scene.add
      .rectangle(0, 0, 10, 10, 0x05070c, 0.62)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.panel = scene.add
      .rectangle(0, 0, 10, 10, COLORS.panelBg, 0.98)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(2, COLORS.panelBorder, 1);

    this.titleText = scene.add.text(0, 0, "Casa de Subastas", {
      fontFamily: GAME_FONT,
      fontSize: "16px",
      color: COLORS.title,
      fontStyle: "bold",
      resolution: GAME_TEXT_RESOLUTION,
    }).setOrigin(0.5, 0);

    this.goldText = scene.add.text(0, 0, "", {
      fontFamily: GAME_FONT,
      fontSize: "12px",
      color: COLORS.gold,
      resolution: GAME_TEXT_RESOLUTION,
    }).setOrigin(0.5, 0);

    this.closeBtn = scene.add.rectangle(0, 0, 20, 20, COLORS.closeBg, 1).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    this.closeLabel = scene.add.text(0, 0, "X", { fontFamily: GAME_FONT, fontSize: "12px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5, 0.5);
    this.closeBtn.on("pointerdown", () => this.handlers.onClose());

    // Tabs
    this.tabBuyBtn = scene.add.rectangle(0, 0, 100, 30, COLORS.tabActive, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.tabBuyLabel = scene.add.text(0, 0, "Comprar", { fontFamily: GAME_FONT, fontSize: "12px", color: COLORS.body }).setOrigin(0.5, 0.5);
    this.tabSellBtn = scene.add.rectangle(0, 0, 100, 30, COLORS.tabBg, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.tabSellLabel = scene.add.text(0, 0, "Vender", { fontFamily: GAME_FONT, fontSize: "12px", color: COLORS.muted }).setOrigin(0.5, 0.5);

    this.tabBuyBtn.on("pointerdown", () => this.switchTab("buy"));
    this.tabSellBtn.on("pointerdown", () => this.switchTab("sell"));

    this.buyContainer = scene.add.container(0, 0);
    this.sellContainer = scene.add.container(0, 0).setVisible(false);

    // Buy Tab Content
    this.auctionListEl = document.createElement("div");
    this.auctionListEl.style.display = "none";
    this.auctionListEl.style.width = "400px";
    this.auctionListEl.style.height = "250px";
    this.auctionListEl.style.overflowY = "auto";
    this.auctionListEl.style.background = "#0e1218";
    this.auctionListEl.style.border = "1px solid #4a5568";
    this.auctionListEl.style.padding = "4px";
    this.auctionListEl.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      this.handleEscape();
    });
    this.auctionListDom = scene.add.dom(0, 0, this.auctionListEl).setOrigin(0, 0).setVisible(false);
    // this.buyContainer.add(this.auctionListDom); // NO: Containers crash with DOMElements

    // Sell Tab Content
    for (let i = 0; i < INV_SLOT_COUNT; i += 1) {
      const slot = this.createSlotUi(scene, () => this.selectInventorySlot(i));
      this.inventorySlots.push(slot);
      this.sellContainer.add([slot.bg, slot.icon, slot.countLabel]);
    }

    this.sellDetailName = scene.add.text(0, 0, "Selecciona un item", { fontFamily: GAME_FONT, fontSize: "12px", color: COLORS.body }).setOrigin(0.5, 0);
    
    this.priceInputEl = document.createElement("input");
    this.priceInputEl.style.display = "none";
    this.priceInputEl.type = "text";
    this.priceInputEl.placeholder = "Precio Oro";
    this.priceInputEl.style.width = "120px";
    this.priceInputEl.style.textAlign = "center";
    this.priceInputEl.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      this.handleEscape();
    });
    this.priceInputDom = scene.add.dom(0, 0, this.priceInputEl).setOrigin(0.5, 0.5).setVisible(false);

    this.durationSelectEl = document.createElement("select");
    this.durationSelectEl.style.display = "none";
    [12, 24, 48].forEach(h => {
      const opt = document.createElement("option");
      opt.value = String(h);
      opt.text = `${h} Horas`;
      this.durationSelectEl.add(opt);
    });
    this.durationSelectEl.style.width = "120px";
    this.durationSelectEl.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      this.handleEscape();
    });
    this.durationSelectDom = scene.add.dom(0, 0, this.durationSelectEl).setOrigin(0.5, 0.5).setVisible(false);

    this.listBtn = this.createButton(scene, "Subastar", () => this.confirmList());
    this.sellContainer.add([this.sellDetailName, this.listBtn.bg, this.listBtn.label]);

    this.container.add([
      this.backdrop,
      this.panel,
      this.titleText,
      this.goldText,
      this.closeBtn,
      this.closeLabel,
      this.tabBuyBtn,
      this.tabBuyLabel,
      this.tabSellBtn,
      this.tabSellLabel,
      this.buyContainer,
      this.sellContainer
    ]);

    this.container.setVisible(false);
  }

  private createSlotUi(scene: Phaser.Scene, onClick: () => void): SlotUi {
    const bg = scene.add.rectangle(0, 0, SLOT_SIZE, SLOT_SIZE, COLORS.slotBg, 1).setOrigin(0, 0).setStrokeStyle(1, COLORS.slotBorder, 1).setInteractive({ useHandCursor: true });
    const icon = scene.add.image(0, 0, "__MISSING").setOrigin(0.5, 0.5).setVisible(false);
    const countLabel = scene.add.text(0, 0, "", { fontFamily: GAME_FONT, fontSize: "9px", color: COLORS.gold }).setOrigin(1, 1);
    bg.on("pointerdown", onClick);
    return { bg, icon, countLabel };
  }

  private createButton(scene: Phaser.Scene, label: string, onClick: () => void) {
    const bg = scene.add.rectangle(0, 0, 100, 30, COLORS.btnBg, 1).setOrigin(0.5, 0.5).setStrokeStyle(1, COLORS.panelBorder, 1).setInteractive({ useHandCursor: true });
    const text = scene.add.text(0, 0, label, { fontFamily: GAME_FONT, fontSize: "12px", color: "#ffffff" }).setOrigin(0.5, 0.5);
    bg.on("pointerover", () => bg.setFillStyle(COLORS.btnHover));
    bg.on("pointerout", () => bg.setFillStyle(COLORS.btnBg));
    bg.on("pointerdown", onClick);
    return { bg, label: text };
  }

  private switchTab(tab: "buy" | "sell") {
    this.activeTab = tab;
    this.tabBuyBtn.setFillStyle(tab === "buy" ? COLORS.tabActive : COLORS.tabBg);
    this.tabBuyLabel.setColor(tab === "buy" ? COLORS.body : COLORS.muted);
    this.tabSellBtn.setFillStyle(tab === "sell" ? COLORS.tabActive : COLORS.tabBg);
    this.tabSellLabel.setColor(tab === "sell" ? COLORS.body : COLORS.muted);

    this.buyContainer.setVisible(tab === "buy");
    this.sellContainer.setVisible(tab === "sell");
    this.auctionListDom.setVisible(tab === "buy" && this.open);
    this.priceInputDom.setVisible(tab === "sell" && this.open);
    this.durationSelectDom.setVisible(tab === "sell" && this.open);
    
    if (tab === "buy") this.renderAuctionList();
  }

  private selectInventorySlot(index: number) {
    this.selectedInventorySlot = index;
    this.inventorySlots.forEach((s, i) => s.bg.setStrokeStyle(1, i === index ? COLORS.slotSelected : COLORS.slotBorder, 1));
    const stack = this.lastState?.inventory[index];
    if (stack && stack.itemId) {
      const def = tryGetItemDefinition(stack.itemId);
      this.sellDetailName.setText(def?.name || "Item");
    } else {
      this.sellDetailName.setText("Selecciona un item");
    }
  }

  private confirmList() {
    if (this.selectedInventorySlot === null) return;
    const price = parseInt(this.priceInputEl.value);
    const duration = parseInt(this.durationSelectEl.value);
    const stack = this.lastState?.inventory[this.selectedInventorySlot];
    if (!stack || !stack.itemId || isNaN(price) || price <= 0) return;
    this.handlers.onList(this.selectedInventorySlot, stack.count, price, duration);
  }

  private renderAuctionList() {
    if (!this.lastState) return;
    this.auctionListEl.innerHTML = "";
    
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.color = "#e6edf3";
    table.style.fontSize = "12px";
    table.style.borderCollapse = "collapse";
    
    const header = table.insertRow();
    ["Item", "Vend.", "Precio", ""].forEach(t => {
      const th = document.createElement("th");
      th.innerText = t;
      th.style.textAlign = "left";
      th.style.padding = "4px";
      th.style.borderBottom = "1px solid #4a5568";
      header.appendChild(th);
    });

    this.lastState.auctions.forEach(a => {
      if (!a.itemId) return;
      const row = table.insertRow();
      row.style.borderBottom = "1px solid #2a364a";
      
      const def = tryGetItemDefinition(a.itemId as ItemId);
      
      const c1 = row.insertCell();
      c1.innerText = `${a.amount}x ${def?.name || "Item"}`;
      c1.style.padding = "4px";
      
      const c2 = row.insertCell();
      c2.innerText = a.sellerName;
      c2.style.padding = "4px";
      
      const c3 = row.insertCell();
      c3.innerText = a.price.toLocaleString();
      c3.style.color = "#f1c40f";
      c3.style.padding = "4px";
      
      const c4 = row.insertCell();
      const btn = document.createElement("button");
      if (a.sellerId === this.lastState?.playerId) {
        btn.innerText = "Canc.";
        btn.onclick = () => this.handlers.onCancel(a.id);
      } else {
        btn.innerText = "Comprar";
        btn.onclick = () => this.handlers.onBuy(a.id);
      }
      btn.style.fontSize = "10px";
      c4.appendChild(btn);
    });

    this.auctionListEl.appendChild(table);
  }

  show(viewport: GameViewportRect, state: AuctionViewState) {
    this.open = true;
    this.lastState = state;
    this.container.setVisible(true);
    this.auctionListEl.style.display = "block";
    this.priceInputEl.style.display = "block";
    this.durationSelectEl.style.display = "block";
    this.switchTab("buy");
    this.layout(viewport);
    this.refresh(state);
  }

  hide() {
    this.open = false;
    this.container.setVisible(false);
    this.auctionListDom.setVisible(false);
    this.priceInputDom.setVisible(false);
    this.durationSelectDom.setVisible(false);
    this.auctionListEl.style.display = "none";
    this.priceInputEl.style.display = "none";
    this.durationSelectEl.style.display = "none";
  }

  handleEscape(): boolean {
    if (!this.open) return false;
    this.handlers.onClose();
    return true;
  }

  refresh(state: AuctionViewState) {
    this.lastState = state;
    this.goldText.setText(`Oro: ${state.playerGold.toLocaleString("es-AR")}`);
    
    // Inventory
    this.inventorySlots.forEach((slotUi, index) => {
      const stack = state.inventory[index] ?? null;
      if (!stack || !stack.itemId) {
        slotUi.icon.setVisible(false);
        slotUi.countLabel.setText("");
        return;
      }
      const item = tryGetItemDefinition(stack.itemId);
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

    if (this.activeTab === "buy") this.renderAuctionList();
  }

  layout(viewport: GameViewportRect) {
    if (!this.open) return;
    this.backdrop.setPosition(viewport.x, viewport.y).setSize(viewport.width, viewport.height);
    const cx = viewport.x + viewport.width / 2;
    const cy = viewport.y + viewport.height / 2;
    const w = 460;
    const h = 420;
    this.panel.setSize(w, h).setPosition(cx, cy);
    this.titleText.setPosition(cx, cy - h / 2 + 15);
    this.goldText.setPosition(cx, cy - h / 2 + 35);
    this.closeBtn.setPosition(cx + w / 2 - 15, cy - h / 2 + 15);
    this.closeLabel.setPosition(cx + w / 2 - 15, cy - h / 2 + 15);

    const tabY = cy - h / 2 + 60;
    this.tabBuyBtn.setPosition(cx - 105, tabY);
    this.tabBuyLabel.setPosition(cx - 55, tabY + 15);
    this.tabSellBtn.setPosition(cx + 5, tabY);
    this.tabSellLabel.setPosition(cx + 55, tabY + 15);

    const contentY = tabY + 40;
    this.auctionListDom.setPosition(cx - 200, contentY);
    this.priceInputDom.setPosition(cx, cy + 110);
    this.durationSelectDom.setPosition(cx, cy + 140);
    
    // Sell layout
    const invX = cx - 170 / 2;
    const invY = contentY;
    this.inventorySlots.forEach((slot, i) => {
      const col = i % INV_COLS;
      const row = Math.floor(i / INV_COLS);
      const x = invX + col * (SLOT_SIZE + SLOT_GAP);
      const y = invY + row * (SLOT_SIZE + SLOT_GAP);
      slot.bg.setPosition(x, y);
      slot.icon.setPosition(x + SLOT_SIZE / 2, y + SLOT_SIZE / 2);
      slot.countLabel.setPosition(x + SLOT_SIZE - 2, y + SLOT_SIZE - 1);
    });

    const sellDetailY = invY + (INV_ROWS * (SLOT_SIZE + SLOT_GAP)) + 20;
    this.sellDetailName.setPosition(cx, sellDetailY);
    this.listBtn.bg.setPosition(cx, cy + 175);
    this.listBtn.label.setPosition(cx, cy + 175);
  }

  isOpen() { return this.open; }
  getContainer() { return this.container; }
  getDomObjects() { return [this.auctionListDom, this.priceInputDom, this.durationSelectDom]; }
  destroy() {
    this.auctionListDom.destroy();
    this.priceInputDom.destroy();
    this.durationSelectDom.destroy();
    this.container.destroy(true);
  }
}
