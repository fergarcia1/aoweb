import Phaser from "phaser";
import { getTileDefinition, TILE } from "../maps/tileDefinitions";
import type { GameMap } from "../maps/types";
import type { SpellDefinition } from "../data/spells";
import { UI_LAYOUT } from "./layout";
import { createInventoryPanel, type InventoryPanel } from "./inventoryPanel";

const UI_DEPTH = 1000;
const MACRO_COUNT = 10;
const INVENTORY_COLS = 5;
const INVENTORY_ROWS = 4;
const INVENTORY_SLOT_SCALE = 0.95;
const INVENTORY_ICON_SCALE = 0.572;
const INVENTORY_GAP = 1;
const INVENTORY_PADDING = 22;

const COLORS = {
  panelBg: 0x151515,
  panelBorder: 0x4a4a4a,
  panelInner: 0x212121,
  slotBg: 0x101010,
  slotBorder: 0x5c5c5c,
  hp: 0xc0392b,
  hpBg: 0x3d1515,
  mp: 0x3f6f8e,
  mpBg: 0x1f2b33,
  exp: 0xc9a227,
  expBg: 0x3d3515,
  tabActiveBg: 0x2a3446,
  tabInactiveBg: 0x1b1f2a,
};
const CHAT_TAB_ORDER = ["chat", "combat", "global"] as const;
type ChatTabId = (typeof CHAT_TAB_ORDER)[number];
type ChatEntry = { text: string; channel: ChatTabId };
const MACRO_MARK_TEXTURE_KEY = "macroMark";
const MACRO_ACTIONS = ["cast_spell", "use_item", "equip_item"] as const;
export type MacroActionType = (typeof MACRO_ACTIONS)[number];
export type MacroEditorItemOption = { itemId: string; label: string };
export type MacroEditorSpellOption = { spellId: number; label: string };
export type MacroEditorConfig = {
  slotIndex: number;
  keyCode: string | null;
  action: MacroActionType;
  selectedItemId: string | null;
  itemOptions: MacroEditorItemOption[];
  selectedSpellId: number | null;
  spellOptions: MacroEditorSpellOption[];
};
type SpellInfoRequest = {
  idSpell: number;
  nombre: string;
  descripcion: string;
  valor: number;
  usableBy: string[];
  nivelMagiaRequerido: number;
  manaCost: number;
  danioMin: number;
  danioMax: number;
  healMin: number;
  healMax: number;
  puedeUsarseEnAliados: boolean;
  remueveDebuff: string | null;
};

export type PlayerHudStats = {
  name: string;
  level: number;
  exp: number;
  expMax: number;
  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;
  gold: number;
};

const DEFAULT_STATS: PlayerHudStats = {
  name: "Lonler",
  level: 1,
  exp: 0,
  expMax: 100,
  hp: 100,
  hpMax: 100,
  mp: 50,
  mpMax: 50,
  gold: 0,
};

type BarGeom = { x: number; y: number; w: number; h: number };

export class GameUi {
  private inventoryIcons: Phaser.GameObjects.Image[] = [];
  private inventoryStackLabels: Phaser.GameObjects.Text[] = [];
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly sidebarWidth = UI_LAYOUT.sidebarWidth;
  private readonly macroBarHeight = UI_LAYOUT.macroBarHeight;
  private readonly chatHeight = UI_LAYOUT.chatHeight;

  private stats: PlayerHudStats = { ...DEFAULT_STATS };

  private chatPanel!: Phaser.GameObjects.Graphics;
  private sidebarPanel!: Phaser.GameObjects.Graphics;
  private macroPanel!: Phaser.GameObjects.Graphics;

  private mapNameText!: Phaser.GameObjects.Text;
  private chatText!: Phaser.GameObjects.Text;
  private chatTabs: {
    id: ChatTabId;
    bg: Phaser.GameObjects.Graphics;
    label: Phaser.GameObjects.Text;
  }[] = [];

  private chatInputBg!: Phaser.GameObjects.Graphics;
  private chatInputText!: Phaser.GameObjects.Text;
  private chatMaskGfx!: Phaser.GameObjects.Graphics;
  private chatHistory: ChatEntry[] = [];
  private activeChatTab: ChatTabId = "chat";
  private chatInputValue = "";
  private chatFocused = false;
  private chatTextArea = { x: 0, y: 0, w: 0, h: 0 };

  private levelText!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private expLabel!: Phaser.GameObjects.Text;
  private inventoryPanel!: InventoryPanel;
  private inventorySelectionGfx!: Phaser.GameObjects.Graphics;
  private expFill!: Phaser.GameObjects.Graphics;
  private invLabel!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private hpLabel!: Phaser.GameObjects.Text;
  private mpLabel!: Phaser.GameObjects.Text;
  private hpFill!: Phaser.GameObjects.Graphics;
  private mpFill!: Phaser.GameObjects.Graphics;
  private minimapGfx!: Phaser.GameObjects.Graphics;
  private macroStripFill!: Phaser.GameObjects.TileSprite;
  private macroSlots: {
    icon: Phaser.GameObjects.Image;
    itemIcon: Phaser.GameObjects.Image;
    keyLabel: Phaser.GameObjects.Text;
  }[] = [];
  private macroSlotClickHandler?: (slotIndex: number) => void;
  private activeSidebarTab: "inventory" | "spells" = "inventory";
  private macroEditorVisible = false;
  private macroEditorCapturingKey = false;
  private macroEditorConfig: MacroEditorConfig = {
    slotIndex: 0,
    keyCode: null,
    action: "cast_spell",
    selectedItemId: null,
    itemOptions: [],
    selectedSpellId: null,
    spellOptions: [],
  };
  private macroEditorSaveHandler: ((config: MacroEditorConfig) => void) | null = null;
  private macroEditorOverlay!: Phaser.GameObjects.Container;
  private macroEditorDim!: Phaser.GameObjects.Graphics;
  private macroEditorPanel!: Phaser.GameObjects.Graphics;
  private macroEditorTitle!: Phaser.GameObjects.Text;
  private macroEditorKeyValue!: Phaser.GameObjects.Text;
  private macroEditorActionValue!: Phaser.GameObjects.Text;
  private macroEditorItemValue!: Phaser.GameObjects.Text;
  private macroEditorHint!: Phaser.GameObjects.Text;
  private macroEditorCaptureBtn!: Phaser.GameObjects.Graphics;
  private macroEditorActionPrevBtn!: Phaser.GameObjects.Graphics;
  private macroEditorActionNextBtn!: Phaser.GameObjects.Graphics;
  private macroEditorItemPrevBtn!: Phaser.GameObjects.Graphics;
  private macroEditorItemNextBtn!: Phaser.GameObjects.Graphics;
  private macroEditorSaveBtn!: Phaser.GameObjects.Graphics;
  private macroEditorCancelBtn!: Phaser.GameObjects.Graphics;
  private macroEditorCaptureZone!: Phaser.GameObjects.Zone;
  private macroEditorActionPrevZone!: Phaser.GameObjects.Zone;
  private macroEditorActionNextZone!: Phaser.GameObjects.Zone;
  private macroEditorItemPrevZone!: Phaser.GameObjects.Zone;
  private macroEditorItemNextZone!: Phaser.GameObjects.Zone;
  private macroEditorSaveZone!: Phaser.GameObjects.Zone;
  private macroEditorCancelZone!: Phaser.GameObjects.Zone;
  private macroEditorCaptureLabel!: Phaser.GameObjects.Text;
  private macroEditorActionPrevLabel!: Phaser.GameObjects.Text;
  private macroEditorActionNextLabel!: Phaser.GameObjects.Text;
  private macroEditorItemPrevLabel!: Phaser.GameObjects.Text;
  private macroEditorItemNextLabel!: Phaser.GameObjects.Text;
  private macroEditorSaveLabel!: Phaser.GameObjects.Text;
  private macroEditorCancelLabel!: Phaser.GameObjects.Text;
  private invTabBtn!: Phaser.GameObjects.Graphics;
  private spellsTabBtn!: Phaser.GameObjects.Graphics;
  private invTabLabel!: Phaser.GameObjects.Text;
  private spellsTabLabel!: Phaser.GameObjects.Text;
  private spellPanelBg!: Phaser.GameObjects.Graphics;
  private spellRows: Phaser.GameObjects.Text[] = [];
  private spellSelectionGfx!: Phaser.GameObjects.Graphics;
  private spellUpBtn!: Phaser.GameObjects.Graphics;
  private spellDownBtn!: Phaser.GameObjects.Graphics;
  private spellInfoBtn!: Phaser.GameObjects.Graphics;
  private spellCastBtn!: Phaser.GameObjects.Graphics;
  private spellRowZones: Phaser.GameObjects.Zone[] = [];
  private spellUpZone!: Phaser.GameObjects.Zone;
  private spellDownZone!: Phaser.GameObjects.Zone;
  private spellInfoZone!: Phaser.GameObjects.Zone;
  private spellCastZone!: Phaser.GameObjects.Zone;
  private spellUpLabel!: Phaser.GameObjects.Text;
  private spellDownLabel!: Phaser.GameObjects.Text;
  private spellInfoLabel!: Phaser.GameObjects.Text;
  private spellCastLabel!: Phaser.GameObjects.Text;
  private spells: SpellDefinition[] = [];
  private spellScrollOffset = 0;
  private selectedSpellIndex = 0;
  private spellInfoRequestHandler?: (spell: SpellInfoRequest) => void;
  private spellCastRequestHandler?: (spell: SpellInfoRequest) => void;
  private chatSubmitHandler?: (message: string) => boolean | void;

  private inventorySlotDoubleClickHandler?: (slotIndex: number) => void;
  private lastInventoryClickSlot = -1;
  private lastInventoryClickTime = 0;
  private readonly inventoryDoubleClickMs = 350;
  private selectedInventorySlot = -1;

