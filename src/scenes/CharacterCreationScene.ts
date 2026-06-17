import Phaser from "phaser";
import type { CharacterClassId } from "../../game-data/items/catalog";
import {
  ALL_CLASSES,
  ALL_GENDERS,
  ALL_RACES,
  CLASS_LABELS,
  createCharacterId,
  FACTION_LABELS,
  getFactionNameColors,
  GENDER_UI_LABELS,
  loadCharacterSlots,
  RACE_LABELS,
  saveCharacterToSlot,
  type CharacterFactionId,
  type CharacterGenderId,
  type CharacterRaceId,
  type SavedCharacter,
} from "../data/characters";
import {
  CLASS_DESCRIPTIONS,
  FACTION_DESCRIPTIONS,
  RACE_DESCRIPTIONS,
} from "../data/characterLore";
import {
  CLASS_USES_MANA,
  getPreviewModifiers,
  getPreviewVitals,
  resolveCoreStats,
} from "../game/characterStats";
import { FACE_COUNT, clampFaceIndex, faceTextureKey, getFaceFrame, registerRaceFaces, setupRaceFacesTextures } from "../player/raceFaces";
import { getRaceFaceLayout } from "../player/raceFaceLayout";
import {
  applyPlayerOrigin,
  registerPlayerSprites,
  raceBodyTextureKey,
  setupPlayerTexture,
  textureKeyForPlayer,
} from "../player/playerSprites";
import { GAME_FONT, GAME_TEXT_RESOLUTION } from "../ui/fonts";
import { START_MAP_ID } from "../maps";

const UI = {
  bg: 0x080607,
  backdrop: 0x070607,
  panelFill: 0x120d0b,
  panelFillAlpha: 0.96,
  panelBorder: 0x9b1d16,
  panelBorderDim: 0x5d241d,
  title: "#f1c44d",
  label: "#d8a475",
  text: "#fff3d2",
  muted: "#bda98a",
  accent: 0xd4a72c,
  accentDim: 0x4b1714,
  danger: "#e07070",
  barHp: 0xc0392b,
  barMana: 0x2980b9,
  barEnergy: 0xc9a227,
  barTrack: 0x1a0a08,
  factionImperial: 0x2a4a7a,
  factionCaos: 0x661510,
  factionCaosLabel: "#ff5252",
  selectorBg: 0x1a0a08,
  buttonHover: 0x6f211d,
  inputBorder: "#8f4737",
  inputBg: "#1a0a08",
};

const PANEL = {
  leftW: 252,
  centerW: 352,
  rightW: 252,
  gap: 14,
  top: 52,
  bottomPad: 16,
};

const HERO_BACKGROUND_KEY = "aoweb-character-create-bg";
const HERO_BACKGROUND_URL = "/assets/ui/aoweb-dragon-war-loading.png";
const IMPERIAL_SHIELD_KEY = "aoweb-imperial-shield";
const IMPERIAL_SHIELD_URL = "/assets/ao/uiGrafica/imperialEscudo.png";

type CreationSceneData = {
  slotIndex: number;
  returnMode?: "resume" | "enter";
};

type CycleFieldId = "gender" | "race" | "class" | "aspect";

export class CharacterCreationScene extends Phaser.Scene {
  private slotIndex = 0;
  private returnMode: "resume" | "enter" = "enter";

  private name = "";
  private genderId: CharacterGenderId = "male";
  private raceId: CharacterRaceId = "human";
  private classId: CharacterClassId = "paladin";
  private faceIndex = 0;
  private factionId: CharacterFactionId = "ciudadano";

