import Phaser from "phaser";
import {
  isMinimapLegacyRoofTile,
  MINIMAP_LEGACY_ROOF_COLOR,
} from "../../shared/mapWalkability";
import { computeMinimapCellSize, minimapTileCenterPx } from "../../shared/minimapLayout";
import { isWaterTile } from "../../shared/navigation";
import { getTileDefinition, TILE } from "../maps/tileDefinitions";
import type { GameMap } from "../maps/types";
import type { SpellDefinition } from "../data/spells";
import { GAME_FONT, GAME_TEXT_RESOLUTION } from "./fonts";
import { isPhaserObjectLive } from "./phaserObjectUtils";
import { getGameViewport, UI_LAYOUT } from "./layout";
import { createInventoryPanel, type InventoryPanel } from "./inventoryPanel";
import { PartyOverlay } from "./partyOverlay";
import { AuctionOverlay, AuctionViewState } from "./auctionOverlay";
import { DropItemOverlay } from "./DropItemOverlay";
import { SimpleConfirmOverlay } from "./SimpleConfirmOverlay";
import { OptionsOverlay } from "./optionsOverlay";
import { applyMasterVolume } from "../config/audioSettings";
import { getItemDefinition } from "../items/itemDefinitions";
import {
  type AowebUiSkinVariant,
  FONDO_BOTONES_FALLBACK_SIZE,
  getAowebSkinTextureKey,
  getAowebSkinVariant,
  setAowebSkinVariant,
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
  getAowebSkinLayout,
  getAowebSkinMacroSlotMetrics,
  getAowebSkinRegions,
  getSkinDerivedLayout,
  getSkinMinimapContentRect,
  scaleSkinRect,
  scaleSkinX,
  scaleSkinY,
  usesMinimapFrameOverlay,
  usesViewportFrameOverlay,
} from "./aowebSkinLayout";
import { ATTRIBUTE_POTION_BUFF_MAX, STAT_MAX } from "../../game-data/constants";
import { INVENTORY_COLS, INVENTORY_ROWS, INVENTORY_SLOT_COUNT } from "../game/characterProgressStorage";

/** Posición X nativa del centro de cada ranura de la barra de macros. */


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
  imperialKilled?: number;
  armadaKilled?: number;
  caosKilled?: number;
  renegadeKilled?: number;
};

