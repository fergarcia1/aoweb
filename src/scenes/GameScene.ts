import Phaser from "phaser";
import { MeditationSystem } from "../systems/MeditationSystem";
import { DeathSystem, type DeathPhase } from "../systems/DeathSystem";
import { ShopBankSystem } from "../systems/ShopBankSystem";
import { MobAiSystem, PEACEFUL_WANDER_MIN_MS, PEACEFUL_WANDER_MAX_MS } from "../systems/MobAiSystem";
import { STEP_DURATION_MS, TILE_SIZE } from "../config";
import {
  findTransition,
  getAllMaps,
  getMap,
  START_MAP_ID,
  type GameMap,
} from "../maps";
import {
  collectLegacyObjGrhFileNums,
  type GrhIndexEntry,
} from "../maps/legacyMapObjects";
import grhIndexJson from "../../public/assets/ao/grh_index.json";
import { getTileDefinition, TILE } from "../maps/tileDefinitions";
import {
  isTileBlockedByMapObject,
  registerMapObjectAssets,
  spawnMapObjectImage,
} from "../maps/mapObjects";
import {
  applyPlayerOrigin,
  feetOffsetForOutfit,
  Facing,
  Outfit,
  playerAnimationKey,
  raceBodyTextureKey,
  registerPlayerAnimations,
  registerArmorSpritesheet,
  registerPlayerSprites,
  setupPlayerTexture,
  stepDurationMsForBodyTexture,
  tileToFeetWorld,
  textureKeyFromAssetPath,
  textureKeyForPlayer,
  getDefaultArmorVisualForOutfit,
  type PlayerArmorVisualOptions,
} from "../player/playerSprites";
import {
  canRaceEquipArmor,
  inferBajosSpritesheetPath,
  isShortRace,
} from "../game/armorUtils";
import {
  createEquippedOverlaySprite,
  type EquippedGearSyncContext,
} from "../game/equippedGear";
import {
  buildHitboxFrameRect,
  containsWorldPointInHitArea,
  getInteractiveHitAreaWorldBounds,
  tileToWorldRect,
  type BodyHitboxConfig,
} from "../game/hitboxUtils";
import {
  faceTextureKey,
  getFaceFrame,
  registerRaceFaces,
  setupRaceFacesTextures,
} from "../player/raceFaces";
import { getRaceFaceLayout } from "../player/raceFaceLayout";
import {
  formatRaceGenderLabel,
  type CharacterGenderId,
  GHOST_RACE_ID,
  type CharacterRaceId,
} from "../data/characters";

