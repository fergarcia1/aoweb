import Phaser from "phaser";
import {
  CHARACTER_SLOT_COUNT,
  CLASS_LABELS,
  loadCharacterSlots,
  formatRaceGenderLabel,
  getFactionNameColors,
  setActiveCharacterSlotIndex,
  type CharacterSlot,
  type SavedCharacter,
} from "../data/characters";

const MENU_COLORS = {
  bg: 0x0d1117,
  panel: 0x151515,
  panelBorder: 0x4a4a4a,
  slotBg: 0x101010,
  slotBorder: 0x5c5c5c,
  slotHover: 0x2a3446,
  slotEmpty: 0x1b1f2a,
  accent: 0xc9a227,
  text: "#e6edf3",
  muted: "#9aa4b2",
  plus: "#7d8a99",
};

const SLOT_COLS = 3;
const SLOT_ROWS = 2;
const SLOT_WIDTH = 210;
const SLOT_HEIGHT = 168;
const SLOT_GAP_X = 18;
const SLOT_GAP_Y = 20;

type CharacterSelectSceneData = {
  returnMode?: "resume" | "enter";
};

export class CharacterSelectScene extends Phaser.Scene {
  private slots: CharacterSlot[] = [];
  private statusText!: Phaser.GameObjects.Text;
  private returnMode: "resume" | "enter" = "enter";

  constructor() {
    super("CharacterSelectScene");
  }

  init(data: CharacterSelectSceneData = {}) {
    this.returnMode = data.returnMode ?? "enter";
  }