  private previewBody!: Phaser.GameObjects.Sprite;
  private previewFace!: Phaser.GameObjects.Sprite;
  private previewNameLabel!: Phaser.GameObjects.Text;
  private previewFeetY = 0;
  private previewCenterX = 0;
  private lorePanelOrigin = { x: 0, y: 0, w: 0 };
  private statusText!: Phaser.GameObjects.Text;
  private loreTexts: Phaser.GameObjects.Text[] = [];
  private statValueTexts: Record<string, Phaser.GameObjects.Text> = {};
  private barFills: Record<string, Phaser.GameObjects.Graphics> = {};
  private barGeom: Record<string, { x: number; y: number; width: number; height: number; color: number }> =
    {};
  private factionBgs: Partial<Record<CharacterFactionId, Phaser.GameObjects.Graphics>> = {};
  private factionCenters: Partial<Record<CharacterFactionId, { x: number; y: number }>> = {};
  private factionIcons: Partial<Record<CharacterFactionId, Phaser.GameObjects.Image>> = {};
  private factionLabels: Partial<Record<CharacterFactionId, Phaser.GameObjects.Text>> = {};
  private cycleValueTexts: Phaser.GameObjects.Text[] = [];
  private cycleLabelGetters: Array<() => string> = [];
  private nameInputEl!: HTMLInputElement;

  constructor() {
    super("CharacterCreationScene");
  }

  init(data: CreationSceneData) {
    this.slotIndex = data.slotIndex ?? 0;
    this.returnMode = data.returnMode ?? "enter";
  }

  preload() {
    this.load.image(HERO_BACKGROUND_KEY, HERO_BACKGROUND_URL);
    this.load.image(IMPERIAL_SHIELD_KEY, IMPERIAL_SHIELD_URL);
    registerRaceFaces(this);
    registerPlayerSprites(this);
  }

  create() {
    setupPlayerTexture(this);
    setupRaceFacesTextures(this);

    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, UI.bg);
    const bg = this.add.image(width / 2, height / 2, HERO_BACKGROUND_KEY).setOrigin(0.5);
    const bgScale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(bgScale);
    bg.setAlpha(0.38);
    this.add.rectangle(width / 2, height / 2, width, height, UI.backdrop, 0.68);

    const baseTotalW = PANEL.leftW + PANEL.centerW + PANEL.rightW + PANEL.gap * 2;
    const panelScale = Math.min(1, (width - 48) / baseTotalW);
    const leftW = Math.floor(PANEL.leftW * panelScale);
    const centerW = Math.floor(PANEL.centerW * panelScale);
    const rightW = Math.floor(PANEL.rightW * panelScale);
    const gap = Math.max(8, Math.floor(PANEL.gap * panelScale));
    const totalW = leftW + centerW + rightW + gap * 2;
    const startX = (width - totalW) / 2;
    const panelH = height - PANEL.top - PANEL.bottomPad;

    this.createStatsPanel(startX, PANEL.top, leftW, panelH);
    this.createCenterPanel(startX + leftW + gap, PANEL.top, centerW, panelH);
    this.createLorePanel(
      startX + leftW + centerW + gap * 2,
      PANEL.top,
      rightW,
      panelH
    );

    this.statusText = this.add
      .text(width / 2, height - 10, "", {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "12px",
        color: UI.danger,
      })
      .setOrigin(0.5, 1);