const UI_DEPTH = 1000;
const MACRO_COUNT = 10;
const INVENTORY_SLOT_SCALE = 1.12;
/** Fracción del casillero que ocupa el ícono (ancho/alto). */
const INVENTORY_ICON_FILL = 0.9;
const INVENTORY_GAP = 1;
const SPELL_ROW_HEIGHT = 14;
const SPELL_ROW_GAP = 2;
const SPELL_MIN_VISIBLE_ROWS = 8;
const SPELL_PANEL_FOOTER = 50;
const SPELL_PANEL_FOOTER_SKIN = 26;
const SPELL_SKIN_CONTROL_COL_W = 22;
const SPELL_MAX_VISIBLE_ROWS = 12;
const INVENTORY_PADDING = 20;
const MINIMAP_SIZE = 112;
const SKIN_CHAT_PAD = { left: 8, right: 10, top: 4, bottom: 4 } as const;
const CHAT_HISTORY_FONT_SIZE = 10;
const CHAT_HISTORY_LINE_HEIGHT = 13;
const HUD_STRENGTH_POTION_TEXTURE_KEY = "hud_strength_potion_icon";
const HUD_AGILITY_POTION_TEXTURE_KEY = "hud_agility_potion_icon";
/** Tamaños probados de mayor a menor para que el texto quepa en la barra. */
const VITAL_BAR_LABEL_FONT_SIZES = [11, 10, 9] as const;
const VITAL_BAR_LABEL_STROKE = "#1a1208";
const VITAL_BAR_LABEL_STROKE_THICKNESS = 4;
const VITAL_BAR_LABEL_RESOLUTION = 3;
const EXP_LABEL_SKIN_FONT_SIZES = [10, 9, 8] as const;
/** Desplazamiento vertical del texto de EXP respecto al centro del slot (px nativos skin). */
const EXP_LABEL_SKIN_Y_OFFSET = 25;

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
const UI_MINIMAP_OFFSET_KEY = "ui_minimap_offset";
const UI_MINIMAP_SCALE_KEY = "ui_minimap_scale";
const DEFAULT_MINIMAP_SLOT_SCALE = 1.1;
const CHAT_TAB_ORDER = ["chat", "combat", "global"] as const;
type ChatTabId = (typeof CHAT_TAB_ORDER)[number];
type ChatEntry = { text: string; channel: ChatTabId };
const MACRO_PLACEHOLDER_TEXTURE_KEY = "macroPlaceholder";
const MACRO_ACTIONS = ["cast_spell", "use_item", "equip_item"] as const;
export type MacroActionType = (typeof MACRO_ACTIONS)[number];
export type MacroEditorItemOption = {
  itemId: string;
  label: string;
  /** Casillero de inventario al que corresponde esta opción. */
  slotIndex: number;
};
export type MacroEditorSpellOption = { spellId: number; label: string };
export type MacroEditorConfig = {
  slotIndex: number;
  keyCode: string | null;
  action: MacroActionType;
  selectedItemId: string | null;
  selectedInventorySlotIndex: number | null;
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
  nivelRequerido: number;
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
  private loadingItemTextureKeys = new Set<string>();
  private equippedItemIds = new Set<string>();
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private sidebarWidth = UI_LAYOUT.sidebarWidth;
  private macroBarHeight = UI_LAYOUT.macroBarHeight;
  private chatHeight = UI_LAYOUT.chatHeight;

  private stats: PlayerHudStats = { ...DEFAULT_STATS };

  private chatPanel!: Phaser.GameObjects.Graphics;
  private uiSkinFrame!: Phaser.GameObjects.Image;
  private skinViewportMaskGfx!: Phaser.GameObjects.Graphics;
  private chatBgFrame!: Phaser.GameObjects.Image;
  private sidebarPanel!: Phaser.GameObjects.Graphics;
  private useAowebSkin = false;

  private mapNameText!: Phaser.GameObjects.Text;
  private mapCoordsText!: Phaser.GameObjects.Text;
  private mapNameOffset = { x: 0, y: 0 };
  private minimapOffset = { x: 0, y: 0 };
  private minimapSlotScale = DEFAULT_MINIMAP_SLOT_SCALE;
  private minimapLayoutTuneActive = false;
  private minimapLayoutTuneTarget: "minimap" | "mapname" = "minimap";
  private minimapTuneHintText!: Phaser.GameObjects.Text;
  private minimapMaskGfx!: Phaser.GameObjects.Graphics;
  private minimapMask?: Phaser.Display.Masks.GeometryMask;
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
  private sentChatHistory: string[] = [];
  private sentChatHistoryIndex = -1;
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
  /** Última geometría de cada slot (para reescalar iconos tras cambiar textura). */
  private macroSlotMetrics: { cx: number; cy: number; size: number }[] = [];
  private macroSlotClickHandler?: (slotIndex: number) => void;
  private activeSidebarTab: "inventory" | "spells" = "inventory";
  private statsTabBtn!: Phaser.GameObjects.Graphics;
  private statsTabLabel!: Phaser.GameObjects.Text;
  private inventoryOptionsMenuVisible = false;
  private inventoryOptionsMenu!: Phaser.GameObjects.Container;
  private inventoryOptionsMenuDim!: Phaser.GameObjects.Graphics;
  private readonly inventoryOptionsMenuEntries: {
    id: "options" | "stats";
    bg: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    hit: Phaser.GameObjects.Zone;
  }[] = [];
  private inventoryPanelGeom = { x: 0, y: 0, w: 0, h: 0 };
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
  private statsKillTexts: Phaser.GameObjects.Text[] = [];
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
    selectedInventorySlotIndex: null,
    itemOptions: [],
    selectedSpellId: null,
    spellOptions: [],
  };
  private macroEditorSaveHandler: ((config: MacroEditorConfig) => void) | null = null;
  private macroEditorItemOptionsForAction:
    | ((action: MacroActionType) => MacroEditorItemOption[])
    | null = null;
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
  private spellPanelContentGeom = { x: 0, y: 0, w: 0, h: 0 };
  private selectedSpellIndex = 0;
  private spellInfoRequestHandler?: (spell: SpellInfoRequest) => void;
  private spellCastRequestHandler?: (spell: SpellInfoRequest) => void;
  private spellOrderChangeHandler?: (orderedSpellIds: number[]) => void;
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

  private expBarGeom: BarGeom = { x: 0, y: 0, w: 0, h: 8 };
  private expSlotGeom: BarGeom = { x: 0, y: 0, w: 0, h: 8 };
  private expLabelFontPx = 8;
  private expLabelYOffset = 0;
  private hpBarGeom: BarGeom = { x: 0, y: 0, w: 0, h: 10 };
  private mpBarGeom: BarGeom = { x: 0, y: 0, w: 0, h: 10 };
  private minimapGeom = { x: 0, y: 0, w: 0, h: 0 };
  private minimapRedrawHandler: (() => void) | null = null;
  private fullscreenBtnBg!: Phaser.GameObjects.Image;
  private fullscreenBtnHit!: Phaser.GameObjects.Graphics;
  private fullscreenBtnLabel!: Phaser.GameObjects.Text;
  private partyOverlay!: PartyOverlay;
  private auctionOverlay!: AuctionOverlay;
  private dropItemOverlay!: DropItemOverlay;
  private simpleConfirmOverlay!: SimpleConfirmOverlay;
  private optionsOverlay!: OptionsOverlay;
  private partyMemberIds = new Set<string>();


  getContainer(): Phaser.GameObjects.Container {
    return this.root;
  }

  isUsingAowebSkin(): boolean {
    return this.useAowebSkin;
  }

  getActiveAowebSkinVariant(): AowebUiSkinVariant {
    return getAowebSkinVariant();
  }

  /** Cambia el marco AOWEB en caliente (persiste en localStorage). */
  switchAowebSkinVariant(variant: AowebUiSkinVariant): boolean {
    const textureKey = getAowebSkinTextureKey(variant);
    if (!this.scene.textures.exists(textureKey)) {
      return false;
    }
    setAowebSkinVariant(variant);
    this.useAowebSkin = true;
    this.uiSkinFrame.setTexture(textureKey).setVisible(true);
    this.relayout();
    this.scene.events.emit("ui-viewport-changed");
    return true;
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
    applyMasterVolume(scene);

    // Ajuste manual persistente para la posición del "nombre de mapa".
    try {
      const raw = localStorage.getItem(UI_MAPNAME_OFFSET_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { x?: number; y?: number };
        this.mapNameOffset = {
          x: typeof parsed.x === "number" && Number.isFinite(parsed.x) ? parsed.x : 0,
          y: typeof parsed.y === "number" && Number.isFinite(parsed.y) ? parsed.y : 0,
        };
      }
    } catch {
      this.mapNameOffset = { x: 0, y: 0 };
    }

    try {
      const raw = localStorage.getItem(UI_MINIMAP_OFFSET_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { x?: number; y?: number };
        this.minimapOffset = {
          x: typeof parsed.x === "number" && Number.isFinite(parsed.x) ? parsed.x : 0,
          y: typeof parsed.y === "number" && Number.isFinite(parsed.y) ? parsed.y : 0,
        };
      }
    } catch {
      this.minimapOffset = { x: 0, y: 0 };
    }

    try {
      const rawScale = localStorage.getItem(UI_MINIMAP_SCALE_KEY);
      if (rawScale !== null) {
        const parsedScale = parseFloat(rawScale);
        if (Number.isFinite(parsedScale) && parsedScale > 0) {
          this.minimapSlotScale = parsedScale;
        }
      }
    } catch {
      this.minimapSlotScale = DEFAULT_MINIMAP_SLOT_SCALE;
    }

    this.build();
    this.optionsOverlay = new OptionsOverlay({
      onBindingsChanged: () => this.scene.events.emit("ui-keybindings-changed"),
      onVolumeChanged: (volume) => applyMasterVolume(this.scene, volume),
      onSkinVariantChanged: (variant) => {
        if (!this.switchAowebSkinVariant(variant)) {
          this.addChatLine(`No se pudo cargar la UI ${variant}.`);
        }
      },
    });
    this.relayout();

    scene.scale.on("resize", this.relayout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off("resize", this.relayout, this);
      this.optionsOverlay.destroy();
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
    this.mapNameText.setText(name.trim());
    this.mapCoordsText.setText(`${tileX}, ${tileY}`);
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

  nudgeMapNameOffset(dxPx: number, dyPx: number) {
    this.setMapNameOffset(this.mapNameOffset.x + dxPx, this.mapNameOffset.y + dyPx);
  }

  resetMapNameOffset() {
    this.setMapNameOffset(0, 0);
  }

  getMapNameOffset() {
    return { ...this.mapNameOffset };
  }

  setMinimapOffset(dxPx: number, dyPx: number) {
    this.minimapOffset = { x: dxPx, y: dyPx };
    try {
      localStorage.setItem(UI_MINIMAP_OFFSET_KEY, JSON.stringify(this.minimapOffset));
    } catch {
      // ignore
    }
    this.relayout();
  }

  nudgeMinimapOffset(dxPx: number, dyPx: number) {
    this.setMinimapOffset(this.minimapOffset.x + dxPx, this.minimapOffset.y + dyPx);
  }

  resetMinimapOffset() {
    this.setMinimapOffset(0, 0);
  }

  setMinimapSlotScale(scale: number) {
    const next = Phaser.Math.Clamp(scale, 0.5, 1.5);
    if (next === this.minimapSlotScale) {
      return;
    }
    this.minimapSlotScale = next;
    try {
      localStorage.setItem(UI_MINIMAP_SCALE_KEY, String(next));
    } catch {
      // ignore
    }
    this.relayout();
  }

  nudgeMinimapSlotScale(delta: number) {
    this.setMinimapSlotScale(this.minimapSlotScale + delta);
  }

  getMinimapSlotScale() {
    return this.minimapSlotScale;
  }

  resetMinimapLayout() {
    this.minimapSlotScale = 1;
    try {
      localStorage.removeItem(UI_MINIMAP_SCALE_KEY);
    } catch {
      // ignore
    }
    this.setMinimapOffset(0, 0);
  }

  getMinimapOffset() {
    return { ...this.minimapOffset };
  }

  setMinimapLayoutTuneActive(active: boolean) {
    this.minimapLayoutTuneActive = active;
    this.refreshMinimapTuneHint();
    this.relayout();
  }

  isMinimapLayoutTuneActive() {
    return this.minimapLayoutTuneActive;
  }

  getMinimapLayoutTuneSummary() {
    const mm = this.getMinimapOffset();
    const mn = this.getMapNameOffset();
    const scale = this.getMinimapSlotScale();
    return (
      `minimap x=${mm.x} y=${mm.y} scale=${scale.toFixed(2)} | mapname x=${mn.x} y=${mn.y} ` +
      `(localStorage: ${UI_MINIMAP_OFFSET_KEY}, ${UI_MINIMAP_SCALE_KEY}, ${UI_MAPNAME_OFFSET_KEY})`
    );
  }

  private applyMinimapLayout(rect: { x: number; y: number; w: number; h: number }) {
    const scale = this.minimapSlotScale;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const nw = Math.max(8, Math.round(rect.w * scale));
    const nh = Math.max(8, Math.round(rect.h * scale));
    return {
      x: Math.round(cx - nw / 2 + this.minimapOffset.x),
      y: Math.round(cy - nh / 2 + this.minimapOffset.y),
      w: nw,
      h: nh,
    };
  }

  private getMinimapDrawRect() {
    const { x, y, w, h } = this.minimapGeom;
    if (w <= 0 || h <= 0) {
      return { x, y, w, h };
    }
    // Evita artefactos en los bordes del PNG (rayas laterales).
    if (this.useAowebSkin && usesMinimapFrameOverlay()) {
      const insetX = Math.min(2, Math.floor(w / 8));
      const insetY = Math.min(1, Math.floor(h / 10));
      return {
        x: x + insetX,
        y: y + insetY,
        w: Math.max(4, w - insetX * 2),
        h: Math.max(4, h - insetY * 2),
      };
    }
    return { x, y, w, h };
  }

  private refreshMinimapTuneHint() {
    if (!this.minimapTuneHintText) {
      return;
    }
    if (!this.minimapLayoutTuneActive) {
      this.minimapTuneHintText.setVisible(false);
      return;
    }
    const mm = this.getMinimapOffset();
    const mn = this.getMapNameOffset();
    const targetLabel =
      this.minimapLayoutTuneTarget === "minimap" ? "MINIMAPA" : "NOMBRE MAPA";
    this.minimapTuneHintText.setText(
      `[AJUSTE UI · ${targetLabel}] minimap x=${mm.x} y=${mm.y} scale=${this.minimapSlotScale.toFixed(2)} | nombre x=${mn.x} y=${mn.y}\n` +
        "Flechas mover · +/- tamaño · Tab cambiar · R reset · I info · Esc salir"
    );
    this.minimapTuneHintText.setVisible(true);
    this.root.bringToTop(this.minimapTuneHintText);
  }

  private handleMinimapLayoutTuneKey(event: KeyboardEvent): boolean {
    if (!this.minimapLayoutTuneActive || this.chatFocused) {
      return false;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      this.setMinimapLayoutTuneActive(false);
      return true;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      this.minimapLayoutTuneTarget =
        this.minimapLayoutTuneTarget === "minimap" ? "mapname" : "minimap";
      this.refreshMinimapTuneHint();
      return true;
    }

    if (event.key === "1") {
      event.preventDefault();
      this.minimapLayoutTuneTarget = "minimap";
      this.refreshMinimapTuneHint();
      return true;
    }

    if (event.key === "2") {
      event.preventDefault();
      this.minimapLayoutTuneTarget = "mapname";
      this.refreshMinimapTuneHint();
      return true;
    }

    if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      if (this.minimapLayoutTuneTarget === "minimap") {
        this.resetMinimapLayout();
      } else {
        this.resetMapNameOffset();
      }
      this.refreshMinimapTuneHint();
      return true;
    }

    if (this.minimapLayoutTuneTarget === "minimap") {
      const scaleStep = event.shiftKey ? 0.05 : 0.02;
      if (event.key === "-" || event.key === "Subtract") {
        event.preventDefault();
        this.nudgeMinimapSlotScale(-scaleStep);
        this.refreshMinimapTuneHint();
        return true;
      }
      if (event.key === "+" || event.key === "=" || event.key === "Add") {
        event.preventDefault();
        this.nudgeMinimapSlotScale(scaleStep);
        this.refreshMinimapTuneHint();
        return true;
      }
    }

    if (event.key === "i" || event.key === "I") {
      event.preventDefault();
      this.scene.events.emit("ui-minimap-layout-info", this.getMinimapLayoutTuneSummary());
      return true;
    }

    const step = event.shiftKey ? 5 : 1;
    let dx = 0;
    let dy = 0;
    if (event.key === "ArrowLeft") dx = -step;
    else if (event.key === "ArrowRight") dx = step;
    else if (event.key === "ArrowUp") dy = -step;
    else if (event.key === "ArrowDown") dy = step;
    else return false;

    event.preventDefault();
    if (this.minimapLayoutTuneTarget === "minimap") {
      this.nudgeMinimapOffset(dx, dy);
    } else {
      this.nudgeMapNameOffset(dx, dy);
    }
    this.refreshMinimapTuneHint();
    return true;
  }

  setSpells(spells: SpellDefinition[]) {
    const previousSpellId =
      this.selectedSpellIndex >= 0 ? this.spells[this.selectedSpellIndex]?.idSpell : null;
    this.spells = [...spells];
    if (previousSpellId != null) {
      const nextIndex = this.spells.findIndex((spell) => spell.idSpell === previousSpellId);
      this.selectedSpellIndex = nextIndex >= 0 ? nextIndex : this.spells.length > 0 ? 0 : -1;
    } else {
      this.selectedSpellIndex = this.spells.length > 0 ? 0 : -1;
    }
    this.ensureSelectedSpellVisible();
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

  isOptionsOverlayOpen() {
    return this.optionsOverlay?.isOpen() ?? false;
  }

  isAuctionOverlayOpen() {
    return this.auctionOverlay?.isOpen() ?? false;
  }

  hideAuctionOverlay() {
    this.auctionOverlay?.hide();
  }


  showAuctionOverlay(state: AuctionViewState) {
    this.auctionOverlay.show(getGameViewport(this.scene.scale.width, this.scene.scale.height), state);
  }

  refreshAuctionOverlay(state: AuctionViewState) {
    this.auctionOverlay.refresh(state);
  }

  getAuctionOverlayDomObjects() {
    return this.auctionOverlay.getDomObjects();
  }


  toggleStatsOverlay() {
    if (this.statsOverlayVisible) {
      this.closeStatsOverlay();
      return;
    }
    this.statsOverlayVisible = true;
    this.statsOverlay.setVisible(true);
    this.relayout();
  }

  closeStatsOverlay() {
    this.statsOverlayVisible = false;
    this.statsOverlay.setVisible(false);
    this.relayout();
    if (this.inventoryOptionsMenuVisible) {
      this.layoutInventoryOptionsMenu();
      this.root.bringToTop(this.inventoryOptionsMenu);
    }
  }

  handleServerPartyUpdate(message: import("../../shared/protocol").ServerPartyUpdateMessage) {
    this.partyMemberIds = new Set(message.members.map((member) => member.id));
    this.partyOverlay.updateParty(message.partyId, message.leaderId, message.members);
    this.minimapRedrawHandler?.();
  }

  getPartyMemberIds(): ReadonlySet<string> {
    return this.partyMemberIds;
  }

  handleServerPartyInviteRequest(message: import("../../shared/protocol").ServerPartyInviteRequestMessage) {
    this.showConfirm(
      `${message.leaderName} te invita a su grupo.`,
      () => this.scene.events.emit("ui-party-action", { action: "accept", leaderId: message.leaderId }),
      () => {}
    );
  }

  togglePartyOverlay() {
    if (this.partyOverlay.isOpen()) {
      this.partyOverlay.hide();
      return;
    }
    this.scene.events.emit("ui-request-party-show");
  }

  showPartyOverlay(localPlayerId: string | null) {
    this.partyOverlay.show(localPlayerId);
  }

  isPartyOverlayOpen() {
    return this.partyOverlay.isOpen();
  }

  private toggleInventoryOptionsMenu() {
    if (this.inventoryOptionsMenuVisible) {
      this.closeInventoryOptionsMenu();
      return;
    }
    this.activeSidebarTab = "inventory";
    this.inventoryOptionsMenuVisible = true;
    this.inventoryOptionsMenu.setVisible(true);
    this.statsTabLabel.setColor("#ffffff");
    this.relayout();
    this.layoutInventoryOptionsMenu();
    this.root.bringToTop(this.inventoryOptionsMenu);
  }

  private closeInventoryOptionsMenu() {
    if (!this.inventoryOptionsMenuVisible) {
      return;
    }
    this.inventoryOptionsMenuVisible = false;
    this.inventoryOptionsMenu.setVisible(false);
    if (!this.useAowebSkin) {
      this.statsTabLabel.setColor("#c8d0dc");
    }
    this.relayout();
  }

  private handleInventoryOptionsMenuPick(id: "options" | "stats") {
    if (id === "stats") {
      if (!this.statsOverlayVisible) {
        this.toggleStatsOverlay();
      }
      return;
    }
    this.closeInventoryOptionsMenu();
    this.optionsOverlay.toggle();
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

  setSpellOrderChangeHandler(handler: (orderedSpellIds: number[]) => void) {
    this.spellOrderChangeHandler = handler;
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

  private canRenderChat(): boolean {
    return Boolean(this.scene.sys?.isActive() && isPhaserObjectLive(this.chatText));
  }

  private renderChatHistory() {
    if (!this.canRenderChat()) {
      return;
    }
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
    bounds?: { minTileX: number; minTileY: number; maxTileX: number; maxTileY: number },
    partyMembers: Array<{ tileX: number; tileY: number }> = []
  ) {
    const g = this.minimapGfx;
    const { x, y, w, h } = this.getMinimapDrawRect();
    if (w <= 0 || h <= 0) {
      return;
    }

    g.clear();
    this.syncMinimapMask();

    const minimapBgAlpha = this.useAowebSkin ? 0.55 : 0.92;
    g.fillStyle(0x121a24, minimapBgAlpha);
    if (this.useAowebSkin) {
      g.fillRect(x, y, w, h);
    } else {
      g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 6);
      g.lineStyle(1, 0x5a6d88, 1);
      g.strokeRoundedRect(x - 1.5, y - 1.5, w + 3, h + 3, 6);
    }

    const minTileX = bounds?.minTileX ?? 0;
    const minTileY = bounds?.minTileY ?? 0;
    const maxTileX = bounds?.maxTileX ?? map.width - 1;
    const maxTileY = bounds?.maxTileY ?? map.height - 1;
    const renderW = Math.max(1, maxTileX - minTileX + 1);
    const renderH = Math.max(1, maxTileY - minTileY + 1);

    const cell = computeMinimapCellSize(w, h, renderW, renderH);
    const mapPixelW = renderW * cell;
    const mapPixelH = renderH * cell;
    const offsetX = x + Math.floor((w - mapPixelW) / 2);
    const offsetY = y + Math.floor((h - mapPixelH) / 2);

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const tileId = map.tiles[ty]?.[tx] ?? TILE.GRASS;
        const def = getTileDefinition(tileId);
        let color = def.color;

        if (isWaterTile(map, tx, ty)) {
          color = 0x2a6a9e;
        } else if (tileId === TILE.DIRT) {
          color = 0x6b5238;
        } else if (!def.walkable && tileId !== TILE.TREE) {
          color = 0x3d3020;
        } else if (tileId === TILE.TREE) {
          color = 0x2d6b34;
        } else if (def.isPortal) {
          color = 0xc9b060;
        }

        if (map.legacyCsmData && isMinimapLegacyRoofTile(map, tx, ty)) {
          color = MINIMAP_LEGACY_ROOF_COLOR;
        }

        const cellX = offsetX + (tx - minTileX) * cell;
        const cellY = offsetY + (ty - minTileY) * cell;
        g.fillStyle(color, 1);
        g.fillRect(cellX, cellY, cell, cell);
        if (cell >= 3 && !def.walkable) {
          g.fillStyle(0x000000, 0.12);
          g.fillRect(cellX, cellY, cell, cell);
        }
      }
    }

    const clampedPlayerX = Phaser.Math.Clamp(playerTileX, minTileX, maxTileX);
    const clampedPlayerY = Phaser.Math.Clamp(playerTileY, minTileY, maxTileY);
    const originX = offsetX - x;
    const originY = offsetY - y;
    const px = x + minimapTileCenterPx(clampedPlayerX, minTileX, cell, originX);
    const py = y + minimapTileCenterPx(clampedPlayerY, minTileY, cell, originY);
    const markerR = Math.max(2, Math.floor(cell * 0.35));
    for (const member of partyMembers) {
      if (
        member.tileX < minTileX ||
        member.tileX > maxTileX ||
        member.tileY < minTileY ||
        member.tileY > maxTileY
      ) {
        continue;
      }
      const mx = x + minimapTileCenterPx(member.tileX, minTileX, cell, originX);
      const my = y + minimapTileCenterPx(member.tileY, minTileY, cell, originY);
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(mx, my, markerR);
      g.fillStyle(0x2f80ed, 1);
      g.fillCircle(mx, my, Math.max(1, markerR - 1));
    }

    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(px, py, markerR);
    g.fillStyle(0xe74c3c, 1);
    g.fillCircle(px, py, Math.max(1, markerR - 1));
  }

  private layoutMinimapLabels(
    minimapRect: { x: number; y: number; w: number; h: number },
    screenH: number,
    gapAboveMinimap = 0
  ) {
    const minLabelX = minimapRect.x + 8;
    const maxLabelX = minimapRect.x + Math.max(8, minimapRect.w - 8);
    const centerX = Phaser.Math.Clamp(
      minimapRect.x + minimapRect.w / 2 + this.mapNameOffset.x,
      minLabelX,
      maxLabelX
    );

    if (this.useAowebSkin) {
      const layout = getAowebSkinLayout();
      const labelPadBottom = scaleSkinY(layout.minimapLabelPadBottom ?? 8, screenH);
      const lineGap = scaleSkinY(13, screenH);
      const mmCenterX = centerX;
      const coordsY = Phaser.Math.Clamp(
        minimapRect.y + minimapRect.h - labelPadBottom + 40 + scaleSkinY(8, screenH) + this.mapNameOffset.y,
        minimapRect.y + lineGap + 4,
        minimapRect.y + minimapRect.h - 2 + 40
      );
      const nameY = coordsY - lineGap;
      const labelStroke = { color: "#000000", thickness: 2 };

      this.mapNameText.setOrigin(0.5, 1);
      this.mapNameText.setPosition(mmCenterX, nameY);
      this.mapNameText.setFontSize("11px");
      this.mapNameText.setColor("#f5ecd8");
      this.mapNameText.setStroke(labelStroke.color, labelStroke.thickness);
      this.mapNameText.setAlign("center");
      this.mapNameText.setVisible(true);
      this.mapNameText.setDepth(UI_DEPTH + 5);

      this.mapCoordsText.setOrigin(0.5, 1);
      this.mapCoordsText.setPosition(mmCenterX, coordsY);
      this.mapCoordsText.setFontSize("10px");
      this.mapCoordsText.setColor("#c8d8f0");
      this.mapCoordsText.setStroke(labelStroke.color, labelStroke.thickness);
      this.mapCoordsText.setVisible(true);
      this.mapCoordsText.setDepth(UI_DEPTH + 5);
      return;
    }

    const nameY = minimapRect.y - gapAboveMinimap + 8 + 40 + this.mapNameOffset.y;
    this.mapNameText.setOrigin(0.5, 1);
    this.mapNameText.setPosition(centerX, nameY);
    this.mapNameText.setFontSize("11px");
    this.mapNameText.setColor("#ffe566");
    this.mapNameText.setWordWrapWidth(minimapRect.w);
    this.mapNameText.setAlign("center");
    this.mapNameText.setVisible(true);
    this.mapNameText.setDepth(UI_DEPTH + 5);

    this.mapCoordsText.setOrigin(0.5, 1);
    this.mapCoordsText.setPosition(centerX, nameY - 13);
    this.mapCoordsText.setFontSize("10px");
    this.mapCoordsText.setColor("#b8c4d9");
    this.mapCoordsText.setVisible(true);
    this.mapCoordsText.setDepth(UI_DEPTH + 5);
  }

  private syncMinimapMask() {
    const { x, y, w, h } = this.getMinimapDrawRect();
    if (w <= 0 || h <= 0) {
      this.minimapGfx.clearMask();
      return;
    }
    this.minimapMaskGfx.clear();
    this.minimapMaskGfx.fillStyle(0xffffff, 1);
    this.minimapMaskGfx.fillRect(x, y, w, h);
    if (!this.minimapMask) {
      this.minimapMask = this.minimapMaskGfx.createGeometryMask();
    }
    this.minimapGfx.setMask(this.minimapMask);
  }

  private build() {
    this.chatPanel = this.scene.add.graphics().setScrollFactor(0);
    const skinTextureKey = getAowebSkinTextureKey();
    this.uiSkinFrame = this.scene.add
      .image(0, 0, skinTextureKey)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-1);
    this.skinViewportMaskGfx = this.scene.add.graphics().setScrollFactor(0).setVisible(false);
    this.useAowebSkin = this.scene.textures.exists(skinTextureKey);
    this.chatBgFrame = this.scene.add
      .image(0, 0, VENTANA_CHAT_TEXTURE_KEY)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.sidebarPanel = this.scene.add.graphics().setScrollFactor(0);

this.chatInputBg = this.scene.add.graphics().setScrollFactor(0);
this.chatMaskGfx = this.scene.add.graphics().setScrollFactor(0);
this.chatMaskGfx.setVisible(false);

this.mapNameText = this.makeText("", 11, "#ffe566", true);
    this.mapCoordsText = this.makeText("", 10, "#9eb0c8", false);
    this.minimapTuneHintText = this.makeText("", 10, "#ffe08a", true)
      .setOrigin(0, 0)
      .setStroke("#000000", 3)
      .setDepth(UI_DEPTH + 30)
      .setVisible(false);
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
    this.statsTabLabel = this.makeText("Opciones", 9, "#c8d0dc", true).setOrigin(0.5, 0.5);
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
    this.applyVitalBarLabelStyle(this.hpLabel);
    this.applyVitalBarLabelStyle(this.mpLabel);
    this.hpFill = this.scene.add.graphics().setScrollFactor(0);
    this.mpFill = this.scene.add.graphics().setScrollFactor(0);
    this.minimapMaskGfx = this.scene.add.graphics().setScrollFactor(0).setVisible(false);
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
    this.partyOverlay = new PartyOverlay(this.scene, {
      onInvite: (targetName) =>
        this.scene.events.emit("ui-party-action", { action: "invite", targetName }),
      onKick: (targetId) =>
        this.scene.events.emit("ui-party-action", { action: "kick", targetId }),
      onLeave: () => this.scene.events.emit("ui-party-action", { action: "leave" }),
      onDissolve: () => this.scene.events.emit("ui-party-action", { action: "dissolve" }),
      onClose: () => this.partyOverlay.hide(),
    });

    this.auctionOverlay = new AuctionOverlay(this.scene, {
      onClose: () => this.auctionOverlay.hide(),
      onBuy: (auctionId) => this.scene.events.emit("ui-auction-buy", auctionId),
      onList: (slotIndex, amount, price, durationHours) =>
        this.scene.events.emit("ui-auction-list", { slotIndex, amount, price, durationHours }),
      onCancel: (auctionId) => this.scene.events.emit("ui-auction-cancel", auctionId),
    });


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
      this.closeInventoryOptionsMenu();
      this.activeSidebarTab = "inventory";
      this.relayout();
    });
    this.spellsTabBtn.on("pointerdown", () => {
      this.closeInventoryOptionsMenu();
      this.activeSidebarTab = "spells";
      this.relayout();
    });
    this.statsTabBtn.on("pointerdown", () => {
      this.toggleInventoryOptionsMenu();
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
      this.mapCoordsText,
      this.minimapTuneHintText,
      this.minimapMaskGfx,
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
    this.buildMacroEditorDialog();
    this.buildInventoryOptionsMenu();
    this.buildStatsOverlay();

    const globalOverlays = globalThis as typeof globalThis & {
      __aowebConfirmOverlays?: Array<{ destroy: () => void }>;
    };
    globalOverlays.__aowebConfirmOverlays?.forEach((overlay) => overlay.destroy());
    this.dropItemOverlay = new DropItemOverlay(this.scene);
    this.simpleConfirmOverlay = new SimpleConfirmOverlay(this.scene);
    globalOverlays.__aowebConfirmOverlays = [
      this.dropItemOverlay,
      this.simpleConfirmOverlay,
    ];

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
    this.applyMacroIconLayout(slotIndex);
  }

  isMacroEditorOpen() {
    return this.macroEditorVisible;
  }

  showMacroEditor(
    config: MacroEditorConfig,
    onSave: (config: MacroEditorConfig) => void,
    itemOptionsForAction?: (action: MacroActionType) => MacroEditorItemOption[]
  ) {
    this.macroEditorItemOptionsForAction = itemOptionsForAction ?? null;
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

  /** Escala el icono al slot (setTexture deja el frame a tamaño nativo si no se reescala). */
  private applyMacroIconLayout(slotIndex: number) {
    const slot = this.macroSlots[slotIndex];
    const metrics = this.macroSlotMetrics[slotIndex];
    if (!slot || !metrics || !slot.itemIcon.getData("hasItem")) {
      return;
    }
    const icon = slot.itemIcon;
    icon.setOrigin(0.5, 0.5);
    icon.setPosition(metrics.cx, metrics.cy);
    const frame = icon.frame;
    const srcW = Math.max(1, frame.width);
    const srcH = Math.max(1, frame.height);
    const maxDim = Math.max(8, metrics.size - 4);
    const scale = maxDim / Math.max(srcW, srcH);
    if (typeof icon.setSizeToFrame === "function") {
      icon.setSizeToFrame();
    }
    icon.setScale(scale);
  }

  /** Posiciona iconos/teclas de macro sobre los slots del marco (sin recuadros propios). */
  private layoutMacroSlots(w: number, h: number) {
    const metricsList = getAowebSkinMacroSlotMetrics(w, h, this.macroSlots.length);

    this.macroSlots.forEach((slot, index) => {
      const metrics = metricsList[index];
      if (!metrics) return;

      slot.hit.setVisible(true);
      slot.itemIcon.setVisible(Boolean(slot.itemIcon.getData("hasItem")));
      slot.keyLabel.setVisible(true);

      const { cx, cy, size } = metrics;
      const mx = cx - Math.floor(size / 2);
      const my = cy - Math.floor(size / 2);
      this.macroSlotMetrics[index] = { cx, cy, size };
      slot.hit.setPosition(mx, my).setSize(size, size);
      this.applyMacroIconLayout(index);
      slot.keyLabel.setPosition(mx + size - 4, my + size - 4);
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

      if (this.inventoryOptionsMenuVisible) {
        if (event.key === "Escape") {
          this.closeInventoryOptionsMenu();
          return;
        }
      }

      if (this.statsOverlayVisible) {
        if (event.key === "Escape") {
          this.closeStatsOverlay();
          return;
        }
      }

      if (this.handleMinimapLayoutTuneKey(event)) {
        return;
      }

      if (this.dropItemOverlay?.isOpen() || this.simpleConfirmOverlay?.isOpen()) {
        event.preventDefault();
        this.dropItemOverlay?.handleKeyDown(event);
        this.simpleConfirmOverlay?.handleKeyDown(event);
        return;
      }

      if (this.partyOverlay?.isOpen()) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
  
        if (!this.chatFocused) {
          this.chatFocused = true;
          this.chatInputValue = "";
          this.sentChatHistoryIndex = -1;
          this.relayout();
          return;
        }
  
        const message = this.chatInputValue.trim();
  
        if (message.length > 0) {
          const handled = Boolean(this.chatSubmitHandler?.(message));
          if (!handled) {
            this.addChatLine(`Tú: ${message}`);
          }
          if (this.sentChatHistory[this.sentChatHistory.length - 1] !== message) {
            this.sentChatHistory.push(message);
            if (this.sentChatHistory.length > 50) {
              this.sentChatHistory.shift();
            }
          }
        }
  
        this.chatInputValue = "";
        this.sentChatHistoryIndex = -1;
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
        this.sentChatHistoryIndex = -1;
        this.chatFocused = false;
        this.relayout();
        return;
      }

      if (event.key === "ArrowUp") {
        if (this.sentChatHistory.length > 0) {
          if (this.sentChatHistoryIndex === -1) {
            this.sentChatHistoryIndex = this.sentChatHistory.length - 1;
          } else {
            this.sentChatHistoryIndex = Math.max(0, this.sentChatHistoryIndex - 1);
          }
          this.chatInputValue = this.sentChatHistory[this.sentChatHistoryIndex] ?? "";
          this.refreshChatInputText();
        }
        return;
      }

      if (event.key === "ArrowDown") {
        if (this.sentChatHistoryIndex !== -1) {
          if (this.sentChatHistoryIndex >= this.sentChatHistory.length - 1) {
            this.sentChatHistoryIndex = -1;
            this.chatInputValue = "";
          } else {
            this.sentChatHistoryIndex += 1;
            this.chatInputValue = this.sentChatHistory[this.sentChatHistoryIndex] ?? "";
          }
          this.refreshChatInputText();
        }
        return;
      }
   
      if (event.key === "Backspace") {
        this.chatInputValue = this.chatInputValue.slice(0, -1);
        this.sentChatHistoryIndex = -1;
        this.refreshChatInputText();
        return;
      }
   
      if (
        event.key.length === 1 &&
        !event.repeat &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        this.chatInputValue.length < 80
      ) {
        this.chatInputValue += event.key;
        this.sentChatHistoryIndex = -1;
        this.refreshChatInputText();
      }
    });
  }

  private refreshChatInputText() {
    if (!this.chatFocused) {
      return;
    }
    this.chatInputText.setText(`> ${this.chatInputValue}`);
  }
  
  isChatFocused() {
    return this.chatFocused;
  }

  isConfirmOpen() {
    return this.dropItemOverlay?.isOpen() || this.simpleConfirmOverlay?.isOpen() || false;
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
    if (this.isConfirmOpen()) {
      return;
    }
    this.simpleConfirmOverlay.show(this.scene, "Confirmacion", message, {
      onConfirm,
      onCancel: onCancel ?? (() => {}),
    });
  }

  showDropConfirm(
    itemName: string,
    maxAmount: number,
    onConfirm: (amount: number) => void,
    onCancel?: () => void
  ) {
    if (this.isConfirmOpen()) {
      return;
    }
    this.dropItemOverlay.show(this.scene, itemName, maxAmount, {
      onConfirm,
      onCancel: onCancel ?? (() => {}),
    });
  }

  private cycleMacroAction(delta: number) {
    const prevAction = this.macroEditorConfig.action;
    const currentIndex = MACRO_ACTIONS.indexOf(prevAction);
    const nextIndex = (currentIndex + delta + MACRO_ACTIONS.length) % MACRO_ACTIONS.length;
    this.macroEditorConfig.action = MACRO_ACTIONS[nextIndex];
    if (this.macroEditorConfig.action === "cast_spell") {
      if (
        this.macroEditorConfig.selectedSpellId === null &&
        this.macroEditorConfig.spellOptions.length > 0
      ) {
        this.macroEditorConfig.selectedSpellId = this.macroEditorConfig.spellOptions[0].spellId;
      }
    } else {
      this.refreshMacroEditorItemOptions(this.macroEditorConfig.selectedInventorySlotIndex);
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
      (option) => option.slotIndex === this.macroEditorConfig.selectedInventorySlotIndex
    );
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (baseIndex + delta + options.length) % options.length;
    const picked = options[nextIndex];
    this.macroEditorConfig.selectedItemId = picked.itemId;
    this.macroEditorConfig.selectedInventorySlotIndex = picked.slotIndex;
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
    this.macroEditorItemOptionsForAction = null;
  }

  private syncMacroEditorItemSelection(preferredSlotIndex: number | null) {
    const options = this.macroEditorConfig.itemOptions;
    if (options.length === 0) {
      this.macroEditorConfig.selectedItemId = null;
      this.macroEditorConfig.selectedInventorySlotIndex = null;
      return;
    }

    let pick =
      preferredSlotIndex != null
        ? options.find((option) => option.slotIndex === preferredSlotIndex)
        : undefined;
    if (!pick && this.macroEditorConfig.selectedInventorySlotIndex != null) {
      pick = options.find(
        (option) => option.slotIndex === this.macroEditorConfig.selectedInventorySlotIndex
      );
    }
    if (!pick && this.macroEditorConfig.selectedItemId) {
      pick = options.find((option) => option.itemId === this.macroEditorConfig.selectedItemId);
    }
    if (!pick) {
      pick = options[0];
    }

    this.macroEditorConfig.selectedItemId = pick.itemId;
    this.macroEditorConfig.selectedInventorySlotIndex = pick.slotIndex;
  }

  private refreshMacroEditorItemOptions(preferredSlotIndex: number | null) {
    if (!this.macroEditorItemOptionsForAction) {
      return;
    }
    this.macroEditorConfig.itemOptions = this.macroEditorItemOptionsForAction(
      this.macroEditorConfig.action
    );
    this.syncMacroEditorItemSelection(preferredSlotIndex);
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
    this.spellOrderChangeHandler?.(this.spells.map((spell) => spell.idSpell));
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
    const filtered = this.chatHistory.filter((entry) => entry.channel === this.activeChatTab);
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
      nivelRequerido: spell.nivelRequerido,
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

  private drawSpellPanelButton(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    primary = false
  ) {
    const fill = primary ? 0x7a261a : 0x2b1512;
    const border = primary ? 0xa63f32 : 0x8f4737;
    const innerBorder = primary ? 0xc2664f : 0x5b261f;
    const highlightAlpha = primary ? 0.14 : 0.08;

    g.clear();
    g.fillStyle(fill, 1);
    g.fillRect(x, y, w, h);
    g.fillStyle(0xffffff, highlightAlpha);
    g.fillRect(x + 1, y + 1, Math.max(0, w - 2), Math.max(1, Math.floor(h * 0.24)));
    g.lineStyle(1, border, 1);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (w > 4 && h > 4) {
      g.lineStyle(1, innerBorder, 0.9);
      g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    }
  }

  private buildStatsOverlay() {
    this.statsOverlay = this.scene.add.container(0, 0).setScrollFactor(0).setVisible(false);
    this.statsOverlayDim = this.scene.add.graphics().setScrollFactor(0);
    this.statsOverlayPanel = this.scene.add.graphics().setScrollFactor(0);
    this.statsOverlayTitle = this.makeText("Estadisticas", 14, "#5c4033", true).setOrigin(
      0.5,
      0
    );
    this.statsOverlayCloseBtn = this.scene.add.graphics().setScrollFactor(0);
    this.statsOverlayCloseLabel = this.makeText("Volver", 10, "#fbf0d9", true).setOrigin(0.5, 0.5);
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

    for (let i = 0; i < 2; i += 1) {
      this.statsOverlayAttrTexts.push(this.makeText("", 10, "#5c4033", i === 0));
    }
    this.statsOverlaySectionTitles.push(
      this.makeText("Asesinatos", 11, "#5c4033", true)
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
      ...this.statsKillTexts,
    ]);
    this.root.add(this.statsOverlay);
  }

  /** Rectángulo en pantalla que cubre toda la grilla de inventario (5×4). */
  private getInventoryGridScreenRect(): { x: number; y: number; w: number; h: number } {
    const lastIndex = INVENTORY_COLS * INVENTORY_ROWS - 1;
    const first = this.inventoryPanel.slots[0];
    const last = this.inventoryPanel.slots[lastIndex];
    const container = this.inventoryPanel.container;
    if (!first || !last) {
      return { ...this.inventoryPanelGeom };
    }
    return {
      x: container.x + first.x,
      y: container.y + first.y,
      w: last.x + last.displayWidth - first.x,
      h: last.y + last.displayHeight - first.y,
    };
  }

  private buildInventoryOptionsMenu() {
    const menuItems: { id: "options" | "stats"; label: string }[] = [
      { id: "options", label: "Opciones" },
      { id: "stats", label: "Estadísticas" },
    ];

    this.inventoryOptionsMenu = this.scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setVisible(false);
    this.inventoryOptionsMenuDim = this.scene.add.graphics().setScrollFactor(0);
    this.inventoryOptionsMenuDim.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 1, 1),
      Phaser.Geom.Rectangle.Contains
    );
    this.inventoryOptionsMenuDim.on("pointerdown", () => this.closeInventoryOptionsMenu());

    for (const item of menuItems) {
      const bg = this.scene.add
        .image(0, 0, FONDO_BOTONES_TEXTURE_KEY)
        .setOrigin(0, 0)
        .setScrollFactor(0);
      const label = this.makeText(item.label, 9, "#e6edf3", true).setOrigin(0.5, 0.5);
      const hit = this.scene.add
        .zone(0, 0, 1, 1)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      hit.on(
        "pointerdown",
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData
        ) => {
          event.stopPropagation();
          this.handleInventoryOptionsMenuPick(item.id);
        }
      );
      this.inventoryOptionsMenuEntries.push({ id: item.id, bg, label, hit });
    }

    this.inventoryOptionsMenu.add([
      this.inventoryOptionsMenuDim,
      ...this.inventoryOptionsMenuEntries.flatMap((entry) => [entry.bg, entry.label, entry.hit]),
    ]);
    this.root.add(this.inventoryOptionsMenu);
  }

  private layoutInventoryOptionsMenu() {
    if (!this.inventoryOptionsMenuVisible) {
      return;
    }

    const { x, y, w, h } = this.getInventoryGridScreenRect();
    if (w <= 0 || h <= 0) {
      return;
    }

    this.inventoryOptionsMenuDim.clear();
    this.inventoryOptionsMenuDim.input?.hitArea.setTo(x, y, w, h);

    const rowCount = this.inventoryOptionsMenuEntries.length;
    const pad = 10;
    const rowGap = 6;
    const rowH = Math.min(24, Math.max(18, Math.floor((h - pad * 2 - rowGap * (rowCount - 1)) / rowCount)));
    const btnW = Math.min(w - pad * 2, Math.max(72, Math.floor(w * 0.72)));
    const stackH = rowCount * rowH + (rowCount - 1) * rowGap;
    const btnX = x + Math.floor((w - btnW) / 2);
    const firstBtnY = y + Math.floor((h - stackH) / 2);
    const fontPx = Math.max(8, Math.min(10, Math.floor(rowH * 0.42)));

    this.inventoryOptionsMenuEntries.forEach((entry, index) => {
      const btnY = firstBtnY + index * (rowH + rowGap);
      entry.bg.setPosition(btnX, btnY).setDisplaySize(btnW, rowH);
      entry.label
        .setFontSize(`${fontPx}px`)
        .setPosition(btnX + btnW / 2, btnY + rowH / 2);
      entry.hit.setPosition(btnX, btnY).setSize(btnW, rowH);
    });
  }

  private layoutStatsOverlay() {
    if (!this.statsOverlayVisible) {
      return;
    }

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const viewport = getGameViewport(w, h);
    const panelW = Math.min(270, Math.floor(viewport.width * 0.88));
    const panelH = Math.min(194, Math.floor(viewport.height * 0.82));
    const panelX = viewport.x + Math.floor((viewport.width - panelW) / 2);
    const panelY = viewport.y + Math.floor((viewport.height - panelH) / 2);
    const pad = 12;
    const leftX = panelX + pad;

    this.statsOverlayDim.clear();
    this.statsOverlayDim.fillStyle(0x0a0c10, 0.6);
    this.statsOverlayDim.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
    this.statsOverlayDim.input?.hitArea.setTo(viewport.x, viewport.y, viewport.width, viewport.height);

    this.statsOverlayPanel.clear();
    this.statsOverlayPanel.fillStyle(0xeadbb9, 0.98);
    this.statsOverlayPanel.fillRect(panelX, panelY, panelW, panelH);
    this.statsOverlayPanel.lineStyle(2, 0x6f4e37, 0.95);
    this.statsOverlayPanel.strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1);

    this.statsOverlayTitle.setPosition(panelX + panelW / 2, panelY + 10);
    const closeW = 58;
    const closeH = 20;
    const closeX = panelX + panelW - pad - closeW;
    const closeY = panelY + 12;
    this.statsOverlayCloseBtn.clear();
    this.statsOverlayCloseBtn.fillStyle(0x8a6c5b, 1);
    this.statsOverlayCloseBtn.fillRect(closeX, closeY, closeW, closeH);
    this.statsOverlayCloseBtn.lineStyle(1, 0x6f4e37, 0.95);
    this.statsOverlayCloseBtn.strokeRect(closeX + 0.5, closeY + 0.5, closeW - 1, closeH - 1);
    this.statsOverlayCloseZone.setPosition(closeX, closeY).setSize(closeW, closeH);
    this.statsOverlayCloseLabel.setPosition(closeX + closeW / 2, closeY + closeH / 2);

    const infoY = panelY + 44;
    const infoLines = [
      `Nombre: ${this.stats.name}`,
      `Nivel: ${this.stats.level}`,
    ];
    this.statsOverlayAttrTexts.forEach((text, index) => {
      text.setPosition(leftX, infoY + index * 16);
      text.setText(infoLines[index] ?? "");
      text.setColor("#5c4033");
    });

    const killsTitle = this.statsOverlaySectionTitles[0];
    const sectionY = infoY + 42;
    killsTitle.setPosition(leftX, sectionY);

    const killsTop = sectionY + 16;
    const factionKills = {
      imperial: this.killStats.imperialKilled ?? 0,
      armada: this.killStats.armadaKilled ?? 0,
      caos: this.killStats.caosKilled ?? 0,
      renegade: this.killStats.renegadeKilled ?? this.killStats.usersKilled,
    };

    const killLines = [
      `Imperiales: ${factionKills.imperial}`,
      `Armada: ${factionKills.armada}`,
      `Caos: ${factionKills.caos}`,
      `Renegados: ${factionKills.renegade}`,
    ];
    this.statsKillTexts.forEach((text, index) => {
      text.setPosition(leftX, killsTop + index * 15);
      text.setText(killLines[index] ?? "");
      text.setColor("#5c4033");
      text.setVisible(index < killLines.length);
    });
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
    if (!this.scene.textures.exists(textureKey) && itemId) {
      const item = getItemDefinition(itemId as never);
      if (item) {
        this.loadMissingInventoryIcon(slotIndex, item.textureKey, item.assetPath, count, itemId);
      }
    }
  
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

  private loadMissingInventoryIcon(
    slotIndex: number,
    textureKey: string,
    assetPath: string,
    count: number,
    itemId: string
  ) {
    if (!assetPath || this.scene.textures.exists(textureKey) || this.loadingItemTextureKeys.has(textureKey)) {
      return;
    }

    this.loadingItemTextureKeys.add(textureKey);
    this.scene.load.image(textureKey, assetPath);
    this.scene.load.once(`filecomplete-image-${textureKey}`, () => {
      this.loadingItemTextureKeys.delete(textureKey);
      if (this.inventorySlotItemIds[slotIndex] === itemId) {
        this.setInventorySlot(slotIndex, textureKey, count, itemId);
      }
    });
    this.scene.load.once("loaderror", () => {
      this.loadingItemTextureKeys.delete(textureKey);
    });
    if (!this.scene.load.isLoading()) {
      this.scene.load.start();
    }
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

  private applyVitalBarLabelStyle(label: Phaser.GameObjects.Text): void {
    label
      .setFontFamily(GAME_FONT)
      .setFontStyle("bold")
      .setColor("#ffffff")
      .setStroke(VITAL_BAR_LABEL_STROKE, VITAL_BAR_LABEL_STROKE_THICKNESS)
      .setResolution(VITAL_BAR_LABEL_RESOLUTION);
  }

  private fitVitalBarLabel(
    label: Phaser.GameObjects.Text,
    text: string,
    maxWidth: number
  ): void {
    const limit = Math.max(24, maxWidth - 6);
    for (const size of VITAL_BAR_LABEL_FONT_SIZES) {
      label.setFontSize(`${size}px`);
      label.setText(text);
      if (label.width <= limit) {
        return;
      }
    }
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
      this.spellScrollHintText,
      ...this.spellRows,
    ];
  }

  private applySpellPanelMask() {
    const clip = this.spellPanelContentGeom;
    this.inventoryClipMaskGfx.clear();
    this.inventoryClipMaskGfx.fillStyle(0xffffff, 1);
    this.inventoryClipMaskGfx.fillRect(clip.x, clip.y, clip.w, clip.h);
    for (const target of this.getSpellPanelMaskTargets()) {
      target.setMask(this.inventoryClipMask);
    }
  }

  private clearSpellPanelMask() {
    for (const target of this.getSpellPanelMaskTargets()) {
      target.clearMask();
    }
  }

  /** Área negra interior del panel (debajo de «INVENTARIO» en la skin). */
  private getSkinSpellPanelContentRect(
    panel: { x: number; y: number; w: number; h: number },
    screenW: number,
    screenH: number
  ) {
    const gridPad = getAowebSkinLayout().inventoryGridPad ?? { top: 0, left: 0 };
    const padTop = scaleSkinY(gridPad.top, screenH);
    const padX = scaleSkinX(8, screenW);
    const padBottom = scaleSkinY(10, screenH);
    return {
      x: panel.x + padX,
      y: panel.y + padTop,
      w: Math.max(48, panel.w - padX * 2),
      h: Math.max(48, panel.h - padTop - padBottom),
    };
  }

  private layoutSpellPanelForSkin(panel: { x: number; y: number; w: number; h: number }) {
    const screenW = this.scene.scale.width;
    const screenH = this.scene.scale.height;
    const content = this.getSkinSpellPanelContentRect(panel, screenW, screenH);
    this.spellPanelContentGeom = content;

    const listPad = scaleSkinX(3, screenW);
    const controlColW = scaleSkinX(SPELL_SKIN_CONTROL_COL_W, screenW);
    const footerH = scaleSkinY(SPELL_PANEL_FOOTER_SKIN, screenH);
    const listX = content.x + listPad;
    const listY = content.y + listPad;
    const listW = Math.max(48, content.w - listPad * 2 - controlColW);
    const controlX = content.x + content.w - listPad - controlColW;
    const castH = Math.max(scaleSkinY(42, screenH), footerH);
    const castY = panel.y + panel.h - castH - scaleSkinY(4, screenH);
    const listRowGap = 1;
    const listH = Math.max(SPELL_ROW_HEIGHT, castY - listY - scaleSkinY(2, screenH));
    const rowStride = SPELL_ROW_HEIGHT + listRowGap;

    this.spellVisibleRows = Math.min(
      SPELL_MAX_VISIBLE_ROWS,
      Math.max(1, Math.floor((listH + listRowGap) / rowStride))
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
      this.spellVisibleRows * rowStride - listRowGap
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
      row.setPosition(listX + 3, rowY + SPELL_ROW_HEIGHT / 2);
      row.setFontSize("9px");
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

    const canReorderUp = this.selectedSpellIndex > 0;
    const canReorderDown =
      this.selectedSpellIndex >= 0 && this.selectedSpellIndex < this.spells.length - 1;
    const canScrollUp = maxScroll > 0 && this.spellScrollOffset > 0;
    const canScrollDown = maxScroll > 0 && this.spellScrollOffset < maxScroll;
    const reorderBtnW = Math.max(18, controlColW - 2);
    const reorderBtnH = Math.max(14, scaleSkinY(15, screenH));

    this.drawSpellPanelButton(this.spellUpBtn, controlX, listY, reorderBtnW, reorderBtnH);
    this.drawSpellPanelButton(
      this.spellDownBtn,
      controlX,
      listY + reorderBtnH + 2,
      reorderBtnW,
      reorderBtnH
    );
    this.spellUpBtn.setAlpha(canReorderUp ? 1 : 0.35);
    this.spellDownBtn.setAlpha(canReorderDown ? 1 : 0.35);
    this.spellUpZone
      .setPosition(controlX, listY)
      .setSize(reorderBtnW, reorderBtnH)
      .setVisible(true);
    this.spellDownZone
      .setPosition(controlX, listY + reorderBtnH + 2)
      .setSize(reorderBtnW, reorderBtnH)
      .setVisible(true);
    this.spellUpZone.input!.enabled = canReorderUp;
    this.spellDownZone.input!.enabled = canReorderDown;
    this.spellUpLabel
      .setText("▲")
      .setColor("#ffe6c8")
      .setPosition(controlX + reorderBtnW / 2, listY + reorderBtnH / 2)
      .setAlpha(canReorderUp ? 1 : 0.35)
      .setVisible(true);
    this.spellDownLabel
      .setText("▼")
      .setColor("#ffe6c8")
      .setPosition(controlX + reorderBtnW / 2, listY + reorderBtnH + 2 + reorderBtnH / 2)
      .setAlpha(canReorderDown ? 1 : 0.35)
      .setVisible(true);

    [
      this.spellScrollUpBtn,
      this.spellScrollDownBtn,
      this.spellInfoBtn,
      this.spellScrollUpZone,
      this.spellScrollDownZone,
      this.spellInfoZone,
      this.spellScrollUpLabel,
      this.spellScrollDownLabel,
      this.spellInfoLabel,
    ].forEach((obj) => obj.setVisible(false));

    const spellCastW = listW + controlColW;
    this.drawSpellPanelButton(this.spellCastBtn, listX, castY, spellCastW, castH, true);
    this.spellCastZone.setPosition(listX, castY).setSize(spellCastW, castH);
    this.spellCastLabel
      .setColor("#fff4e6")
      .setPosition(listX + spellCastW / 2, castY + castH / 2);

    if (maxScroll > 0) {
      const firstVisible = this.spellScrollOffset + 1;
      const lastVisible = Math.min(
        this.spells.length,
        this.spellScrollOffset + this.spellVisibleRows
      );
      this.spellScrollHintText
        .setText(`${firstVisible}-${lastVisible}/${this.spells.length}`)
        .setPosition(listX, castY - scaleSkinY(6, screenH))
        .setFontSize("8px")
        .setColor("#d8a475")
        .setVisible(true);
    } else {
      this.spellScrollHintText.setText("").setVisible(false);
    }

    this.applySpellPanelMask();
  }

  private getSidebarPanelHeight(): number {
    if (this.useAowebSkin) {
      const h = this.scene.scale.height;
      return scaleSkinY(getAowebSkinRegions().inventoryPanel.h, h);
    }
    return Math.max(this.inventoryPanel.height, this.getSpellPanelMinHeight());
  }

  private relayoutAowebSkin(w: number, h: number) {
    const skinDerived = getSkinDerivedLayout(w, h);
    this.sidebarWidth = skinDerived.sidebarWidth;
    this.macroBarHeight = skinDerived.macroBarHeight;
    this.chatHeight = skinDerived.chatHeight;

    const R = getAowebSkinRegions();
    const sidebarX = w - this.sidebarWidth;
    const bodyBottom = h - this.macroBarHeight;
    const gameVp = scaleSkinRect(R.viewport, w, h);

    this.uiSkinFrame.setPosition(0, 0).setDisplaySize(w, h).setVisible(true);
    if (usesViewportFrameOverlay()) {
      // PNG con centro transparente: el marco (dragones, bordes) queda encima del mundo.
      this.uiSkinFrame.clearMask();
    } else {
      // Recorta el marco para dejar "agujero" donde se renderiza el mundo.
      this.skinViewportMaskGfx.clear();
      this.skinViewportMaskGfx.fillStyle(0xffffff, 1);
      this.skinViewportMaskGfx.fillRect(0, 0, w, gameVp.y);
      this.skinViewportMaskGfx.fillRect(0, gameVp.y + gameVp.h, w, Math.max(0, h - (gameVp.y + gameVp.h)));
      this.skinViewportMaskGfx.fillRect(0, gameVp.y, gameVp.x, gameVp.h);
      this.skinViewportMaskGfx.fillRect(
        gameVp.x + gameVp.w,
        gameVp.y,
        Math.max(0, w - (gameVp.x + gameVp.w)),
        gameVp.h
      );
      this.uiSkinFrame.setMask(this.skinViewportMaskGfx.createGeometryMask());
    }
    this.chatPanel.clear();
    this.chatBgFrame.setVisible(false);
    this.sidebarPanel.clear();

    const chatHist = scaleSkinRect(R.chatHistory, w, h);
    const chatToggleR = scaleSkinRect(R.chatChannelToggle, w, h);
    const chatListBase = scaleSkinRect(R.chatChannelList, w, h);
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

    const nameR = scaleSkinRect(R.name, w, h);
    const expR = scaleSkinRect(R.exp, w, h);
    const levelR = scaleSkinRect(R.levelCircle, w, h);

    this.lvlNameExpFrame.setVisible(false);
    this.levelText
      .setPosition(levelR.x + levelR.w / 2.1, levelR.y + levelR.h / 1.25)
      .setOrigin(0.5, 0.5)
      .setFontSize("18px")
      .setColor("#e8dcc8")
      .setVisible(true);
    this.nameText
      .setPosition(nameR.x + nameR.w / 1.5, nameR.y + nameR.h / 2)
      .setOrigin(0.5, 0.5)
      .setFontSize("11px")
      .setWordWrapWidth(nameR.w - 8)
      .setVisible(true);
    this.expBarGeom = {
      x: expR.x + 6,
      y: expR.y + 12,
      w: Math.max(1, expR.w - -4),
      h: Math.max(4, expR.h - -5),
    };
    this.expSlotGeom = { x: expR.x, y: expR.y, w: expR.w, h: expR.h };
    this.expFill.setVisible(true);
    this.expLabelYOffset = scaleSkinY(EXP_LABEL_SKIN_Y_OFFSET, h);
    this.expLabelFontPx = EXP_LABEL_SKIN_FONT_SIZES[0];
    this.expLabelText
      .setColor("#f8f0d8")
      .setFontStyle("bold")
      .setStroke(VITAL_BAR_LABEL_STROKE, 3)
      .setResolution(VITAL_BAR_LABEL_RESOLUTION)
      .setOrigin(0.5, 0.5)
      .setVisible(true);

    const tabsR = scaleSkinRect(R.tabs, w, h);
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

    const invPanelR = scaleSkinRect(R.inventoryPanel, w, h);
    this.inventoryPanel.layoutSkinGridInPanel(R.inventoryPanel, w, h);
    const sidebarPanelHeight = invPanelR.h;
    const invR = invPanelR;
    this.inventoryPanelGeom = { x: invR.x, y: invR.y, w: invR.w, h: invR.h };
    this.inventoryClipMaskGfx.clear();
    this.inventoryClipMaskGfx.fillStyle(0xffffff, 1);
    this.inventoryClipMaskGfx.fillRect(invR.x, invR.y, invR.w, invR.h);
    if (this.activeSidebarTab === "inventory" && !this.inventoryOptionsMenuVisible) {
      this.inventoryPanel.container.setMask(this.inventoryClipMask);
    } else {
      this.inventoryPanel.container.clearMask();
    }
    const hintR = scaleSkinRect(R.hint, w, h);
    this.inventoryHintBoxGeom = { x: hintR.x, y: hintR.y, w: hintR.w, h: hintR.h };
    this.inventoryHintText.setPosition(hintR.x + 6, hintR.y + 4);
    this.inventoryHintText.setWordWrapWidth(hintR.w - 12);
    this.inventoryHintText.setColor("#d8ccb0");

    const isInventoryTab = this.activeSidebarTab === "inventory";
    const isSpellsTab = this.activeSidebarTab === "spells";
    const showInventoryContent = isInventoryTab && !this.inventoryOptionsMenuVisible;
    // En skin nueva queremos que la lista de spells no quede tapada por los slots.
    // El inventario solo se ve cuando estamos en "inventory".
    this.inventoryPanel.container.setVisible(showInventoryContent);
    this.inventoryHintBg.setVisible(showInventoryContent);
    this.inventoryHintText.setVisible(showInventoryContent);
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

    const hpR = scaleSkinRect(R.hpBar, w, h);
    const mpR = scaleSkinRect(R.mpBar, w, h);
    const goldR = scaleSkinRect(R.gold, w, h);
    const strR = scaleSkinRect(R.strengthSlot, w, h);
    const agiR = scaleSkinRect(R.agilitySlot, w, h);
    const vitalInset = { x: -9, y: -35, w: -77, h: -1};
    this.hpLabel.setVisible(false);
    this.mpLabel.setVisible(false);
    this.goldText
      .setPosition(goldR.x + -50, goldR.y + goldR.h + 13)
      .setOrigin(0, 0.5)
      .setColor("#f5d76e")
      .setFontSize("11px")
      .setVisible(true);
    this.strengthPotionIcon.setVisible(false);
    this.strengthValueText
      .setPosition(strR.x + strR.w + 214, strR.y + strR.h - 50)
      .setFontSize("15px")
      .setVisible(true);
    this.agilityPotionIcon.setVisible(false);
    this.agilityValueText
      .setPosition(agiR.x + agiR.w + 214, agiR.y + agiR.h - 20)
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
      .setOrigin(0.5, 0.5)
      .setPosition(this.hpBarGeom.x + this.hpBarGeom.w - 70, this.hpBarGeom.y + this.hpBarGeom.h - 8)
      .setVisible(true);
    this.mpLabel
      .setOrigin(0.5, 0.5)
      .setPosition(this.mpBarGeom.x + this.mpBarGeom.w - 70, this.mpBarGeom.y + this.mpBarGeom.h - 8)
      .setVisible(true);
    this.applyVitalBarLabelStyle(this.hpLabel);
    this.applyVitalBarLabelStyle(this.mpLabel);

    const minimapR = scaleSkinRect(R.minimap, w, h);
    const minimapContent = usesMinimapFrameOverlay()
      ? getSkinMinimapContentRect(R.minimap, w, h)
      : {
          x: minimapR.x + Math.floor((minimapR.w - Math.min(minimapR.w, minimapR.h)) / 2),
          y: minimapR.y + Math.floor((minimapR.h - Math.min(minimapR.w, minimapR.h)) / 2),
          w: Math.min(minimapR.w, minimapR.h),
          h: Math.min(minimapR.w, minimapR.h),
        };
    this.minimapGeom = this.applyMinimapLayout({
      x: minimapContent.x,
      y: minimapContent.y,
      w: minimapContent.w,
      h: minimapContent.h,
    });
    this.layoutMinimapLabels(this.minimapGeom, h);

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

    this.layoutMacroEditorDialog();
    this.layoutStatsOverlay();
    this.auctionOverlay.layout(getGameViewport(w, h));
    this.layoutInventoryOptionsMenu();
    this.refreshStats();
    this.syncMinimapLayerDepth();
    this.bringSkinHudToFront();
    this.bringSidebarHudToFront();
    this.bringChatTabsToFront();
    this.minimapRedrawHandler?.();
    this.layoutMinimapTuneHint();
    this.scene.events.emit("ui-viewport-changed");
  }


  private layoutMinimapTuneHint() {
    if (!this.minimapLayoutTuneActive || !this.minimapTuneHintText) {
      this.minimapTuneHintText?.setVisible(false);
      return;
    }
    const { x, y, w, h } = this.minimapGeom;
    this.minimapTuneHintText.setPosition(Math.max(6, x), y + h + 6);
    this.minimapTuneHintText.setWordWrapWidth(Math.max(140, w + 20));
    this.refreshMinimapTuneHint();
    this.root.bringToTop(this.minimapTuneHintText);
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

  /** Minimapa detrás del marco PNG sin subir el marco sobre chat/inventario. */
  private syncMinimapLayerDepth() {
    if (this.useAowebSkin && usesMinimapFrameOverlay()) {
      this.minimapGfx.setDepth(-2);
      this.uiSkinFrame.setDepth(-1);
      return;
    }
    this.minimapGfx.setDepth(0);
    if (this.useAowebSkin) {
      this.uiSkinFrame.setDepth(-1);
    }
  }

  /** HP/MP/oro/nivel por encima del marco de la skin. */
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
      this.mapCoordsText,
      this.mapNameText,
      this.fullscreenBtnBg,
      this.fullscreenBtnHit,
      this.fullscreenBtnLabel,
      this.hpLabel,
      this.mpLabel,
      ...this.macroSlots.flatMap((s) => [s.hit, s.itemIcon, s.keyLabel]),
    ];
    if (!this.useAowebSkin || !usesMinimapFrameOverlay()) {
      hudFront.push(this.minimapGfx);
    }
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
    this.layoutMacroEditorDialog();
    this.layoutInventoryOptionsMenu();

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
    this.inventoryPanelGeom = {
      x: sidebarX + pad,
      y: inventoryPanelY,
      w: innerW,
      h: sidebarPanelHeight,
    };
    this.inventoryPanel.container.setPosition(sidebarX + pad, inventoryPanelY);
    const hintY = inventoryPanelY + sidebarPanelHeight + 4;
    this.inventoryHintBoxGeom = { x: sidebarX + pad, y: hintY, w: innerW, h: 22 };
    this.inventoryHintText.setPosition(sidebarX + pad + 6, hintY + 4);
    this.inventoryHintText.setWordWrapWidth(innerW - 12);
    this.redrawInventoryHintBox();
    const isInventoryTab = this.activeSidebarTab === "inventory";
    const isSpellsTab = this.activeSidebarTab === "spells";
    const showInventoryContent = isInventoryTab && !this.inventoryOptionsMenuVisible;
    this.inventoryPanel.container.setVisible(showInventoryContent);
    this.inventoryHintBg.setVisible(showInventoryContent);
    this.inventoryHintText.setVisible(showInventoryContent);
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
        row.setFontSize("9px");
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

      this.drawSpellPanelButton(this.spellUpBtn, controlX, listY, 22, 20);
      this.drawSpellPanelButton(this.spellDownBtn, controlX, listY + 24, 22, 20);
      this.drawSpellPanelButton(this.spellInfoBtn, controlX, listY + 48, 22, 20);
      this.drawSpellPanelButton(this.spellScrollUpBtn, controlX, listY + 72, 22, 16);
      this.drawSpellPanelButton(this.spellScrollDownBtn, controlX, listY + 90, 22, 16);
      const spellCastX = panelX + listPad;
      const spellCastH = 38;
      const spellCastY = panelY + panelH - spellCastH - 2;
      const spellCastW = panelW - listPad * 2;
      this.drawSpellPanelButton(this.spellCastBtn, spellCastX, spellCastY, spellCastW, spellCastH, true);

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
      this.spellCastZone.setPosition(spellCastX, spellCastY).setSize(spellCastW, spellCastH);

      this.spellUpLabel
        .setText("▲")
        .setColor("#ffe6c8")
        .setPosition(controlX + 11, listY + 10)
        .setAlpha(canReorderUp ? 1 : 0.35);
      this.spellDownLabel
        .setText("▼")
        .setColor("#ffe6c8")
        .setPosition(controlX + 11, listY + 34)
        .setAlpha(canReorderDown ? 1 : 0.35);
      this.spellScrollUpLabel
        .setColor("#ffe6c8")
        .setPosition(controlX + 11, listY + 80)
        .setAlpha(canScrollUp ? 1 : 0.35);
      this.spellScrollDownLabel
        .setColor("#ffe6c8")
        .setPosition(controlX + 11, listY + 98)
        .setAlpha(canScrollDown ? 1 : 0.35);
      if (maxScroll > 0) {
        const firstVisible = this.spellScrollOffset + 1;
        const lastVisible = Math.min(this.spells.length, this.spellScrollOffset + this.spellVisibleRows);
        this.spellScrollHintText
          .setText(`${firstVisible}-${lastVisible}/${this.spells.length}`)
          .setPosition(listX, panelY + panelH - 48)
          .setVisible(true);
      } else {
        this.spellScrollHintText.setText("").setVisible(false);
      }
      this.spellInfoLabel.setPosition(controlX + 11, listY + 58);
      this.spellCastLabel
        .setColor("#fff4e6")
        .setPosition(spellCastX + spellCastW / 2, spellCastY + spellCastH / 2);
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
    this.hpLabel.setOrigin(0, 0).setPosition(vitalsX, y);
    const hpBarY = y + 12;
    this.hpBarGeom = { x: vitalsX, y: hpBarY, w: vitalBarW, h: 10 };
    y += 28;

    this.mpLabel.setOrigin(0, 0).setPosition(vitalsX, y);
    const mpBarY = y + 12;
    this.mpBarGeom = { x: vitalsX, y: mpBarY, w: vitalBarW, h: 10 };

    const minimapSize = Math.min(MINIMAP_SIZE, innerW);
    const minimapX = sidebarX + pad + Math.floor((innerW - minimapSize) / 2);
    const minimapY = bodyBottom - pad - minimapSize;
    this.minimapGeom = this.applyMinimapLayout({
      x: minimapX,
      y: minimapY,
      w: minimapSize,
      h: minimapSize,
    });

    const mapNameGap = 6;
    this.layoutMinimapLabels(this.minimapGeom, h, mapNameGap);

    const fullscreenBtnW = 30;
    const fullscreenBtnH = 22;
    const fullscreenBtnX = sidebarX + pad + innerW - fullscreenBtnW;
    const fullscreenBtnY = minimapY - fullscreenBtnH - mapNameGap - 22;
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
    this.layoutInventoryOptionsMenu();
    this.refreshStats();
    this.bringSidebarHudToFront();
    this.minimapRedrawHandler?.();
    this.layoutMinimapTuneHint();
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
    this.expLabelText.setText(`${s.exp}/${s.expMax}`);
    this.fitExpLabelText();
    this.goldText.setText(
      this.useAowebSkin
        ? s.gold.toLocaleString("es-AR")
        : `Oro: ${s.gold.toLocaleString("es-AR")}`
    );
    if (this.useAowebSkin) {
      const hpText = `${s.hp}/${s.hpMax}`;
      const mpText = `${s.mp}/${s.mpMax}`;
      this.fitVitalBarLabel(this.hpLabel, hpText, this.hpBarGeom.w);
      this.fitVitalBarLabel(this.mpLabel, mpText, this.mpBarGeom.w);
      this.hpLabel.setVisible(true);
      this.mpLabel.setVisible(true);
    } else {
      this.hpLabel.setText(`HP ${s.hp}/${s.hpMax}`);
      this.mpLabel.setText(`MP ${s.mp}/${s.mpMax}`);
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
    this.expLabelYOffset = 0;
    this.expLabelFontPx = Math.max(7, Math.round(8 * scale));
    this.expLabelText
      .setOrigin(0.5, 0.5)
      .setColor("#e8d8a0")
      .setFontStyle("bold")
      .setStroke("", 0)
      .setResolution(GAME_TEXT_RESOLUTION)
      .setFontSize(`${this.expLabelFontPx}px`)
      .setVisible(true);
    this.fitExpLabelText();

    return frameY + frameH + 8;
  }

  private fitExpLabelText() {
    const slot = this.expSlotGeom;
    const maxW = Math.max(8, slot.w - 4);
    const sizes = this.useAowebSkin
      ? EXP_LABEL_SKIN_FONT_SIZES
      : ([this.expLabelFontPx] as readonly number[]);

    let size = sizes[0];
    for (const trySize of sizes) {
      size = trySize;
      this.expLabelText.setFontSize(`${size}px`);
      if (this.expLabelText.width <= maxW) {
        break;
      }
    }

    if (!this.useAowebSkin) {
      while (size > 6 && this.expLabelText.width > maxW) {
        size -= 1;
        this.expLabelText.setFontSize(`${size}px`);
      }
    }

    this.expLabelText.setPosition(
      slot.x + slot.w / 2,
      slot.y + slot.h / 2 + this.expLabelYOffset
    );
  }

  private bringSidebarHudToFront() {
    const front: Phaser.GameObjects.GameObject[] = [
      this.chatText,
      this.chatInputBg,
      this.chatInputText,
      this.inventoryPanel.container,
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
      this.inventoryOptionsMenu,
      ...this.invTabBgFrames,
      this.invTabLabel,
      this.spellsTabLabel,
      this.statsTabLabel,
      this.invTabBtn,
      this.spellsTabBtn,
      this.statsTabBtn,
      this.mapNameText,
      this.mapCoordsText,
      this.minimapTuneHintText,
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