  private confirmVisible = false;
  private confirmAcceptHandler: ((amount: number) => void) | null = null;
  private confirmCancelHandler: (() => void) | null = null;
  private confirmMode: "simple" | "dropCount" = "simple";
  private confirmAmount = 1;
  private confirmMaxAmount = 1;
  private confirmInputActive = false;
  private confirmOverlay!: Phaser.GameObjects.Container;
  private confirmDim!: Phaser.GameObjects.Graphics;
  private confirmPanel!: Phaser.GameObjects.Graphics;
  private confirmTitle!: Phaser.GameObjects.Text;
  private confirmMessage!: Phaser.GameObjects.Text;
  private confirmHint!: Phaser.GameObjects.Text;
  private confirmAmountCaption!: Phaser.GameObjects.Text;
  private confirmInputBox!: Phaser.GameObjects.Graphics;
  private confirmInputZone!: Phaser.GameObjects.Zone;
  private confirmAmountLabel!: Phaser.GameObjects.Text;
  private confirmMinusBtn!: Phaser.GameObjects.Graphics;
  private confirmPlusBtn!: Phaser.GameObjects.Graphics;
  private confirmMinusZone!: Phaser.GameObjects.Zone;
  private confirmPlusZone!: Phaser.GameObjects.Zone;
  private confirmMinusText!: Phaser.GameObjects.Text;
  private confirmPlusText!: Phaser.GameObjects.Text;
  private confirmYesBtn!: Phaser.GameObjects.Graphics;
  private confirmNoBtn!: Phaser.GameObjects.Graphics;
  private confirmYesZone!: Phaser.GameObjects.Zone;
  private confirmNoZone!: Phaser.GameObjects.Zone;
  private confirmYesLabel!: Phaser.GameObjects.Text;
  private confirmNoLabel!: Phaser.GameObjects.Text;

  private expBarGeom: BarGeom = { x: 0, y: 0, w: 0, h: 8 };
  private hpBarGeom: BarGeom = { x: 0, y: 0, w: 0, h: 10 };
  private mpBarGeom: BarGeom = { x: 0, y: 0, w: 0, h: 10 };
  private minimapGeom = { x: 0, y: 0, size: 0 };

