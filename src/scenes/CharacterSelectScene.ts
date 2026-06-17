import Phaser from "phaser";
import {
  CHARACTER_SLOT_COUNT,
  CLASS_LABELS,
  formatRaceGenderLabel,
  getFactionNameColors,
  loadCharacterSlots,
  saveCharacterSlots,
  setActiveCharacterSlotIndex,
  type CharacterSlot,
  type SavedCharacter,
} from "../data/characters";
import { clearAuthSession, getAuthAccount } from "../network/authApi";
import { disconnectActiveMultiplayer } from "../network/multiplayerSession";
import { loadCharacterProgress, type SavedCharacterProgress } from "../game/characterProgressStorage";
import {
  createEquippedOverlaySprite,
  syncEquippedHeldItemVisuals,
} from "../game/equippedGear";
import { getRaceFaceLayout } from "../player/raceFaceLayout";
import {
  faceTextureKey,
  getFaceFrame,
  registerRaceFaces,
  setupRaceFacesTextures,
} from "../player/raceFaces";
import {
  applyPlayerOrigin,
  buildEquippedArmorVisualFromItem,
  raceBodyTextureKey,
  registerPlayerSprites,
  setupPlayerTexture,
  textureKeyForPlayer,
} from "../player/playerSprites";
import {
  tryGetItemDefinition,
  type EquipmentSlot,
  type ItemId,
} from "../../game-data/items/definitions";
import { queueItemAssetsById } from "./gameSceneModules/gameSceneAssetQueue";
import { GAME_FONT, GAME_TEXT_RESOLUTION } from "../ui/fonts";

const MENU_COLORS = {
  bg: 0x080607,
  overlay: 0x070607,
  panel: 0x120d0b,
  panelBorder: 0x9b1d16,
  panelBorderDim: 0x5d241d,
  slotBg: 0x0f0a09,
  slotHover: 0x24100d,
  slotEmpty: 0x17100f,
  accent: 0xd4a72c,
  title: "#f1c44d",
  text: "#fff3d2",
  muted: "#bda98a",
  plus: "#d8a475",
  danger: "#ff5a4f",
  buttonBg: 0x4b1714,
  buttonHover: 0x6f211d,
};

