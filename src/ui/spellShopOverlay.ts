import Phaser from "phaser";
import type { SpellDefinition } from "../data/spells";
import type { CharacterClassId } from "../../game-data/items/catalog";
import { macroSpellTextureKey } from "../scenes/gameSceneModules/progressFormulas";
import { GAME_FONT, GAME_TEXT_RESOLUTION } from "./fonts";
import type { GameViewportRect } from "./deathOverlay";
import { SHOP_SLOT_ICON_SCALE } from "./shopSlotIconScale";
import { isSpellLearnedByPlayer } from "../../shared/spellLearned";

export type SpellShopViewState = {
  title: string;
  catalog: SpellDefinition[];
  playerGold: number;
  learnedSpellIds: ReadonlySet<number>;
  playerClass: CharacterClassId;
  playerLevel: number;
  isAdmin: boolean;
};

type SpellShopOverlayHandlers = {
  onClose: () => void;
  onBuy: (spellId: number) => void;
};

const COLORS = {
  panelBg: 0x141c28,
  panelBorder: 0xc9a227,
  btnBg: 0x3d4555,
  btnHover: 0x4f596d,
  closeBg: 0xb83232,
  closeHover: 0xd04040,
  slotBg: 0x0e1218,
  slotBorder: 0x4a5568,
  slotSelected: 0x6b5428,
  title: "#d4af37",
  body: "#e6edf3",
  muted: "#9aa3b2",
  gold: "#f1c40f",
  disabled: "#ff6666",
};

const CATALOG_COLS = 6;
const SLOT_SIZE = 32;
const SLOT_GAP = 2;
const ICON_SCALE = SHOP_SLOT_ICON_SCALE;

type SlotUi = {
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Text;
};