    this.refreshCycleSelectors();
    this.refreshPreview();
    this.refreshPreviewName();
    this.refreshStats();
    this.refreshLore();
  }

  private createPanel(x: number, y: number, w: number, h: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(UI.panelFill, UI.panelFillAlpha);
    g.fillRoundedRect(x, y, w, h, 4);
    g.lineStyle(2, UI.panelBorder, 0.95);
    g.strokeRoundedRect(x, y, w, h, 4);
    g.lineStyle(1, UI.panelBorderDim, 0.8);
    g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, 2);
    return g;
  }

  private createStatsPanel(x: number, y: number, w: number, h: number) {
    this.createPanel(x, y, w, h);
    const pad = 12;
    let cy = y + pad;

    this.add
      .text(x + w / 2, cy, "ESTADÍSTICAS", {
        fontFamily: "Georgia, serif",
        fontSize: "16px",
        color: UI.title,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);
    cy += 34;

    this.addSectionLabel(x + pad, cy, "ATRIBUTOS");
    cy += 24;

    cy = this.createStatBar(x + pad, cy, w - pad * 2, "Vida", "hp", UI.barHp);
    cy = this.createStatBar(x + pad, cy, w - pad * 2, "Maná", "mana", UI.barMana);
    cy = this.createStatBar(x + pad, cy, w - pad * 2, "Energía", "energy", UI.barEnergy);
    cy += 8;

    this.addSectionLabel(x + pad, cy, "MODIFICADORES");
    cy += 18;

    const modLines: Array<[string, string]> = [
      ["intelligence", "Inteligencia"],
      ["constitution", "Constitución"],
      ["strength", "Fuerza"],
      ["agility", "Agilidad"],
      ["magicResist", "Resistencia Mágica"],
    ];

    for (const [key, label] of modLines) {
      this.add
        .text(x + pad, cy, label, {
          fontFamily: "Segoe UI, Tahoma, sans-serif",
          fontSize: "11px",
          color: UI.label,
        })
        .setOrigin(0, 0);
      const value = this.add
        .text(x + w - pad, cy, "-", {
          fontFamily: "Segoe UI, Tahoma, sans-serif",
          fontSize: "11px",
          color: UI.text,
        })
        .setOrigin(1, 0);
      this.statValueTexts[key] = value;
      cy += 16;
    }
  }

  private createStatBar(
    x: number,
    y: number,
    width: number,
    label: string,
    key: string,
    color: number
  ): number {
    const barH = 14;
    this.add
      .text(x, y - 2, label, {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "11px",
        color: UI.label,
      })
      .setOrigin(0, 1);

    const valueText = this.add
      .text(x + width / 2, y + barH / 2, "0", {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "11px",
        color: UI.text,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.statValueTexts[key] = valueText;

    const track = this.add.graphics();
    track.fillStyle(UI.barTrack, 1);
    track.fillRoundedRect(x, y, width, barH, 3);

    const fill = this.add.graphics();
    this.barFills[key] = fill;
    this.barGeom[key] = { x, y, width, height: barH, color };

    return y + barH + 14;
  }

  private createCenterPanel(x: number, y: number, w: number, h: number) {
    this.createPanel(x, y, w, h);
    const pad = 12;
    let cy = y + pad;

    this.add
      .text(x + w / 2, cy, "CREAR PERSONAJE", {
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        color: UI.title,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);
    cy += 34;

    const previewW = 128;
    const previewH = 156;
    const previewX = x + pad + previewW / 2;
    this.previewCenterX = previewX;
    this.previewFeetY = cy + previewH - 20;

    const previewFrame = this.add.graphics();
    previewFrame.lineStyle(1, UI.panelBorderDim, 1);
    previewFrame.strokeRoundedRect(x + pad, cy, previewW, previewH, 4);
    previewFrame.fillStyle(0x090607, 0.78);
    previewFrame.fillRoundedRect(x + pad, cy, previewW, previewH, 4);

    this.previewBody = this.add.sprite(previewX, this.previewFeetY, "human_male_base", 0);
    applyPlayerOrigin(this.previewBody);
    this.previewBody.setScale(2);

    this.previewFace = this.add.sprite(previewX, this.previewFeetY, faceTextureKey("human", "male"), 0);
    this.previewFace.setOrigin(0.5, 1);

    this.previewNameLabel = this.add
      .text(previewX, cy + previewH + 8, "", {
        fontFamily: GAME_FONT,
        fontSize: "13px",
        color: getFactionNameColors(this.factionId).fill,
        fontStyle: "bold",
        stroke: getFactionNameColors(this.factionId).stroke,
        strokeThickness: 3,
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);

    const fieldsX = x + pad + previewW + 14;
    const fieldW = w - pad * 2 - previewW - 14;
    let fy = cy;

    fy = this.createNameField(fieldsX, fy, fieldW) + 8;
    fy = this.createCycleField(
      fieldsX,
      fy,
      fieldW,
      "GÉNERO",
      "gender",
      ALL_GENDERS,
      () => this.genderId,
      (v) => {
        this.genderId = v;
      }
    );
    fy = this.createCycleField(
      fieldsX,
      fy,
      fieldW,
      "RAZA",
      "race",
      ALL_RACES,
      () => this.raceId,
      (v) => {
        this.raceId = v;
      }
    );
    fy = this.createCycleField(
      fieldsX,
      fy,
      fieldW,
      "CLASE",
      "class",
      ALL_CLASSES,
      () => this.classId,
      (v) => {
        this.classId = v;
      }
    );

    const aspectY = cy + previewH + 34;
    this.createCycleField(
      x + pad,
      aspectY,
      previewW,
      "ASPECTO",
      "aspect",
      null,
      () => this.faceIndex,
      (v) => {
        this.faceIndex = v;
      },
      () => String(this.faceIndex + 1)
    );

    const factionY = aspectY + 46;
    this.add
      .text(x + pad, factionY, "FACCIÓN", {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "11px",
        color: UI.label,
      })
      .setOrigin(0, 0);

    this.createFactionButton(x + pad, factionY + 16, "ciudadano");

    const btnY = y + h - pad - 32;
    this.createActionButton(x + pad, btnY, 100, 32, "VOLVER", false, () => this.goBack());
    this.createActionButton(x + w - pad - 130, btnY, 130, 32, "CREAR", true, () => this.createCharacter());
  }

  private createLorePanel(x: number, y: number, w: number, h: number) {
    this.createPanel(x, y, w, h);
    this.lorePanelOrigin = { x, y, w };
    const pad = 12;

    for (let section = 0; section < 3; section += 1) {
      const title = this.add
        .text(x + pad, y + pad, "", {
          fontFamily: "Georgia, serif",
          fontSize: "13px",
          color: UI.title,
          fontStyle: "bold",
        })
        .setOrigin(0, 0);
      const body = this.add
        .text(x + pad, y + pad, "", {
          fontFamily: "Segoe UI, Tahoma, sans-serif",
          fontSize: "11px",
          color: UI.muted,
          wordWrap: { width: w - pad * 2 },
          lineSpacing: 4,
        })
        .setOrigin(0, 0);
      this.loreTexts.push(title, body);
    }
  }

  private addSectionLabel(x: number, y: number, text: string) {
    this.add
      .text(x, y, text, {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "11px",
        color: UI.title,
        fontStyle: "bold",
      })
      .setOrigin(0, 0);
  }

  private createNameField(x: number, y: number, width: number): number {
    this.add
      .text(x, y, "NOMBRE", {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "11px",
        color: UI.label,
      })
      .setOrigin(0, 0);
    y += 16;

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 18;
    input.placeholder = "";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.style.width = `${width}px`;
    input.style.height = "28px";
    input.style.padding = "4px 8px";
    input.style.border = `1px solid ${UI.inputBorder}`;
    input.style.borderRadius = "4px";
    input.style.background = UI.inputBg;
    input.style.color = "#fff3d2";
    input.style.font = '13px "Segoe UI", Tahoma, sans-serif';
    input.style.outline = "none";
    input.style.boxSizing = "border-box";
    input.style.boxShadow = "inset 0 0 0 1px rgba(0, 0, 0, 0.35)";
    input.addEventListener("input", () => {
      this.name = input.value.trim();
      this.refreshPreviewName();
    });
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
    });

    this.nameInputEl = input;
    this.add.dom(x, y, input).setOrigin(0, 0);
    return y + 32;
  }

  private createCycleField<T extends string | number>(
    x: number,
    y: number,
    width: number,
    label: string,
    fieldId: CycleFieldId,
    options: readonly T[] | null,
    getValue: () => T,
    setValue: (value: T) => void,
    formatLabel?: (value: T) => string
  ): number {
    this.add
      .text(x, y, label, {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "11px",
        color: UI.label,
      })
      .setOrigin(0, 0);
    y += 16;

    const getLabel = (): string => {
      const value = getValue();
      if (formatLabel) return formatLabel(value);
      switch (fieldId) {
        case "gender":
          return GENDER_UI_LABELS[value as CharacterGenderId];
        case "race":
          return RACE_LABELS[value as CharacterRaceId];
        case "class":
          return CLASS_LABELS[value as CharacterClassId];
        case "aspect":
          return String((value as number) + 1);
        default:
          return String(value);
      }
    };

    const cycle = (delta: number) => {
      if (options === null) {
        const current = getValue() as number;
        const next = (current + delta + FACE_COUNT) % FACE_COUNT;
        setValue(next as T);
      } else {
        const idx = options.indexOf(getValue());
        const next = (idx + delta + options.length) % options.length;
        setValue(options[next]);
      }
      this.onSelectionChanged();
    };

    const valueText = this.drawSelectorBox(
      x,
      y,
      width,
      28,
      getLabel(),
      () => cycle(-1),
      () => cycle(1),
      true
    );
    this.cycleValueTexts.push(valueText);
    this.cycleLabelGetters.push(getLabel);
    return y + 36;
  }

  private refreshCycleSelectors() {
    for (let i = 0; i < this.cycleValueTexts.length; i += 1) {
      this.cycleValueTexts[i].setText(this.cycleLabelGetters[i]());
    }
  }

  private drawSelectorBox(
    x: number,
    y: number,
    width: number,
    height: number,
    _initialLabel: string,
    onPrev: () => void,
    onNext: () => void,
    interactive: boolean
  ): Phaser.GameObjects.Text {
    const g = this.add.graphics();
    const draw = () => {
      g.clear();
      g.fillStyle(UI.selectorBg, 1);
      g.fillRoundedRect(x, y, width, height, 4);
      g.lineStyle(1, UI.panelBorderDim, 1);
      g.strokeRoundedRect(x, y, width, height, 4);
    };
    draw();

    const labelText = this.add
      .text(x + width / 2, y + height / 2, _initialLabel, {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "12px",
        color: UI.text,
      })
      .setOrigin(0.5);

    if (!interactive) return labelText;

    const btnW = 22;
    const makeArrow = (ax: number, dir: -1 | 1) => {
      const arrowBg = this.add.graphics();
      const drawArrowBg = (hover: boolean) => {
        arrowBg.clear();
        arrowBg.fillStyle(hover ? UI.buttonHover : UI.accentDim, 1);
        arrowBg.fillRoundedRect(ax - btnW / 2 + 2, y + 3, btnW - 4, height - 6, 3);
      };
      drawArrowBg(false);
      const hit = this.add
        .rectangle(ax, y + height / 2, btnW, height, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      const arrow = this.add
        .text(ax, y + height / 2, dir < 0 ? "<" : ">", {
          fontFamily: "Segoe UI, Tahoma, sans-serif",
          fontSize: "14px",
          color: UI.muted,
        })
        .setOrigin(0.5);
      hit.on("pointerup", () => {
        if (dir < 0) onPrev();
        else onNext();
      });
      hit.on("pointerover", () => {
        arrow.setColor(UI.text);
        drawArrowBg(true);
      });
      hit.on("pointerout", () => {
        arrow.setColor(UI.muted);
        drawArrowBg(false);
      });
    };

    makeArrow(x + btnW / 2, -1);
    makeArrow(x + width - btnW / 2, 1);
    return labelText;
  }

  private createFactionButton(x: number, y: number, faction: CharacterFactionId) {
    const size = 48;
    const cx = x + size / 2;
    const cy = y + size / 2;
    const bg = this.add.graphics();
    this.factionBgs[faction] = bg;
    this.factionCenters[faction] = { x: cx, y: cy };
    this.drawFactionButton(faction, this.factionId === faction);

    if (faction === "ciudadano") {
      const icon = this.add.image(cx, cy, IMPERIAL_SHIELD_KEY).setOrigin(0.5);
      icon.setDisplaySize(36, 36);
      this.factionIcons[faction] = icon;
    }

    const label = this.add
      .text(cx, cy + size / 2 + 6, FACTION_LABELS[faction], {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "9px",
        color: faction === "caos" ? UI.factionCaosLabel : UI.muted,
      })
      .setOrigin(0.5, 0);
    this.factionLabels[faction] = label;

    const hit = this.add
      .rectangle(cx, cy, size, size, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on("pointerup", () => {
      this.factionId = faction;
      this.refreshFactionButtons();
      this.onSelectionChanged();
    });
  }

  private drawFactionButton(faction: CharacterFactionId, selected: boolean) {
    const bg = this.factionBgs[faction];
    const center = this.factionCenters[faction];
    if (!bg || !center) return;
    const size = 48;
    const { x: cx, y: cy } = center;
    bg.clear();
    bg.fillStyle(faction === "ciudadano" ? UI.selectorBg : UI.factionCaos, 1);
    bg.fillRoundedRect(cx - size / 2, cy - size / 2, size, size, 4);
    bg.lineStyle(selected ? 2 : 1, selected ? UI.accent : UI.panelBorderDim, 1);
    bg.strokeRoundedRect(cx - size / 2, cy - size / 2, size, size, 4);
    bg.lineStyle(1, 0x000000, 0.35);
    bg.strokeRoundedRect(cx - size / 2 + 4, cy - size / 2 + 4, size - 8, size - 8, 2);
  }

  private refreshFactionButtons() {
    (["ciudadano", "caos"] as CharacterFactionId[]).forEach((faction) => {
      this.drawFactionButton(faction, this.factionId === faction);
    });
  }

  private createActionButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    primary: boolean,
    onClick: () => void
  ) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const g = this.add.graphics();
    const draw = (hover: boolean) => {
      g.clear();
      g.fillStyle(primary ? (hover ? UI.buttonHover : UI.accentDim) : UI.selectorBg, 1);
      g.fillRoundedRect(x, y, width, height, 4);
      g.lineStyle(1, primary ? UI.accent : UI.panelBorderDim, 1);
      g.strokeRoundedRect(x, y, width, height, 4);
    };
    draw(false);

    this.add
      .text(cx, cy, label, {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "13px",
        color: primary ? "#ffffff" : UI.text,
        fontStyle: primary ? "bold" : "normal",
      })
      .setOrigin(0.5);

    const hit = this.add
      .rectangle(cx, cy, width, height, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on("pointerover", () => draw(true));
    hit.on("pointerout", () => draw(false));
    hit.on("pointerup", onClick);
  }

  private onSelectionChanged() {
    this.refreshCycleSelectors();
    this.refreshPreview();
    this.refreshPreviewName();
    this.refreshStats();
    this.refreshLore();
    this.setStatus("");
  }

  private refreshPreviewName() {
    if (!this.previewNameLabel) return;
    const trimmed = (this.nameInputEl?.value ?? this.name).trim();
    const colors = getFactionNameColors(this.factionId);
    const displayName =
      trimmed.length > 14 ? `${trimmed.slice(0, 14)}...` : trimmed;
    this.previewNameLabel.setText(displayName.length > 0 ? displayName : "Tu nombre");
    this.previewNameLabel.setColor(colors.fill);
    this.previewNameLabel.setStroke(colors.stroke, 3);
  }

  private refreshPreview() {
    const bodyKey = raceBodyTextureKey(this.raceId, this.genderId);
    const textureKey = textureKeyForPlayer("base", bodyKey);
    this.previewBody.setTexture(textureKey, 0);
    this.previewFace.setTexture(faceTextureKey(this.raceId, this.genderId));
    const layout = getRaceFaceLayout(this.raceId, this.genderId);
    this.previewFace.setScale(layout.scale * 2);
    this.previewFace.setFrame(
      getFaceFrame(this.raceId, this.genderId, this.faceIndex, "down")
    );
    const faceOffset = layout.offset.down;
    this.previewFace.setPosition(
      this.previewBody.x + faceOffset.x * 2,
      this.previewBody.y - faceOffset.y * 2
    );
  }

  private refreshStats() {
    const stats = resolveCoreStats(this.raceId, this.classId);
    const vitals = getPreviewVitals(stats, this.classId, this.raceId);
    const mods = getPreviewModifiers(stats, this.classId);

    this.updateBar("hp", vitals.hp, vitals.hp / 120);
    this.updateBar(
      "mana",
      vitals.mana,
      CLASS_USES_MANA[this.classId] ? vitals.mana / 50 : 0
    );
    this.updateBar("energy", vitals.energy, vitals.energy / 550);

    this.statValueTexts.intelligence.setText(String(stats.intelligence));
    this.statValueTexts.constitution.setText(String(stats.constitution));
    this.statValueTexts.strength.setText(String(stats.strength));
    this.statValueTexts.agility.setText(String(stats.agility));
    this.statValueTexts.magicResist.setText(`${mods.magicResistancePercent}%`);
  }

  private updateBar(key: string, value: number, ratio: number) {
    this.statValueTexts[key].setText(String(value));
    const bar = this.barFills[key];
    const geom = this.barGeom[key];
    if (!bar || !geom) return;
    bar.clear();
    const fillW = Math.max(4, Math.floor(geom.width * Phaser.Math.Clamp(ratio, 0, 1)));
    bar.fillStyle(geom.color, 1);
    bar.fillRoundedRect(geom.x, geom.y, fillW, geom.height, 3);
  }

  private refreshLore() {
    const titles = [
      CLASS_LABELS[this.classId].toUpperCase(),
      RACE_LABELS[this.raceId].toUpperCase(),
      "FACCIÓN",
    ];
    const bodies = [
      CLASS_DESCRIPTIONS[this.classId],
      RACE_DESCRIPTIONS[this.raceId],
      FACTION_DESCRIPTIONS[this.factionId],
    ];
    const pad = 12;
    const { x, y, w } = this.lorePanelOrigin;
    let cy = y + pad;

    for (let i = 0; i < 3; i += 1) {
      const title = this.loreTexts[i * 2];
      const body = this.loreTexts[i * 2 + 1];
      title.setText(titles[i]);
      title.setPosition(x + pad, cy);
      cy += title.height + 6;
      body.setText(bodies[i]);
      body.setPosition(x + pad, cy);
      cy += body.height + 16;
    }
  }

  private setStatus(message: string) {
    this.statusText.setText(message);
  }

  private goBack() {
    this.scene.start("CharacterSelectScene", { returnMode: this.returnMode });
  }

  private createCharacter() {
    const trimmed = (this.nameInputEl?.value ?? this.name).trim();
    const normalizedName = trimmed.toLocaleLowerCase("es-AR");
    if (trimmed.length < 3) {
      this.setStatus("El nombre debe tener al menos 3 caracteres.");
      return;
    }
    if (trimmed.length > 18) {
      this.setStatus("El nombre no puede superar 18 caracteres.");
      return;
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/.test(trimmed)) {
      this.setStatus("Usá solo letras y espacios en el nombre.");
      return;
    }

    const nameAlreadyUsed = loadCharacterSlots().some((slot, index) => {
      if (!slot || index === this.slotIndex) {
        return false;
      }
      return slot.name.trim().toLocaleLowerCase("es-AR") === normalizedName;
    });
    if (nameAlreadyUsed) {
      this.setStatus("Ese nombre ya existe.");
      return;
    }

    const character: SavedCharacter = {
      id: createCharacterId(),
      name: trimmed,
      classId: this.classId,
      raceId: this.raceId,
      genderId: this.genderId,
      factionId: this.factionId,
      faceIndex: clampFaceIndex(this.faceIndex),
      level: 1,
      homeMapId: START_MAP_ID,
    };

    if (!saveCharacterToSlot(this.slotIndex, character)) {
      this.setStatus("No se pudo guardar el personaje.");
      return;
    }

    this.scene.start("CharacterSelectScene", { returnMode: this.returnMode });
  }

  shutdown() {
    if (this.nameInputEl?.parentElement) {
      this.nameInputEl.parentElement.removeChild(this.nameInputEl);
    }
  }
}
