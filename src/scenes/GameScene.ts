import Phaser from "phaser";
import { STEP_DURATION_MS, TILE_SIZE } from "../config";
import {
  EDGE_TRANSITION_TRIGGER_DISTANCE,
  findTransition,
  getAllMaps,
  getMap,
  START_MAP_ID,
  type GameMap,
} from "../maps";
import { getTileDefinition, TILE } from "../maps/tileDefinitions";
import {
  applyPlayerOrigin,
  feetOffsetForOutfit,
  Facing,
  Outfit,
  playerAnimationKey,
  registerPlayerAnimations,
  registerPlayerSprites,
  setupPlayerTexture,
  tileToFeetWorld,
  textureKeyForOutfit,
} from "../player/playerSprites";
import {
  getHumanFaceFrame,
  HUMAN_FACE_TEXTURE_KEY,
  registerHumanFaces,
  setupHumanFacesTexture,
} from "../player/humanFaces";
import {
  createTerrainTile,
  pickGrassFrame,
  pickWaterFrame,
  registerAoTerrain,
  setupAoTerrainTexture,
} from "../terrain/aoTerrain";
import {
  GameUi,
  type MacroActionType,
  type MacroEditorConfig,
  type MacroEditorItemOption,
  type MacroEditorSpellOption,
} from "../ui/gameUi";
import {
  registerInventoryPanelAssets,
  setupInventoryPanelTextures,
} from "../ui/inventoryPanel";
import { getActiveCharacter, type SavedCharacter } from "../data/characters";
import { getGameViewport } from "../ui/layout";
import {
  getItemDefinition,
  ITEM_DEFINITIONS,
  type EquipmentSlot,
  type ItemId,
} from "../items/itemDefinitions";
import {
  addToInventory,
  formatStackLabel,
  type InventorySlot,
} from "../items/inventoryStack";
import { SPELL_DEFINITIONS, type SpellDefinition } from "../data/spells";
import {
  MOB_MODELS,
  MOB_SPAWNS,
  type MobDropConfig,
  type MobModelId,
  type MobSpawnConfig,
} from "../data/mobs";



type MoveDirection = {
  dx: number;
  dy: number;
  facing: Facing;
};

type DummyState = {
  spawnConfig: MobSpawnConfig;
  id: string;
  modelId: MobModelId;
  name: string;
  mapId: string;
  tileX: number;
  tileY: number;
  hitboxOffsetY: number;
  sizeTiles: number;
  hp: number;
  maxHp: number;
  detectionRangeTiles: number;
  leashRangeTiles: number;
  attackDamage: number;
  attackCooldownMs: number;
  respawnMs: number;
  expReward: number;
  drops: MobDropConfig[];
  aiMoveCooldownMs: number;
  nextAiMoveAt: number;
  nextAttackAt: number;
  immobilizedUntilMs: number;
  isAggroed: boolean;
  isStatic: boolean;
  fixedSpawnTile?: { x: number; y: number };
  facing: Facing;
  isMoving: boolean;
  sprite: Phaser.GameObjects.Sprite;
  hpLabel: Phaser.GameObjects.Text;
  alive: boolean;
};

type PlayerProgressState = {
  level: number;
  exp: number;
  expToNext: number;
  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;
  gold: number;
};
type PlayerCombatSnapshot = {
  attackMin: number;
  attackMax: number;
  damageReductionPercent: number;
};
type MacroBinding = {
  keyCode: string | null;
  action: MacroActionType;
  itemId: ItemId | null;
  spellId: number | null;
};
type SpellCastRequest = {
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
type CoreStats = {
  strength: number;
  constitution: number;
  agility: number;
  intelligence: number;
};
type RaceId = "human" | "drow";
type ClassId = "paladin" | "mago" | "druida" | "guerrero" | "cazador" | "asesino";
type PlayerAffiliation = "ciudadano" | "criminal";

const DEFAULT_PLAYER_NAME = "Lonler";
const PLAYER_NAME_COLOR = "#4da6ff";

const PLAYER_FACE_SCALE = 0.75;
const ATTACK_COOLDOWN_MS = 800;
const ATTACK_MIN_DAMAGE = 8;
const ATTACK_MAX_DAMAGE = 16;
/** Velocidad de movimiento de mobs respecto al jugador (0.45 = 45%). */
const MOB_MOVE_SPEED_RATIO = 0.45;
const MOB_STEP_DURATION_MS = Math.ceil(STEP_DURATION_MS / MOB_MOVE_SPEED_RATIO);
const MOB_AI_MOVE_COOLDOWN_MS = MOB_STEP_DURATION_MS;
const EXP_BASE = 100;
const EXP_GROWTH = 1.35;
const TREE_TEXTURE_KEY = "ao_tree_arbol1";
const TREE_TEXTURE_PATH = "/assets/ao/imperium/trees/arbol1.png";
const TREE_SCALE = 0.75;
const TREE_FRONT_DEPTH = 11.4;
const TREE_OCCLUDED_ALPHA = 0.48;
const CAMERA_BOUNDS_PADDING_TILES = 9999;
const STAT_MIN = 10;
const STAT_MAX = 25;
const BASELINE_STRENGTH = 19;
const BASE_MISS_CHANCE = 0.18;
const MISS_REDUCTION_PER_AGILITY = 0.007;
const MIN_MISS_CHANCE = 0.03;
const MAX_MISS_CHANCE = 0.25;
/** Vitales iniciales para probar pociones (humano da hpMax 100 por atributos). */
const TEST_START_HP = 20;
const TEST_START_HP_MAX = 100;
const TEST_START_MP = 5_000;
const TEST_START_MP_MAX = 10_000;
const TEST_HEALTH_POTION_STACK = 20;
const DEFAULT_MACRO_ACTION: MacroActionType = "use_item";
const IMPLOSION_SPELL_ID = 7;
const INMOVILIZAR_SPELL_ID = 8;
const HERIDAS_GRAVES_SPELL_ID = 9;
const IMPLOSION_ANIM_TEXTURE_KEY = "spell_implosion_fx";
const IMPLOSION_ANIM_KEY = "spell_implosion_anim";
const IMPLOSION_FRAME_WIDTH = 128;
const IMPLOSION_FRAME_HEIGHT = 128;
const IMPLOSION_FRAME_SEQUENCE = [0, 1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15];
const INMOVILIZAR_ANIM_TEXTURE_KEY = "spell_inmovilizar_fx";
const INMOVILIZAR_ANIM_KEY = "spell_inmovilizar_anim";
const INMOVILIZAR_FRAME_WIDTH = 128;
const INMOVILIZAR_FRAME_HEIGHT = 128;
const INMOVILIZAR_FRAME_SEQUENCE = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
];
const INMOVILIZAR_FX_OFFSET_Y = 25;
const HERIDAS_GRAVES_ANIM_TEXTURE_KEY = "spell_heridas_graves_fx";
const HERIDAS_GRAVES_ANIM_KEY = "spell_heridas_graves_anim";
const HERIDAS_GRAVES_FRAME_WIDTH = 102;
const HERIDAS_GRAVES_FRAME_HEIGHT = 128;
const HERIDAS_GRAVES_FRAME_SEQUENCE = [0, 1, 2, 3, 4];
const MEDITATION_TEXTURE_KEY = "spell_meditation_fx";
const MEDITATION_ANIM_KEY = "spell_meditation_anim";
const MEDITATION_FRAME_WIDTH = 60;
const MEDITATION_FRAME_HEIGHT = 60;
const MEDITATION_FRAME_SEQUENCE = [0, 2, 4, 6, 8, 10];
const MEDITATION_FX_OFFSET_Y = -6;
const MEDITATION_MP_REGEN_INTERVAL_MS = 1000;
const MEDITATION_MP_REGEN_PERCENT_PER_TICK = 0.12;
const INMOVILIZADO_MOB_DURATION_MS = 60_000;
const INMOVILIZADO_PLAYER_DURATION_MS = 20_000;
const TRAINING_DUMMY_ID = "training_dummy_spawn";
const TRAINING_DUMMY_NAME = "Dummy";
const TRAINING_DUMMY_HP = 10_000;
const WORLD_DEPTH_BASE = 9;
const WORLD_DEPTH_SCALE = 1000;

function macroSpellTextureKey(spellId: number): string {
  return `macro_spell_${spellId}`;
}

function formatImmobilizeDuration(durationMs: number): string {
  if (durationMs >= 60_000) {
    const minutes = Math.round(durationMs / 60_000);
    return minutes === 1 ? "1 minuto" : `${minutes} minutos`;
  }
  return `${Math.ceil(durationMs / 1000)} segundos`;
}

function formatImmobilizeRemaining(remainingMs: number): string {
  if (remainingMs >= 60_000) {
    const minutes = Math.ceil(remainingMs / 60_000);
    return minutes === 1 ? "1 min" : `${minutes} min`;
  }
  return `${Math.ceil(remainingMs / 1000)}s`;
}

function formatCharacterInspectLine(
  name: string,
  affiliation: PlayerAffiliation,
  classId: ClassId,
  raceId: RaceId,
  level: number
): string {
  const affiliationLabel = affiliation === "ciudadano" ? "Ciudadano" : "Criminal";
  const classLabelById: Record<ClassId, string> = {
    paladin: "Paladín",
    mago: "Mago",
    druida: "Druida",
    guerrero: "Guerrero",
    cazador: "Cazador",
    asesino: "Asesino",
  };
  const classLabel = classLabelById[classId];
  const raceLabel = raceId === "human" ? "Humano" : "Drow";
  return `${name} - ${affiliationLabel} - ${classLabel} ${raceLabel} Nivel ${level}`;
}

const RACE_BASE_STATS: Record<RaceId, CoreStats> = {
  human: { strength: 19, constitution: 19, agility: 19, intelligence: 19 },
  drow: { strength: 18, constitution: 18, agility: 20, intelligence: 20 },
};
const CLASS_STAT_MODIFIERS: Record<ClassId, CoreStats> = {
  paladin: { strength: 2, constitution: 2, agility: -1, intelligence: -2 },
  mago: { strength: -3, constitution: -2, agility: -3, intelligence: 6 },
  druida: { strength: -1, constitution: -1, agility: 1, intelligence: 3 },
  guerrero: { strength: 4, constitution: 4, agility: 2, intelligence: -10 },
  cazador: { strength: 3, constitution: 3, agility: 2, intelligence: -10 },
  asesino: { strength: 1, constitution: 2, agility: 4, intelligence: 1 },
};
const CLASS_USES_MANA: Record<ClassId, boolean> = {
  paladin: true,
  mago: true,
  druida: true,
  guerrero: false,
  cazador: false,
  asesino: true,
};

function expRequiredForLevel(level: number): number {
  return Math.max(1, Math.floor(EXP_BASE * Math.pow(EXP_GROWTH, level - 1)));
}

function clampStat(value: number): number {
  return Phaser.Math.Clamp(Math.floor(value), STAT_MIN, STAT_MAX);
}

function resolveCoreStats(race: RaceId, classId: ClassId): CoreStats {
  const base = RACE_BASE_STATS[race];
  const mod = CLASS_STAT_MODIFIERS[classId];
  return {
    strength: clampStat(base.strength + mod.strength),
    constitution: clampStat(base.constitution + mod.constitution),
    agility: clampStat(base.agility + mod.agility),
    intelligence: clampStat(base.intelligence + mod.intelligence),
  };
}

function getBaseVitalsFromStats(stats: CoreStats): { hpMax: number; mpMax: number } {
  return {
    hpMax: 62 + stats.constitution * 2,
    mpMax: 12 + stats.intelligence * 2,
  };
}

function getLevelUpBonusesFromStats(stats: CoreStats): { hpBonus: number; mpBonus: number } {
  return {
    hpBonus: Math.max(1, Math.round(stats.constitution * 0.6)),
    mpBonus: Math.max(1, Math.round(stats.intelligence * 0.5)),
  };
}

function getStrengthDamageBonus(strength: number): { minBonus: number; maxBonus: number } {
  const delta = strength - BASELINE_STRENGTH;
  return {
    minBonus: delta,
    maxBonus: delta * 2,
  };
}

function getMissChanceFromAgility(agility: number): number {
  const missChance = BASE_MISS_CHANCE - (agility - STAT_MIN) * MISS_REDUCTION_PER_AGILITY;
  return Phaser.Math.Clamp(missChance, MIN_MISS_CHANCE, MAX_MISS_CHANCE);
}

const PLAYER_FACE_OFFSET: Record<Facing, { x: number; y: number }> = {
  down: { x: -0.5, y: 36 },
  up: { x: -0.5, y: 36 },

  // Ajuste lateral
  left: { x: 2, y: 35 },
  right: { x: -2, y: 35 },
};  

const WEAPON_ROW_BY_FACING: Record<Facing, number> = {
  down: 0, // S (f1)
  up: 1, // W (f2)
  left: 2, // A (f3)
  right: 3, // D (f4)
};
const WEAPON_SHEET_COLS = 6;
type GameSceneInitData = {
  character?: SavedCharacter;
  slotIndex?: number;
};

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private playerFace!: Phaser.GameObjects.Sprite;
  private playerNameLabel!: Phaser.GameObjects.Text;
  private equippedWeaponSprite?: Phaser.GameObjects.Sprite;

  private mapTiles!: Phaser.GameObjects.Container;
  private mapOverlay!: Phaser.GameObjects.Graphics;
  private mapTrees: Phaser.GameObjects.Image[] = [];
  private gameUi!: GameUi;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;

  private currentMap!: GameMap;
  private currentMapId = START_MAP_ID;

  private playerTileX = 4;
  private playerTileY = 4;

  private isMoving = false;
  private desiredFacing: Facing | null = null;
  private isChangingMap = false;
  private facing: Facing = "down";

  private pickupKey!: Phaser.Input.Keyboard.Key;
  private cancelSpellTargetingKey!: Phaser.Input.Keyboard.Key;
  private meditateKey!: Phaser.Input.Keyboard.Key;
  private worldMapToggleKey!: Phaser.Input.Keyboard.Key;
  private worldMapOverlay?: Phaser.GameObjects.Container;
  private worldMapCurrentMarker?: Phaser.GameObjects.Arc;
  private worldMapMapCenters = new Map<string, { x: number; y: number }>();
  private isWorldMapOpen = false;