export class SpellShopOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly catalogGroup: Phaser.GameObjects.Container;
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly goldText: Phaser.GameObjects.Text;
  private readonly catalogTitle: Phaser.GameObjects.Text;
  private readonly detailName: Phaser.GameObjects.Text;
  private readonly detailMeta: Phaser.GameObjects.Text;
  private readonly detailPrice: Phaser.GameObjects.Text;
  private readonly hintText: Phaser.GameObjects.Text;
  private readonly closeBtn: Phaser.GameObjects.Rectangle;
  private readonly closeLabel: Phaser.GameObjects.Text;
  private readonly buyBtnBg: Phaser.GameObjects.Rectangle;
  private readonly buyBtnLabel: Phaser.GameObjects.Text;

  private readonly catalogSlots: SlotUi[] = [];

  private open = false;
  private lastViewport: GameViewportRect = { x: 0, y: 0, width: 800, height: 600 };
  private catalog: SpellDefinition[] = [];
  private lastState: SpellShopViewState | null = null;
  private selectedIndex: number | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly handlers: SpellShopOverlayHandlers
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
      .setStrokeStyle(2, COLORS.panelBorder, 1);

    this.titleText = this.createTitle(scene, "Vendedor de Magia");
    this.goldText = this.createBodyText(scene, "");
    this.catalogTitle = this.createMutedText(scene, "Hechizos");
    this.detailName = this.createBodyText(scene, "Seleccioná un hechizo");
    this.detailMeta = this.createMutedText(scene, "");
    this.detailPrice = this.createMutedText(scene, "");
    this.hintText = this.createMutedText(scene, "Comprar enseña el hechizo al instante.");

    const close = this.createCloseButton(scene, () => this.handlers.onClose());
    this.closeBtn = close.bg;
    this.closeLabel = close.label;

    this.buyBtnBg = scene.add
      .rectangle(0, 0, 100, 28, COLORS.btnBg, 1)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(1, COLORS.panelBorder, 1)
      .setInteractive({ useHandCursor: true });
    this.buyBtnLabel = scene.add
      .text(0, 0, "Aprender", {
        fontFamily: GAME_FONT,
        fontSize: "11px",
        color: COLORS.body,
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0.5);
    this.buyBtnBg.on("pointerover", () => this.buyBtnBg.setFillStyle(COLORS.btnHover));
    this.buyBtnBg.on("pointerout", () => this.buyBtnBg.setFillStyle(COLORS.btnBg));
    this.buyBtnBg.on("pointerdown", () => this.confirmBuy());

    this.container.add([
      this.backdrop,
      this.panel,
      this.titleText,
      this.goldText,
      this.catalogTitle,
      this.catalogGroup,
      this.detailName,
      this.detailMeta,
      this.detailPrice,
      this.hintText,
      this.buyBtnBg,
      this.buyBtnLabel,
      this.closeBtn,
      this.closeLabel,
    ]);
    this.container.setVisible(false);
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
    const icon = scene.add.image(0, 0, "__MISSING").setOrigin(0.5, 0.5).setVisible(false);
    const badge = scene.add
      .text(0, 0, "", {
        fontFamily: GAME_FONT,
        fontSize: "8px",
        color: COLORS.gold,
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(1, 1);
    bg.on("pointerdown", onClick);
    return { bg, icon, badge };
  }

  private rebuildCatalog(scene: Phaser.Scene, state: SpellShopViewState) {
    this.catalogGroup.removeAll(true);
    this.catalogSlots.length = 0;

    state.catalog.forEach((spell, index) => {
      const slot = this.createSlotUi(scene, () => this.selectSpell(index));
      this.catalogSlots.push(slot);
      const texKey = macroSpellTextureKey(spell.idSpell);
      if (scene.textures.exists(texKey)) {
        slot.icon.setTexture(texKey);
        slot.icon.setScale(ICON_SCALE);
        slot.icon.setVisible(true);
        if (this.isSpellLearned(spell, state)) {
          slot.icon.setTint(0x66cc88);
        } else if (this.isSpellUnavailable(spell, state)) {
          slot.icon.setTint(0x888888);
        } else {
          slot.icon.clearTint();
        }
      }
      slot.badge.setText(spell.nivelRequerido > 0 ? String(spell.nivelRequerido) : "");
      this.catalogGroup.add([slot.bg, slot.icon, slot.badge]);
    });
  }

  private isSpellLearned(spell: SpellDefinition, state: SpellShopViewState): boolean {
    return isSpellLearnedByPlayer(spell.idSpell, state.learnedSpellIds);
  }

  private isSpellUnavailable(spell: SpellDefinition, state: SpellShopViewState): boolean {
    if (this.isSpellLearned(spell, state)) return true;
    if (state.isAdmin) return false;
    if (!spell.usableBy.includes(state.playerClass)) return true;
    if (spell.nivelRequerido > state.playerLevel) return true;
    return false;
  }

  private selectSpell(index: number) {
    this.selectedIndex = index;
    this.refreshDetails();
    this.catalogSlots.forEach((slot, i) => {
      slot.bg.setStrokeStyle(1, i === index ? COLORS.slotSelected : COLORS.slotBorder, 1);
    });
  }

  private refreshDetails() {
    const state = this.lastState;
    if (!state || this.selectedIndex === null) {
      return;
    }
    const spell = state.catalog[this.selectedIndex];
    if (!spell) return;

    this.detailName.setText(spell.nombre);
    this.detailMeta.setText(
      `Nv ${spell.nivelRequerido} · ${spell.manaCost} mana` +
        (state.learnedSpellIds.has(spell.idSpell) ? " · Ya aprendido" : "")
    );
    const learned = this.isSpellLearned(spell, state);
    if (learned) {
      this.detailPrice.setText("Ya aprendido");
      this.detailPrice.setColor(COLORS.muted);
    } else {
      this.detailPrice.setText(`${spell.valor.toLocaleString("es-AR")} oro`);
      this.detailPrice.setColor(
        state.playerGold >= spell.valor ? COLORS.gold : COLORS.disabled
      );
    }
    this.updateBuyButton(spell, state);
  }

  private updateBuyButton(spell: SpellDefinition, state: SpellShopViewState) {
    const learned = this.isSpellLearned(spell, state);
    const blocked =
      learned ||
      (!state.isAdmin &&
        (!spell.usableBy.includes(state.playerClass) ||
          spell.nivelRequerido > state.playerLevel));
    if (blocked) {
      this.buyBtnBg.disableInteractive();
      this.buyBtnBg.setAlpha(0.45);
      this.buyBtnLabel.setAlpha(0.45);
      return;
    }
    this.buyBtnBg.setInteractive({ useHandCursor: true });
    this.buyBtnBg.setAlpha(1);
    this.buyBtnLabel.setAlpha(1);
  }

  private confirmBuy() {
    if (this.selectedIndex === null || !this.lastState) return;
    const spell = this.lastState.catalog[this.selectedIndex];
    if (!spell) return;
    if (this.isSpellLearned(spell, this.lastState)) {
      return;
    }
    this.handlers.onBuy(spell.idSpell);
  }

  show(rect: GameViewportRect, state: SpellShopViewState) {
    this.open = true;
    this.lastState = state;
    this.catalog = state.catalog;
    this.selectedIndex = state.catalog.length > 0 ? 0 : null;
    this.lastViewport = rect;
    this.container.setVisible(true);
    this.titleText.setText(state.title);
    this.rebuildCatalog(this.container.scene, state);
    this.layout(rect);
    if (this.selectedIndex !== null) {
      this.selectSpell(this.selectedIndex);
    }
    this.refresh(state);
  }

  refresh(state: SpellShopViewState) {
    this.lastState = state;
    this.catalog = state.catalog;
    this.goldText.setText(`Oro: ${state.playerGold.toLocaleString("es-AR")}`);
    this.rebuildCatalog(this.container.scene, state);
    if (
      this.selectedIndex !== null &&
      this.selectedIndex >= state.catalog.length
    ) {
      this.selectedIndex = state.catalog.length > 0 ? 0 : null;
    }
    this.layout(this.lastViewport);
    if (this.selectedIndex !== null) {
      this.selectSpell(this.selectedIndex);
    }
    this.refreshDetails();
  }

  hide() {
    this.open = false;
    this.container.setVisible(false);
    this.selectedIndex = null;
  }

  isOpen(): boolean {
    return this.open;
  }

  layout(rect: GameViewportRect) {
    if (!this.open) return;
    this.lastViewport = rect;

    this.backdrop.setPosition(rect.x, rect.y);
    this.backdrop.setSize(rect.width, rect.height);

    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;

    const catalogRows = Math.max(1, Math.ceil(this.catalog.length / CATALOG_COLS));
    const gridW = CATALOG_COLS * SLOT_SIZE + Math.max(0, CATALOG_COLS - 1) * SLOT_GAP;
    const gridH = catalogRows * SLOT_SIZE + Math.max(0, catalogRows - 1) * SLOT_GAP;
    const panelW = Math.min(Math.max(280, gridW + 56), rect.width - 24);
    const panelH = Math.min(gridH + 168, rect.height - 24);

    this.panel.setSize(panelW, panelH);
    this.panel.setPosition(cx, cy);

    this.titleText.setPosition(cx, cy - panelH / 2 + 12);
    this.goldText.setPosition(cx, cy - panelH / 2 + 30);
    this.closeBtn.setPosition(cx + panelW / 2 - 16, cy - panelH / 2 + 12);
    this.closeLabel.setPosition(cx + panelW / 2 - 16, cy - panelH / 2 + 12);

    const gridLeft = cx - gridW / 2;
    const gridTop = cy - panelH / 2 + 52;
    this.catalogTitle.setPosition(cx, cy - panelH / 2 + 44);
    this.catalogGroup.setPosition(gridLeft, gridTop);
    this.layoutCatalogGrid(0, 0);

    const detailY = gridTop + gridH + 14;
    this.detailName.setPosition(cx, detailY);
    this.detailMeta.setPosition(cx, detailY + 16);
    this.detailPrice.setPosition(cx, detailY + 32);
    this.hintText.setPosition(cx, detailY + 50);
    this.buyBtnBg.setPosition(cx, detailY + 72);
    this.buyBtnLabel.setPosition(cx, detailY + 72);
  }

  private layoutCatalogGrid(startX: number, startY: number) {
    this.catalogSlots.forEach((slot, index) => {
      const col = index % CATALOG_COLS;
      const row = Math.floor(index / CATALOG_COLS);
      const x = startX + col * (SLOT_SIZE + SLOT_GAP);
      const y = startY + row * (SLOT_SIZE + SLOT_GAP);
      slot.bg.setPosition(x, y);
      slot.icon.setPosition(x + SLOT_SIZE / 2, y + SLOT_SIZE / 2);
      slot.badge.setPosition(x + SLOT_SIZE - 2, y + SLOT_SIZE - 1);
    });
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  getDomObjects(): Phaser.GameObjects.GameObject[] {
    return [];
  }
}