  create() {
    this.slots = loadCharacterSlots();
    const { width, height } = this.scale;

    this.add
      .rectangle(width / 2, height / 2, width, height, MENU_COLORS.bg)
      .setOrigin(0.5);

    this.add
      .text(width / 2, 42, "Selección de personaje", {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "28px",
        color: MENU_COLORS.text,
      })
      .setOrigin(0.5, 0);

    this.add
      .text(width / 2, 78, "Elegí un personaje o creá uno nuevo", {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "14px",
        color: MENU_COLORS.muted,
      })
      .setOrigin(0.5, 0);

    const gridWidth = SLOT_COLS * SLOT_WIDTH + (SLOT_COLS - 1) * SLOT_GAP_X;
    const gridHeight = SLOT_ROWS * SLOT_HEIGHT + (SLOT_ROWS - 1) * SLOT_GAP_Y;
    const gridStartX = (width - gridWidth) / 2 + SLOT_WIDTH / 2;
    const gridStartY = (height - gridHeight) / 2 + 18 + SLOT_HEIGHT / 2;

    for (let index = 0; index < CHARACTER_SLOT_COUNT; index += 1) {
      const col = index % SLOT_COLS;
      const row = Math.floor(index / SLOT_COLS);
      const x = gridStartX + col * (SLOT_WIDTH + SLOT_GAP_X);
      const y = gridStartY + row * (SLOT_HEIGHT + SLOT_GAP_Y);
      this.createSlot(index, x, y, this.slots[index]);
    }

    this.statusText = this.add
      .text(width / 2, height - 88, "", {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "14px",
        color: MENU_COLORS.muted,
        align: "center",
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5, 0);

    this.createFooterButtons(width, height);
  }

  private createSlot(index: number, x: number, y: number, character: CharacterSlot) {
    const container = this.add.container(x, y);
    const isEmpty = character === null;

    const bg = this.add.graphics();
    const drawBg = (hovered: boolean) => {
      bg.clear();
      bg.fillStyle(isEmpty ? MENU_COLORS.slotEmpty : MENU_COLORS.slotBg, 1);
      bg.fillRoundedRect(-SLOT_WIDTH / 2, -SLOT_HEIGHT / 2, SLOT_WIDTH, SLOT_HEIGHT, 8);
      bg.lineStyle(2, hovered ? MENU_COLORS.accent : MENU_COLORS.slotBorder, 1);
      bg.strokeRoundedRect(-SLOT_WIDTH / 2, -SLOT_HEIGHT / 2, SLOT_WIDTH, SLOT_HEIGHT, 8);
    };
    drawBg(false);
    container.add(bg);

    if (isEmpty) {
      const plus = this.add
        .text(0, -8, "+", {
          fontFamily: "Segoe UI, Tahoma, sans-serif",
          fontSize: "56px",
          color: MENU_COLORS.plus,
        })
        .setOrigin(0.5);
      container.add(plus);

      const emptyLabel = this.add
        .text(0, 44, "Vacío", {
          fontFamily: "Segoe UI, Tahoma, sans-serif",
          fontSize: "16px",
          color: MENU_COLORS.muted,
        })
        .setOrigin(0.5);
      container.add(emptyLabel);
    } else {
      const name = this.add
        .text(0, -24, character.name, {
          fontFamily: "Segoe UI, Tahoma, sans-serif",
          fontSize: "22px",
          color: getFactionNameColors(character.factionId).fill,
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      container.add(name);

      const details = this.add
        .text(
          0,
          12,
          `${CLASS_LABELS[character.classId]}\n${formatRaceGenderLabel(character.raceId, character.genderId)} · Nv. ${character.level}`,
          {
            fontFamily: "Segoe UI, Tahoma, sans-serif",
            fontSize: "14px",
            color: MENU_COLORS.muted,
            align: "center",
          }
        )
        .setOrigin(0.5);
      container.add(details);

      const playHint = this.add
        .text(0, SLOT_HEIGHT / 2 - 28, "Jugar", {
          fontFamily: "Segoe UI, Tahoma, sans-serif",
          fontSize: "13px",
          color: "#d4b65a",
        })
        .setOrigin(0.5);
      container.add(playHint);
    }

    const hitArea = this.add
      .rectangle(0, 0, SLOT_WIDTH, SLOT_HEIGHT, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    container.add(hitArea);
    container.sendToBack(hitArea);

    hitArea.on("pointerover", () => drawBg(true));
    hitArea.on("pointerout", () => drawBg(false));
    hitArea.on("pointerup", () => {
      if (character) {
        this.selectCharacter(index, character);
        return;
      }
      this.scene.start("CharacterCreationScene", {
        slotIndex: index,
        returnMode: this.returnMode,
      });
    });
  }

  private createFooterButtons(width: number, height: number) {
    const backLabel = this.returnMode === "resume" ? "Volver al juego" : "Salir";
    this.createButton(width / 2 - 110, height - 42, backLabel, () => this.goBack());
  }

  private createButton(x: number, y: number, label: string, onClick: () => void) {
    const buttonWidth = 200;
    const buttonHeight = 36;
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    const draw = (hovered: boolean) => {
      bg.clear();
      bg.fillStyle(hovered ? MENU_COLORS.slotHover : MENU_COLORS.panel, 1);
      bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 6);
      bg.lineStyle(1, MENU_COLORS.panelBorder, 1);
      bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 6);
    };
    draw(false);
    container.add(bg);

    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "14px",
        color: MENU_COLORS.text,
      })
      .setOrigin(0.5);
    container.add(text);

    const hitArea = this.add
      .rectangle(0, 0, buttonWidth, buttonHeight, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    container.add(hitArea);
    container.sendToBack(hitArea);

    hitArea.on("pointerover", () => draw(true));
    hitArea.on("pointerout", () => draw(false));
    hitArea.on("pointerup", onClick);
  }

  private setStatus(message: string) {
    this.statusText.setText(message);
  }

  private selectCharacter(slotIndex: number, character: SavedCharacter) {
    setActiveCharacterSlotIndex(slotIndex);
    this.setStatus(`Entrando con ${character.name}...`);

    if (this.returnMode === "resume") {
      this.scene.stop();
      this.scene.resume("GameScene");
      this.game.registry.set("activeCharacter", character);
      this.game.registry.set("activeCharacterSlotIndex", slotIndex);
      return;
    }

    this.scene.start("GameScene", { character, slotIndex });
  }

  private goBack() {
    if (this.returnMode === "resume") {
      this.scene.stop();
      this.scene.resume("GameScene");
      return;
    }

    this.scene.start("GameScene");
  }
}
