import Phaser from "phaser";
import { getTileDefinition, TILE } from "../maps/tileDefinitions";
import type { GameMap } from "../maps/types";
import type { SpellDefinition } from "../data/spells";
import { GAME_FONT, GAME_TEXT_RESOLUTION } from "./fonts";
import { getGameViewport, UI_LAYOUT } from "./layout";
import { createInventoryPanel, type InventoryPanel } from "./inventoryPanel";
import {
  AOWEB_SKIN_TEXTURE_KEY,
  FONDO_BOTONES_FALLBACK_SIZE,
  FONDO_BOTONES_TEXTURE_KEY,
  getLvlNameExpNativeSize,
  getTextureNativeSize,
  LVL_NAME_EXP_LAYOUT,
  LVL_NAME_EXP_TEXTURE_KEY,
  CHAT_PANEL_LAYOUT,
  VENTANA_CHAT_LAYOUT,
  VENTANA_CHAT_TEXTURE_KEY,
} from "./playerHudFrame";
import {
  AOWEB_SKIN_INVENTORY_CELL,
  AOWEB_SKIN_REGIONS,
  getSkinGameViewport,
  scaleSkinRect,
  scaleSkinX,
  scaleSkinY,
} from "./aowebSkinLayout";
import { ATTRIBUTE_POTION_BUFF_MAX, STAT_MAX } from "../../game-data/constants";
import { INVENTORY_SLOT_COUNT } from "../game/characterProgressStorage";

/** Posición X nativa del centro de cada ranura de la barra de macros. */
const SKIN_MACRO_SLOT_X = [62, 107, 152, 201, 249, 296, 343, 390, 484, 530] as const;
import type { SkillDisplayEntry } from "../game/skills";

export type CharacterAttributesDisplay = {
  strength: number;
  agility: number;
  intelligence: number;
  constitution: number;
  /** Tope de FUE con pociones (natural de raza/clase + bono máximo). */
  strengthCeiling?: number;
  /** Tope de AGI con pociones (natural de raza/clase + bono máximo). */
  agilityCeiling?: number;
};

export type PlayerKillStats = {
  creaturesKilled: number;
  criminalsKilled: number;
  usersKilled: number;
};

const UI_DEPTH = 1000;
const MACRO_COUNT = 10;
const INVENTORY_ROWS = 4;
const INVENTORY_COLS = Math.floor(INVENTORY_SLOT_COUNT / INVENTORY_ROWS);
const INVENTORY_SLOT_SCALE = 1.12;
/** Fracción del casillero que ocupa el ícono (ancho/alto). */
const INVENTORY_ICON_FILL = 0.9;
const INVENTORY_GAP = 1;
const SPELL_ROW_HEIGHT = 18;
const SPELL_ROW_GAP = 5;
const SPELL_MIN_VISIBLE_ROWS = 8;
const SPELL_PANEL_FOOTER = 44;
const SPELL_PANEL_FOOTER_SKIN = 30;
const SPELL_MAX_VISIBLE_ROWS = 12;
const INVENTORY_PADDING = 20;
const MINIMAP_SIZE = 112;
const SKIN_CHAT_PAD = { left: 8, right: 10, top: 4, bottom: 4 } as const;
const CHAT_HISTORY_FONT_SIZE = 10;
const CHAT_HISTORY_LINE_HEIGHT = 13;
const HUD_STRENGTH_POTION_TEXTURE_KEY = "hud_strength_potion_icon";
const HUD_AGILITY_POTION_TEXTURE_KEY = "hud_agility_potion_icon";

const ATTRIBUTE_STAT_COLOR_DEFAULT = "#f2d188";
const ATTRIBUTE_STAT_COLOR_DEFAULT_LEGACY = "#f5d76e";
/** Naranja rojizo cuando FUE/AGI están en el máximo alcanzable. */
const ATTRIBUTE_STAT_COLOR_AT_MAX = "#e06830";

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

const UI_MAPNAME_OFFSET_KEY = "ui_mapname_offset";
const CHAT_TAB_ORDER = ["chat", "combat", "global"] as const;
type ChatTabId = (typeof CHAT_TAB_ORDER)[number];
type ChatEntry = { text: string; channel: ChatTabId };
const MACRO_PLACEHOLDER_TEXTURE_KEY = "macroPlaceholder";
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
  aoe: boolean;
  aoeRadiusTiles: number;
};