const SLOT_COLS = 3;
const SLOT_ROWS = 2;
const SLOT_WIDTH = 218;
const SLOT_HEIGHT = 156;
const SLOT_GAP_X = 18;
const SLOT_GAP_Y = 20;
const HERO_BACKGROUND_KEY = "aoweb-character-select-bg";
const HERO_BACKGROUND_URL = "/assets/ui/aoweb-dragon-war-loading.png";

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

  preload() {
    this.load.image(HERO_BACKGROUND_KEY, HERO_BACKGROUND_URL);
    registerRaceFaces(this);
    registerPlayerSprites(this);
    this.queueSavedEquipmentAssets();
  }

  create() {
    this.slots = loadCharacterSlots();
    setupPlayerTexture(this);
    setupRaceFacesTextures(this);

    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, MENU_COLORS.bg).setOrigin(0.5);

    const bg = this.add.image(width / 2, height / 2, HERO_BACKGROUND_KEY).setOrigin(0.5);
    bg.setScale(Math.max(width / bg.width, height / bg.height));
    bg.setAlpha(0.38);
    this.add.rectangle(width / 2, height / 2, width, height, MENU_COLORS.overlay, 0.7);

    this.add
      .text(width / 2, 36, "SELECCION DE PERSONAJE", {
        fontFamily: "Georgia, serif",
        fontSize: "24px",
        color: MENU_COLORS.title,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);

    this.add
      .text(width / 2, 70, "Elegi un personaje o crea uno nuevo", {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "13px",
        color: MENU_COLORS.muted,
      })
      .setOrigin(0.5, 0);

    const account = getAuthAccount();
    this.add
      .text(width / 2, 96, account ? `Cuenta: ${account.username}` : "Modo dev sin cuenta", {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "12px",
        color: MENU_COLORS.muted,
      })
      .setOrigin(0.5, 0);

    const baseGridWidth = SLOT_COLS * SLOT_WIDTH + (SLOT_COLS - 1) * SLOT_GAP_X;
    const gridScale = Math.min(1, (width - 52) / baseGridWidth);
    const slotW = Math.floor(SLOT_WIDTH * gridScale);
    const slotH = Math.floor(SLOT_HEIGHT * gridScale);
    const gapX = Math.max(10, Math.floor(SLOT_GAP_X * gridScale));
    const gapY = Math.max(12, Math.floor(SLOT_GAP_Y * gridScale));
    const gridWidth = SLOT_COLS * slotW + (SLOT_COLS - 1) * gapX;
    const gridHeight = SLOT_ROWS * slotH + (SLOT_ROWS - 1) * gapY;
    const gridStartX = (width - gridWidth) / 2 + slotW / 2;
    const gridTop = Math.max(132, Math.floor((height - gridHeight) / 2) + 8);
    const gridStartY = gridTop + slotH / 2;

    for (let index = 0; index < CHARACTER_SLOT_COUNT; index += 1) {
      const col = index % SLOT_COLS;
      const row = Math.floor(index / SLOT_COLS);
      const x = gridStartX + col * (slotW + gapX);
      const y = gridStartY + row * (slotH + gapY);
      this.createSlot(index, x, y, slotW, slotH, this.slots[index]);
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

  private createSlot(
    index: number,
    x: number,
    y: number,
    slotW: number,
    slotH: number,
    character: CharacterSlot
  ) {
    const container = this.add.container(x, y);
    const isEmpty = character === null;

    const bg = this.add.graphics();
    const drawBg = (hovered: boolean) => {
      bg.clear();
      bg.fillStyle(
        hovered ? MENU_COLORS.slotHover : isEmpty ? MENU_COLORS.slotEmpty : MENU_COLORS.slotBg,
        0.98
      );
      bg.fillRoundedRect(-slotW / 2, -slotH / 2, slotW, slotH, 6);
      bg.lineStyle(2, hovered ? MENU_COLORS.accent : MENU_COLORS.panelBorder, 0.95);
      bg.strokeRoundedRect(-slotW / 2, -slotH / 2, slotW, slotH, 6);
      bg.lineStyle(1, MENU_COLORS.panelBorderDim, 0.75);
      bg.strokeRoundedRect(-slotW / 2 + 4, -slotH / 2 + 4, slotW - 8, slotH - 8, 3);
    };
    drawBg(false);
    container.add(bg);

    if (isEmpty) {
      const plus = this.add
        .text(0, -14, "+", {
          fontFamily: "Segoe UI, Tahoma, sans-serif",
          fontSize: "46px",
          color: MENU_COLORS.plus,
        })
        .setOrigin(0.5);
      container.add(plus);

      const emptyLabel = this.add
        .text(0, 34, "Crear personaje", {
          fontFamily: "Segoe UI, Tahoma, sans-serif",
          fontSize: "13px",
          color: MENU_COLORS.muted,
        })
        .setOrigin(0.5);
      container.add(emptyLabel);
    } else {
      this.createCharacterPreview(container, character, -slotW / 2 + 54, 48);
      const displayName =
        character.name.length > 13 ? `${character.name.slice(0, 13)}...` : character.name;
      const colors = getFactionNameColors(character.factionId);

      const name = this.add
        .text(34, -48, displayName, {
          fontFamily: GAME_FONT,
          fontSize: "15px",
          color: colors.fill,
          fontStyle: "bold",
          stroke: colors.stroke,
          strokeThickness: 3,
          resolution: GAME_TEXT_RESOLUTION,
        })
        .setOrigin(0.5);
      container.add(name);

      const details = this.add
        .text(
          42,
          -12,
          `${CLASS_LABELS[character.classId]}\n${formatRaceGenderLabel(
            character.raceId,
            character.genderId
          )}\nNv. ${character.level}`,
          {
            fontFamily: "Segoe UI, Tahoma, sans-serif",
            fontSize: "12px",
            color: MENU_COLORS.muted,
            align: "center",
            lineSpacing: 4,
          }
        )
        .setOrigin(0.5);
      container.add(details);

      const playHint = this.add
        .text(42, slotH / 2 - 26, "Jugar", {
          fontFamily: "Segoe UI, Tahoma, sans-serif",
          fontSize: "12px",
          color: MENU_COLORS.title,
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      container.add(playHint);

      const deleteBtn = this.add
        .text(slotW / 2 - 16, -slotH / 2 + 16, "X", {
          fontFamily: "Segoe UI, Tahoma, sans-serif",
          fontSize: "16px",
          color: MENU_COLORS.danger,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      deleteBtn.on("pointerover", () => deleteBtn.setColor("#ffffff"));
      deleteBtn.on("pointerout", () => deleteBtn.setColor(MENU_COLORS.danger));
      deleteBtn.on("pointerdown", (pointer: any, localX: any, localY: any, event: any) => {
        event.stopPropagation();
      });
      deleteBtn.on("pointerup", (pointer: any, localX: any, localY: any, event: any) => {
        event.stopPropagation();
        if (confirm(`Seguro que queres borrar a ${character.name}?`)) {
          this.slots[index] = null;
          saveCharacterSlots(this.slots);
          this.scene.restart();
        }
      });
      container.add(deleteBtn);
    }

    const hitArea = this.add
      .rectangle(0, 0, slotW, slotH, 0xffffff, 0.001)
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

  private createCharacterPreview(
    container: Phaser.GameObjects.Container,
    character: SavedCharacter,
    x: number,
    feetY: number
  ) {
    const saved = loadCharacterProgress(character.id);
    const equipment = this.savedEquipment(saved);
    const armorItem = equipment.armor ? tryGetItemDefinition(equipment.armor) : undefined;
    const armorVisual = armorItem ? buildEquippedArmorVisualFromItem(armorItem) : undefined;
    const equippedOutfit =
      armorItem?.outfitOverride && armorItem.outfitOverride !== "base"
        ? armorItem.outfitOverride
        : saved?.equippedOutfit ?? "base";

    const preview = this.add.container(x, feetY);
    preview.setScale(1.35);
    container.add(preview);

    const bodyKey = raceBodyTextureKey(character.raceId, character.genderId);
    const body = this.add.sprite(
      0,
      0,
      textureKeyForPlayer(equippedOutfit, bodyKey, armorVisual, character.raceId),
      0
    );
    applyPlayerOrigin(body);

    const face = this.add.sprite(0, 0, faceTextureKey(character.raceId, character.genderId));
    face.setOrigin(0.5, 1);
    const layout = getRaceFaceLayout(character.raceId, character.genderId);
    face.setScale(layout.scale);
    face.setFrame(getFaceFrame(character.raceId, character.genderId, character.faceIndex, "down"));
    const offset = layout.offset.down;
    face.setPosition(body.x + offset.x, body.y - offset.y);

    const weapon = createEquippedOverlaySprite(this, 0, 0);
    const shield = createEquippedOverlaySprite(this, 0, 0);
    const helmet = createEquippedOverlaySprite(this, 0, 0);

    preview.add(body);
    preview.add(face);
    preview.add(weapon);
    preview.add(shield);
    preview.add(helmet);

    syncEquippedHeldItemVisuals({
      player: body,
      facing: "down",
      isMoving: false,
      useGhostAppearance: false,
      equipment,
      weaponSprite: weapon,
      shieldSprite: shield,
      helmetSprite: helmet,
    });
  }

  private queueSavedEquipmentAssets(): void {
    const slots = loadCharacterSlots();
    for (const character of slots) {
      if (!character) {
        continue;
      }
      const saved = loadCharacterProgress(character.id);
      if (!saved) {
        continue;
      }
      for (const itemId of Object.values(saved.equipment)) {
        if (itemId) {
          queueItemAssetsById(this, itemId, { raceId: character.raceId });
        }
      }
    }
  }

  private savedEquipment(
    saved: SavedCharacterProgress | null
  ): Record<EquipmentSlot, ItemId | null> {
    return {
      weapon: saved?.equipment.weapon ?? null,
      shield: saved?.equipment.shield ?? null,
      helmet: saved?.equipment.helmet ?? null,
      armor: saved?.equipment.armor ?? null,
    };
  }

  private createFooterButtons(width: number, height: number) {
    const canReturn = this.canReturnToGame();
    const account = getAuthAccount();
    if (canReturn) {
      const backLabel = this.returnMode === "resume" ? "Volver al juego" : "Salir";
      this.createButton(account ? width / 2 - 110 : width / 2, height - 42, backLabel, () =>
        this.goBack()
      );
    }
    if (account) {
      this.createButton(canReturn ? width / 2 + 110 : width / 2, height - 42, "Cerrar sesion", () =>
        this.logout()
      );
    }
  }

  private canReturnToGame(): boolean {
    if (this.returnMode === "resume") {
      return true;
    }
    const gameScene = this.scene.get("GameScene");
    return Boolean(gameScene?.scene.isActive() || gameScene?.scene.isPaused());
  }

  private createButton(x: number, y: number, label: string, onClick: () => void) {
    const buttonWidth = 200;
    const buttonHeight = 36;
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    const draw = (hovered: boolean) => {
      bg.clear();
      bg.fillStyle(hovered ? MENU_COLORS.buttonHover : MENU_COLORS.buttonBg, 1);
      bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 4);
      bg.lineStyle(1, MENU_COLORS.accent, 1);
      bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 4);
    };
    draw(false);
    container.add(bg);

    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "14px",
        color: MENU_COLORS.text,
        fontStyle: "bold",
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

    const gameScene = this.scene.get("GameScene");
    if (gameScene?.scene.isPaused()) {
      this.scene.stop();
      this.scene.resume("GameScene");
    }
  }

  private logout() {
    disconnectActiveMultiplayer();
    clearAuthSession();
    this.scene.stop("GameScene");
    this.scene.start("AuthScene");
  }
}
