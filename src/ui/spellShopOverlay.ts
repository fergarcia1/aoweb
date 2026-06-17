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
  overlay: 0x0a0c10,
  panelBg: 0x120d0b,
  panelBorder: 0x9b1d16,
  panelAccent: 0xd4a72c,
  divider: 0x5d241d,
  btnBg: 0x4b1714,
  btnHover: 0x6f211d,
  btnDisabled: 0x24100e,
  slotBg: 0x0e1218,
  slotBorder: 0x5d241d,
  slotSelected: 0xd4a72c,
  scrollTrack: 0x3a1a16,
  scrollThumb: 0xd4a72c,
  title: "#f1c44d",
  body: "#f4ead0",
  muted: "#bda98a",
  gold: "#f1c40f",
  disabled: "#ff6666",
  buttonText: "#fff3d2",
};

const CATALOG_COLS = 6;
const CATALOG_ROWS = 4;
const CATALOG_PAGE_SIZE = CATALOG_COLS * CATALOG_ROWS;
const SLOT_SIZE = 32;
const SLOT_GAP = 2;
const ICON_SCALE = SHOP_SLOT_ICON_SCALE;

type SlotUi = {
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Text;
  spellIndex: number;
};

type ActionButton = {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
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
  private readonly divider: Phaser.GameObjects.Rectangle;
  private readonly closeBtn: ActionButton;
  private readonly buyBtn: ActionButton;
  private readonly scrollUpBtn: ActionButton;
  private readonly scrollDownBtn: ActionButton;
  private readonly scrollTrack: Phaser.GameObjects.Rectangle;
  private readonly scrollThumb: Phaser.GameObjects.Rectangle;

  private readonly catalogSlots: SlotUi[] = [];
  private readonly loadingSpellTextureKeys = new Set<string>();

  private open = false;
  private lastViewport: GameViewportRect = { x: 0, y: 0, width: 800, height: 600 };
  private catalog: SpellDefinition[] = [];
  private lastState: SpellShopViewState | null = null;
  private selectedIndex: number | null = null;
  private scrollOffset = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly handlers: SpellShopOverlayHandlers
  ) {
    this.container = scene.add.container(0, 0).setDepth(50_100).setScrollFactor(0);
    this.catalogGroup = scene.add.container(0, 0);
    this.backdrop = scene.add
      .rectangle(0, 0, 10, 10, COLORS.overlay, 0.62)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.panel = scene.add
      .rectangle(0, 0, 10, 10, COLORS.panelBg, 0.98)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(2, COLORS.panelBorder, 1);

    this.titleText = this.createTitle(scene, "Vendedor de Magia");
    this.goldText = this.createBodyText(scene, "");
    this.catalogTitle = this.createMutedText(scene, "Hechizos");
    this.detailName = this.createBodyText(scene, "Selecciona un hechizo");
    this.detailMeta = this.createMutedText(scene, "");
    this.detailPrice = this.createMutedText(scene, "");
    this.hintText = scene.add
      .text(0, 0, "Aprender incorpora el hechizo al libro al instante.", {
        fontFamily: GAME_FONT,
        fontSize: "10px",
        color: COLORS.muted,
        align: "center",
        wordWrap: { width: 248 },
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);
    this.divider = scene.add.rectangle(0, 0, 10, 1, COLORS.divider, 1).setOrigin(0.5, 0);

    this.closeBtn = this.createButton(scene, "Volver", () => this.handlers.onClose(), 58, 20);
    this.buyBtn = this.createButton(scene, "Aprender", () => this.confirmBuy(), 112, 28);
    this.scrollUpBtn = this.createButton(scene, "^", () => this.scrollCatalog(-CATALOG_COLS), 30, 24);
    this.scrollDownBtn = this.createButton(scene, "v", () => this.scrollCatalog(CATALOG_COLS), 30, 24);
    this.scrollTrack = scene.add
      .rectangle(0, 0, 12, 10, COLORS.scrollTrack, 1)
      .setStrokeStyle(1, COLORS.panelAccent, 0.8)
      .setOrigin(0.5, 0);
    this.scrollThumb = scene.add
      .rectangle(0, 0, 10, 18, COLORS.scrollThumb, 1)
      .setOrigin(0.5, 0);

    scene.input.on("wheel", (pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
      if (!this.open || !this.isPointerInsideCatalog(pointer.x, pointer.y)) {
        return;
      }
      this.scrollCatalog(dy > 0 ? CATALOG_COLS : -CATALOG_COLS);
    });

    this.container.add([
      this.backdrop,
      this.panel,
      this.titleText,
      this.goldText,
      this.catalogTitle,
      this.catalogGroup,
      this.scrollUpBtn.bg,
      this.scrollUpBtn.label,
      this.scrollTrack,
      this.scrollThumb,
      this.scrollDownBtn.bg,
      this.scrollDownBtn.label,
      this.divider,
      this.detailName,
      this.detailMeta,
      this.detailPrice,
      this.hintText,
      this.buyBtn.bg,
      this.buyBtn.label,
      this.closeBtn.bg,
      this.closeBtn.label,
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

  private createButton(
    scene: Phaser.Scene,
    label: string,
    onClick: () => void,
    width: number,
    height: number
  ): ActionButton {
    const bg = scene.add
      .rectangle(0, 0, width, height, COLORS.btnBg, 1)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(1, COLORS.panelAccent, 0.95)
      .setInteractive({ useHandCursor: true });
    const text = scene.add
      .text(0, 0, label, {
        fontFamily: GAME_FONT,
        fontSize: "11px",
        color: COLORS.buttonText,
        fontStyle: "bold",
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0.5);
    bg.on("pointerover", () => bg.setFillStyle(COLORS.btnHover));
    bg.on("pointerout", () => bg.setFillStyle(COLORS.btnBg));
    bg.on("pointerdown", onClick);
    return { bg, label: text };
  }

  private createSlotUi(scene: Phaser.Scene, spellIndex: number, onClick: () => void): SlotUi {
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
    return { bg, icon, badge, spellIndex };
  }

  private rebuildCatalog(scene: Phaser.Scene, state: SpellShopViewState) {
    this.catalogGroup.removeAll(true);
    this.catalogSlots.length = 0;

    const visibleSpells = state.catalog.slice(
      this.scrollOffset,
      this.scrollOffset + CATALOG_PAGE_SIZE
    );

    visibleSpells.forEach((spell, visibleIndex) => {
      const spellIndex = this.scrollOffset + visibleIndex;
      const slot = this.createSlotUi(scene, spellIndex, () => this.selectSpell(spellIndex));
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
      } else if (spell.iconAssetPath) {
        this.queueSpellIcon(scene, texKey, spell.iconAssetPath);
      }
      slot.badge.setText(spell.nivelRequerido > 0 ? String(spell.nivelRequerido) : "");
      this.catalogGroup.add([slot.bg, slot.icon, slot.badge]);
    });
  }

  private queueSpellIcon(scene: Phaser.Scene, textureKey: string, assetPath: string) {
    if (this.loadingSpellTextureKeys.has(textureKey) || scene.textures.exists(textureKey)) {
      return;
    }
    this.loadingSpellTextureKeys.add(textureKey);
    scene.load.image(textureKey, assetPath);
    scene.load.once(`filecomplete-image-${textureKey}`, () => {
      this.loadingSpellTextureKeys.delete(textureKey);
      if (this.open && this.lastState) {
        this.refresh(this.lastState);
      }
    });
    if (!scene.load.isLoading()) {
      scene.load.start();
    }
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
    this.ensureSelectedSpellVisible();
    this.refreshDetails();
    this.refreshSelectionHighlight();
  }

  private refreshSelectionHighlight() {
    this.catalogSlots.forEach((slot) => {
      slot.bg.setStrokeStyle(
        slot.spellIndex === this.selectedIndex ? 2 : 1,
        slot.spellIndex === this.selectedIndex ? COLORS.slotSelected : COLORS.slotBorder,
        1
      );
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
      `Nv ${spell.nivelRequerido} - ${spell.manaCost} mana` +
        (state.learnedSpellIds.has(spell.idSpell) ? " - Ya aprendido" : "")
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
      this.buyBtn.bg.disableInteractive();
      this.buyBtn.bg.setAlpha(0.45);
      this.buyBtn.label.setAlpha(0.45);
      return;
    }
    this.buyBtn.bg.setInteractive({ useHandCursor: true });
    this.buyBtn.bg.setAlpha(1);
    this.buyBtn.label.setAlpha(1);
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
    this.scrollOffset = 0;
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
    if (
      this.selectedIndex !== null &&
      this.selectedIndex >= state.catalog.length
    ) {
      this.selectedIndex = state.catalog.length > 0 ? 0 : null;
    }
    this.ensureSelectedSpellVisible();
    this.rebuildCatalog(this.container.scene, state);
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

    const gridW = CATALOG_COLS * SLOT_SIZE + Math.max(0, CATALOG_COLS - 1) * SLOT_GAP;
    const gridH = CATALOG_ROWS * SLOT_SIZE + Math.max(0, CATALOG_ROWS - 1) * SLOT_GAP;
    const panelW = Math.min(Math.max(340, gridW + 112), rect.width - 24);
    const panelH = Math.min(384, rect.height - 24);

    this.panel.setSize(panelW, panelH);
    this.panel.setPosition(cx, cy);

    this.titleText.setPosition(cx, cy - panelH / 2 + 16);
    this.goldText.setPosition(cx, cy - panelH / 2 + 36);
    this.closeBtn.bg.setPosition(cx + panelW / 2 - 40, cy - panelH / 2 + 20);
    this.closeBtn.label.setPosition(cx + panelW / 2 - 40, cy - panelH / 2 + 20);

    const gridLeft = cx - gridW / 2;
    const gridTop = cy - panelH / 2 + 70;
    this.catalogTitle.setPosition(cx, cy - panelH / 2 + 58);
    this.catalogGroup.setPosition(gridLeft, gridTop);
    this.layoutCatalogGrid(0, 0);

    const scrollX = gridLeft + gridW + 24;
    this.scrollUpBtn.bg.setPosition(scrollX, gridTop + 12);
    this.scrollUpBtn.label.setPosition(scrollX, gridTop + 12);
    this.scrollTrack.setPosition(scrollX, gridTop + 34);
    this.scrollTrack.setSize(12, Math.max(28, gridH - 68));
    this.scrollDownBtn.bg.setPosition(scrollX, gridTop + gridH - 12);
    this.scrollDownBtn.label.setPosition(scrollX, gridTop + gridH - 12);
    this.updateScrollControls();

    const detailY = gridTop + gridH + 14;
    this.divider.setPosition(cx, detailY - 8);
    this.divider.setSize(panelW - 54, 1);
    this.detailName.setPosition(cx, detailY);
    this.detailMeta.setPosition(cx, detailY + 16);
    this.detailPrice.setPosition(cx, detailY + 32);
    this.hintText.setPosition(cx, detailY + 52);
    this.buyBtn.bg.setPosition(cx, detailY + 88);
    this.buyBtn.label.setPosition(cx, detailY + 88);
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

  private scrollCatalog(delta: number) {
    const maxOffset = this.getMaxScrollOffset();
    const next = Phaser.Math.Clamp(this.scrollOffset + delta, 0, maxOffset);
    if (next === this.scrollOffset) {
      return;
    }
    this.scrollOffset = next - (next % CATALOG_COLS);
    if (this.lastState) {
      this.rebuildCatalog(this.container.scene, this.lastState);
      this.layout(this.lastViewport);
      this.refreshSelectionHighlight();
      this.refreshDetails();
    }
  }

  private ensureSelectedSpellVisible() {
    if (this.selectedIndex === null) return;
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex - (this.selectedIndex % CATALOG_COLS);
    } else if (this.selectedIndex >= this.scrollOffset + CATALOG_PAGE_SIZE) {
      const rowStart = this.selectedIndex - (this.selectedIndex % CATALOG_COLS);
      this.scrollOffset = Math.max(0, rowStart - (CATALOG_ROWS - 1) * CATALOG_COLS);
    }
    this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset, 0, this.getMaxScrollOffset());
  }

  private getMaxScrollOffset(): number {
    if (this.catalog.length <= CATALOG_PAGE_SIZE) {
      return 0;
    }
    const lastPageStart = this.catalog.length - CATALOG_PAGE_SIZE;
    return Math.ceil(lastPageStart / CATALOG_COLS) * CATALOG_COLS;
  }

  private updateScrollControls() {
    const canScroll = this.catalog.length > CATALOG_PAGE_SIZE;
    this.scrollUpBtn.bg.setVisible(canScroll);
    this.scrollUpBtn.label.setVisible(canScroll);
    this.scrollTrack.setVisible(canScroll);
    this.scrollThumb.setVisible(canScroll);
    this.scrollDownBtn.bg.setVisible(canScroll);
    this.scrollDownBtn.label.setVisible(canScroll);
    if (!canScroll) return;

    const canScrollUp = this.scrollOffset > 0;
    const canScrollDown = this.scrollOffset < this.getMaxScrollOffset();
    this.setButtonEnabled(this.scrollUpBtn, canScrollUp);
    this.setButtonEnabled(this.scrollDownBtn, canScrollDown);

    const trackTop = this.scrollTrack.y;
    const trackH = this.scrollTrack.height;
    const maxOffset = Math.max(1, this.getMaxScrollOffset());
    const thumbH = Math.max(18, Math.floor(trackH * (CATALOG_PAGE_SIZE / this.catalog.length)));
    const travel = Math.max(1, trackH - thumbH);
    const progress = this.scrollOffset / maxOffset;
    this.scrollThumb.setSize(10, thumbH);
    this.scrollThumb.setPosition(this.scrollTrack.x, trackTop + travel * progress);
  }

  private setButtonEnabled(button: ActionButton, enabled: boolean) {
    button.bg.setFillStyle(enabled ? COLORS.btnBg : COLORS.btnDisabled);
    button.bg.setAlpha(enabled ? 1 : 0.55);
    button.label.setAlpha(enabled ? 1 : 0.55);
    if (enabled) {
      button.bg.setInteractive({ useHandCursor: true });
    } else {
      button.bg.disableInteractive();
    }
  }

  private isPointerInsideCatalog(x: number, y: number): boolean {
    const bounds = this.catalogGroup.getBounds();
    const scrollBounds = this.scrollTrack.getBounds();
    return bounds.contains(x, y) || scrollBounds.contains(x, y);
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  getDomObjects(): Phaser.GameObjects.GameObject[] {
    return [];
  }
}