export type PlayerHudStats = {
  name: string;
  nameColor?: string;
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
  nameColor: "#4da6ff",
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
  private inventoryEquippedLabels: Phaser.GameObjects.Text[] = [];
  private inventorySlotItemIds: (string | null)[] = [];
  private equippedItemIds = new Set<string>();
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly sidebarWidth = UI_LAYOUT.sidebarWidth;
  private readonly macroBarHeight = UI_LAYOUT.macroBarHeight;
  private readonly chatHeight = UI_LAYOUT.chatHeight;

  private stats: PlayerHudStats = { ...DEFAULT_STATS };

  private chatPanel!: Phaser.GameObjects.Graphics;
  private uiSkinFrame!: Phaser.GameObjects.Image;
  private skinViewportMaskGfx!: Phaser.GameObjects.Graphics;
  private chatBgFrame!: Phaser.GameObjects.Image;
  private sidebarPanel!: Phaser.GameObjects.Graphics;
  private useAowebSkin = false;

  private mapNameText!: Phaser.GameObjects.Text;
  private chatText!: Phaser.GameObjects.Text;
  private chatTabBgFrames: Phaser.GameObjects.Image[] = [];
  private chatTabs: {
    id: ChatTabId;
    hit: Phaser.GameObjects.Graphics;
    label: Phaser.GameObjects.Text;
  }[] = [];
  private chatTabsExpanded = false;
  private chatTabsToggleHit!: Phaser.GameObjects.Zone;
  private chatChannelToggleLabel!: Phaser.GameObjects.Text;

  private chatInputBg!: Phaser.GameObjects.Graphics;
  private chatInputText!: Phaser.GameObjects.Text;
  private chatMaskGfx!: Phaser.GameObjects.Graphics;
  private chatHistory: ChatEntry[] = [];
  private activeChatTab: ChatTabId = "chat";
  private chatInputValue = "";
  private chatFocused = false;
  private chatTextArea = { x: 0, y: 0, w: 0, h: 0 };
  private chatScrollOffset = 0;

  private lvlNameExpFrame!: Phaser.GameObjects.Image;
  private levelText!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private expLabelText!: Phaser.GameObjects.Text;
  private inventoryPanel!: InventoryPanel;
  private inventoryClipMaskGfx!: Phaser.GameObjects.Graphics;
  private inventoryClipMask!: Phaser.Display.Masks.GeometryMask;
  private inventorySelectionGfx!: Phaser.GameObjects.Graphics;
  private expFill!: Phaser.GameObjects.Graphics;
  private goldText!: Phaser.GameObjects.Text;
  private strengthValueText!: Phaser.GameObjects.Text;
  private agilityValueText!: Phaser.GameObjects.Text;
  private strengthPotionIcon!: Phaser.GameObjects.Image;
  private agilityPotionIcon!: Phaser.GameObjects.Image;
  private hpLabel!: Phaser.GameObjects.Text;
  private mpLabel!: Phaser.GameObjects.Text;
  private hpFill!: Phaser.GameObjects.Graphics;
  private mpFill!: Phaser.GameObjects.Graphics;
  private minimapGfx!: Phaser.GameObjects.Graphics;
  private macroSlots: {
    hit: Phaser.GameObjects.Zone;
    itemIcon: Phaser.GameObjects.Image;
    keyLabel: Phaser.GameObjects.Text;
  }[] = [];
  private macroSlotClickHandler?: (slotIndex: number) => void;
  private activeSidebarTab: "inventory" | "spells" = "inventory";
  private statsTabBtn!: Phaser.GameObjects.Graphics;
  private statsTabLabel!: Phaser.GameObjects.Text;
  private statsOverlayVisible = false;
  private statsOverlay!: Phaser.GameObjects.Container;
  private statsOverlayDim!: Phaser.GameObjects.Graphics;
  private statsOverlayPanel!: Phaser.GameObjects.Graphics;
  private statsOverlayTitle!: Phaser.GameObjects.Text;
  private statsOverlayCloseBtn!: Phaser.GameObjects.Graphics;
  private statsOverlayCloseLabel!: Phaser.GameObjects.Text;
  private statsOverlayCloseZone!: Phaser.GameObjects.Zone;
  private statsOverlayAttrTexts: Phaser.GameObjects.Text[] = [];
  private statsOverlaySectionTitles: Phaser.GameObjects.Text[] = [];
  private statsSkillNameTexts: Phaser.GameObjects.Text[] = [];
  private statsSkillValueTexts: Phaser.GameObjects.Text[] = [];
  private statsSkillBars: Phaser.GameObjects.Graphics[] = [];
  private statsKillTexts: Phaser.GameObjects.Text[] = [];
  private statsSkillScrollOffset = 0;
  private skillEntries: SkillDisplayEntry[] = [];
  private killStats: PlayerKillStats = {
    creaturesKilled: 0,
    criminalsKilled: 0,
    usersKilled: 0,
  };
  private characterAttributes: CharacterAttributesDisplay = {
    strength: 0,
    agility: 0,
    intelligence: 0,
    constitution: 0,
  };
  private strengthAttributeCeiling = STAT_MAX + ATTRIBUTE_POTION_BUFF_MAX;
  private agilityAttributeCeiling = STAT_MAX + ATTRIBUTE_POTION_BUFF_MAX;
  private readonly inventorySlotInvalidFlags: boolean[] = Array(INVENTORY_SLOT_COUNT).fill(false);
  private inventorySlotInvalidGfx: Phaser.GameObjects.Graphics[] = [];
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
  private invTabBgFrames: Phaser.GameObjects.Image[] = [];
  private invTabBtn!: Phaser.GameObjects.Graphics;
  private spellsTabBtn!: Phaser.GameObjects.Graphics;
  private invTabLabel!: Phaser.GameObjects.Text;
  private spellsTabLabel!: Phaser.GameObjects.Text;
  private spellPanelBg!: Phaser.GameObjects.Graphics;
  private spellRows: Phaser.GameObjects.Text[] = [];
  private spellSelectionGfx!: Phaser.GameObjects.Graphics;
  private spellUpBtn!: Phaser.GameObjects.Graphics;
  private spellDownBtn!: Phaser.GameObjects.Graphics;
  private spellScrollUpBtn!: Phaser.GameObjects.Graphics;
  private spellScrollDownBtn!: Phaser.GameObjects.Graphics;
  private spellInfoBtn!: Phaser.GameObjects.Graphics;
  private spellCastBtn!: Phaser.GameObjects.Graphics;
  private spellRowZones: Phaser.GameObjects.Zone[] = [];
  private spellUpZone!: Phaser.GameObjects.Zone;
  private spellDownZone!: Phaser.GameObjects.Zone;
  private spellScrollUpZone!: Phaser.GameObjects.Zone;
  private spellScrollDownZone!: Phaser.GameObjects.Zone;
  private spellInfoZone!: Phaser.GameObjects.Zone;
  private spellCastZone!: Phaser.GameObjects.Zone;
  private spellUpLabel!: Phaser.GameObjects.Text;
  private spellDownLabel!: Phaser.GameObjects.Text;
  private spellScrollUpLabel!: Phaser.GameObjects.Text;
  private spellScrollDownLabel!: Phaser.GameObjects.Text;
  private spellScrollHintText!: Phaser.GameObjects.Text;
  private spellInfoLabel!: Phaser.GameObjects.Text;
  private spellCastLabel!: Phaser.GameObjects.Text;
  private spells: SpellDefinition[] = [];
  private spellScrollOffset = 0;
  private spellVisibleRows = 0;
  private spellListScrollGeom = { x: 0, y: 0, w: 0, h: 0 };
  private selectedSpellIndex = 0;
  private spellInfoRequestHandler?: (spell: SpellInfoRequest) => void;
  private spellCastRequestHandler?: (spell: SpellInfoRequest) => void;
  private chatSubmitHandler?: (message: string) => boolean | void;
  private goldClickHandler?: () => void;

  private inventorySlotDoubleClickHandler?: (slotIndex: number) => void;
  private inventorySlotMoveHandler?: (fromSlotIndex: number, toSlotIndex: number) => void;
  private inventoryDragState:
    | { fromSlotIndex: number; startX: number; startY: number }
    | null = null;
  private inventoryDragPointerUpBound = false;
  private inventoryHoverHandler?: (slotIndex: number) => string | null;
  private inventoryHintBg!: Phaser.GameObjects.Graphics;
  private inventoryHintText!: Phaser.GameObjects.Text;
  private inventoryHintBoxGeom = { x: 0, y: 0, w: 0, h: 22 };
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
  private expSlotGeom: BarGeom = { x: 0, y: 0, w: 0, h: 8 };
  private expLabelFontPx = 8;
  private hpBarGeom: BarGeom = { x: 0, y: 0, w: 0, h: 10 };
  private mpBarGeom: BarGeom = { x: 0, y: 0, w: 0, h: 10 };
  private minimapGeom = { x: 0, y: 0, size: 0 };
  private minimapRedrawHandler: (() => void) | null = null;
  private fullscreenBtnBg!: Phaser.GameObjects.Image;
  private fullscreenBtnHit!: Phaser.GameObjects.Graphics;
  private fullscreenBtnLabel!: Phaser.GameObjects.Text;

  private mapNameOffset = { x: 0, y: 0 };

  getContainer(): Phaser.GameObjects.Container {
    return this.root;
  }

  isUsingAowebSkin(): boolean {
    return this.useAowebSkin;
  }

  /** Objetos fuera del container (evita que la cámara del mundo los oculte mal). */
  getSceneUiObjects(): Phaser.GameObjects.GameObject[] {
    return [
      this.lvlNameExpFrame,
      this.expFill,
      this.levelText,
      this.nameText,
      this.expLabelText,
    ];
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(UI_DEPTH).setScrollFactor(0);

    // Ajuste manual persistente para la posición del "nombre de mapa".
    try {
      const raw = localStorage.getItem(UI_MAPNAME_OFFSET_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { x?: number; y?: number };
        this.mapNameOffset = {
          x: typeof parsed.x === "number" ? parsed.x : 0,
          y: typeof parsed.y === "number" ? parsed.y : 0,
        };
      }
    } catch {
      // ignore
    }

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
    this.chatHistory = this.chatHistory.slice(-200);
    this.chatScrollOffset = 0;
    this.renderChatHistory();
  }

  addCombatLine(line: string) {
    this.chatHistory.push({ text: line, channel: "combat" });
    this.chatHistory = this.chatHistory.slice(-200);
    this.chatScrollOffset = 0;
    this.renderChatHistory();
  }

  addGlobalLine(line: string) {
    this.chatHistory.push({ text: line, channel: "global" });
    this.chatHistory = this.chatHistory.slice(-200);
    this.chatScrollOffset = 0;
    this.renderChatHistory();
  }

  setMapLocation(name: string, tileX: number, tileY: number) {
    this.mapNameText.setText(`${name} (${tileX}, ${tileY})`);
  }

  setMinimapRedrawHandler(handler: () => void) {
    this.minimapRedrawHandler = handler;
  }

  setMapNameOffset(dxPx: number, dyPx: number) {
    this.mapNameOffset = { x: dxPx, y: dyPx };
    try {
      localStorage.setItem(UI_MAPNAME_OFFSET_KEY, JSON.stringify(this.mapNameOffset));
    } catch {
      // ignore
    }
    this.relayout();
  }

  resetMapNameOffset() {
    this.setMapNameOffset(0, 0);
  }

  getMapNameOffset() {
    return { ...this.mapNameOffset };
  }

  setSpells(spells: SpellDefinition[]) {
    this.spells = [...spells];
    this.spellScrollOffset = 0;
    this.selectedSpellIndex = this.spells.length > 0 ? 0 : -1;
    this.relayout();
  }

  setSkillEntries(entries: SkillDisplayEntry[]) {
    this.skillEntries = [...entries];
    this.statsSkillScrollOffset = 0;
    this.relayout();
  }

  setCharacterAttributes(attributes: CharacterAttributesDisplay) {
    this.characterAttributes = { ...attributes };
    const fallbackCeiling = STAT_MAX + ATTRIBUTE_POTION_BUFF_MAX;
    this.strengthAttributeCeiling =
      attributes.strengthCeiling ?? fallbackCeiling;
    this.agilityAttributeCeiling = attributes.agilityCeiling ?? fallbackCeiling;
    this.refreshAttributeSlots();
    this.relayout();
  }

  private applyAttributeStatColors() {
    const defaultColor = this.useAowebSkin
      ? ATTRIBUTE_STAT_COLOR_DEFAULT
      : ATTRIBUTE_STAT_COLOR_DEFAULT_LEGACY;
    this.strengthValueText.setColor(
      this.characterAttributes.strength >= this.strengthAttributeCeiling
        ? ATTRIBUTE_STAT_COLOR_AT_MAX
        : defaultColor
    );
    this.agilityValueText.setColor(
      this.characterAttributes.agility >= this.agilityAttributeCeiling
        ? ATTRIBUTE_STAT_COLOR_AT_MAX
        : defaultColor
    );
  }

  private refreshAttributeSlots() {
    this.strengthValueText.setText(String(this.characterAttributes.strength));
    this.agilityValueText.setText(String(this.characterAttributes.agility));
    this.applyAttributeStatColors();
  }

  setKillStats(stats: PlayerKillStats) {
    this.killStats = { ...stats };
    if (this.statsOverlayVisible) {
      this.layoutStatsOverlay();
    }
  }

  isStatsOverlayOpen() {
    return this.statsOverlayVisible;
  }

  toggleStatsOverlay() {
    if (this.statsOverlayVisible) {
      this.closeStatsOverlay();
      return;
    }
    this.statsOverlayVisible = true;
    this.statsOverlay.setVisible(true);
    this.statsTabBtn.setAlpha(1);
    this.statsTabLabel.setColor("#ffffff");
    this.relayout();
  }

  closeStatsOverlay() {
    this.statsOverlayVisible = false;
    this.statsOverlay.setVisible(false);
    this.statsTabBtn.setAlpha(0.55);
    this.statsTabLabel.setColor("#9aa3b2");
    this.relayout();
  }

  setInventorySlotInvalid(slotIndex: number, invalid: boolean) {
    if (slotIndex < 0 || slotIndex >= this.inventorySlotInvalidFlags.length) {
      return;
    }
    this.inventorySlotInvalidFlags[slotIndex] = invalid;
    this.redrawInventoryInvalidSlots();
  }

  private redrawInventoryInvalidSlots() {
    for (let slotIndex = 0; slotIndex < this.inventoryPanel.slots.length; slotIndex += 1) {
      let gfx = this.inventorySlotInvalidGfx[slotIndex];
      if (!gfx) {
        gfx = this.scene.add.graphics().setScrollFactor(0);
        this.inventoryPanel.container.add(gfx);
        this.inventorySlotInvalidGfx[slotIndex] = gfx;
      }
      gfx.clear();
      if (!this.inventorySlotInvalidFlags[slotIndex]) {
        continue;
      }
      const slot = this.inventoryPanel.slots[slotIndex];
      if (!slot) continue;
      const invalidAlpha = this.useAowebSkin ? 0.22 : 0.42;
      gfx.fillStyle(0xcc1a1a, invalidAlpha);
      gfx.fillRect(slot.x, slot.y, slot.displayWidth, slot.displayHeight);
      if (!this.useAowebSkin) {
        gfx.lineStyle(1, 0xff4444, 0.85);
        gfx.strokeRect(slot.x + 0.5, slot.y + 0.5, slot.displayWidth - 1, slot.displayHeight - 1);
      }
    }
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

  setGoldClickHandler(handler: () => void) {
    this.goldClickHandler = handler;
  }

  private toggleFullscreen() {
    if (this.scene.scale.isFullscreen) {
      this.scene.scale.stopFullscreen();
    } else {
      this.scene.scale.startFullscreen();
    }
  }

  private syncFullscreenButtonLabel() {
    const inFullscreen = this.scene.scale.isFullscreen;
    this.fullscreenBtnLabel.setText(inFullscreen ? "⛶" : "⛶");
    this.fullscreenBtnLabel.setColor(inFullscreen ? "#f0e6c8" : "#e6edf3");
  }

  private renderChatHistory() {
    const lineHeight = CHAT_HISTORY_LINE_HEIGHT;
    const maxLines = Math.max(1, Math.floor(this.chatTextArea.h / lineHeight));
    const filtered = this.chatHistory.filter(
      (entry) => entry.channel === this.activeChatTab
    );
    const total = filtered.length;
    const end = Math.max(0, total - this.chatScrollOffset);
    const start = Math.max(0, end - maxLines);
    const visibleLines = filtered.slice(start, end).map((entry) => entry.text);
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

    const minimapBgAlpha = this.useAowebSkin ? 0.35 : 0.92;
    g.fillStyle(0x0a1018, minimapBgAlpha);
    if (this.useAowebSkin) {
      g.fillRect(x, y, size, size);
    } else {
      g.fillRoundedRect(x - 2, y - 2, size + 4, size + 4, 4);
      g.lineStyle(1, 0x4c607f, 1);
      g.strokeRoundedRect(x - 1.5, y - 1.5, size + 3, size + 3, 4);
    }

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
    this.uiSkinFrame = this.scene.add
      .image(0, 0, AOWEB_SKIN_TEXTURE_KEY)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-1);
    this.skinViewportMaskGfx = this.scene.add.graphics().setScrollFactor(0).setVisible(false);
    this.useAowebSkin = this.scene.textures.exists(AOWEB_SKIN_TEXTURE_KEY);
    this.chatBgFrame = this.scene.add
      .image(0, 0, VENTANA_CHAT_TEXTURE_KEY)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.sidebarPanel = this.scene.add.graphics().setScrollFactor(0);

this.chatInputBg = this.scene.add.graphics().setScrollFactor(0);
this.chatMaskGfx = this.scene.add.graphics().setScrollFactor(0);
this.chatMaskGfx.setVisible(false);

this.mapNameText = this.makeText("", 11, "#ffe566", true);
this.chatText = this.makeText("", CHAT_HISTORY_FONT_SIZE, "#b8c4d9");
this.chatInputText = this.makeText("", 12, "#ffffff");

this.chatText.setMask(this.chatMaskGfx.createGeometryMask());

    (
      [
        { id: "chat", label: "Chat" },
        { id: "combat", label: "Combate" },
        { id: "global", label: "Global" },
      ] as const
    ).forEach((tab) => {
      this.chatTabBgFrames.push(
        this.scene.add
          .image(0, 0, FONDO_BOTONES_TEXTURE_KEY)
          .setOrigin(0, 0)
          .setScrollFactor(0)
      );
      const hit = this.scene.add.graphics().setScrollFactor(0).setInteractive(
        new Phaser.Geom.Rectangle(0, 0, 1, 1),
        Phaser.Geom.Rectangle.Contains
      );
      const label = this.makeText(tab.label, 9, "#c8d0dc", true).setOrigin(0.5, 0.5);
      hit.on(
        "pointerdown",
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData
        ) => {
          event.stopPropagation();
          this.activeChatTab = tab.id;
          this.chatScrollOffset = 0;
          this.chatTabsExpanded = false;
          this.renderChatHistory();
          this.relayout();
        }
      );
      this.chatTabs.push({ id: tab.id, hit, label });
    });
    this.chatTabsToggleHit = this.scene.add
      .zone(0, 0, 1, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.chatTabsToggleHit.on(
      "pointerdown",
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        this.chatTabsExpanded = !this.chatTabsExpanded;
        this.relayout();
      }
    );
    this.chatChannelToggleLabel = this.makeText("Chat", 9, "#ffe08a", true)
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0);

    const lvlDepth = UI_DEPTH + 20;
    this.lvlNameExpFrame = this.scene.add
      .image(0, 0, LVL_NAME_EXP_TEXTURE_KEY)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(lvlDepth);
    this.levelText = this.makeText("1", 14, "#e8c872", true)
      .setScrollFactor(0)
      .setDepth(lvlDepth + 2);
    this.nameText = this.makeText(DEFAULT_STATS.name, 12, "#ffffff", true)
      .setScrollFactor(0)
      .setDepth(lvlDepth + 2);
    this.expLabelText = this.makeText("0/100", 7, "#e8d8a0", true)
      .setScrollFactor(0)
      .setDepth(lvlDepth + 3);
    this.expFill = this.scene.add.graphics().setScrollFactor(0).setDepth(lvlDepth + 1);
    for (let i = 0; i < 3; i += 1) {
      this.invTabBgFrames.push(
        this.scene.add
          .image(0, 0, FONDO_BOTONES_TEXTURE_KEY)
          .setOrigin(0, 0)
          .setScrollFactor(0)
      );
    }
    this.invTabBtn = this.scene.add.graphics().setScrollFactor(0);
    this.spellsTabBtn = this.scene.add.graphics().setScrollFactor(0);
    this.statsTabBtn = this.scene.add.graphics().setScrollFactor(0);
    this.invTabLabel = this.makeText("Inventario", 9, "#c8d0dc", true).setOrigin(0.5, 0.5);
    this.spellsTabLabel = this.makeText("Hechizos", 9, "#c8d0dc", true).setOrigin(0.5, 0.5);
    this.statsTabLabel = this.makeText("Estadísticas", 9, "#c8d0dc", true).setOrigin(0.5, 0.5);
    const STATS_VISIBLE_ROWS = 10;
    for (let i = 0; i < STATS_VISIBLE_ROWS; i += 1) {
      this.statsSkillNameTexts.push(this.makeText("", 9, "#ffffff"));
      this.statsSkillValueTexts.push(this.makeText("", 9, "#b8c4d9", true));
      this.statsSkillBars.push(this.scene.add.graphics().setScrollFactor(0));
    }
    for (let i = 0; i < 6; i += 1) {
      this.statsKillTexts.push(this.makeText("", 9, "#c8d0dc"));
    }
    this.spellPanelBg = this.scene.add.graphics().setScrollFactor(0);
    this.spellSelectionGfx = this.scene.add.graphics().setScrollFactor(0);
    for (let i = 0; i < 12; i++) {
      this.spellRows.push(this.makeText("", 10, "#ffffff").setOrigin(0, 0.5));
      const rowZone = this.scene
        .add.zone(0, 0, 1, 1)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      rowZone.on(
        "pointerdown",
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData
        ) => {
          event.stopPropagation();
          this.selectSpellAtVisibleRow(i);
        }
      );
      this.spellRowZones.push(rowZone);
    }
    this.spellUpBtn = this.scene.add.graphics().setScrollFactor(0);
    this.spellDownBtn = this.scene.add.graphics().setScrollFactor(0);
    this.spellScrollUpBtn = this.scene.add.graphics().setScrollFactor(0);
    this.spellScrollDownBtn = this.scene.add.graphics().setScrollFactor(0);
    this.spellInfoBtn = this.scene.add.graphics().setScrollFactor(0);
    this.spellCastBtn = this.scene.add.graphics().setScrollFactor(0);
    this.spellUpZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.spellDownZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.spellScrollUpZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.spellScrollDownZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.spellInfoZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.spellCastZone = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.spellUpLabel = this.makeText("^", 11, "#ffffff", true).setOrigin(0.5, 0.5);
    this.spellDownLabel = this.makeText("v", 11, "#ffffff", true).setOrigin(0.5, 0.5);
    this.spellScrollUpLabel = this.makeText("▲", 10, "#ffffff", true).setOrigin(0.5, 0.5);
    this.spellScrollDownLabel = this.makeText("▼", 10, "#ffffff", true).setOrigin(0.5, 0.5);
    this.spellScrollHintText = this.makeText("", 8, "#8a96a8").setOrigin(0, 0.5);
    this.spellInfoLabel = this.makeText("📖", 11, "#ffffff").setOrigin(0.5, 0.5);
    this.spellCastLabel = this.makeText("Lanzar", 10, "#ffffff", true).setOrigin(0.5, 0.5);
    this.goldText = this.makeText("Oro: 0", 12, "#f1c40f");
    this.goldText.setInteractive({ useHandCursor: true });
    this.goldText.on("pointerdown", () => this.goldClickHandler?.());
    this.strengthPotionIcon = this.scene.add
      .image(0, 0, HUD_STRENGTH_POTION_TEXTURE_KEY)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setVisible(false);
    this.agilityPotionIcon = this.scene.add
      .image(0, 0, HUD_AGILITY_POTION_TEXTURE_KEY)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setVisible(false);
    this.strengthValueText = this.makeText("0", 13, "#f5d76e", true).setOrigin(1, 0.5);
    this.agilityValueText = this.makeText("0", 13, "#f5d76e", true).setOrigin(1, 0.5);
    this.hpLabel = this.makeText("HP 100/100", 11, "#ffffff");
    this.mpLabel = this.makeText("MP 50/50", 11, "#ffffff");
    this.hpFill = this.scene.add.graphics().setScrollFactor(0);
    this.mpFill = this.scene.add.graphics().setScrollFactor(0);
    this.minimapGfx = this.scene.add.graphics().setScrollFactor(0);
    this.fullscreenBtnBg = this.scene.add
      .image(0, 0, FONDO_BOTONES_TEXTURE_KEY)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.fullscreenBtnHit = this.scene.add.graphics().setScrollFactor(0);
    this.fullscreenBtnLabel = this.makeText("⛶", 12, "#e6edf3", true).setOrigin(0.5, 0.5);
    this.fullscreenBtnHit.on(
      "pointerdown",
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        this.toggleFullscreen();
      }
    );
    this.scene.scale.on("enterfullscreen", () => this.syncFullscreenButtonLabel());
    this.scene.scale.on("leavefullscreen", () => this.syncFullscreenButtonLabel());

    this.inventoryPanel = createInventoryPanel(this.scene, 0, 0, {
      cols: INVENTORY_COLS,
      rows: INVENTORY_ROWS,
      slotScale: INVENTORY_SLOT_SCALE,
      gap: INVENTORY_GAP,
      padding: INVENTORY_PADDING,
      frameless: this.useAowebSkin,
    });
    this.inventoryClipMaskGfx = this.scene.add.graphics().setScrollFactor(0).setVisible(false);
    this.inventoryClipMask = this.inventoryClipMaskGfx.createGeometryMask();
    this.inventorySelectionGfx = this.scene.add.graphics().setScrollFactor(0);
    this.inventoryPanel.container.add(this.inventorySelectionGfx);
    
    this.inventoryHintBg = this.scene.add.graphics().setScrollFactor(0);
    this.inventoryHintText = this.makeText("", 10, "#e6edf3").setOrigin(0, 0);
    this.setupInventorySlotInput();
    this.invTabBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 1, 1), Phaser.Geom.Rectangle.Contains);
    this.spellsTabBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 1, 1), Phaser.Geom.Rectangle.Contains);
    this.statsTabBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 1, 1), Phaser.Geom.Rectangle.Contains);
    this.invTabBtn.on("pointerdown", () => {
      this.activeSidebarTab = "inventory";
      this.relayout();
    });
    this.spellsTabBtn.on("pointerdown", () => {
      this.activeSidebarTab = "spells";
      this.relayout();
    });
    this.statsTabBtn.on("pointerdown", () => {
      this.toggleStatsOverlay();
    });
    this.spellUpZone.on(
      "pointerdown",
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        this.reorderSelectedSpell(-1);
      }
    );
    this.spellDownZone.on(
      "pointerdown",
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        this.reorderSelectedSpell(1);
      }
    );
    this.spellScrollUpZone.on(
      "pointerdown",
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        this.scrollSpellList(-1);
      }
    );
    this.spellScrollDownZone.on(
      "pointerdown",
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        this.scrollSpellList(1);
      }
    );
    this.scene.input.on("wheel", this.handleSpellListWheel, this);
    this.scene.input.on("wheel", this.handleChatWheel, this);
    this.spellInfoZone.on(
      "pointerdown",
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        this.requestSelectedSpellInfo();
      }
    );
    this.spellCastZone.on(
      "pointerdown",
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        this.requestSelectedSpellCast();
      }
    );

    this.ensureMacroPlaceholderTexture();
    for (let i = 0; i < MACRO_COUNT; i++) {
      const itemIcon = this.scene
        .add.image(0, 0, MACRO_PLACEHOLDER_TEXTURE_KEY)
        .setScrollFactor(0)
        .setOrigin(0, 0)
        .setVisible(false);
      itemIcon.setData("hasItem", false);
      const keyLabel = this.makeText("", 9, "#d4c4a8", true).setOrigin(0.5, 0.5);
      const hit = this.scene.add
        .zone(0, 0, 1, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      this.macroSlots.push({ hit, itemIcon, keyLabel });
    }

    this.root.add([
      this.uiSkinFrame,
      this.skinViewportMaskGfx,
      this.chatPanel,
      this.chatBgFrame,
      this.sidebarPanel,

      this.mapNameText,
      this.chatText,
    
      // El input va DESPUÉS del historial para tapar cualquier texto que se escape
      this.chatInputBg,
      this.chatInputText,
    
      ...this.chatTabBgFrames,
      this.chatTabsToggleHit,
      this.chatChannelToggleLabel,
      ...this.chatTabs.flatMap((tab) => [tab.hit, tab.label]),
      ...this.invTabBgFrames,
      this.invTabBtn,
      this.spellsTabBtn,
      this.statsTabBtn,
      this.invTabLabel,
      this.spellsTabLabel,
      this.statsTabLabel,
      this.inventoryPanel.container,
      this.inventoryClipMaskGfx,
      this.inventoryHintBg,
      this.inventoryHintText,
      this.spellPanelBg,
      this.spellSelectionGfx,
      ...this.spellRows,
      ...this.spellRowZones,
      this.spellUpBtn,
      this.spellDownBtn,
      this.spellScrollUpBtn,
      this.spellScrollDownBtn,
      this.spellInfoBtn,
      this.spellCastBtn,
      this.spellUpZone,
      this.spellDownZone,
      this.spellScrollUpZone,
      this.spellScrollDownZone,
      this.spellInfoZone,
      this.spellCastZone,
      this.spellUpLabel,
      this.spellDownLabel,
      this.spellScrollUpLabel,
      this.spellScrollDownLabel,
      this.spellScrollHintText,
      this.spellInfoLabel,
      this.spellCastLabel,
      this.goldText,
      this.strengthPotionIcon,
      this.agilityPotionIcon,
      this.strengthValueText,
      this.agilityValueText,
      this.hpLabel,
      this.mpLabel,
      this.hpFill,
      this.mpFill,
      this.minimapGfx,
      this.fullscreenBtnBg,
      this.fullscreenBtnHit,
      this.fullscreenBtnLabel,
      ...this.macroSlots.flatMap((s) => [s.hit, s.itemIcon, s.keyLabel]),
    ]);
    this.setupMacroSlotInput();
    this.setupChatInput();
    this.buildConfirmDialog();
    this.buildMacroEditorDialog();
    this.buildStatsOverlay();

    this.addChatLine("Bienvenido a AOWEB.");
    this.addChatLine("WASD para moverte.");
  }

  setInventorySlotDoubleClickHandler(handler: (slotIndex: number) => void) {
    this.inventorySlotDoubleClickHandler = handler;
  }

  setInventorySlotMoveHandler(handler: (fromSlotIndex: number, toSlotIndex: number) => void) {
    this.inventorySlotMoveHandler = handler;
  }

  setInventoryHoverHandler(handler: (slotIndex: number) => string | null) {
    this.inventoryHoverHandler = handler;
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
    // Forzamos que el overlay de macro quede arriba de todo el HUD.
    this.macroEditorOverlay.setDepth(UI_DEPTH + 50);
    this.root.bringToTop(this.macroEditorOverlay);
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
      slot.hit.removeAllListeners("pointerdown");
      slot.hit.on("pointerdown", () => {
        this.macroSlotClickHandler?.(slotIndex);
      });
    });
  }

  /** Posiciona iconos/teclas de macro sobre los slots del marco (sin recuadros propios). */
  private layoutMacroSlots(w: number, h: number) {
    const macroR = scaleSkinRect(AOWEB_SKIN_REGIONS.macroBar, w, h);
    const macroSlotSize = Math.min(40, scaleSkinX(44, w));
    const iconPad = Math.max(2, Math.floor(macroSlotSize * 0.12));
    const visibleCount = Math.min(SKIN_MACRO_SLOT_X.length, this.macroSlots.length);
    const yMacro = macroR.y + Math.floor((macroR.h - macroSlotSize) / 2);

    this.macroSlots.forEach((slot, index) => {
      const visible = index < visibleCount;
      slot.hit.setVisible(visible);
      slot.itemIcon.setVisible(visible && Boolean(slot.itemIcon.getData("hasItem")));
      slot.keyLabel.setVisible(visible);
      if (!visible) {
        return;
      }

      const slotCenterX = scaleSkinX(SKIN_MACRO_SLOT_X[index], w);
      const mx = slotCenterX - Math.floor(macroSlotSize / 2);
      slot.hit.setPosition(mx, yMacro).setSize(macroSlotSize, macroSlotSize);
      slot.itemIcon.setPosition(mx + iconPad, yMacro + iconPad);
      slot.itemIcon.setDisplaySize(macroSlotSize - iconPad * 2, macroSlotSize - iconPad * 2);
      slot.keyLabel.setPosition(mx + macroSlotSize - 6, yMacro + macroSlotSize - 5);
      slot.keyLabel.setOrigin(1, 1);
    });
  }

  private buildMacroEditorDialog() {
    this.macroEditorOverlay = this.scene
      .add.container(0, 0)
      .setScrollFactor(0)
      .setVisible(false)
      .setDepth(UI_DEPTH + 50);
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

      if (this.statsOverlayVisible) {
        if (event.key === "Escape") {
          this.closeStatsOverlay();
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

  isPointerOverSidebar(pointerX: number, pointerY: number): boolean {
    const sidebarX = this.scene.scale.width - this.sidebarWidth;
    return (
      pointerX >= sidebarX &&
      pointerX <= this.scene.scale.width &&
      pointerY >= 0 &&
      pointerY <= this.scene.scale.height - this.macroBarHeight
    );
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
    this.confirmAmount = 1;
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

  private buildStatsOverlay() {
    this.statsOverlay = this.scene.add.container(0, 0).setScrollFactor(0).setVisible(false);
    this.statsOverlayDim = this.scene.add.graphics().setScrollFactor(0);
    this.statsOverlayPanel = this.scene.add.graphics().setScrollFactor(0);
    this.statsOverlayTitle = this.makeText("ESTADÍSTICAS DEL PERSONAJE", 12, "#e8c56a", true).setOrigin(
      0.5,
      0
    );
    this.statsOverlayCloseBtn = this.scene.add.graphics().setScrollFactor(0);
    this.statsOverlayCloseLabel = this.makeText("X", 11, "#ffffff", true).setOrigin(0.5, 0.5);
    this.statsOverlayCloseZone = this.scene.add
      .zone(0, 0, 1, 1)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    this.statsOverlayCloseZone.on("pointerdown", () => this.closeStatsOverlay());
    this.statsOverlayDim.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 1, 1),
      Phaser.Geom.Rectangle.Contains
    );
    this.statsOverlayDim.on("pointerdown", () => this.closeStatsOverlay());

    for (let i = 0; i < 4; i += 1) {
      this.statsOverlayAttrTexts.push(this.makeText("", 9, "#c8d0dc"));
    }
    this.statsOverlaySectionTitles.push(
      this.makeText("Skills", 10, "#9aa3b2", true),
      this.makeText("Asesinatos", 10, "#9aa3b2", true)
    );

    this.statsOverlay.add([
      this.statsOverlayDim,
      this.statsOverlayPanel,
      this.statsOverlayTitle,
      this.statsOverlayCloseBtn,
      this.statsOverlayCloseLabel,
      this.statsOverlayCloseZone,
      ...this.statsOverlayAttrTexts,
      ...this.statsOverlaySectionTitles,
      ...this.statsSkillNameTexts,
      ...this.statsSkillValueTexts,
      ...this.statsSkillBars,
      ...this.statsKillTexts,
    ]);
    this.root.add(this.statsOverlay);
  }

  private layoutStatsOverlay() {
    if (!this.statsOverlayVisible) {
      return;
    }

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const viewport = getGameViewport(w, h);
    const panelW = Math.min(440, Math.floor(viewport.width * 0.88));
    const panelH = Math.min(360, Math.floor(viewport.height * 0.82));
    const panelX = viewport.x + Math.floor((viewport.width - panelW) / 2);
    const panelY = viewport.y + Math.floor((viewport.height - panelH) / 2);
    const pad = 12;
    const colGap = 10;
    const colW = Math.floor((panelW - pad * 2 - colGap) / 2);
    const leftX = panelX + pad;
    const rightX = leftX + colW + colGap;

    this.statsOverlayDim.clear();
    this.statsOverlayDim.fillStyle(0x000000, 0.45);
    this.statsOverlayDim.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
    this.statsOverlayDim.input?.hitArea.setTo(viewport.x, viewport.y, viewport.width, viewport.height);

    this.statsOverlayPanel.clear();
    this.statsOverlayPanel.fillStyle(0x0a0c12, 0.97);
    this.statsOverlayPanel.fillRect(panelX, panelY, panelW, panelH);
    this.statsOverlayPanel.lineStyle(2, 0x6b5428, 1);
    this.statsOverlayPanel.strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1);
    this.statsOverlayPanel.lineStyle(1, COLORS.panelBorder, 1);
    this.statsOverlayPanel.strokeRect(panelX + 4, panelY + 4, panelW - 8, panelH - 8);

    this.statsOverlayTitle.setPosition(panelX + panelW / 2, panelY + 10);
    const closeSize = 20;
    const closeX = panelX + panelW - pad - closeSize;
    const closeY = panelY + 8;
    this.drawConfirmButton(this.statsOverlayCloseBtn, closeX, closeY, closeSize, closeSize);
    this.statsOverlayCloseZone.setPosition(closeX, closeY).setSize(closeSize, closeSize);
    this.statsOverlayCloseLabel.setPosition(closeX + closeSize / 2, closeY + closeSize / 2);

    const attr = this.characterAttributes;
    const attrY = panelY + 34;
    const attrColW = Math.floor(colW / 2);
    const attrLines = [
      `FUE ${attr.strength}`,
      `AGI ${attr.agility}`,
      `INT ${attr.intelligence}`,
      `CON ${attr.constitution}`,
    ];
    this.statsOverlayAttrTexts.forEach((text, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      text.setPosition(leftX + col * attrColW, attrY + row * 13);
      text.setText(attrLines[index] ?? "");
      if (index === 0) {
        text.setColor(
          attr.strength >= this.strengthAttributeCeiling
            ? ATTRIBUTE_STAT_COLOR_AT_MAX
            : "#c8d0dc"
        );
      } else if (index === 1) {
        text.setColor(
          attr.agility >= this.agilityAttributeCeiling
            ? ATTRIBUTE_STAT_COLOR_AT_MAX
            : "#c8d0dc"
        );
      } else {
        text.setColor("#c8d0dc");
      }
    });

    const skillsTitle = this.statsOverlaySectionTitles[0];
    const killsTitle = this.statsOverlaySectionTitles[1];
    const sectionY = attrY + 34;
    skillsTitle.setPosition(leftX, sectionY);
    killsTitle.setPosition(rightX, sectionY);

    const skillsTop = sectionY + 16;
    const killsTop = sectionY + 16;
    const listH = panelH - (skillsTop - panelY) - pad;
    const visibleRows = this.statsSkillNameTexts.length;
    const rowH = Math.max(16, Math.floor(listH / visibleRows));
    const maxScroll = Math.max(0, this.skillEntries.length - visibleRows);
    this.statsSkillScrollOffset = Phaser.Math.Clamp(this.statsSkillScrollOffset, 0, maxScroll);

    this.statsSkillNameTexts.forEach((nameText, rowIndex) => {
      const entry = this.skillEntries[this.statsSkillScrollOffset + rowIndex];
      const rowY = skillsTop + rowIndex * rowH;
      const bar = this.statsSkillBars[rowIndex];
      const valueText = this.statsSkillValueTexts[rowIndex];
      const skillListW = colW - 4;

      if (!entry) {
        nameText.setText("");
        valueText.setText("");
        bar.clear();
        return;
      }

      nameText.setPosition(leftX, rowY);
      nameText.setText(entry.label);
      valueText.setPosition(leftX + colW, rowY);
      valueText.setOrigin(1, 0);
      valueText.setText(`${entry.current}/${entry.cap}`);

      const barY = rowY + 12;
      const barH = 4;
      const fillRatio = entry.cap > 0 ? Phaser.Math.Clamp(entry.current / entry.cap, 0, 1) : 0;
      bar.clear();
      bar.fillStyle(0x2a2118, 1);
      bar.fillRect(leftX, barY, skillListW, barH);
      if (fillRatio > 0) {
        bar.fillStyle(0xb87333, 1);
        bar.fillRect(leftX, barY, Math.max(1, Math.floor(skillListW * fillRatio)), barH);
      }
      bar.lineStyle(1, 0x4a4030, 0.9);
      bar.strokeRect(leftX + 0.5, barY + 0.5, skillListW - 1, barH - 1);
    });

    const killLines = [
      `Criaturas matadas: ${this.killStats.creaturesKilled}`,
      `Criminales matados: ${this.killStats.criminalsKilled}`,
      `Usuarios matados: ${this.killStats.usersKilled}`,
      `Nobles matados: 0`,
      `Plebeyos matados: 0`,
    ];
    this.statsKillTexts.forEach((text, index) => {
      text.setPosition(rightX, killsTop + index * 15);
      text.setText(killLines[index] ?? "");
      text.setVisible(index < killLines.length);
    });
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
    this.ensureSelectedSpellVisible();
    this.relayout();
  }

  private scrollSpellList(delta: number) {
    if (this.activeSidebarTab !== "spells" || this.spells.length === 0) {
      return;
    }
    const visibleRows = this.spellVisibleRows > 0 ? this.spellVisibleRows : this.spellRows.length;
    const maxScroll = Math.max(0, this.spells.length - visibleRows);
    const next = Phaser.Math.Clamp(this.spellScrollOffset + delta, 0, maxScroll);
    if (next === this.spellScrollOffset) {
      return;
    }
    this.spellScrollOffset = next;
    this.relayout();
  }

  private handleSpellListWheel(
    pointer: Phaser.Input.Pointer,
    _currentlyOver: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number
  ) {
    if (this.activeSidebarTab !== "spells" || deltaY === 0) {
      return;
    }
    const { x, y, w, h } = this.spellListScrollGeom;
    if (h <= 0 || w <= 0) {
      return;
    }
    if (pointer.x < x || pointer.x > x + w || pointer.y < y || pointer.y > y + h) {
      return;
    }
    this.scrollSpellList(deltaY > 0 ? 1 : -1);
  }

  private handleChatWheel(
    pointer: Phaser.Input.Pointer,
    _currentlyOver: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number
  ) {
    if (deltaY === 0) return;
    if (pointer.y > this.chatHeight || pointer.x > this.scene.scale.width - this.sidebarWidth) {
      return;
    }

    const lineHeight = 16;
    const maxLines = Math.max(1, Math.floor(this.chatTextArea.h / lineHeight));
    const filtered = this.chatHistory.filter(
      (entry) => entry.channel === this.activeChatTab
    );
    const maxScroll = Math.max(0, filtered.length - maxLines);

    if (deltaY < 0) {
      this.chatScrollOffset = Math.min(maxScroll, this.chatScrollOffset + 3);
    } else {
      this.chatScrollOffset = Math.max(0, this.chatScrollOffset - 3);
    }
    this.renderChatHistory();
  }

  private ensureSelectedSpellVisible() {
    if (this.selectedSpellIndex < 0) {
      return;
    }
    const visibleRows = this.spellVisibleRows > 0 ? this.spellVisibleRows : this.spellRows.length;
    if (this.selectedSpellIndex < this.spellScrollOffset) {
      this.spellScrollOffset = this.selectedSpellIndex;
    } else if (this.selectedSpellIndex >= this.spellScrollOffset + visibleRows) {
      this.spellScrollOffset = this.selectedSpellIndex - visibleRows + 1;
    }
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
      aoe: spell.aoe,
      aoeRadiusTiles: spell.aoeRadiusTiles,
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

  /** Zona clickeable sin dibujar encima del arte de fondoBotones. */
  private setupTabHitArea(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    g.clear();
    if (!g.input) {
      g.setInteractive(new Phaser.Geom.Rectangle(x, y, w, h), Phaser.Geom.Rectangle.Contains);
    } else {
      g.input.hitArea.setTo(x, y, w, h);
    }
  }

  private setInventoryHint(text: string) {
    this.inventoryHintText.setText(text);
    this.redrawInventoryHintBox();
  }

  private redrawInventoryHintBox() {
    const { x, y, w } = this.inventoryHintBoxGeom;
    if (!this.inventoryHintText.text) {
      this.inventoryHintBg.clear();
      return;
    }
    const height = Math.max(22, this.inventoryHintText.height + 8);
    this.inventoryHintBg.clear();
    if (this.useAowebSkin) {
      this.inventoryHintBg.fillStyle(0x120e08, 0.45);
      this.inventoryHintBg.fillRoundedRect(x, y, w, height, 3);
      return;
    }
    this.inventoryHintBg.fillStyle(0x0a0c10, 0.92);
    this.inventoryHintBg.fillRoundedRect(x, y, w, height, 4);
    this.inventoryHintBg.lineStyle(1, COLORS.panelBorder, 1);
    this.inventoryHintBg.strokeRoundedRect(x + 0.5, y + 0.5, w - 1, height - 1, 4);
  }

  private setupInventorySlotInput() {
    this.inventoryPanel.slots.forEach((slot, slotIndex) => {
      slot.setInteractive({ useHandCursor: true });
  
      slot.on("pointerover", () => {
        const hint = this.inventoryHoverHandler?.(slotIndex);
        this.setInventoryHint(hint ?? "");
      });
      slot.on("pointerout", () => {
        this.setInventoryHint("");
      });

      slot.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        const now = this.scene.time.now;
        this.setSelectedInventorySlot(slotIndex);
        this.inventoryDragState = {
          fromSlotIndex: slotIndex,
          startX: pointer.x,
          startY: pointer.y,
        };
  
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

    if (!this.inventoryDragPointerUpBound) {
      this.scene.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
        if (!this.inventoryDragState || !this.inventorySlotMoveHandler) {
          this.inventoryDragState = null;
          return;
        }

        const { fromSlotIndex, startX, startY } = this.inventoryDragState;
        this.inventoryDragState = null;

        const dragDistance = Phaser.Math.Distance.Between(startX, startY, pointer.x, pointer.y);
        if (dragDistance < 8) {
          return;
        }

        const toSlotIndex = this.getInventorySlotIndexAt(pointer.x, pointer.y);
        if (toSlotIndex < 0 || toSlotIndex === fromSlotIndex) {
          return;
        }

        this.setSelectedInventorySlot(toSlotIndex);
        this.inventorySlotMoveHandler(fromSlotIndex, toSlotIndex);
      });
      this.inventoryDragPointerUpBound = true;
    }
  }

  private getInventorySlotIndexAt(screenX: number, screenY: number): number {
    if (!this.inventoryPanel.container.visible) {
      return -1;
    }
    const baseX = this.inventoryPanel.container.x;
    const baseY = this.inventoryPanel.container.y;
    for (let slotIndex = 0; slotIndex < this.inventoryPanel.slots.length; slotIndex += 1) {
      const slot = this.inventoryPanel.slots[slotIndex];
      const x = baseX + slot.x;
      const y = baseY + slot.y;
      const w = slot.displayWidth;
      const h = slot.displayHeight;
      if (screenX >= x && screenX <= x + w && screenY >= y && screenY <= y + h) {
        return slotIndex;
      }
    }
    return -1;
  }

  setEquippedItemIds(itemIds: Iterable<string>) {
    this.equippedItemIds = new Set(itemIds);
    for (let slotIndex = 0; slotIndex < this.inventoryPanel.slots.length; slotIndex += 1) {
      this.updateInventoryEquippedLabel(slotIndex);
    }
  }

  setInventorySlot(
    slotIndex: number,
    textureKey: string,
    count = 1,
    itemId?: string
  ) {
    const slot = this.inventoryPanel.slots[slotIndex];
  
    if (!slot) return;

    this.inventorySlotItemIds[slotIndex] = itemId ?? null;
  
    if (this.inventoryIcons[slotIndex]) {
      this.inventoryIcons[slotIndex].setTexture(textureKey);
      this.positionInventoryIcon(slotIndex);
      this.inventoryIcons[slotIndex].setVisible(true);
    } else {
      const icon = this.scene.add.image(0, 0, textureKey);
      icon.setOrigin(0.5, 0.5);
      icon.setScrollFactor(0);
  
      this.inventoryPanel.container.add(icon);
      this.inventoryIcons[slotIndex] = icon;
  
      this.positionInventoryIcon(slotIndex);
    }

    this.updateInventoryStackLabel(slotIndex, count);
    this.updateInventoryEquippedLabel(slotIndex);
  }
  
  clearInventorySlot(slotIndex: number) {
    const icon = this.inventoryIcons[slotIndex];
  
    if (icon) {
      icon.setVisible(false);
    }

    this.inventorySlotItemIds[slotIndex] = null;

    const label = this.inventoryStackLabels[slotIndex];
    if (label) {
      label.setVisible(false);
    }

    const equippedLabel = this.inventoryEquippedLabels[slotIndex];
    if (equippedLabel) {
      equippedLabel.setVisible(false);
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
          fontFamily: GAME_FONT,
          fontSize: "10px",
          color: "#f5f5f5",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 3,
          resolution: GAME_TEXT_RESOLUTION,
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

  private updateInventoryEquippedLabel(slotIndex: number) {
    const itemId = this.inventorySlotItemIds[slotIndex];
    const equipped = itemId != null && this.equippedItemIds.has(itemId);
    if (!equipped) {
      const existing = this.inventoryEquippedLabels[slotIndex];
      if (existing) {
        existing.setVisible(false);
      }
      return;
    }

    let label = this.inventoryEquippedLabels[slotIndex];
    if (!label) {
      label = this.scene.add
        .text(0, 0, "E", {
          fontFamily: GAME_FONT,
          fontSize: "10px",
          color: "#ffe08a",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 3,
          resolution: GAME_TEXT_RESOLUTION,
        })
        .setScrollFactor(0);
      label.setOrigin(0, 0);
      this.inventoryPanel.container.add(label);
      this.inventoryEquippedLabels[slotIndex] = label;
    }

    label.setVisible(true);
    this.positionInventoryEquippedLabel(slotIndex);
  }

  private positionInventoryEquippedLabel(slotIndex: number) {
    const label = this.inventoryEquippedLabels[slotIndex];
    if (!label) return;

    const anchor = this.inventoryPanel.getSlotTopLeft(slotIndex);
    label.setPosition(anchor.x, anchor.y);
  }
  
  private positionInventoryIcon(slotIndex: number) {
    const icon = this.inventoryIcons[slotIndex];
    const slot = this.inventoryPanel.slots[slotIndex];

    if (!icon || !slot) return;

    const center = this.inventoryPanel.getSlotCenter(slotIndex);
    icon.setPosition(center.x, center.y);

    const frame = icon.frame;
    const srcW = Math.max(1, frame.width);
    const srcH = Math.max(1, frame.height);
    const maxDim =
      Math.min(slot.displayWidth, slot.displayHeight) * INVENTORY_ICON_FILL;
    const scale = maxDim / Math.max(srcW, srcH);
    icon.setScale(scale);
  }

  private makeText(
    content: string,
    size: number,
    color: string,
    bold = false
  ): Phaser.GameObjects.Text {
    return this.scene.add
      .text(0, 0, content, {
        fontFamily: GAME_FONT,
        fontSize: `${size}px`,
        color,
        fontStyle: bold ? "bold" : "normal",
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setScrollFactor(0);
  }

  private getSpellPanelMinHeight(): number {
    const rowStride = SPELL_ROW_HEIGHT + SPELL_ROW_GAP;
    const listH = SPELL_MIN_VISIBLE_ROWS * rowStride - SPELL_ROW_GAP;
    return listH + SPELL_PANEL_FOOTER;
  }

  private getSpellPanelMaskTargets(): Phaser.GameObjects.Components.Mask[] {
    return [
      this.spellPanelBg,
      this.spellSelectionGfx,
      this.spellCastBtn,
      this.spellCastLabel,
      this.spellScrollHintText,
      ...this.spellRows,
    ];
  }

  private applySpellPanelMask() {
    for (const target of this.getSpellPanelMaskTargets()) {
      target.setMask(this.inventoryClipMask);
    }
  }

  private clearSpellPanelMask() {
    for (const target of this.getSpellPanelMaskTargets()) {
      target.clearMask();
    }
  }

  private layoutSpellPanelForSkin(panel: { x: number; y: number; w: number; h: number }) {
    const panelX = panel.x;
    const panelY = panel.y;
    const panelW = panel.w;
    const panelH = panel.h;
    const listPad = 8;
    const footerH = SPELL_PANEL_FOOTER_SKIN;
    const listX = panelX + listPad;
    const listY = panelY + listPad;
    const listW = panelW - listPad * 2;
    const listH = panelH - footerH - listPad;
    const rowStride = SPELL_ROW_HEIGHT + SPELL_ROW_GAP;

    this.spellVisibleRows = Math.min(
      SPELL_MAX_VISIBLE_ROWS,
      Math.max(1, Math.floor((listH + SPELL_ROW_GAP) / rowStride))
    );

    const maxScroll = Math.max(0, this.spells.length - this.spellVisibleRows);
    this.spellScrollOffset = Phaser.Math.Clamp(this.spellScrollOffset, 0, maxScroll);
    this.selectedSpellIndex = Phaser.Math.Clamp(
      this.selectedSpellIndex,
      this.spells.length > 0 ? 0 : -1,
      Math.max(-1, this.spells.length - 1)
    );

    const listScrollH = Math.max(
      SPELL_ROW_HEIGHT,
      this.spellVisibleRows * rowStride - SPELL_ROW_GAP
    );
    this.spellListScrollGeom = { x: listX, y: listY, w: listW, h: listScrollH };

    this.spellPanelBg.clear();

    this.spellRows.forEach((row, rowIndex) => {
      const visible = rowIndex < this.spellVisibleRows;
      row.setVisible(visible);
      this.spellRowZones[rowIndex].setVisible(visible);
      if (!visible) return;

      const spellIndex = this.spellScrollOffset + rowIndex;
      const spell = this.spells[spellIndex];
      const rowY = listY + rowIndex * rowStride;
      row.setPosition(listX + 4, rowY + SPELL_ROW_HEIGHT / 2);
      row.setFontSize("10px");
      row.setText(spell ? spell.nombre : "");
      row.setColor(spellIndex === this.selectedSpellIndex ? "#ffe08a" : "#e8dcc0");
      this.spellRowZones[rowIndex].setPosition(listX, rowY).setSize(listW, SPELL_ROW_HEIGHT);
    });

    this.spellSelectionGfx.clear();
    if (this.selectedSpellIndex >= this.spellScrollOffset) {
      const selectedRow = this.selectedSpellIndex - this.spellScrollOffset;
      if (selectedRow >= 0 && selectedRow < this.spellVisibleRows) {
        const selectedY = listY + selectedRow * rowStride;
        this.spellSelectionGfx.fillStyle(0x4a3820, 0.45);
        this.spellSelectionGfx.fillRect(listX, selectedY, listW, SPELL_ROW_HEIGHT);
      }
    }

    const castY = panelY + panelH - footerH;
    const castH = footerH - 4;
    this.drawConfirmButton(this.spellCastBtn, panelX + listPad, castY, listW, castH);
    this.spellCastZone.setPosition(panelX + listPad, castY).setSize(listW, castH);
    this.spellCastLabel.setPosition(panelX + panelW / 2, castY + castH / 2);

    [
      this.spellUpBtn,
      this.spellDownBtn,
      this.spellScrollUpBtn,
      this.spellScrollDownBtn,
      this.spellInfoBtn,
      this.spellUpZone,
      this.spellDownZone,
      this.spellScrollUpZone,
      this.spellScrollDownZone,
      this.spellInfoZone,
      this.spellUpLabel,
      this.spellDownLabel,
      this.spellScrollUpLabel,
      this.spellScrollDownLabel,
      this.spellInfoLabel,
    ].forEach((obj) => obj.setVisible(false));

    if (maxScroll > 0) {
      const firstVisible = this.spellScrollOffset + 1;
      const lastVisible = Math.min(
        this.spells.length,
        this.spellScrollOffset + this.spellVisibleRows
      );
      this.spellScrollHintText
        .setText(`${firstVisible}-${lastVisible}/${this.spells.length}`)
        .setPosition(listX, castY - 12)
        .setFontSize("8px")
        .setVisible(true);
    } else {
      this.spellScrollHintText.setText("").setVisible(false);
    }

    this.applySpellPanelMask();
  }

  private getSidebarPanelHeight(): number {
    if (this.useAowebSkin) {
      const h = this.scene.scale.height;
      return scaleSkinY(AOWEB_SKIN_REGIONS.inventoryPanel.h, h);
    }
    return Math.max(this.inventoryPanel.height, this.getSpellPanelMinHeight());
  }

  private relayoutAowebSkin(w: number, h: number) {
    const sidebarX = w - this.sidebarWidth;
    const bodyBottom = h - this.macroBarHeight;
    const gameVp = getSkinGameViewport(w, h);

    this.uiSkinFrame.setPosition(0, 0).setDisplaySize(w, h).setVisible(true);
    // Recorta el marco para dejar "agujero" donde se renderiza el mundo.
    this.skinViewportMaskGfx.clear();
    this.skinViewportMaskGfx.fillStyle(0xffffff, 1);
    // Franja superior
    this.skinViewportMaskGfx.fillRect(0, 0, w, gameVp.y);
    // Franja inferior
    this.skinViewportMaskGfx.fillRect(0, gameVp.y + gameVp.height, w, Math.max(0, h - (gameVp.y + gameVp.height)));
    // Lateral izquierdo del viewport
    this.skinViewportMaskGfx.fillRect(0, gameVp.y, gameVp.x, gameVp.height);
    // Lateral derecho del viewport
    this.skinViewportMaskGfx.fillRect(
      gameVp.x + gameVp.width,
      gameVp.y,
      Math.max(0, w - (gameVp.x + gameVp.width)),
      gameVp.height
    );
    this.uiSkinFrame.setMask(this.skinViewportMaskGfx.createGeometryMask());
    this.chatPanel.clear();
    this.chatBgFrame.setVisible(false);
    this.sidebarPanel.clear();

    const chatHist = scaleSkinRect(AOWEB_SKIN_REGIONS.chatHistory, w, h);
    const chatToggleR = scaleSkinRect(AOWEB_SKIN_REGIONS.chatChannelToggle, w, h);
    const chatListBase = scaleSkinRect(AOWEB_SKIN_REGIONS.chatChannelList, w, h);
    const chatPadL = chatHist.x + SKIN_CHAT_PAD.left;
    const chatPadT = chatHist.y + SKIN_CHAT_PAD.top;
    const historyW = Math.max(120, chatHist.w - SKIN_CHAT_PAD.left - SKIN_CHAT_PAD.right);
    const historyH = Math.max(40, chatHist.h - SKIN_CHAT_PAD.top - SKIN_CHAT_PAD.bottom);
    const chatHistoryY = chatPadT;

    const channelLabel =
      this.chatTabs.find((t) => t.id === this.activeChatTab)?.label.text ?? "Chat";
    this.chatChannelToggleLabel
      .setText(channelLabel)
      .setPosition(chatToggleR.x + chatToggleR.w / 2, chatToggleR.y + chatToggleR.h / 2)
      .setFontSize("9px")
      .setColor("#ffe08a")
      .setVisible(!this.chatTabsExpanded);

    this.chatTabsToggleHit
      .setPosition(chatToggleR.x, chatToggleR.y)
      .setSize(chatToggleR.w, chatToggleR.h)
      .setVisible(true)
      .setDepth(UI_DEPTH + 12);

    const listTabH = Math.max(16, Math.floor(chatListBase.h / 3));
    const chatListR = {
      x: chatListBase.x,
      y: chatToggleR.y + chatToggleR.h,
      w: chatListBase.w,
      h: listTabH * 3,
    };

    this.chatTabs.forEach((tab, i) => {
      const tabX = chatListR.x;
      const tabY = chatListR.y + i * listTabH;
      const tabW = chatListR.w;
      const visible = this.chatTabsExpanded;
      const bg = this.chatTabBgFrames[i];
      if (visible) {
        bg.setPosition(tabX, tabY)
          .setDisplaySize(tabW, listTabH)
          .setAlpha(0.95)
          .setVisible(true)
          .setDepth(UI_DEPTH + 14);
      } else {
        bg.setVisible(false);
      }
      tab.label.setPosition(tabX + tabW / 2, tabY + listTabH / 2);
      tab.label.setColor(tab.id === this.activeChatTab ? "#ffe08a" : "#c8b898");
      tab.label.setVisible(visible);
      tab.label.setFontSize("9px");
      tab.label.setDepth(UI_DEPTH + 15);
      this.setupTabHitArea(tab.hit, tabX, tabY, tabW, listTabH);
      tab.hit.setVisible(visible);
      tab.hit.setAlpha(visible ? 0.01 : 0);
      tab.hit.setDepth(UI_DEPTH + 16);
      if (tab.hit.input) {
        tab.hit.input.enabled = visible;
      }
    });

    if (this.chatFocused) {
      this.chatInputBg.setVisible(true);
      this.chatInputText.setVisible(true);
      const inputY = chatHist.y + chatHist.h - 20;
      const inputW = Math.max(80, chatHist.w - 8);
      this.drawChatInput(chatHist.x + 4, inputY, inputW, 18, true);
      this.chatInputText.setPosition(chatHist.x + 8, inputY + 3);
      this.chatInputText.setText(`> ${this.chatInputValue}`);
      this.chatInputText.setColor("#e8dcc8");
    } else {
      this.chatInputBg.clear();
      this.chatInputBg.setVisible(false);
      this.chatInputText.setVisible(false);
      this.chatInputText.setText("");
    }

    this.chatTextArea = { x: chatPadL, y: chatHistoryY, w: historyW, h: historyH };
    this.chatText.setPosition(chatPadL, chatHistoryY);
    this.chatText.setWordWrapWidth(historyW);
    this.chatText.setFixedSize(historyW, historyH);
    this.chatText.setColor("#d4c4a8");

    this.chatMaskGfx.clear();
    this.chatMaskGfx.fillStyle(0xffffff, 1);
    this.chatMaskGfx.fillRect(chatPadL, chatHistoryY, historyW, historyH);
    this.renderChatHistory();

    const nameR = scaleSkinRect(AOWEB_SKIN_REGIONS.name, w, h);
    const expR = scaleSkinRect(AOWEB_SKIN_REGIONS.exp, w, h);
    const levelR = scaleSkinRect(AOWEB_SKIN_REGIONS.levelCircle, w, h);

    this.lvlNameExpFrame.setVisible(false);
    this.levelText
      .setPosition(levelR.x + levelR.w / 2, levelR.y + levelR.h / 2)
      .setOrigin(0.5, 0.5)
      .setFontSize("14px")
      .setColor("#e8dcc8")
      .setVisible(true);
    this.nameText
      .setPosition(nameR.x + nameR.w / 2, nameR.y + nameR.h / 2)
      .setOrigin(0.5, 0.5)
      .setFontSize("11px")
      .setWordWrapWidth(nameR.w - 8)
      .setVisible(true);
    this.expBarGeom = {
      x: expR.x + 2,
      y: expR.y + 2,
      w: Math.max(1, expR.w - 4),
      h: Math.max(4, expR.h - 4),
    };
    this.expSlotGeom = { x: expR.x, y: expR.y, w: expR.w, h: expR.h };
    this.expFill.setVisible(true);
    this.expLabelText
      .setPosition(expR.x + expR.w / 2, expR.y + expR.h / 2)
      .setFontSize("7px")
      .setVisible(true);

    const tabsR = scaleSkinRect(AOWEB_SKIN_REGIONS.tabs, w, h);
    const invTabGap = 4;
    const invTabW = Math.floor((tabsR.w - invTabGap * 2) / 3);
    const invTabH = tabsR.h;
    const tabPositions = [
      tabsR.x,
      tabsR.x + invTabW + invTabGap,
      tabsR.x + (invTabW + invTabGap) * 2,
    ];
    const tabLabels = [this.invTabLabel, this.spellsTabLabel, this.statsTabLabel];
    this.invTabBgFrames.forEach((bg) => bg.setVisible(false));
    tabLabels.forEach((label, i) => {
      label.setPosition(tabPositions[i] + invTabW / 2, tabsR.y + invTabH / 2);
      label.setColor("#c8b898").setVisible(false);
    });
    // En skin, las coordenadas exactas del PNG pueden quedar algo corridas respecto al escalado.
    // Aumentamos el área clickeable para que siempre respondan al click del usuario.
    const hitPadY = Math.max(6, Math.floor(invTabH * 0.35));
    const hitPadX = Math.max(6, Math.floor(invTabW * 0.12));
    const hitX0 = tabsR.y - hitPadY;
    const hitW = invTabW + hitPadX * 2;
    const hitH = invTabH + hitPadY * 2;

    this.invTabBtn.setVisible(true).setAlpha(0.01);
    this.spellsTabBtn.setVisible(true).setAlpha(0.01);
    this.statsTabBtn.setVisible(true).setAlpha(0.01);

    this.setupTabHitArea(this.invTabBtn, tabPositions[0] - hitPadX, hitX0, hitW, hitH);
    this.setupTabHitArea(this.spellsTabBtn, tabPositions[1] - hitPadX, hitX0, hitW, hitH);
    this.setupTabHitArea(this.statsTabBtn, tabPositions[2] - hitPadX, hitX0, hitW, hitH);

    const invPanelR = scaleSkinRect(AOWEB_SKIN_REGIONS.inventoryPanel, w, h);
    this.inventoryPanel.layoutSkinGridInPanel(AOWEB_SKIN_REGIONS.inventoryPanel, w, h);
    const sidebarPanelHeight = invPanelR.h;
    const invR = invPanelR;
    this.inventoryClipMaskGfx.clear();
    this.inventoryClipMaskGfx.fillStyle(0xffffff, 1);
    this.inventoryClipMaskGfx.fillRect(invR.x, invR.y, invR.w, invR.h);
    if (this.activeSidebarTab === "inventory") {
      this.inventoryPanel.container.setMask(this.inventoryClipMask);
    } else {
      this.inventoryPanel.container.clearMask();
    }
    const hintR = scaleSkinRect(AOWEB_SKIN_REGIONS.hint, w, h);
    this.inventoryHintBoxGeom = { x: hintR.x, y: hintR.y, w: hintR.w, h: hintR.h };
    this.inventoryHintText.setPosition(hintR.x + 6, hintR.y + 4);
    this.inventoryHintText.setWordWrapWidth(hintR.w - 12);
    this.inventoryHintText.setColor("#d8ccb0");

    const isInventoryTab = this.activeSidebarTab === "inventory";
    const isSpellsTab = this.activeSidebarTab === "spells";
    // En skin nueva queremos que la lista de spells no quede tapada por los slots.
    // El inventario solo se ve cuando estamos en "inventory".
    this.inventoryPanel.container.setVisible(isInventoryTab);
    this.inventoryHintBg.setVisible(isInventoryTab);
    this.inventoryHintText.setVisible(isInventoryTab);
    this.spellPanelBg.setVisible(isSpellsTab);
    this.spellSelectionGfx.setVisible(isSpellsTab);
    [
      this.spellUpBtn,
      this.spellDownBtn,
      this.spellScrollUpBtn,
      this.spellScrollDownBtn,
      this.spellInfoBtn,
      this.spellCastBtn,
      this.spellUpZone,
      this.spellDownZone,
      this.spellScrollUpZone,
      this.spellScrollDownZone,
      this.spellInfoZone,
      this.spellCastZone,
      this.spellUpLabel,
      this.spellDownLabel,
      this.spellScrollUpLabel,
      this.spellScrollDownLabel,
      this.spellScrollHintText,
      this.spellInfoLabel,
      this.spellCastLabel,
      ...this.spellRows,
      ...this.spellRowZones,
    ].forEach((obj) => obj.setVisible(isSpellsTab));

    if (isInventoryTab) {
      this.redrawInventoryInvalidSlots();
    }

    if (isSpellsTab) {
      this.layoutSpellPanelForSkin(invR);
    } else {
      this.clearSpellPanelMask();
      this.spellPanelBg.clear();
      this.spellSelectionGfx.clear();
      this.spellListScrollGeom = { x: 0, y: 0, w: 0, h: 0 };
    }

    this.inventoryIcons.forEach((icon, slotIndex) => {
      if (icon) this.positionInventoryIcon(slotIndex);
    });
    this.inventoryStackLabels.forEach((label, slotIndex) => {
      if (label?.visible) this.positionInventoryStackLabel(slotIndex);
    });
    this.inventoryEquippedLabels.forEach((label, slotIndex) => {
      if (label?.visible) this.positionInventoryEquippedLabel(slotIndex);
    });
    this.redrawInventorySelection();
    this.redrawInventoryHintBox();

    const hpR = scaleSkinRect(AOWEB_SKIN_REGIONS.hpBar, w, h);
    const mpR = scaleSkinRect(AOWEB_SKIN_REGIONS.mpBar, w, h);
    const goldR = scaleSkinRect(AOWEB_SKIN_REGIONS.gold, w, h);
    const strR = scaleSkinRect(AOWEB_SKIN_REGIONS.strengthSlot, w, h);
    const agiR = scaleSkinRect(AOWEB_SKIN_REGIONS.agilitySlot, w, h);
    const vitalInset = { x: 2, y: 1, w: 4, h: 2 };
    this.hpLabel.setVisible(false);
    this.mpLabel.setVisible(false);
    this.goldText
      .setPosition(goldR.x + 4, goldR.y + goldR.h / 2)
      .setOrigin(0, 0.5)
      .setColor("#f5d76e")
      .setFontSize("11px")
      .setVisible(true);
    this.strengthPotionIcon.setVisible(false);
    this.strengthValueText
      .setPosition(strR.x + strR.w - 8, strR.y + strR.h / 2)
      .setFontSize("15px")
      .setVisible(true);
    this.agilityPotionIcon.setVisible(false);
    this.agilityValueText
      .setPosition(agiR.x + agiR.w - 8, agiR.y + agiR.h / 2)
      .setFontSize("15px")
      .setVisible(true);
    this.applyAttributeStatColors();
    this.hpBarGeom = {
      x: hpR.x + vitalInset.x,
      y: hpR.y + vitalInset.y,
      w: Math.max(8, hpR.w - vitalInset.w),
      h: Math.max(4, hpR.h - vitalInset.h),
    };
    this.mpBarGeom = {
      x: mpR.x + vitalInset.x,
      y: mpR.y + vitalInset.y,
      w: Math.max(8, mpR.w - vitalInset.w),
      h: Math.max(4, mpR.h - vitalInset.h),
    };
    this.hpLabel
      .setPosition(this.hpBarGeom.x + this.hpBarGeom.w / 2, this.hpBarGeom.y + this.hpBarGeom.h / 2)
      .setOrigin(0.5, 0.5)
      .setFontSize("8px")
      .setColor("#f2f2f2")
      .setVisible(true);
    this.mpLabel
      .setPosition(this.mpBarGeom.x + this.mpBarGeom.w / 2, this.mpBarGeom.y + this.mpBarGeom.h / 2)
      .setOrigin(0.5, 0.5)
      .setFontSize("8px")
      .setColor("#f2f2f2")
      .setVisible(true);

    const minimapR = scaleSkinRect(AOWEB_SKIN_REGIONS.minimap, w, h);
    const minimapSize = Math.min(minimapR.w, minimapR.h);
    this.minimapGeom = {
      x: minimapR.x + Math.floor((minimapR.w - minimapSize) / 2),
      y: minimapR.y + Math.floor((minimapR.h - minimapSize) / 2),
      size: minimapSize,
    };
    this.mapNameText.setOrigin(1, 0);
    this.mapNameText.setPosition(w - 8 + this.mapNameOffset.x, 6 + this.mapNameOffset.y);
    this.mapNameText.setWordWrapWidth(140);
    this.mapNameText.setAlign("right");
    this.mapNameText.setColor("#d4c4a8").setFontSize("10px");

    const fullscreenBtnW = 24;
    const fullscreenBtnH = 18;
    const fullscreenBtnX = w - fullscreenBtnW - 6;
    const fullscreenBtnY = 4;
    this.fullscreenBtnBg
      .setPosition(fullscreenBtnX, fullscreenBtnY)
      .setDisplaySize(fullscreenBtnW, fullscreenBtnH)
      .setAlpha(0.85)
      .setVisible(true);
    this.fullscreenBtnLabel.setPosition(
      fullscreenBtnX + fullscreenBtnW / 2,
      fullscreenBtnY + fullscreenBtnH / 2
    );
    this.setupTabHitArea(
      this.fullscreenBtnHit,
      fullscreenBtnX,
      fullscreenBtnY,
      fullscreenBtnW,
      fullscreenBtnH
    );
    this.syncFullscreenButtonLabel();

    this.layoutMacroSlots(w, h);

    this.layoutConfirmDialog();
    this.layoutMacroEditorDialog();
    this.layoutStatsOverlay();
    this.refreshStats();
    this.bringSidebarHudToFront();
    this.bringSkinHudToFront();
    this.bringChatTabsToFront();
    this.minimapRedrawHandler?.();
    this.scene.events.emit("ui-viewport-changed");
  }

  /** Chat toggle y lista de canales siempre clickeables sobre el marco. */
  private bringChatTabsToFront() {
    const front: Phaser.GameObjects.GameObject[] = [
      ...this.chatTabBgFrames,
      this.chatTabsToggleHit,
      this.chatChannelToggleLabel,
      ...this.chatTabs.flatMap((tab) => [tab.hit, tab.label]),
    ];
    for (const obj of front) {
      this.root.bringToTop(obj);
    }
  }

  /** HP/MP/oro/nivel/minimapa por encima del marco de la skin. */
  private bringSkinHudToFront() {
    const hudFront: Phaser.GameObjects.GameObject[] = [
      this.expFill,
      this.expLabelText,
      this.hpFill,
      this.mpFill,
      this.goldText,
      this.strengthPotionIcon,
      this.agilityPotionIcon,
      this.strengthValueText,
      this.agilityValueText,
      this.levelText,
      this.nameText,
      this.minimapGfx,
      this.mapNameText,
      this.fullscreenBtnBg,
      this.fullscreenBtnHit,
      this.fullscreenBtnLabel,
      this.hpLabel,
      this.mpLabel,
      ...this.macroSlots.flatMap((s) => [s.hit, s.itemIcon, s.keyLabel]),
    ];
    for (const obj of hudFront) {
      this.root.bringToTop(obj);
    }
  }

  private relayout = () => {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    if (this.useAowebSkin) {
      this.relayoutAowebSkin(w, h);
      return;
    }
    this.uiSkinFrame.setVisible(false);
    this.uiSkinFrame.clearMask();
    this.inventoryPanel.container.clearMask();
    this.strengthPotionIcon.setVisible(false);
    this.agilityPotionIcon.setVisible(false);
    this.strengthValueText.setVisible(false);
    this.agilityValueText.setVisible(false);
    const sidebarX = w - this.sidebarWidth;
    const bodyTop = 0;
    const bodyBottom = h - this.macroBarHeight;
    const pad = 10;
    const innerW = this.sidebarWidth - pad * 2;

    this.chatPanel.clear();
    const chatFrameW = sidebarX;
    const chatFrameH = this.chatHeight;
    this.chatBgFrame
      .setPosition(0, 0)
      .setDisplaySize(chatFrameW, chatFrameH)
      .setVisible(true);

    const chatPadL = Math.round(chatFrameW * VENTANA_CHAT_LAYOUT.padLeft);
    const chatPadR = Math.round(chatFrameW * VENTANA_CHAT_LAYOUT.padRight);
    const chatPadT = Math.round(chatFrameH * VENTANA_CHAT_LAYOUT.padTop);
    const chatPadB = Math.round(chatFrameH * VENTANA_CHAT_LAYOUT.padBottom);

    this.sidebarPanel.clear();

    const chatInputH = CHAT_PANEL_LAYOUT.inputHeight;
    const innerChatW = Math.max(160, chatFrameW - chatPadL - chatPadR);
    const chatHistoryY = chatPadT;
    const historyW = innerChatW;

    const fondoNativeChat = getTextureNativeSize(
      this.scene,
      FONDO_BOTONES_TEXTURE_KEY,
      FONDO_BOTONES_FALLBACK_SIZE
    );
    const chatTabGap = CHAT_PANEL_LAYOUT.tabGap;

    const bottomRowY = chatFrameH - chatPadB - chatInputH;
    const chatTabH = chatInputH;
    const chatTabW = Math.max(
      CHAT_PANEL_LAYOUT.minTabWidth,
      Math.round(chatTabH * (fondoNativeChat.w / fondoNativeChat.h))
    );
    const tabsRowW = chatTabW * 3 + chatTabGap * 2;
    const chatMainW = Math.max(80, innerChatW - tabsRowW - CHAT_PANEL_LAYOUT.columnGap);
    const buttonsX = chatPadL + chatMainW + CHAT_PANEL_LAYOUT.columnGap;
    const historyH = Math.max(
      40,
      chatFrameH - chatHistoryY - chatPadB
    );

    this.chatTabBgFrames.forEach((bg, i) => {
      const tabX = buttonsX + 46 + i * (chatTabW + chatTabGap);
      const tabY = bottomRowY + 26;
      bg.setPosition(tabX, tabY)
        .setDisplaySize(chatTabW, chatTabH)
        .setAlpha(1)
        .setVisible(true);
      this.chatTabs[i].label.setPosition(tabX + chatTabW / 2, tabY + chatTabH / 2);
      this.chatTabs[i].label.setColor("#c8d0dc").setVisible(true);
      this.setupTabHitArea(this.chatTabs[i].hit, tabX, tabY, chatTabW, chatTabH);
    });
    this.chatTabsToggleHit.setVisible(false);
    this.chatChannelToggleLabel.setVisible(false);

    if (this.chatFocused) {
      this.chatInputBg.setVisible(true);
      this.chatInputText.setVisible(true);
      this.drawChatInput(chatPadL, bottomRowY, chatMainW, chatInputH, true);
      this.chatInputText.setPosition(chatPadL + 8, bottomRowY + 3);
      this.chatInputText.setText(`> ${this.chatInputValue}`);
      this.chatInputText.setColor("#ffffff");
    } else {
      this.chatInputBg.clear();
      this.chatInputBg.setVisible(false);
      this.chatInputText.setVisible(false);
      this.chatInputText.setText("");
    }

    this.chatTextArea = {
      x: chatPadL,
      y: chatHistoryY,
      w: historyW,
      h: historyH,
    };

    this.chatText.setPosition(chatPadL, chatHistoryY);
    this.chatText.setWordWrapWidth(historyW);
    this.chatText.setFixedSize(historyW, historyH);

    this.chatMaskGfx.clear();
    this.chatMaskGfx.fillStyle(0xffffff, 1);
    this.chatMaskGfx.fillRect(chatPadL, chatHistoryY, historyW, historyH);
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
    this.inventoryEquippedLabels.forEach((label, slotIndex) => {
      if (label?.visible) {
        this.positionInventoryEquippedLabel(slotIndex);
      }
    });
    this.redrawInventorySelection();
    this.layoutConfirmDialog();
    this.layoutMacroEditorDialog();

    this.drawPanel(
      this.sidebarPanel,
      sidebarX,
      bodyTop,
      this.sidebarWidth,
      bodyBottom - bodyTop
    );
    this.sidebarPanel.setDepth(0);

    let y = bodyTop + pad;
    y = this.layoutLvlNameExpPanel(sidebarX, y, pad, innerW);

    const inventoryTabsY = y;
    const invTabGap = 4;
    const invTabW = Math.floor((innerW - invTabGap * 2) / 3);
    const fondoNative = getTextureNativeSize(
      this.scene,
      FONDO_BOTONES_TEXTURE_KEY,
      FONDO_BOTONES_FALLBACK_SIZE
    );
    const invTabH = Math.max(20, Math.round(invTabW * (fondoNative.h / fondoNative.w)));
    const tab1X = sidebarX + pad;
    const tab2X = tab1X + invTabW + invTabGap;
    const tab3X = tab2X + invTabW + invTabGap;
    const tabPositions = [tab1X, tab2X, tab3X];
    const tabLabels = [this.invTabLabel, this.spellsTabLabel, this.statsTabLabel];

    this.invTabBgFrames.forEach((bg, i) => {
      const tabX = tabPositions[i];
      bg.setPosition(tabX, inventoryTabsY)
        .setDisplaySize(invTabW, invTabH)
        .setAlpha(1)
        .setVisible(true);
      tabLabels[i].setPosition(tabX + invTabW / 2, inventoryTabsY + invTabH / 2);
      tabLabels[i].setColor("#c8d0dc");
    });

    this.setupTabHitArea(this.invTabBtn, tab1X, inventoryTabsY, invTabW, invTabH);
    this.setupTabHitArea(this.spellsTabBtn, tab2X, inventoryTabsY, invTabW, invTabH);
    this.setupTabHitArea(this.statsTabBtn, tab3X, inventoryTabsY, invTabW, invTabH);
    y += invTabH + 10;

    const inventoryPanelY = y + 8;
    const sidebarPanelHeight = this.getSidebarPanelHeight();
    this.inventoryPanel.container.setPosition(sidebarX + pad, inventoryPanelY);
    const hintY = inventoryPanelY + sidebarPanelHeight + 4;
    this.inventoryHintBoxGeom = { x: sidebarX + pad, y: hintY, w: innerW, h: 22 };
    this.inventoryHintText.setPosition(sidebarX + pad + 6, hintY + 4);
    this.inventoryHintText.setWordWrapWidth(innerW - 12);
    this.redrawInventoryHintBox();
    const isInventoryTab = this.activeSidebarTab === "inventory";
    const isSpellsTab = this.activeSidebarTab === "spells";
    this.inventoryPanel.container.setVisible(isInventoryTab);
    this.inventoryHintBg.setVisible(isInventoryTab);
    this.inventoryHintText.setVisible(isInventoryTab);
    this.spellPanelBg.setVisible(isSpellsTab);
    this.spellSelectionGfx.setVisible(isSpellsTab);
    this.spellUpBtn.setVisible(isSpellsTab);
    this.spellDownBtn.setVisible(isSpellsTab);
    this.spellScrollUpBtn.setVisible(isSpellsTab);
    this.spellScrollDownBtn.setVisible(isSpellsTab);
    this.spellInfoBtn.setVisible(isSpellsTab);
    this.spellCastBtn.setVisible(isSpellsTab);
    this.spellUpZone.setVisible(isSpellsTab);
    this.spellDownZone.setVisible(isSpellsTab);
    this.spellScrollUpZone.setVisible(isSpellsTab);
    this.spellScrollDownZone.setVisible(isSpellsTab);
    this.spellInfoZone.setVisible(isSpellsTab);
    this.spellCastZone.setVisible(isSpellsTab);
    this.spellUpLabel.setVisible(isSpellsTab);
    this.spellDownLabel.setVisible(isSpellsTab);
    this.spellScrollUpLabel.setVisible(isSpellsTab);
    this.spellScrollDownLabel.setVisible(isSpellsTab);
    this.spellScrollHintText.setVisible(isSpellsTab);
    this.spellInfoLabel.setVisible(isSpellsTab);
    this.spellCastLabel.setVisible(isSpellsTab);
    this.spellRows.forEach((row) => row.setVisible(isSpellsTab));
    this.spellRowZones.forEach((zone) => zone.setVisible(isSpellsTab));

    if (isInventoryTab) {
      this.redrawInventoryInvalidSlots();
    }

    if (isSpellsTab) {
      const panelX = sidebarX + pad;
      const panelY = y + 8;
      const panelW = innerW;
      const panelH = sidebarPanelHeight;
      const listPad = 8;
      const listX = panelX + listPad;
      const listY = panelY + listPad;
      const listW = panelW - listPad * 2 - 26;
      const listH = panelH - SPELL_PANEL_FOOTER;
      const rowStride = SPELL_ROW_HEIGHT + SPELL_ROW_GAP;
      this.spellVisibleRows = Math.min(
        SPELL_MAX_VISIBLE_ROWS,
        Math.max(1, Math.floor((listH + SPELL_ROW_GAP) / rowStride))
      );
      const controlX = panelX + panelW - listPad - 22;

      this.spellPanelBg.clear();
      this.spellPanelBg.fillStyle(0x090b10, 0.94);
      this.spellPanelBg.fillRect(panelX, panelY, panelW, panelH);
      this.spellPanelBg.lineStyle(1, COLORS.panelBorder, 1);
      this.spellPanelBg.strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1);

      const maxScroll = Math.max(0, this.spells.length - this.spellVisibleRows);
      this.spellScrollOffset = Phaser.Math.Clamp(this.spellScrollOffset, 0, maxScroll);
      this.selectedSpellIndex = Phaser.Math.Clamp(this.selectedSpellIndex, this.spells.length > 0 ? 0 : -1, Math.max(-1, this.spells.length - 1));

      const listScrollH = Math.max(
        SPELL_ROW_HEIGHT,
        this.spellVisibleRows * rowStride - SPELL_ROW_GAP
      );
      this.spellListScrollGeom = { x: listX, y: listY, w: listW, h: listScrollH };
      const canScrollUp = maxScroll > 0 && this.spellScrollOffset > 0;
      const canScrollDown = maxScroll > 0 && this.spellScrollOffset < maxScroll;
      const canReorderUp = this.selectedSpellIndex > 0;
      const canReorderDown =
        this.selectedSpellIndex >= 0 && this.selectedSpellIndex < this.spells.length - 1;

      for (let rowIndex = 0; rowIndex < this.spellVisibleRows; rowIndex += 1) {
        const rowY = listY + rowIndex * rowStride;
        this.spellPanelBg.fillStyle(rowIndex % 2 === 0 ? 0x11151c : 0x0d1016, 0.72);
        this.spellPanelBg.fillRect(listX, rowY, listW, SPELL_ROW_HEIGHT);
        if (rowIndex > 0) {
          this.spellPanelBg.lineStyle(1, 0x1c2430, 0.9);
          this.spellPanelBg.lineBetween(listX, rowY - Math.floor(SPELL_ROW_GAP / 2), listX + listW, rowY - Math.floor(SPELL_ROW_GAP / 2));
        }
      }

      this.spellRows.forEach((row, rowIndex) => {
        const visible = rowIndex < this.spellVisibleRows;
        row.setVisible(visible);
        this.spellRowZones[rowIndex].setVisible(visible);
        if (!visible) {
          return;
        }
        const spellIndex = this.spellScrollOffset + rowIndex;
        const spell = this.spells[spellIndex];
        const rowY = listY + rowIndex * rowStride;
        row.setPosition(listX + 6, rowY + SPELL_ROW_HEIGHT / 2);
        row.setText(spell ? spell.nombre : "");
        row.setColor(spellIndex === this.selectedSpellIndex ? "#ffe08a" : "#d8dee8");
        this.spellRowZones[rowIndex]
          .setPosition(listX, rowY)
          .setSize(listW, SPELL_ROW_HEIGHT);
      });

      this.spellSelectionGfx.clear();
      if (this.selectedSpellIndex >= this.spellScrollOffset) {
        const selectedRow = this.selectedSpellIndex - this.spellScrollOffset;
        if (selectedRow >= 0 && selectedRow < this.spellVisibleRows) {
          const selectedY = listY + selectedRow * rowStride;
          this.spellSelectionGfx.fillStyle(0x243248, 0.55);
          this.spellSelectionGfx.fillRect(listX, selectedY, listW, SPELL_ROW_HEIGHT);
          this.spellSelectionGfx.lineStyle(1, 0x6a8fbf, 1);
          this.spellSelectionGfx.strokeRect(
            listX + 0.5,
            selectedY + 0.5,
            listW - 1,
            SPELL_ROW_HEIGHT - 1
          );
        }
      }

      this.drawConfirmButton(this.spellUpBtn, controlX, listY, 22, 20);
      this.drawConfirmButton(this.spellDownBtn, controlX, listY + 24, 22, 20);
      this.drawConfirmButton(this.spellInfoBtn, controlX, listY + 48, 22, 20);
      this.drawConfirmButton(this.spellScrollUpBtn, controlX, listY + 72, 22, 16);
      this.drawConfirmButton(this.spellScrollDownBtn, controlX, listY + 90, 22, 16);
      this.drawConfirmButton(this.spellCastBtn, panelX + listPad, panelY + panelH - 26, panelW - listPad * 2, 20);

      this.spellUpBtn.setAlpha(canReorderUp ? 1 : 0.35);
      this.spellDownBtn.setAlpha(canReorderDown ? 1 : 0.35);
      this.spellScrollUpBtn.setAlpha(canScrollUp ? 1 : 0.35);
      this.spellScrollDownBtn.setAlpha(canScrollDown ? 1 : 0.35);
      this.spellUpZone.setPosition(controlX, listY).setSize(22, 20);
      this.spellDownZone.setPosition(controlX, listY + 24).setSize(22, 20);
      this.spellUpZone.input!.enabled = canReorderUp;
      this.spellDownZone.input!.enabled = canReorderDown;
      this.spellScrollUpZone.setPosition(controlX, listY + 72).setSize(22, 16);
      this.spellScrollDownZone.setPosition(controlX, listY + 90).setSize(22, 16);
      this.spellScrollUpZone.input!.enabled = canScrollUp;
      this.spellScrollDownZone.input!.enabled = canScrollDown;
      this.spellInfoZone.setPosition(controlX, listY + 48).setSize(22, 20);
      this.spellCastZone
        .setPosition(panelX + listPad, panelY + panelH - 26)
        .setSize(panelW - listPad * 2, 20);

      this.spellUpLabel.setPosition(controlX + 11, listY + 10).setAlpha(canReorderUp ? 1 : 0.35);
      this.spellDownLabel.setPosition(controlX + 11, listY + 34).setAlpha(canReorderDown ? 1 : 0.35);
      this.spellScrollUpLabel.setPosition(controlX + 11, listY + 80).setAlpha(canScrollUp ? 1 : 0.35);
      this.spellScrollDownLabel
        .setPosition(controlX + 11, listY + 98)
        .setAlpha(canScrollDown ? 1 : 0.35);
      if (maxScroll > 0) {
        const firstVisible = this.spellScrollOffset + 1;
        const lastVisible = Math.min(this.spells.length, this.spellScrollOffset + this.spellVisibleRows);
        this.spellScrollHintText
          .setText(`${firstVisible}-${lastVisible}/${this.spells.length}`)
          .setPosition(listX, panelY + panelH - 40)
          .setVisible(true);
      } else {
        this.spellScrollHintText.setText("").setVisible(false);
      }
      this.spellInfoLabel.setPosition(controlX + 11, listY + 58);
      this.spellCastLabel.setPosition(panelX + panelW / 2, panelY + panelH - 16);
    } else {
      this.spellPanelBg.clear();
      this.spellSelectionGfx.clear();
      this.spellListScrollGeom = { x: 0, y: 0, w: 0, h: 0 };
    }
    const inventoryHintReserveH = 30;
    y = hintY + inventoryHintReserveH;

    const vitalBarW = Math.max(72, Math.floor(innerW / 2));
    const vitalsX = sidebarX + pad + Math.floor(innerW * 0.38);
    const goldX = sidebarX + pad;

    this.goldText.setPosition(goldX, y + 2);
    this.hpLabel.setPosition(vitalsX, y);
    const hpBarY = y + 12;
    this.hpBarGeom = { x: vitalsX, y: hpBarY, w: vitalBarW, h: 10 };
    y += 28;

    this.mpLabel.setPosition(vitalsX, y);
    const mpBarY = y + 12;
    this.mpBarGeom = { x: vitalsX, y: mpBarY, w: vitalBarW, h: 10 };

    const minimapSize = Math.min(MINIMAP_SIZE, innerW);
    const minimapX = sidebarX + pad + Math.floor((innerW - minimapSize) / 2);
    const minimapY = bodyBottom - pad - minimapSize;
    this.minimapGeom = {
      x: minimapX,
      y: minimapY,
      size: minimapSize,
    };

    const mapNameGap = 6;
    this.mapNameText.setOrigin(0.5, 1);
    this.mapNameText.setPosition(minimapX + minimapSize / 2, minimapY - mapNameGap);
    // Ajuste manual persistente para la nueva UI / escalados.
    this.mapNameText.x += this.mapNameOffset.x;
    this.mapNameText.y += this.mapNameOffset.y;
    this.mapNameText.setWordWrapWidth(minimapSize);
    this.mapNameText.setAlign("center");

    const fullscreenBtnW = 30;
    const fullscreenBtnH = 22;
    const fullscreenBtnX = sidebarX + pad + innerW - fullscreenBtnW;
    const fullscreenBtnY = minimapY - fullscreenBtnH - mapNameGap - 4;
    this.fullscreenBtnBg
      .setPosition(fullscreenBtnX, fullscreenBtnY)
      .setDisplaySize(fullscreenBtnW, fullscreenBtnH)
      .setVisible(true);
    this.fullscreenBtnLabel.setPosition(
      fullscreenBtnX + fullscreenBtnW / 2,
      fullscreenBtnY + fullscreenBtnH / 2
    );
    this.setupTabHitArea(
      this.fullscreenBtnHit,
      fullscreenBtnX,
      fullscreenBtnY,
      fullscreenBtnW,
      fullscreenBtnH
    );
    this.syncFullscreenButtonLabel();

    this.layoutMacroSlots(w, h);

    this.layoutStatsOverlay();
    this.refreshStats();
    this.bringSidebarHudToFront();
    this.minimapRedrawHandler?.();
  };

  private ensureMacroPlaceholderTexture() {
    if (this.scene.textures.exists(MACRO_PLACEHOLDER_TEXTURE_KEY)) {
      return;
    }

    const g = this.scene.add.graphics();
    g.fillStyle(0xffffff, 0.001);
    g.fillRect(0, 0, 1, 1);
    g.generateTexture(MACRO_PLACEHOLDER_TEXTURE_KEY, 1, 1);
    g.destroy();
  }

  private drawChatInput(
    x: number,
    y: number,
    w: number,
    h: number,
    focused = this.chatFocused
  ) {
    this.chatInputBg.clear();

    this.chatInputBg.fillStyle(focused ? 0x111722 : 0x0b0d13, 1);
    this.chatInputBg.fillRect(x, y, w, h);

    this.chatInputBg.lineStyle(1, focused ? 0xffe566 : 0x4c5363, 1);
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
    if (s.nameColor) {
      this.nameText.setColor(s.nameColor);
    }
    this.levelText.setText(String(s.level));
    if (this.useAowebSkin) {
      const expPct = s.expMax > 0 ? Math.round((s.exp / s.expMax) * 100) : 0;
      this.expLabelText.setText(`${expPct}%`);
    } else {
      this.expLabelText.setText(`${s.exp}/${s.expMax}`);
    }
    this.fitExpLabelText();
    this.goldText.setText(
      this.useAowebSkin
        ? s.gold.toLocaleString("es-AR")
        : `Oro: ${s.gold.toLocaleString("es-AR")}`
    );
    if (this.useAowebSkin) {
      this.hpLabel.setText(`${s.hp}/${s.hpMax}`);
      this.mpLabel.setText(`${s.mp}/${s.mpMax}`);
      this.hpLabel.setVisible(true);
      this.mpLabel.setVisible(true);
    } else {
      this.hpLabel.setText(`HP ${s.hp}/${s.hpMax}`);
      this.mpLabel.setText(`MP ${s.mp}/${s.mpMax}`);
    }
    if (this.useAowebSkin) {
      this.hpLabel.setVisible(true);
      this.mpLabel.setVisible(true);
    }

    this.drawExpBar(this.expFill, this.expBarGeom, expPct);
    const hpColors = this.useAowebSkin
      ? { bg: 0x3d1515, fill: 0xc0392b }
      : { bg: COLORS.hpBg, fill: COLORS.hp };
    const mpColors = this.useAowebSkin
      ? { bg: 0x1f2b33, fill: 0x3f6f8e }
      : { bg: COLORS.mpBg, fill: COLORS.mp };
    this.drawBar(
      this.hpFill,
      this.hpBarGeom,
      s.hpMax > 0 ? s.hp / s.hpMax : 0,
      hpColors.bg,
      hpColors.fill,
      this.useAowebSkin,
      this.useAowebSkin ? 0.78 : 1
    );
    this.drawBar(
      this.mpFill,
      this.mpBarGeom,
      s.mpMax > 0 ? s.mp / s.mpMax : 0,
      mpColors.bg,
      mpColors.fill,
      this.useAowebSkin
    );
  }

  private layoutLvlNameExpPanel(
    sidebarX: number,
    y: number,
    pad: number,
    innerW: number
  ): number {
    const native = getLvlNameExpNativeSize(this.scene);
    const maxBlockH = 52;
    const scale = Math.min(innerW / native.w, maxBlockH / native.h);
    const frameW = Math.max(1, Math.round(native.w * scale));
    const frameH = Math.max(1, Math.round(native.h * scale));
    const frameX = sidebarX + pad + Math.floor((innerW - frameW) / 2);
    const frameY = y;

    const texture = this.scene.textures.get(LVL_NAME_EXP_TEXTURE_KEY);
    if (texture.key !== "__MISSING") {
      this.lvlNameExpFrame.setTexture(LVL_NAME_EXP_TEXTURE_KEY);
    }

    this.lvlNameExpFrame
      .setPosition(frameX, frameY)
      .setOrigin(0, 0)
      .setScale(1)
      .setDisplaySize(frameW, frameH)
      .setAlpha(1)
      .setVisible(texture.key !== "__MISSING");

    const levelFont = Math.max(10, Math.round(14 * scale));
    const nameFont = Math.max(8, Math.round(10 * scale));
    const cx = frameX + LVL_NAME_EXP_LAYOUT.circleCenterX * frameW;
    const cy = frameY + LVL_NAME_EXP_LAYOUT.circleCenterY * frameH;
    this.levelText
      .setPosition(cx, cy)
      .setOrigin(0.5, 0.5)
      .setFontSize(`${levelFont}px`)
      .setVisible(true);

    const nameW = LVL_NAME_EXP_LAYOUT.nameW * frameW;
    const nameH = LVL_NAME_EXP_LAYOUT.nameH * frameH;
    const nameX = frameX + LVL_NAME_EXP_LAYOUT.nameX * frameW;
    const nameY = frameY + LVL_NAME_EXP_LAYOUT.nameY * frameH;
    this.nameText
      .setPosition(nameX + nameW / 2, nameY + nameH / 2)
      .setOrigin(0.5, 0.5)
      .setFontSize(`${nameFont}px`)
      .setWordWrapWidth(Math.max(24, nameW - 6))
      .setVisible(true);

    const slotX = frameX + LVL_NAME_EXP_LAYOUT.expBarX * frameW;
    const slotY = frameY + LVL_NAME_EXP_LAYOUT.expBarY * frameH;
    const slotW = LVL_NAME_EXP_LAYOUT.expBarW * frameW;
    const slotH = LVL_NAME_EXP_LAYOUT.expBarH * frameH;
    const padX = LVL_NAME_EXP_LAYOUT.expBarPadX * frameW;
    const padY = LVL_NAME_EXP_LAYOUT.expBarPadY * frameH;
    const barX = slotX + padX;
    const barY = slotY + padY;
    const barW = Math.max(1, slotW - padX * 2);
    const barH = Math.max(4, slotH - padY * 2);
    this.expBarGeom = { x: barX, y: barY, w: barW, h: barH };
    this.expFill.setVisible(true);

    this.expSlotGeom = { x: slotX, y: slotY, w: slotW, h: slotH };
    this.expLabelFontPx = Math.max(7, Math.round(8 * scale));
    this.expLabelText
      .setPosition(slotX + slotW / 2, slotY + slotH / 2)
      .setOrigin(0.5, 0.5)
      .setFontSize(`${this.expLabelFontPx}px`)
      .setVisible(true);
    this.fitExpLabelText();

    return frameY + frameH + 8;
  }

  private fitExpLabelText() {
    const slot = this.expSlotGeom;
    const maxW = Math.max(8, slot.w - 4);
    let size = this.expLabelFontPx;
    this.expLabelText.setFontSize(`${size}px`);
    while (size > 6 && this.expLabelText.width > maxW) {
      size -= 1;
      this.expLabelText.setFontSize(`${size}px`);
    }
    this.expLabelText.setPosition(slot.x + slot.w / 2, slot.y + slot.h / 2);
  }

  private bringSidebarHudToFront() {
    const front: Phaser.GameObjects.GameObject[] = [
      ...this.invTabBgFrames,
      this.invTabLabel,
      this.spellsTabLabel,
      this.statsTabLabel,
      this.invTabBtn,
      this.spellsTabBtn,
      this.statsTabBtn,
    ];
    for (const obj of front) {
      this.root.bringToTop(obj);
    }
  }

  private drawExpBar(g: Phaser.GameObjects.Graphics, geom: BarGeom, ratio: number) {
    if (geom.w <= 0) {
      g.clear();
      return;
    }

    g.clear();
    g.fillStyle(COLORS.expBg, 0.85);
    g.fillRect(geom.x, geom.y, geom.w, geom.h);
    const fillW = Math.max(0, Math.floor(geom.w * Phaser.Math.Clamp(ratio, 0, 1)));
    if (fillW > 0) {
      g.fillStyle(COLORS.exp, 1);
      g.fillRect(geom.x, geom.y, fillW, geom.h);
    }
  }

  private drawBar(
    g: Phaser.GameObjects.Graphics,
    geom: BarGeom,
    ratio: number,
    bgColor: number,
    fillColor: number,
    skinMode = false,
    fillAlpha = 1
  ) {
    if (geom.w <= 0) {
      return;
    }

    g.clear();
    g.fillStyle(bgColor, skinMode ? 0.45 : 1);
    g.fillRect(geom.x, geom.y, geom.w, geom.h);
    const fillW = Math.max(0, Math.floor(geom.w * ratio));
    if (fillW > 0) {
      g.fillStyle(fillColor, fillAlpha);
      g.fillRect(geom.x, geom.y, fillW, geom.h);
    }
    if (!skinMode) {
      g.lineStyle(1, COLORS.panelBorder, 1);
      g.strokeRect(geom.x + 0.5, geom.y + 0.5, geom.w - 1, geom.h - 1);
    }
  }
}