  getContainer(): Phaser.GameObjects.Container {
    return this.root;
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(UI_DEPTH).setScrollFactor(0);
    this.build();
    this.relayout();

    scene.scale.on("resize", this.relayout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off("resize", this.relayout, this);
    });
  }

  setStats(stats: Partial<PlayerHudStats>) {
    this.stats = { ...this.stats, ...stats };
    this.refreshStats();
  }

  addChatLine(line: string) {
    this.chatHistory.push({ text: line, channel: "chat" });
    this.chatHistory = this.chatHistory.slice(-50);
    this.renderChatHistory();
  }

  addCombatLine(line: string) {
    this.chatHistory.push({ text: line, channel: "combat" });
    this.chatHistory = this.chatHistory.slice(-50);
    this.renderChatHistory();
  }

  addGlobalLine(line: string) {
    this.chatHistory.push({ text: line, channel: "global" });
    this.chatHistory = this.chatHistory.slice(-50);
    this.renderChatHistory();
  }

  setMapName(name: string) {
    this.mapNameText.setText(name);
  }

  setSpells(spells: SpellDefinition[]) {
    this.spells = [...spells];
    this.spellScrollOffset = 0;
    this.selectedSpellIndex = this.spells.length > 0 ? 0 : -1;
    this.relayout();
  }

  setSpellInfoRequestHandler(handler: (spell: SpellInfoRequest) => void) {
    this.spellInfoRequestHandler = handler;
  }

  setSpellCastRequestHandler(handler: (spell: SpellInfoRequest) => void) {
    this.spellCastRequestHandler = handler;
  }

  getSelectedSpellForMacro(): SpellInfoRequest | null {
    const spell = this.getSelectedSpell();
    if (!spell) return null;
    return this.toSpellInfoRequest(spell);
  }

  setChatSubmitHandler(handler: (message: string) => boolean | void) {
    this.chatSubmitHandler = handler;
  }

  private renderChatHistory() {
    const lineHeight = 16;
    const maxLines = Math.max(1, Math.floor(this.chatTextArea.h / lineHeight));
    const visibleLines = this.chatHistory
      .filter((entry) => entry.channel === this.activeChatTab)
      .slice(-maxLines)
      .map((entry) => entry.text);
    this.chatText.setText(visibleLines.join("\n"));
  }

  updateMinimap(
    map: GameMap,
    playerTileX: number,
    playerTileY: number,
    bounds?: { minTileX: number; minTileY: number; maxTileX: number; maxTileY: number }
  ) {
    const g = this.minimapGfx;
    const { x, y, size } = this.minimapGeom;
    if (size <= 0) {
      return;
    }

    g.clear();

    const minTileX = bounds?.minTileX ?? 0;
    const minTileY = bounds?.minTileY ?? 0;
    const maxTileX = bounds?.maxTileX ?? map.width - 1;
    const maxTileY = bounds?.maxTileY ?? map.height - 1;
    const renderW = Math.max(1, maxTileX - minTileX + 1);
    const renderH = Math.max(1, maxTileY - minTileY + 1);

    const cell = Math.max(1, Math.floor(size / Math.max(renderW, renderH)));
    const offsetX = x + Math.floor((size - renderW * cell) / 2);
    const offsetY = y + Math.floor((size - renderH * cell) / 2);

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const tileId = map.tiles[ty][tx];
        const def = getTileDefinition(tileId);
        let color = def.color;

        if (tileId === TILE.WATER) {
          color = 0x1f5b9c;
        } else if (tileId === TILE.WALL) {
          color = 0x252f12;
        } else if (tileId === TILE.TREE) {
          color = 0x1f6f2e;
        } else if (def.isPortal) {
          color = 0xfff3a0;
        }

        g.fillStyle(color, 1);
        g.fillRect(offsetX + (tx - minTileX) * cell, offsetY + (ty - minTileY) * cell, cell, cell);
      }
    }

    const clampedPlayerX = Phaser.Math.Clamp(playerTileX, minTileX, maxTileX);
    const clampedPlayerY = Phaser.Math.Clamp(playerTileY, minTileY, maxTileY);
    const px = offsetX + (clampedPlayerX - minTileX) * cell + Math.floor(cell / 2);
    const py = offsetY + (clampedPlayerY - minTileY) * cell + Math.floor(cell / 2);
    g.fillStyle(0xffffff, 1);
    g.fillRect(px - 1, py - 1, 3, 3);
    g.fillStyle(0xe74c3c, 1);
    g.fillRect(px, py, 1, 1);
  }

  private build() {
    this.chatPanel = this.scene.add.graphics().setScrollFactor(0);
this.sidebarPanel = this.scene.add.graphics().setScrollFactor(0);
this.macroPanel = this.scene.add.graphics().setScrollFactor(0);

this.chatInputBg = this.scene.add.graphics().setScrollFactor(0);
this.chatMaskGfx = this.scene.add.graphics().setScrollFactor(0);
this.chatMaskGfx.setVisible(false);
this.macroStripFill = this.scene.add
  .tileSprite(0, 0, 1, 1, "inventory_panel_base")
  .setOrigin(0, 0)
  .setScrollFactor(0);

this.mapNameText = this.makeText("", 11, "#ffe566", true);
this.chatText = this.makeText("", 12, "#b8c4d9");
this.chatInputText = this.makeText("", 12, "#ffffff");

this.chatText.setMask(this.chatMaskGfx.createGeometryMask());

    (
      [
        { id: "chat", label: "Chat" },
        { id: "combat", label: "Combate" },
        { id: "global", label: "Global" },
      ] as const
    ).forEach((tab) => {
      const bg = this.scene.add.graphics().setScrollFactor(0).setInteractive(
        new Phaser.Geom.Rectangle(0, 0, 1, 1),
        Phaser.Geom.Rectangle.Contains
      );
      const label = this.makeText(tab.label, 10, "#9aa3b2");
      bg.on("pointerdown", () => {
        this.activeChatTab = tab.id;
        this.relayout();
      });
      this.chatTabs.push({ id: tab.id, bg, label });
    });

    this.levelText = this.makeText("1", 14, "#ffffff", true);
    this.nameText = this.makeText(DEFAULT_STATS.name, 15, "#ffffff", true);
    this.expLabel = this.makeText("0% (0/100)", 10, "#9b9b9b");
    this.expFill = this.scene.add.graphics().setScrollFactor(0);
    this.invLabel = this.makeText("Inventario", 11, "#9b9b9b");
    this.invTabBtn = this.scene.add.graphics().setScrollFactor(0);
    this.spellsTabBtn = this.scene.add.graphics().setScrollFactor(0);
    this.invTabLabel = this.makeText("Inventario", 10, "#ffffff", true);
    this.spellsTabLabel = this.makeText("Hechizos", 10, "#9aa3b2", true);
    this.spellPanelBg = this.scene.add.graphics().setScrollFactor(0);
    this.spellSelectionGfx = this.scene.add.graphics().setScrollFactor(0);
    for (let i = 0; i < 12; i++) {
      this.spellRows.push(this.makeText("", 10, "#ffffff"));
      const rowZone = this.scene
        .add.zone(0, 0, 1, 1)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      rowZone.on("pointerdown", () => this.selectSpellAtVisibleRow(i));
      this.spellRowZones.push(rowZone);
    }
    this.spellUpBtn = this.scene.add.graphics().setScrollFactor(0);
    this.spellDownBtn = this.scene.add.graphics().setScrollFactor(0);
    this.spellInfoBtn = this.scene.add.graphics().setScrollFactor(0);
    this.spellCastBtn = this.scene.add.graphics().setScrollFactor(0);
    this.spellUpZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.spellDownZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.spellInfoZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.spellCastZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.spellUpLabel = this.makeText("^", 11, "#ffffff", true).setOrigin(0.5, 0.5);
    this.spellDownLabel = this.makeText("v", 11, "#ffffff", true).setOrigin(0.5, 0.5);
    this.spellInfoLabel = this.makeText("📖", 11, "#ffffff").setOrigin(0.5, 0.5);
    this.spellCastLabel = this.makeText("Lanzar", 10, "#ffffff", true).setOrigin(0.5, 0.5);
    this.goldText = this.makeText("Oro: 0", 12, "#f1c40f");
    this.hpLabel = this.makeText("HP 100/100", 11, "#ffffff");
    this.mpLabel = this.makeText("MP 50/50", 11, "#ffffff");
    this.hpFill = this.scene.add.graphics().setScrollFactor(0);
    this.mpFill = this.scene.add.graphics().setScrollFactor(0);
    this.minimapGfx = this.scene.add.graphics().setScrollFactor(0);

    this.inventoryPanel = createInventoryPanel(this.scene, 0, 0, {
      cols: INVENTORY_COLS,
      rows: INVENTORY_ROWS,
      slotScale: INVENTORY_SLOT_SCALE,
      gap: INVENTORY_GAP,
      padding: INVENTORY_PADDING,
    });
    this.inventorySelectionGfx = this.scene.add.graphics().setScrollFactor(0);
    this.inventoryPanel.container.add(this.inventorySelectionGfx);
    
    this.setupInventorySlotInput();
    this.invTabBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 1, 1), Phaser.Geom.Rectangle.Contains);
    this.spellsTabBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 1, 1), Phaser.Geom.Rectangle.Contains);
    this.invTabBtn.on("pointerdown", () => {
      this.activeSidebarTab = "inventory";
      this.relayout();
    });
    this.spellsTabBtn.on("pointerdown", () => {
      this.activeSidebarTab = "spells";
      this.relayout();
    });
    this.spellUpZone.on("pointerdown", () => this.reorderSelectedSpell(-1));
    this.spellDownZone.on("pointerdown", () => this.reorderSelectedSpell(1));
    this.spellInfoZone.on("pointerdown", () => this.requestSelectedSpellInfo());
    this.spellCastZone.on("pointerdown", () => this.requestSelectedSpellCast());

    this.ensureMacroMarkTexture();
    for (let i = 0; i < MACRO_COUNT; i++) {
      const itemIcon = this.scene
        .add.image(0, 0, MACRO_MARK_TEXTURE_KEY)
        .setScrollFactor(0)
        .setOrigin(0, 0)
        .setVisible(false);
      itemIcon.setData("hasItem", false);
      const keyLabel = this.makeText("", 10, "#dbe8ff", true).setOrigin(0.5, 0.5);
      this.macroSlots.push({
        icon: this.scene.add.image(0, 0, MACRO_MARK_TEXTURE_KEY).setScrollFactor(0).setOrigin(0, 0),
        itemIcon,
        keyLabel,
      });
    }

    this.root.add([
      this.chatPanel,
      this.sidebarPanel,
      this.macroPanel,
      this.macroStripFill,
    
      this.mapNameText,
      this.chatText,
    
      // El input va DESPUÉS del historial para tapar cualquier texto que se escape
      this.chatInputBg,
      this.chatInputText,
    
      ...this.chatTabs.flatMap((tab) => [tab.bg, tab.label]),
    
      this.levelText,
      this.nameText,
      this.expLabel,
      this.expFill,
      this.invLabel,
      this.invTabBtn,
      this.spellsTabBtn,
      this.invTabLabel,
      this.spellsTabLabel,
      this.inventoryPanel.container,
      this.spellPanelBg,
      this.spellSelectionGfx,
      ...this.spellRows,
      ...this.spellRowZones,
      this.spellUpBtn,
      this.spellDownBtn,
      this.spellInfoBtn,
      this.spellCastBtn,
      this.spellUpZone,
      this.spellDownZone,
      this.spellInfoZone,
      this.spellCastZone,
      this.spellUpLabel,
      this.spellDownLabel,
      this.spellInfoLabel,
      this.spellCastLabel,
      this.goldText,
      this.hpLabel,
      this.mpLabel,
      this.hpFill,
      this.mpFill,
      this.minimapGfx,
      ...this.macroSlots.flatMap((s) => [s.icon, s.itemIcon, s.keyLabel]),
    ]);
    this.setupMacroSlotInput();
    this.setupChatInput();
    this.buildConfirmDialog();
    this.buildMacroEditorDialog();

    this.addChatLine("Bienvenido a AOWEB.");
    this.addChatLine("WASD para moverte.");
  }

  setInventorySlotDoubleClickHandler(handler: (slotIndex: number) => void) {
    this.inventorySlotDoubleClickHandler = handler;
  }

  setMacroSlotClickHandler(handler: (slotIndex: number) => void) {
    this.macroSlotClickHandler = handler;
  }

  setMacroKeyLabel(slotIndex: number, label: string) {
    const slot = this.macroSlots[slotIndex];
    if (!slot) return;
    slot.keyLabel.setText(label);
  }

  setMacroItemIcon(slotIndex: number, textureKey: string | null) {
    const slot = this.macroSlots[slotIndex];
    if (!slot) return;
    if (!textureKey) {
      slot.itemIcon.setData("hasItem", false);
      slot.itemIcon.setVisible(false);
      return;
    }
    slot.itemIcon.setTexture(textureKey);
    slot.itemIcon.setData("hasItem", true);
    slot.itemIcon.setVisible(true);
  }

  isMacroEditorOpen() {
    return this.macroEditorVisible;
  }

  showMacroEditor(config: MacroEditorConfig, onSave: (config: MacroEditorConfig) => void) {
    this.macroEditorConfig = {
      ...config,
      itemOptions: [...config.itemOptions],
      spellOptions: [...config.spellOptions],
    };
    this.macroEditorSaveHandler = onSave;
    this.macroEditorVisible = true;
    this.macroEditorCapturingKey = false;
    this.macroEditorOverlay.setVisible(true);
    this.relayout();
  }

  getSelectedInventorySlot() {
    return this.selectedInventorySlot;
  }

  private setSelectedInventorySlot(slotIndex: number) {
    this.selectedInventorySlot = slotIndex;
    this.redrawInventorySelection();
  }

  private redrawInventorySelection() {
    this.inventorySelectionGfx.clear();
    if (this.selectedInventorySlot < 0) return;

    const slot = this.inventoryPanel.slots[this.selectedInventorySlot];
    if (!slot) return;

    const x = slot.x;
    const y = slot.y;
    const w = slot.displayWidth;
    const h = slot.displayHeight;

    this.inventorySelectionGfx.lineStyle(2, 0xff3b30, 1);
    this.inventorySelectionGfx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }

  private setupMacroSlotInput() {
    this.macroSlots.forEach((slot, slotIndex) => {
      slot.icon.setInteractive({ useHandCursor: true });
      slot.icon.on("pointerdown", () => {
        this.macroSlotClickHandler?.(slotIndex);
      });
    });
  }

  private buildMacroEditorDialog() {
    this.macroEditorOverlay = this.scene.add.container(0, 0).setScrollFactor(0).setVisible(false);
    this.macroEditorDim = this.scene.add.graphics().setScrollFactor(0);
    this.macroEditorPanel = this.scene.add.graphics().setScrollFactor(0);
    this.macroEditorTitle = this.makeText("", 11, "#ffe08a", true).setOrigin(0.5, 0);
    this.macroEditorKeyValue = this.makeText("", 11, "#ffffff", true).setOrigin(0.5, 0.5);
    this.macroEditorActionValue = this.makeText("", 10, "#dbe8ff", true).setOrigin(0.5, 0.5);
    this.macroEditorItemValue = this.makeText("", 10, "#dbe8ff").setOrigin(0.5, 0.5);
    this.macroEditorHint = this.makeText("", 9, "#9aa3b2").setOrigin(0.5, 0);

    this.macroEditorCaptureBtn = this.scene.add.graphics().setScrollFactor(0);
    this.macroEditorActionPrevBtn = this.scene.add.graphics().setScrollFactor(0);
    this.macroEditorActionNextBtn = this.scene.add.graphics().setScrollFactor(0);
    this.macroEditorItemPrevBtn = this.scene.add.graphics().setScrollFactor(0);
    this.macroEditorItemNextBtn = this.scene.add.graphics().setScrollFactor(0);
    this.macroEditorSaveBtn = this.scene.add.graphics().setScrollFactor(0);
    this.macroEditorCancelBtn = this.scene.add.graphics().setScrollFactor(0);

    this.macroEditorCaptureZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.macroEditorActionPrevZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.macroEditorActionNextZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.macroEditorItemPrevZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.macroEditorItemNextZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.macroEditorSaveZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.macroEditorCancelZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });

    this.macroEditorCaptureLabel = this.makeText("Asignar tecla", 9, "#ffffff", true).setOrigin(0.5, 0.5);
    this.macroEditorActionPrevLabel = this.makeText("<", 12, "#ffffff", true).setOrigin(0.5, 0.5);
    this.macroEditorActionNextLabel = this.makeText(">", 12, "#ffffff", true).setOrigin(0.5, 0.5);
    this.macroEditorItemPrevLabel = this.makeText("<", 12, "#ffffff", true).setOrigin(0.5, 0.5);
    this.macroEditorItemNextLabel = this.makeText(">", 12, "#ffffff", true).setOrigin(0.5, 0.5);
    this.macroEditorSaveLabel = this.makeText("Guardar", 10, "#ffffff", true).setOrigin(0.5, 0.5);
    this.macroEditorCancelLabel = this.makeText("Cancelar", 10, "#ffffff", true).setOrigin(0.5, 0.5);

    this.macroEditorCaptureZone.on("pointerdown", () => {
      this.macroEditorCapturingKey = true;
      this.layoutMacroEditorDialog();
    });
    this.macroEditorActionPrevZone.on("pointerdown", () => this.cycleMacroAction(-1));
    this.macroEditorActionNextZone.on("pointerdown", () => this.cycleMacroAction(1));
    this.macroEditorItemPrevZone.on("pointerdown", () => this.cycleMacroItem(-1));
    this.macroEditorItemNextZone.on("pointerdown", () => this.cycleMacroItem(1));
    this.macroEditorSaveZone.on("pointerdown", () => this.saveMacroEditor());
    this.macroEditorCancelZone.on("pointerdown", () => this.closeMacroEditor());

    this.macroEditorOverlay.add([
      this.macroEditorDim,
      this.macroEditorPanel,
      this.macroEditorTitle,
      this.macroEditorKeyValue,
      this.macroEditorActionValue,
      this.macroEditorItemValue,
      this.macroEditorHint,
      this.macroEditorCaptureBtn,
      this.macroEditorActionPrevBtn,
      this.macroEditorActionNextBtn,
      this.macroEditorItemPrevBtn,
      this.macroEditorItemNextBtn,
      this.macroEditorSaveBtn,
      this.macroEditorCancelBtn,
      this.macroEditorCaptureZone,
      this.macroEditorActionPrevZone,
      this.macroEditorActionNextZone,
      this.macroEditorItemPrevZone,
      this.macroEditorItemNextZone,
      this.macroEditorSaveZone,
      this.macroEditorCancelZone,
      this.macroEditorCaptureLabel,
      this.macroEditorActionPrevLabel,
      this.macroEditorActionNextLabel,
      this.macroEditorItemPrevLabel,
      this.macroEditorItemNextLabel,
      this.macroEditorSaveLabel,
      this.macroEditorCancelLabel,
    ]);
    this.root.add(this.macroEditorOverlay);
  }

  private setupChatInput() {
    this.scene.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (this.macroEditorVisible) {
        event.preventDefault();
        if (this.macroEditorCapturingKey) {
          if (event.key === "Escape") {
            this.macroEditorCapturingKey = false;
          } else if (event.code) {
            this.macroEditorConfig.keyCode = event.code;
            this.macroEditorCapturingKey = false;
          }
          this.layoutMacroEditorDialog();
          return;
        }

        if (event.key === "Escape") {
          this.closeMacroEditor();
          return;
        }
        if (event.key === "Enter") {
          this.saveMacroEditor();
          return;
        }
        if (event.key === "ArrowLeft") {
          this.cycleMacroItem(-1);
          return;
        }
        if (event.key === "ArrowRight") {
          this.cycleMacroItem(1);
          return;
        }
      }

      if (this.confirmVisible) {
        event.preventDefault();

        const key = event.key.toLowerCase();
        if (this.confirmMode === "dropCount") {
          if (key >= "0" && key <= "9") {
            this.writeConfirmAmountDigit(key);
            return;
          }
          if (event.key === "Backspace" || event.key === "Delete") {
            this.backspaceConfirmAmount();
            return;
          }
          if (event.key === "ArrowLeft" || event.key === "ArrowDown" || key === "-") {
            this.adjustConfirmAmount(-1);
            return;
          }
          if (event.key === "ArrowRight" || event.key === "ArrowUp" || key === "+") {
            this.adjustConfirmAmount(1);
            return;
          }
        }

        if (event.key === "Enter" || key === "y") {
          this.acceptConfirm();
        } else if (event.key === "Escape" || key === "n") {
          this.cancelConfirm();
        }
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
  
        if (!this.chatFocused) {
          this.chatFocused = true;
          this.chatInputValue = "";
          this.relayout();
          return;
        }
  
        const message = this.chatInputValue.trim();
  
        if (message.length > 0) {
          const handled = Boolean(this.chatSubmitHandler?.(message));
          if (!handled) {
            this.addChatLine(`Tú: ${message}`);
          }
        }
  
        this.chatInputValue = "";
        this.chatFocused = false;
        this.relayout();
        return;
      }
  
      if (!this.chatFocused) {
        return;
      }
  
      event.preventDefault();
  
      if (event.key === "Escape") {
        this.chatInputValue = "";
        this.chatFocused = false;
        this.relayout();
        return;
      }
  
      if (event.key === "Backspace") {
        this.chatInputValue = this.chatInputValue.slice(0, -1);
        this.relayout();
        return;
      }
  
      if (event.key.length === 1 && this.chatInputValue.length < 80) {
        this.chatInputValue += event.key;
        this.relayout();
      }
    });
  }
  
  isChatFocused() {
    return this.chatFocused;
  }

  isConfirmOpen() {
    return this.confirmVisible;
  }

  showConfirm(message: string, onConfirm: () => void, onCancel?: () => void) {
    this.confirmMode = "simple";
    this.confirmAmount = 0;
    this.confirmMaxAmount = 1;
    this.confirmInputActive = false;
    this.confirmAcceptHandler = () => onConfirm();
    this.confirmCancelHandler = onCancel ?? null;
    this.confirmTitle.setText("Confirmacion");
    this.confirmMessage.setText(message);
    this.confirmHint.setText("Enter: Si | Esc: No");
    this.confirmVisible = true;
    this.confirmOverlay.setVisible(true);
    this.relayout();
  }

  showDropConfirm(
    itemName: string,
    maxAmount: number,
    onConfirm: (amount: number) => void,
    onCancel?: () => void
  ) {
    this.confirmMode = "dropCount";
    this.confirmMaxAmount = Math.max(1, Math.floor(maxAmount));
    this.confirmAmount = 0;
    this.confirmInputActive = true;
    this.confirmAcceptHandler = onConfirm;
    this.confirmCancelHandler = onCancel ?? null;
    this.confirmTitle.setText("Tirar objetos");
    this.confirmMessage.setText(itemName);
    this.confirmHint.setText("Escribi cantidad o usa +/-");
    this.confirmVisible = true;
    this.confirmOverlay.setVisible(true);
    this.relayout();
  }

  private acceptConfirm() {
    if (!this.confirmVisible) {
      return;
    }

    if (this.confirmMode === "dropCount" && this.confirmAmount <= 0) {
      this.confirmHint.setText("Elegi una cantidad mayor a 0");
      this.confirmHint.setColor("#f58f8f");
      this.layoutConfirmDialog();
      return;
    }

    const handler = this.confirmAcceptHandler;
    const amount = this.confirmAmount;
    this.hideConfirm();
    handler?.(amount);
  }

  private cancelConfirm() {
    if (!this.confirmVisible) {
      return;
    }

    const handler = this.confirmCancelHandler;
    this.hideConfirm();
    handler?.();
  }

  private hideConfirm() {
    this.confirmVisible = false;
    this.confirmOverlay.setVisible(false);
    this.confirmAcceptHandler = null;
    this.confirmCancelHandler = null;
    this.confirmMode = "simple";
    this.confirmAmount = 0;
    this.confirmMaxAmount = 1;
    this.confirmInputActive = false;
  }

  private buildConfirmDialog() {
    this.confirmOverlay = this.scene.add.container(0, 0).setScrollFactor(0).setVisible(false);
    this.confirmDim = this.scene.add.graphics().setScrollFactor(0);
    this.confirmPanel = this.scene.add.graphics().setScrollFactor(0);
    this.confirmTitle = this.makeText("", 10, "#ffe08a", true).setOrigin(0.5, 0);
    this.confirmMessage = this.makeText("", 11, "#ffffff");
    this.confirmMessage.setOrigin(0.5, 0);
    this.confirmHint = this.makeText("Enter: Si | Esc: No", 9, "#9b9b9b");
    this.confirmHint.setOrigin(0.5, 0);
    this.confirmAmountCaption = this.makeText("Cantidad", 10, "#c7d4ea", true).setOrigin(0.5, 0.5);
    this.confirmInputBox = this.scene.add.graphics().setScrollFactor(0);
    this.confirmInputZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0);
    this.confirmAmountLabel = this.makeText("", 12, "#e8f2ff", true).setOrigin(0.5, 0.5);
    this.confirmMinusBtn = this.scene.add.graphics().setScrollFactor(0);
    this.confirmPlusBtn = this.scene.add.graphics().setScrollFactor(0);
    this.confirmMinusZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0);
    this.confirmPlusZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0);
    this.confirmMinusText = this.makeText("-", 12, "#ffffff", true).setOrigin(0.5, 0.5);
    this.confirmPlusText = this.makeText("+", 12, "#ffffff", true).setOrigin(0.5, 0.5);
    this.confirmYesBtn = this.scene.add.graphics().setScrollFactor(0);
    this.confirmNoBtn = this.scene.add.graphics().setScrollFactor(0);
    this.confirmYesZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0);
    this.confirmNoZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0);
    this.confirmYesLabel = this.makeText("Si", 10, "#ffffff", true).setOrigin(0.5, 0.5);
    this.confirmNoLabel = this.makeText("No", 10, "#ffffff", true).setOrigin(0.5, 0.5);

    this.confirmYesZone.setInteractive({ useHandCursor: true });
    this.confirmNoZone.setInteractive({ useHandCursor: true });
    this.confirmMinusZone.setInteractive({ useHandCursor: true });
    this.confirmPlusZone.setInteractive({ useHandCursor: true });
    this.confirmInputZone.setInteractive({ useHandCursor: true });
    this.confirmYesZone.on("pointerdown", () => this.acceptConfirm());
    this.confirmNoZone.on("pointerdown", () => this.cancelConfirm());
    this.confirmMinusZone.on("pointerdown", () => this.adjustConfirmAmount(-1));
    this.confirmPlusZone.on("pointerdown", () => this.adjustConfirmAmount(1));
    this.confirmInputZone.on("pointerdown", () => {
      this.confirmInputActive = true;
      this.layoutConfirmDialog();
    });

    this.confirmOverlay.add([
      this.confirmDim,
      this.confirmPanel,
      this.confirmTitle,
      this.confirmMessage,
      this.confirmHint,
      this.confirmAmountCaption,
      this.confirmInputBox,
      this.confirmInputZone,
      this.confirmAmountLabel,
      this.confirmMinusBtn,
      this.confirmPlusBtn,
      this.confirmMinusZone,
      this.confirmPlusZone,
      this.confirmMinusText,
      this.confirmPlusText,
      this.confirmYesBtn,
      this.confirmNoBtn,
      this.confirmYesZone,
      this.confirmNoZone,
      this.confirmYesLabel,
      this.confirmNoLabel,
    ]);
    this.root.add(this.confirmOverlay);
  }

  private layoutConfirmDialog() {
    if (!this.confirmOverlay) {
      return;
    }

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const panelW = Math.min(260, w - 24);
    const panelH = this.confirmMode === "dropCount" ? 128 : 78;
    const panelX = Math.floor((w - panelW) / 2);
    const panelY = Math.floor((h - panelH) / 2);
    const btnW = 58;
    const btnH = 20;
    const btnY = panelY + panelH - 30;
    const yesX = Math.floor(w / 2 - btnW - 6);
    const noX = Math.floor(w / 2 + 6);
    const amountY = panelY + 62;
    const adjustW = 24;
    const adjustH = 20;
    const inputW = 62;
    const inputH = 22;
    const inputX = Math.floor(w / 2 - inputW / 2);
    const minusX = inputX - adjustW - 8;
    const plusX = inputX + inputW + 8;
    const showAmountControls = this.confirmMode === "dropCount";

    this.confirmDim.clear();
    this.confirmDim.fillStyle(0x000000, 0.55);
    this.confirmDim.fillRect(0, 0, w, h);

    this.drawConfirmPanel(this.confirmPanel, panelX, panelY, panelW, panelH);
    this.confirmTitle.setPosition(Math.floor(w / 2), panelY + 4);
    this.confirmMessage.setPosition(Math.floor(w / 2), panelY + 20);
    this.confirmMessage.setWordWrapWidth(panelW - 24);
    this.confirmHint.setPosition(Math.floor(w / 2), showAmountControls ? panelY + 92 : panelY + 44);
    this.confirmHint.setColor("#9b9b9b");

    this.confirmAmountCaption.setVisible(showAmountControls);
    this.confirmInputBox.setVisible(showAmountControls);
    this.confirmInputZone.setVisible(showAmountControls);
    this.confirmAmountLabel.setVisible(showAmountControls);
    this.confirmMinusBtn.setVisible(showAmountControls);
    this.confirmPlusBtn.setVisible(showAmountControls);
    this.confirmMinusZone.setVisible(showAmountControls);
    this.confirmPlusZone.setVisible(showAmountControls);
    this.confirmMinusText.setVisible(showAmountControls);
    this.confirmPlusText.setVisible(showAmountControls);

    if (showAmountControls) {
      this.confirmAmountCaption.setPosition(Math.floor(w / 2), amountY - 14);
      this.drawConfirmButton(this.confirmMinusBtn, minusX, amountY, adjustW, adjustH);
      this.drawConfirmButton(this.confirmPlusBtn, plusX, amountY, adjustW, adjustH);
      this.confirmMinusZone.setPosition(minusX, amountY).setSize(adjustW, adjustH);
      this.confirmPlusZone.setPosition(plusX, amountY).setSize(adjustW, adjustH);
      this.confirmMinusText.setPosition(minusX + adjustW / 2, amountY + adjustH / 2);
      this.confirmPlusText.setPosition(plusX + adjustW / 2, amountY + adjustH / 2);
      this.drawConfirmInputBox(this.confirmInputBox, inputX, amountY - 1, inputW, inputH);
      this.confirmInputZone.setPosition(inputX, amountY - 1).setSize(inputW, inputH);
      this.confirmAmountLabel.setText(String(this.confirmAmount));
      this.confirmAmountLabel.setPosition(Math.floor(w / 2), amountY + adjustH / 2);
    }

    this.drawConfirmButton(this.confirmYesBtn, yesX, btnY, btnW, btnH);
    this.drawConfirmButton(this.confirmNoBtn, noX, btnY, btnW, btnH);
    this.confirmYesZone.setPosition(yesX, btnY).setSize(btnW, btnH);
    this.confirmNoZone.setPosition(noX, btnY).setSize(btnW, btnH);
    this.confirmYesLabel.setPosition(yesX + btnW / 2, btnY + btnH / 2);
    this.confirmNoLabel.setPosition(noX + btnW / 2, btnY + btnH / 2);
  }

  private adjustConfirmAmount(delta: number) {
    if (this.confirmMode !== "dropCount") {
      return;
    }
    this.confirmAmount = Phaser.Math.Clamp(this.confirmAmount + delta, 0, this.confirmMaxAmount);
    this.confirmHint.setText("Escribi cantidad o usa +/-");
    this.layoutConfirmDialog();
  }

  private cycleMacroAction(delta: number) {
    const currentIndex = MACRO_ACTIONS.indexOf(this.macroEditorConfig.action);
    const nextIndex =
      (currentIndex + delta + MACRO_ACTIONS.length) % MACRO_ACTIONS.length;
    this.macroEditorConfig.action = MACRO_ACTIONS[nextIndex];
    if (this.macroEditorConfig.action === "cast_spell") {
      if (
        this.macroEditorConfig.selectedSpellId === null &&
        this.macroEditorConfig.spellOptions.length > 0
      ) {
        this.macroEditorConfig.selectedSpellId = this.macroEditorConfig.spellOptions[0].spellId;
      }
    } else if (
      this.macroEditorConfig.selectedItemId === null &&
      this.macroEditorConfig.itemOptions.length > 0
    ) {
      this.macroEditorConfig.selectedItemId = this.macroEditorConfig.itemOptions[0].itemId;
    }
    this.layoutMacroEditorDialog();
  }

  private cycleMacroItem(delta: number) {
    if (this.macroEditorConfig.action === "cast_spell") {
      const spellOptions = this.macroEditorConfig.spellOptions;
      if (spellOptions.length === 0) {
        this.macroEditorConfig.selectedSpellId = null;
        this.layoutMacroEditorDialog();
        return;
      }
      const currentSpellIndex = spellOptions.findIndex(
        (option) => option.spellId === this.macroEditorConfig.selectedSpellId
      );
      const baseSpellIndex = currentSpellIndex >= 0 ? currentSpellIndex : 0;
      const nextSpellIndex = (baseSpellIndex + delta + spellOptions.length) % spellOptions.length;
      this.macroEditorConfig.selectedSpellId = spellOptions[nextSpellIndex].spellId;
      this.layoutMacroEditorDialog();
      return;
    }

    const options = this.macroEditorConfig.itemOptions;
    if (options.length === 0) {
      this.macroEditorConfig.selectedItemId = null;
      this.layoutMacroEditorDialog();
      return;
    }

    const currentIndex = options.findIndex(
      (option) => option.itemId === this.macroEditorConfig.selectedItemId
    );
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (baseIndex + delta + options.length) % options.length;
    this.macroEditorConfig.selectedItemId = options[nextIndex].itemId;
    this.layoutMacroEditorDialog();
  }

  private saveMacroEditor() {
    this.macroEditorSaveHandler?.({ ...this.macroEditorConfig });
    this.closeMacroEditor();
  }

  private closeMacroEditor() {
    this.macroEditorVisible = false;
    this.macroEditorCapturingKey = false;
    this.macroEditorOverlay.setVisible(false);
    this.macroEditorSaveHandler = null;
  }

  private selectSpellAtVisibleRow(rowIndex: number) {
    if (this.spells.length === 0) return;
    const spellIndex = this.spellScrollOffset + rowIndex;
    if (spellIndex < 0 || spellIndex >= this.spells.length) return;
    this.selectedSpellIndex = spellIndex;
    this.relayout();
  }

  private reorderSelectedSpell(delta: number) {
    if (this.spells.length <= 1 || this.selectedSpellIndex < 0) return;
    const next = Phaser.Math.Clamp(this.selectedSpellIndex + delta, 0, this.spells.length - 1);
    if (next === this.selectedSpellIndex) return;
    const [movedSpell] = this.spells.splice(this.selectedSpellIndex, 1);
    this.spells.splice(next, 0, movedSpell);
    this.selectedSpellIndex = next;
    const visibleRows = this.spellRows.length;
    if (this.selectedSpellIndex < this.spellScrollOffset) {
      this.spellScrollOffset = this.selectedSpellIndex;
    } else if (this.selectedSpellIndex >= this.spellScrollOffset + visibleRows) {
      this.spellScrollOffset = this.selectedSpellIndex - visibleRows + 1;
    }
    this.relayout();
  }

  private getSelectedSpell(): SpellDefinition | null {
    if (this.selectedSpellIndex < 0 || this.selectedSpellIndex >= this.spells.length) {
      return null;
    }
    return this.spells[this.selectedSpellIndex];
  }

  private requestSelectedSpellInfo() {
    const spell = this.getSelectedSpell();
    if (!spell) return;
    this.spellInfoRequestHandler?.(this.toSpellInfoRequest(spell));
  }

  private requestSelectedSpellCast() {
    const spell = this.getSelectedSpell();
    if (!spell) return;
    this.spellCastRequestHandler?.(this.toSpellInfoRequest(spell));
  }

  private toSpellInfoRequest(spell: SpellDefinition): SpellInfoRequest {
    return {
      idSpell: spell.idSpell,
      nombre: spell.nombre,
      descripcion: spell.descripcion,
      valor: spell.valor,
      usableBy: spell.usableBy,
      nivelMagiaRequerido: spell.nivelMagiaRequerido,
      manaCost: spell.manaCost,
      danioMin: spell.danioMin,
      danioMax: spell.danioMax,
      healMin: spell.healMin,
      healMax: spell.healMax,
      puedeUsarseEnAliados: spell.puedeUsarseEnAliados,
      remueveDebuff: spell.remueveDebuff,
    };
  }

  private formatMacroAction(action: MacroActionType) {
    if (action === "cast_spell") return "Lanzar hechizo";
    if (action === "use_item") return "Usar objeto";
    return "Equipar objeto";
  }

  private formatKeyCodeLabel(keyCode: string | null) {
    if (!keyCode) return "Sin tecla";
    if (keyCode.startsWith("Key")) return keyCode.slice(3);
    if (keyCode.startsWith("Digit")) return keyCode.slice(5);
    if (keyCode.startsWith("Numpad")) return `Num ${keyCode.slice(6)}`;
    return keyCode;
  }

  private layoutMacroEditorDialog() {
    if (!this.macroEditorOverlay) return;

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const panelW = Math.min(320, w - 36);
    const panelH = 176;
    const panelX = Math.floor((w - panelW) / 2);
    const panelY = Math.floor((h - panelH) / 2);
    const valueX = panelX + panelW / 2;
    const fieldW = 92;
    const fieldH = 20;
    const controlW = 22;
    const saveBtnW = 90;
    const btnY = panelY + panelH - 30;

    this.macroEditorDim.clear();
    this.macroEditorDim.fillStyle(0x000000, 0.58);
    this.macroEditorDim.fillRect(0, 0, w, h);
    this.drawConfirmPanel(this.macroEditorPanel, panelX, panelY, panelW, panelH);

    this.macroEditorTitle.setText(`Macro ${this.macroEditorConfig.slotIndex + 1}`);
    this.macroEditorTitle.setPosition(valueX, panelY + 6);

    const keyRowY = panelY + 38;
    const actionRowY = panelY + 72;
    const itemRowY = panelY + 106;

    this.macroEditorKeyValue.setText(`Tecla: ${this.formatKeyCodeLabel(this.macroEditorConfig.keyCode)}`);
    this.macroEditorKeyValue.setPosition(valueX, keyRowY + 10);

    this.macroEditorActionValue.setText(`Accion: ${this.formatMacroAction(this.macroEditorConfig.action)}`);
    this.macroEditorActionValue.setPosition(valueX, actionRowY + 10);

    if (this.macroEditorConfig.action === "cast_spell") {
      const selectedSpell = this.macroEditorConfig.spellOptions.find(
        (option) => option.spellId === this.macroEditorConfig.selectedSpellId
      );
      this.macroEditorItemValue.setText(`Hechizo: ${selectedSpell?.label ?? "Sin hechizo"}`);
    } else {
      const selectedItem = this.macroEditorConfig.itemOptions.find(
        (option) => option.itemId === this.macroEditorConfig.selectedItemId
      );
      this.macroEditorItemValue.setText(`Objeto: ${selectedItem?.label ?? "Sin item"}`);
    }
    this.macroEditorItemValue.setPosition(valueX, itemRowY + 10);

    this.macroEditorHint.setText(
      this.macroEditorCapturingKey ? "Presiona una tecla..." : "Enter guarda / Esc cancela"
    );
    this.macroEditorHint.setPosition(valueX, panelY + panelH - 48);

    this.drawConfirmButton(this.macroEditorCaptureBtn, panelX + panelW - 118, keyRowY, fieldW, fieldH);
    this.macroEditorCaptureZone.setPosition(panelX + panelW - 118, keyRowY).setSize(fieldW, fieldH);
    this.macroEditorCaptureLabel.setPosition(panelX + panelW - 118 + fieldW / 2, keyRowY + fieldH / 2);
    this.macroEditorCaptureLabel.setColor(this.macroEditorCapturingKey ? "#ffe08a" : "#ffffff");

    this.drawConfirmButton(this.macroEditorActionPrevBtn, panelX + panelW - 118, actionRowY, controlW, fieldH);
    this.drawConfirmButton(this.macroEditorActionNextBtn, panelX + panelW - 46, actionRowY, controlW, fieldH);
    this.macroEditorActionPrevZone.setPosition(panelX + panelW - 118, actionRowY).setSize(controlW, fieldH);
    this.macroEditorActionNextZone.setPosition(panelX + panelW - 46, actionRowY).setSize(controlW, fieldH);
    this.macroEditorActionPrevLabel.setPosition(panelX + panelW - 118 + controlW / 2, actionRowY + fieldH / 2);
    this.macroEditorActionNextLabel.setPosition(panelX + panelW - 46 + controlW / 2, actionRowY + fieldH / 2);

    this.drawConfirmButton(this.macroEditorItemPrevBtn, panelX + panelW - 118, itemRowY, controlW, fieldH);
    this.drawConfirmButton(this.macroEditorItemNextBtn, panelX + panelW - 46, itemRowY, controlW, fieldH);
    this.macroEditorItemPrevZone.setPosition(panelX + panelW - 118, itemRowY).setSize(controlW, fieldH);
    this.macroEditorItemNextZone.setPosition(panelX + panelW - 46, itemRowY).setSize(controlW, fieldH);
    this.macroEditorItemPrevLabel.setPosition(panelX + panelW - 118 + controlW / 2, itemRowY + fieldH / 2);
    this.macroEditorItemNextLabel.setPosition(panelX + panelW - 46 + controlW / 2, itemRowY + fieldH / 2);

    this.drawConfirmButton(this.macroEditorSaveBtn, valueX - saveBtnW - 8, btnY, saveBtnW, fieldH);
    this.drawConfirmButton(this.macroEditorCancelBtn, valueX + 8, btnY, saveBtnW, fieldH);
    this.macroEditorSaveZone.setPosition(valueX - saveBtnW - 8, btnY).setSize(saveBtnW, fieldH);
    this.macroEditorCancelZone.setPosition(valueX + 8, btnY).setSize(saveBtnW, fieldH);
    this.macroEditorSaveLabel.setPosition(valueX - saveBtnW - 8 + saveBtnW / 2, btnY + fieldH / 2);
    this.macroEditorCancelLabel.setPosition(valueX + 8 + saveBtnW / 2, btnY + fieldH / 2);

  }

  private writeConfirmAmountDigit(digit: string) {
    if (this.confirmMode !== "dropCount") {
      return;
    }
    const current = String(this.confirmAmount);
    const nextRaw = current === "0" ? digit : `${current}${digit}`;
    this.confirmAmount = Phaser.Math.Clamp(Number.parseInt(nextRaw, 10), 0, this.confirmMaxAmount);
    this.confirmHint.setText("Escribi cantidad o usa +/-");
    this.layoutConfirmDialog();
  }

  private backspaceConfirmAmount() {
    if (this.confirmMode !== "dropCount") {
      return;
    }
    const next = Math.floor(this.confirmAmount / 10);
    this.confirmAmount = Phaser.Math.Clamp(next, 0, this.confirmMaxAmount);
    this.confirmHint.setText("Escribi cantidad o usa +/-");
    this.layoutConfirmDialog();
  }

  private drawConfirmPanel(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    g.clear();
    g.fillStyle(0x0d121a, 0.97);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, 0x3f5572, 1);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    g.lineStyle(1, 0x10161f, 1);
    g.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
  }

  private drawConfirmInputBox(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    g.clear();
    g.fillStyle(0x070a10, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, this.confirmInputActive ? 0xffd37a : 0x45566d, 1);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  private drawConfirmButton(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    g.clear();
    g.fillStyle(COLORS.tabActiveBg, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, COLORS.panelBorder, 1);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  private setupInventorySlotInput() {
    this.inventoryPanel.slots.forEach((slot, slotIndex) => {
      slot.setInteractive({ useHandCursor: true });
  
      slot.on("pointerdown", () => {
        const now = this.scene.time.now;
        this.setSelectedInventorySlot(slotIndex);
  
        const isDoubleClick =
          this.lastInventoryClickSlot === slotIndex &&
          now - this.lastInventoryClickTime <= this.inventoryDoubleClickMs;
  
        this.lastInventoryClickSlot = slotIndex;
        this.lastInventoryClickTime = now;
  
        if (!isDoubleClick) {
          return;
        }
  
        this.lastInventoryClickSlot = -1;
        this.lastInventoryClickTime = 0;
  
        this.inventorySlotDoubleClickHandler?.(slotIndex);
      });
    });
  }

  setInventorySlot(slotIndex: number, textureKey: string, count = 1) {
    const slot = this.inventoryPanel.slots[slotIndex];
  
    if (!slot) return;
  
    if (this.inventoryIcons[slotIndex]) {
      this.inventoryIcons[slotIndex].setTexture(textureKey);
      this.positionInventoryIcon(slotIndex);
      this.inventoryIcons[slotIndex].setVisible(true);
    } else {
      const icon = this.scene.add.image(0, 0, textureKey);
      icon.setOrigin(0.5, 0.5);
      icon.setScale(INVENTORY_ICON_SCALE);
      icon.setScrollFactor(0);
  
      this.inventoryPanel.container.add(icon);
      this.inventoryIcons[slotIndex] = icon;
  
      this.positionInventoryIcon(slotIndex);
    }

    this.updateInventoryStackLabel(slotIndex, count);
  }
  
  clearInventorySlot(slotIndex: number) {
    const icon = this.inventoryIcons[slotIndex];
  
    if (icon) {
      icon.setVisible(false);
    }

    const label = this.inventoryStackLabels[slotIndex];
    if (label) {
      label.setVisible(false);
    }
  }

  private updateInventoryStackLabel(slotIndex: number, count: number) {
    if (count <= 1) {
      const existing = this.inventoryStackLabels[slotIndex];
      if (existing) {
        existing.setVisible(false);
      }
      return;
    }

    let label = this.inventoryStackLabels[slotIndex];
    if (!label) {
      label = this.scene.add
        .text(0, 0, "", {
          fontFamily: "Segoe UI, Tahoma, sans-serif",
          fontSize: "9px",
          color: "#f5f5f5",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setScrollFactor(0);
      label.setOrigin(1, 1);
      this.inventoryPanel.container.add(label);
      this.inventoryStackLabels[slotIndex] = label;
    }

    label.setText(String(count));
    label.setVisible(true);
    this.positionInventoryStackLabel(slotIndex);
  }

  private positionInventoryStackLabel(slotIndex: number) {
    const label = this.inventoryStackLabels[slotIndex];
    if (!label) return;

    const anchor = this.inventoryPanel.getSlotBottomRight(slotIndex);
    label.setPosition(anchor.x, anchor.y);
  }
  
  private positionInventoryIcon(slotIndex: number) {
    const icon = this.inventoryIcons[slotIndex];
  
    if (!icon) return;
  
    const center = this.inventoryPanel.getSlotCenter(slotIndex);
  
    icon.setPosition(center.x, center.y);
  }

  private makeText(
    content: string,
    size: number,
    color: string,
    bold = false
  ): Phaser.GameObjects.Text {
    return this.scene.add
      .text(0, 0, content, {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: `${size}px`,
        color,
        fontStyle: bold ? "bold" : "normal",
      })
      .setScrollFactor(0);
  }

  private relayout = () => {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const sidebarX = w - this.sidebarWidth;
    const bodyTop = 0;
    const bodyBottom = h - this.macroBarHeight;
    const pad = 10;
    const innerW = this.sidebarWidth - pad * 2;

    this.drawPanel(this.chatPanel, 0, 0, sidebarX, this.chatHeight);
    this.drawPanel(this.sidebarPanel, sidebarX, bodyTop, this.sidebarWidth, bodyBottom - bodyTop);
    if (this.macroBarHeight > 0) {
      this.drawPanel(this.macroPanel, 0, bodyBottom, w, this.macroBarHeight);
    } else {
      this.macroPanel.clear();
    }

    const chatPad = 12;
    const chatTopPad = 10;
    const chatInputH = 22;
    const tabH = 18;
    const tabW = 78;
    const tabGap = 8;
    const chatContentW = Math.max(220, sidebarX - chatPad * 2);
    const inputVisible = this.chatFocused;
    const inputY = this.chatHeight - chatInputH - 8;
    const tabsY = inputVisible ? inputY - tabH - 6 : this.chatHeight - tabH - 8;
    const chatHistoryY = chatTopPad;
    const historyH = Math.max(80, tabsY - chatHistoryY - 6);

    this.chatTextArea = {
      x: chatPad,
      y: chatHistoryY,
      w: chatContentW,
      h: historyH,
    };

    this.chatText.setPosition(chatPad, chatHistoryY);
    this.chatText.setWordWrapWidth(chatContentW);
    this.chatText.setFixedSize(chatContentW, historyH);

    this.chatMaskGfx.clear();
    this.chatMaskGfx.fillStyle(0xffffff, 1);
    this.chatMaskGfx.fillRect(chatPad, chatHistoryY, chatContentW, historyH);

    this.chatTabs.forEach((tab, i) => {
      const tabX = chatPad + i * (tabW + tabGap);
      tab.bg.clear();
      tab.bg.fillStyle(tab.id === this.activeChatTab ? COLORS.tabActiveBg : COLORS.tabInactiveBg, 1);
      tab.bg.fillRect(tabX, tabsY, tabW, tabH);
      tab.bg.lineStyle(1, COLORS.panelBorder, 1);
      tab.bg.strokeRect(tabX + 0.5, tabsY + 0.5, tabW - 1, tabH - 1);
      tab.bg.input?.hitArea.setTo(tabX, tabsY, tabW, tabH);
      tab.label.setPosition(tabX + 8, tabsY + 2);
      tab.label.setColor(tab.id === this.activeChatTab ? "#ffffff" : "#9aa3b2");
    });

    this.chatInputBg.setVisible(inputVisible);
    this.chatInputText.setVisible(inputVisible);
    if (inputVisible) {
      this.drawChatInput(chatPad, inputY, chatContentW, chatInputH);
      this.chatInputText.setPosition(chatPad + 8, inputY + 3);
      this.chatInputText.setText(`> ${this.chatInputValue}`);
      this.chatInputText.setColor("#ffffff");
    } else {
      this.chatInputBg.clear();
      this.chatInputText.setText("");
    }
    this.renderChatHistory();
    this.inventoryIcons.forEach((icon, slotIndex) => {
      if (icon) {
        this.positionInventoryIcon(slotIndex);
      }
    });
    this.inventoryStackLabels.forEach((label, slotIndex) => {
      if (label?.visible) {
        this.positionInventoryStackLabel(slotIndex);
      }
    });
    this.redrawInventorySelection();
    this.layoutConfirmDialog();
    this.layoutMacroEditorDialog();

    let y = bodyTop + pad;

    this.nameText.setPosition(sidebarX + pad, y + 1);
    y += 26;

    this.levelText.setPosition(sidebarX + pad, y - 1);
    this.expBarGeom = { x: sidebarX + pad + 42, y: y + 1, w: innerW - 42, h: 8 };
    y += 12;
    this.expLabel.setPosition(sidebarX + pad + 42, y);
    y += 18;

    this.invLabel.setPosition(sidebarX + pad, y);
    y += 14;

    const inventoryTabsY = y;
    const invTabW = Math.floor((innerW - 8) / 2);
    const invTabH = 20;
    this.drawConfirmButton(this.invTabBtn, sidebarX + pad, inventoryTabsY, invTabW, invTabH);
    this.drawConfirmButton(this.spellsTabBtn, sidebarX + pad + invTabW + 8, inventoryTabsY, invTabW, invTabH);
    this.invTabBtn.setAlpha(this.activeSidebarTab === "inventory" ? 1 : 0.55);
    this.spellsTabBtn.setAlpha(this.activeSidebarTab === "spells" ? 1 : 0.55);
    this.invTabLabel.setColor(this.activeSidebarTab === "inventory" ? "#ffffff" : "#9aa3b2");
    this.spellsTabLabel.setColor(this.activeSidebarTab === "spells" ? "#ffffff" : "#9aa3b2");
    this.invTabBtn.input?.hitArea.setTo(sidebarX + pad, inventoryTabsY, invTabW, invTabH);
    this.spellsTabBtn.input?.hitArea.setTo(
      sidebarX + pad + invTabW + 8,
      inventoryTabsY,
      invTabW,
      invTabH
    );
    this.invTabLabel.setPosition(sidebarX + pad + invTabW / 2, inventoryTabsY + invTabH / 2);
    this.spellsTabLabel.setPosition(sidebarX + pad + invTabW + 8 + invTabW / 2, inventoryTabsY + invTabH / 2);
    y += invTabH + 10;

    this.inventoryPanel.container.setPosition(sidebarX + pad, y + 8);
    const isInventoryTab = this.activeSidebarTab === "inventory";
    this.inventoryPanel.container.setVisible(isInventoryTab);
    this.spellPanelBg.setVisible(!isInventoryTab);
    this.spellSelectionGfx.setVisible(!isInventoryTab);
    this.spellUpBtn.setVisible(!isInventoryTab);
    this.spellDownBtn.setVisible(!isInventoryTab);
    this.spellInfoBtn.setVisible(!isInventoryTab);
    this.spellCastBtn.setVisible(!isInventoryTab);
    this.spellUpZone.setVisible(!isInventoryTab);
    this.spellDownZone.setVisible(!isInventoryTab);
    this.spellInfoZone.setVisible(!isInventoryTab);
    this.spellCastZone.setVisible(!isInventoryTab);
    this.spellUpLabel.setVisible(!isInventoryTab);
    this.spellDownLabel.setVisible(!isInventoryTab);
    this.spellInfoLabel.setVisible(!isInventoryTab);
    this.spellCastLabel.setVisible(!isInventoryTab);
    this.spellRows.forEach((row) => row.setVisible(!isInventoryTab));
    this.spellRowZones.forEach((zone) => zone.setVisible(!isInventoryTab));
    if (!isInventoryTab) {
      const panelX = sidebarX + pad;
      const panelY = y + 8;
      const panelW = innerW;
      const panelH = this.inventoryPanel.height;
      const listPad = 8;
      const listX = panelX + listPad;
      const listY = panelY + listPad;
      const listW = panelW - listPad * 2 - 26;
      const listH = panelH - 44;
      const rowH = Math.floor(listH / this.spellRows.length);
      const controlX = panelX + panelW - listPad - 22;

      this.spellPanelBg.clear();
      this.spellPanelBg.fillStyle(0x090b10, 0.94);
      this.spellPanelBg.fillRect(panelX, panelY, panelW, panelH);
      this.spellPanelBg.lineStyle(1, COLORS.panelBorder, 1);
      this.spellPanelBg.strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1);

      const maxScroll = Math.max(0, this.spells.length - this.spellRows.length);
      this.spellScrollOffset = Phaser.Math.Clamp(this.spellScrollOffset, 0, maxScroll);
      this.selectedSpellIndex = Phaser.Math.Clamp(this.selectedSpellIndex, this.spells.length > 0 ? 0 : -1, Math.max(-1, this.spells.length - 1));

      this.spellRows.forEach((row, rowIndex) => {
        const spellIndex = this.spellScrollOffset + rowIndex;
        const spell = this.spells[spellIndex];
        row.setPosition(listX + 4, listY + rowIndex * rowH + 1);
        row.setText(spell ? spell.nombre : "");
        row.setColor(spellIndex === this.selectedSpellIndex ? "#ffe08a" : "#ffffff");
        this.spellRowZones[rowIndex]
          .setPosition(listX, listY + rowIndex * rowH)
          .setSize(listW, rowH);
      });

      this.spellSelectionGfx.clear();
      if (this.selectedSpellIndex >= this.spellScrollOffset) {
        const selectedRow = this.selectedSpellIndex - this.spellScrollOffset;
        if (selectedRow >= 0 && selectedRow < this.spellRows.length) {
          this.spellSelectionGfx.lineStyle(1, 0x4c607f, 1);
          this.spellSelectionGfx.strokeRect(
            listX,
            listY + selectedRow * rowH,
            listW,
            rowH
          );
        }
      }

      this.drawConfirmButton(this.spellUpBtn, controlX, listY, 22, 20);
      this.drawConfirmButton(this.spellDownBtn, controlX, listY + 24, 22, 20);
      this.drawConfirmButton(this.spellInfoBtn, controlX, listY + 48, 22, 20);
      this.drawConfirmButton(this.spellCastBtn, panelX + listPad, panelY + panelH - 26, panelW - listPad * 2, 20);

      this.spellUpZone.setPosition(controlX, listY).setSize(22, 20);
      this.spellDownZone.setPosition(controlX, listY + 24).setSize(22, 20);
      this.spellInfoZone.setPosition(controlX, listY + 48).setSize(22, 20);
      this.spellCastZone
        .setPosition(panelX + listPad, panelY + panelH - 26)
        .setSize(panelW - listPad * 2, 20);

      this.spellUpLabel.setPosition(controlX + 11, listY + 10);
      this.spellDownLabel.setPosition(controlX + 11, listY + 34);
      this.spellInfoLabel.setPosition(controlX + 11, listY + 58);
      this.spellCastLabel.setPosition(panelX + panelW / 2, panelY + panelH - 16);
    } else {
      this.spellPanelBg.clear();
      this.spellSelectionGfx.clear();
    }
    y += this.inventoryPanel.height + 20;

    this.goldText.setPosition(sidebarX + pad, y);
    y += 22;

    this.hpLabel.setPosition(sidebarX + pad, y);
    y += 14;
    this.hpBarGeom = { x: sidebarX + pad, y, w: innerW, h: 10 };
    y += 16;

    this.mpLabel.setPosition(sidebarX + pad, y);
    y += 14;
    this.mpBarGeom = { x: sidebarX + pad, y, w: innerW, h: 10 };
    y += 20;

    this.mapNameText.setPosition(sidebarX + pad, y);
    y += 16;

    const minimapSize = Math.max(80, Math.min(innerW, bodyBottom - y - pad));
    this.minimapGeom = { x: sidebarX + pad, y, size: minimapSize };

    if (this.macroBarHeight > 0) {
      const macroY = bodyBottom;
      const macroPad = 8;
      const macroSlotSize = 24;
      const macroGap = 18;
      const visibleCount = Math.min(10, this.macroSlots.length);
      const macroTotalW = visibleCount * macroSlotSize + (visibleCount - 1) * macroGap;
      let mx = Math.floor((w - macroTotalW) / 2);

      this.macroStripFill.setVisible(false);
      this.macroSlots.forEach((slot, index) => {
        const visible = index < visibleCount;
        slot.icon.setVisible(visible);
        slot.itemIcon.setVisible(visible && Boolean(slot.itemIcon.getData("hasItem")));
        slot.keyLabel.setVisible(visible);
        if (!visible) return;
        slot.icon.setPosition(mx, macroY + macroPad);
        slot.icon.setDisplaySize(macroSlotSize, macroSlotSize);
        slot.itemIcon.setPosition(mx + 4, macroY + macroPad + 4);
        slot.itemIcon.setDisplaySize(macroSlotSize - 8, macroSlotSize - 8);
        slot.keyLabel.setPosition(mx + 7, macroY + macroPad + 8);
        mx += macroSlotSize + macroGap;
      });
    } else {
      const macroSlotSize = 36;
      const macroGap = 18;
      const macroStartX = 0;
      const maxWorldX = sidebarX;
      const stripH = macroSlotSize + 10;
      const yStrip = h - stripH;
      const yMacro = yStrip + Math.floor((stripH - macroSlotSize) / 2);
      const visibleCount = Math.min(10, this.macroSlots.length);
      const totalW = visibleCount * macroSlotSize + (visibleCount - 1) * macroGap;
      let mx = Math.max(6, Math.floor((maxWorldX - totalW) / 2));

      this.macroStripFill.setVisible(true);
      this.macroStripFill.setPosition(macroStartX, yStrip);
      this.macroStripFill.setSize(Math.max(1, maxWorldX - macroStartX), stripH);
      this.macroStripFill.setAlpha(0.95);

      this.macroSlots.forEach((slot, index) => {
        const visible = index < visibleCount;
        slot.icon.setVisible(visible);
        slot.itemIcon.setVisible(visible && Boolean(slot.itemIcon.getData("hasItem")));
        slot.keyLabel.setVisible(visible);
        if (!visible) return;
        slot.icon.setPosition(mx, yMacro);
        slot.icon.setDisplaySize(macroSlotSize, macroSlotSize);
        slot.icon.setAlpha(0.92);
        slot.itemIcon.setPosition(mx + 5, yMacro + 5);
        slot.itemIcon.setDisplaySize(macroSlotSize - 10, macroSlotSize - 10);
        slot.keyLabel.setPosition(mx + 7, yMacro + 9);
        mx += macroSlotSize + macroGap;
      });
    }

    this.refreshStats();
  };

  private ensureMacroMarkTexture() {
    if (this.scene.textures.exists(MACRO_MARK_TEXTURE_KEY)) return;

    const size = 36;
    const g = this.scene.add.graphics();
    g.fillStyle(0x0f1117, 0.92);
    g.fillRect(0, 0, size, size);
    g.lineStyle(2, 0x2b3242, 1);
    g.strokeRect(1, 1, size - 2, size - 2);
    g.lineStyle(1, 0x58627a, 0.9);
    g.strokeRect(3, 3, size - 6, size - 6);
    g.generateTexture(MACRO_MARK_TEXTURE_KEY, size, size);
    g.destroy();
  }

  private drawChatInput(x: number, y: number, w: number, h: number) {
    this.chatInputBg.clear();
  
    this.chatInputBg.fillStyle(this.chatFocused ? 0x111722 : 0x0b0d13, 1);
    this.chatInputBg.fillRect(x, y, w, h);
  
    this.chatInputBg.lineStyle(
      1,
      this.chatFocused ? 0xffe566 : 0x4c5363,
      1
    );
    this.chatInputBg.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  
    this.chatInputBg.lineStyle(1, 0x000000, 0.45);
    this.chatInputBg.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  }

  private drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) {
    g.clear();
    g.fillStyle(COLORS.panelBg, 0.95);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, COLORS.panelBorder, 1);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    g.lineStyle(1, 0x666666, 0.3);
    g.strokeRect(x + 2, y + 2, w - 4, h - 4);
  }

  private drawSlot(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number) {
    g.clear();
    g.fillStyle(COLORS.slotBg, 1);
    g.fillRect(x, y, size, size);
    g.lineStyle(1, COLORS.slotBorder, 1);
    g.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  }

  private refreshStats() {
    const s = this.stats;
    const expPct = s.expMax > 0 ? Math.min(1, s.exp / s.expMax) : 0;

    this.nameText.setText(s.name);
    this.levelText.setText(String(s.level));
    this.expLabel.setText(`${Math.floor(expPct * 100)}% (${s.exp}/${s.expMax})`);
    this.goldText.setText(`Oro: ${s.gold.toLocaleString("es-AR")}`);
    this.hpLabel.setText(`HP ${s.hp}/${s.hpMax}`);
    this.mpLabel.setText(`MP ${s.mp}/${s.mpMax}`);

    this.drawBar(this.expFill, this.expBarGeom, expPct, COLORS.expBg, COLORS.exp);
    this.drawBar(this.hpFill, this.hpBarGeom, s.hpMax > 0 ? s.hp / s.hpMax : 0, COLORS.hpBg, COLORS.hp);
    this.drawBar(this.mpFill, this.mpBarGeom, s.mpMax > 0 ? s.mp / s.mpMax : 0, COLORS.mpBg, COLORS.mp);
  }

  private drawBar(
    g: Phaser.GameObjects.Graphics,
    geom: BarGeom,
    ratio: number,
    bgColor: number,
    fillColor: number
  ) {
    if (geom.w <= 0) {
      return;
    }

    g.clear();
    g.fillStyle(bgColor, 1);
    g.fillRect(geom.x, geom.y, geom.w, geom.h);
    const fillW = Math.max(0, Math.floor(geom.w * ratio));
    if (fillW > 0) {
      g.fillStyle(fillColor, 1);
      g.fillRect(geom.x, geom.y, fillW, geom.h);
    }
    g.lineStyle(1, COLORS.panelBorder, 1);
    g.strokeRect(geom.x + 0.5, geom.y + 0.5, geom.w - 1, geom.h - 1);
  }
}