private inventory: InventorySlot[] = Array(20).fill(null);

private worldItems: {
  id: ItemId;
  tileX: number;
  tileY: number;
  count: number;
  sprite: Phaser.GameObjects.Sprite;
}[] = [];

  /**
   * Cara elegida.
   * Por ahora usamos la primera. Más adelante esto puede venir
   * desde la pantalla de creación de personaje.
   */
  /** Columna del spritesheet human_faces (0 = cara 1 / c1). */
  private selectedFaceIndex = 0;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private attackKey!: Phaser.Input.Keyboard.Key;
  private equipSelectedSlotKey!: Phaser.Input.Keyboard.Key;
  private dropSelectedSlotKey!: Phaser.Input.Keyboard.Key;
  private nextAttackAt = 0;
  private dummies: DummyState[] = [];
  private equippedOutfit: Outfit = "base";
  private playerName = DEFAULT_PLAYER_NAME;
  private selectedRace: RaceId = "human";
  private selectedClass: ClassId = "paladin";
  private readonly playerAffiliation: PlayerAffiliation = "ciudadano";
  private playerProgress: PlayerProgressState = {
    level: 1,
    exp: 0,
    expToNext: expRequiredForLevel(1),
    hp: 100,
    hpMax: 100,
    mp: 50,
    mpMax: 50,
    gold: 0,
  };
  private readonly learnedSpellIds = new Set<number>();
  private playerMagicLevel = 0;
  private pendingSpellCast: SpellCastRequest | null = null;
  private playerImmobilizedUntilMs = 0;
  private wasPlayerImmobilizedLastFrame = false;
  private nextImmobilizedMoveFeedbackAt = 0;
  private isMeditating = false;
  private meditationRegenTimerMs = 0;
  private meditationFx?: Phaser.GameObjects.Sprite;
  private activePlayerDamageText?: Phaser.GameObjects.Text;
  private activePlayerDamageTween?: Phaser.Tweens.Tween;
  private macroBindings: MacroBinding[] = Array.from({ length: 10 }, () => ({
    keyCode: null,
    action: DEFAULT_MACRO_ACTION,
    itemId: null,
    spellId: null,
  }));

  constructor() {
    super("GameScene");
  }

  init(data: GameSceneInitData = {}) {
    const character = data.character ?? getActiveCharacter();
    if (character) {
      this.applyActiveCharacter(character);
    }
  }

  preload() {
    registerPlayerSprites(this);
    registerAoTerrain(this);
    registerHumanFaces(this);
    registerInventoryPanelAssets(this);
    Object.values(MOB_MODELS).forEach((model) => {
      this.load.spritesheet(model.textureKey, model.texturePath, {
        frameWidth: model.frameWidth,
        frameHeight: model.frameHeight,
      });
    });
    this.load.spritesheet(
      IMPLOSION_ANIM_TEXTURE_KEY,
      "/assets/ao/spells/imploAnimation.png",
      {
        frameWidth: IMPLOSION_FRAME_WIDTH,
        frameHeight: IMPLOSION_FRAME_HEIGHT,
      }
    );
    this.load.spritesheet(
      INMOVILIZAR_ANIM_TEXTURE_KEY,
      "/assets/ao/spells/inmovilizarAnimation.png",
      {
        frameWidth: INMOVILIZAR_FRAME_WIDTH,
        frameHeight: INMOVILIZAR_FRAME_HEIGHT,
      }
    );
    this.load.spritesheet(
      HERIDAS_GRAVES_ANIM_TEXTURE_KEY,
      "/assets/ao/spells/heridasGravesAnimation.png",
      {
        frameWidth: HERIDAS_GRAVES_FRAME_WIDTH,
        frameHeight: HERIDAS_GRAVES_FRAME_HEIGHT,
      }
    );
    this.load.spritesheet(
      MEDITATION_TEXTURE_KEY,
      "/assets/ao/meditations/lowLvlMed.png",
      {
        frameWidth: MEDITATION_FRAME_WIDTH,
        frameHeight: MEDITATION_FRAME_HEIGHT,
      }
    );
    this.load.image(TREE_TEXTURE_KEY, TREE_TEXTURE_PATH);
    SPELL_DEFINITIONS.forEach((spell) => {
      if (!spell.iconAssetPath) return;
      this.load.image(macroSpellTextureKey(spell.idSpell), spell.iconAssetPath);
    });
  
    Object.values(ITEM_DEFINITIONS).forEach((item) => {
      this.load.image(item.textureKey, item.assetPath);
      if (item.equippedTextureKey && item.equippedAssetPath) {
        if (item.equippedFrameWidth && item.equippedFrameHeight) {
          this.load.spritesheet(item.equippedTextureKey, item.equippedAssetPath, {
            frameWidth: item.equippedFrameWidth,
            frameHeight: item.equippedFrameHeight,
          });
        } else {
          this.load.image(item.equippedTextureKey, item.equippedAssetPath);
        }
      }
    });
  }

  create() {
    setupPlayerTexture(this);
    registerPlayerAnimations(this);
    this.registerSpellAnimations();
    this.registerMeditationAnimation();
    setupAoTerrainTexture(this);
    setupHumanFacesTexture(this);
    setupInventoryPanelTextures(this);
    this.registerMobAnimations();
    const treeTexture = this.textures.get(TREE_TEXTURE_KEY);
    if (treeTexture.key !== "__MISSING") {
      treeTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    this.currentMap = getMap(this.currentMapId);
    this.updateWorldBackgroundColor();
    const centerTileX = Math.floor(this.currentMap.width / 2);
    const centerTileY = Math.floor(this.currentMap.height / 2);
    this.playerTileX = centerTileX;
    this.playerTileY = centerTileY;

    this.mapTiles = this.add.container(0, 0).setDepth(0);
    this.mapOverlay = this.add.graphics().setDepth(1);

    this.drawMap(this.currentMap);
    this.createPlayer();
    this.createWorldItem("weapon_saramiana", centerTileX + 1, centerTileY);
    this.createWorldItem("armor_cuero", centerTileX + 2, centerTileY);
    this.createWorldItem("scroll_implosion", centerTileX + 3, centerTileY);
    this.createDummyIfNeeded();

    this.gameUi = new GameUi(this);
    this.gameUi.setChatSubmitHandler((message) => this.handleChatCommand(message));
    this.gameUi.setInventorySlotDoubleClickHandler((slotIndex) => {
      this.handleInventorySlotDoubleClick(slotIndex);
    });
    this.gameUi.setMacroSlotClickHandler((slotIndex) => {
      this.openMacroEditor(slotIndex);
    });
    this.initializeStarterSpells();
    this.refreshKnownSpellsUi();
    this.gameUi.setSpellInfoRequestHandler((spell) => {
      const debuffText = spell.remueveDebuff ? ` | Quita: ${spell.remueveDebuff}` : "";
      const classesText = spell.usableBy.join(", ");
      this.gameUi.addChatLine(
        `${spell.nombre} [#${spell.idSpell}] MP:${spell.manaCost} Danio:${spell.danioMin}-${spell.danioMax} Cura:${spell.healMin}-${spell.healMax} Aliados:${spell.puedeUsarseEnAliados ? "si" : "no"} Valor:${spell.valor} MagiaReq:${spell.nivelMagiaRequerido} Clases:${classesText}${debuffText} | ${spell.descripcion}`
      );
    });
    this.gameUi.setSpellCastRequestHandler((spell) => {
      this.beginSpellTargeting(spell);
    });
    this.gameUi.setMapName(this.currentMap.name);
    this.refreshMacroVisuals();
    this.createWorldMapOverlay();

    this.applyBaseVitalsFromAttributes();
    this.applyTestStartingVitals();
    this.spawnTestHealthPotionsInInventory();
    this.refreshHud();
    this.setupCameras();
    this.setupInput();

    this.scale.on("resize", this.applyCameraLayout, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.handleSceneResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.applyCameraLayout, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.handleSceneResume, this);
    });
  }

  private handleSceneResume() {
    const character = this.game.registry.get("activeCharacter") as SavedCharacter | undefined;
    if (!character) {
      return;
    }
    this.applyActiveCharacter(character);
    this.game.registry.remove("activeCharacter");
    this.game.registry.remove("activeCharacterSlotIndex");
    this.refreshHud();
    if (this.playerNameLabel) {
      this.playerNameLabel.setText(this.playerName);
    }
    this.gameUi.addChatLine(`Entraste al juego con ${this.playerName}.`);
  }

  private applyActiveCharacter(character: SavedCharacter) {
    this.playerName = character.name;
    this.selectedClass = character.classId;
    this.selectedRace = character.raceId;
    this.selectedFaceIndex = character.faceIndex;
    this.updatePlayerFaceFrame();
  }

  private equipment: Record<EquipmentSlot, ItemId | null> = {
    weapon: null,
    shield: null,
    helmet: null,
    armor: null,
  };

  private drawMap(map: GameMap) {
    this.mapTiles.removeAll(true);
    this.mapOverlay.clear();
    this.mapTrees.forEach((tree) => tree.destroy());
    this.mapTrees = [];

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y][x];
        const tileDefinition = getTileDefinition(tile);
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tileDefinition.renderAs === "ao_grass") {
          this.mapTiles.add(createTerrainTile(this, px, py, pickGrassFrame(x, y)));
        } else if (tileDefinition.renderAs === "ao_water") {
          this.mapTiles.add(createTerrainTile(this, px, py, pickWaterFrame(x, y)));
        } else {
          this.mapOverlay.fillStyle(tileDefinition.color, 1);
          this.mapOverlay.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }

        if (tileDefinition.decoration === "tree") {
          this.drawTreeTile(px, py);
        }
      }
    }

    if (this.uiCamera && this.mapTrees.length > 0) {
      this.uiCamera.ignore(this.mapTrees);
    }
  }

  private drawTreeTile(px: number, py: number) {
    if (this.textures.exists(TREE_TEXTURE_KEY)) {
      const tree = this.add
        .image(px + TILE_SIZE / 2, py + TILE_SIZE + 2, TREE_TEXTURE_KEY)
        .setOrigin(0.5, 1)
        .setScale(TREE_SCALE)
        .setDepth(TREE_FRONT_DEPTH);
      this.mapTrees.push(tree);
      return;
    }

    // Fallback por si falta el asset.
    const g = this.mapOverlay;
    g.fillStyle(0x6b3f1d, 1);
    g.fillRect(px + 14, py + 15, 4, 12);
    g.fillStyle(0x1f6f2e, 1);
    g.fillRect(px + 7, py + 8, 18, 10);
  }

  private createPlayer() {
    if (this.player) return;

    const { x, y } = this.getPlayerFeetWorldForTile(this.playerTileX, this.playerTileY);

    this.player = this.add.sprite(x, y, textureKeyForOutfit(this.equippedOutfit), 0);
    applyPlayerOrigin(this.player);
    this.player.setDepth(this.depthFromFeetY(y));

    const faceOffset = PLAYER_FACE_OFFSET[this.facing];

    this.playerFace = this.add.sprite(
      x + faceOffset.x,
      y + faceOffset.y,
     HUMAN_FACE_TEXTURE_KEY,
     getHumanFaceFrame(this.selectedFaceIndex, this.facing)
    );

  this.playerFace.setOrigin(0.5, 1);
  this.playerFace.setScale(PLAYER_FACE_SCALE);
  this.playerFace.setDepth(this.player.depth + 0.02);
  this.syncPlayerFacePosition();

  this.equippedWeaponSprite = this.add.sprite(x, y, "__MISSING");
  this.equippedWeaponSprite.setOrigin(0.5, 1);
  this.equippedWeaponSprite.setVisible(false);
  this.syncEquippedWeaponVisual();

  this.playerNameLabel = this.add
    .text(x, y + 2, this.playerName, {
      fontFamily: "Segoe UI, Tahoma, sans-serif",
      fontSize: "11px",
      color: PLAYER_NAME_COLOR,
      fontStyle: "bold",
      stroke: "#001a33",
      strokeThickness: 2,
    })
    .setOrigin(0.5, 0)
    .setDepth(this.player.depth + 2);

  this.player.setInteractive({ useHandCursor: true, pixelPerfect: true });
  this.player.on("pointerdown", () => {
    if (this.pendingSpellCast) {
      this.tryCastSpellOnPlayer();
      return;
    }
    this.inspectPlayerCharacter();
  });
    
    this.playFacingAnim("idle");
  }

  private inspectPlayerCharacter() {
    this.gameUi.addChatLine(
      formatCharacterInspectLine(
        this.playerName,
        this.playerAffiliation,
        this.selectedClass,
        this.selectedRace,
        this.playerProgress.level
      )
    );
  }

  private spawnTestHealthPotionsInInventory() {
    addToInventory(this.inventory, "potion_hp", TEST_HEALTH_POTION_STACK);
    addToInventory(this.inventory, "armor_placas_rojas", 1);
    addToInventory(this.inventory, "armor_cuero", 1);
    addToInventory(this.inventory, "armor_placas_azules", 1);
    this.refreshInventoryUi();
  }

  private initializeStarterSpells() {
    SPELL_DEFINITIONS.forEach((spell) => {
      if (!spell.isStarter) return;
      if (!spell.usableBy.includes(this.selectedClass)) return;
      this.learnedSpellIds.add(spell.idSpell);
    });
  }

  private refreshKnownSpellsUi() {
    const knownSpells = SPELL_DEFINITIONS.filter(
      (spell) =>
        this.learnedSpellIds.has(spell.idSpell) &&
        spell.usableBy.includes(this.selectedClass) &&
        spell.nivelMagiaRequerido <= this.playerMagicLevel
    );
    this.gameUi.setSpells(knownSpells);
  }

  private handleChatCommand(message: string): boolean {
    if (!message.startsWith("/")) {
      return false;
    }

    const normalized = message.trim().toLowerCase();
    if (normalized === "/meditar") {
      this.toggleMeditation("command");
      return true;
    }

    this.gameUi.addChatLine(`Comando desconocido: ${message}`);
    return true;
  }

  private toggleMeditation(source: "command" | "hotkey") {
    if (this.isMeditating) {
      this.stopMeditation("Dejaste de meditar.");
      return;
    }
    this.startMeditation(source);
  }

  private startMeditation(source: "command" | "hotkey") {
    if (this.playerProgress.mp >= this.playerProgress.mpMax) {
      this.gameUi.addChatLine("Ya tenés el maná al máximo.");
      return;
    }

    this.cancelSpellTargeting();
    this.isMeditating = true;
    this.meditationRegenTimerMs = 0;
    this.ensureMeditationFx();
    this.syncMeditationFxPosition();
    this.gameUi.addChatLine(
      source === "command"
        ? "Comenzaste a meditar."
        : "Comenzaste a meditar (N para cancelar)."
    );
  }

  private stopMeditation(message?: string) {
    if (!this.isMeditating) return;
    this.isMeditating = false;
    this.meditationRegenTimerMs = 0;
    if (this.meditationFx) {
      this.meditationFx.setVisible(false);
      this.meditationFx.stop();
    }
    if (message) {
      this.gameUi.addChatLine(message);
    }
  }

  private updateMeditation(deltaMs: number) {
    if (!this.isMeditating) return;

    this.meditationRegenTimerMs += deltaMs;
    const manaPerTick = this.playerProgress.mpMax * MEDITATION_MP_REGEN_PERCENT_PER_TICK;
    while (this.meditationRegenTimerMs >= MEDITATION_MP_REGEN_INTERVAL_MS) {
      this.meditationRegenTimerMs -= MEDITATION_MP_REGEN_INTERVAL_MS;
      this.playerProgress.mp = Math.min(this.playerProgress.mpMax, this.playerProgress.mp + manaPerTick);
      this.refreshHud();
    }
    if (this.playerProgress.mp >= this.playerProgress.mpMax) {
      this.playerProgress.mp = this.playerProgress.mpMax;
      this.refreshHud();
      this.stopMeditation("Tu maná está completo.");
    }
  }

  private ensureMeditationFx() {
    const feet = this.getPlayerFeetWorldForTile(this.playerTileX, this.playerTileY);
    if (!this.meditationFx) {
      this.meditationFx = this.add
        .sprite(
          Math.round(feet.x),
          Math.round(feet.y + MEDITATION_FX_OFFSET_Y),
          MEDITATION_TEXTURE_KEY,
          MEDITATION_FRAME_SEQUENCE[0]
        )
        .setOrigin(0.5, 1)
        .setDepth(this.player.depth + 0.06)
        .setScale(1);
      if (this.uiCamera) {
        this.uiCamera.ignore(this.meditationFx);
      }
    }
    this.meditationFx.setVisible(true);
    this.meditationFx.play(MEDITATION_ANIM_KEY, true);
  }

  private syncMeditationFxPosition() {
    if (!this.player || !this.meditationFx || !this.isMeditating) return;
    const feet = this.getPlayerFeetWorldForTile(this.playerTileX, this.playerTileY);
    this.meditationFx.setPosition(Math.round(feet.x), Math.round(feet.y + MEDITATION_FX_OFFSET_Y));
    this.meditationFx.setDepth(this.player.depth + 0.06);
  }

  private beginSpellTargeting(spell: SpellCastRequest) {
    this.stopMeditation();
    if (!this.learnedSpellIds.has(spell.idSpell)) {
      this.gameUi.addChatLine(`No conocés ${spell.nombre}.`);
      return;
    }
    if (spell.nivelMagiaRequerido > this.playerMagicLevel) {
      this.gameUi.addChatLine(
        `${spell.nombre} requiere nivel de magia ${spell.nivelMagiaRequerido}.`
      );
      return;
    }

    if (this.pendingSpellCast?.idSpell === spell.idSpell) {
      this.cancelSpellTargeting(`Cancelaste ${spell.nombre}.`);
      return;
    }

    this.pendingSpellCast = spell;
    this.input.setDefaultCursor("crosshair");
    this.gameUi.addChatLine(
      `Objetivo de ${spell.nombre}: hacé click en ${this.getSpellTargetHint(spell)} (ESC para cancelar).`
    );
  }

  private cancelSpellTargeting(message?: string) {
    this.pendingSpellCast = null;
    this.input.setDefaultCursor("default");
    if (message) {
      this.gameUi.addChatLine(message);
    }
  }

  private getSpellTargetHint(spell: SpellCastRequest): string {
    if (this.spellCanTargetDummy(spell) && this.spellCanTargetPlayer(spell)) {
      return "enemigo o aliado";
    }
    if (this.spellCanTargetDummy(spell)) {
      return "enemigo";
    }
    return "aliado";
  }

  private spellCanTargetDummy(spell: SpellCastRequest): boolean {
    return spell.danioMax > 0 || spell.danioMin > 0 || spell.idSpell === INMOVILIZAR_SPELL_ID;
  }

  private spellCanTargetPlayer(spell: SpellCastRequest): boolean {
    return spell.puedeUsarseEnAliados || spell.healMax > 0 || Boolean(spell.remueveDebuff);
  }

  private spendManaForSpell(spell: SpellCastRequest): boolean {
    if (this.playerProgress.mp < spell.manaCost) {
      this.gameUi.addCombatLine(
        `No tenés suficiente maná para ${spell.nombre} (${this.playerProgress.mp}/${spell.manaCost}).`
      );
      return false;
    }
    this.playerProgress.mp -= spell.manaCost;
    this.refreshHud();
    return true;
  }

  private tryCastSpellOnPlayer() {
    const spell = this.pendingSpellCast;
    if (!spell) return;

    if (!this.spellCanTargetPlayer(spell)) {
      this.gameUi.addCombatLine(`${spell.nombre} no puede lanzarse sobre aliados.`);
      return;
    }
    if (!this.spendManaForSpell(spell)) {
      return;
    }

    let anyEffect = false;
    if (spell.healMax > 0 || spell.healMin > 0) {
      const min = Math.max(0, Math.floor(spell.healMin));
      const max = Math.max(min, Math.floor(spell.healMax));
      const healAmount = Phaser.Math.Between(min, max);
      const before = this.playerProgress.hp;
      this.playerProgress.hp = Math.min(this.playerProgress.hpMax, this.playerProgress.hp + healAmount);
      const restored = this.playerProgress.hp - before;
      this.gameUi.addCombatLine(`${spell.nombre} te cura ${restored} HP.`);
      if (spell.idSpell === HERIDAS_GRAVES_SPELL_ID) {
        this.playHeridasGravesAnimation(this.playerTileX, this.playerTileY);
      }
      anyEffect = true;
    }

    if (spell.remueveDebuff) {
      this.gameUi.addCombatLine(`${spell.nombre} remueve ${spell.remueveDebuff}.`);
      anyEffect = true;
    }

    if (!anyEffect) {
      this.gameUi.addCombatLine(`${spell.nombre} no tuvo efecto sobre ese objetivo.`);
    }

    this.refreshHud();
    this.cancelSpellTargeting(`${spell.nombre} lanzado.`);
  }

  private tryCastSpellOnDummy(dummy: DummyState) {
    const spell = this.pendingSpellCast;
    if (!spell) return;

    if (!dummy.alive || dummy.mapId !== this.currentMapId) {
      this.gameUi.addCombatLine("Ese objetivo no está disponible.");
      return;
    }
    if (!this.spellCanTargetDummy(spell)) {
      this.gameUi.addCombatLine(`${spell.nombre} no puede lanzarse sobre enemigos.`);
      return;
    }
    if (!this.spendManaForSpell(spell)) {
      return;
    }

    const hitTile = this.getDummyHitTile(dummy);

    if (spell.idSpell === INMOVILIZAR_SPELL_ID) {
      this.applyInmovilizadoDebuffToDummy(dummy, spell.nombre);
      this.playInmovilizarAnimation(hitTile.x, hitTile.y);
      this.cancelSpellTargeting(`${spell.nombre} lanzado.`);
      return;
    }

    const min = Math.max(0, Math.floor(spell.danioMin));
    const max = Math.max(min, Math.floor(spell.danioMax));
    const damage = Phaser.Math.Between(min, max);
    const result = this.dealDamageToDummy(dummy, damage);

    if (spell.idSpell === IMPLOSION_SPELL_ID) {
      this.playImplosionAnimation(hitTile.x, hitTile.y);
    } else {
      this.playAttackFeedback(hitTile.x, hitTile.y);
    }
    dummy.sprite.setTint(0x9b4dff);
    this.time.delayedCall(90, () => {
      if (dummy.alive) dummy.sprite.clearTint();
    });

    this.gameUi.addCombatLine(`${spell.nombre} golpea a ${dummy.name} por ${result.damageApplied}.`);

    this.cancelSpellTargeting(`${spell.nombre} lanzado.`);
  }

  private inspectWorldItem(worldItem: (typeof this.worldItems)[number]) {
    this.gameUi.addChatLine(formatStackLabel(worldItem.id, worldItem.count));
  }

  private inspectDummy(dummy: DummyState) {
    this.gameUi.addChatLine(`${dummy.name} - Vida ${dummy.hp}/${dummy.maxHp}`);
  }

  private useConsumableFromSlot(slotIndex: number) {
    const stack = this.inventory[slotIndex];
    if (!stack) {
      return;
    }

    const item = getItemDefinition(stack.itemId);
    if (item.type !== "consumable" || !item.consumableEffects) {
      this.gameUi.addChatLine(`${item.name} no se puede usar.`);
      return;
    }

    const { healHpPercent, learnSpellId } = item.consumableEffects;
    if (learnSpellId) {
      const learned = this.tryLearnSpellFromScroll(learnSpellId, item.name);
      if (!learned) {
        return;
      }

      this.consumeOneFromSlot(slotIndex, item.textureKey);
      this.refreshKnownSpellsUi();
      return;
    }

    if (!healHpPercent || healHpPercent <= 0) {
      this.gameUi.addChatLine(`${item.name} no tiene efecto definido.`);
      return;
    }

    if (this.playerProgress.hp >= this.playerProgress.hpMax) {
      this.gameUi.addChatLine("Ya tenés la vida al máximo.");
      return;
    }

    const healAmount = Math.max(
      1,
      Math.floor(this.playerProgress.hpMax * healHpPercent)
    );
    const before = this.playerProgress.hp;
    this.playerProgress.hp = Math.min(
      this.playerProgress.hpMax,
      this.playerProgress.hp + healAmount
    );
    const restored = this.playerProgress.hp - before;

    this.consumeOneFromSlot(slotIndex, item.textureKey);

    this.refreshHud();
    this.gameUi.addChatLine(
      `Usaste ${item.name} y recuperaste ${restored} HP (${Math.round(healHpPercent * 100)}%).`
    );
  }

  private tryLearnSpellFromScroll(spellId: number, itemName: string): boolean {
    const spell = SPELL_DEFINITIONS.find((entry) => entry.idSpell === spellId);
    if (!spell) {
      this.gameUi.addChatLine(`${itemName} no tiene un hechizo válido.`);
      return false;
    }
    if (!spell.usableBy.includes(this.selectedClass)) {
      this.gameUi.addChatLine(`Tu clase no puede aprender ${spell.nombre}.`);
      return false;
    }
    if (spell.nivelMagiaRequerido > this.playerMagicLevel) {
      this.gameUi.addChatLine(
        `Necesitás nivel de magia ${spell.nivelMagiaRequerido} para aprender ${spell.nombre}.`
      );
      return false;
    }
    if (this.learnedSpellIds.has(spellId)) {
      this.gameUi.addChatLine(`Ya conocés ${spell.nombre}.`);
      return false;
    }

    this.learnedSpellIds.add(spellId);
    this.gameUi.addChatLine(`Aprendiste ${spell.nombre}.`);
    return true;
  }

  private consumeOneFromSlot(slotIndex: number, textureKey: string) {
    const stack = this.inventory[slotIndex];
    if (!stack) {
      return;
    }

    stack.count -= 1;
    if (stack.count <= 0) {
      this.inventory[slotIndex] = null;
      this.gameUi.clearInventorySlot(slotIndex);
      return;
    }

    this.gameUi.setInventorySlot(slotIndex, textureKey, stack.count);
  }

  private createWorldItem(
    itemId: ItemId,
    tileX: number,
    tileY: number,
    count = 1
  ) {
    if (count <= 0) {
      return;
    }

    const existing = this.worldItems.find(
      (entry) =>
        entry.id === itemId && entry.tileX === tileX && entry.tileY === tileY
    );
    if (existing) {
      existing.count += count;
      return;
    }

    const dropTile = this.findNearestAvailableDropTile(tileX, tileY);
    if (!dropTile) {
      return;
    }

    const item = getItemDefinition(itemId);
    const pos = tileToFeetWorld(dropTile.x, dropTile.y, TILE_SIZE);
  
    const sprite = this.add.sprite(pos.x, pos.y - 8, item.textureKey);
    sprite.setOrigin(0.5, 1);
    sprite.setY(pos.y + 2);
    sprite.setDepth(this.depthFromFeetY(pos.y + 2) - 0.2);
    sprite.setScale(0.80);
    sprite.setInteractive({ useHandCursor: true, pixelPerfect: true });

    const worldItem = {
      id: itemId,
      tileX: dropTile.x,
      tileY: dropTile.y,
      count,
      sprite,
    };

    sprite.on("pointerdown", () => {
      this.inspectWorldItem(worldItem);
    });

    if (this.uiCamera) {
      this.uiCamera.ignore(sprite);
    }
  
    this.worldItems.push(worldItem);
  }

  private findNearestAvailableDropTile(
    targetTileX: number,
    targetTileY: number
  ): { x: number; y: number } | null {
    if (
      this.isMapTileWalkable(targetTileX, targetTileY) &&
      !this.isWorldItemTileOccupied(targetTileX, targetTileY)
    ) {
      return { x: targetTileX, y: targetTileY };
    }

    const maxDistance = this.currentMap.width + this.currentMap.height;
    for (let distance = 1; distance <= maxDistance; distance += 1) {
      for (let dy = -distance; dy <= distance; dy += 1) {
        for (let dx = -distance; dx <= distance; dx += 1) {
          if (Math.abs(dx) + Math.abs(dy) !== distance) continue;
          const x = targetTileX + dx;
          const y = targetTileY + dy;
          if (!this.isMapTileWalkable(x, y)) continue;
          if (this.isWorldItemTileOccupied(x, y)) continue;
          return { x, y };
        }
      }
    }

    return null;
  }

  private isWorldItemTileOccupied(tileX: number, tileY: number): boolean {
    return this.worldItems.some((item) => item.tileX === tileX && item.tileY === tileY);
  }
  

  private setupCameras() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.uiCamera = this.cameras.add(0, 0, w, h);
    this.uiCamera.setScroll(0, 0).setZoom(1);

    const worldCam = this.cameras.main;
    this.updateCameraBounds();
    worldCam.roundPixels = true;
    worldCam.startFollow(this.player, true, 1, 1);

    /** Zoom del mundo (antes 1.5). */
    worldCam.setZoom(1);

    worldCam.ignore(this.gameUi.getContainer());
    if (this.worldMapOverlay) {
      worldCam.ignore(this.worldMapOverlay);
    }
    this.uiCamera.ignore([
      this.mapTiles,
      this.mapOverlay,
      ...this.mapTrees,
      this.player,
      this.playerFace,
      this.playerNameLabel,
      ...(this.equippedWeaponSprite ? [this.equippedWeaponSprite] : []),
      ...this.worldItems.map((item) => item.sprite),
    ]);
    if (this.dummies.length > 0) {
      this.uiCamera.ignore(this.dummies.flatMap((dummy) => [dummy.sprite, dummy.hpLabel]));
    }

    this.applyCameraLayout();
  }

  private applyCameraLayout() {
    const w = this.scale.width;
    const h = this.scale.height;
    const view = getGameViewport(w, h);

    this.uiCamera.setViewport(0, 0, w, h);
    this.uiCamera.setSize(w, h);

    const worldCam = this.cameras.main;
    worldCam.setViewport(view.x, view.y, view.width, view.height);
    this.rebuildWorldMapOverlay();
  }

  private updateCameraBounds() {
    const worldWidth = this.currentMap.width * TILE_SIZE;
    const worldHeight = this.currentMap.height * TILE_SIZE;
    const cameraPadding = CAMERA_BOUNDS_PADDING_TILES * TILE_SIZE;
    this.cameras.main.setBounds(
      -cameraPadding,
      -cameraPadding,
      worldWidth + cameraPadding * 2,
      worldHeight + cameraPadding * 2
    );
  }

  private updateWorldBackgroundColor() {
    const outsideTile = this.currentMap.outsideTile ?? TILE.GRASS;
    const outsideColor = getTileDefinition(outsideTile).color;
    this.cameras.main.setBackgroundColor(outsideColor);
  }

  /** Evita scroll sub-pixel que genera líneas entre tiles al moverse. */
  private snapCameraScroll() {
    const cam = this.cameras.main;
    cam.scrollX = Math.round(cam.scrollX);
    cam.scrollY = Math.round(cam.scrollY);
  }

  private setupInput() {
    if (!this.input.keyboard) {
      return;
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as GameScene["wasd"];
    this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
    this.equipSelectedSlotKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.dropSelectedSlotKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.pickupKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.Q
    );
    this.meditateKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    this.worldMapToggleKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.cancelSpellTargetingKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC
    );
    this.input.keyboard.on("keydown", (event: KeyboardEvent) => {
      this.handleMacroHotkey(event);
    });
  }

  private createWorldMapOverlay() {
    this.worldMapOverlay = this.add.container(0, 0).setScrollFactor(0).setDepth(2000).setVisible(false);
    this.rebuildWorldMapOverlay();
  }

  private rebuildWorldMapOverlay() {
    if (!this.worldMapOverlay) return;

    const w = this.scale.width;
    const h = this.scale.height;
    this.worldMapOverlay.removeAll(true);
    this.worldMapMapCenters.clear();

    const backdrop = this.add
      .rectangle(0, 0, w, h, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    const panelW = Math.min(700, Math.floor(w * 0.84));
    const panelH = Math.min(470, Math.floor(h * 0.82));
    const panelX = Math.floor((w - panelW) / 2);
    const panelY = Math.floor((h - panelH) / 2);
    const panel = this.add
      .rectangle(panelX, panelY, panelW, panelH, 0x0e1524, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x7ba7d9, 0.95)
      .setScrollFactor(0);
    const title = this.add
      .text(panelX + Math.floor(panelW / 2), panelY + 14, "Mapa Mundial (M)", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#dbe9ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.worldMapOverlay.add([backdrop, panel, title]);

    const maps = getAllMaps();
    const cols = Math.max(2, Math.ceil(Math.sqrt(maps.length)));
    const rows = Math.max(1, Math.ceil(maps.length / cols));
    const topPadding = 56;
    const sidePadding = 28;
    const gapX = 18;
    const gapY = 16;
    const availW = panelW - sidePadding * 2 - gapX * (cols - 1);
    const availH = panelH - topPadding - 24 - gapY * (rows - 1);
    const cellW = Math.max(110, Math.floor(availW / cols));
    const cellH = Math.max(72, Math.floor(availH / rows));

    maps.forEach((map, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = panelX + sidePadding + col * (cellW + gapX);
      const y = panelY + topPadding + row * (cellH + gapY);
      const mapBox = this.add
        .rectangle(x, y, cellW, cellH, 0x1a2b42, 0.92)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x9fc4ef, 0.9)
        .setScrollFactor(0);
      const mapName = this.add
        .text(x + Math.floor(cellW / 2), y + Math.floor(cellH / 2), map.name, {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: cellW - 12, useAdvancedWrap: false },
        })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0);

      this.worldMapMapCenters.set(map.id, {
        x: x + Math.floor(cellW / 2),
        y: y + cellH - 14,
      });
      this.worldMapOverlay?.add([mapBox, mapName]);
    });

    const marker = this.worldMapMapCenters.get(this.currentMapId);
    this.worldMapCurrentMarker = this.add
      .circle(marker?.x ?? panelX + panelW / 2, marker?.y ?? panelY + panelH / 2, 6, 0xff2a2a, 1)
      .setStrokeStyle(2, 0x2a0000, 1)
      .setScrollFactor(0);
    this.worldMapOverlay.add(this.worldMapCurrentMarker);
    this.worldMapOverlay.setVisible(this.isWorldMapOpen);
  }

  private updateWorldMapMarker() {
    if (!this.worldMapCurrentMarker) return;
    const marker = this.worldMapMapCenters.get(this.currentMapId);
    if (!marker) return;
    this.worldMapCurrentMarker.setPosition(marker.x, marker.y);
  }

  private toggleWorldMap() {
    if (!this.worldMapOverlay) return;
    this.isWorldMapOpen = !this.isWorldMapOpen;
    this.worldMapOverlay.setVisible(this.isWorldMapOpen);
    this.updateWorldMapMarker();
  }

  private refreshHud() {
    this.gameUi.setMapName(this.currentMap.name);
    this.refreshMinimap();
    this.updateWorldMapMarker();
    const p = this.playerProgress;

    this.gameUi.setStats({
      name: this.playerName,
      level: p.level,
      hp: p.hp,
      hpMax: p.hpMax,
      mp: Math.floor(p.mp),
      mpMax: p.mpMax,
      exp: p.exp,
      expMax: p.expToNext,
      gold: p.gold,
    });
  }

  private refreshMinimap() {
    const bounds = this.getMinimapBounds();
    this.gameUi.updateMinimap(
      this.currentMap,
      this.playerTileX,
      this.playerTileY,
      bounds
    );
  }

  private getMinimapBounds() {
    let minTileX = 0;
    let minTileY = 0;
    let maxTileX = this.currentMap.width - 1;
    let maxTileY = this.currentMap.height - 1;
    const edgeTransitions = this.currentMap.edgeTransitions;

    if (edgeTransitions?.left) {
      minTileX = Math.min(maxTileX, EDGE_TRANSITION_TRIGGER_DISTANCE + 1);
    }
    if (edgeTransitions?.right) {
      maxTileX = Math.max(
        minTileX,
        this.currentMap.width - 2 - EDGE_TRANSITION_TRIGGER_DISTANCE
      );
    }
    if (edgeTransitions?.up) {
      minTileY = Math.min(maxTileY, EDGE_TRANSITION_TRIGGER_DISTANCE + 1);
    }
    if (edgeTransitions?.down) {
      maxTileY = Math.max(
        minTileY,
        this.currentMap.height - 2 - EDGE_TRANSITION_TRIGGER_DISTANCE
      );
    }

    return { minTileX, minTileY, maxTileX, maxTileY };
  }

  update(_time: number, delta: number) {
    this.snapCameraScroll();
    this.updatePlayerDebuffs();
    this.updateMeditation(delta);
    this.updateMobAi();
    this.syncEntityDepths();
    this.syncPlayerFacePosition();
    this.syncPlayerNameLabelPosition();
    this.syncEquippedWeaponVisual();
    this.syncMeditationFxPosition();
    this.syncTreeOcclusion();

    if (!this.cursors || !this.wasd || this.isChangingMap) {
      return;
    }
    if (this.worldMapToggleKey && Phaser.Input.Keyboard.JustDown(this.worldMapToggleKey)) {
      this.toggleWorldMap();
      return;
    }
    if (
      this.pendingSpellCast &&
      this.cancelSpellTargetingKey &&
      Phaser.Input.Keyboard.JustDown(this.cancelSpellTargetingKey)
    ) {
      this.cancelSpellTargeting("Lanzamiento cancelado.");
      return;
    }
    
    if (
      this.gameUi.isChatFocused() ||
      this.gameUi.isConfirmOpen() ||
      this.gameUi.isMacroEditorOpen()
    ) {
      return;
    }
    if (this.isWorldMapOpen) {
      return;
    }

    if (this.meditateKey && Phaser.Input.Keyboard.JustDown(this.meditateKey)) {
      this.toggleMeditation("hotkey");
      return;
    }

    if (this.attackKey && Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.stopMeditation("Dejaste de meditar.");
      this.tryAttackDummy();
    }
    if (
      this.equipSelectedSlotKey &&
      Phaser.Input.Keyboard.JustDown(this.equipSelectedSlotKey)
    ) {
      this.stopMeditation("Dejaste de meditar.");
      this.tryToggleEquipmentFromSelectedSlot();
    }
    if (
      this.dropSelectedSlotKey &&
      Phaser.Input.Keyboard.JustDown(this.dropSelectedSlotKey)
    ) {
      this.stopMeditation("Dejaste de meditar.");
      this.tryDropSelectedItem();
    }

    this.updateDesiredFacing();

    if (Phaser.Input.Keyboard.JustDown(this.pickupKey)) {
      this.stopMeditation("Dejaste de meditar.");
      this.tryPickupItem();
    }

    if (this.isMoving) {
      return;
    }

    const direction = this.getPressedDirection();
    if (!direction) {
      return;
    }

    if (this.isPlayerImmobilized()) {
      const now = this.time.now;
      if (now >= this.nextImmobilizedMoveFeedbackAt) {
        this.nextImmobilizedMoveFeedbackAt = now + 900;
        this.gameUi.addCombatLine("Estás inmovilizado y no podés moverte.");
      }
      return;
    }

    this.stopMeditation("Dejaste de meditar.");
    this.tryStep(direction);
  }

  private isPlayerImmobilized(now = this.time.now): boolean {
    return now < this.playerImmobilizedUntilMs;
  }

  private applyInmovilizadoDebuffToDummy(dummy: DummyState, sourceName: string) {
    const now = this.time.now;
    const wasImmobilized = now < dummy.immobilizedUntilMs;
    dummy.immobilizedUntilMs = Math.max(
      dummy.immobilizedUntilMs,
      now + INMOVILIZADO_MOB_DURATION_MS
    );

    if (wasImmobilized) {
      this.gameUi.addCombatLine(
        `${sourceName} refuerza Inmovilizado en ${dummy.name} (${formatImmobilizeRemaining(
          dummy.immobilizedUntilMs - now
        )}).`
      );
      return;
    }
    this.gameUi.addCombatLine(
      `${sourceName} inmoviliza a ${dummy.name} por ${formatImmobilizeDuration(
        INMOVILIZADO_MOB_DURATION_MS
      )}.`
    );
  }

  private applyInmovilizadoDebuffToPlayer(targetName: string, sourceName: string) {
    const now = this.time.now;
    const wasImmobilized = this.isPlayerImmobilized(now);
    this.playerImmobilizedUntilMs = Math.max(
      this.playerImmobilizedUntilMs,
      now + INMOVILIZADO_PLAYER_DURATION_MS
    );

    if (wasImmobilized) {
      this.gameUi.addCombatLine(
        `${sourceName} refuerza Inmovilizado en ${targetName} (${formatImmobilizeRemaining(
          this.playerImmobilizedUntilMs - now
        )}).`
      );
      return;
    }
    this.gameUi.addCombatLine(
      `${sourceName} inmoviliza a ${targetName} por ${formatImmobilizeDuration(
        INMOVILIZADO_PLAYER_DURATION_MS
      )}.`
    );
  }

  private updatePlayerDebuffs() {
    const isImmobilized = this.isPlayerImmobilized();
    if (this.wasPlayerImmobilizedLastFrame && !isImmobilized) {
      this.gameUi.addCombatLine("Ya podés moverte.");
      this.nextImmobilizedMoveFeedbackAt = 0;
    }
    this.wasPlayerImmobilizedLastFrame = isImmobilized;
  }

  private syncTreeOcclusion() {
    if (!this.player || this.mapTrees.length === 0) return;

    this.mapTrees.forEach((tree) => {
      const bounds = tree.getBounds();
      const playerBehindTree =
        this.player.x >= bounds.left &&
        this.player.x <= bounds.right &&
        this.player.y <= tree.y &&
        this.player.y >= bounds.top;
      tree.setAlpha(playerBehindTree ? TREE_OCCLUDED_ALPHA : 1);
    });
  }

  private getPressedDirection(): MoveDirection | null {
    if (this.desiredFacing && this.isFacingPressed(this.desiredFacing)) {
      return this.directionFromFacing(this.desiredFacing);
    }

    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      return this.directionFromFacing("up");
    }

    if (this.cursors.down.isDown || this.wasd.down.isDown) {
      return this.directionFromFacing("down");
    }

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      return this.directionFromFacing("left");
    }

    if (this.cursors.right.isDown || this.wasd.right.isDown) {
      return this.directionFromFacing("right");
    }

    this.desiredFacing = null;
    return null;
  }
  private handleInventorySlotDoubleClick(slotIndex: number) {
    const stack = this.inventory[slotIndex];
    if (!stack) {
      return;
    }

    const item = getItemDefinition(stack.itemId);
    if (item.type === "consumable") {
      this.useConsumableFromSlot(slotIndex);
      return;
    }

    this.toggleEquipStateFromSlot(slotIndex);
  }

  private tryToggleEquipmentFromSelectedSlot() {
    const slotIndex = this.gameUi.getSelectedInventorySlot();
    if (slotIndex < 0 || slotIndex >= this.inventory.length) {
      this.gameUi.addChatLine("Seleccioná un casillero del inventario primero.");
      return;
    }

    this.toggleEquipStateFromSlot(slotIndex);
  }

  private tryDropSelectedItem() {
    const slotIndex = this.gameUi.getSelectedInventorySlot();
    if (slotIndex < 0 || slotIndex >= this.inventory.length) {
      this.gameUi.addChatLine("Seleccioná un casillero del inventario primero.");
      return;
    }

    const stack = this.inventory[slotIndex];
    if (!stack) {
      this.gameUi.addChatLine("Ese casillero está vacío.");
      return;
    }

    const item = getItemDefinition(stack.itemId);
    this.gameUi.showDropConfirm(
      item.name,
      stack.count,
      (dropCount) => this.dropItemFromSlot(slotIndex, dropCount)
    );
  }

  private dropItemFromSlot(slotIndex: number, dropCount: number) {
    const stack = this.inventory[slotIndex];
    if (!stack || dropCount <= 0) {
      return;
    }

    const { itemId } = stack;
    const originalCount = stack.count;
    const safeDropCount = Math.min(dropCount, originalCount);
    const isDroppingAll = safeDropCount >= originalCount;

    if (isDroppingAll) {
      const equippedSlot = this.getEquippedSlotForItem(itemId);
      if (equippedSlot) {
        this.equipment[equippedSlot] = null;
        if (equippedSlot === "armor") {
          this.syncEquippedArmorOutfit();
        }
        if (equippedSlot === "weapon") {
          this.syncEquippedWeaponVisual();
        }
      }
      this.inventory[slotIndex] = null;
      this.gameUi.clearInventorySlot(slotIndex);
    } else {
      stack.count = originalCount - safeDropCount;
      const itemDef = getItemDefinition(itemId);
      this.gameUi.setInventorySlot(slotIndex, itemDef.textureKey, stack.count);
    }

    this.createWorldItem(itemId, this.playerTileX, this.playerTileY, safeDropCount);

    const item = getItemDefinition(itemId);
    this.gameUi.addChatLine(
      safeDropCount > 1 ? `Tiraste ${item.name} x${safeDropCount}.` : `Tiraste ${item.name}.`
    );
  }

  private getEquippedSlotForItem(itemId: ItemId): EquipmentSlot | null {
    for (const slot of ["weapon", "shield", "helmet", "armor"] as const) {
      if (this.equipment[slot] === itemId) {
        return slot;
      }
    }
    return null;
  }

  private toggleEquipStateFromSlot(slotIndex: number) {
    const stack = this.inventory[slotIndex];
    if (!stack) {
      this.gameUi.addChatLine("Ese casillero está vacío.");
      return;
    }

    const item = getItemDefinition(stack.itemId);
    if (!item.equipSlot) {
      this.gameUi.addChatLine(`${item.name} no se puede equipar.`);
      return;
    }

    if (this.equipment[item.equipSlot] === stack.itemId) {
      this.unequipItem(item.equipSlot);
      return;
    }

    this.equipItem(slotIndex);
  }
  
  private equipItem(slotIndex: number) {
    const stack = this.inventory[slotIndex];
  
    if (!stack) {
      return;
    }
  
    const item = getItemDefinition(stack.itemId);
  
    if (!item.equipSlot) {
      return;
    }
  
    this.equipment[item.equipSlot] = stack.itemId;
    this.syncEquippedArmorOutfit();
    this.syncEquippedWeaponVisual();

    const combat = this.getCombatSnapshot();
    const parts: string[] = [];
    if (item.combatModifiers?.attackMinBonus || item.combatModifiers?.attackMaxBonus) {
      parts.push(`danio ${combat.attackMin}-${combat.attackMax}`);
    }
    if ((item.combatModifiers?.damageReductionPercent ?? 0) > 0) {
      parts.push(`reduccion ${Math.round(combat.damageReductionPercent * 100)}%`);
    }
    const statsText = parts.length > 0 ? ` (${parts.join(", ")})` : "";
    this.gameUi.addChatLine(`Equipaste ${item.name}${statsText}.`);
  }

  private unequipItem(slot: EquipmentSlot) {
    const equippedItemId = this.equipment[slot];
    if (!equippedItemId) {
      return;
    }

    const item = getItemDefinition(equippedItemId);
    this.equipment[slot] = null;
    this.syncEquippedArmorOutfit();
    this.syncEquippedWeaponVisual();
    this.gameUi.addChatLine(`Te quitaste ${item.name}.`);
  }

  private syncEquippedArmorOutfit() {
    const armorItemId = this.equipment.armor;
    let nextOutfit: Outfit = "base";
    if (armorItemId) {
      const armorItem = getItemDefinition(armorItemId);
      if (armorItem.equipSlot === "armor") {
        nextOutfit = armorItem.outfitOverride ?? "base";
      }
    }
    if (nextOutfit === this.equippedOutfit) return;
    this.equippedOutfit = nextOutfit;
    const pos = this.getPlayerFeetWorldForTile(this.playerTileX, this.playerTileY);
    this.player.setPosition(pos.x, pos.y);
    this.syncPlayerFacePosition();
    this.syncEquippedWeaponVisual();
    this.playFacingAnim(this.isMoving ? "walk" : "idle");
  }

  private updateDesiredFacing() {
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.up)
    ) {
      this.desiredFacing = "up";
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.down)
    ) {
      this.desiredFacing = "down";
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.left) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.left)
    ) {
      this.desiredFacing = "left";
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.right) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.right)
    ) {
      this.desiredFacing = "right";
    }
  }

  private isFacingPressed(facing: Facing): boolean {
    if (facing === "up") {
      return this.cursors.up.isDown || this.wasd.up.isDown;
    }

    if (facing === "down") {
      return this.cursors.down.isDown || this.wasd.down.isDown;
    }

    if (facing === "left") {
      return this.cursors.left.isDown || this.wasd.left.isDown;
    }

    return this.cursors.right.isDown || this.wasd.right.isDown;
  }

  private tryPickupItem() {
    const itemIndex = this.worldItems.findIndex((item) => {
      return (
        item.tileX === this.playerTileX &&
        item.tileY === this.playerTileY
      );
    });
  
    if (itemIndex === -1) {
      this.gameUi.addChatLine("No hay ningún item para agarrar.");
      return;
    }
  
    const worldItem = this.worldItems[itemIndex];
    const { added, remaining } = addToInventory(
      this.inventory,
      worldItem.id,
      worldItem.count
    );

    if (added <= 0) {
      this.gameUi.addChatLine("No tenés espacio en el inventario.");
      return;
    }

    const item = getItemDefinition(worldItem.id);
    if (remaining <= 0) {
      worldItem.sprite.destroy();
      this.worldItems.splice(itemIndex, 1);
    } else {
      worldItem.count = remaining;
    }

    this.gameUi.addChatLine(
      added > 1 ? `Agarraste ${item.name} x${added}.` : `Agarraste ${item.name}.`
    );
  
    this.refreshInventoryUi();
  }
  
  private refreshInventoryUi() {
    this.inventory.forEach((stack, slotIndex) => {
      if (!stack) {
        this.gameUi.clearInventorySlot(slotIndex);
        return;
      }
  
      const item = getItemDefinition(stack.itemId);
      this.gameUi.setInventorySlot(slotIndex, item.textureKey, stack.count);
    });
    this.refreshMacroVisuals();
  }

  private openMacroEditor(slotIndex: number) {
    const binding = this.macroBindings[slotIndex];
    const itemOptions = this.getMacroItemOptions();
    const spellOptions = this.getMacroSpellOptions();
    const nextItemId =
      binding.itemId && itemOptions.some((option) => option.itemId === binding.itemId)
        ? binding.itemId
        : itemOptions[0]?.itemId ?? null;
    const nextSpellId =
      binding.spellId && spellOptions.some((option) => option.spellId === binding.spellId)
        ? binding.spellId
        : spellOptions[0]?.spellId ?? null;

    const config: MacroEditorConfig = {
      slotIndex,
      keyCode: binding.keyCode,
      action: binding.action,
      selectedItemId: nextItemId,
      itemOptions,
      selectedSpellId: nextSpellId,
      spellOptions,
    };
    this.gameUi.showMacroEditor(config, (savedConfig) => {
      const targetBinding = this.macroBindings[savedConfig.slotIndex];
      targetBinding.keyCode = savedConfig.keyCode;
      targetBinding.action = savedConfig.action;
      targetBinding.itemId = (savedConfig.selectedItemId as ItemId | null) ?? null;
      targetBinding.spellId = savedConfig.selectedSpellId ?? null;
      this.refreshMacroVisuals();
      this.gameUi.addChatLine(`Macro ${savedConfig.slotIndex + 1} actualizada.`);
    });
  }

  private getMacroItemOptions(): MacroEditorItemOption[] {
    const grouped = new Map<
      ItemId,
      { count: number; firstSlot: number; name: string }
    >();
    this.inventory.forEach((slot, slotIndex) => {
      if (!slot) return;
      const entry = grouped.get(slot.itemId);
      const item = getItemDefinition(slot.itemId);
      if (!entry) {
        grouped.set(slot.itemId, {
          count: slot.count,
          firstSlot: slotIndex,
          name: item.name,
        });
        return;
      }
      entry.count += slot.count;
      entry.firstSlot = Math.min(entry.firstSlot, slotIndex);
    });

    return [...grouped.entries()]
      .sort((a, b) => a[1].firstSlot - b[1].firstSlot || b[1].count - a[1].count)
      .map(([itemId, info]) => ({
        itemId,
        label: `Slot ${info.firstSlot + 1}: ${info.name} x${info.count}`,
      }));
  }

  private getMacroSpellOptions(): MacroEditorSpellOption[] {
    return this.getKnownSpellDefinitions().map((spell) => ({
      spellId: spell.idSpell,
      label: `#${spell.idSpell} ${spell.nombre}`,
    }));
  }

  private getKnownSpellDefinitions(): SpellDefinition[] {
    return SPELL_DEFINITIONS.filter(
      (spell) =>
        this.learnedSpellIds.has(spell.idSpell) &&
        spell.usableBy.includes(this.selectedClass) &&
        spell.nivelMagiaRequerido <= this.playerMagicLevel
    );
  }

  private refreshMacroVisuals() {
    this.macroBindings.forEach((binding, index) => {
      this.gameUi.setMacroKeyLabel(index, this.formatMacroKeyLabel(binding.keyCode));
      const iconTexture =
        binding.action === "cast_spell"
          ? binding.spellId !== null
            ? macroSpellTextureKey(binding.spellId)
            : null
          : binding.itemId
          ? getItemDefinition(binding.itemId).textureKey
          : null;
      this.gameUi.setMacroItemIcon(index, iconTexture);
    });
  }

  private formatMacroKeyLabel(keyCode: string | null) {
    if (!keyCode) return "";
    if (keyCode.startsWith("Digit")) return keyCode.slice(5);
    if (keyCode.startsWith("Key")) return keyCode.slice(3);
    return keyCode.replace("Numpad", "N");
  }

  private handleMacroHotkey(event: KeyboardEvent) {
    if (
      !event.code ||
      this.gameUi.isChatFocused() ||
      this.gameUi.isConfirmOpen() ||
      this.gameUi.isMacroEditorOpen()
    ) {
      return;
    }

    const macroIndex = this.macroBindings.findIndex(
      (binding) => binding.keyCode === event.code
    );
    if (macroIndex < 0) return;

    this.executeMacro(macroIndex);
  }

  private executeMacro(macroIndex: number) {
    const macro = this.macroBindings[macroIndex];
    if (macro.action === "cast_spell") {
      const spellDefinition = this.getKnownSpellDefinitions().find((spell) => {
        if (macro.spellId !== null) {
          return spell.idSpell === macro.spellId;
        }
        const fallbackSpell = this.gameUi.getSelectedSpellForMacro();
        return fallbackSpell ? spell.idSpell === fallbackSpell.idSpell : false;
      });
      if (!spellDefinition) {
        this.gameUi.addChatLine("No conocés ese hechizo o ya no está disponible.");
        return;
      }
      if (macro.spellId === null) {
        macro.spellId = spellDefinition.idSpell;
        this.refreshMacroVisuals();
      }
      const spell: SpellCastRequest = {
        idSpell: spellDefinition.idSpell,
        nombre: spellDefinition.nombre,
        descripcion: spellDefinition.descripcion,
        valor: spellDefinition.valor,
        usableBy: spellDefinition.usableBy,
        nivelMagiaRequerido: spellDefinition.nivelMagiaRequerido,
        manaCost: spellDefinition.manaCost,
        danioMin: spellDefinition.danioMin,
        danioMax: spellDefinition.danioMax,
        healMin: spellDefinition.healMin,
        healMax: spellDefinition.healMax,
        puedeUsarseEnAliados: spellDefinition.puedeUsarseEnAliados,
        remueveDebuff: spellDefinition.remueveDebuff,
      };
      this.beginSpellTargeting(spell);
      this.gameUi.addChatLine(`Macro ${macroIndex + 1}: preparado ${spell.nombre}.`);
      return;
    }

    if (!macro.itemId) {
      this.gameUi.addChatLine(`Macro ${macroIndex + 1} sin objeto asignado.`);
      return;
    }

    const slotIndex = this.inventory.findIndex(
      (slot) => slot?.itemId === macro.itemId
    );
    if (slotIndex < 0) {
      const item = getItemDefinition(macro.itemId);
      this.gameUi.addChatLine(`No tenés ${item.name} en inventario.`);
      return;
    }

    if (macro.action === "use_item") {
      this.useConsumableFromSlot(slotIndex);
      return;
    }

    this.toggleEquipStateFromSlot(slotIndex);
  }

  private directionFromFacing(facing: Facing): MoveDirection {
    if (facing === "up") {
      return { dx: 0, dy: -1, facing };
    }

    if (facing === "down") {
      return { dx: 0, dy: 1, facing };
    }

    if (facing === "left") {
      return { dx: -1, dy: 0, facing };
    }

    return { dx: 1, dy: 0, facing };
  }

  private tryStep(dir: MoveDirection) {
    const nextX = this.playerTileX + dir.dx;
    const nextY = this.playerTileY + dir.dy;

    if (!this.isTileWalkable(nextX, nextY)) {
      this.facing = dir.facing;
      this.playFacingAnim("idle");
      return;
    }

    this.playerTileX = nextX;
    this.playerTileY = nextY;
    this.facing = dir.facing;
    this.isMoving = true;

    this.refreshMinimap();

    const target = this.getPlayerFeetWorldForTile(nextX, nextY);
    this.playFacingAnim("walk");

    this.tweens.add({
      targets: this.player,
      x: target.x,
      y: target.y,
      duration: STEP_DURATION_MS,
      ease: "Linear",
      onUpdate: () => {
        this.syncPlayerFacePosition();
        this.syncEquippedWeaponVisual();
      },
      onComplete: () => {
        this.player.setPosition(target.x, target.y);
        this.syncPlayerFacePosition();
        this.syncEquippedWeaponVisual();

        this.isMoving = false;
        this.playFacingAnim("idle");
        this.handleTileEvents();
      },
    });
  }

  /** Al terminar un paso: revisar transiciones por tile o por borde del mapa. */
  private handleTileEvents() {
    const transition = findTransition(
      this.currentMapId,
      this.playerTileX,
      this.playerTileY,
      this.facing
    );

    if (transition) {
      this.changeMap(transition);
    }
  }

  private changeMap(transition: {
    toMapId: string;
    toTileX: number;
    toTileY: number;
    facing?: Facing;
  }) {
    this.stopMeditation();
    if (this.pendingSpellCast) {
      this.cancelSpellTargeting();
    }
    this.isChangingMap = true;
    this.tweens.killTweensOf(this.player);
    this.isMoving = false;

    this.currentMapId = transition.toMapId;
    this.currentMap = getMap(this.currentMapId);
    this.updateWorldBackgroundColor();
    this.playerTileX = transition.toTileX;
    this.playerTileY = transition.toTileY;

    if (transition.facing) {
      this.facing = transition.facing;
    }

    this.drawMap(this.currentMap);
    this.syncDummyVisibilityForCurrentMap();
    this.updateCameraBounds();

    const pos = this.getPlayerFeetWorldForTile(this.playerTileX, this.playerTileY);

    this.player.setPosition(pos.x, pos.y);
    this.syncPlayerFacePosition();
    this.updatePlayerFaceFrame();
    this.syncEquippedWeaponVisual();

    this.playFacingAnim("idle");
    this.refreshHud();
    this.gameUi.addChatLine(`Entraste a ${this.currentMap.name}.`);

    this.cameras.main.flash(120, 255, 255, 200);
    this.isChangingMap = false;
  }

  private playFacingAnim(state: "walk" | "idle") {
    const bodyFacing: Facing = this.facing === "right" ? "left" : this.facing;
    const key = playerAnimationKey(state, bodyFacing, this.equippedOutfit);
    this.player.setFlipX(this.facing === "right");

    if (this.player.anims.currentAnim?.key !== key) {
      this.player.play(key);
    }

    this.updatePlayerFaceFrame();
    this.syncPlayerFacePosition();
    this.syncEquippedWeaponVisual();
  }

  private updatePlayerFaceFrame() {
    if (!this.playerFace) return;

    this.playerFace.setFrame(
      getHumanFaceFrame(this.selectedFaceIndex, this.facing)
    );
  }

  private syncPlayerFacePosition() {
    if (!this.player || !this.playerFace) return;
  
    const offset = PLAYER_FACE_OFFSET[this.facing];
    let walkSwayX = 0;
    let walkSwayY = 0;

    if (this.isMoving) {
      const anim = this.player.anims.currentAnim;
      const frame = this.player.anims.currentFrame;
      const frameTotal = Math.max(1, anim?.frames.length ?? 1);
      const rawFrameIndex = frame?.index ?? 0;
      const frameIndex = ((rawFrameIndex % frameTotal) + frameTotal) % frameTotal;
      const phase =
        (frameIndex / Math.max(1, frameTotal - 1)) * Math.PI * 2;

      if (this.facing === "left" || this.facing === "right") {
        // A/D: leve movimiento hacia atras/adelante, sincronizado con el paso.
        walkSwayX = Math.sin(phase) * 0.18;
        walkSwayY = Math.cos(phase) * 0.04;
      } else {
        // W/S: movimiento aun mas suave.
        walkSwayX = Math.sin(phase) * 0.08;
        walkSwayY = Math.cos(phase) * 0.1;
      }
    }
  
    this.playerFace.setPosition(
      this.player.x + offset.x + walkSwayX,
      this.player.y - offset.y + walkSwayY
    );
    this.playerFace.setDepth(this.player.depth + 0.02);
  }

  private syncPlayerNameLabelPosition() {
    if (!this.player || !this.playerNameLabel) return;

    this.playerNameLabel.setPosition(this.player.x, this.player.y + 2);
    this.playerNameLabel.setDepth(this.player.depth + 2);
  }

  private syncEquippedWeaponVisual() {
    if (!this.player || !this.equippedWeaponSprite) return;

    const equippedWeaponId = this.equipment.weapon;
    if (!equippedWeaponId) {
      this.equippedWeaponSprite.setVisible(false);
      return;
    }

    const weaponDef = getItemDefinition(equippedWeaponId);
    const weaponTexture = weaponDef.equippedTextureKey ?? weaponDef.textureKey;
    this.equippedWeaponSprite.setTexture(weaponTexture);
    const idleFrame = weaponDef.equippedIdleFrame ?? 0;
    const walkFrame = weaponDef.equippedWalkFrame ?? idleFrame;
    const bodyFrameIndex = this.player.anims.currentFrame?.index ?? 0;
    const useWalkFrame = this.isMoving && bodyFrameIndex % 2 === 1;

    const hasDirectionalSheet =
      Boolean(weaponDef.equippedFrameWidth) && Boolean(weaponDef.equippedFrameHeight);

    const weaponFrame = hasDirectionalSheet
      ? WEAPON_ROW_BY_FACING[this.facing] * WEAPON_SHEET_COLS + (useWalkFrame ? 1 : 0)
      : useWalkFrame
      ? walkFrame
      : idleFrame;
    this.equippedWeaponSprite.setFrame(weaponFrame);
    this.equippedWeaponSprite.setScale(weaponDef.equippedScale ?? 1);
    this.equippedWeaponSprite.setPosition(this.player.x, this.player.y);
    this.equippedWeaponSprite.setDepth(this.player.depth + 0.015);
    this.equippedWeaponSprite.setVisible(true);
    this.equippedWeaponSprite.setFlipX(false);
  }

  private depthFromFeetY(feetY: number): number {
    return WORLD_DEPTH_BASE + feetY / WORLD_DEPTH_SCALE;
  }

  private getPlayerFeetWorldForTile(tileX: number, tileY: number) {
    const feet = tileToFeetWorld(tileX, tileY, TILE_SIZE);
    const offset = feetOffsetForOutfit(this.equippedOutfit);
    return {
      x: feet.x + offset.x,
      y: feet.y + offset.y,
    };
  }

  private getMobFeetWorld(modelId: MobModelId, tileX: number, tileY: number) {
    const feet = tileToFeetWorld(tileX, tileY, TILE_SIZE);
    const model = MOB_MODELS[modelId];
    return {
      x: feet.x,
      y: feet.y + model.visualOffsetY,
    };
  }

  private syncDummyWorldPosition(dummy: DummyState) {
    const feet = this.getMobFeetWorld(dummy.modelId, dummy.tileX, dummy.tileY);
    dummy.sprite.setPosition(feet.x, feet.y);
    dummy.sprite.setDepth(this.depthFromFeetY(feet.y));
    dummy.hpLabel.setPosition(feet.x, feet.y - 30);
  }

  private syncEntityDepths() {
    if (!this.player) return;
    this.player.setDepth(this.depthFromFeetY(this.player.y));
    if (this.playerFace) {
      this.playerFace.setDepth(this.player.depth + 0.02);
    }
    if (this.playerNameLabel) {
      this.playerNameLabel.setDepth(this.player.depth + 2);
    }
  }

  private isMapTileWalkable(tileX: number, tileY: number): boolean {
    const map = this.currentMap;

    if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) {
      return false;
    }

    const tile = map.tiles[tileY][tileX];
    const tileDefinition = getTileDefinition(tile);
    return tileDefinition.walkable;
  }

  private isTileWalkable(tileX: number, tileY: number): boolean {
    if (!this.isMapTileWalkable(tileX, tileY)) {
      return false;
    }

    const blocksByDummy = this.dummies.some((dummy) => {
      if (!dummy.alive || this.currentMapId !== dummy.mapId) return false;
      return this.getDummyOccupiedTiles(dummy).some((occupiedTile) => {
        return occupiedTile.x === tileX && occupiedTile.y === tileY;
      });
    });
    if (blocksByDummy) {
      return false;
    }

    return true;
  }

  private createDummyIfNeeded() {
    if (this.dummies.length > 0) {
      this.syncDummyVisibilityForCurrentMap();
      return;
    }

    this.dummies = [];
    MOB_SPAWNS.forEach((spawn) => {
      const model = MOB_MODELS[spawn.modelId];
      const spawnTile = this.pickRandomMobSpawnTile(spawn);
      const spawnFeet = this.getMobFeetWorld(spawn.modelId, spawnTile.x, spawnTile.y);
      const sprite = this.add.sprite(spawnFeet.x, spawnFeet.y, model.textureKey, model.idleFrame);
      sprite.setOrigin(0.5, 1);
      sprite.setDepth(9);
      sprite.setScale(model.scale);
      sprite.setInteractive({ useHandCursor: true, pixelPerfect: true });

      const hpLabel = this.add.text(
        spawnFeet.x,
        spawnFeet.y - 30,
        `${spawn.name} ${spawn.maxHp}/${spawn.maxHp}`,
        {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#f7e5c6",
          stroke: "#000000",
          strokeThickness: 2,
        }
      );
      hpLabel.setOrigin(0.5, 1);
      hpLabel.setDepth(12);
      hpLabel.setVisible(false);

      const dummy: DummyState = {
        spawnConfig: spawn,
        id: spawn.id,
        modelId: spawn.modelId,
        name: spawn.name,
        mapId: spawn.mapId,
        tileX: spawnTile.x,
        tileY: spawnTile.y,
        hitboxOffsetY: spawn.hitboxOffsetY,
        sizeTiles: spawn.sizeTiles,
        hp: spawn.maxHp,
        maxHp: spawn.maxHp,
        detectionRangeTiles: spawn.detectionRangeTiles,
        leashRangeTiles: spawn.leashRangeTiles,
        attackDamage: spawn.attackDamage,
        attackCooldownMs: spawn.attackCooldownMs,
        respawnMs: spawn.respawnMs,
        expReward: spawn.expReward,
        drops: spawn.drops,
        aiMoveCooldownMs: MOB_AI_MOVE_COOLDOWN_MS,
        nextAiMoveAt: 0,
        nextAttackAt: 0,
        immobilizedUntilMs: 0,
        isAggroed: false,
        isStatic: false,
        fixedSpawnTile: undefined,
        facing: "down",
        isMoving: false,
        sprite,
        hpLabel,
        alive: true,
      };
      this.syncDummyWorldPosition(dummy);
      this.setMobAnimationState(dummy, "idle");
      sprite.on("pointerdown", () => {
        if (this.pendingSpellCast) {
          this.tryCastSpellOnDummy(dummy);
          return;
        }
        this.inspectDummy(dummy);
      });
      this.dummies.push(dummy);
    });

    const trainingDummyMapId = this.currentMapId;
    const trainingDummyTileX = this.playerTileX;
    const trainingDummyTileY = Math.max(0, this.playerTileY - 1);
    const trainingDummyModelId: MobModelId = "gallina";
    const trainingDummyModel = MOB_MODELS[trainingDummyModelId];
    const trainingFeet = this.getMobFeetWorld(
      trainingDummyModelId,
      trainingDummyTileX,
      trainingDummyTileY
    );
    const trainingSprite = this.add.sprite(
      trainingFeet.x,
      trainingFeet.y,
      trainingDummyModel.textureKey,
      trainingDummyModel.idleFrame
    );
    trainingSprite.setOrigin(0.5, 1);
    trainingSprite.setDepth(9);
    trainingSprite.setScale(trainingDummyModel.scale);
    trainingSprite.setInteractive({ useHandCursor: true, pixelPerfect: true });

    const trainingHpLabel = this.add.text(
      trainingFeet.x,
      trainingFeet.y - 30,
      `${TRAINING_DUMMY_NAME} ${TRAINING_DUMMY_HP}/${TRAINING_DUMMY_HP}`,
      {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#f7e5c6",
        stroke: "#000000",
        strokeThickness: 2,
      }
    );
    trainingHpLabel.setOrigin(0.5, 1);
    trainingHpLabel.setDepth(12);
    trainingHpLabel.setVisible(false);

    const trainingSpawnConfig: MobSpawnConfig = {
      id: TRAINING_DUMMY_ID,
      mobId: "gallina",
      name: TRAINING_DUMMY_NAME,
      mapId: trainingDummyMapId,
      hitboxOffsetY: 0,
      sizeTiles: 1,
      modelId: trainingDummyModelId,
      maxHp: TRAINING_DUMMY_HP,
      detectionRangeTiles: 0,
      leashRangeTiles: 0,
      attackDamage: 0,
      attackCooldownMs: 1000,
      respawnMs: 10_000,
      expReward: 0,
      drops: [],
    };

    const trainingDummy: DummyState = {
      spawnConfig: trainingSpawnConfig,
      id: TRAINING_DUMMY_ID,
      modelId: trainingDummyModelId,
      name: TRAINING_DUMMY_NAME,
      mapId: trainingDummyMapId,
      tileX: trainingDummyTileX,
      tileY: trainingDummyTileY,
      hitboxOffsetY: 0,
      sizeTiles: 1,
      hp: TRAINING_DUMMY_HP,
      maxHp: TRAINING_DUMMY_HP,
      detectionRangeTiles: 0,
      leashRangeTiles: 0,
      attackDamage: 0,
      attackCooldownMs: 1000,
      respawnMs: 10_000,
      expReward: 0,
      drops: [],
      aiMoveCooldownMs: MOB_AI_MOVE_COOLDOWN_MS,
      nextAiMoveAt: 0,
      nextAttackAt: 0,
      immobilizedUntilMs: 0,
      isAggroed: false,
      isStatic: true,
      fixedSpawnTile: { x: trainingDummyTileX, y: trainingDummyTileY },
      facing: "down",
      isMoving: false,
      sprite: trainingSprite,
      hpLabel: trainingHpLabel,
      alive: true,
    };
    this.syncDummyWorldPosition(trainingDummy);
    this.setMobAnimationState(trainingDummy, "idle");
    trainingSprite.on("pointerdown", () => {
      if (this.pendingSpellCast) {
        this.tryCastSpellOnDummy(trainingDummy);
        return;
      }
      this.inspectDummy(trainingDummy);
    });
    this.dummies.push(trainingDummy);

    this.syncDummyVisibilityForCurrentMap();
  }

  private syncDummyVisibilityForCurrentMap() {
    this.dummies.forEach((dummy) => {
      const visible = this.currentMapId === dummy.mapId;
      dummy.sprite.setVisible(visible && dummy.alive);
      dummy.hpLabel.setVisible(false);

      if (visible && dummy.alive && !dummy.isMoving) {
        this.syncDummyWorldPosition(dummy);
      }
    });
  }

  private updateMobAi() {
    if (!this.player || this.isChangingMap) return;

    const now = this.time.now;

    this.dummies.forEach((dummy) => {
      if (!dummy.alive || dummy.mapId !== this.currentMapId) return;
      if (dummy.isStatic) {
        this.setMobAnimationState(dummy, "idle");
        return;
      }
      if (now < dummy.immobilizedUntilMs) {
        this.stopDummyMovement(dummy);
        this.setMobAnimationState(dummy, "idle");
        return;
      }

      const dummyHitTile = this.getDummyHitTile(dummy);
      const distanceToPlayer =
        Math.abs(this.playerTileX - dummyHitTile.x) + Math.abs(this.playerTileY - dummyHitTile.y);

      if (distanceToPlayer > dummy.leashRangeTiles) {
        dummy.isAggroed = false;
        this.setMobAnimationState(dummy, "idle");
        return;
      }

      if (!dummy.isAggroed && distanceToPlayer <= dummy.detectionRangeTiles) {
        dummy.isAggroed = true;
      }

      if (!dummy.isAggroed) {
        this.setMobAnimationState(dummy, "idle");
        return;
      }

      if (distanceToPlayer === 1) {
        if (!dummy.isMoving) {
          this.tryMobAttackPlayer(dummy, now);
          this.setMobAnimationState(dummy, "idle");
        }
        return;
      }

      if (dummy.isMoving) {
        return;
      }

      if (now < dummy.nextAiMoveAt) {
        return;
      }

      const movedFacing = this.tryMoveDummyTowardsPlayer(dummy);
      if (movedFacing) {
        dummy.nextAiMoveAt = now + dummy.aiMoveCooldownMs;
      } else {
        this.setMobAnimationState(dummy, "idle");
      }
    });
  }

  private tryMoveDummyTowardsPlayer(dummy: DummyState): Facing | null {
    return this.tryMoveDummyTowardsTile(dummy, this.playerTileX, this.playerTileY);
  }

  private tryMoveDummyTowardsTile(
    dummy: DummyState,
    targetTileX: number,
    targetTileY: number
  ): Facing | null {
    const dx = targetTileX - dummy.tileX;
    const dy = targetTileY - dummy.tileY;
    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);
    const prioritizeX = Math.abs(dx) >= Math.abs(dy);

    const options: { x: number; y: number }[] = prioritizeX
      ? [
          { x: dummy.tileX + stepX, y: dummy.tileY },
          { x: dummy.tileX, y: dummy.tileY + stepY },
          { x: dummy.tileX, y: dummy.tileY + (stepY === 0 ? 1 : -stepY) },
          { x: dummy.tileX + (stepX === 0 ? 1 : -stepX), y: dummy.tileY },
        ]
      : [
          { x: dummy.tileX, y: dummy.tileY + stepY },
          { x: dummy.tileX + stepX, y: dummy.tileY },
          { x: dummy.tileX + (stepX === 0 ? 1 : -stepX), y: dummy.tileY },
          { x: dummy.tileX, y: dummy.tileY + (stepY === 0 ? 1 : -stepY) },
        ];

    for (const option of options) {
      if (!this.isTileWalkableForMob(option.x, option.y, dummy)) continue;

      const movedFacing =
        option.x > dummy.tileX
          ? "right"
          : option.x < dummy.tileX
          ? "left"
          : option.y > dummy.tileY
          ? "down"
          : "up";
      if (this.startDummyStep(dummy, option.x, option.y, movedFacing)) {
        return movedFacing;
      }
    }

    return null;
  }

  private startDummyStep(
    dummy: DummyState,
    nextTileX: number,
    nextTileY: number,
    facing: Facing
  ): boolean {
    if (dummy.isMoving) {
      return false;
    }

    this.tweens.killTweensOf(dummy.sprite);
    this.tweens.killTweensOf(dummy.hpLabel);

    dummy.tileX = nextTileX;
    dummy.tileY = nextTileY;
    dummy.facing = facing;
    dummy.isMoving = true;

    const target = this.getMobFeetWorld(dummy.modelId, nextTileX, nextTileY);
    this.setMobAnimationState(dummy, "walk");

    this.tweens.add({
      targets: dummy.sprite,
      x: target.x,
      y: target.y,
      duration: MOB_STEP_DURATION_MS,
      ease: "Linear",
      onUpdate: () => {
        dummy.hpLabel.setPosition(dummy.sprite.x, dummy.sprite.y - 30);
        dummy.sprite.setDepth(this.depthFromFeetY(dummy.sprite.y));
        dummy.hpLabel.setDepth(dummy.sprite.depth + 3);
      },
      onComplete: () => {
        dummy.isMoving = false;
        this.syncDummyWorldPosition(dummy);
        if (dummy.alive && dummy.isAggroed) {
          this.setMobAnimationState(dummy, "idle");
        }
      },
    });

    return true;
  }

  private stopDummyMovement(dummy: DummyState) {
    if (!dummy.isMoving) {
      return;
    }
    this.tweens.killTweensOf(dummy.sprite);
    this.tweens.killTweensOf(dummy.hpLabel);
    dummy.isMoving = false;
    this.syncDummyWorldPosition(dummy);
  }

  private isTileWalkableForMob(tileX: number, tileY: number, source: DummyState): boolean {
    if (!this.isMapTileWalkable(tileX, tileY)) return false;
    if (tileX === this.playerTileX && tileY === this.playerTileY) return false;

    const blockedByAnotherMob = this.dummies.some((dummy) => {
      if (dummy === source || !dummy.alive || dummy.mapId !== this.currentMapId) return false;
      return this.getDummyOccupiedTiles(dummy).some((occupiedTile) => {
        return occupiedTile.x === tileX && occupiedTile.y === tileY;
      });
    });
    return !blockedByAnotherMob;
  }

  private tryAttackDummy() {
    const now = this.time.now;
    if (now < this.nextAttackAt) {
      return;
    }

    const targetDummy = this.getDummyInAttackRange();
    if (!targetDummy) {
      this.gameUi.addCombatLine("No hay nadie para golpear.");
      return;
    }

    const coreStats = this.getCoreStats();
    const missChance = getMissChanceFromAgility(coreStats.agility);
    const didMiss = Math.random() < missChance;
    const combat = this.getCombatSnapshot();
    this.nextAttackAt = now + ATTACK_COOLDOWN_MS;
    if (didMiss) {
      this.playAttackFeedback(targetDummy.tileX, targetDummy.tileY);
      this.gameUi.addCombatLine(`Fallaste el golpe (${Math.round(missChance * 100)}% falla).`);
      return;
    }

    const damage = Phaser.Math.Between(combat.attackMin, combat.attackMax);
    const result = this.dealDamageToDummy(targetDummy, damage);

    const hitTile = this.getDummyHitTile(targetDummy);
    this.playAttackFeedback(hitTile.x, hitTile.y);

    targetDummy.sprite.setTint(0xe4b270);
    const baseScaleX = targetDummy.sprite.scaleX;
    const baseScaleY = targetDummy.sprite.scaleY;
    this.tweens.add({
      targets: targetDummy.sprite,
      scaleX: baseScaleX * 1.08,
      scaleY: baseScaleY * 0.92,
      yoyo: true,
      duration: 70,
      ease: "Quad.Out",
    });

    this.time.delayedCall(90, () => {
      if (targetDummy.alive) {
        targetDummy.sprite.clearTint();
      }
    });

    this.gameUi.addCombatLine(`Golpeaste a ${targetDummy.name} por ${result.damageApplied}.`);
  }

  private tryMobAttackPlayer(dummy: DummyState, now: number) {
    if (now < dummy.nextAttackAt) return;

    const dummyHitTile = this.getDummyHitTile(dummy);
    dummy.facing = this.resolveFacingTowardsTargetTile(
      dummyHitTile.x,
      dummyHitTile.y,
      this.playerTileX,
      this.playerTileY,
      dummy.facing
    );
    this.setMobAnimationState(dummy, "idle");

    dummy.nextAttackAt = now + dummy.attackCooldownMs;
    const damageApplied = this.applyIncomingDamage(dummy.attackDamage);
    this.showDamageNumber(this.player.x, this.player.y - 44, damageApplied, "mob");
    this.playAttackFeedback(this.playerTileX, this.playerTileY);
    this.gameUi.addCombatLine(`${dummy.name} te golpea por ${damageApplied}.`);
  }

  private resolveFacingTowardsTargetTile(
    fromTileX: number,
    fromTileY: number,
    toTileX: number,
    toTileY: number,
    fallbackFacing: Facing
  ): Facing {
    const dx = toTileX - fromTileX;
    const dy = toTileY - fromTileY;
    if (dx === 0 && dy === 0) return fallbackFacing;

    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? "right" : "left";
    }
    return dy >= 0 ? "down" : "up";
  }

  private dealDamageToDummy(dummy: DummyState, rawDamage: number): { damageApplied: number; killed: boolean } {
    const damageApplied = Math.max(0, Math.floor(rawDamage));
    dummy.hp = Math.max(0, dummy.hp - damageApplied);
    dummy.hpLabel.setText(`${dummy.name} ${dummy.hp}/${dummy.maxHp}`);
    this.showDamageNumber(dummy.sprite.x, dummy.sprite.y - 38, damageApplied, "player");

    if (dummy.hp > 0) {
      return { damageApplied, killed: false };
    }

    this.killDummy(dummy);
    return { damageApplied, killed: true };
  }

  private killDummy(dummy: DummyState) {
    this.stopDummyMovement(dummy);
    dummy.alive = false;
    dummy.nextAiMoveAt = 0;
    dummy.nextAttackAt = 0;
    dummy.immobilizedUntilMs = 0;
    dummy.isAggroed = false;
    dummy.sprite.stop();
    dummy.sprite.clearTint();
    dummy.sprite.setVisible(false);
    dummy.hpLabel.setVisible(false);
    this.gameUi.addCombatLine(`${dummy.name} fue destruido.`);
    this.grantExperience(dummy.expReward);
    this.tryDropFromDummy(dummy);
    this.scheduleDummyRespawn(dummy);
  }

  private tryDropFromDummy(dummy: DummyState) {
    for (const drop of dummy.drops) {
      if (Math.random() * 100 > drop.chancePercent) continue;
      this.createWorldItem(drop.itemId, dummy.tileX, dummy.tileY, 1);
      const item = getItemDefinition(drop.itemId);
      this.gameUi.addChatLine(
        `${dummy.name} soltó ${item.name} (${Math.round(drop.chancePercent)}%).`
      );
    }
  }

  private getCombatSnapshot(): PlayerCombatSnapshot {
    const coreStats = this.getCoreStats();
    let attackMin = ATTACK_MIN_DAMAGE;
    let attackMax = ATTACK_MAX_DAMAGE;
    let damageReductionPercent = 0;
    const strBonus = getStrengthDamageBonus(coreStats.strength);
    attackMin += strBonus.minBonus;
    attackMax += strBonus.maxBonus;

    for (const equippedItemId of Object.values(this.equipment)) {
      if (!equippedItemId) continue;
      const item = getItemDefinition(equippedItemId);
      const mods = item.combatModifiers;
      if (!mods) continue;

      attackMin += mods.attackMinBonus ?? 0;
      attackMax += mods.attackMaxBonus ?? 0;
      damageReductionPercent += mods.damageReductionPercent ?? 0;
    }

    attackMin = Math.max(1, Math.floor(attackMin));
    attackMax = Math.max(attackMin, Math.floor(attackMax));
    damageReductionPercent = Phaser.Math.Clamp(damageReductionPercent, 0, 0.9);

    return { attackMin, attackMax, damageReductionPercent };
  }

  // Centraliza la mitigacion para cuando agreguemos golpes de mobs al player.
  private applyIncomingDamage(rawDamage: number): number {
    if (rawDamage <= 0) {
      return 0;
    }
    const combat = this.getCombatSnapshot();
    const reduced = Math.max(0, Math.floor(rawDamage * (1 - combat.damageReductionPercent)));
    this.playerProgress.hp = Math.max(0, this.playerProgress.hp - reduced);
    this.refreshHud();
    return reduced;
  }

  private getCoreStats(): CoreStats {
    return resolveCoreStats(this.selectedRace, this.selectedClass);
  }

  private applyBaseVitalsFromAttributes() {
    const coreStats = this.getCoreStats();
    const vitals = getBaseVitalsFromStats(coreStats);
    this.playerProgress.hpMax = vitals.hpMax;
    this.playerProgress.mpMax = CLASS_USES_MANA[this.selectedClass] ? vitals.mpMax : 0;
    this.playerProgress.hp = vitals.hpMax;
    this.playerProgress.mp = vitals.mpMax;
    if (!CLASS_USES_MANA[this.selectedClass]) {
      this.playerProgress.mp = 0;
    }
  }

  private applyTestStartingVitals() {
    this.playerProgress.hpMax = TEST_START_HP_MAX;
    this.playerProgress.hp = TEST_START_HP;
    if (CLASS_USES_MANA[this.selectedClass]) {
      this.playerProgress.mpMax = TEST_START_MP_MAX;
      this.playerProgress.mp = TEST_START_MP;
    } else {
      this.playerProgress.mpMax = 0;
      this.playerProgress.mp = 0;
    }
  }

  private grantExperience(amount: number) {
    if (amount <= 0) return;

    this.playerProgress.exp += amount;
    this.gameUi.addCombatLine(`Ganaste ${amount} EXP.`);

    while (this.playerProgress.exp >= this.playerProgress.expToNext) {
      this.playerProgress.exp -= this.playerProgress.expToNext;
      this.playerProgress.level += 1;
      this.playerProgress.expToNext = expRequiredForLevel(this.playerProgress.level);

      const coreStats = this.getCoreStats();
      const levelBonuses = getLevelUpBonusesFromStats(coreStats);
      this.playerProgress.hpMax += levelBonuses.hpBonus;
      if (CLASS_USES_MANA[this.selectedClass]) {
        this.playerProgress.mpMax += levelBonuses.mpBonus;
      } else {
        this.playerProgress.mpMax = 0;
      }
      this.playerProgress.hp = this.playerProgress.hpMax;
      this.playerProgress.mp = CLASS_USES_MANA[this.selectedClass] ? this.playerProgress.mpMax : 0;

      this.gameUi.addChatLine(
        `Subiste a nivel ${this.playerProgress.level}! HP+${levelBonuses.hpBonus}, MP+${levelBonuses.mpBonus}.`
      );
    }

    this.refreshHud();
  }

  private scheduleDummyRespawn(dummy: DummyState) {
    this.time.delayedCall(dummy.respawnMs, () => {
      const spawnTile = dummy.fixedSpawnTile ?? this.pickRandomMobSpawnTile(dummy.spawnConfig);
      dummy.hp = dummy.maxHp;
      dummy.alive = true;
      dummy.isMoving = false;
      dummy.tileX = spawnTile.x;
      dummy.tileY = spawnTile.y;
      dummy.isAggroed = false;
      dummy.immobilizedUntilMs = 0;
      dummy.facing = "down";
      dummy.sprite.clearTint();
      this.setMobAnimationState(dummy, "idle");
      this.syncDummyVisibilityForCurrentMap();

      if (this.currentMapId === dummy.mapId) {
        this.gameUi.addChatLine(`${dummy.name} reaparecio.`);
      }
    });
  }

  private getDummyInAttackRange(): DummyState | null {
    const tile = this.getFrontTileFromFacing(1);
    return (
      this.dummies.find(
        (dummy) =>
          dummy.alive &&
          dummy.mapId === this.currentMapId &&
          this.getDummyOccupiedTiles(dummy).some(
            (occupiedTile) => occupiedTile.x === tile.x && occupiedTile.y === tile.y
          )
      ) ?? null
    );
  }

  private getDummyHitTile(dummy: DummyState): { x: number; y: number } {
    return { x: dummy.tileX, y: dummy.tileY + dummy.hitboxOffsetY };
  }

  private pickRandomMobSpawnTile(spawn: MobSpawnConfig): { x: number; y: number } {
    const map = getMap(spawn.mapId);
    const maxAttempts = Math.max(50, map.width * map.height);

    for (let i = 0; i < maxAttempts; i++) {
      const x = Phaser.Math.Between(0, map.width - 1);
      const y = Phaser.Math.Between(0, map.height - 1);
      if (!this.isTileWalkableInMap(map, x, y)) continue;

      if (spawn.mapId === this.currentMapId && x === this.playerTileX && y === this.playerTileY) {
        continue;
      }

      const occupied = this.dummies.some((dummy) => {
        return dummy.alive && dummy.mapId === spawn.mapId && dummy.tileX === x && dummy.tileY === y;
      });
      if (occupied) continue;

      return { x, y };
    }

    const fallbackX = Math.floor(map.width / 2);
    const fallbackY = Math.floor(map.height / 2);
    return { x: fallbackX, y: fallbackY };
  }

  private isTileWalkableInMap(map: GameMap, tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) {
      return false;
    }
    return getTileDefinition(map.tiles[tileY][tileX]).walkable;
  }

  private getDummyOccupiedTiles(dummy: DummyState): { x: number; y: number }[] {
    const hitTile = this.getDummyHitTile(dummy);
    if (dummy.sizeTiles <= 1) {
      return [{ x: hitTile.x, y: hitTile.y }];
    }

    const occupied: { x: number; y: number }[] = [];
    const startOffset = -(dummy.sizeTiles - 1);
    for (let oy = startOffset; oy <= 0; oy++) {
      for (let ox = startOffset; ox <= 0; ox++) {
        occupied.push({ x: hitTile.x + ox, y: hitTile.y + oy });
      }
    }
    return occupied;
  }

  private playAttackFeedback(tileX: number, tileY: number) {
    const { x, y } = tileToFeetWorld(tileX, tileY, TILE_SIZE);

    const hitFx = this.add
      .rectangle(x, y - 18, 18, 18, 0xffe06b, 0.8)
      .setDepth(20)
      .setAngle(45);
    if (this.uiCamera) {
      this.uiCamera.ignore(hitFx);
    }

    this.tweens.add({
      targets: hitFx,
      alpha: 0,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 120,
      ease: "Linear",
      onComplete: () => hitFx.destroy(),
    });

    this.cameras.main.shake(45, 0.0016, true);
    this.playHitSound();
  }

  private registerMobAnimations() {
    (Object.keys(MOB_MODELS) as MobModelId[]).forEach((modelId) => {
      const model = MOB_MODELS[modelId];
      (["down", "up", "left", "right"] as Facing[]).forEach((facing) => {
        const walkKey = this.mobAnimationKey(modelId, "walk", facing);
        if (!this.anims.exists(walkKey)) {
          const frames = this.mobWalkFrames(modelId, facing).map((frame) => ({
            key: model.textureKey,
            frame,
          }));
          this.anims.create({
            key: walkKey,
            frames,
            frameRate: 9,
            repeat: -1,
          });
        }
      });
    });
  }

  private mobAnimationKey(modelId: MobModelId, state: "walk", facing: Facing): string {
    return `mob_${modelId}_${state}_${facing}`;
  }

  private mobWalkFrames(modelId: MobModelId, facing: Facing): number[] {
    const model = MOB_MODELS[modelId];
    if (model.dirAxis === "columns" && model.dirCols) {
      const col = model.dirCols[facing];
      return Array.from({ length: model.moveFrameCount }, (_unused, row) => {
        return row * model.sheetCols + col;
      });
    }

    const row = model.dirRows?.[facing] ?? 0;
    return Array.from({ length: model.moveFrameCount }, (_unused, frame) => {
      return row * model.sheetCols + frame;
    });
  }

  private setMobAnimationState(dummy: DummyState, state: "idle" | "walk") {
    const idleFrame = this.mobWalkFrames(dummy.modelId, dummy.facing)[0] ?? 0;
    if (state === "walk") {
      const key = this.mobAnimationKey(dummy.modelId, "walk", dummy.facing);
      if (dummy.sprite.anims.currentAnim?.key !== key) {
        dummy.sprite.play(key, true);
      }
      return;
    }

    dummy.sprite.stop();
    dummy.sprite.setFrame(idleFrame);
  }

  private showDamageNumber(
    worldX: number,
    worldY: number,
    damage: number,
    source: "player" | "mob" = "player"
  ) {
    if (source === "player") {
      this.clearActivePlayerDamageNumber();
    }

    const damageValue = Math.max(0, Math.floor(damage));
    const textValue = damageValue > 200 ? `${damageValue}!¡` : `${damageValue}`;
    const damageText = this.add
      .text(worldX, worldY, textValue, {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#ff3333",
        stroke: "#240000",
        strokeThickness: 3,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 1)
      .setDepth(24);

    if (this.uiCamera) {
      this.uiCamera.ignore(damageText);
    }

    const tween = this.tweens.add({
      targets: damageText,
      y: worldY - 20,
      alpha: 0,
      duration: 800,
      ease: "Cubic.Out",
      onComplete: () => {
        if (source === "player") {
          this.activePlayerDamageText = undefined;
          this.activePlayerDamageTween = undefined;
        }
        damageText.destroy();
      },
    });

    if (source === "player") {
      this.activePlayerDamageText = damageText;
      this.activePlayerDamageTween = tween;
    }
  }

  private clearActivePlayerDamageNumber() {
    if (this.activePlayerDamageTween) {
      this.activePlayerDamageTween.stop();
      this.activePlayerDamageTween = undefined;
    }
    if (this.activePlayerDamageText) {
      this.activePlayerDamageText.destroy();
      this.activePlayerDamageText = undefined;
    }
  }

  private registerSpellAnimations() {
    if (!this.anims.exists(IMPLOSION_ANIM_KEY)) {
      this.anims.create({
        key: IMPLOSION_ANIM_KEY,
        frames: IMPLOSION_FRAME_SEQUENCE.map((frame) => ({
          key: IMPLOSION_ANIM_TEXTURE_KEY,
          frame,
        })),
        frameRate: 14,
        repeat: 0,
      });
    }
    if (!this.anims.exists(INMOVILIZAR_ANIM_KEY)) {
      this.anims.create({
        key: INMOVILIZAR_ANIM_KEY,
        frames: INMOVILIZAR_FRAME_SEQUENCE.map((frame) => ({
          key: INMOVILIZAR_ANIM_TEXTURE_KEY,
          frame,
        })),
        frameRate: 12,
        repeat: 0,
      });
    }
    if (!this.anims.exists(HERIDAS_GRAVES_ANIM_KEY)) {
      this.anims.create({
        key: HERIDAS_GRAVES_ANIM_KEY,
        frames: HERIDAS_GRAVES_FRAME_SEQUENCE.map((frame) => ({
          key: HERIDAS_GRAVES_ANIM_TEXTURE_KEY,
          frame,
        })),
        frameRate: 10,
        repeat: 0,
      });
    }
  }

  private registerMeditationAnimation() {
    if (this.anims.exists(MEDITATION_ANIM_KEY)) {
      return;
    }
    this.anims.create({
      key: MEDITATION_ANIM_KEY,
      frames: MEDITATION_FRAME_SEQUENCE.map((frame) => ({
        key: MEDITATION_TEXTURE_KEY,
        frame,
      })),
      frameRate: 8,
      repeat: -1,
    });
  }

  private playImplosionAnimation(tileX: number, tileY: number) {
    const { x, y } = tileToFeetWorld(tileX, tileY, TILE_SIZE);
    const fx = this.add
      .sprite(x, y - 28, IMPLOSION_ANIM_TEXTURE_KEY, IMPLOSION_FRAME_SEQUENCE[0])
      .setDepth(20)
      .setScale(0.9);
    if (this.uiCamera) {
      this.uiCamera.ignore(fx);
    }
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      fx.destroy();
    });
    fx.play(IMPLOSION_ANIM_KEY);
    this.cameras.main.shake(90, 0.0022, true);
    this.playHitSound();
  }

  private playInmovilizarAnimation(tileX: number, tileY: number) {
    const { x, y } = tileToFeetWorld(tileX, tileY, TILE_SIZE);
    const fx = this.add
      .sprite(x, y + INMOVILIZAR_FX_OFFSET_Y, INMOVILIZAR_ANIM_TEXTURE_KEY, INMOVILIZAR_FRAME_SEQUENCE[0])
      .setOrigin(0.5, 1)
      .setDepth(20)
      .setScale(0.85);
    if (this.uiCamera) {
      this.uiCamera.ignore(fx);
    }
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      fx.destroy();
    });
    fx.play(INMOVILIZAR_ANIM_KEY);
  }

  private playHeridasGravesAnimation(tileX: number, tileY: number) {
    const { x, y } = tileToFeetWorld(tileX, tileY, TILE_SIZE);
    const fx = this.add
      .sprite(x, y, HERIDAS_GRAVES_ANIM_TEXTURE_KEY, HERIDAS_GRAVES_FRAME_SEQUENCE[0])
      .setOrigin(0.5, 1)
      .setDepth(20)
      .setScale(1);
    if (this.uiCamera) {
      this.uiCamera.ignore(fx);
    }
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      fx.destroy();
    });
    fx.play(HERIDAS_GRAVES_ANIM_KEY);
  }

  private playHitSound() {
    if (!("context" in this.sound)) {
      return;
    }

    const context = this.sound.context;
    if (!context) return;

    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(170, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.07);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private getFrontTileFromFacing(distance = 1) {
    if (this.facing === "up") {
      return { x: this.playerTileX, y: this.playerTileY - distance };
    }
    if (this.facing === "down") {
      return { x: this.playerTileX, y: this.playerTileY + distance };
    }
    if (this.facing === "left") {
      return { x: this.playerTileX - distance, y: this.playerTileY };
    }
    return { x: this.playerTileX + distance, y: this.playerTileY };
  }

  private toggleCitizenOutfit() {
    this.equippedOutfit = this.equippedOutfit === "base" ? "citizen" : "base";
    const label =
      this.equippedOutfit === "citizen"
        ? "Equipaste Ropa de Ciudadano."
        : "Te quitaste la Ropa de Ciudadano.";

    this.gameUi.addChatLine(label);
    this.playFacingAnim(this.isMoving ? "walk" : "idle");
  }
}