import {
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
import { isPhaserObjectLive } from "../ui/phaserObjectUtils";
import {
  registerInventoryPanelAssets,
  setupInventoryPanelTextures,
} from "../ui/inventoryPanel";
import {
  getActiveCharacter,
  getActiveCharacterSlotIndex,
  getPlayerNameColors,
  normalizeFactionId,
  isAdminCharacterName,
  type PlayerRole,
  loadCharacterSlots,
  patchSavedCharacterMeta,
  saveCharacterSlots,
  type CharacterFactionId,
  type SavedCharacter,
} from "../data/characters";
import { DEFAULT_HOME_MAP_ID, getPriestSpawnForHome, PRIEST_REVIVE_MAX_TILE_DISTANCE } from "../game/deathConfig";
import {
  ATTRIBUTE_POTION_GAIN_MAX,
  ATTRIBUTE_POTION_GAIN_MIN,
  BANK_SLOT_COUNT,
  STAT_MIN,
} from "../../game-data/constants";
import {
  applyStatsWithPotionBuffs,
  ATTRIBUTE_POTION_BUFF_DURATION_MS,
  ATTRIBUTE_POTION_BUFF_MAX,
  resolveCoreStats,
  STAT_MAX,
  type CoreStats,
} from "../game/characterStats";
import { getImmobilizePlayerDurationMs } from "../../shared/combat";
import {
  isMapTileWalkable as isSharedMapTileWalkable,
  setDoorTileOverride,
} from "../../shared/mapWalkability";
import { INVISIBILITY_DURATION_MS } from "../../game-data/invisibility";
import { DeathOverlay } from "../ui/deathOverlay";
import { SpellMagicWordsOverlay } from "../ui/spellMagicWordsOverlay";
import { ensureAoFont2TransparentBackground, preloadAoFont2 } from "../ui/aoBitmapFont";
import { getSpellMagicWordsForCast } from "../spells/spellMagicWords";
import { isResurrectSpell, isResurrectSpellId } from "../spells/spellBehaviors";
import {
  RESURRECT_MAX_TILE_DISTANCE,
  RESURRECT_SPELL_ID,
} from "../../game-data/resurrect";
import { BankOverlay } from "../ui/bankOverlay";
import { ShopOverlay } from "../ui/shopOverlay";
import {
  type BankState,
  createEmptyBankState,
  deleteBankState,
  loadBankState,
  saveBankState,
} from "../game/bankStorage";
import {
  INVENTORY_SLOT_COUNT,
  type SavedCharacterProgress,
} from "../game/characterProgressStorage";
import { ProgressService } from "../game/ProgressService";
import { registerNpcAssets } from "../npcs/npcAssets";
import { NpcManager } from "../npcs/NpcManager";
import {
  BANKER_INTERACT_MAX_TILE_DISTANCE,
  getNpcOccupiedTiles,
  MERCHANT_INTERACT_MAX_TILE_DISTANCE,
} from "../npcs/npcDefinitions";
import {
  getBuyPrice,
  getMerchantDisplayTitle,
  getSellPrice,
  getShopCatalogForRole,
  isMerchantRole,
  type MerchantRole,
} from "../data/shopCatalogs";
import type { StaticNpcDefinition } from "../npcs/types";
import {
  GAME_FONT,
  GAME_TEXT_RESOLUTION,
  WORLD_NAME_FONT_SIZE,
  WORLD_NAME_STROKE,
} from "../ui/fonts";
import { WEAPONS } from "../data/items";
import {
  ALL_ITEM_IDS,
  getItemDefinition,
  itemDropsOnDeath,
  ITEM_DEFINITIONS,
  type EquipmentSlot,
  type ItemId,
} from "../items/itemDefinitions";
import { canUseItem } from "../game/itemUsability";
import type { PlayerKillStats } from "../ui/gameUi";
import {
  addToInventory,
  formatStackLabel,
  moveStackAmount,
  type InventorySlot,
} from "../items/inventoryStack";
import {
  SPELL_DEFINITIONS,
  type SpellDefinition,
} from "../data/spells";
import { preloadSpellWavs, playSpellWav } from "../audio/spellWav";
import {
  ALL_FX_SHEETS,
  getSpellEffectConfig,
  getSpellEffectFirstFrame,
  getSpellWav,
  SPAWN_FX_CONFIG,
  SPAWN_FX_ID,
  spellEffectAnimKey,
  SPELL_EFFECTS,
} from "../spells/spellEffects";
import type {
  GameEvent,
  NetMobState,
  NetPlayerEquipment,
  NetPlayerState,
  NetWorldItemState,
  WorldSnapshot,
} from "../../shared/types";
import { isMultiplayerEnabled } from "../network/multiplayerConfig";
import type { MultiplayerBridge } from "../network/MultiplayerBridge";
import { getMobFootprintTiles } from "../../shared/mobFootprint";
import {
  buildAllInitialMobPlacements,
  pickRandomMobSpawnTile as pickSharedMobSpawnTile,
  TRAINING_DUMMY_HP,
  TRAINING_DUMMY_ID,
} from "../../shared/mobSpawns";
import {
  MOB_MODELS,
  MOB_SPAWNS,
  type MobBehavior,
  type MobDropConfig,
  type MobModelId,
  type MobSpawnConfig,
} from "../data/mobs";
import { MOB_DEFAULT_MOVE_SPEED_RATIO, MOB_VISUAL_CONFIGS } from "../game/mobs/mobVisualConfig";
import {
  createMobFaceSpriteIfNeeded,
  createMobSprite,
  loadMobVisualAssets,
  mobHasFaceOverlay,
  playMobIdleFrame,
  playMobWalkAnimation,
  registerMobWalkAnimations,
  syncMobFaceSprite,
} from "../game/mobs/mobVisualRuntime";
import { loadAllImperiumNpcVisualAssets } from "../game/npcs/loadImperiumNpcVisualAssets";
import {
  playImperiumNpcIdleFrame,
  playImperiumNpcWalkAnim,
  registerImperiumNpcWalkAnims,
} from "../game/npcs/imperiumNpcRuntime";
import { IMPERIUM_NPC_CATALOG } from "../npcs/imperiumNpcCatalog";
import { getImperiumNpcSpriteConfigFromCatalog } from "../game/npcs/imperiumNpcVisual";
import {
  WorldItemManager,
  GameSceneChatCommands,
  GameSceneMultiplayerController,
  GameSceneMobController,
  GameSceneMapController,
  GameSceneEntitySync,
  GameSceneLocalPlayerVisuals,
  processGameSceneFrameInput,
  runGameScenePreload,
  refreshGameSceneHud,
  refreshGameSceneMinimap,
  refreshGameSceneMapLocation,
  createGameScenePlayer,
  GameSceneInventoryController,
  GameSceneCombatController,
  GameSceneLocalPlayerSync,
  GameSceneConsumableController,
  applySavedProgressToSceneState,
  resetDeathStateForCharacterSwitch as freshDeathStateForSwitch,
  applyMobHitboxOverrideToDummy,
  clearMobHitboxOverrides,
  getMobHitboxOverrides,
  saveMobHitboxOverridesFromDummies,
  formatCharacterInspectLine,
  formatImmobilizeDuration,
  formatImmobilizeRemaining,
  formatInspectLineWithDebuffs,
  getDummyActiveDebuffsForInspect,
  expRequiredForLevel,
  getBaseVitalsFromStats,
  getLevelUpBonusesFromStats,
  macroSpellTextureKey,
  CLASS_USES_MANA,
  DEFAULT_MACRO_ACTION,
  DEFAULT_MOB_HITBOX_HEIGHT_TILES,
  DEFAULT_MOB_HITBOX_OFFSET_Y,
  DEFAULT_MOB_HITBOX_WIDTH_TILES,
  DEFAULT_PLAYER_NAME,
  HUD_AGILITY_POTION_TEXTURE_KEY,
  HUD_STRENGTH_POTION_TEXTURE_KEY,
  MEDITATION_ANIM_KEY,
  MEDITATION_FRAME_HEIGHT,
  MEDITATION_FRAME_SEQUENCE,
  MEDITATION_FRAME_WIDTH,
  MEDITATION_TEXTURE_KEY,
  MOB_HITBOX_HEIGHT_RATIO,
  PLAYER_HITBOX_HEIGHT_PX,
  PLAYER_HITBOX_OFFSET_X,
  PLAYER_HITBOX_OFFSET_Y,
  PLAYER_HITBOX_PROFILE_WIDTH_PX,
  PLAYER_HITBOX_WIDTH_PX,
  TEST_HEALTH_POTION_STACK,
  TEST_MANA_POTION_STACK,
  TEST_PLAYER_LEVEL,
  TEST_START_GOLD,
  TEST_START_HP,
  TEST_START_HP_MAX,
  TEST_START_MP,
  TEST_START_MP_MAX,
  TREE_TEXTURE_KEY,
  TREE_TEXTURE_PATH,
  TRAINING_DUMMY_NAME,
  WORLD_DEPTH_BASE,
  WORLD_DEPTH_SCALE,
  type ClassId,
  type DummyState,
  type GameSceneInitData,
  type MacroBinding,
  type MoveDirection,
  type PlayerProgressState,
  type RaceId,
  type SpellCastRequest,
  type WorldItemEntry,
} from "./gameSceneModules/index";

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private playerFace!: Phaser.GameObjects.Sprite;
  private playerNameLabel!: Phaser.GameObjects.Text;
  private spellMagicWordsOverlay?: SpellMagicWordsOverlay;
  private equippedWeaponSprite?: Phaser.GameObjects.Sprite;
  private equippedShieldSprite?: Phaser.GameObjects.Sprite;
  private equippedHelmetSprite?: Phaser.GameObjects.Sprite;

  private gameUi!: GameUi;
  private mapController!: GameSceneMapController;
  private entitySync!: GameSceneEntitySync;
  private localPlayerVisuals!: GameSceneLocalPlayerVisuals;
  private inventoryController!: GameSceneInventoryController;
  private combatController!: GameSceneCombatController;

  private currentMap!: GameMap;
  private currentMapId = START_MAP_ID;
  /** Puertas abiertas/cerradas (solo mapa actual; no muta el GameMap importado). */
  private readonly mapTileOverrides = new Map<string, number>();

  private playerTileX = 4;
  private playerTileY = 4;

  private isMoving = false;
  /** Evita encolar varios pasos en MP antes de la confirmación del servidor. */
  private desiredFacing: Facing | null = null;
  private isChangingMap = false;
  private facing: Facing = "down";

  private pickupKey!: Phaser.Input.Keyboard.Key;
  private cancelSpellTargetingKey!: Phaser.Input.Keyboard.Key;
  private meditateKey!: Phaser.Input.Keyboard.Key;
  private worldMapToggleKey!: Phaser.Input.Keyboard.Key;
  private inventory: InventorySlot[] = Array(INVENTORY_SLOT_COUNT).fill(null);

  private worldItemManager!: WorldItemManager;
  private chatCommands!: GameSceneChatCommands;
  private mpController!: GameSceneMultiplayerController;
  private mobController!: GameSceneMobController;
  private localPlayerSync!: GameSceneLocalPlayerSync;
  private consumableController!: GameSceneConsumableController;
  private serverReviveSyncPending = false;

  /**
   * Cara elegida.
   * Por ahora usamos la primera. Más adelante esto puede venir
   * desde la pantalla de creación de personaje.
   */
  /** Columna del spritesheet {raza}_{genero}_faces (0 = cara 1 / c1). */
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
  private equippedOutfit: Outfit = "base";
  private equippedArmorVisual?: PlayerArmorVisualOptions;
  private playerName = DEFAULT_PLAYER_NAME;
  private playerRole: PlayerRole = "player";
  private selectedRace: RaceId = "human";
  private selectedGender: CharacterGenderId = "male";
  private selectedBodyTextureKey = raceBodyTextureKey("human", "male");
  private selectedClass: ClassId = "paladin";
  private attributeBuffs = { strength: 0, agility: 0 };
  /** Expira el bono de pociones verde/amarilla (timer compartido). 0 = sin efecto activo. */
  private attributeBuffExpiresAt = 0;
  private selectedFaction: CharacterFactionId = "ciudadano";
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

  private killStats: PlayerKillStats = {
    creaturesKilled: 0,
    criminalsKilled: 0,
    usersKilled: 0,
  };
  /** Evita FX duplicado si el servidor reenvía spell_fx tras un cast local. */
  private suppressServerSpellFxUntil = 0;
  /** FX de canalización de Resucitar por id de lanzador. */
  private readonly resurrectChannelFxByCasterId = new Map<string, Phaser.GameObjects.Sprite>();
  private inspectedDummyId: string | null = null;
  private playerImmobilizedUntilMs = 0;
  private playerInvisibleUntilMs = 0;
  private wasPlayerImmobilizedLastFrame = false;
  private nextImmobilizedMoveFeedbackAt = 0;
  private meditationSystem!: MeditationSystem;
  private mobAiSystem!: MobAiSystem;
  private hitboxDebugEnabled = false;
  private hitboxDebugGraphics?: Phaser.GameObjects.Graphics;
  /** Evita spamear revive al servidor mientras se resuelve desync de HP. */
  private deathSystem!: DeathSystem;
  private _homeMapIdBackup = DEFAULT_HOME_MAP_ID;
  private _bankStateBackup: BankState = { slots: Array(20).fill(null), gold: 0 };
  private characterSlotIndex: number | null = null;
  private deathOverlay?: DeathOverlay;
  private bankOverlay?: BankOverlay;
  private shopOverlay?: ShopOverlay;
  private shopBankSystem!: ShopBankSystem;
  private characterId = "demo-lonler";
  private npcManager?: NpcManager;
  private macroBindings: MacroBinding[] = Array.from({ length: 10 }, () => ({
    keyCode: null,
    action: DEFAULT_MACRO_ACTION,
    itemId: null,
    spellId: null,
  }));
  private hasLoadedCharacterProgress = false;
  private progressService: ProgressService | null = null;

  constructor() {
    super("GameScene");
  }

  private get dummies(): DummyState[] {
    return this.mobController.getDummies();
  }

  private get multiplayer(): MultiplayerBridge | null {
    return this.mpController?.getBridge() ?? null;
  }

  private get uiCamera(): Phaser.Cameras.Scene2D.Camera | undefined {
    return this.mapController?.getUiCamera();
  }

  private get mapTiles(): Phaser.GameObjects.Container {
    return this.mapController.mapTiles;
  }

  private get mapOverlay(): Phaser.GameObjects.Graphics {
    return this.mapController.mapOverlay;
  }

  /** init() puede llamar applyActiveCharacter antes de create(). */
  private ensureProgressService(): ProgressService {
    if (!this.progressService) {
      this.progressService = new ProgressService(this);
    }
    return this.progressService;
  }

  private initMapController(): void {
    this.mapController = new GameSceneMapController({
      scene: this,
      getGameUi: () => this.gameUi,
      getPlayer: () => this.player,
      getPlayerFace: () => this.playerFace,
      getPlayerNameLabel: () => this.playerNameLabel,
      getEquippedSprites: () =>
        [
          this.equippedWeaponSprite,
          this.equippedShieldSprite,
          this.equippedHelmetSprite,
        ].filter((s): s is Phaser.GameObjects.Sprite => s != null),
      getWorldItemSprites: () => this.worldItemManager?.getSprites() ?? [],
      getDummyRenderObjects: () =>
        this.dummies.flatMap((dummy) =>
          dummy.face
            ? [dummy.sprite, dummy.face, dummy.hpLabel]
            : [dummy.sprite, dummy.hpLabel]
        ),
      depthFromFeetY: (feetY) => this.depthFromFeetY(feetY),
      getCurrentMap: () => this.currentMap,
      getCurrentMapId: () => this.currentMapId,
      getPlayerTile: () => ({ x: this.playerTileX, y: this.playerTileY }),
      refreshMinimap: () => this.refreshMinimap(),
      onViewportLayout: () => {
        if (this.deathPhase !== "alive") {
          this.deathOverlay?.layout(this.mapController.getGameViewportRect());
        }
        this.shopBankSystem?.layoutOnResize(this.mapController.getGameViewportRect());
      },
      setDoorTileOverride: (tileX, tileY, isOpen) => {
        setDoorTileOverride(this.mapTileOverrides, tileX, tileY, isOpen);
      },
      isMapTileWalkable: (tileX, tileY) => this.isMapTileWalkable(tileX, tileY),
    });
  }

  /** Crea entitySync/localPlayerVisuals si el jugador ya existe (p. ej. resume antes de create). */
  private ensureEntitySyncReady(): void {
    if (!this.player) {
      return;
    }
    if (!this.entitySync) {
      this.initEntitySync();
    }
    if (!this.localPlayerVisuals) {
      this.initLocalPlayerVisuals();
    }
  }

  private initEntitySync(): void {
    this.entitySync = new GameSceneEntitySync({
      getPlayer: () => this.player,
      getPlayerFace: () => this.playerFace,
      getPlayerNameLabel: () => this.playerNameLabel,
      getPlayerTileX: () => this.playerTileX,
      getPlayerTileY: () => this.playerTileY,
      getFacing: () => this.facing,
      getIsMoving: () => this.isMoving,
      getActiveFaceLayout: () => this.getActiveFaceLayout(),
      getEquippedGearContext: () => this.getEquippedGearContext(),
      getDummies: () => this.dummies,
      getCurrentMapId: () => this.currentMapId,
      depthFromFeetY: (feetY) => this.depthFromFeetY(feetY),
      getMapController: () => this.mapController,
      isWorldSceneLive: () => this.isWorldSceneLive(),
      syncSpellMagicWordsOverlayPosition: () => this.spellMagicWordsOverlay?.syncPosition(),
    });
  }

  private initLocalPlayerVisuals(): void {
    this.localPlayerVisuals = new GameSceneLocalPlayerVisuals({
      getPlayer: () => this.player,
      getDeathPhase: () => this.deathPhase,
      getUseGhostAppearance: () => this.useGhostAppearance,
      getInvisibleUntilMs: () => this.playerInvisibleUntilMs,
      setInvisibleUntilMs: (ms) => {
        this.playerInvisibleUntilMs = ms;
      },
      getVisualParts: () => this.getLocalPlayerVisualParts(),
    });
  }

  private initInventoryController(): void {
    this.inventoryController = new GameSceneInventoryController({
      getGameUi: () => this.gameUi,
      getInventory: () => this.inventory,
      getEquipment: () => this.equipment,
      getPlayerProgress: () => this.playerProgress,
      getSelectedClass: () => this.selectedClass,
      getSelectedRace: () => this.selectedRace,
      getPlayerTile: () => ({ x: this.playerTileX, y: this.playerTileY }),
      getWorldItemManager: () => this.worldItemManager,
      isMultiplayerActive: () => this.isMultiplayerActive(),
      isPlayerAdmin: () => this.isPlayerAdmin(),
      sendEquipToServer: (action, payload) => {
        if (action === "equip" && "inventorySlot" in payload) {
          this.multiplayer!.sendEquipItem("equip", payload);
        } else if (action === "unequip" && "equipSlot" in payload) {
          this.multiplayer!.sendEquipItem("unequip", payload);
        }
      },
      syncServerInventory: () => this.syncServerInventoryIfMultiplayer(),
      sendDropItemToServer: (slot, amount) =>
        this.mpController?.sendDropItem(slot, amount),
      sendDropGoldToServer: (amount) => this.mpController?.sendDropGold(amount),
      sendPickupWorldItemToServer: () => this.mpController?.sendPickupWorldItem(),
      createWorldItem: (itemId, tx, ty, count) =>
        this.createWorldItem(itemId, tx, ty, count),
      createWorldGold: (tx, ty, count) => this.createWorldGold(tx, ty, count),
      addChatLine: (text) => this.gameUi.addChatLine(text),
      refreshHud: () => this.refreshHud(),
      refreshInventoryUi: () => this.refreshInventoryUi(),
      scheduleSave: () => this.scheduleCharacterProgressSave(),
      useConsumableFromSlot: (slotIndex) => this.useConsumableFromSlot(slotIndex),
      syncEquippedArmorOutfit: () => this.syncEquippedArmorOutfit(),
      syncEquippedHeldItemVisuals: () => this.syncEquippedHeldItemVisuals(),
      getCombatSnapshot: () => this.combatController.getCombatSnapshot(),
    });
  }

  private initCombatController(): void {
    this.combatController = new GameSceneCombatController({
      scene: this,
      input: this.input,
      time: this.time,
      tweens: this.tweens,
      getUiCamera: () => this.uiCamera,
      getGameUi: () => this.gameUi,
      getPlayerProgress: () => this.playerProgress,
      getEquipment: () => this.equipment,
      getCoreStats: () => this.getCoreStats(),
      getFacing: () => this.facing,
      getPlayerTile: () => ({ x: this.playerTileX, y: this.playerTileY }),
      getCurrentMapId: () => this.currentMapId,
      hasLearnedSpell: (spellId) => this.learnedSpellIds.has(spellId),
      hasAnilloEspectralInInventory: () => this.hasAnilloEspectralInInventory(),
      isPlayerDeadOrGhost: () => this.isPlayerDeadOrGhost(),
      isMultiplayerActive: () => this.isMultiplayerActive(),
      isPlayerAdmin: () => this.isPlayerAdmin(),
      stopMeditation: () => this.stopMeditation(),
      refreshHud: () => this.refreshHud(),

      onPlayerHpDepleted: () => {
        if (this.deathPhase === "alive") {
          this.handlePlayerDeath();
        }
      },
      sendAttackToServer: (facing) => this.multiplayer!.sendAttack(facing),
      sendCastSpellToServer: (spellId, tileX, tileY, targetPlayerId) =>
        this.multiplayer!.sendCastSpell(spellId, tileX, tileY, targetPlayerId),
      getDummyInAttackRange: () => this.getDummyInAttackRange(),
      getDummyHitTile: (dummy) => this.getDummyHitTile(dummy),
      killDummy: (dummy) => this.killDummy(dummy),
      refreshInspectedDummyLabel: () => this.refreshInspectedDummyLabel(),
      getInspectedDummyId: () => this.inspectedDummyId,
      playSpellEffect: (spellId, tx, ty) => this.playSpellEffect(spellId, tx, ty),
      startResurrectChannelEffect: (casterId, tileX, tileY, endsAtMs) =>
        this.startResurrectChannelEffect(casterId, tileX, tileY, endsAtMs),
      getLocalPlayerId: () => this.mpController.getPlayerId(),
      setSuppressServerSpellFxUntil: (until) => {
        this.suppressServerSpellFxUntil = until;
      },
      showSpellMagicWords: (spellId, spellNombre) => {
        const words = getSpellMagicWordsForCast(spellId, spellNombre);
        if (words) {
          this.spellMagicWordsOverlay?.show(words);
        }
        this.playSpellCastSound(spellId);
      },
      clearSpellMagicWords: () => {
        this.spellMagicWordsOverlay?.clear();
      },
      onMeleeImpact: () => {
        this.cameras.main.shake(45, 0.0016, true);
        this.playSyntheticHitSound();
      },
      applySpellAttributeBuff: (stat, amount) => {
        this.attributeBuffs[stat] = Math.min(
          ATTRIBUTE_POTION_BUFF_MAX,
          this.attributeBuffs[stat] + amount
        );
        this.resetAttributePotionTimer();
      },
      clearAllSpellEffects: () => {
        this.clearAttributePotionBuffs(false);
        this.playerImmobilizedUntilMs = 0;
        this.playerInvisibleUntilMs = 0;
        this.nextImmobilizedMoveFeedbackAt = 0;
        this.resetLocalPlayerVisualAlpha();
      },
      applyLocalInvisibility: (durationMs: number) => {
        this.playerInvisibleUntilMs = Math.max(
          this.playerInvisibleUntilMs,
          Date.now() + durationMs
        );
      },
      isLocalPlayerImmobilized: (now) => this.isPlayerImmobilized(now),
      clearLocalPlayerImmobilize: () => {
        this.playerImmobilizedUntilMs = 0;
        this.nextImmobilizedMoveFeedbackAt = 0;
      },
      findDummyAtTile: (tileX, tileY) => this.findDummyAtTile(tileX, tileY),
      findDeadAllyPlayerIdAtTile: (tileX, tileY) => {
        const ghost = this.multiplayer
          ?.getRemotePlayers()
          ?.findRemoteGhostAtTile(tileX, tileY);
        return ghost?.id;
      },
      isServerConnected: () => Boolean(this.multiplayer?.isConnected()),
    });
  }

  private initWorldItemManager(): void {
    this.worldItemManager = new WorldItemManager({
      scene: this,
      uiCamera: this.uiCamera!,
      getCurrentMap: () => this.currentMap,
      getCurrentMapId: () => this.currentMapId,
      depthFromFeetY: (feetY) => this.depthFromFeetY(feetY),
      isMapTileWalkable: (tileX, tileY) => this.isMapTileWalkable(tileX, tileY),
      isServerAuthoritative: () => this.isMultiplayerActive(),
      onPersist: () => this.scheduleCharacterProgressSave(),
      onInspect: (entry) => this.inspectWorldItem(entry),
    });
  }

  private initLocalPlayerSync(): void {
    this.localPlayerSync = new GameSceneLocalPlayerSync({
      getDeathPhase: () => this.deathPhase,
      getPlayerProgress: () => this.playerProgress,
      setPlayerProgressFromServer: (patch) => {
        this.playerProgress.hp = patch.hp;
        this.playerProgress.hpMax = patch.hpMax;
        this.playerProgress.mp = patch.mp;
        this.playerProgress.mpMax = patch.mpMax;
        this.playerProgress.level = patch.level;
      },
      setPlayerHp: (hp) => {
        this.playerProgress.hp = hp;
      },
      getEquipment: () => this.equipment,
      setEquipmentFromServer: (equipment) => {
        if (!equipment) return;
        this.equipment.weapon = (equipment.weaponId as ItemId | null) ?? null;
        this.equipment.shield = (equipment.shieldId as ItemId | null) ?? null;
        this.equipment.helmet = (equipment.helmetId as ItemId | null) ?? null;
        this.equipment.armor = (equipment.armorId as ItemId | null) ?? null;
      },
      getInventory: () => this.inventory,
      setInventoryFromServer: (slots) => {
        this.inventory = slots;
      },
      setGoldFromServer: (gold) => {
        this.playerProgress.gold = gold;
      },
      refreshHud: () => this.refreshHud(),
      refreshInventoryUi: () => this.refreshInventoryUi(),
      syncEquippedArmorOutfit: () => this.syncEquippedArmorOutfit(),
      syncEquippedHeldItemVisuals: () => this.syncEquippedHeldItemVisuals(),
      setEquippedItemIdsOnUi: (ids) => this.gameUi.setEquippedItemIds(ids),
      isMultiplayerActive: () => this.isMultiplayerActive(),
      getCurrentMapId: () => this.currentMapId,
      getWorldItemManager: () => this.worldItemManager,
      requestServerRevive: (source, tileX, tileY, mapId) =>
        this.mpController.sendRevive(source, tileX, tileY, mapId),
      getPlayerTile: () => ({ x: this.playerTileX, y: this.playerTileY }),
      onLocalPlayerDeath: () => this.handlePlayerDeath(),
      addCombatLine: (text) => this.gameUi.addCombatLine(text),
      setRemotePlayerGhost: (playerId) =>
        this.multiplayer?.getRemotePlayers()?.setPlayerGhost(playerId),
      updateRemotePlayer: (state, mapId) =>
        this.multiplayer?.updateRemote(state, mapId),
      getLocalPlayerId: () => this.mpController.getPlayerId(),
      clearServerReviveSyncPending: () => {
        this.serverReviveSyncPending = false;
      },
      isServerReviveSyncPending: () => this.serverReviveSyncPending,
      setServerReviveSyncPending: (value) => {
        this.serverReviveSyncPending = value;
      },
      setPlayerExpFromServer: (exp, expToNext) => {
        this.playerProgress.exp = exp;
        if (typeof expToNext === "number") {
          this.playerProgress.expToNext = expToNext;
        }
      },
      setLearnedSpellIdsFromServer: (spellIds) => {
        this.learnedSpellIds.clear();
        for (const id of spellIds) {
          if (Number.isFinite(id) && id > 0) {
            this.learnedSpellIds.add(Math.floor(id));
          }
        }
      },
      setBankStateFromServer: (bankGold, bankInventory) => {
        const state = this.shopBankSystem.getBankState();
        if (typeof bankGold === "number" && Number.isFinite(bankGold)) {
          state.gold = Math.max(0, Math.floor(bankGold));
        }
        if (Array.isArray(bankInventory)) {
          const slots = state.slots;
          for (let i = 0; i < BANK_SLOT_COUNT; i += 1) {
            slots[i] = null;
          }
          for (const slot of bankInventory) {
            const idx =
              typeof slot.slotIndex === "number" ? Math.floor(slot.slotIndex) : -1;
            if (idx < 0 || idx >= BANK_SLOT_COUNT) continue;
            const amount =
              typeof slot.amount === "number" ? Math.max(0, Math.floor(slot.amount)) : 0;
            const itemId =
              typeof slot.itemId === "string" && slot.itemId.trim()
                ? (slot.itemId.trim() as ItemId)
                : null;
            if (amount > 0 && itemId) {
              slots[idx] = { itemId, count: amount };
            }
          }
        }
        this.shopBankSystem.setBankState(state);
        saveBankState(this.characterId, state);
      },
      refreshKnownSpellsUi: () => this.refreshKnownSpellsUi(),
    });
  }

  private initConsumableController(): void {
    this.consumableController = new GameSceneConsumableController({
      getSelectedClass: () => this.selectedClass,
      getSelectedRace: () => this.selectedRace,
      getPlayerProgress: () => this.playerProgress,
      getInventory: () => this.inventory,
      getAttributeBuffs: () => this.attributeBuffs,
      setAttributeBuffs: (buffs) => {
        this.attributeBuffs = buffs;
      },
      getAttributeBuffExpiresAt: () => this.attributeBuffExpiresAt,
      setAttributeBuffExpiresAt: (ms) => {
        this.attributeBuffExpiresAt = ms;
      },
      hasLearnedSpell: (id) => this.learnedSpellIds.has(id),
      learnSpell: (id) => this.learnedSpellIds.add(id),
      addChatLine: (text) => this.gameUi.addChatLine(text),
      refreshHud: () => this.refreshHud(),
      refreshKnownSpellsUi: () => this.refreshKnownSpellsUi(),
      getCoreStats: () => this.getCoreStats(),
      clearInventorySlotUi: (slotIndex) => this.gameUi.clearInventorySlot(slotIndex),
      setInventorySlotUi: (slotIndex, textureKey, count, itemId) =>
        this.gameUi.setInventorySlot(slotIndex, textureKey, count, itemId),
      isMultiplayerActive: () => this.isMultiplayerActive(),
      isPlayerAdmin: () => this.isPlayerAdmin(),
      isMultiplayerConnected: () => Boolean(this.multiplayer?.isConnected()),
      isSpawnSynced: () => Boolean(this.multiplayer?.getSpawnSynced()),
      sendUseItemToServer: (itemId, slotIndex) =>
        this.multiplayer!.sendUseItem(itemId, slotIndex),
      persistProgress: () => this.persistCharacterProgress(),
      cancelScheduledPersist: () => this.progressService?.cancelScheduledPersist(),
      resetAttributeBuffTimer: () => this.resetAttributePotionTimer(),
      getTimeNow: () => this.time.now,
    });
  }

  private initChatCommands(): void {
    this.chatCommands = new GameSceneChatCommands({
      gameUi: this.gameUi,
      addChatLine: (text) => this.gameUi.addChatLine(text),
      isMultiplayerConnected: () => Boolean(this.multiplayer?.isConnected()),
      sendChat: (message) => this.multiplayer!.sendChat(message),
      meditationToggle: () => this.meditationSystem.toggle("command"),
      goToHomePriest: () => this.goToHomePriestViaCommand(),
      markHomeCity: () => this.markHomeCity(),
      isAlive: () => this.deathPhase === "alive",
      killPlayer: () => {
        if (this.isMultiplayerActive()) {
          if (!this.multiplayer?.isConnected()) {
            this.gameUi.addChatLine("Sin conexión: no se pudo reportar la muerte al servidor.");
            return;
          }
          this.multiplayer.sendSuicide();
          this.gameUi.addChatLine("Muriendo... (esperá confirmación del servidor)");
          return;
        }
        this.playerProgress.hp = 0;
        this.handlePlayerDeath();
      },
      resetProgress: () => this.resetCurrentCharacterProgress(),
      handleHitboxCommand: (normalized) => this.handleHitboxCommand(normalized),
      handleMobEditCommand: (normalized) => this.handleMobEditCommand(normalized),
      handleUiCommand: (normalized) => this.chatCommands.handleUiCommand(normalized),
      handleGiveCommand: (raw) => this.chatCommands.handleGiveCommand(raw),
      addGold: (amount) => {
        this.playerProgress.gold += amount;
      },
      refreshHud: () => this.refreshHud(),
      scheduleSave: () => this.scheduleCharacterProgressSave(),
      tryAdminCommand: (message) => this.tryAdminCommand(message),
      isPlayerAdmin: () => this.isPlayerAdmin(),
      getPlayerName: () => this.playerName,
      getInventory: () => this.inventory,
      refreshInventoryUi: () => this.refreshInventoryUi(),
    });
  }

  private initMobController(): void {
    this.mobController = new GameSceneMobController({
      scene: this,
      getUiCamera: () => this.uiCamera,
      time: this.time,
      tweens: this.tweens,
      getCurrentMapId: () => this.currentMapId,
      getPlayerTile: () => ({ x: this.playerTileX, y: this.playerTileY }),
      getInspectedDummyId: () => this.inspectedDummyId,
      setInspectedDummyId: (id) => {
        this.inspectedDummyId = id;
      },
      isMultiplayerActive: () => this.isMultiplayerActive(),
      isHitboxDebugEnabled: () => this.hitboxDebugEnabled,
      setHitboxDebugEnabled: (enabled) => this.setHitboxDebugEnabled(enabled),
      addChatLine: (text) => this.gameUi.addChatLine(text),
      refreshInspectedDummyLabel: () => this.refreshInspectedDummyLabel(),
      killDummy: (dummy) => this.killDummy(dummy),
      applyMobDeathFromServer: (dummy) => this.applyMobDeathFromServer(dummy),
      applyMobReviveFromServer: (dummy, netMob) =>
        this.applyMobReviveFromServer(dummy, netMob),
      restoreLocalMobsAfterDisconnect: () => {
        this.mobController.destroyAll();
      },
      getMobFeetWorld: (modelId, tileX, tileY) =>
        this.getMobFeetWorld(modelId, tileX, tileY),
      getMobStepDurationMs: (modelId) => this.getMobStepDurationMs(modelId),
      depthFromFeetY: (feetY) => this.depthFromFeetY(feetY),
      setupMobHitboxInteraction: (sprite, h, w, oy) =>
        this.setupMobHitboxInteraction(sprite, h, w, oy),
      syncDummyWorldPosition: (dummy) => this.syncDummyWorldPosition(dummy),
      attachMobFaceIfNeeded: (dummy, facing) =>
        this.attachMobFaceIfNeeded(dummy, facing),
      setMobAnimationState: (dummy, state) => this.setMobAnimationState(dummy, state),
      syncMobFaceForDummy: (dummy) => this.syncMobFaceForDummy(dummy),
      rebuildMobHitbox: (dummy) => this.mobController.rebuildHitbox(dummy),
      startDummyStep: (dummy, tx, ty, facing) =>
        this.startDummyStep(dummy, tx, ty, facing),
      isTileWalkableForMob: (tx, ty, source) =>
        this.isTileWalkableForMob(tx, ty, source),
      isTileOccupiedByStaticNpc: (tx, ty, mapId) =>
        this.isTileOccupiedByStaticNpc(tx, ty, mapId),
      pickRandomMobSpawnTile: (spawn) => this.pickRandomMobSpawnTile(spawn),
    });
  }

  private initMpController(): void {
    this.mpController = new GameSceneMultiplayerController({
      scene: this,
      uiCamera: this.uiCamera!,
      depthFromFeetY: (feetY) => this.depthFromFeetY(feetY),
      getCurrentMapId: () => this.currentMapId,
      getPlayerName: () => this.playerName,
      getCharacterId: () => this.characterId,
      getPlayerTile: () => ({ x: this.playerTileX, y: this.playerTileY }),
      setPlayerTile: (tileX, tileY) => {
        this.playerTileX = tileX;
        this.playerTileY = tileY;
      },
      getFacing: () => this.facing,
      setFacing: (facing) => {
        this.facing = facing;
      },
      isMoving: () => this.isMoving,
      setIsMoving: (moving) => {
        this.isMoving = moving;
      },
      getSelectedRace: () => this.selectedRace,
      getSelectedGender: () => this.selectedGender,
      getSelectedClass: () => this.selectedClass,
      getSelectedFaction: () => this.selectedFaction,
      getSelectedFaceIndex: () => this.selectedFaceIndex,
      getPlayerProgress: () => this.playerProgress,
      getEquipment: () => this.equipment,
      getEquippedOutfit: () => this.equippedOutfit,
      getInventory: () => this.inventory,
      setMultiplayerStatus: (message) => this.setMultiplayerStatus(message),
      addChatLine: (text) => this.gameUi?.addChatLine(text),
      addCombatLine: (text) => this.gameUi?.addCombatLine(text),
      syncLocalVitalsFromServer: (state) => this.localPlayerSync.syncLocalVitalsFromServer(state),
      syncLocalEquipmentFromServer: (state) =>
        this.localPlayerSync.syncLocalEquipmentFromServer(state),
      syncLocalInventoryFromServer: (slots) =>
        this.localPlayerSync.syncLocalInventoryFromServer(slots),
      syncLocalGoldFromServer: (gold) => this.localPlayerSync.syncLocalGoldFromServer(gold),
      syncLocalWelcomeExtras: (welcome) =>
        this.localPlayerSync.syncLocalWelcomeExtras(welcome),
      getBankState: () => this.shopBankSystem.getBankState(),
      getLearnedSpellIds: () => [...this.learnedSpellIds],
      syncWorldItemsFromServer: (items) => this.localPlayerSync.syncWorldItemsFromServer(items),
      applyWorldItemSpawned: (mapId, item) =>
        this.localPlayerSync.applyWorldItemSpawned(mapId, item),
      applyWorldItemUpdated: (mapId, item) =>
        this.localPlayerSync.applyWorldItemUpdated(mapId, item),
      applyWorldItemRemoved: (mapId, worldItemId) =>
        this.localPlayerSync.applyWorldItemRemoved(mapId, worldItemId),
      syncMobsFromServer: (mobs) => this.mobController.syncFromServer(mobs),
      applyNetMobState: (mob) => this.mobController.applyNetState(mob),
      applyNetMobLeft: (mobId) => this.mobController.applyNetLeft(mobId),
      handleServerPlayerDied: (playerId, killerName) =>
        this.localPlayerSync.handleServerPlayerDied(playerId, killerName),
      handleServerUseItemAck: (ack) => this.consumableController.handleServerUseItemAck(ack),
      handleServerPlayerUpdated: (state) => this.localPlayerSync.handleServerPlayerUpdated(state),
      applyServerPlayerRole: (role) => {
        this.playerRole = this.resolvePlayerRole(role);
        this.syncPlayerNameLabelStyle();
        this.refreshKnownSpellsUi();
      },
      isAdminCharacterName,
      snapLocalPlayerToTile: (state) => this.mpController.snapLocalPlayerToTile(state),
      playFacingAnim: (state) => this.playFacingAnim(state),
      isTileWalkable: (tx, ty) => this.isTileWalkable(tx, ty),
      isTileOccupiedByRemotePlayer: (tx, ty) =>
        this.isTileOccupiedByRemotePlayer(tx, ty),
      getLocalPlayerStepDurationMs: () => this.getLocalPlayerStepDurationMs(),
      getPlayerFeetWorldForTile: (tx, ty) => this.getPlayerFeetWorldForTile(tx, ty),
      killAllLocalMobs: () => this.mobController.destroyAll(),
      restoreLocalMobsAfterDisconnect: () => {
        this.mobController.destroyAll();
      },
      applyIncomingDamage: (amount, type) =>
        this.combatController.applyIncomingDamage(amount, type),
      showDamageNumber: (x, y, amount, source) =>
        this.combatController.showDamageNumber(x, y, amount, source),
      playSpellEffect: (spellId, tx, ty) => this.playSpellEffect(spellId, tx, ty),
      playSpawnEffectAtTile: (tileX, tileY) => this.playSpawnEffectAtTile(tileX, tileY),
      startResurrectChannelEffect: (casterId, tileX, tileY, endsAtMs) =>
        this.startResurrectChannelEffect(casterId, tileX, tileY, endsAtMs),
      stopResurrectChannelEffect: (casterId) => this.stopResurrectChannelEffect(casterId),
      getSuppressServerSpellFxUntil: () => this.suppressServerSpellFxUntil,
      getPlayerSprite: () => this.player,
      getLocalPlayerId: () => this.mpController.getPlayerId(),
      applyLocalRevivedFromServer: (hp) => this.deathSystem.applyRevivedFromServer(hp),
      isPlayerDeadOrGhost: () => this.isPlayerDeadOrGhost(),
      applyMapTransition: (transition, options) =>
        this.applyMapTransition(transition, options),
      tweenPlayerTo: (target, duration, onUpdate, onComplete) => {
        this.tweens.add({
          targets: this.player,
          x: target.x,
          y: target.y,
          duration,
          ease: "Linear",
          onUpdate,
          onComplete,
        });
      },
      killPlayerTweens: () => this.tweens.killTweensOf(this.player),
      setPlayerPosition: (x, y) => this.player.setPosition(x, y),
      syncPlayerFacePosition: () => this.syncPlayerFacePosition(),
      syncEquippedHeldItemVisuals: () => this.syncEquippedHeldItemVisuals(),
      syncPlayerNameLabelPosition: () => this.syncPlayerNameLabelPosition(),
      refreshMapLocationLabel: () => this.refreshMapLocationLabel(),
      refreshMinimap: () => this.refreshMinimap(),
      findDummyById: (id) => {
        const dummy = this.mobController.findById(id);
        return dummy ? { alive: dummy.alive, sprite: dummy.sprite } : null;
      },
      tintDummySprite: (dummy, tint) => dummy.sprite.setTint(tint),
      clearDummyTint: (dummy) => {
        if (dummy.alive) dummy.sprite.clearTint();
      },
      setPlayerHpZero: () => {
        this.playerProgress.hp = 0;
      },
      handlePlayerDeath: () => this.handlePlayerDeath(),
      onCharacterAlreadyOnline: (message) =>
        this.returnToCharacterSelectForDuplicateLogin(message),
    });
  }

  private returnToCharacterSelectForDuplicateLogin(message: string) {
    this.gameUi?.addChatLine(message);
    this.mpController?.disconnect();
    this.scene.start("CharacterSelectScene");
  }

  init(data: GameSceneInitData = {}) {
    this.characterSlotIndex = data.slotIndex ?? getActiveCharacterSlotIndex();
    const character = data.character ?? getActiveCharacter();
    if (character) {
      this.applyActiveCharacter(character);
    }
  }

  preload() {
    runGameScenePreload(this);
  }

  /**
   * Orden de init — ver docs/GAMESCENE_INIT.md antes de reordenar.
   * Crítico: setupCameras → initWorldItemManager → initMpController → spawn/drops.
   */
  create() {
    ensureAoFont2TransparentBackground(this);
    this.initShopBankSystem();
    this.initCombatController();
    this.initDeathSystem();
    this.initMeditationSystem();
    this.initMobAiSystem();
    setupPlayerTexture(this);
    registerPlayerAnimations(this);
    this.registerSpellAnimations();
    this.registerMeditationAnimation();
    setupAoTerrainTexture(this);
    setupRaceFacesTextures(this);
    setupInventoryPanelTextures(this);
    registerMobWalkAnimations(this);
    this.registerImperiumNpcWalkAnimations();
    const treeTexture = this.textures.get(TREE_TEXTURE_KEY);
    if (treeTexture.key !== "__MISSING") {
      treeTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    const progress = this.ensureProgressService();
    progress.setCharacterId(this.characterId);
    const savedProgress = progress.load();
    if (savedProgress) {
      this.applyCharacterProgress(savedProgress);
      this.hasLoadedCharacterProgress = true;
    } else {
      this.inventory = Array(INVENTORY_SLOT_COUNT).fill(null);
      this.equipment = {
        weapon: null,
        shield: null,
        helmet: null,
        armor: null,
      };
      this.equippedOutfit = "base";
      this.equippedArmorVisual = undefined;
      this.hasLoadedCharacterProgress = false;
      this.currentMapId = this.homeMapId;
      this.resetDeathStateForCharacterSwitch();
      this.syncCharacterVitalsAndSpells();
    }

    this.currentMap = getMap(this.currentMapId);
    this.initMapController();
    this.mapController.updateWorldBackgroundColor();
    const centerTileX = Math.floor(this.currentMap.width / 2);
    const centerTileY = Math.floor(this.currentMap.height / 2);
    if (!this.hasLoadedCharacterProgress) {
      this.playerTileX = centerTileX;
      this.playerTileY = centerTileY;
    }

    this.mapController.drawMap(this.currentMap);
    if (!isPhaserObjectLive(this.player)) {
      this.player = undefined!;
      this.playerFace = undefined!;
      this.playerNameLabel = undefined!;
    }
    this.createPlayer();
    this.ensureEntitySyncReady();
    this.playFacingAnim("idle");
    this.initMobController();
    this.mapController.updateRoofTransparency(this.playerTileX, this.playerTileY);

    this.gameUi = new GameUi(this);
    this.gameUi.setMinimapRedrawHandler(() => this.refreshMinimap());
    this.initConsumableController();
    this.initChatCommands();
    this.mobController.createAllIfNeeded();
    this.time.delayedCall(200, () => this.playSpawnEffect());
    this.gameUi.setChatSubmitHandler((message) => this.chatCommands.handleSubmit(message));
    this.gameUi.setInventoryHoverHandler((slotIndex) => this.buildInventoryHoverHint(slotIndex));
    this.gameUi.setMacroSlotClickHandler((slotIndex) => {
      this.openMacroEditor(slotIndex);
    });
    this.initializeStarterSpells();
    this.refreshKnownSpellsUi();
    this.gameUi.setSpellInfoRequestHandler((spell) => {
      const debuffText = spell.remueveDebuff ? ` | Quita: ${spell.remueveDebuff}` : "";
      const classesText = spell.usableBy.join(", ");
      this.gameUi.addChatLine(
        `${spell.nombre} [#${spell.idSpell}] MP:${spell.manaCost} Danio:${spell.danioMin}-${spell.danioMax} Cura:${spell.healMin}-${spell.healMax} AoE:${spell.aoe ? `si (${spell.aoeRadiusTiles} tiles)` : "no"} Aliados:${spell.puedeUsarseEnAliados ? "si" : "no"} Valor:${spell.valor} NivelReq:${spell.nivelRequerido} Clases:${classesText}${debuffText} | ${spell.descripcion}`
      );
    });
    this.gameUi.setSpellCastRequestHandler((spell) => {
      this.combatController.beginSpellTargeting(spell);
    });
    this.refreshMapLocationLabel();
    this.refreshMacroVisuals();
    this.mapController.createWorldMapOverlay();

    if (this.hasLoadedCharacterProgress) {
      this.refreshKnownSpellsUi();
      this.refreshInventoryUi();
      this.validateEquippedArmorForRace();
      this.refreshHud();
    } else {
      this.spawnStarterInventory();
      this.syncCharacterVitalsAndSpells();
      this.validateEquippedArmorForRace();
      this.syncEquippedArmorOutfit();
    }
    this.mapController.setupCameras();
    this.initWorldItemManager();
    this.initLocalPlayerSync();
    this.initMpController();
    this.initInventoryController();
    if (!this.hasLoadedCharacterProgress) {
      this.spawnAllItemsNearSpawn(centerTileX, centerTileY);
    }
    this.gameUi.setGoldClickHandler(() => this.tryDropGold());
    this.gameUi.setInventorySlotDoubleClickHandler((slotIndex) => {
      this.inventoryController.handleSlotDoubleClick(slotIndex);
    });
    this.gameUi.setInventorySlotMoveHandler((fromSlotIndex, toSlotIndex) => {
      this.inventoryController.handleSlotMove(fromSlotIndex, toSlotIndex);
    });
    this.worldItemManager.loadSharedStorage();
    this.npcManager = new NpcManager(
      this,
      (feetY) => this.depthFromFeetY(feetY),
      this.uiCamera
    );
    this.syncNpcsForCurrentMap();
    this.setupDeathOverlay();
    if (this.hasLoadedCharacterProgress) {
      this.syncDeathUiFromState();
    }
    this.setupBankOverlay();
    this.setupShopOverlay();
    this.setupInput();
    this.setupWorldPointerHandlers();
    this.restoreWorldItemsForCurrentMap();

    this.scale.on("resize", this.applyCameraLayout, this);
    this.events.on("ui-viewport-changed", this.applyCameraLayout, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.handleSceneResume, this);
    this.events.on(Phaser.Scenes.Events.PAUSE, this.handleScenePause, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearStaleWorldVisualRefs();
      this.persistCharacterProgress();
      this.progressService?.cancelScheduledPersist();
      this.scale.off("resize", this.applyCameraLayout, this);
      this.events.off("ui-viewport-changed", this.applyCameraLayout, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.handleSceneResume, this);
      this.events.off(Phaser.Scenes.Events.PAUSE, this.handleScenePause, this);
      this.deathOverlay?.destroy();
      this.deathOverlay = undefined;
      this.bankOverlay?.destroy();
      this.bankOverlay = undefined;
      this.shopOverlay?.destroy();
      this.shopOverlay = undefined;
      this.npcManager?.clear();
      this.npcManager = undefined;
      this.mpController?.disconnect();
    });

    this.mpController.connect();
  }

  private isWorldSceneLive(): boolean {
    return Boolean(this.sys?.isActive() && isPhaserObjectLive(this.player));
  }

  /** Evita usar sprites/textos destruidos tras shutdown o scene.start/restart. */
  private clearStaleWorldVisualRefs(): void {
    this.player = undefined!;
    this.playerFace = undefined!;
    this.playerNameLabel = undefined!;
    this.equippedWeaponSprite = undefined!;
    this.equippedShieldSprite = undefined!;
    this.equippedHelmetSprite = undefined!;
    this.gameUi = undefined!;
  }

  private handleScenePause = () => {
    this.progressService?.cancelScheduledPersist();
    this.persistCharacterProgress();
  };

  private handleSceneResume() {
    this.progressService?.cancelScheduledPersist();

    const character = this.game.registry.get("activeCharacter") as SavedCharacter | undefined;
    const slotIndex = this.game.registry.get("activeCharacterSlotIndex") as number | undefined;
    if (!character) {
      return;
    }
    if (!this.isWorldSceneLive()) {
      return;
    }
    this.applyActiveCharacter(character);
    if (typeof slotIndex === "number" && Number.isFinite(slotIndex)) {
      this.characterSlotIndex = slotIndex;
    }
    this.game.registry.remove("activeCharacter");
    this.game.registry.remove("activeCharacterSlotIndex");

    const savedProgress = this.ensureProgressService().load(character.id);
    if (savedProgress) {
      this.applyCharacterProgress(savedProgress);
      this.hasLoadedCharacterProgress = true;
      this.applyWorldStateFromProgress();
    } else {
      this.inventory = Array(INVENTORY_SLOT_COUNT).fill(null);
      this.equipment = {
        weapon: null,
        shield: null,
        helmet: null,
        armor: null,
      };
      this.equippedOutfit = "base";
      this.equippedArmorVisual = undefined;
      this.hasLoadedCharacterProgress = false;
      this.currentMapId = this.homeMapId;
      this.resetDeathStateForCharacterSwitch();
      this.syncCharacterVitalsAndSpells();
      this.applyWorldStateFromProgress();
    }

    this.syncDeathUiFromState();
    this.validateEquippedArmorForRace();
    this.refreshInventoryUsability();
    this.refreshKnownSpellsUi();
    this.refreshMacroVisuals();
    this.refreshHud();
    if (isPhaserObjectLive(this.playerNameLabel)) {
      this.playerNameLabel.setText(this.playerName);
      this.syncPlayerNameLabelStyle();
    }
    if (this.gameUi) {
      this.gameUi.addChatLine(`Volviste con ${this.playerName}.`);
    }
    if (this.isWorldSceneLive()) {
      this.playSpawnEffect();
    }

    if (isMultiplayerEnabled()) {
      if (!this.mpController) {
        this.initMpController();
      }
      this.mpController.disconnect();
      this.mpController.connect();
    }
  }

  private syncCharacterVitalsAndSpells() {
    this.applyBaseVitalsFromAttributes();
    this.playerProgress.level = TEST_PLAYER_LEVEL;
    this.playerProgress.exp = 0;
    this.playerProgress.expToNext = expRequiredForLevel(TEST_PLAYER_LEVEL);
    this.applyTestStartingVitals();
    this.refreshKnownSpellsUi();
    this.refreshInventoryUsability();
    this.refreshMacroVisuals();
    this.refreshHud();
  }

  private refreshStatsOverlayUi() {
    if (!this.gameUi) return;
    const natural = resolveCoreStats(this.selectedRace, this.selectedClass);
    const coreStats = this.getCoreStats();
    this.gameUi.setCharacterAttributes({
      strength: coreStats.strength,
      agility: coreStats.agility,
      intelligence: coreStats.intelligence,
      constitution: coreStats.constitution,
      strengthCeiling: natural.strength + ATTRIBUTE_POTION_BUFF_MAX,
      agilityCeiling: natural.agility + ATTRIBUTE_POTION_BUFF_MAX,
    });

    this.gameUi.setKillStats(this.killStats);
  }

  private buildInventoryHoverHint(slotIndex: number): string | null {
    const stack = this.inventory[slotIndex];
    if (!stack) {
      return null;
    }
    const item = getItemDefinition(stack.itemId);

    if (item.type === "armor" || item.type === "shield" || item.type === "helmet") {
      const defensePercent = Math.round(
        (item.combatModifiers?.damageReductionPercent ?? 0) * 100
      );
      const magicPercent = Math.round(
        (item.combatModifiers?.magicResistancePercent ?? 0) * 100
      );
      const label =
        item.type === "shield" ? "escudo" : item.type === "helmet" ? "casco" : "defensa";
      let hint = `${item.name} - (${defensePercent}% ${label})`;
      if (magicPercent > 0) {
        hint += ` | ${magicPercent}% res. mágica`;
      }
      return hint;
    }

    if (item.type === "consumable" && item.consumableEffects?.attributeBuff) {
      const stat =
        item.consumableEffects.attributeBuff === "strength" ? "Fuerza" : "Agilidad";
      return `${item.name} - (+${ATTRIBUTE_POTION_GAIN_MIN} a +${ATTRIBUTE_POTION_GAIN_MAX} ${stat}, 90 s, hasta ${STAT_MAX + ATTRIBUTE_POTION_BUFF_MAX} total)`;
    }

    if (item.type === "weapon") {
      const min = item.damageMin ?? 0;
      const max = item.damageMax ?? 0;
      const magicPercent = Math.round(
        (item.combatModifiers?.magicDamageBonusPercent ?? 0) * 100
      );
      let hint = `${item.name} - (${min}-${max} daño)`;
      if (magicPercent > 0) {
        hint += ` (+${magicPercent}% mágico)`;
      }
      if (item.canCrit) {
        const critChance = Math.round((item.critChance ?? 0) * 100);
        const critDamage = Math.round((item.critDamage ?? 1) * 100);
        hint += ` | ${critChance}% crít (${critDamage}% daño)`;
      }
      return hint;
    }

    return null;
  }

  private refreshInventoryUsability() {
    if (!this.gameUi) return;
    this.inventory.forEach((stack, slotIndex) => {
      if (!stack) {
        this.gameUi.setInventorySlotInvalid(slotIndex, false);
        return;
      }
      const item = getItemDefinition(stack.itemId);
      const usability = canUseItem(
        this.selectedClass,
        this.selectedRace,
        this.playerProgress.level,
        item,
        this.isPlayerAdmin()
      );
      this.gameUi.setInventorySlotInvalid(slotIndex, !usability.allowed);
    });
  }

  private spawnAllItemsNearSpawn(centerTileX: number, centerTileY: number) {
    const cols = 6;
    ALL_ITEM_IDS.forEach((itemId, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      this.createWorldItem(itemId, centerTileX + 1 + col, centerTileY + row);
    });
  }

  private applyActiveCharacter(character: SavedCharacter) {
    this.playerName = character.name;
    this.playerRole = isAdminCharacterName(character.name) ? "admin" : "player";
    this.selectedClass = character.classId;
    this.selectedRace = character.raceId;
    this.selectedGender = character.genderId;
    this.selectedFaction = normalizeFactionId(character.factionId);
    this.selectedBodyTextureKey = raceBodyTextureKey(character.raceId, character.genderId);
    this.selectedFaceIndex = character.faceIndex;
    this.homeMapId = character.homeMapId ?? DEFAULT_HOME_MAP_ID;
    this.characterId = character.id;
    this.ensureProgressService().setCharacterId(character.id);
    this.bankState = loadBankState(character.id);
    this.syncPlayerBodyAndFace();
    if (isPhaserObjectLive(this.playerNameLabel)) {
      this.syncPlayerNameLabelStyle();
    }
  }

  private buildCharacterProgressSnapshot(): SavedCharacterProgress {
    this.cacheCurrentMapWorldItems();
    return {
      version: 1,
      mapId: this.currentMapId,
      tileX: this.playerTileX,
      tileY: this.playerTileY,
      facing: this.facing,
      inventory: this.inventory.map((slot) =>
        slot ? { itemId: slot.itemId, count: slot.count } : null
      ),
      equipment: { ...this.equipment },
      equippedOutfit: this.equippedOutfit,
      playerProgress: { ...this.playerProgress },
      learnedSpellIds: [...this.learnedSpellIds],
      macroBindings: this.macroBindings.map((binding) => ({ ...binding })),
      killStats: { ...this.killStats },
      deathPhase: this.deathPhase,
      useGhostAppearance: this.useGhostAppearance,
      worldItemsByMap: Object.fromEntries(
        Object.entries(this.worldItemManager.getItemsByMap()).map(([mapId, items]) => [
          mapId,
          items.map((entry) => ({ ...entry })),
        ])
      ),
    };
  }

  private applyCharacterProgress(progress: SavedCharacterProgress) {
    applySavedProgressToSceneState({
      progress,
      setMapPosition: (mapId, tileX, tileY, facing) => {
        this.currentMapId = mapId;
        this.playerTileX = tileX;
        this.playerTileY = tileY;
        this.facing = facing;
      },
      setInventory: (slots) => {
        this.inventory = slots;
      },
      setEquipment: (equipment) => {
        this.equipment = equipment;
      },
      setEquippedOutfit: (outfit) => {
        this.equippedOutfit = outfit;
      },
      clearEquippedArmorVisual: () => {
        this.equippedArmorVisual = undefined;
      },
      setPlayerProgress: (playerProgress) => {
        this.playerProgress = playerProgress;
      },
      setLearnedSpellIds: (ids) => {
        this.learnedSpellIds.clear();
        ids.forEach((spellId) => this.learnedSpellIds.add(spellId));
      },
      setMacroBindings: (bindings) => {
        this.macroBindings = bindings.map((binding) => ({ ...binding }));
      },
      setKillStats: (stats) => {
        this.killStats = stats;
      },
      setDeathState: (phase, useGhost) => {
        this.deathPhase = phase;
        this.useGhostAppearance = useGhost;
      },
      onWorldItemsStorageReload: () => {
        if (this.worldItemManager) {
          this.worldItemManager.loadSharedStorage();
        }
      },
    });
  }

  private cacheCurrentMapWorldItems() {
    this.worldItemManager.cacheCurrentMap();
  }

  private restoreWorldItemsForCurrentMap() {
    if (!this.isWorldSceneLive()) {
      return;
    }
    this.worldItemManager.restoreForCurrentMap();
  }

  private applyWorldStateFromProgress() {
    if (!this.isWorldSceneLive()) {
      return;
    }

    const map = getMap(this.currentMapId);
    const mapChanged = this.currentMap?.id !== map.id;
    if (mapChanged) {
      this.currentMap = map;
      this.mapController.updateWorldBackgroundColor();
      this.mapController.drawMap(this.currentMap);
      this.syncNpcsForCurrentMap();
      this.syncDummyVisibilityForCurrentMap();
      this.mapController.updateCameraBounds();
    }

    const pos = this.getPlayerFeetWorldForTile(this.playerTileX, this.playerTileY);
    this.player.setPosition(pos.x, pos.y);
    this.syncPlayerFacePosition();
    this.updatePlayerFaceFrame();
    if (!this.isMultiplayerActive()) {
      this.restoreWorldItemsForCurrentMap();
    }
    this.syncDeathUiFromState();
    this.refreshMapLocationLabel();
    this.refreshMinimap();
    this.refreshHud();
    this.refreshInventoryUi();
  }

  persistCharacterProgress = () => {
    this.ensureProgressService().persistNow(
      () => this.buildCharacterProgressSnapshot(),
      { homeMapId: this.homeMapId }
    );
  };

  private scheduleCharacterProgressSave() {
    this.ensureProgressService().schedulePersist(
      () => this.buildCharacterProgressSnapshot(),
      { homeMapId: this.homeMapId }
    );
  }

  private syncPlayerNameLabelStyle() {
    if (!isPhaserObjectLive(this.playerNameLabel)) return;
    const colors = getPlayerNameColors(this.selectedFaction, this.playerRole);
    this.playerNameLabel.setColor(colors.fill);
    this.playerNameLabel.setStroke(colors.stroke, WORLD_NAME_STROKE);
  }

  /** Alinea sprite fantasma y overlay de muerte con el deathPhase del personaje activo. */
  private syncDeathUiFromState() {
    if (this.deathPhase !== "alive") {
      this.applyGhostVisual();
      this.deathOverlay?.show(this.getGameViewportRect());
      return;
    }

    this.deathOverlay?.hide();
    this.deathOverlay?.hideDialog();
    this.clearGhostVisual();
    this.syncPlayerBodyAndFace();
    this.syncEquippedArmorOutfit();
    this.syncEquippedHeldItemVisuals();
    this.playFacingAnim("idle");
  }

  private resetDeathStateForCharacterSwitch() {
    const fresh = freshDeathStateForSwitch();
    this.deathPhase = fresh.deathPhase;
    this.useGhostAppearance = fresh.useGhostAppearance;
  }

  private getLocalPlayerStepDurationMs(): number {
    if (this.useGhostAppearance || this.isPlayerDeadOrGhost()) {
      return stepDurationMsForBodyTexture(this.getVisualBodyTextureKey());
    }
    return STEP_DURATION_MS;
  }

  private getVisualRace(): CharacterRaceId {
    return this.useGhostAppearance ? GHOST_RACE_ID : this.selectedRace;
  }

  private getVisualGender(): CharacterGenderId {
    return this.useGhostAppearance ? "male" : this.selectedGender;
  }

  private getVisualBodyTextureKey(): string {
    return raceBodyTextureKey(this.getVisualRace(), this.getVisualGender());
  }

  private getActiveFaceLayout() {
    return getRaceFaceLayout(this.getVisualRace(), this.getVisualGender());
  }

  private syncPlayerBodyAndFace() {
    if (!this.isWorldSceneLive()) {
      return;
    }
    this.applyLocalPlayerBodyVisual();
    if (this.playerFace) {
      const faceLayout = this.getActiveFaceLayout();
      this.playerFace.clearTint();
      this.playerFace.setAlpha(1);
      this.playerFace.setTexture(
        faceTextureKey(this.getVisualRace(), this.getVisualGender())
      );
      this.playerFace.setScale(faceLayout.scale);
      this.updatePlayerFaceFrame();
      this.syncPlayerFacePosition();
    }
  }

  /** Alinea textura y animación del cuerpo con raza + armadura (evita cuerpo humano con cara de gnomo). */
  private applyLocalPlayerBodyVisual() {
    if (!this.player) {
      return;
    }

    const visualOutfit = this.useGhostAppearance ? "base" : this.equippedOutfit;
    const bodyKey = textureKeyForPlayer(
      visualOutfit,
      this.getVisualBodyTextureKey(),
      this.useGhostAppearance ? undefined : this.equippedArmorVisual,
      this.getVisualRace()
    );

    this.player.clearTint();
    this.player.setAlpha(1);
    this.player.setTexture(bodyKey);
    applyPlayerOrigin(this.player);
    this.player.setScale(1);
    this.player.anims.stop();
    this.playFacingAnim(this.isMoving ? "walk" : "idle");
  }

  private equipment: Record<EquipmentSlot, ItemId | null> = {
    weapon: null,
    shield: null,
    helmet: null,
    armor: null,
  };

  private getHudDeps() {
    return {
      getGameUi: () => this.gameUi,
      getCurrentMap: () => this.currentMap,
      getMapController: () => this.mapController,
      getPlayerTileX: () => this.playerTileX,
      getPlayerTileY: () => this.playerTileY,
      getPlayerName: () => this.playerName,
      getPlayerFaction: () => this.selectedFaction,
      getPlayerRole: () => this.playerRole,
      getPlayerProgress: () => this.playerProgress,
      refreshStatsOverlay: () => this.refreshStatsOverlayUi(),
    };
  }

  private createPlayer() {
    if (isPhaserObjectLive(this.player)) return;

    const { x, y } = this.getPlayerFeetWorldForTile(this.playerTileX, this.playerTileY);
    const created = createGameScenePlayer({
      scene: this,
      tileX: this.playerTileX,
      tileY: this.playerTileY,
      feetX: x,
      feetY: y,
      depthFromFeetY: (feetY) => this.depthFromFeetY(feetY),
      facing: this.facing,
      deathPhase: this.deathPhase,
      useGhostAppearance: this.useGhostAppearance,
      equippedOutfit: this.equippedOutfit,
      equippedArmorVisual: this.equippedArmorVisual,
      visualBodyTextureKey: this.getVisualBodyTextureKey(),
      selectedRace: this.selectedRace,
      selectedGender: this.selectedGender,
      selectedFaceIndex: this.selectedFaceIndex,
      faceLayoutScale: this.getActiveFaceLayout().scale,
      playerName: this.playerName,
      selectedFaction: this.selectedFaction,
      playerRole: this.playerRole,
      uiCamera: this.uiCamera,
      setupHitbox: (player) => this.setupPlayerHitboxInteractionFor(player),
      onPlayerPointerDown: () => {
        if (this.combatController?.hasPendingSpellCast()) {
          this.combatController.tryCastSpellOnPlayer();
          return;
        }
        this.inspectPlayerCharacter();
      },
    });

    this.player = created.player;
    this.playerFace = created.playerFace;
    this.playerNameLabel = created.playerNameLabel;
    this.equippedWeaponSprite = created.equippedWeaponSprite;
    this.equippedShieldSprite = created.equippedShieldSprite;
    this.equippedHelmetSprite = created.equippedHelmetSprite;
    this.spellMagicWordsOverlay = created.spellMagicWordsOverlay;
  }

  private inspectPlayerCharacter() {
    const baseText = formatCharacterInspectLine(
      this.playerName,
      this.selectedFaction,
      this.selectedClass,
      this.selectedRace,
      this.selectedGender,
      this.playerProgress.level,
      this.resolvePlayerRole(this.playerRole)
    );
    const debuffs: string[] = [];
    if (this.isPlayerImmobilized(this.time.now)) {
      debuffs.push("Inmovilizado");
    }
    this.gameUi.addChatLine(formatInspectLineWithDebuffs(baseText, debuffs));
  }

  private inspectDummy(dummy: DummyState) {
    this.inspectedDummyId = dummy.id;
    this.refreshInspectedDummyLabel();
    const baseText = `${dummy.name} - Vida ${dummy.hp}/${dummy.maxHp}`;
    this.gameUi.addChatLine(
      formatInspectLineWithDebuffs(
        baseText,
        getDummyActiveDebuffsForInspect(dummy, this.time.now)
      )
    );
  }

  private inspectRemote(remote: import("../network/RemotePlayerManager").RemoteEntry) {
    this.clearInspectedDummy();
    const baseText = formatCharacterInspectLine(
      remote.playerName,
      normalizeFactionId(remote.factionId) as import("../data/characters").CharacterFactionId,
      remote.classId as import("./gameSceneModules/types").ClassId,
      remote.raceId as import("./gameSceneModules/types").RaceId,
      remote.genderId as import("../data/characters").CharacterGenderId,
      remote.level,
      remote.role
    );
    const suffix =
      remote.isGhost || remote.hp <= 0
        ? ` — Muerto (${remote.hp}/${remote.hpMax} HP)`
        : ` — Vida ${remote.hp}/${remote.hpMax}`;
    this.gameUi.addChatLine(formatInspectLineWithDebuffs(`${baseText}${suffix}`, []));
  }

  private clearInspectedDummy() {
    this.inspectedDummyId = null;
    this.dummies.forEach((dummy) => dummy.hpLabel.setVisible(false));
  }

  private refreshInspectedDummyLabel() {
    this.dummies.forEach((dummy) => {
      const show =
        dummy.id === this.inspectedDummyId &&
        dummy.alive &&
        dummy.mapId === this.currentMapId;
      dummy.hpLabel.setText(`${dummy.name} ${dummy.hp}/${dummy.maxHp}`);
      dummy.hpLabel.setVisible(show);
      if (show) {
        this.syncDummyWorldPosition(dummy);
      }
    });
  }

  private syncServerInventoryIfMultiplayer() {
    this.mpController.syncServerInventoryIfActive();
  }

  private syncServerBankIfMultiplayer() {
    this.mpController?.syncServerBankIfActive();
  }

  private isMultiplayerActive() {
    return this.mpController?.isActive() ?? false;
  }

  private tryNetworkStep(dir: MoveDirection) {
    this.mpController.tryNetworkStep(dir);
  }

  private setMultiplayerStatus(message: string) {
    const status = document.getElementById("nav-status");
    if (status) {
      status.textContent = message;
    }
  }

  private spawnStarterInventory() {
    // Inventory starts empty by default
    this.refreshInventoryUi();
  }

  private initializeStarterSpells() {
    SPELL_DEFINITIONS.forEach((spell) => {
      this.learnedSpellIds.add(spell.idSpell);
    });
  }

  private refreshKnownSpellsUi() {
    if (!this.gameUi) return;
    this.gameUi.setSpells(this.getAvailableSpellDefinitions());
  }

  private resolvePlayerRole(serverRole?: PlayerRole): PlayerRole {
    if (isAdminCharacterName(this.playerName) || serverRole === "admin") {
      return "admin";
    }
    return "player";
  }

  private isPlayerAdmin(): boolean {
    return this.resolvePlayerRole(this.playerRole) === "admin";
  }

  private handleHitboxCommand(normalized: string): boolean {
    if (!this.isPlayerAdmin()) {
      this.gameUi.addChatLine("Comando solo para admins.");
      return true;
    }

    const args = normalized.slice("/hitbox".length).trim().split(/\s+/).filter(Boolean);
    const mode = args[0]?.toLowerCase();
    if (mode === "on" || mode === "1" || mode === "true") {
      this.setHitboxDebugEnabled(true);
    } else if (mode === "off" || mode === "0" || mode === "false") {
      this.setHitboxDebugEnabled(false);
    } else {
      this.setHitboxDebugEnabled(!this.hitboxDebugEnabled);
    }
    return true;
  }

  private tryAdminCommand(message: string): boolean {
    if (!this.isPlayerAdmin()) return false;

    const parts = message.slice(1).split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (command === "tp") {
      if (!this.multiplayer?.isConnected()) {
        this.gameUi.addChatLine("No estás conectado al servidor.");
        return true;
      }
      this.multiplayer.sendAdminCommand(command, args);
      return true;
    }

    return false;
  }

  private setHitboxDebugEnabled(enabled: boolean) {
    this.hitboxDebugEnabled = enabled;
    if (!enabled) {
      this.hitboxDebugGraphics?.clear().setVisible(false);
    }
    this.gameUi?.addChatLine(`Debug hitbox: ${enabled ? "ON" : "OFF"}`);
  }

  private handleMobEditCommand(normalized: string): boolean {
    if (!this.isPlayerAdmin()) {
      this.gameUi.addChatLine("Comando solo para admins.");
      return true;
    }
    return this.mobController.handleMobEditCommand(normalized);
  }

  private initMobAiSystem() {
    this.mobAiSystem = new MobAiSystem({
      getPlayerTile: () => ({ x: this.playerTileX, y: this.playerTileY }),
      isMultiplayerActive: () => this.isMultiplayerActive(),
      isChangingMap: () => this.isChangingMap,
      getCurrentMapId: () => this.currentMapId,
      isTileWalkableForMob: (x, y, source) => this.isTileWalkableForMob(x, y, source as DummyState),
      getMobFeetWorld: (modelId, x, y) => this.getMobFeetWorld(modelId as any, x, y),
      getMobStepDurationMs: (modelId) => this.getMobStepDurationMs(modelId as any),
      applyIncomingDamage: (amount, type) =>
        this.combatController.applyIncomingDamage(amount, type),
      getScene: () => this,
      setMobAnimationState: (dummy, state) => this.setMobAnimationState(dummy as DummyState, state),
      syncDummyWorldPosition: (dummy) => this.syncDummyWorldPosition(dummy as DummyState),
      depthFromFeetY: (feetY) => this.depthFromFeetY(feetY),
      syncMobFaceForDummy: (dummy) => this.syncMobFaceForDummy(dummy as DummyState),
      showDamageNumber: (x, y, dmg, src) =>
        this.combatController.showDamageNumber(x, y, dmg, src as "player" | "mob"),
      playAttackFeedback: (tx, ty) => this.combatController.playAttackFeedback(tx, ty),
      addCombatLine: (msg) => this.gameUi.addCombatLine(msg),
      getPlayerSprite: () => this.player,
    });
  }

  private initDeathSystem() {
    this.deathSystem = new DeathSystem(
      {
        getPlayerProgress: () => this.playerProgress,
        setPlayerHp: (v) => { this.playerProgress.hp = v; },
        getInventory: () => this.inventory,
        clearInventorySlot: (i) => { this.inventory[i] = null; },
        getEquipment: () => this.equipment,
        clearEquipmentSlot: (slot) => { this.equipment[slot] = null; },
        createWorldItem: (itemId, tx, ty, count) => this.createWorldItem(itemId, tx, ty, count),
        refreshInventoryUi: () => this.refreshInventoryUi(),
        refreshHud: () => this.refreshHud(),
        stopMeditation: (msg) => this.stopMeditation(msg),
        cancelSpellTargeting: () => this.combatController.cancelSpellTargeting(),
        addChatLine: (msg) => this.gameUi.addChatLine(msg),
        addCombatLine: (msg) => this.gameUi.addCombatLine(msg),
        scheduleProgressSave: () => this.scheduleCharacterProgressSave(),
        persistCharacterProgress: () => this.persistCharacterProgress(),
        getPlayerTile: () => ({ x: this.playerTileX, y: this.playerTileY }),
        getCurrentMapId: () => this.currentMapId,
        setEquippedOutfit: (o) => { this.equippedOutfit = o; },
        setEquippedArmorVisual: (v) => { this.equippedArmorVisual = v; },
        getDeathOverlay: () => this.deathOverlay,
        getGameViewportRect: () => this.getGameViewportRect(),
        syncPlayerBodyAndFace: () => this.syncPlayerBodyAndFace(),
        syncEquippedHeldItemVisuals: () => this.syncEquippedHeldItemVisuals(),
        playFacingAnim: (state) => this.playFacingAnim(state as any),
        playSpawnEffect: () => this.playSpawnEffect(),
        getPlayerSprite: () => this.player,
        getPlayerFaceSprite: () => this.playerFace,
        getEquippedWeaponSprite: () => this.equippedWeaponSprite,
        getEquippedShieldSprite: () => this.equippedShieldSprite,
        getEquippedHelmetSprite: () => this.equippedHelmetSprite,
        isServerAuthoritativeLoot: () => this.isMultiplayerActive(),
        changeMap: (t) => this.changeMap(t as any),
        teleportPlayerLocal: (tx, ty) => {
          this.tweens.killTweensOf(this.player);
          this.isMoving = false;
          this.playerTileX = tx;
          this.playerTileY = ty;
          const pos = this.getPlayerFeetWorldForTile(tx, ty);
          this.player.setPosition(pos.x, pos.y);
          this.syncPlayerFacePosition();
          this.syncEquippedHeldItemVisuals();
          this.syncPlayerNameLabelPosition();
          this.refreshMapLocationLabel();
          this.refreshMinimap();
        },
        isTileWalkable: (x, y) => this.isTileWalkable(x, y),
        getScene: () => this,
        getCharacterSlotIndex: () => this.characterSlotIndex,
        refreshMapLocationLabel: () => this.refreshMapLocationLabel(),
        refreshMinimap: () => this.refreshMinimap(),
        notifyServerRevive: (source, tileX, tileY, mapId) => {
          if (this.isMultiplayerActive()) {
            this.mpController.sendRevive(source, tileX, tileY, mapId);
          }
        },
      },
      this._homeMapIdBackup
    );
  }

  private initMeditationSystem() {
    this.meditationSystem = new MeditationSystem({
      isPlayerDeadOrGhost: () => this.isPlayerDeadOrGhost(),
      getPlayerMp: () => this.playerProgress.mp,
      getPlayerMpMax: () => this.playerProgress.mpMax,
      setPlayerMp: (v) => { this.playerProgress.mp = v; },
      refreshHud: () => this.refreshHud(),
      addChatLine: (msg) => this.gameUi.addChatLine(msg),
      cancelSpellTargeting: () => this.combatController.cancelSpellTargeting(),
      getPlayerFeetWorld: () => this.getPlayerFeetWorldForTile(this.playerTileX, this.playerTileY),
      getPlayerDepth: () => this.player.depth,
      getScene: () => this,
      getUiCamera: () => this.uiCamera,
    });
  }

  private stopMeditation(message?: string) {
    this.meditationSystem.stop(message);
  }

  private hasAnilloEspectralInInventory(): boolean {
    return this.inventory.some((slot) => slot?.itemId === "anillo_espectral");
  }

  private inspectWorldItem(worldItem: WorldItemEntry) {
    if (worldItem.id === "gold") {
      this.gameUi.addChatLine(`Oro - (${worldItem.count.toLocaleString("es-AR")})`);
      return;
    }
    this.gameUi.addChatLine(formatStackLabel(worldItem.id, worldItem.count));
  }

  private useConsumableFromSlot(
    slotIndex: number,
    options?: { skipMultiplayer?: boolean }
  ) {
    this.consumableController?.useConsumableFromSlot(slotIndex, options);
  }

  private resetAttributePotionTimer() {
    this.attributeBuffExpiresAt = this.time.now + ATTRIBUTE_POTION_BUFF_DURATION_MS;
  }

  private clearAttributePotionBuffs(notify = false) {
    this.consumableController?.clearAttributePotionBuffs(notify);
  }

  private expireAttributePotionBuffsIfNeeded(): boolean {
    if (!this.consumableController) {
      return false;
    }
    return this.consumableController.expireAttributePotionBuffsIfNeeded(this.time.now);
  }

  private createWorldItem(
    itemId: ItemId,
    tileX: number,
    tileY: number,
    count = 1,
    options?: { exactTile?: boolean }
  ) {
    if (!this.worldItemManager) {
      console.warn("[GameScene] createWorldItem antes de initWorldItemManager", itemId);
      return;
    }
    this.worldItemManager.createItem(itemId, tileX, tileY, count, options);
  }

  private createWorldGold(
    tileX: number,
    tileY: number,
    count: number,
    options?: { exactTile?: boolean }
  ) {
    if (!this.worldItemManager) {
      console.warn("[GameScene] createWorldGold antes de initWorldItemManager");
      return;
    }
    this.worldItemManager.createGold(tileX, tileY, count, options);
  }

  private applyCameraLayout() {
    this.mapController.applyCameraLayout();
  }

  private getGameViewportRect() {
    return this.mapController.getGameViewportRect();
  }

  private setupDeathOverlay() {
    this.deathOverlay = new DeathOverlay(this, {
      onAcceptPriest: () => this.acceptPriestRevival(),
      onStayGhost: () => this.stayAsGhost(),
    });
    this.cameras.main.ignore(this.deathOverlay.getContainer());
  }

  private get bankState(): BankState {
    if (!this.shopBankSystem) return this._bankStateBackup;
    return this.shopBankSystem.getBankState();
  }

  private set bankState(state: BankState) {
    this._bankStateBackup = state;
    if (this.shopBankSystem) this.shopBankSystem.setBankState(state);
  }

  private get activeShopRole(): MerchantRole | null {
    return this.shopBankSystem.getActiveShopRole();
  }

  private initShopBankSystem() {
    this.shopBankSystem = new ShopBankSystem(
      {
        getInventory: () => this.inventory,
        setInventorySlot: (i, v) => { this.inventory[i] = v; },
        getPlayerGold: () => this.playerProgress.gold,
        setPlayerGold: (v) => { this.playerProgress.gold = v; },
        refreshInventoryUi: () => this.refreshInventoryUi(),
        refreshHud: () => this.refreshHud(),
        addChatLine: (msg) => this.gameUi.addChatLine(msg),
        isPlayerDeadOrGhost: () => this.isPlayerDeadOrGhost(),
        getPlayerTile: () => ({ x: this.playerTileX, y: this.playerTileY }),
        getCharacterId: () => this.characterId,
        getGameViewportRect: () => this.getGameViewportRect(),
        scheduleProgressSave: () => this.scheduleCharacterProgressSave(),
        clearInventorySlotUi: (i) => this.gameUi.clearInventorySlot(i),
        setInventorySlotUi: (i, tex, count) => this.gameUi.setInventorySlot(i, tex, count),
        getEquipment: () => this.equipment,
        onInventoryChanged: () => this.syncServerInventoryIfMultiplayer(),
        onBankChanged: () => this.syncServerBankIfMultiplayer(),
        isPlayerAdmin: () => this.isPlayerAdmin(),
        getPlayerLevel: () => this.playerProgress.level,
        getPlayerClass: () => this.selectedClass,
        getPlayerRace: () => this.selectedRace,
      },
      this._bankStateBackup
    );
  }

  private setupBankOverlay() {
    this.bankOverlay = new BankOverlay(this, {
      onClose: () => this.shopBankSystem.closeBank(),
      onDepositInventorySlot: (slotIndex, amount) =>
        this.shopBankSystem.depositInventorySlotToBank(slotIndex, amount),
      onWithdrawBankSlot: (slotIndex, amount) =>
        this.shopBankSystem.withdrawBankSlotToInventory(slotIndex, amount),
      onDepositGold: (amount) => this.shopBankSystem.depositGoldToBank(amount),
      onWithdrawGold: (amount) => this.shopBankSystem.withdrawGoldFromBank(amount),
    });
    this.cameras.main.ignore(this.bankOverlay.getContainer());
    this.cameras.main.ignore(this.bankOverlay.getDomObjects());
    this.shopBankSystem.setBankOverlay(this.bankOverlay);
  }

  private setupShopOverlay() {
    this.shopOverlay = new ShopOverlay(this, {
      onClose: () => this.shopBankSystem.closeShop(),
      onBuy: (itemId, amount) => this.shopBankSystem.buyFromShop(itemId, amount),
      onSell: (slotIndex, amount) => this.shopBankSystem.sellToShop(slotIndex, amount),
    });
    this.cameras.main.ignore(this.shopOverlay.getContainer());
    this.cameras.main.ignore(this.shopOverlay.getDomObjects());
    this.shopBankSystem.setShopOverlay(this.shopOverlay);
  }

  private tryOpenShopNpc(npc: StaticNpcDefinition) {
    this.shopBankSystem.tryOpenShopNpc(npc);
  }

  private tryOpenBankNpc(npc: StaticNpcDefinition) {
    this.shopBankSystem.tryOpenBankNpc(npc);
  }

  private refreshBankOverlay() {
    this.shopBankSystem.refreshBankOverlay();
  }

  private refreshShopOverlay() {
    this.shopBankSystem.refreshShopOverlay();
  }

  private isPlayerDeadOrGhost() {
    return this.deathSystem.isPlayerDeadOrGhost();
  }

  private get deathPhase(): DeathPhase {
    return this.deathSystem.phase;
  }

  private set deathPhase(value: DeathPhase) {
    this.deathSystem.phase = value;
  }

  private get useGhostAppearance(): boolean {
    return this.deathSystem.useGhostAppearance;
  }

  private set useGhostAppearance(value: boolean) {
    this.deathSystem.useGhostAppearance = value;
  }

  private get homeMapId(): string {
    if (!this.deathSystem) return this._homeMapIdBackup;
    return this.deathSystem.getHomeMapId();
  }

  private set homeMapId(value: string) {
    this._homeMapIdBackup = value;
    if (this.deathSystem) this.deathSystem.setHomeMapId(value);
  }

  private handlePlayerDeath() {
    this.clearAttributePotionBuffs(false);
    this.deathSystem.handlePlayerDeath();
  }

  private applyGhostVisual() {
    this.deathSystem.applyGhostVisual();
  }

  private clearGhostVisual() {
    this.deathSystem.clearGhostVisual();
  }

  private stayAsGhost() {
    this.deathSystem.stayAsGhost();
  }

  private acceptPriestRevival() {
    this.deathSystem.acceptPriestRevival();
  }

  private goToHomePriestViaCommand() {
    this.deathSystem.goToHomePriestViaCommand();
  }

  private tryReviveAtPriestNpc(priest: StaticNpcDefinition) {
    this.deathSystem.tryReviveAtPriestNpc(priest);
  }

  private markHomeCity() {
    this.deathSystem.markHomeCity();
  }

  private persistHomeMapId() {
    this.deathSystem.persistHomeMapId();
  }

  private syncNpcsForCurrentMap() {
    this.npcManager?.syncForMap(this.currentMapId);
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

  private refreshMapLocationLabel() {
    refreshGameSceneMapLocation(this.getHudDeps());
  }

  private refreshHud() {
    refreshGameSceneHud(this.getHudDeps());
  }

  private refreshMinimap() {
    refreshGameSceneMinimap(this.getHudDeps());
  }

  update(_time: number, delta: number) {
    this.expireAttributePotionBuffsIfNeeded();
    this.mapController.snapCameraScroll();
    this.drawHitboxDebugOverlay();
    this.updatePlayerDebuffs();
    this.localPlayerVisuals?.updateInvisibility();
    this.multiplayer?.getRemotePlayers()?.updateInvisibilityVisuals(Date.now());
    this.meditationSystem.update(delta);
    this.updateMobAi();
    this.ensureEntitySyncReady();
    this.entitySync?.syncFrame();
    this.meditationSystem.syncFxPosition();
    this.mapController.syncSceneryOcclusion(this.playerTileX, this.playerTileY);

    processGameSceneFrameInput({
      isChangingMap: this.isChangingMap,
      hasCursors: Boolean(this.cursors && this.wasd),
      isChatFocused: this.gameUi.isChatFocused(),
      isConfirmOpen: this.gameUi.isConfirmOpen(),
      isMacroEditorOpen: this.gameUi.isMacroEditorOpen(),
      isStatsOverlayOpen: this.gameUi.isStatsOverlayOpen(),
      isBankOpen: this.bankOverlay?.isOpen() ?? false,
      isShopOpen: this.shopOverlay?.isOpen() ?? false,
      justPressedWorldMapToggle: Boolean(
        this.worldMapToggleKey && Phaser.Input.Keyboard.JustDown(this.worldMapToggleKey)
      ),
      hasPendingSpellCast: this.combatController.hasPendingSpellCast(),
      justPressedCancelTargeting: Boolean(
        this.cancelSpellTargetingKey &&
          Phaser.Input.Keyboard.JustDown(this.cancelSpellTargetingKey)
      ),
      isWorldMapOpen: this.mapController.isWorldMapOpen(),
      isPlayerDeadOrGhost: this.isPlayerDeadOrGhost(),
      justPressedMeditate: Boolean(
        this.meditateKey && Phaser.Input.Keyboard.JustDown(this.meditateKey)
      ),
      isAttackKeyDown: Boolean(this.attackKey?.isDown),
      justPressedEquipSlot: Boolean(
        this.equipSelectedSlotKey &&
          Phaser.Input.Keyboard.JustDown(this.equipSelectedSlotKey)
      ),
      justPressedDropSlot: Boolean(
        this.dropSelectedSlotKey && Phaser.Input.Keyboard.JustDown(this.dropSelectedSlotKey)
      ),
      justPressedPickup: Phaser.Input.Keyboard.JustDown(this.pickupKey),
      isMoving: this.isMoving,
      getPressedDirection: () => this.getPressedDirection(),
      isPlayerImmobilized: () => this.isPlayerImmobilized(),
      getTimeNow: () => this.time.now,
      getNextImmobilizedFeedbackAt: () => this.nextImmobilizedMoveFeedbackAt,
      setNextImmobilizedFeedbackAt: (at) => {
        this.nextImmobilizedMoveFeedbackAt = at;
      },
      isMultiplayerActive: () => this.isMultiplayerActive(),
      toggleWorldMap: () => this.mapController.toggleWorldMap(),
      cancelSpellTargeting: (message) => this.combatController.cancelSpellTargeting(message),
      handleShopEscape: () => this.shopOverlay?.handleEscape(),
      handleBankEscape: () => this.bankOverlay?.handleEscape(),
      onMeditateHotkeyWhileDead: () =>
        this.gameUi.addChatLine("No podés meditar estando muerto o en forma fantasma."),
      onAttackWhileDead: () => this.gameUi.addChatLine("No podés atacar en esta forma."),
      tryNetworkStep: (direction) => this.tryNetworkStep(direction),
      tryLocalStep: (direction) => this.tryStep(direction),
      onMeditateToggle: () => this.meditationSystem.toggle("hotkey"),
      onAttack: () => this.combatController.tryAttackDummy(),
      onEquipSelectedSlot: () => this.tryToggleEquipmentFromSelectedSlot(),
      onDropSelectedSlot: () => this.tryDropSelectedItem(),
      onPickup: () => this.inventoryController.tryPickupAtPlayerTile(),
      updateDesiredFacing: () => this.updateDesiredFacing(),
      stopMeditation: (reason) => this.stopMeditation(reason),
      onImmobilizedMoveAttempt: () =>
        this.gameUi.addCombatLine("Estás inmovilizado y no podés moverte."),
    });
  }

  private isPlayerImmobilized(now = this.time.now): boolean {
    return now < this.playerImmobilizedUntilMs;
  }

  private applyInmovilizadoDebuffToPlayer(
    targetName: string,
    sourceName: string,
    spellId: number
  ) {
    const now = this.time.now;
    const durationMs = getImmobilizePlayerDurationMs(spellId);
    const wasImmobilized = this.isPlayerImmobilized(now);
    this.playerImmobilizedUntilMs = Math.max(
      this.playerImmobilizedUntilMs,
      now + durationMs
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
      `${sourceName} inmoviliza a ${targetName} por ${formatImmobilizeDuration(durationMs)}.`
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

  private getLocalPlayerVisualParts() {
    return {
      body: this.player,
      face: this.playerFace,
      weapon: this.equippedWeaponSprite,
      shield: this.equippedShieldSprite,
      helmet: this.equippedHelmetSprite,
      nameLabel: this.playerNameLabel,
    };
  }

  private resetLocalPlayerVisualAlpha() {
    this.localPlayerVisuals?.resetAlpha();
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
  private tryToggleEquipmentFromSelectedSlot() {
    this.inventoryController.tryToggleEquipmentFromSelectedSlot();
  }

  private tryDropSelectedItem() {
    this.inventoryController.tryDropSelectedItem();
  }

  private tryDropGold() {
    this.inventoryController.tryDropGold();
  }

  private getArmorVisualForItem(
    item: ReturnType<typeof getItemDefinition>
  ): PlayerArmorVisualOptions | undefined {
    if (item.equipSlot !== "armor" || !item.outfitOverride || item.outfitOverride === "base") {
      return undefined;
    }
    const outfit = item.outfitOverride;
    const stdPath =
      item.spritesheetStdPath ?? getDefaultArmorVisualForOutfit(outfit).spritesheetStdPath;
    return {
      clasesBajas: item.clasesBajas ?? isShortRace(this.selectedRace),
      spritesheetStdPath: stdPath,
      spritesheetBajosPath:
        item.spritesheetBajosPath ??
        (stdPath ? inferBajosSpritesheetPath(stdPath) : undefined),
    };
  }

  private validateEquippedArmorForRace() {
    const armorItemId = this.equipment.armor;
    if (!armorItemId) {
      return;
    }
    const item = getItemDefinition(armorItemId);
    const check = canRaceEquipArmor(this.selectedRace, item.clasesBajas ?? false);
    if (check.allowed) {
      return;
    }
    this.equipment.armor = null;
    this.syncEquippedArmorOutfit();
    this.gameUi.addChatLine(check.reason ?? "Te quitaste una armadura incompatible con tu raza.");
  }

  private syncEquippedArmorOutfit() {
    if (!this.isWorldSceneLive()) {
      return;
    }
    const armorItemId = this.equipment.armor;
    let nextOutfit: Outfit = "base";
    let nextArmorVisual: PlayerArmorVisualOptions | undefined;

    if (armorItemId) {
      const armorItem = getItemDefinition(armorItemId);
      if (armorItem.equipSlot === "armor") {
        nextOutfit = armorItem.outfitOverride ?? "base";
        nextArmorVisual = this.getArmorVisualForItem(armorItem);
      }
    } else {
      nextOutfit = "base";
      nextArmorVisual = undefined;
    }

    const baseBodyKey = raceBodyTextureKey(this.selectedRace, this.selectedGender);
    const nextTextureKey = textureKeyForPlayer(
      nextOutfit,
      baseBodyKey,
      nextArmorVisual,
      this.selectedRace
    );
    const currentTextureKey = textureKeyForPlayer(
      this.equippedOutfit,
      baseBodyKey,
      this.equippedArmorVisual,
      this.selectedRace
    );
    const outfitChanged = nextOutfit !== this.equippedOutfit;
    const visualChanged =
      JSON.stringify(nextArmorVisual) !== JSON.stringify(this.equippedArmorVisual);
    const renderedTextureKey = this.player.texture.key;
    const bodyNeedsUpdate = renderedTextureKey !== nextTextureKey;
    if (
      !outfitChanged &&
      !visualChanged &&
      !bodyNeedsUpdate &&
      nextTextureKey === currentTextureKey
    ) {
      return;
    }

    this.equippedOutfit = nextOutfit;
    this.equippedArmorVisual = nextArmorVisual;

    if (this.useGhostAppearance || this.isPlayerDeadOrGhost()) {
      this.syncEquippedHeldItemVisuals();
      return;
    }

    const pos = this.getPlayerFeetWorldForTile(this.playerTileX, this.playerTileY);
    this.player.setPosition(pos.x, pos.y);
    this.applyLocalPlayerBodyVisual();
    this.syncEquippedHeldItemVisuals();
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

  private refreshInventoryUi() {
    const equippedIds = Object.values(this.equipment).filter(
      (itemId): itemId is ItemId => itemId != null
    );
    this.gameUi.setEquippedItemIds(equippedIds);

    this.inventory.forEach((stack, slotIndex) => {
      if (!stack) {
        this.gameUi.clearInventorySlot(slotIndex);
        return;
      }
  
      const item = getItemDefinition(stack.itemId);
      this.gameUi.setInventorySlot(
        slotIndex,
        item.textureKey,
        stack.count,
        stack.itemId
      );
    });
    this.refreshInventoryUsability();
    this.refreshMacroVisuals();
    this.scheduleCharacterProgressSave();
  }

  private openMacroEditor(slotIndex: number) {
    const binding = this.macroBindings[slotIndex];
    const itemOptions = this.getMacroItemOptions();
    const spellOptions = this.getMacroSpellOptions();
    const selectedInvSlot = this.gameUi.getSelectedInventorySlot();
    const itemFromSelectedSlot =
      selectedInvSlot >= 0 ? this.inventory[selectedInvSlot]?.itemId ?? null : null;
    const nextItemId =
      itemFromSelectedSlot &&
      itemOptions.some((option) => option.itemId === itemFromSelectedSlot)
        ? itemFromSelectedSlot
        : binding.itemId && itemOptions.some((option) => option.itemId === binding.itemId)
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

  private getAvailableSpellDefinitions(): SpellDefinition[] {
    if (this.isPlayerAdmin()) {
      return [...SPELL_DEFINITIONS];
    }
    return SPELL_DEFINITIONS.filter(
      (spell) =>
        this.learnedSpellIds.has(spell.idSpell) &&
        spell.usableBy.includes(this.selectedClass) &&
        spell.nivelRequerido <= this.playerProgress.level
    );
  }

  private getKnownSpellDefinitions(): SpellDefinition[] {
    return this.getAvailableSpellDefinitions();
  }

  private refreshMacroVisuals() {
    if (!this.gameUi) return;
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
      this.gameUi.isMacroEditorOpen() ||
      this.gameUi.isStatsOverlayOpen()
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
        nivelRequerido: spellDefinition.nivelRequerido,
        manaCost: spellDefinition.manaCost,
        danioMin: spellDefinition.danioMin,
        danioMax: spellDefinition.danioMax,
        healMin: spellDefinition.healMin,
        healMax: spellDefinition.healMax,
        puedeUsarseEnAliados: spellDefinition.puedeUsarseEnAliados,
        remueveDebuff: spellDefinition.remueveDebuff,
        aoe: spellDefinition.aoe,
        aoeRadiusTiles: spellDefinition.aoeRadiusTiles,
      };
      if (this.combatController.beginSpellTargeting(spell)) {
        this.gameUi.addChatLine(`Macro ${macroIndex + 1}: preparado ${spell.nombre}.`);
      }
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

    this.inventoryController.toggleEquipFromSlot(slotIndex);
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
    if (this.isMoving) {
      return;
    }

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

    this.refreshMapLocationLabel();
    this.refreshMinimap();

    const target = this.getPlayerFeetWorldForTile(nextX, nextY);
    this.playFacingAnim("walk");

    this.tweens.add({
      targets: this.player,
      x: target.x,
      y: target.y,
      duration: this.getLocalPlayerStepDurationMs(),
      ease: "Linear",
      onUpdate: () => {
        this.syncPlayerFacePosition();
        this.syncEquippedHeldItemVisuals();
        this.syncPlayerNameLabelPosition();
      },
      onComplete: () => {
        this.player.setPosition(target.x, target.y);
        this.syncPlayerFacePosition();
        this.syncEquippedHeldItemVisuals();

        this.isMoving = false;
        this.playFacingAnim("idle");
        this.handleTileEvents();
      },
    });
  }

  /** Al terminar un paso: revisar transiciones por tile o por borde del mapa. */
  private handleTileEvents() {
    this.mapController.updateRoofTransparency(this.playerTileX, this.playerTileY);
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

  private changeMap(
    transition: {
      toMapId: string;
      toTileX: number;
      toTileY: number;
      facing?: Facing;
    },
    options?: { silent?: boolean }
  ) {
    if (this.isMultiplayerActive() && !options?.silent) {
      this.gameUi.addChatLine(
        "No podés cambiar de mapa en multijugador (solo Ullathorpe está disponible online)."
      );
      return;
    }
    this.applyMapTransition(transition, options);
  }

  private applyMapTransition(
    transition: {
      toMapId: string;
      toTileX: number;
      toTileY: number;
      facing?: Facing;
    },
    options?: { silent?: boolean }
  ) {
    this.stopMeditation();
    if (this.combatController.hasPendingSpellCast()) {
      this.combatController.cancelSpellTargeting();
    }
    this.isChangingMap = true;
    this.tweens.killTweensOf(this.player);
    this.isMoving = false;

    if (!this.isMultiplayerActive()) {
      this.cacheCurrentMapWorldItems();
    }
    this.worldItemManager.clearSprites();
    this.mapTileOverrides.clear();

    this.currentMapId = transition.toMapId;
    this.currentMap = getMap(this.currentMapId);
    this.mapController.updateWorldBackgroundColor();
    this.playerTileX = transition.toTileX;
    this.playerTileY = transition.toTileY;

    if (transition.facing) {
      this.facing = transition.facing;
    }

    this.mapController.drawMap(this.currentMap);
    this.syncNpcsForCurrentMap();
    this.syncDummyVisibilityForCurrentMap();
    this.mapController.updateCameraBounds();
    this.mapController.updateRoofTransparency(this.playerTileX, this.playerTileY);

    const pos = this.getPlayerFeetWorldForTile(this.playerTileX, this.playerTileY);

    this.player.setPosition(pos.x, pos.y);
    this.syncPlayerFacePosition();
    this.updatePlayerFaceFrame();
    if (!this.isMultiplayerActive()) {
      this.restoreWorldItemsForCurrentMap();
    }
    if (this.deathPhase !== "alive") {
      this.applyGhostVisual();
    } else {
      this.syncEquippedHeldItemVisuals();
    }

    this.playFacingAnim("idle");
    this.refreshHud();
    if (!options?.silent) {
      this.gameUi.addChatLine(`Entraste a ${this.currentMap.name}.`);
      this.cameras.main.flash(120, 255, 255, 200);
    }

    this.isChangingMap = false;
    this.persistCharacterProgress();
  }

  private playFacingAnim(state: "walk" | "idle") {
    const isProfile = this.facing === "left" || this.facing === "right";
    const bodyFacing: Facing = isProfile ? "left" : this.facing;
    this.player.setFlipX(this.facing === "right");
    this.refreshPlayerHitboxInteraction();

    const visualOutfit = this.useGhostAppearance ? "base" : this.equippedOutfit;
    const key = playerAnimationKey(
      state,
      bodyFacing,
      visualOutfit,
      this.getVisualBodyTextureKey(),
      this.useGhostAppearance ? undefined : this.equippedArmorVisual,
      this.getVisualRace()
    );

    // Siempre repeat:-1 para que la animación nunca "complete" y dispare un restart.
    // Las idle se registran con repeat:0 (1 frame), lo que hace que isPlaying vuelva
    // a false después de 1 segundo; el siguiente play() las reinicia → freeze visual.
    // Con repeat:-1 el frame queda visible indefinidamente sin completarse.
    const playOpts = (k: string) => ({ key: k, repeat: -1 });

    if (!this.anims.exists(key)) {
      const fallbackFacing: Facing = isProfile ? "left" : this.facing;
      const fallbackKey = playerAnimationKey(
        "idle",
        fallbackFacing,
        visualOutfit,
        this.getVisualBodyTextureKey(),
        this.useGhostAppearance ? undefined : this.equippedArmorVisual,
        this.getVisualRace()
      );
      if (this.anims.exists(fallbackKey)) {
        this.player.play(playOpts(fallbackKey), true);
      } else {
        this.player.anims.stop();
      }
    } else {
      this.player.play(playOpts(key), true);
    }

    this.updatePlayerFaceFrame();
    this.syncPlayerFacePosition();
    if (!this.useGhostAppearance) {
      this.syncEquippedHeldItemVisuals();
    }
  }

  private updatePlayerFaceFrame() {
    if (!this.playerFace) return;

    this.playerFace.setFrame(
      getFaceFrame(
        this.getVisualRace(),
        this.getVisualGender(),
        this.selectedFaceIndex,
        this.facing
      )
    );
  }

  private syncPlayerFacePosition() {
    this.ensureEntitySyncReady();
    if (!this.entitySync) return;
    this.entitySync.syncPlayerFacePosition();
  }

  private syncPlayerNameLabelPosition() {
    this.ensureEntitySyncReady();
    if (!this.entitySync) return;
    this.entitySync.syncPlayerNameLabelPosition();
  }

  private getEquippedGearContext(): EquippedGearSyncContext {
    return {
      player: this.player,
      facing: this.facing,
      isMoving: this.isMoving,
      useGhostAppearance: this.useGhostAppearance,
      equipment: this.equipment,
      weaponSprite: this.equippedWeaponSprite,
      shieldSprite: this.equippedShieldSprite,
      helmetSprite: this.equippedHelmetSprite,
    };
  }

  private syncEquippedHeldItemVisuals() {
    this.ensureEntitySyncReady();
    if (!this.entitySync) return;
    this.entitySync.syncEquippedHeldItemVisuals();
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

  private syncMobSpriteOrigin(dummy: DummyState) {
    if (dummy.imperiumSpriteConfig) {
      dummy.sprite.setOrigin(0.5, 1);
      return;
    }
    const model = MOB_MODELS[dummy.modelId];
    dummy.sprite.setOrigin(0.5, model.facingOriginY?.[dummy.facing] ?? 1);
  }

  private syncDummyWorldPosition(dummy: DummyState) {
    this.syncMobSpriteOrigin(dummy);
    const feet = dummy.imperiumSpriteConfig
      ? tileToFeetWorld(dummy.tileX, dummy.tileY, TILE_SIZE)
      : this.getMobFeetWorld(dummy.modelId, dummy.tileX, dummy.tileY);
    dummy.sprite.setPosition(feet.x, feet.y);
    const depth = this.depthFromFeetY(feet.y);
    dummy.sprite.setDepth(depth);
    this.syncMobFaceForDummy(dummy);
    dummy.hpLabel.setPosition(feet.x, feet.y - 30);
    dummy.hpLabel.setDepth(depth + 3);
    this.mobController.rebuildHitbox(dummy);
  }

  private attachMobFaceIfNeeded(dummy: DummyState, facing: Facing = dummy.facing) {
    if (dummy.imperiumSpriteConfig) {
      // Los NPCs del catálogo Imperium no usan el sistema de face overlay de mobs clásicos
      return;
    }
    if (!mobHasFaceOverlay(dummy.modelId)) {
      dummy.face?.destroy();
      dummy.face = undefined;
      return;
    }
    if (!dummy.face) {
      dummy.face = createMobFaceSpriteIfNeeded(this, dummy.modelId, facing);
      if (dummy.face && this.uiCamera) {
        this.uiCamera.ignore(dummy.face);
      }
    }
    this.syncMobFaceForDummy(dummy);
  }

  private syncMobFaceForDummy(dummy: DummyState) {
    if (!dummy.face) {
      return;
    }
    syncMobFaceSprite(dummy.sprite, dummy.face, dummy.modelId, dummy.facing);
    dummy.face.setDepth(dummy.sprite.depth + 0.02);
    dummy.face.setVisible(dummy.sprite.visible);
  }

  private isMapTileWalkable(tileX: number, tileY: number): boolean {
    return isSharedMapTileWalkable(
      this.currentMapId,
      tileX,
      tileY,
      this.mapTileOverrides
    );
  }

  private isTileOccupiedByRemotePlayer(tileX: number, tileY: number): boolean {
    if (!this.isMultiplayerActive()) {
      return false;
    }
    return (
      this.multiplayer?.getRemotePlayers()?.isTileOccupiedByRemote(tileX, tileY, this.currentMapId) ??
      false
    );
  }

  private isTileOccupiedByStaticNpc(
    tileX: number,
    tileY: number,
    mapId = this.currentMapId
  ): boolean {
    return getNpcOccupiedTiles(mapId).some((tile) => tile.x === tileX && tile.y === tileY);
  }

  private isTileWalkable(tileX: number, tileY: number): boolean {
    if (!this.isMapTileWalkable(tileX, tileY)) {
      return false;
    }

    if (isTileBlockedByMapObject(this.currentMap.objects, tileX, tileY)) {
      return false;
    }

    if (this.isTileOccupiedByStaticNpc(tileX, tileY)) {
      return false;
    }

    if (this.isTileOccupiedByRemotePlayer(tileX, tileY)) {
      return false;
    }

    const blocksByDummy = this.dummies.some((dummy) => {
      if (!dummy.alive || this.currentMapId !== dummy.mapId) return false;
      return this.getDummyBlockedTiles(dummy).some((occupiedTile) => {
        return occupiedTile.x === tileX && occupiedTile.y === tileY;
      });
    });
    if (blocksByDummy) {
      return false;
    }

    return true;
  }

  private syncDummyVisibilityForCurrentMap() {
    this.mobController.syncVisibilityForCurrentMap();
  }

  private updateMobAi() {
    if (!this.player) return;
    this.mobAiSystem.update(this.dummies, this.time.now);
  }

  private startDummyStep(dummy: DummyState, nextTileX: number, nextTileY: number, facing: Facing): boolean {
    return this.mobAiSystem.startDummyStep(dummy, nextTileX, nextTileY, facing);
  }

  private stopDummyMovement(dummy: DummyState) {
    this.mobAiSystem.stopDummyMovement(dummy);
  }

  private isTileWalkableForMob(tileX: number, tileY: number, source: DummyState): boolean {
    if (!this.isMapTileWalkable(tileX, tileY)) return false;
    if (tileX === this.playerTileX && tileY === this.playerTileY) return false;
    if (this.isTileOccupiedByStaticNpc(tileX, tileY)) {
      return false;
    }

    const blockedByAnotherMob = this.dummies.some((dummy) => {
      if (dummy === source || !dummy.alive || dummy.mapId !== this.currentMapId) return false;
      if (source.isShowcase && dummy.isShowcase) return false;
      return this.getDummyBlockedTiles(dummy).some((occupiedTile) => {
        return occupiedTile.x === tileX && occupiedTile.y === tileY;
      });
    });
    return !blockedByAnotherMob;
  }

  private resolveFacingTowardsTargetTile(
    fromTileX: number,
    fromTileY: number,
    toTileX: number,
    toTileY: number,
    fallbackFacing: Facing
  ): Facing {
    return this.mobAiSystem.resolveFacingTowardsTargetTile(fromTileX, fromTileY, toTileX, toTileY, fallbackFacing);
  }

  private cancelMobLocalRespawn(dummy: DummyState) {
    if (dummy.respawnTimer) {
      dummy.respawnTimer.remove(false);
      dummy.respawnTimer = undefined;
    }
  }

  /** Muerte visual sincronizada desde el servidor (sin XP, drops ni respawn local). */
  applyMobDeathFromServer(dummy: DummyState) {
    if (!dummy.alive) {
      return;
    }
    this.cancelMobLocalRespawn(dummy);
    if (this.inspectedDummyId === dummy.id) {
      this.inspectedDummyId = null;
    }
    this.stopDummyMovement(dummy);
    dummy.netMoveQueue = [];
    dummy.netMoveTargetTile = undefined;
    dummy.isMoving = false;
    dummy.alive = false;
    dummy.nextAiMoveAt = 0;
    dummy.nextAttackAt = 0;
    dummy.immobilizedUntilMs = 0;
    dummy.isAggroed = false;
    dummy.sprite.stop();
    dummy.sprite.clearTint();
    dummy.sprite.setVisible(false);
    dummy.face?.setVisible(false);
    dummy.hpLabel.setVisible(false);
  }

  /** Respawn visual desde el servidor (cancela timers locales de respawn). */
  applyMobReviveFromServer(
    dummy: DummyState,
    netMob: Pick<import("../../shared/types").NetMobState, "hp" | "hpMax" | "tileX" | "tileY" | "facing">
  ) {
    this.cancelMobLocalRespawn(dummy);
    dummy.alive = true;
    dummy.hp = netMob.hp;
    dummy.maxHp = netMob.hpMax;
    dummy.tileX = netMob.tileX;
    dummy.tileY = netMob.tileY;
    dummy.facing = netMob.facing;
    dummy.isAggroed = false;
    dummy.immobilizedUntilMs = 0;
    dummy.isMoving = false;
    dummy.netMoveQueue = [];
    dummy.netMoveTargetTile = undefined;
    this.tweens.killTweensOf(dummy.sprite);
    dummy.sprite.clearTint();
    dummy.sprite.setVisible(true);
    if (dummy.face) {
      dummy.face.setVisible(true);
    }
    this.syncDummyWorldPosition(dummy);
    this.setMobAnimationState(dummy, "idle");
    this.syncDummyVisibilityForCurrentMap();
  }

  private killDummy(dummy: DummyState) {
    if (this.isMultiplayerActive()) {
      this.applyMobDeathFromServer(dummy);
      return;
    }
    this.applyMobDeathFromServer(dummy);
    this.gameUi.addCombatLine(`${dummy.name} fue destruido.`);
    this.killStats.creaturesKilled += 1;
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

  private getCoreStats(): CoreStats {
    this.expireAttributePotionBuffsIfNeeded();
    const natural = resolveCoreStats(this.selectedRace, this.selectedClass);
    return applyStatsWithPotionBuffs(natural, this.attributeBuffs);
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

  private resetCurrentCharacterProgress() {
    if (!this.characterId) {
      this.gameUi.addChatLine("No hay personaje activo para resetear.");
      return;
    }

    this.stopMeditation();
    if (this.combatController.hasPendingSpellCast()) {
      this.combatController.cancelSpellTargeting();
    }
    this.deathOverlay?.hide();
    this.bankOverlay?.hide();
    this.shopOverlay?.hide();

    this.ensureProgressService().delete(this.characterId);
    deleteBankState(this.characterId);

    this.worldItemManager.clearAll();
    this.inventory = Array(INVENTORY_SLOT_COUNT).fill(null);
    this.equipment = {
      weapon: null,
      shield: null,
      helmet: null,
      armor: null,
    };
    this.equippedOutfit = "base";
    this.equippedArmorVisual = undefined;
    this.deathPhase = "alive";
    this.useGhostAppearance = false;
    this.clearAttributePotionBuffs(false);

    this.learnedSpellIds.clear();
    this.initializeStarterSpells();
    this.killStats = {
      creaturesKilled: 0,
      criminalsKilled: 0,
      usersKilled: 0,
    };
    this.macroBindings = Array.from({ length: 10 }, () => ({
      keyCode: null,
      action: DEFAULT_MACRO_ACTION,
      itemId: null,
      spellId: null,
    }));
    this.bankState = createEmptyBankState();
    this.hasLoadedCharacterProgress = true;

    this.syncCharacterVitalsAndSpells();
    this.spawnStarterInventory();
    this.validateEquippedArmorForRace();
    this.syncEquippedArmorOutfit();
    this.syncEquippedHeldItemVisuals();
    this.refreshKnownSpellsUi();
    this.refreshMacroVisuals();
    this.refreshInventoryUi();
    this.refreshHud();

    const startMap = getMap(START_MAP_ID);
    const centerTileX = Math.floor(startMap.width / 2);
    const centerTileY = Math.floor(startMap.height / 2);
    this.facing = "down";

    if (this.currentMapId !== START_MAP_ID) {
      this.applyMapTransition(
        {
          toMapId: START_MAP_ID,
          toTileX: centerTileX,
          toTileY: centerTileY,
          facing: "down",
        },
        { silent: true }
      );
    } else {
      this.playerTileX = centerTileX;
      this.playerTileY = centerTileY;
      const pos = this.getPlayerFeetWorldForTile(centerTileX, centerTileY);
      this.player.setPosition(pos.x, pos.y);
      this.syncPlayerFacePosition();
      this.playFacingAnim("idle");
      this.refreshMapLocationLabel();
      this.refreshMinimap();
    }

    patchSavedCharacterMeta(this.characterId, {
      level: this.playerProgress.level,
      homeMapId: this.homeMapId,
    });
    this.persistCharacterProgress();
    this.playSpawnEffect();
    this.gameUi.addChatLine(
      `Progreso reseteado. Empezás de nuevo con ${TEST_START_GOLD.toLocaleString("es-AR")} de oro.`
    );
  }

  private applyTestStartingVitals() {
    this.playerProgress.hpMax = TEST_START_HP_MAX;
    this.playerProgress.hp = TEST_START_HP;
    this.playerProgress.gold = TEST_START_GOLD;
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
      this.refreshInventoryUsability();
    }

    this.refreshHud();
    this.scheduleCharacterProgressSave();
  }

  private scheduleDummyRespawn(dummy: DummyState) {
    if (dummy.isShowcase || dummy.respawnMs <= 0 || this.isMultiplayerActive()) {
      return;
    }
    this.cancelMobLocalRespawn(dummy);
    dummy.respawnTimer = this.time.delayedCall(dummy.respawnMs, () => {
      dummy.respawnTimer = undefined;
      const spawnTile =
        dummy.fixedSpawnTile ??
        (this.isMultiplayerActive()
          ? { x: dummy.tileX, y: dummy.tileY }
          : this.pickRandomMobSpawnTile(dummy.spawnConfig));
      dummy.hp = dummy.maxHp;
      dummy.alive = true;
      dummy.isMoving = false;
      dummy.tileX = spawnTile.x;
      dummy.tileY = spawnTile.y;
      dummy.isAggroed = false;
      dummy.immobilizedUntilMs = 0;
      if (dummy.behavior === "peaceful") {
        dummy.nextAiMoveAt =
          this.time.now + Phaser.Math.Between(PEACEFUL_WANDER_MIN_MS, PEACEFUL_WANDER_MAX_MS);
      }
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
          !dummy.isShowcase &&
          dummy.mapId === this.currentMapId &&
          this.getDummyOccupiedTiles(dummy).some(
            (occupiedTile) => occupiedTile.x === tile.x && occupiedTile.y === tile.y
          )
      ) ?? null
    );
  }

  private getDummyHitTile(dummy: DummyState): { x: number; y: number } {
    return { x: dummy.tileX, y: dummy.tileY + Math.round(dummy.hitboxOffsetY / TILE_SIZE) };
  }

  /** Tiles que conforman la caja de objetivo (click, hechizos, alcance). */
  private getDummyTargetTiles(dummy: DummyState): { x: number; y: number }[] {
    const hitTile = this.getDummyHitTile(dummy);
    return getMobFootprintTiles(
      hitTile.x,
      hitTile.y,
      dummy.hitboxWidthTiles,
      dummy.hitboxHeightTiles
    );
  }

  /** Footprint usado para bloqueo de movimiento (ancla del mob en tileX/tileY). */
  private getDummyBlockedTiles(dummy: DummyState): { x: number; y: number }[] {
    return getMobFootprintTiles(
      dummy.tileX,
      dummy.tileY,
      dummy.hitboxWidthTiles,
      dummy.hitboxHeightTiles
    );
  }

  private getDummyOccupiedTilesLarge(dummy: DummyState): { x: number; y: number }[] {
    const hitTile = this.getDummyHitTile(dummy);
    const occupied: { x: number; y: number }[] = [];
    const startOffset = -(dummy.sizeTiles - 1);
    for (let oy = startOffset; oy <= 0; oy += 1) {
      for (let ox = startOffset; ox <= 0; ox += 1) {
        occupied.push({ x: hitTile.x + ox, y: hitTile.y + oy });
      }
    }
    return occupied;
  }

  private getMobHitboxHeightPx(dummy: DummyState): number {
    return dummy.hitboxHeightTiles * TILE_SIZE * MOB_HITBOX_HEIGHT_RATIO;
  }

  private getPlayerBodyHitboxConfig(): BodyHitboxConfig {
    const isProfile = this.facing === "left" || this.facing === "right";
    return {
      width: isProfile ? PLAYER_HITBOX_PROFILE_WIDTH_PX : PLAYER_HITBOX_WIDTH_PX,
      height: PLAYER_HITBOX_HEIGHT_PX,
      offsetX: PLAYER_HITBOX_OFFSET_X,
      offsetY: PLAYER_HITBOX_OFFSET_Y,
    };
  }

  private getPlayerHitboxAreaRect(sprite: Phaser.GameObjects.Sprite): Phaser.Geom.Rectangle {
    return buildHitboxFrameRect(sprite, this.getPlayerBodyHitboxConfig());
  }

  private setupPlayerHitboxInteraction() {
    this.setupPlayerHitboxInteractionFor(this.player);
  }

  private setupPlayerHitboxInteractionFor(player: Phaser.GameObjects.Sprite) {
    const hitArea = this.getPlayerHitboxAreaRect(player);
    player.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    player.input!.cursor = "pointer";
  }

  private refreshPlayerHitboxInteraction() {
    if (!this.player.input) {
      this.setupPlayerHitboxInteraction();
      return;
    }
    this.player.input.hitArea = this.getPlayerHitboxAreaRect(this.player);
  }

  private drawHitboxDebugOverlay() {
    if (!this.hitboxDebugEnabled || !this.player) {
      this.hitboxDebugGraphics?.clear().setVisible(false);
      return;
    }

    if (!this.hitboxDebugGraphics || !this.hitboxDebugGraphics.active) {
      this.hitboxDebugGraphics = this.add.graphics().setDepth(50_000);
      if (this.uiCamera) {
        this.uiCamera.ignore(this.hitboxDebugGraphics);
      }
    }

    const g = this.hitboxDebugGraphics;
    g.clear().setVisible(true);

    const strokeRect = (rect: Phaser.Geom.Rectangle, color: number, alpha = 0.95) => {
      g.lineStyle(2, color, alpha);
      g.strokeRect(rect.x, rect.y, rect.width, rect.height);
    };

    const playerHit = getInteractiveHitAreaWorldBounds(this.player);
    if (playerHit) {
      strokeRect(playerHit, 0x44ff66);
    }

    this.multiplayer?.getRemotePlayers()?.forEachVisibleBody((body) => {
      const rect = getInteractiveHitAreaWorldBounds(body);
      if (rect) {
        strokeRect(rect, 0xffdd44);
      }
    });

    for (const dummy of this.dummies) {
      if (!dummy.alive || dummy.mapId !== this.currentMapId) {
        continue;
      }

      const clickHit = getInteractiveHitAreaWorldBounds(dummy.sprite);
      if (clickHit) {
        strokeRect(clickHit, 0xff8888, 0.7);
      }

      for (const tile of this.getDummyTargetTiles(dummy)) {
        strokeRect(tileToWorldRect(tile.x, tile.y, TILE_SIZE), 0xff2222);
      }
    }

    this.npcManager?.forEachInteractiveHitArea((rect) => {
      strokeRect(rect, 0x55ddff);
    });
  }

  private findPlayerAtWorldPoint(worldX: number, worldY: number): boolean {
    if (containsWorldPointInHitArea(this.player, worldX, worldY)) {
      return true;
    }
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    return tileX === this.playerTileX && tileY === this.playerTileY;
  }

  private findRemotePlayerAtWorldPoint(worldX: number, worldY: number): { tileX: number, tileY: number } | null {
    const remote = this.multiplayer?.getRemotePlayers()?.findRemoteAtWorldPoint(worldX, worldY);
    if (!remote) {
      return null;
    }
    return { tileX: remote.tileX, tileY: remote.tileY };
  }

  private isPendingResurrectSpell(): boolean {
    const spell = this.combatController.getPendingSpellCast();
    if (!spell) {
      return false;
    }
    return (
      isResurrectSpellId(spell.idSpell) ||
      isResurrectSpell(spell.idSpell) ||
      spell.nombre === "Resucitar"
    );
  }

  private tryCastPendingSpellOnAllyFromPointer(
    pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[]
  ): boolean {
    const resurrectPending = this.isPendingResurrectSpell();

    for (const gameObject of currentlyOver) {
      if (gameObject === this.player) {
        this.combatController.tryCastSpellOnPlayer();
        return true;
      }
      const remote = this.multiplayer?.getRemotePlayers()?.getRemoteBySprite(gameObject);
      if (remote) {
        if (remote.isGhost || remote.hp <= 0) {
          if (resurrectPending) {
            this.combatController.tryCastResurrectOnGhost(
              remote.tileX,
              remote.tileY,
              remote.id
            );
            return true;
          }
          continue;
        }
        this.combatController.tryCastSpellOnPlayer(
          remote.tileX,
          remote.tileY,
          remote.id
        );
        return true;
      }
    }

    if (this.findPlayerAtWorldPoint(pointer.worldX, pointer.worldY)) {
      this.combatController.tryCastSpellOnPlayer();
      return true;
    }

    if (resurrectPending) {
      const hitGhost = this.multiplayer
        ?.getRemotePlayers()
        ?.findRemoteGhostAtWorldPoint(pointer.worldX, pointer.worldY);
      if (hitGhost) {
        this.combatController.tryCastResurrectOnGhost(
          hitGhost.tileX,
          hitGhost.tileY,
          hitGhost.id
        );
        return true;
      }
    }

    const hitRemote = this.findRemotePlayerAtWorldPoint(pointer.worldX, pointer.worldY);
    if (hitRemote) {
      this.combatController.tryCastSpellOnPlayer(hitRemote.tileX, hitRemote.tileY);
      return true;
    }

    return false;
  }

  private tryCastPendingResurrectFromPointer(
    pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[]
  ): boolean {
    const remotes = this.multiplayer?.getRemotePlayers();
    if (!remotes) {
      return false;
    }

    for (const gameObject of currentlyOver) {
      const remote = remotes.getRemoteBySprite(gameObject);
      if (remote && (remote.isGhost || remote.hp <= 0)) {
        this.combatController.tryCastResurrectOnGhost(
          remote.tileX,
          remote.tileY,
          remote.id
        );
        return true;
      }
    }

    const ghostAtPointer = remotes.findRemoteGhostAtWorldPoint(
      pointer.worldX,
      pointer.worldY
    );
    if (ghostAtPointer) {
      this.combatController.tryCastResurrectOnGhost(
        ghostAtPointer.tileX,
        ghostAtPointer.tileY,
        ghostAtPointer.id
      );
      return true;
    }

    const clickTileX = Math.floor(pointer.worldX / TILE_SIZE);
    const clickTileY = Math.floor(pointer.worldY / TILE_SIZE);
    const nearest = remotes.findNearestRemoteGhostInRange(
      this.playerTileX,
      this.playerTileY,
      RESURRECT_MAX_TILE_DISTANCE,
      clickTileX,
      clickTileY
    );
    if (nearest) {
      this.combatController.tryCastResurrectOnGhost(
        nearest.tileX,
        nearest.tileY,
        nearest.id
      );
      return true;
    }

    const nearestToCaster = remotes.findNearestRemoteGhostInRange(
      this.playerTileX,
      this.playerTileY,
      RESURRECT_MAX_TILE_DISTANCE
    );
    if (nearestToCaster) {
      this.combatController.tryCastResurrectOnGhost(
        nearestToCaster.tileX,
        nearestToCaster.tileY,
        nearestToCaster.id
      );
      return true;
    }

    return false;
  }

  private findDummyAtTile(tileX: number, tileY: number): DummyState | null {
    for (const dummy of this.dummies) {
      if (!dummy.alive || dummy.mapId !== this.currentMapId) {
        continue;
      }
      if (
        this.getDummyTargetTiles(dummy).some(
          (tile) => tile.x === tileX && tile.y === tileY
        )
      ) {
        return dummy;
      }
    }
    return null;
  }

  private findDummyAtWorldPoint(worldX: number, worldY: number): DummyState | null {
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    for (const dummy of this.dummies) {
      if (!dummy.alive || dummy.mapId !== this.currentMapId) {
        continue;
      }
      if (
        this.getDummyTargetTiles(dummy).some(
          (tile) => tile.x === tileX && tile.y === tileY
        )
      ) {
        return dummy;
      }
    }
    return null;
  }

  private setupMobHitboxInteraction(
    sprite: Phaser.GameObjects.Sprite,
    hitboxHeightTiles: number,
    hitboxWidthTiles: number,
    hitboxOffsetYPx = 0
  ) {
    const width = Math.max(1, hitboxWidthTiles) * TILE_SIZE;
    const height = Math.max(1, hitboxHeightTiles) * TILE_SIZE * MOB_HITBOX_HEIGHT_RATIO;
    const hitArea = buildHitboxFrameRect(sprite, {
      width,
      height,
      offsetX: 0,
      offsetY: hitboxOffsetYPx,
    });
    sprite.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    sprite.input!.cursor = "pointer";
  }

  private isWorldPointerBlocked(): boolean {
    return (
      this.gameUi.isChatFocused() ||
      this.gameUi.isConfirmOpen() ||
      this.gameUi.isMacroEditorOpen() ||
      this.gameUi.isStatsOverlayOpen() ||
      (this.bankOverlay?.isOpen() ?? false) ||
      (this.shopOverlay?.isOpen() ?? false) ||
      this.mapController.isWorldMapOpen()
    );
  }

  private tryOpenMerchantNpcFromPointer(
    pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[]
  ): boolean {
    for (const gameObject of currentlyOver) {
      const npc = this.npcManager?.findNpcByGameObject(gameObject);
      if (npc && isMerchantRole(npc.role)) {
        this.tryOpenShopNpc(npc);
        return true;
      }
    }
    const merchant = this.npcManager?.findNpcAtWorldPoint(pointer.worldX, pointer.worldY);
    if (merchant && isMerchantRole(merchant.role)) {
      this.tryOpenShopNpc(merchant);
      return true;
    }
    return false;
  }

  private setupWorldPointerHandlers() {
    this.game.canvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });

    this.input.on(
      "pointerdown",
      (
        pointer: Phaser.Input.Pointer,
        currentlyOver: Phaser.GameObjects.GameObject[]
      ) => {
        if (this.isWorldPointerBlocked()) {
          return;
        }

        if (pointer.rightButtonDown()) {
          if (this.isPlayerDeadOrGhost()) {
            for (const gameObject of currentlyOver) {
              const npc = this.npcManager?.findNpcByGameObject(gameObject);
              if (npc?.role === "priest") {
                this.tryReviveAtPriestNpc(npc);
                return;
              }
            }

            const priest = this.npcManager?.findNpcAtWorldPoint(
              pointer.worldX,
              pointer.worldY
            );
            if (priest?.role === "priest") {
              this.tryReviveAtPriestNpc(priest);
            }
          } else {
            for (const gameObject of currentlyOver) {
              const npc = this.npcManager?.findNpcByGameObject(gameObject);
              if (npc?.role === "banker") {
                this.tryOpenBankNpc(npc);
                return;
              }
            }

            const banker = this.npcManager?.findNpcAtWorldPoint(
              pointer.worldX,
              pointer.worldY
            );
            if (banker?.role === "banker") {
              this.tryOpenBankNpc(banker);
              return;
            }

            if (this.tryOpenMerchantNpcFromPointer(pointer, currentlyOver)) {
              return;
            }
          }
          
          const tileX = Math.floor(pointer.worldX / TILE_SIZE);
          const tileY = Math.floor(pointer.worldY / TILE_SIZE);
          this.multiplayer?.sendInteractMap(tileX, tileY);
          
          return;
        }

        if (this.combatController.hasPendingSpellCast()) {
          const spell = this.combatController.getPendingSpellCast()!;
          if (
            isResurrectSpellId(spell.idSpell) ||
            isResurrectSpell(spell.idSpell) ||
            spell.nombre === "Resucitar"
          ) {
            if (this.tryCastPendingResurrectFromPointer(pointer, currentlyOver)) {
              return;
            }
            this.combatController.cancelSpellTargeting(
              `No hay fantasma aliado a ${RESURRECT_MAX_TILE_DISTANCE} tiles. Hacé click cerca del cuerpo.`
            );
            return;
          }
          if (this.combatController.spellCanTargetDummy(spell)) {
            for (const gameObject of currentlyOver) {
              const dummy = this.dummies.find((entry) => entry.sprite === gameObject);
              if (dummy?.alive) {
                this.combatController.tryCastSpellOnDummy(dummy);
                return;
              }
            }

            const dummy = this.findDummyAtWorldPoint(pointer.worldX, pointer.worldY);
            if (dummy) {
              this.combatController.tryCastSpellOnDummy(dummy);
              return;
            }
          }

          // 2) Aliados (curas/buffs/remover debuff)
          if (this.combatController.spellCanTargetPlayer(spell)) {
            if (this.tryCastPendingSpellOnAllyFromPointer(pointer, currentlyOver)) {
              return;
            }
          }

          // 3) Jugador remoto (daño; el servidor valida facción/PvP)
          if (!this.combatController.spellCanTargetPlayer(spell)) {
            let targetRemote = undefined;
            for (const gameObject of currentlyOver) {
              const remote = this.multiplayer?.getRemotePlayers()?.getRemoteBySprite(gameObject);
              if (remote && !remote.isGhost) {
                targetRemote = remote;
                break;
              }
            }
            if (!targetRemote) {
              const hitRemote = this.findRemotePlayerAtWorldPoint(pointer.worldX, pointer.worldY);
              if (hitRemote) {
                this.combatController.tryCastSpellOnPlayer(hitRemote.tileX, hitRemote.tileY);
                return;
              }
            } else {
              this.combatController.tryCastSpellOnPlayer(targetRemote.tileX, targetRemote.tileY);
              return;
            }
          }

          if (this.gameUi.isPointerOverSidebar(pointer.x, pointer.y)) {
            return;
          }

          this.combatController.cancelSpellTargeting("Lanzamiento cancelado.");
          return;
        }

        for (const gameObject of currentlyOver) {
          if (gameObject === this.player) {
            return;
          }
          const dummy = this.dummies.find((entry) => entry.sprite === gameObject);
          if (dummy?.alive) {
            this.inspectDummy(dummy);
            return;
          }
          const remote = this.multiplayer?.getRemotePlayers()?.getRemoteBySprite(gameObject);
          if (remote) {
            this.inspectRemote(remote);
            return;
          }
        }

        const inspectedDummy = this.findDummyAtWorldPoint(
          pointer.worldX,
          pointer.worldY
        );
        if (inspectedDummy?.alive) {
          this.inspectDummy(inspectedDummy);
          return;
        }

        const remotes = this.multiplayer?.getRemotePlayers();
        const ghostAtPointer = remotes?.findRemoteGhostAtWorldPoint(
          pointer.worldX,
          pointer.worldY
        );
        if (ghostAtPointer) {
          this.inspectRemote(ghostAtPointer);
          return;
        }

        const aliveAtPointer = remotes?.findRemoteAtWorldPoint(
          pointer.worldX,
          pointer.worldY
        );
        if (aliveAtPointer) {
          this.inspectRemote(aliveAtPointer);
          return;
        }

        this.clearInspectedDummy();
      }
    );
  }

  private pickRandomMobSpawnTile(spawn: MobSpawnConfig): { x: number; y: number } {
    return pickSharedMobSpawnTile(spawn.mapId, (tileX, tileY) => {
      if (this.isTileOccupiedByStaticNpc(tileX, tileY, spawn.mapId)) {
        return true;
      }

      if (
        spawn.mapId === this.currentMapId &&
        tileX === this.playerTileX &&
        tileY === this.playerTileY
      ) {
        return true;
      }

      return this.dummies.some(
        (dummy) =>
          dummy.alive &&
          dummy.mapId === spawn.mapId &&
          dummy.tileX === tileX &&
          dummy.tileY === tileY
      );
    });
  }

  private isTileWalkableInMap(map: GameMap, tileX: number, tileY: number): boolean {
    return isSharedMapTileWalkable(map.id, tileX, tileY);
  }

  private getDummyOccupiedTiles(dummy: DummyState): { x: number; y: number }[] {
    return this.getDummyBlockedTiles(dummy);
  }

  private getMobMoveSpeedRatio(modelId: MobModelId): number {
    return MOB_MODELS[modelId].moveSpeedRatio ?? MOB_DEFAULT_MOVE_SPEED_RATIO;
  }

  private getMobStepDurationMs(modelId: MobModelId): number {
    const ratio = this.getMobMoveSpeedRatio(modelId);
    return Math.ceil(STEP_DURATION_MS / ratio);
  }

  private computeMobWalkFrameRate(modelId: MobModelId): number {
    const model = MOB_MODELS[modelId];
    const walkStart = model.walkStartFrame ?? 0;
    const walkCount =
      model.walkAnimFrameCount ?? Math.max(1, model.moveFrameCount - walkStart);
    const stepSeconds = this.getMobStepDurationMs(modelId) / 1000;
    return walkCount / stepSeconds;
  }

  private setMobAnimationState(dummy: DummyState, state: "idle" | "walk") {
    this.syncMobSpriteOrigin(dummy);
    if (dummy.imperiumSpriteConfig) {
      if (state === "walk") {
        playImperiumNpcWalkAnim(this, dummy.sprite, dummy.npcId!, dummy.imperiumSpriteConfig, dummy.facing);
      } else {
        playImperiumNpcIdleFrame(dummy.sprite, dummy.imperiumSpriteConfig, dummy.facing);
      }
      this.syncMobFaceForDummy(dummy);
      return;
    }
    if (state === "walk") {
      playMobWalkAnimation(dummy.sprite, dummy.modelId, dummy.facing);
    } else {
      playMobIdleFrame(dummy.sprite, dummy.modelId, dummy.facing);
    }
    this.syncMobFaceForDummy(dummy);
  }

  private registerImperiumNpcWalkAnimations(): void {
    for (const entry of IMPERIUM_NPC_CATALOG) {
      if (!entry.visual || entry.visual.status !== "ready") continue;
      const config = getImperiumNpcSpriteConfigFromCatalog(entry);
      if (!config) continue;
      registerImperiumNpcWalkAnims(this, entry.npcId, config);
    }
  }

  private registerSpellAnimations() {
    ALL_FX_SHEETS.forEach((fx) => {
      const animKey = spellEffectAnimKey(fx.idSpell);
      if (this.anims.exists(animKey)) {
        return;
      }

      const texture = this.textures.get(fx.sheetKey);
      if (texture.key === "__MISSING") {
        return;
      }

      const frames = fx.frameSequence
        ? fx.frameSequence.map((frame) => ({ key: fx.sheetKey, frame }))
        : this.anims.generateFrameNumbers(fx.sheetKey, {
            start: 0,
            end: fx.frameCount - 1,
          });

      this.anims.create({
        key: animKey,
        frames,
        frameRate: fx.frameRate,
        repeat: 0,
      });
    });
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

  startResurrectChannelEffect(
    casterId: string,
    tileX: number,
    tileY: number,
    endsAtMs: number
  ) {
    this.stopResurrectChannelEffect(casterId);

    const fxConfig = getSpellEffectConfig(RESURRECT_SPELL_ID);
    if (!fxConfig) {
      return;
    }

    const animKey = spellEffectAnimKey(RESURRECT_SPELL_ID);
    if (!this.anims.exists(animKey)) {
      return;
    }

    const { x, y } = tileToFeetWorld(tileX, tileY, TILE_SIZE);
    const worldX = x + (fxConfig.offsetX ?? 0);
    const worldY = y + (fxConfig.offsetY ?? 0);

    const sprite = this.add
      .sprite(worldX, worldY, fxConfig.sheetKey, getSpellEffectFirstFrame(fxConfig))
      .setOrigin(fxConfig.originX ?? 0.5, fxConfig.originY ?? 0.5)
      .setDepth(this.depthFromFeetY(y) + 1)
      .setScale(fxConfig.scale ?? 1)
      .setBlendMode(Phaser.BlendModes.ADD);

    if (fxConfig.tint != null) {
      sprite.setTint(fxConfig.tint);
    }
    if (this.uiCamera) {
      this.uiCamera.ignore(sprite);
    }

    sprite.play({ key: animKey, repeat: -1 });
    this.resurrectChannelFxByCasterId.set(casterId, sprite);

    const remainingMs = Math.max(0, endsAtMs - Date.now());
    if (remainingMs > 0) {
      this.time.delayedCall(remainingMs, () => this.stopResurrectChannelEffect(casterId));
    }
  }

  stopResurrectChannelEffect(casterId: string) {
    const sprite = this.resurrectChannelFxByCasterId.get(casterId);
    if (!sprite) {
      return;
    }
    sprite.destroy();
    this.resurrectChannelFxByCasterId.delete(casterId);
  }

  private lastSpellCastSoundAt = 0;
  private lastSpellCastSoundId = -1;

  /** Sonido de lanzamiento (WAV de IAO); evita doble play local en ~350 ms. */
  private playSpellCastSound(spellId: number) {
    const now = this.time.now;
    if (
      this.lastSpellCastSoundId === spellId &&
      now - this.lastSpellCastSoundAt < 350
    ) {
      return;
    }
    const wav = getSpellWav(spellId);
    if (playSpellWav(this, wav)) {
      this.lastSpellCastSoundAt = now;
      this.lastSpellCastSoundId = spellId;
      return;
    }
    if (getSpellEffectConfig(spellId)?.playHitSound) {
      this.playSyntheticHitSound();
      this.lastSpellCastSoundAt = now;
      this.lastSpellCastSoundId = spellId;
    }
  }

  private playSpellEffect(spellId: number, tileX: number, tileY: number) {
    this.playSpellCastSound(spellId);

    const fxConfig = getSpellEffectConfig(spellId);
    if (!fxConfig) {
      return;
    }

    const animKey = spellEffectAnimKey(spellId);
    if (!this.anims.exists(animKey)) {
      return;
    }

    const { x, y } = tileToFeetWorld(tileX, tileY, TILE_SIZE);
    const offsetX = fxConfig.offsetX ?? 0;
    const offsetY = fxConfig.offsetY ?? 0;
    const originX = fxConfig.originX ?? 0.5;
    const originY = fxConfig.originY ?? 0.5;
    const worldX = x + offsetX;
    const worldY = y + offsetY;

    const sprite = this.add
      .sprite(worldX, worldY, fxConfig.sheetKey, getSpellEffectFirstFrame(fxConfig))
      .setOrigin(originX, originY)
      .setDepth(this.depthFromFeetY(y) + 1)
      .setScale(fxConfig.scale ?? 1)
      .setBlendMode(Phaser.BlendModes.ADD);

    if (fxConfig.tint != null) {
      sprite.setTint(fxConfig.tint);
    }

    if (this.uiCamera) {
      this.uiCamera.ignore(sprite);
    }

    const destroyFx = () => {
      if (sprite.active) {
        sprite.destroy();
      }
    };
    sprite.once(`animationcomplete-${animKey}`, destroyFx);

    const played = sprite.play({ key: animKey, repeat: 0 });
    if (!played) {
      destroyFx();
      return;
    }

    if (fxConfig.shakeOnPlay) {
      this.cameras.main.shake(90, 0.0022, true);
    }
  }

  private playSpawnEffect() {
    this.playSpawnEffectAtTile(this.playerTileX, this.playerTileY);
  }

  private playSpawnEffectAtTile(tileX: number, tileY: number) {
    const fx = SPAWN_FX_CONFIG;
    const { x, y } = tileToFeetWorld(tileX, tileY, TILE_SIZE);
    const worldX = x + (fx.offsetX ?? 0);
    const worldY = y + (fx.offsetY ?? 0);

    const sprite = this.add
      .sprite(worldX, worldY, fx.sheetKey, 0)
      .setOrigin(fx.originX ?? 0.5, fx.originY ?? 0.5)
      .setDepth(this.depthFromFeetY(y) - 1)
      .setScale(fx.scale ?? 1)
      .setAlpha(0.6)
      .setBlendMode(Phaser.BlendModes.ADD);

    if (this.uiCamera) {
      this.uiCamera.ignore(sprite);
    }

    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      sprite.destroy();
    });
    sprite.play(spellEffectAnimKey(SPAWN_FX_ID));
  }

  private playSyntheticHitSound() {
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
}
