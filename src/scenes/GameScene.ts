import Phaser from "phaser";
import { MeditationSystem } from "../systems/MeditationSystem";
import { registerMeditationAnimations } from "../systems/meditationVisuals";
import { registerPortalAnimations } from "../maps/portalVisuals";
import { DeathSystem, type DeathPhase } from "../systems/DeathSystem";
import { ShopBankSystem } from "../systems/ShopBankSystem";
import { isMmoServerAuthorityEnabled, OFFLINE_GAMEPLAY_MESSAGE } from "../game/mmoMode";
import { registerEmergencyProgressFlush } from "../game/emergencyProgressFlush";
import { STEP_DURATION_MS, TILE_SIZE } from "../config";
import { loadKeybindings, type Keybindings } from "../config/keybindings";
import {
  findTransition,
  getMap,
  getScopedPreloadMapIds,
  START_MAP_ID,
  type GameMap,
} from "../maps";
import { getTileDefinition, TILE } from "../maps/tileDefinitions";
import { isTileBlockedByMapObject } from "../maps/mapObjects";
import {
  applyPlayerOrigin,
  BOAT_BODY_TEXTURE_KEY,
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
  buildEquippedArmorVisualFromItem,
  type PlayerArmorVisualOptions,
} from "../player/playerSprites";
import { formatPlayerWorldName } from "../player/playerNameLabel";
import {
  canRaceEquipArmor,
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
import { normalizeOutfit } from "../../game-data/outfits";
import { orderSpellIds } from "../../shared/spellListOrder";

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
import { ClanCreationOverlay } from "../ui/clanCreationOverlay";
import { getAowebSkinRegions, scaleSkinRect } from "../ui/aowebSkinLayout";
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
import { DEFAULT_HOME_MAP_ID, getPriestSpawnForHome, GHOST_PLAYER_ALPHA, PRIEST_REVIVE_MAX_TILE_DISTANCE } from "../game/deathConfig";
import {
  ATTRIBUTE_POTION_GAIN_MAX,
  ATTRIBUTE_POTION_GAIN_MIN,
  BANK_SLOT_COUNT,
  STAT_MIN,
} from "../../game-data/constants";
import {
  applyLevelUpVitals,
  getMaxVitalsAtLevel,
  VITAL_GROWTH_MAX_LEVEL,
} from "../../game-data/vitalProgression";
import { ADMIN_GM_HP_MAX, ADMIN_GM_MP_MAX } from "../../game-data/constants";
import {
  buildStarterLoadout,
  getStarterLearnedSpellIds,
} from "../../game-data/starterLoadout";
import {
  applyStatsWithPotionBuffs,
  ATTRIBUTE_POTION_BUFF_DURATION_MS,
  ATTRIBUTE_POTION_BUFF_MAX,
  resolveCoreStats,
  STAT_MAX,
  type CoreStats,
} from "../game/characterStats";
import { getImmobilizePlayerDurationMs } from "../../shared/combat";
import { canRenegade } from "../../shared/faction";
import {
  isMapTileWalkable as isSharedMapTileWalkable,
  getMapSpawnTile,
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
import { SpellShopOverlay } from "../ui/spellShopOverlay";
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
import { WEAPONS } from "../../game-data/items/catalog";
import {
  ALL_ITEM_IDS,
  getItemDefinition,
  tryGetItemDefinition,
  itemDropsOnDeath,
  ITEM_DEFINITIONS,
  type EquipmentSlot,
  type ItemId,
} from "../../game-data/items/definitions";
import { canUseItem } from "../game/itemUsability";
import { tryUseItemSpecial } from "../game/itemSpecialUseHandler";
import { resolveMapTile } from "../../shared/mapTileOverrides";
import { BOAT_ITEM_IDS, canNavigateToTile, canStartNavigationAtTile } from "../../shared/navigation";
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
import { playFootstepWav } from "../audio/footstepWav";
import {
  playAlternatingNamedWavs,
  playNamedWav,
  preloadNamedWavs,
} from "../audio/namedWav";
import { stopMenuMusic } from "../audio/menuMusic";
import { preloadSpellWavs, playSpellNamedWav, playSpellWav } from "../audio/spellWav";
import { getSpellNamedWav } from "../../game-data/spellEffects";
import { hasArrowStack } from "../../game-data/rangedCombat";
import { resolveMobHitSoundId } from "../../game-data/mobCombatSounds";
import { isWithinSoundHearingRange } from "../../shared/soundRange";
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
  TRAINING_DUMMY_HP,
  TRAINING_DUMMY_ID,
} from "../../shared/mobSpawns";
import {
  MOB_MODELS,
  MOB_SPAWNS,
  type MobBehavior,
  type MobDropConfig,
  type MobModelId,
} from "../../game-data/mobs";
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
  GameSceneSoundController,
  GameSceneMobController,
  GameSceneMapController,
  GameSceneEntitySync,
  GameSceneLocalPlayerVisuals,
  processGameSceneFrameInput,
  runGameScenePreload,
  resolveGameScenePreloadContext,
  scheduleGameSceneBackgroundPreload,
  queueAdjacentMapPreload,
  ensureMapEntityVisualAssetsLoaded,
  type GameScenePreloadContext,
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
  getInspectChatColor,
  expRequiredForLevel,
  getBaseVitalsFromStats,
  macroSpellTextureKey,
  CLASS_USES_MANA,
  DEFAULT_MACRO_ACTION,
  DEFAULT_MOB_HITBOX_HEIGHT_TILES,
  DEFAULT_MOB_HITBOX_OFFSET_Y,
  DEFAULT_MOB_HITBOX_WIDTH_TILES,
  DEFAULT_PLAYER_NAME,
  HUD_AGILITY_POTION_TEXTURE_KEY,
  HUD_STRENGTH_POTION_TEXTURE_KEY,
  MOB_HITBOX_HEIGHT_RATIO,
  PLAYER_HITBOX_HEIGHT_PX,
  PLAYER_HITBOX_OFFSET_X,
  PLAYER_HITBOX_OFFSET_Y,
  PLAYER_HITBOX_PROFILE_WIDTH_PX,
  PLAYER_HITBOX_WIDTH_PX,
  TEST_HEALTH_POTION_STACK,
  TEST_MANA_POTION_STACK,
  TEST_START_GOLD,
  TREE_TEXTURE_KEY,
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
  private clanCreationOverlay?: ClanCreationOverlay;
  private pingFpsEl!: HTMLDivElement;
  private pingFpsVisible: boolean = true;
  private pingFpsToggleHandler?: (e: KeyboardEvent) => void;
  private lastPingMs: number | null = null;
  private nextPingTime: number = 0;
  private soundController!: GameSceneSoundController;
  private mapController!: GameSceneMapController;
  private entitySync!: GameSceneEntitySync;
  private localPlayerVisuals!: GameSceneLocalPlayerVisuals;
  private inventoryController!: GameSceneInventoryController;
  private combatController!: GameSceneCombatController;

  private currentMap!: GameMap;
  private currentMapId = START_MAP_ID;
  private localAdminSpeedMultiplier = 1;
  /** Puertas abiertas/cerradas (solo mapa actual; no muta el GameMap importado). */
  private readonly mapTileOverrides = new Map<string, number>();

  private playerTileX = 4;
  private lastOfflineGameplayWarnAt = 0;
  private playerTileY = 4;

  private isMoving = false;
  private isNavigating = false;
  /** Evita encolar varios pasos en MP antes de la confirmación del servidor. */
  private desiredFacing: Facing | null = null;
  private isChangingMap = false;
  private facing: Facing = "down";

  private useItemKey!: Phaser.Input.Keyboard.Key;
  private pickupKey!: Phaser.Input.Keyboard.Key;
  private cancelSpellTargetingKey!: Phaser.Input.Keyboard.Key;
  private meditateKey!: Phaser.Input.Keyboard.Key;
  private worldMapToggleKey!: Phaser.Input.Keyboard.Key;
  private partyToggleKey!: Phaser.Input.Keyboard.Key;
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
  private keybindings: Keybindings = loadKeybindings();
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private movementKeyStack: Facing[] = [];
  private bufferedMovementTap: { facing: Facing; expiresAt: number } | null = null;
  private localChatBubbleText?: Phaser.GameObjects.Text;
  private localChatBubbleTimer?: Phaser.Time.TimerEvent;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private equipSelectedSlotKey!: Phaser.Input.Keyboard.Key;
  private dropSelectedSlotKey!: Phaser.Input.Keyboard.Key;
  private equippedOutfit: Outfit = "base";
  private equippedArmorVisual?: PlayerArmorVisualOptions;
  private playerName = DEFAULT_PLAYER_NAME;
  private playerClanName: string | null = null;
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
  private spellListOrder: number[] = [];

  private killStats: PlayerKillStats = {
    creaturesKilled: 0,
    criminalsKilled: 0,
    usersKilled: 0,
  };
  /** Evita FX duplicado si el servidor reenvía spell_fx tras un cast local. */
  private suppressServerSpellFxUntil = 0;
  /** FX de canalización de Resucitar por id de lanzador. */
  private readonly resurrectChannelFxByCasterId = new Map<string, { sprite: Phaser.GameObjects.Sprite; bar: Phaser.GameObjects.Graphics; barBg: Phaser.GameObjects.Graphics; startMs: number; endsAtMs: number }>();
  private inspectedDummyId: string | null = null;
  private playerImmobilizedUntilMs = 0;
  private playerInvisibleUntilMs = 0;
  private wasPlayerImmobilizedLastFrame = false;
  private nextImmobilizedMoveFeedbackAt = 0;
  private meditationSystem!: MeditationSystem;
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
  private preloadContext: GameScenePreloadContext | null = null;
  private loadingOverlay: Phaser.GameObjects.Container | null = null;
  private npcManager?: NpcManager;
  private macroBindings: MacroBinding[] = Array.from({ length: 10 }, () => ({
    keyCode: null,
    action: DEFAULT_MACRO_ACTION,
    itemId: null,
    inventorySlotIndex: null,
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
        setDoorTileOverride(this.currentMapId, this.mapTileOverrides, tileX, tileY, isOpen);
      },
      isMapTileWalkable: (tileX, tileY) => this.isMapTileWalkable(tileX, tileY),
    });
  }

  private initSoundController(): void {
    this.soundController = new GameSceneSoundController({
      scene: this,
      getPlayerTile: () => ({ x: this.playerTileX, y: this.playerTileY }),
      getLocalPlayerId: () => this.mpController?.getPlayerId() ?? null,
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
      useMiscItemFromSlot: (slotIndex) => this.useMiscItemFromSlot(slotIndex),
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
      hasArrowsInInventory: () => hasArrowStack(this.inventory),
      getCoreStats: () => this.getCoreStats(),
      getFacing: () => this.facing,
      getPlayerTile: () => ({ x: this.playerTileX, y: this.playerTileY }),
      getCurrentMapId: () => this.currentMapId,
      hasLearnedSpell: (spellId) => this.learnedSpellIds.has(spellId),
      getSelectedClass: () => this.selectedClass,
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
      sendRangedAttackToServer: (payload) => this.multiplayer!.sendRangedAttack(payload),
      sendCastSpellToServer: (spellId, tileX, tileY, targetPlayerId) =>
        this.multiplayer!.sendCastSpell(spellId, tileX, tileY, targetPlayerId),
      getDummyInAttackRange: () => this.getDummyInAttackRange(),
      getDummyHitTile: (dummy) => this.getDummyHitTile(dummy),
      killDummy: (dummy) => this.killDummy(dummy),
      syncDummyWorldPosition: (dummy) => this.syncDummyWorldPosition(dummy),
      setMobAnimationState: (dummy, state) => this.setMobAnimationState(dummy, state),
      refreshInspectedDummyLabel: () => this.refreshInspectedDummyLabel(),
      getInspectedDummyId: () => this.inspectedDummyId,
      playMobHitSound: (modelId) => this.soundController.playMobHitSound(modelId),
      playSpellEffect: (spellId, tx, ty) => this.playSpellEffect(spellId, tx, ty),
      startResurrectChannelEffect: (casterId, tileX, tileY, endsAtMs) =>
        this.startResurrectChannelEffect(casterId, tileX, tileY, endsAtMs),
      getLocalPlayerId: () => this.mpController.getPlayerId(),
      showSpellMagicWords: (spellId, spellNombre) => {
        const words = getSpellMagicWordsForCast(spellId, spellNombre);
        if (words) {
          this.spellMagicWordsOverlay?.show(words);
        }
        this.soundController.playSpellCastSound(spellId);
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
      hasSpellEnemyTargetAtTile: (tileX, tileY) => this.hasSpellEnemyTargetAtTile(tileX, tileY),
      findDeadAllyPlayerIdAtTile: (tileX, tileY) => {
        const ghost = this.multiplayer
          ?.getRemotePlayers()
          ?.findRemoteGhostAtTile(tileX, tileY);
        return ghost?.id;
      },
      isServerConnected: () => Boolean(this.multiplayer?.isConnected()),
      syncWorldInteractiveCursors: () => this.syncWorldInteractiveCursors(),
    });
  }

  private getWorldInteractiveCursor(): string {
    return this.combatController.hasPendingSpellCast() ||
      this.combatController.hasPendingRangedAttack()
      ? "crosshair"
      : "pointer";
  }

  private applyWorldInteractiveCursor(sprite: Phaser.GameObjects.Sprite): void {
    if (!sprite.input) {
      return;
    }
    sprite.input.cursor = this.getWorldInteractiveCursor();
  }

  private syncWorldInteractiveCursors(): void {
    if (isPhaserObjectLive(this.player)) {
      this.applyWorldInteractiveCursor(this.player);
    }
    for (const dummy of this.dummies) {
      if (isPhaserObjectLive(dummy.sprite)) {
        this.applyWorldInteractiveCursor(dummy.sprite);
      }
    }
    this.multiplayer?.getRemotePlayers()?.forEachVisibleBody((body) => {
      this.applyWorldInteractiveCursor(body);
    });
    this.npcManager?.forEachInteractiveBody((body) => {
      this.applyWorldInteractiveCursor(body);
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
      isServerAuthoritative: () => isMmoServerAuthorityEnabled(),
      onPersist: () => this.scheduleCharacterProgressSave(),
      onInspect: (entry) => this.inspectWorldItem(entry),
    });
  }

  private initLocalPlayerSync(): void {
    this.localPlayerSync = new GameSceneLocalPlayerSync({
      getDeathPhase: () => this.deathPhase,
      getPlayerProgress: () => this.playerProgress,
      applyLocalRevivedFromServer: (hp) => this.deathSystem.applyRevivedFromServer(hp),
      setPlayerProgressFromServer: (patch) => {
        const prevLevel = this.playerProgress.level;
        const leveledUp = patch.level > prevLevel;
        this.playerProgress.level = patch.level;
        if (leveledUp) {
          this.soundController.playLevelUpSoundOnce();
        }
        if (this.isPlayerAdmin()) {
          this.playerProgress.hpMax = patch.hpMax;
          this.playerProgress.mpMax = patch.mpMax;
        } else if (leveledUp) {
          this.applyVitalsForLevelChange(prevLevel, patch.level);
        } else {
          const { hpMax, mpMax } = getMaxVitalsAtLevel(
            this.selectedRace,
            this.selectedClass,
            patch.level,
            {
              constitution: this.getCoreStats().constitution,
              intelligence: this.getCoreStats().intelligence,
            }
          );
          this.playerProgress.hpMax = hpMax;
          this.playerProgress.mpMax = mpMax;
        }
        this.playerProgress.hp = Math.min(this.playerProgress.hpMax, patch.hp);
        this.playerProgress.mp = Math.min(this.playerProgress.mpMax, patch.mp);
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
        this.equippedOutfit = normalizeOutfit(equipment.equippedOutfit);
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
      refreshInventorySlotsUi: () => this.refreshInventorySlotsUi(),
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
      playWeaponEquipSound: () => this.soundController.playWeaponEquipSound(),
      playArmorEquipSound: () => this.soundController.playArmorEquipSound(),
      playPlayerDeathSound: () => this.soundController.playPlayerDeathSound(),
      addCombatLine: (text) => this.gameUi.addCombatLine(text),
      setRemotePlayerGhost: (playerId) =>
        this.multiplayer?.getRemotePlayers()?.setPlayerGhost(playerId),
      updateRemotePlayer: (state, mapId) =>
        this.multiplayer?.updateRemote(state, mapId),
      getLocalPlayerId: () => this.mpController.getPlayerId(),
      getPlayerName: () => this.playerName,
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
        const fromServer = spellIds.filter(
          (id) => Number.isFinite(id) && id > 0
        ) as number[];
        if (
          fromServer.length === 0 &&
          !this.hasLoadedCharacterProgress &&
          this.learnedSpellIds.size > 0
        ) {
          return;
        }
        this.learnedSpellIds.clear();
        for (const id of fromServer) {
          this.learnedSpellIds.add(Math.floor(id));
        }
        if (fromServer.length === 0 && !this.hasLoadedCharacterProgress) {
          this.applyStarterLearnedSpellsForClass(this.selectedClass);
        }
        if (this.shopBankSystem.isSpellShopOpen()) {
          this.shopBankSystem.refreshSpellShopOverlay();
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
      applyLocalFaction: (factionId) => this.applyLocalFaction(factionId),
      applyLocalClanName: (clanName) => this.applyLocalClanName(clanName),
      recordLocalUserKill: () => this.recordLocalUserKill(),
      setInvisibleUntilMs: (ms) => {
        this.playerInvisibleUntilMs = ms;
      },
      setPlayerImmobilizedUntilMs: (ms) => {
        this.playerImmobilizedUntilMs = ms;
      },
      setNavigatingFromServer: (active) => this.setNavigatingFromServer(active),
      setAttributeBuffsFromServer: (buffs) => {
        this.attributeBuffs = buffs;
      },
      setAttributeBuffExpiresAt: (ms) => {
        this.attributeBuffExpiresAt = ms;
      },
      onPlayerLevelUp: (previousLevel, newLevel) => {
        this.onLocalLevelUp(previousLevel, newLevel);
      },
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
      setNavigatingFromServer: (active) => this.setNavigatingFromServer(active),
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
      schedulePersistProgress: () => this.scheduleCharacterProgressSave(),
      cancelScheduledPersist: () => this.progressService?.cancelScheduledPersist(),
      deferConsumableUiWork: (work) => this.time.delayedCall(0, work),
      resetAttributeBuffTimer: () => this.resetAttributePotionTimer(),
      getTimeNow: () => Date.now(),
      playPotionUseSound: () => this.soundController.playPotionUseSound(),
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
          this.mpController.sendSuicide();
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
      getSelectedFaction: () => this.selectedFaction,
      tryBecomeRenegade: () => this.tryBecomeRenegade(),
      requestLogout: () => this.requestLogoutViaCommand(),
    });
  }

  private requestLogoutViaCommand(): void {
    if (this.isMultiplayerActive() && this.multiplayer?.isConnected()) {
      this.mpController.sendRequestLogout();
      return;
    }
    this.returnToCharacterSelect();
  }

  private returnToCharacterSelect(): void {
    this.clearTransientCombatBuffs();
    this.persistCharacterProgress();
    this.mpController?.disconnect({ skipRestoreLocalMobs: true });
    this.scene.start("CharacterSelectScene");
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
      getWorldInteractiveCursor: () => this.getWorldInteractiveCursor(),
      syncDummyWorldPosition: (dummy) => this.syncDummyWorldPosition(dummy),
      attachMobFaceIfNeeded: (dummy, facing) =>
        this.attachMobFaceIfNeeded(dummy, facing),
      setMobAnimationState: (dummy, state) => this.setMobAnimationState(dummy, state),
      syncMobFaceForDummy: (dummy) => this.syncMobFaceForDummy(dummy),
      rebuildMobHitbox: (dummy) => this.mobController.rebuildHitbox(dummy),
      isTileWalkableForMob: (tx, ty, source) =>
        this.isTileWalkableForMob(tx, ty, source),
      isTileOccupiedByStaticNpc: (tx, ty, mapId) =>
        this.isTileOccupiedByStaticNpc(tx, ty, mapId),
      playMobFootstepSound: (_modelId, tileX, tileY) => {
        if (this.soundController.shouldPlayWorldSound(tileX, tileY)) {
          this.soundController.playHeavyMobFootstepSound();
        }
      },
    });
  }

  private initMpController(): void {
    this.mpController = new GameSceneMultiplayerController({
      scene: this,
      uiCamera: this.uiCamera!,
      depthFromFeetY: (feetY) => this.depthFromFeetY(feetY),
      getCurrentMapId: () => this.currentMapId,
      isChangingMap: () => this.isChangingMap,
      getPlayerName: () => this.playerName,
      getCharacterId: () => this.characterId,
      getIsNewCharacterForJoin: () => !this.ensureProgressService().hasProgress(),
      getPlayerTile: () => ({ x: this.playerTileX, y: this.playerTileY }),
      setPlayerTile: (tileX, tileY) => {
        this.playerTileX = tileX;
        this.playerTileY = tileY;
        if (this.isMultiplayerActive()) {
          this.scheduleCharacterProgressSave();
        }
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
      addGlobalLine: (text) => this.gameUi?.addGlobalLine(text),
      addCombatLine: (text) => this.gameUi?.addCombatLine(text),
      playLevelUpSound: () => this.soundController.playLevelUpSoundOnce(),
      playGoldDropSound: () => this.soundController.playGoldDropSound(),
      playAirHitSound: () => this.soundController.playAirHitSound(),
      getWorldInteractiveCursor: () => this.getWorldInteractiveCursor(),
      syncWorldInteractiveCursors: () => this.syncWorldInteractiveCursors(),
      syncLocalVitalsFromServer: (state) => this.localPlayerSync.syncLocalVitalsFromServer(state),
      syncLocalEquipmentFromServer: (state) =>
        this.localPlayerSync.syncLocalEquipmentFromServer(state),
      syncLocalInventoryFromServer: (slots, options) =>
        this.localPlayerSync.syncLocalInventoryFromServer(slots, options),
      syncLocalGoldFromServer: (gold) => this.localPlayerSync.syncLocalGoldFromServer(gold),
      syncLocalProgressFromServer: (exp, expToNext, level) =>
        this.localPlayerSync.syncLocalProgressFromServer(exp, expToNext, level),
      syncLocalWelcomeExtras: (welcome) =>
        this.localPlayerSync.syncLocalWelcomeExtras(welcome),
      getBankState: () => this.shopBankSystem.getBankState(),
      getLearnedSpellIds: () => [...this.learnedSpellIds],
      syncWorldItemsFromServer: (items) => this.localPlayerSync.syncWorldItemsFromServer(items),
      applyWorldItemSpawned: (mapId, item) => {
        if (
          mapId === this.currentMapId &&
          item.itemId !== "gold" &&
          this.soundController.shouldPlayWorldSound(item.tileX, item.tileY)
        ) {
          this.soundController.playDropSound();
        }
        this.localPlayerSync.applyWorldItemSpawned(mapId, item);
      },
      applyWorldItemUpdated: (mapId, item) =>
        this.localPlayerSync.applyWorldItemUpdated(mapId, item),
      applyWorldItemRemoved: (mapId, worldItemId) =>
        this.localPlayerSync.applyWorldItemRemoved(mapId, worldItemId),
      syncMobsFromServer: (mobs) => this.mobController.syncFromServer(mobs),
      applyNetMobState: (mob) => this.mobController.applyNetState(mob),
      applyNetMobLeft: (mobId) => this.mobController.applyNetLeft(mobId),
      handleServerPlayerDied: (playerId, killerId, killerName) =>
        this.localPlayerSync.handleServerPlayerDied(playerId, killerId, killerName),
      getUsersKilled: () => this.killStats.usersKilled,
      handleServerUseItemAck: (ack) => this.consumableController.handleServerUseItemAck(ack),
      handleServerPlayerUpdated: (state) => this.localPlayerSync.handleServerPlayerUpdated(state),
      setLatency: (latency) => this.setLatency(latency),
      handleServerPartyUpdate: (message) => {
        this.gameUi.handleServerPartyUpdate(message);
        const localPlayerId = this.mpController?.getLocalPlayerId() ?? null;
        const remotePartyIds = new Set(
          message.members
            .map((member) => member.id)
            .filter((id) => id !== localPlayerId)
        );
        this.multiplayer?.getRemotePlayers()?.setPartyMemberIds(remotePartyIds);
        this.refreshMinimap();
      },
      handleServerPartyInviteRequest: (message) => this.gameUi.handleServerPartyInviteRequest(message),
      handleServerArenaState: (message) => {
        this.gameUi.updateArenaState(message.state);
        if (message.state.message) {
          this.gameUi.addChatLine(message.state.message);
        }
      },
      handleServerArenaReadyCheck: (message) => {
        this.gameUi.showArenaReadyCheck(message);
        this.gameUi.addChatLine(`Arena encontrada contra ${message.opponent.name}.`);
      },
      handleServerArenaRound: (message) => {
        if (message.status === "countdown" || message.status === "started") {
          this.gameUi.clearArenaReadyCheck();
        }
      },
      handleServerClanCreationStarted: () => this.openClanCreationOverlay(),
      handleServerClanCreated: (clan) => {
        this.applyLocalClanName(clan.name);
        this.soundController.playClanCreatedSound();
        this.gameUi.addChatLine(`Clan creado: ${clan.name}.`);
      },
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
        this.combatController.showCombatNumber(x, y, amount, "damage", source),
      showHealNumber: (x, y, amount, source) =>
        this.combatController.showCombatNumber(x, y, amount, "heal", source),
      playSpellEffect: (spellId, tx, ty, playSound) =>
        this.playSpellEffect(spellId, tx, ty, playSound),
      playSpellEffectOnTarget: (spellId, target, playSound) =>
        this.playSpellEffectOnTarget(spellId, target, playSound),
      shouldPlayWorldSound: (sourceTileX, sourceTileY, sourcePlayerId) =>
        this.soundController.shouldPlayWorldSound(sourceTileX, sourceTileY, sourcePlayerId),
      playSpawnEffectAtTile: (tileX, tileY) => this.playSpawnEffectAtTile(tileX, tileY),
      startResurrectChannelEffect: (casterId, tileX, tileY, endsAtMs) =>
        this.startResurrectChannelEffect(casterId, tileX, tileY, endsAtMs),
      stopResurrectChannelEffect: (casterId) => this.stopResurrectChannelEffect(casterId),
      getSuppressServerSpellFxUntil: () => this.suppressServerSpellFxUntil,
      showRemoteSpellMagicWords: (playerId, words) =>
        this.multiplayer?.getRemotePlayers()?.showSpellMagicWords(playerId, words),
      showPlayerChatBubble: (playerId, text) => this.showPlayerChatBubble(playerId, text),
      getPlayerSprite: () => this.player,
      getLocalPlayerId: () => this.mpController.getPlayerId(),
      applyLocalRevivedFromServer: (hp) => this.deathSystem.applyRevivedFromServer(hp),
      isPlayerDeadOrGhost: () => this.isPlayerDeadOrGhost(),
      playFootstepSound: () => playFootstepWav(this),
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
      updateDynamicMapObject: (tileX, tileY, objIndex) =>
        this.mapController.updateDynamicObject(tileX, tileY, objIndex),
      playMobHitSoundForId: (mobId) => {
        const dummy = this.mobController.findById(mobId);
        if (dummy?.alive) {
          this.soundController.playMobHitSound(dummy.modelId);
        }
      },
      playMeleeMissSound: () => this.soundController.playMeleeMissSound(),
      playArrowHitSound: () => this.soundController.playArrowHitSound(),
      playArrowMissSound: () => this.soundController.playArrowMissSound(),
      playCriticalHitSound: () => this.soundController.playCriticalHitSound(),
      playShieldBlockSound: () => this.soundController.playShieldBlockSound(),
      playDoorSound: () => this.soundController.playDoorSound(),
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
      onLogoutComplete: () => this.returnToCharacterSelect(),
      isPlayerImmobilized: () => this.isPlayerImmobilized(),
      onAuctionCatalog: (auctions) => {
        this.gameUi.showAuctionOverlay({
          auctions,
          inventory: this.inventory,
          playerGold: this.playerProgress?.gold ?? 0,
          playerId: this.characterId,
        });
      },
    });
  }

  private returnToCharacterSelectForDuplicateLogin(message: string) {
    this.gameUi?.addChatLine(message);
    this.returnToCharacterSelect();
  }

  init(data: GameSceneInitData = {}) {
    this.characterSlotIndex = data.slotIndex ?? getActiveCharacterSlotIndex();
    const character = data.character ?? getActiveCharacter();
    if (character) {
      this.applyActiveCharacter(character);
    }
  }

  preload() {
    const { width, height } = this.scale;
    const barWidth = Math.min(360, width - 80);
    const barHeight = 14;
    const barX = (width - barWidth) / 2;
    const barY = height / 2;

    this.dismissLoadingOverlay();
    const loadingOverlay = this.add.container(0, 0);
    loadingOverlay.setDepth(10_000);
    this.loadingOverlay = loadingOverlay;

    const loadingBackdrop = this.add
      .rectangle(width / 2, height / 2, width, height, 0x0d1117, 0.92)
      .setOrigin(0.5);
    loadingOverlay.add(loadingBackdrop);

    const loadingLabel = this.add
      .text(width / 2, barY - 28, "Cargando mundo...", {
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        fontSize: "16px",
        color: "#e6edf3",
      })
      .setOrigin(0.5);
    loadingOverlay.add(loadingLabel);

    const barBg = this.add.graphics();
    barBg.fillStyle(0x1b1f2a, 1);
    barBg.fillRoundedRect(barX, barY, barWidth, barHeight, 4);
    loadingOverlay.add(barBg);

    const barFill = this.add.graphics();
    loadingOverlay.add(barFill);

    const dismissLoadingOverlay = () => {
      this.load.off(Phaser.Loader.Events.PROGRESS, onProgress);
      this.dismissLoadingOverlay();
    };
    const onProgress = (value: number) => {
      barFill.clear();
      barFill.fillStyle(0xc9a227, 1);
      const fillWidth = Math.max(4, Math.floor(barWidth * value));
      barFill.fillRoundedRect(barX, barY, fillWidth, barHeight, 4);
    };

    this.load.on(Phaser.Loader.Events.PROGRESS, onProgress);
    this.load.once(Phaser.Loader.Events.COMPLETE, dismissLoadingOverlay);

    this.preloadContext = resolveGameScenePreloadContext({
      characterId: this.characterId,
      homeMapId: this.homeMapId,
      classId: this.selectedClass,
      raceId: this.selectedRace,
    });
    runGameScenePreload(this, this.preloadContext);
  }

  /**
   * Orden de init — ver docs/GAMESCENE_INIT.md antes de reordenar.
   * Crítico: setupCameras → initWorldItemManager → initMpController → spawn/drops.
   */
  create() {
    this.dismissLoadingOverlay();
    stopMenuMusic(this);

    ensureAoFont2TransparentBackground(this);
    this.initSoundController();
    this.initShopBankSystem();
    this.initCombatController();
    this.initDeathSystem();
    this.initMeditationSystem();
    setupPlayerTexture(this);
    registerPlayerAnimations(this);
    this.registerSpellAnimations();
    this.registerMeditationAnimation();
    registerPortalAnimations(this);
    setupAoTerrainTexture(this);
    setupRaceFacesTextures(this);
    setupInventoryPanelTextures(this);
    registerMobWalkAnimations(this);
    this.registerImperiumNpcWalkAnimations();
    const treeTexture = this.textures.get(TREE_TEXTURE_KEY);
    if (treeTexture.key !== "__MISSING") {
      treeTexture.setFilter(Phaser.Textures.FilterMode.LINEAR);
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
    const mapSpawn = getMapSpawnTile(this.currentMapId);
    const centerTileX = mapSpawn.tileX;
    const centerTileY = mapSpawn.tileY;
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
    this.clanCreationOverlay = new ClanCreationOverlay({
      onSubmit: (name, description) => this.mpController?.sendClanCreate(name, description),
    });
    this.pingFpsEl = document.createElement("div");
    this.pingFpsEl.id = "game-ping-fps";
    this.pingFpsEl.style.cssText = [
      "position:fixed",
      "z-index:9999",
      "font-family:Arial,sans-serif",
      "font-size:12px",
      "color:#fff",
      "text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000",
      "pointer-events:none",
      "white-space:nowrap",
      "line-height:1.4",
    ].join(";");
    this.pingFpsEl.textContent = "FPS: 0\\nPING: --";
    document.body.appendChild(this.pingFpsEl);

    // Tecla * para mostrar/ocultar FPS y PING
    this.pingFpsToggleHandler = (e: KeyboardEvent) => {
      if (e.key === "*") {
        this.pingFpsVisible = !this.pingFpsVisible;
        this.pingFpsEl.style.display = this.pingFpsVisible ? "" : "none";
      }
    };
    window.addEventListener("keydown", this.pingFpsToggleHandler);

    this.layoutPingFpsText();
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
    if (!this.hasLoadedCharacterProgress) {
      this.applyStarterLearnedSpellsForClass(this.selectedClass);
    }
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
    this.gameUi.setSpellOrderChangeHandler((orderedSpellIds) => {
      this.spellListOrder = [...orderedSpellIds];
      this.persistCharacterProgress();
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
    this.scale.on("resize", this.applyCameraLayout, this);
    this.events.on("ui-viewport-changed", this.applyCameraLayout, this);
    this.events.on("ui-minimap-layout-info", (summary: string) => {
      this.gameUi.addChatLine(summary);
    });

    this.events.on("ui-party-action", (data: { action: any, targetName?: string, leaderId?: string, targetId?: string }) => {
      this.mpController?.sendPartyAction(data.action, data.targetName, data.leaderId, data.targetId);
    });

    this.events.on("ui-arena-action", (data: { action: any; mode?: any }) => {
      this.mpController?.sendArenaAction(data.action, data.mode);
    });

    this.events.on("ui-request-party-show", () => {
      this.gameUi.showPartyOverlay(this.mpController?.getLocalPlayerId() ?? null);
    });

    this.events.on(Phaser.Scenes.Events.RESUME, this.handleSceneResume, this);
    this.events.on(Phaser.Scenes.Events.PAUSE, this.handleScenePause, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearStaleWorldVisualRefs();
      this.persistCharacterProgress();
      registerEmergencyProgressFlush(null);
      this.progressService?.cancelScheduledPersist();
      this.scale.off("resize", this.applyCameraLayout, this);
      this.events.off("ui-viewport-changed", this.applyCameraLayout, this);
      this.events.off("ui-minimap-layout-info");
      this.events.off("ui-arena-action");
      this.events.off(Phaser.Scenes.Events.RESUME, this.handleSceneResume, this);
      this.events.off(Phaser.Scenes.Events.PAUSE, this.handleScenePause, this);
      this.deathOverlay?.destroy();
      this.deathOverlay = undefined;
      this.bankOverlay?.destroy();
      this.bankOverlay = undefined;
      this.shopOverlay?.destroy();
      this.shopOverlay = undefined;
      this.clanCreationOverlay?.destroy();
      this.clanCreationOverlay = undefined;
      this.npcManager?.clear();
      this.npcManager = undefined;
      this.mpController?.disconnect();
      if (this.pingFpsToggleHandler) {
        window.removeEventListener("keydown", this.pingFpsToggleHandler);
      }
      this.pingFpsEl?.remove();
    });

    this.mpController.connect();
    registerEmergencyProgressFlush(() => this.persistCharacterProgress());

    if (this.preloadContext) {
      scheduleGameSceneBackgroundPreload(this, this.preloadContext, () => {
        this.registerImperiumNpcWalkAnimations();
        this.registerSpellAnimations();
      });
    }
  }

  private isWorldSceneLive(): boolean {
    return Boolean(this.sys?.isActive() && isPhaserObjectLive(this.player));
  }

  private openClanCreationOverlay(): void {
    this.clanCreationOverlay?.open();
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
      const mapSpawn = getMapSpawnTile(this.currentMapId);
      this.playerTileX = mapSpawn.tileX;
      this.playerTileY = mapSpawn.tileY;
      this.resetDeathStateForCharacterSwitch();
      this.applyStarterLearnedSpellsForClass(this.selectedClass);
      this.spawnStarterInventory();
      this.syncCharacterVitalsAndSpells();
      this.validateEquippedArmorForRace();
      this.syncEquippedArmorOutfit();
      this.applyWorldStateFromProgress();
    }

    this.syncDeathUiFromState();
    this.validateEquippedArmorForRace();
    this.refreshInventoryUsability();
    this.refreshKnownSpellsUi();
    this.refreshMacroVisuals();
    this.refreshHud();
    if (isPhaserObjectLive(this.playerNameLabel)) {
      this.playerNameLabel.setText(this.getPlayerWorldNameText());
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
    const startLevel = Math.max(1, getActiveCharacter()?.level ?? 1);
    this.playerProgress.level = startLevel;
    this.applyBaseVitalsFromAttributes({ fillCurrent: true });
    this.playerProgress.exp = 0;
    this.playerProgress.expToNext = expRequiredForLevel(startLevel);
    this.applyTestStartingGold();
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

    if (item.type === "shield") {
      const blockChance = Math.round(
        (item.combatModifiers?.shieldBlockChancePercent ?? 0) * 100
      );
      const blockReduction = Math.round(
        (item.combatModifiers?.shieldBlockReductionPercent ?? 0) * 100
      );
      const magicPercent = Math.round(
        (item.combatModifiers?.magicResistancePercent ?? 0) * 100
      );
      let hint = `${item.name} - (${blockChance}% bloquear, -${blockReduction}% daño físico)`;
      if (magicPercent > 0) {
        hint += ` | ${magicPercent}% res. mágica`;
      }
      return hint;
    }

    if (item.type === "armor" || item.type === "helmet") {
      const defensePercent = Math.round(
        (item.combatModifiers?.damageReductionPercent ?? 0) * 100
      );
      const magicPercent = Math.round(
        (item.combatModifiers?.magicResistancePercent ?? 0) * 100
      );
      const label = item.type === "helmet" ? "casco" : "defensa";
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

  private dismissLoadingOverlay(): void {
    if (this.loadingOverlay) {
      this.loadingOverlay.destroy(true);
      this.loadingOverlay = null;
    }
  }

  private applyActiveCharacter(character: SavedCharacter) {
    this.clearTransientCombatBuffs();
    this.playerName = character.name;
    this.playerClanName = null;
    this.playerRole = isAdminCharacterName(character.name) ? "admin" : "player";
    this.selectedClass = character.classId;
    this.selectedRace = character.raceId;
    this.selectedGender = character.genderId;
    this.selectedFaction = normalizeFactionId(character.factionId);
    this.selectedBodyTextureKey = raceBodyTextureKey(character.raceId, character.genderId);
    this.selectedFaceIndex = character.faceIndex;
    this.homeMapId = character.homeMapId ?? DEFAULT_HOME_MAP_ID;
    this.characterId = character.id;
    const progressService = this.ensureProgressService();
    progressService.setCharacterId(character.id);
    if (!progressService.hasProgress()) {
      const { hpMax, mpMax } = getMaxVitalsAtLevel(
        this.selectedRace,
        this.selectedClass,
        Math.max(1, Math.floor(character.level))
      );
      this.playerProgress = {
        level: Math.max(1, Math.floor(character.level)),
        exp: 0,
        expToNext: expRequiredForLevel(Math.max(1, Math.floor(character.level))),
        hp: hpMax,
        hpMax,
        mp: CLASS_USES_MANA[this.selectedClass] ? mpMax : 0,
        mpMax: CLASS_USES_MANA[this.selectedClass] ? mpMax : 0,
        gold: 0,
      };
    }
    this.bankState = loadBankState(character.id);
    this.syncPlayerBodyAndFace();
    if (isPhaserObjectLive(this.playerNameLabel)) {
      this.syncPlayerNameLabelStyle();
    }
  }

  private buildCharacterProgressSnapshot(): SavedCharacterProgress {
    this.cacheCurrentMapWorldItems();
    const worldItemsByMap = isMmoServerAuthorityEnabled()
      ? {}
      : Object.fromEntries(
          Object.entries(this.worldItemManager.getItemsByMap()).map(([mapId, items]) => [
            mapId,
            items.map((entry) => ({ ...entry })),
          ])
        );
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
      spellListOrder:
        this.spellListOrder.length > 0 ? [...this.spellListOrder] : undefined,
      macroBindings: this.macroBindings.map((binding) => ({ ...binding })),
      killStats: { ...this.killStats },
      deathPhase: this.deathPhase,
      useGhostAppearance: this.useGhostAppearance,
      worldItemsByMap,
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
        if (this.isPlayerAdmin()) {
          this.applyAdminVitals({ fillCurrent: false });
        }
      },
      setLearnedSpellIds: (ids) => {
        this.learnedSpellIds.clear();
        ids.forEach((spellId) => this.learnedSpellIds.add(spellId));
        if (this.learnedSpellIds.size === 0) {
          this.applyStarterLearnedSpellsForClass(this.selectedClass);
        }
        if (this.shopBankSystem?.isSpellShopOpen()) {
          this.shopBankSystem.refreshSpellShopOverlay();
        }
      },
      setMacroBindings: (bindings) => {
        this.macroBindings = bindings.map((binding) => ({
          ...binding,
          inventorySlotIndex: binding.inventorySlotIndex ?? null,
        }));
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
    this.spellListOrder = [...(progress.spellListOrder ?? [])];
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

  private getPlayerWorldNameText(): string {
    return formatPlayerWorldName(this.playerName, this.playerClanName);
  }

  private applyLocalClanName(clanName: string | null | undefined): void {
    const next = clanName?.trim() || null;
    if (this.playerClanName === next) {
      return;
    }
    this.playerClanName = next;
    if (isPhaserObjectLive(this.playerNameLabel)) {
      this.playerNameLabel.setText(this.getPlayerWorldNameText());
      this.syncPlayerNameLabelStyle();
    }
  }

  private applyLocalFaction(factionId: CharacterFactionId): void {
    const next = normalizeFactionId(factionId);
    if (normalizeFactionId(this.selectedFaction) === next) {
      return;
    }
    this.selectedFaction = next;
    patchSavedCharacterMeta(this.characterId, { factionId: next });
    this.syncPlayerNameLabelStyle();
    this.scheduleCharacterProgressSave();
  }

  private recordLocalUserKill(): void {
    this.killStats.usersKilled = Math.max(0, this.killStats.usersKilled + 1);
    this.gameUi.setKillStats(this.killStats);
    this.scheduleCharacterProgressSave();
  }

  private tryBecomeRenegade(): void {
    if (!canRenegade(this.selectedFaction)) {
      this.gameUi.addChatLine("Solo un ciudadano imperial puede renegar.");
      return;
    }
    if (this.isMultiplayerActive() && !this.multiplayer?.isConnected()) {
      this.gameUi.addChatLine("Sin conexión: no se pudo renegar en el servidor.");
      return;
    }
    if (this.isMultiplayerActive()) {
      this.mpController.sendBecomeRenegade();
    }
    this.applyLocalFaction("renegado");
    this.gameUi.addChatLine("Has renegado. Ahora sos un Renegado.");
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

  /** Efímeros de combate: no deben arrastrarse entre personajes (Phaser reutiliza la escena). */
  private clearTransientCombatBuffs(): void {
    this.playerInvisibleUntilMs = 0;
    this.playerImmobilizedUntilMs = 0;
    this.nextImmobilizedMoveFeedbackAt = 0;
    this.clearAttributePotionBuffs(false);
    this.localPlayerVisuals?.resetAlpha();
  }

  private getLocalPlayerStepDurationMs(): number {
    if (this.useGhostAppearance || this.isPlayerDeadOrGhost()) {
      return stepDurationMsForBodyTexture(this.getVisualBodyTextureKey());
    }
    return Math.max(90, Math.floor(STEP_DURATION_MS / this.localAdminSpeedMultiplier));
  }

  private getVisualRace(): CharacterRaceId {
    return this.useGhostAppearance ? GHOST_RACE_ID : this.selectedRace;
  }

  private getVisualGender(): CharacterGenderId {
    return this.useGhostAppearance ? "male" : this.selectedGender;
  }

  private getVisualBodyTextureKey(): string {
    if (this.isNavigating && !this.useGhostAppearance) {
      return BOAT_BODY_TEXTURE_KEY;
    }
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
    if (this.isNavigating && !this.useGhostAppearance) {
      this.hideNavigationHiddenVisuals();
      return;
    }
    if (this.playerFace) {
      const faceLayout = this.getActiveFaceLayout();
      this.playerFace.setVisible(true);
      this.playerFace.clearTint();
      this.playerFace.setAlpha(this.useGhostAppearance ? GHOST_PLAYER_ALPHA : 1);
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

    const visualOutfit = this.useGhostAppearance || this.isNavigating ? "base" : this.equippedOutfit;
    const bodyKey = this.isNavigating && !this.useGhostAppearance
      ? BOAT_BODY_TEXTURE_KEY
      : textureKeyForPlayer(
          visualOutfit,
          this.getVisualBodyTextureKey(),
          this.useGhostAppearance ? undefined : this.equippedArmorVisual,
          this.getVisualRace(),
          this.getVisualGender()
        );

    this.player.clearTint();
    this.player.setAlpha(this.useGhostAppearance ? GHOST_PLAYER_ALPHA : 1);
    this.player.setTexture(bodyKey);
    applyPlayerOrigin(this.player);
    this.player.setScale(1);
    this.player.anims.stop();
    this.playFacingAnim(this.isMoving ? "walk" : "idle");
  }

  private setNavigatingFromServer(active: boolean) {
    const changed = this.isNavigating !== active;
    this.isNavigating = active;
    if (!changed && !active) {
      return;
    }
    if (active) {
      this.meditationSystem?.stop();
    }
    this.syncPlayerBodyAndFace();
    this.syncEquippedHeldItemVisuals();
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
      getPartyMemberMinimapTiles: () => this.getPartyMemberMinimapTiles(),
      refreshStatsOverlay: () => this.refreshStatsOverlayUi(),
    };
  }

  private getPartyMemberMinimapTiles(): Array<{ tileX: number; tileY: number }> {
    const localPlayerId = this.mpController?.getLocalPlayerId() ?? null;
    const partyMemberIds = this.gameUi?.getPartyMemberIds();
    const remotePlayers = this.multiplayer?.getRemotePlayers();
    if (!partyMemberIds || !remotePlayers) {
      return [];
    }
    const remotePartyIds = new Set(
      [...partyMemberIds].filter((id) => id !== localPlayerId)
    );
    return remotePlayers.getVisibleRemoteTilesByIds(remotePartyIds);
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
      playerName: this.getPlayerWorldNameText(),
      selectedFaction: this.selectedFaction,
      playerRole: this.playerRole,
      uiCamera: this.uiCamera,
      setupHitbox: (player) => this.setupPlayerHitboxInteractionFor(player),
      onPlayerPointerDown: () => {
        if (this.combatController?.hasPendingRangedAttack()) {
          this.combatController.cancelRangedTargeting("No hay objetivo para disparar.");
          return;
        }
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
    if (this.isPlayerImmobilized()) {
      debuffs.push("Inmovilizado");
    }
    const role = this.resolvePlayerRole(this.playerRole);
    const color = getInspectChatColor(this.selectedFaction, role);
    this.gameUi.addChatLine(formatInspectLineWithDebuffs(baseText, debuffs), color);
  }

  private inspectDummy(dummy: DummyState) {
    this.inspectedDummyId = dummy.id;
    this.refreshInspectedDummyLabel();
    const baseText = dummy.name;
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
        ? ` — Muerto`
        : ``;
    const remoteFaction = normalizeFactionId(remote.factionId) as import("../data/characters").CharacterFactionId;
    const remoteRole = remote.role ?? "player";
    const color = getInspectChatColor(remoteFaction, remoteRole);
    this.gameUi.addChatLine(formatInspectLineWithDebuffs(`${baseText}${suffix}`, []), color);
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
        if (dummy.isMoving) {
          const depth = this.depthFromFeetY(dummy.sprite.y);
          dummy.hpLabel.setPosition(dummy.sprite.x, dummy.sprite.y - 30);
          dummy.hpLabel.setDepth(depth + 3);
        } else {
          this.syncDummyWorldPosition(dummy);
        }
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

  private isServerJoinPending() {
    return Boolean(this.mpController?.isConnected() && !this.isMultiplayerActive());
  }

  private tryNetworkStepOrWarn(dir: MoveDirection) {
    if (!this.isMultiplayerActive()) {
      const now = Date.now();
      if (now - this.lastOfflineGameplayWarnAt < 3000) {
        return;
      }
      this.lastOfflineGameplayWarnAt = now;
      if (this.mpController?.isConnected()) {
        this.gameUi.addChatLine("Esperando al servidor...");
      } else {
        this.gameUi.addChatLine(OFFLINE_GAMEPLAY_MESSAGE);
      }
      return;
    }
    this.mpController.tryNetworkStep(dir);
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
    const loadout = buildStarterLoadout(this.selectedClass);
    this.inventory = Array(INVENTORY_SLOT_COUNT).fill(null);
    this.equipment = {
      weapon: null,
      shield: null,
      helmet: null,
      armor: null,
    };
    for (const slot of loadout.inventorySlots) {
      this.inventory[slot.slotIndex] = {
        itemId: slot.itemId as ItemId,
        count: slot.amount,
      };
    }
    this.equipment.weapon = loadout.equipment.weaponId as ItemId;
    this.equipment.armor = loadout.equipment.armorId as ItemId;
    this.refreshInventoryUi();
    this.syncEquippedHeldItemVisuals();
  }

  private applyStarterLearnedSpellsForClass(classId: ClassId) {
    this.learnedSpellIds.clear();
    for (const spellId of getStarterLearnedSpellIds(classId)) {
      this.learnedSpellIds.add(spellId);
    }
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

    if (
      command === "tp" ||
      command === "tpmap" ||
      command === "speed" ||
      command === "pvp" ||
      command === "give" ||
      command === "gold"
    ) {
      if (!this.multiplayer?.isConnected()) {
        this.gameUi.addChatLine("No estás conectado al servidor.");
        return true;
      }
      if (command === "speed") {
        const parsed = Number(args[0]);
        if (!Number.isFinite(parsed) || parsed < 1 || parsed > 3) {
          this.gameUi.addChatLine("Uso: /speed <1-3>");
          return true;
        }
        this.localAdminSpeedMultiplier = Math.floor(parsed);
        this.gameUi.addChatLine(`Velocidad local admin x${this.localAdminSpeedMultiplier}.`);
      }
      this.multiplayer.sendAdminCommand(command, args);
      return true;
    }

    if (command === "set") {
      if (args[0]?.toLowerCase() !== "lvl" && args[0]?.toLowerCase() !== "level") {
        this.gameUi.addChatLine("Uso: /set lvl <1-50>");
        return true;
      }
      if (this.multiplayer?.isConnected()) {
        this.multiplayer.sendAdminCommand(command, args);
        return true;
      }
      this.applyLocalAdminSetLevel(args[1]);
      return true;
    }

    return false;
  }

  private applyLocalAdminSetLevel(rawLevel: string | undefined): void {
    const parsed = Number(rawLevel);
    if (!Number.isFinite(parsed)) {
      this.gameUi.addChatLine("Uso: /set lvl <1-50>");
      return;
    }

    const level = Math.max(1, Math.min(VITAL_GROWTH_MAX_LEVEL, Math.floor(parsed)));
    this.stopMeditation();
    this.playerProgress.level = level;
    this.playerProgress.exp = 0;
    this.playerProgress.expToNext = expRequiredForLevel(level);

    if (this.isPlayerAdmin()) {
      this.applyAdminVitals({ fillCurrent: false });
    } else {
      const { hpMax, mpMax } = getMaxVitalsAtLevel(
        this.selectedRace,
        this.selectedClass,
        level,
        {
          constitution: this.getCoreStats().constitution,
          intelligence: this.getCoreStats().intelligence,
        }
      );
      this.playerProgress.hpMax = hpMax;
      this.playerProgress.mpMax = mpMax;
      this.playerProgress.hp = hpMax;
    }

    this.playerProgress.mp = CLASS_USES_MANA[this.selectedClass] ? this.playerProgress.mpMax : 0;
    this.refreshInventoryUsability();
    this.refreshHud();
    this.scheduleCharacterProgressSave();
    this.gameUi.addChatLine(`Nivel seteado a ${level}. Mana restaurado.`);
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
        isServerAuthoritativeLoot: () => isMmoServerAuthorityEnabled(),
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
        setServerReviveSyncPending: (value) => {
          this.serverReviveSyncPending = value;
        },
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
      isMultiplayerActive: () => this.isMultiplayerActive(),
      getPlayerMp: () => this.playerProgress.mp,
      getPlayerMpMax: () => this.playerProgress.mpMax,
      setPlayerMp: (v) => { this.playerProgress.mp = v; },
      getPlayerLevel: () => this.playerProgress.level,
      getPlayerFactionId: () => this.selectedFaction,
      requestServerMeditation: (active) => {
        if (this.isMultiplayerActive()) {
          this.multiplayer?.sendMeditation(active);
        }
      },
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

  private useMiscItemFromSlot(slotIndex: number) {
    const stack = this.inventory[slotIndex];
    if (!stack) {
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
    if (!usability.allowed) {
      this.gameUi.addChatLine(usability.reason ?? "No podés usar ese objeto.");
      return;
    }

    const map = getMap(this.currentMapId);
    if (BOAT_ITEM_IDS.has(item.id)) {
      if (
        !this.isNavigating &&
        !canStartNavigationAtTile(map, this.playerTileX, this.playerTileY, this.mapTileOverrides)
      ) {
        this.gameUi.addChatLine("Tenes que estar junto al agua para usar la barca.");
        return;
      }
      if (!this.isMultiplayerActive()) {
        this.gameUi.addChatLine("Conectando con el servidor...");
        return;
      }
      if (!this.multiplayer?.getSpawnSynced()) {
        this.gameUi.addChatLine("Espera a que termine la conexion con el servidor.");
        return;
      }
      this.multiplayer.sendUseItem(item.id, slotIndex);
      return;
    }

    const used = tryUseItemSpecial(item, {
      playerTileX: this.playerTileX,
      playerTileY: this.playerTileY,
      selectedClass: this.selectedClass,
      getMapTileId: (tileX, tileY) => {
        const tile = resolveMapTile(map.tiles, tileX, tileY, this.mapTileOverrides);
        return tile ?? null;
      },
      addChatLine: (message) => this.gameUi.addChatLine(message),
    });

    if (!used) {
      this.gameUi.addChatLine(`${item.name} no se puede usar.`);
    }
  }

  private resetAttributePotionTimer() {
    this.attributeBuffExpiresAt = Date.now() + ATTRIBUTE_POTION_BUFF_DURATION_MS;
  }

  private clearAttributePotionBuffs(notify = false) {
    this.consumableController?.clearAttributePotionBuffs(notify);
  }

  private expireAttributePotionBuffsIfNeeded(): boolean {
    if (!this.consumableController) {
      return false;
    }
    return this.consumableController.expireAttributePotionBuffsIfNeeded(Date.now());
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
        isMultiplayerActive: () => this.isMultiplayerActive(),
        requestServerBankAction: (action, amount, slotIndex) =>
          this.mpController.sendBankAction(action, amount, slotIndex),
        requestServerShopBuy: (role, itemId, amount) =>
          this.mpController.sendShopBuy(role, itemId, amount),
        requestServerShopSell: (role, slotIndex, amount) =>
          this.mpController.sendShopSell(role, slotIndex, amount),
        requestServerSpellShopBuy: (spellId) =>
          this.mpController.sendSpellShopBuy(spellId),
        isPlayerAdmin: () => this.isPlayerAdmin(),
        getPlayerLevel: () => this.playerProgress.level,
        getPlayerClass: () => this.selectedClass,
        getPlayerRace: () => this.selectedRace,
        getLearnedSpellIds: () => [...this.learnedSpellIds],
        learnSpell: (spellId) => {
          this.learnedSpellIds.add(spellId);
        },
        refreshKnownSpellsUi: () => this.refreshKnownSpellsUi(),
        persistProgressNow: () => this.persistCharacterProgress(),
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

    const spellShopOverlay = new SpellShopOverlay(this, {
      onClose: () => this.shopBankSystem.closeShop(),
      onBuy: (spellId) => this.shopBankSystem.buySpellFromShop(spellId),
    });
    this.cameras.main.ignore(spellShopOverlay.getContainer());
    this.cameras.main.ignore(spellShopOverlay.getDomObjects());
    this.shopBankSystem.setSpellShopOverlay(spellShopOverlay);
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
    const wasAlive = this.deathPhase === "alive";
    this.clearAttributePotionBuffs(false);
    if (wasAlive) {
      this.soundController.playPlayerDeathSound();
    }
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
    this.syncWorldInteractiveCursors();
  }

  private setupInput() {
    if (!this.input.keyboard) {
      return;
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.refreshInputKeybindings();
    this.cancelSpellTargetingKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC
    );
    this.partyToggleKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.events.on("ui-keybindings-changed", this.refreshInputKeybindings, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off("ui-keybindings-changed", this.refreshInputKeybindings, this);
      this.localChatBubbleTimer?.remove(false);
      this.localChatBubbleTimer = undefined;
      this.localChatBubbleText?.destroy();
      this.localChatBubbleText = undefined;
    });
    this.input.keyboard.on("keydown", (event: KeyboardEvent) => {
      this.recordMovementKeyDown(event);
      this.handleMacroHotkey(event);
    });
    this.input.keyboard.on("keyup", (event: KeyboardEvent) => {
      this.recordMovementKeyUp(event);
    });
  }

  private refreshInputKeybindings(): void {
    if (!this.input.keyboard) {
      return;
    }
    this.keybindings = loadKeybindings();
    this.wasd = this.input.keyboard.addKeys({
      up: this.keybindings.moveUp,
      down: this.keybindings.moveDown,
      left: this.keybindings.moveLeft,
      right: this.keybindings.moveRight,
    }) as GameScene["wasd"];
    this.attackKey = this.input.keyboard.addKey(this.keybindings.attack);
    this.useItemKey = this.input.keyboard.addKey(this.keybindings.useItem);
    this.equipSelectedSlotKey = this.input.keyboard.addKey(this.keybindings.equip);
    this.dropSelectedSlotKey = this.input.keyboard.addKey(this.keybindings.drop);
    this.pickupKey = this.input.keyboard.addKey(this.keybindings.pickup);
    this.meditateKey = this.input.keyboard.addKey(this.keybindings.meditate);
    this.worldMapToggleKey = this.input.keyboard.addKey(this.keybindings.map);
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

  setLatency(latency: number) {
    this.lastPingMs = latency;
  }

  private layoutPingFpsText() {
    if (!this.pingFpsEl || !this.mapController) {
      return;
    }
    const viewport = this.mapController.getGameViewportRect();
    const canvasRect = this.game.canvas.getBoundingClientRect();
    const absX = canvasRect.left + viewport.x + 6;
    const absY = canvasRect.top + viewport.y + 115;
    this.pingFpsEl.style.left = `${absX}px`;
    this.pingFpsEl.style.top = `${absY}px`;
  }

  update(time: number, delta: number) {
    if (this.pingFpsEl) {
      const pingText = this.lastPingMs == null ? "--" : `${this.lastPingMs}ms`;
      this.pingFpsEl.textContent = `FPS: ${Math.round(this.game.loop.actualFps)}\nPING: ${pingText}`;
      this.layoutPingFpsText();
    }
    if (time > this.nextPingTime && this.mpController?.isConnected()) {
      this.mpController.sendPing();
      this.nextPingTime = time + 1000;
    }
    this.expireAttributePotionBuffsIfNeeded();
    this.mapController.snapCameraScroll();
    this.drawHitboxDebugOverlay();
    this.updatePlayerDebuffs();
    this.localPlayerVisuals?.updateInvisibility();
    this.multiplayer?.getRemotePlayers()?.updateInvisibilityVisuals(Date.now());
    this.multiplayer?.getRemotePlayers()?.syncFrame();
    this.meditationSystem.update(delta);
    this.ensureEntitySyncReady();
    this.entitySync?.syncFrame();
    this.syncLocalChatBubblePosition();
    this.meditationSystem.syncFxPosition();
    this.mapController.syncSceneryOcclusion(this.playerTileX, this.playerTileY);

    processGameSceneFrameInput({
      isChangingMap: this.isChangingMap,
      hasCursors: Boolean(this.cursors && this.wasd),
      isChatFocused: this.gameUi.isChatFocused(),
      isConfirmOpen: this.gameUi.isConfirmOpen(),
      isOptionsOverlayOpen: this.gameUi.isOptionsOverlayOpen(),
      isMacroEditorOpen: this.gameUi.isMacroEditorOpen(),
      isStatsOverlayOpen: this.gameUi.isStatsOverlayOpen(),
      isPartyOverlayOpen: this.gameUi.isPartyOverlayOpen(),
      isBankOpen: this.bankOverlay?.isOpen() ?? false,
      isShopOpen: this.shopOverlay?.isOpen() ?? false,
      isAuctionOpen: this.gameUi.isAuctionOverlayOpen(),
      isSpellShopOpen: this.shopBankSystem?.isSpellShopOpen() ?? false,
      justPressedWorldMapToggle: Boolean(
        this.worldMapToggleKey && Phaser.Input.Keyboard.JustDown(this.worldMapToggleKey)
      ),
      justPressedPartyToggle: Boolean(
        this.partyToggleKey && Phaser.Input.Keyboard.JustDown(this.partyToggleKey)
      ),
      hasPendingSpellCast: this.combatController.hasPendingSpellCast(),
      hasPendingRangedAttack: this.combatController.hasPendingRangedAttack(),
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
      justPressedUseItem: Phaser.Input.Keyboard.JustDown(this.useItemKey),
      justPressedPickup: Phaser.Input.Keyboard.JustDown(this.pickupKey),
      isMoving: this.isMoving,
      getPressedDirection: () => this.getPressedDirection(),
      isPlayerImmobilized: () => this.isPlayerImmobilized(),
      getTimeNow: () => Date.now(),
      getNextImmobilizedFeedbackAt: () => this.nextImmobilizedMoveFeedbackAt,
      setNextImmobilizedFeedbackAt: (at) => {
        this.nextImmobilizedMoveFeedbackAt = at;
      },
      isMultiplayerActive: () => this.isMultiplayerActive(),
      isServerJoinPending: () => this.isServerJoinPending(),
      toggleWorldMap: () => this.mapController.toggleWorldMap(),
      togglePartyOverlay: () => this.gameUi.togglePartyOverlay(),
      cancelSpellTargeting: (message) => this.combatController.cancelSpellTargeting(message),
      cancelRangedTargeting: (message) => this.combatController.cancelRangedTargeting(message),
      handleShopEscape: () => this.shopOverlay?.handleEscape(),
      handleBankEscape: () => this.bankOverlay?.handleEscape(),
      handleAuctionEscape: () => this.gameUi.hideAuctionOverlay(),
      handleWorldMapEscape: () => {
        if (this.mapController.isWorldMapOpen()) {
          this.mapController.toggleWorldMap();
        }
      },
      onMeditateHotkeyWhileDead: () =>
        this.gameUi.addChatLine("No podés meditar estando muerto o en forma fantasma."),
      onAttackWhileDead: () => this.gameUi.addChatLine("No podés atacar en esta forma."),
      tryNetworkStep: (direction) => this.tryNetworkStepOrWarn(direction),
      onMeditateToggle: () => this.meditationSystem.toggle("hotkey"),
      onAttack: () => this.combatController.tryAttackDummy(),
      onEquipSelectedSlot: () => this.tryToggleEquipmentFromSelectedSlot(),
      onDropSelectedSlot: () => this.tryDropSelectedItem(),
      onUseSelectedItem: () => this.inventoryController.tryUseSelectedItem(),
      onPickup: () => this.inventoryController.tryPickupAtPlayerTile(),
      updateDesiredFacing: () => this.updateDesiredFacing(),
      stopMeditation: (reason) => this.stopMeditation(reason),
      onImmobilizedMoveAttempt: () =>
        this.gameUi.addCombatLine("Estás inmovilizado y no podés moverte."),
    });
  }

  private isPlayerImmobilized(now = Date.now()): boolean {
    return now < this.playerImmobilizedUntilMs;
  }

  private applyInmovilizadoDebuffToPlayer(
    targetName: string,
    sourceName: string,
    spellId: number
  ) {
    const now = Date.now();
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

  private directionFromKeyboardEvent(event: KeyboardEvent): Facing | null {
    if (event.keyCode === this.keybindings.moveUp || event.code === "ArrowUp") return "up";
    if (event.keyCode === this.keybindings.moveDown || event.code === "ArrowDown") return "down";
    if (event.keyCode === this.keybindings.moveLeft || event.code === "ArrowLeft") return "left";
    if (event.keyCode === this.keybindings.moveRight || event.code === "ArrowRight") return "right";
    return null;
  }

  private shouldCaptureMovementInput(): boolean {
    if (this.isChangingMap || !this.gameUi) {
      return false;
    }
    return !(
      this.gameUi.isChatFocused() ||
      this.gameUi.isConfirmOpen() ||
      this.gameUi.isMacroEditorOpen() ||
      this.gameUi.isStatsOverlayOpen() ||
      this.gameUi.isPartyOverlayOpen() ||
      (this.bankOverlay?.isOpen() ?? false) ||
      (this.shopOverlay?.isOpen() ?? false) ||
      this.mapController?.isWorldMapOpen()
    );
  }

  private recordMovementKeyDown(event: KeyboardEvent): void {
    const facing = this.directionFromKeyboardEvent(event);
    if (!facing || event.repeat || !this.shouldCaptureMovementInput()) {
      return;
    }
    this.movementKeyStack = this.movementKeyStack.filter((entry) => entry !== facing);
    this.movementKeyStack.push(facing);
    this.desiredFacing = facing;
    this.bufferedMovementTap = {
      facing,
      expiresAt: Date.now() + STEP_DURATION_MS + 140,
    };
  }

  private recordMovementKeyUp(event: KeyboardEvent): void {
    const facing = this.directionFromKeyboardEvent(event);
    if (!facing) {
      return;
    }
    this.movementKeyStack = this.movementKeyStack.filter((entry) => entry !== facing);
    this.desiredFacing = this.getTopPressedFacing();
  }

  private consumeBufferedMovementTap(): Facing | null {
    const buffered = this.bufferedMovementTap;
    if (!buffered) {
      return null;
    }
    this.bufferedMovementTap = null;
    if (Date.now() > buffered.expiresAt) {
      return null;
    }
    return buffered.facing;
  }

  private getTopPressedFacing(): Facing | null {
    for (let index = this.movementKeyStack.length - 1; index >= 0; index -= 1) {
      const facing = this.movementKeyStack[index];
      if (this.isFacingPressed(facing)) {
        return facing;
      }
      this.movementKeyStack.splice(index, 1);
    }
    return null;
  }

  private getPressedDirection(): MoveDirection | null {
    const facing = this.consumeBufferedMovementTap() ?? this.getTopPressedFacing();
    this.desiredFacing = facing;
    return facing ? this.directionFromFacing(facing) : null;
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
    return buildEquippedArmorVisualFromItem(item);
  }

  private validateEquippedArmorForRace() {
    const armorItemId = this.equipment.armor;
    if (!armorItemId) {
      return;
    }
    const item = getItemDefinition(armorItemId);
    const check = canRaceEquipArmor(
      this.selectedRace,
      item.clasesBajas ?? false,
      Boolean(item.spritesheetBajosPath)
    );
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
      this.selectedRace,
      this.selectedGender
    );
    const currentTextureKey = textureKeyForPlayer(
      this.equippedOutfit,
      baseBodyKey,
      this.equippedArmorVisual,
      this.selectedRace,
      this.selectedGender
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
    this.desiredFacing = this.getTopPressedFacing();
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

  /** Quita equipo fantasma (equipado en datos pero sin ítem en inventario). */
  private reconcileEquipmentWithInventory(): boolean {
    const inInventory = new Set<string>();
    for (const stack of this.inventory) {
      if (stack?.itemId && stack.count > 0) {
        inInventory.add(stack.itemId);
      }
    }
    let changed = false;
    for (const slot of ["weapon", "shield", "helmet", "armor"] as const) {
      const itemId = this.equipment[slot];
      if (itemId && !inInventory.has(itemId)) {
        this.equipment[slot] = null;
        changed = true;
      }
    }
    return changed;
  }

  private refreshInventorySlotsUi() {
    for (let slotIndex = 0; slotIndex < INVENTORY_SLOT_COUNT; slotIndex += 1) {
      const stack = this.inventory[slotIndex];
      if (!stack) {
        this.gameUi.clearInventorySlot(slotIndex);
        continue;
      }

      const item = tryGetItemDefinition(stack.itemId);
      if (!item) {
        this.inventory[slotIndex] = null;
        this.gameUi.clearInventorySlot(slotIndex);
        continue;
      }
      this.gameUi.setInventorySlot(
        slotIndex,
        item.textureKey,
        stack.count,
        stack.itemId
      );
    }
    this.refreshInventoryUsability();
    this.refreshMacroVisuals();
  }

  private refreshInventoryUi() {
    if (this.reconcileEquipmentWithInventory()) {
      this.syncEquippedArmorOutfit();
      this.syncEquippedHeldItemVisuals();
    }
    const equippedIds = Object.values(this.equipment).filter(
      (itemId): itemId is ItemId => itemId != null
    );
    this.gameUi.setEquippedItemIds(equippedIds);
    this.refreshInventorySlotsUi();
    this.scheduleCharacterProgressSave();
  }

  private openMacroEditor(slotIndex: number) {
    const binding = this.macroBindings[slotIndex];
    const spellOptions = this.getMacroSpellOptions();
    const selectedInvSlot = this.gameUi.getSelectedInventorySlot();
    const itemOptions = this.getMacroItemOptionsForAction(binding.action);
    const preferredSlot =
      selectedInvSlot >= 0 &&
      itemOptions.some((option) => option.slotIndex === selectedInvSlot)
        ? selectedInvSlot
        : binding.inventorySlotIndex;
    const initialPick =
      preferredSlot != null
        ? itemOptions.find((option) => option.slotIndex === preferredSlot)
        : itemOptions.find((option) => option.itemId === binding.itemId);
    const nextSpellId =
      binding.spellId && spellOptions.some((option) => option.spellId === binding.spellId)
        ? binding.spellId
        : spellOptions[0]?.spellId ?? null;

    const config: MacroEditorConfig = {
      slotIndex,
      keyCode: binding.keyCode,
      action: binding.action,
      selectedItemId: initialPick?.itemId ?? null,
      selectedInventorySlotIndex: initialPick?.slotIndex ?? null,
      itemOptions,
      selectedSpellId: nextSpellId,
      spellOptions,
    };
    this.gameUi.showMacroEditor(
      config,
      (savedConfig) => {
        const targetBinding = this.macroBindings[savedConfig.slotIndex];
        targetBinding.keyCode = savedConfig.keyCode;
        targetBinding.action = savedConfig.action;
        targetBinding.itemId = (savedConfig.selectedItemId as ItemId | null) ?? null;
        targetBinding.inventorySlotIndex = savedConfig.selectedInventorySlotIndex;
        targetBinding.spellId = savedConfig.selectedSpellId ?? null;
        this.refreshMacroVisuals();
        this.gameUi.addChatLine(`Macro ${savedConfig.slotIndex + 1} actualizada.`);
      },
      (action) => this.getMacroItemOptionsForAction(action)
    );
  }

  private getMacroItemOptionsForAction(action: MacroActionType): MacroEditorItemOption[] {
    const options: MacroEditorItemOption[] = [];
    this.inventory.forEach((stack, slotIndex) => {
      if (!stack) return;
      const item = getItemDefinition(stack.itemId);
      if (
        action === "use_item" &&
        item.type !== "consumable" &&
        !(item.type === "misc" && item.usableFromInventory)
      ) {
        return;
      }
      if (action === "equip_item" && !item.equipSlot) {
        return;
      }
      const countSuffix = stack.count > 1 ? ` x${stack.count}` : "";
      options.push({
        itemId: stack.itemId,
        slotIndex,
        label: `Slot ${slotIndex + 1}: ${item.name}${countSuffix}`,
      });
    });
    return options;
  }

  private resolveMacroInventorySlot(macro: MacroBinding): number {
    if (!macro.itemId) {
      return -1;
    }
    const boundSlot = macro.inventorySlotIndex;
    if (
      boundSlot != null &&
      boundSlot >= 0 &&
      boundSlot < this.inventory.length &&
      this.inventory[boundSlot]?.itemId === macro.itemId
    ) {
      return boundSlot;
    }
    return this.inventory.findIndex((slot) => slot?.itemId === macro.itemId);
  }

  private getMacroSpellOptions(): MacroEditorSpellOption[] {
    return this.getKnownSpellDefinitions().map((spell) => ({
      spellId: spell.idSpell,
      label: `#${spell.idSpell} ${spell.nombre}`,
    }));
  }

  private getAvailableSpellDefinitions(): SpellDefinition[] {
    const available = this.isPlayerAdmin()
      ? [...SPELL_DEFINITIONS]
      : SPELL_DEFINITIONS.filter(
          (spell) =>
            this.learnedSpellIds.has(spell.idSpell) &&
            spell.usableBy.includes(this.selectedClass)
        );
    const byId = new Map(available.map((spell) => [spell.idSpell, spell]));
    const orderedIds = orderSpellIds(
      available.map((spell) => spell.idSpell),
      this.spellListOrder
    );
    return orderedIds
      .map((spellId) => byId.get(spellId))
      .filter((spell): spell is SpellDefinition => spell != null);
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
          ? tryGetItemDefinition(binding.itemId)?.textureKey ?? null
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

    const slotIndex = this.resolveMacroInventorySlot(macro);
    if (slotIndex < 0) {
      const item = getItemDefinition(macro.itemId);
      this.gameUi.addChatLine(`No tenés ${item.name} en inventario.`);
      return;
    }

    if (macro.action === "use_item") {
      const item = getItemDefinition(this.inventory[slotIndex]!.itemId);
      if (item.type === "misc" && item.usableFromInventory) {
        this.useMiscItemFromSlot(slotIndex);
        return;
      }
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
    if (this.combatController.hasPendingRangedAttack()) {
      this.combatController.cancelRangedTargeting();
    }
    this.isChangingMap = true;
    this.mpController?.prepareForMapTransition();
    this.tweens.killTweensOf(this.player);
    this.isMoving = false;

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

    if (isPhaserObjectLive(this.player)) {
      const snapPos = this.getPlayerFeetWorldForTile(this.playerTileX, this.playerTileY);
      this.player.setPosition(snapPos.x, snapPos.y);
      this.syncPlayerFacePosition();
      this.updatePlayerFaceFrame();
      this.syncEquippedHeldItemVisuals();
      this.playFacingAnim("idle");
    }

    void this.mapController
      .ensureMapVisualAssetsLoaded(this.currentMap)
      .then(() =>
        ensureMapEntityVisualAssetsLoaded(
          this,
          getScopedPreloadMapIds(this.currentMapId)
        )
      )
      .catch((error) => {
        console.warn("No se pudieron cargar todos los assets del mapa.", error);
      })
      .then(() => {
        this.mapController.drawMap(this.currentMap);
        this.syncNpcsForCurrentMap();
        this.syncDummyVisibilityForCurrentMap();
        this.mapController.updateCameraBounds();
        this.mapController.updateRoofTransparency(this.playerTileX, this.playerTileY);

        const pos = this.getPlayerFeetWorldForTile(this.playerTileX, this.playerTileY);

        this.player.setPosition(pos.x, pos.y);
        this.syncPlayerFacePosition();
        this.updatePlayerFaceFrame();
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

        for (const scopedMapId of getScopedPreloadMapIds(this.currentMapId)) {
          this.preloadContext?.preloadMapIds.add(scopedMapId);
        }
        queueAdjacentMapPreload(this, this.currentMapId);

        this.isChangingMap = false;
        this.persistCharacterProgress();
      });
  }

  private playFacingAnim(state: "walk" | "idle") {
    const isProfile = this.facing === "left" || this.facing === "right";
    const bodyFacing: Facing = isProfile ? "left" : this.facing;
    this.player.setFlipX(this.facing === "right");
    this.refreshPlayerHitboxInteraction();

    const visualOutfit = this.useGhostAppearance || this.isNavigating ? "base" : this.equippedOutfit;
    const key = this.isNavigating && !this.useGhostAppearance
      ? `${state}_${bodyFacing}_${BOAT_BODY_TEXTURE_KEY}`
      : playerAnimationKey(
          state,
          bodyFacing,
          visualOutfit,
          this.getVisualBodyTextureKey(),
          this.useGhostAppearance ? undefined : this.equippedArmorVisual,
          this.getVisualRace(),
          this.getVisualGender()
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
        this.getVisualRace(),
        this.getVisualGender()
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
    if (this.isNavigating && !this.useGhostAppearance) {
      this.hideNavigationHiddenVisuals();
      return;
    }

    const visualFaceIndex = this.useGhostAppearance ? 0 : this.selectedFaceIndex;
    this.playerFace.setFrame(
      getFaceFrame(
        this.getVisualRace(),
        this.getVisualGender(),
        visualFaceIndex,
        this.facing
      )
    );
  }

  private syncPlayerFacePosition() {
    if (this.isNavigating && !this.useGhostAppearance) {
      this.hideNavigationHiddenVisuals();
      return;
    }
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
      hideEquipmentVisuals: this.isNavigating && !this.useGhostAppearance,
    };
  }

  private syncEquippedHeldItemVisuals() {
    if (this.isNavigating && !this.useGhostAppearance) {
      this.hideNavigationHiddenVisuals();
      return;
    }
    this.ensureEntitySyncReady();
    if (!this.entitySync) return;
    this.entitySync.syncEquippedHeldItemVisuals();
  }

  private hideNavigationHiddenVisuals() {
    this.playerFace?.setVisible(false);
    this.equippedWeaponSprite?.setVisible(false);
    this.equippedShieldSprite?.setVisible(false);
    this.equippedHelmetSprite?.setVisible(false);
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
    if (this.isNavigating) {
      return canNavigateToTile(
        this.currentMap,
        tileX,
        tileY,
        this.mapTileOverrides
      );
    }
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
      this.multiplayer?.getRemotePlayers()?.isTileOccupiedByRemote(tileX, tileY, this.currentMapId, {
        ignoreGhosts: !this.isPlayerDeadOrGhost(),
      }) ??
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

    if (this.mapController.arenaBorderTiles.has(`${tileX},${tileY}`)) {
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

  private stopDummyMovement(dummy: DummyState) {
    if (!dummy.isMoving) {
      return;
    }
    this.tweens.killTweensOf(dummy.sprite);
    this.tweens.killTweensOf(dummy.hpLabel);
    dummy.isMoving = false;
    dummy.netMoveQueue = [];
    dummy.netMoveTargetTile = undefined;
    this.syncDummyWorldPosition(dummy);
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
    const dx = toTileX - fromTileX;
    const dy = toTileY - fromTileY;
    if (dx === 0 && dy === 0) {
      return fallbackFacing;
    }
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? "right" : "left";
    }
    return dy >= 0 ? "down" : "up";
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
    this.applyMobDeathFromServer(dummy);
  }

  private getCoreStats(): CoreStats {
    this.expireAttributePotionBuffsIfNeeded();
    const natural = resolveCoreStats(this.selectedRace, this.selectedClass);
    return applyStatsWithPotionBuffs(natural, this.attributeBuffs);
  }

  private applyAdminVitals(options?: { fillCurrent?: boolean }) {
    const fill = options?.fillCurrent !== false;
    this.playerProgress.hpMax = ADMIN_GM_HP_MAX;
    this.playerProgress.mpMax = ADMIN_GM_MP_MAX;
    if (fill) {
      this.playerProgress.hp = ADMIN_GM_HP_MAX;
      this.playerProgress.mp = ADMIN_GM_MP_MAX;
    } else {
      this.playerProgress.hp = Math.min(ADMIN_GM_HP_MAX, this.playerProgress.hp);
      this.playerProgress.mp = Math.min(ADMIN_GM_MP_MAX, this.playerProgress.mp);
    }
  }

  private applyBaseVitalsFromAttributes(options?: { fillCurrent?: boolean }) {
    if (this.isPlayerAdmin()) {
      this.applyAdminVitals(options);
      return;
    }
    const coreStats = this.getCoreStats();
    const prevLevel = this.playerProgress.level;
    const { hpMax, mpMax } = getMaxVitalsAtLevel(
      this.selectedRace,
      this.selectedClass,
      prevLevel,
      { constitution: coreStats.constitution, intelligence: coreStats.intelligence }
    );
    const fill = options?.fillCurrent !== false;
    if (fill) {
      this.playerProgress.hpMax = hpMax;
      this.playerProgress.mpMax = mpMax;
      this.playerProgress.hp = hpMax;
      this.playerProgress.mp = mpMax;
    } else {
      const prevHpMax = this.playerProgress.hpMax;
      const prevMpMax = this.playerProgress.mpMax;
      this.playerProgress.hpMax = hpMax;
      this.playerProgress.mpMax = mpMax;
      this.playerProgress.hp = Math.min(
        hpMax,
        Math.max(0, this.playerProgress.hp + Math.max(0, hpMax - prevHpMax))
      );
      this.playerProgress.mp = Math.min(
        mpMax,
        Math.max(0, this.playerProgress.mp + Math.max(0, mpMax - prevMpMax))
      );
    }
    if (!CLASS_USES_MANA[this.selectedClass]) {
      this.playerProgress.mp = 0;
      this.playerProgress.mpMax = 0;
    }
  }

  private onLocalLevelUp(previousLevel: number, newLevel: number): void {
    if (newLevel <= previousLevel) {
      return;
    }
    this.soundController.playLevelUpSoundOnce();
    this.applyVitalsForLevelChange(previousLevel, newLevel);
  }

  /** Recalcula máximos desde tablas al cambiar de nivel (p. ej. servidor). */
  private applyVitalsForLevelChange(previousLevel: number, newLevel: number) {
    if (this.isPlayerAdmin()) {
      this.applyAdminVitals({ fillCurrent: false });
      return;
    }
    const patch = applyLevelUpVitals({
      race: this.selectedRace,
      classId: this.selectedClass,
      previousLevel,
      newLevel,
      currentHp: this.playerProgress.hp,
      currentMp: this.playerProgress.mp,
      healToNewMax: false,
    });
    this.playerProgress.hpMax = patch.hpMax;
    this.playerProgress.mpMax = patch.mpMax;
    this.playerProgress.hp = patch.hp;
    this.playerProgress.mp = patch.mp;
    if (!CLASS_USES_MANA[this.selectedClass]) {
      this.playerProgress.mp = 0;
      this.playerProgress.mpMax = 0;
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
    if (this.combatController.hasPendingRangedAttack()) {
      this.combatController.cancelRangedTargeting();
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

    this.applyStarterLearnedSpellsForClass(this.selectedClass);
    this.killStats = {
      creaturesKilled: 0,
      criminalsKilled: 0,
      usersKilled: 0,
    };
    this.macroBindings = Array.from({ length: 10 }, () => ({
      keyCode: null,
      action: DEFAULT_MACRO_ACTION,
      itemId: null,
      inventorySlotIndex: null,
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

    const startSpawn = getMapSpawnTile(START_MAP_ID);
    const centerTileX = startSpawn.tileX;
    const centerTileY = startSpawn.tileY;
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

  /** Oro de arranque para pruebas; HP/MP vienen de `applyBaseVitalsFromAttributes`. */
  private applyTestStartingGold() {
    this.playerProgress.gold = TEST_START_GOLD;
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
    player.input!.cursor = this.getWorldInteractiveCursor();
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

  private findRemotePlayerAtWorldPoint(
    worldX: number,
    worldY: number
  ): { id: string; tileX: number; tileY: number } | null {
    const remote = this.multiplayer?.getRemotePlayers()?.findRemoteAtWorldPoint(worldX, worldY);
    if (!remote) {
      return null;
    }
    return { id: remote.id, tileX: remote.tileX, tileY: remote.tileY };
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
      this.combatController.tryCastSpellOnPlayer(
        hitRemote.tileX,
        hitRemote.tileY,
        hitRemote.id
      );
      return true;
    }

    const spell = this.combatController.getPendingSpellCast();
    if (spell?.aoe) {
      const tileX = Math.floor(pointer.worldX / TILE_SIZE);
      const tileY = Math.floor(pointer.worldY / TILE_SIZE);
      this.combatController.tryCastSpellOnPlayer(tileX, tileY);
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

  private hasSpellEnemyTargetAtTile(tileX: number, tileY: number): boolean {
    if (this.findDummyAtTile(tileX, tileY)?.alive) {
      return true;
    }
    const remote = this.multiplayer?.getRemotePlayers()?.findRemoteAtTile(tileX, tileY);
    if (!remote || remote.isGhost || remote.hp <= 0) {
      return false;
    }
    return true;
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
    sprite.input!.cursor = this.getWorldInteractiveCursor();
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

  private tryRangedAttackFromPointer(
    pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[]
  ): boolean {
    for (const gameObject of currentlyOver) {
      const dummy = this.dummies.find((entry) => entry.sprite === gameObject);
      if (dummy?.alive) {
        const hitTile = this.getDummyHitTile(dummy);
        this.combatController.tryRangedAttackAtTarget({
          targetTileX: hitTile.x,
          targetTileY: hitTile.y,
          targetMobId: dummy.id,
        });
        return true;
      }

      const remote = this.multiplayer?.getRemotePlayers()?.getRemoteBySprite(gameObject);
      if (remote && !remote.isGhost && remote.hp > 0) {
        this.combatController.tryRangedAttackAtTarget({
          targetTileX: remote.tileX,
          targetTileY: remote.tileY,
          targetPlayerId: remote.id,
        });
        return true;
      }
    }

    const dummy = this.findDummyAtWorldPoint(pointer.worldX, pointer.worldY);
    if (dummy?.alive) {
      const hitTile = this.getDummyHitTile(dummy);
      this.combatController.tryRangedAttackAtTarget({
        targetTileX: hitTile.x,
        targetTileY: hitTile.y,
        targetMobId: dummy.id,
      });
      return true;
    }

    const remote = this.multiplayer
      ?.getRemotePlayers()
      ?.findRemoteAtWorldPoint(pointer.worldX, pointer.worldY);
    if (remote && !remote.isGhost && remote.hp > 0) {
      this.combatController.tryRangedAttackAtTarget({
        targetTileX: remote.tileX,
        targetTileY: remote.tileY,
        targetPlayerId: remote.id,
      });
      return true;
    }

    if (this.gameUi.isPointerOverSidebar(pointer.x, pointer.y)) {
      return true;
    }

    this.combatController.cancelRangedTargeting("No hay objetivo para disparar.");
    return true;
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
          
          const legacyDoorTile = this.mapController.getLegacyDoorTileAtWorldPoint(
            pointer.worldX,
            pointer.worldY
          );
          const tileX = legacyDoorTile?.tileX ?? Math.floor(pointer.worldX / TILE_SIZE);
          const tileY = legacyDoorTile?.tileY ?? Math.floor(pointer.worldY / TILE_SIZE);
          this.multiplayer?.sendInteractMap(tileX, tileY);
          
          return;
        }

        if (this.combatController.hasPendingRangedAttack()) {
          this.tryRangedAttackFromPointer(pointer, currentlyOver);
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

            if (this.gameUi.isPointerOverSidebar(pointer.x, pointer.y)) {
              return;
            }
            const tileX = Math.floor(pointer.worldX / TILE_SIZE);
            const tileY = Math.floor(pointer.worldY / TILE_SIZE);
            const dummyAtTile = this.findDummyAtTile(tileX, tileY);
            if (dummyAtTile?.alive) {
              this.combatController.tryCastSpellOnDummy(dummyAtTile);
              return;
            }

            if (!this.combatController.spellCanTargetPlayer(spell)) {
              const hitRemote = this.findRemotePlayerAtWorldPoint(
                pointer.worldX,
                pointer.worldY
              );
              if (hitRemote) {
                this.combatController.tryCastSpellOnPlayer(
                  hitRemote.tileX,
                  hitRemote.tileY
                );
                return;
              }
            }

            if (spell.aoe) {
              const tileX = Math.floor(pointer.worldX / TILE_SIZE);
              const tileY = Math.floor(pointer.worldY / TILE_SIZE);
              this.combatController.tryCastSpellOnPlayer(tileX, tileY);
              return;
            }

            this.combatController.cancelSpellTargeting("No hay objetivo en ese lugar.");
            return;
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
          const npc = this.npcManager?.findNpcByGameObject(gameObject);
          if (npc) {
            this.multiplayer?.sendInteractMap(npc.tileX, npc.tileY);
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
    registerMeditationAnimations(this);
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

    // --- Barra de progreso de la canalización bajo el caster ---
    const BAR_W = 36;
    const BAR_H = 5;
    const barY = y + 14;
    const barDepth = this.depthFromFeetY(y) + 2;

    const barBg = this.add.graphics().setDepth(barDepth);
    barBg.fillStyle(0x000000, 0.6);
    barBg.fillRect(x - BAR_W / 2 - 1, barY - 1, BAR_W + 2, BAR_H + 2);
    if (this.uiCamera) this.uiCamera.ignore(barBg);

    const bar = this.add.graphics().setDepth(barDepth + 0.1);
    bar.fillStyle(0x44ff88, 1);
    bar.fillRect(x - BAR_W / 2, barY, BAR_W, BAR_H);
    if (this.uiCamera) this.uiCamera.ignore(bar);

    const startMs = Date.now();
    const totalMs = Math.max(1, endsAtMs - startMs);
    const entry = { sprite, bar, barBg, startMs, endsAtMs };
    this.resurrectChannelFxByCasterId.set(casterId, entry);

    this.tweens.add({
      targets: { progress: 1 },
      progress: 0,
      duration: totalMs,
      ease: "Linear",
      onUpdate: (tween) => {
        const progress = tween.getValue() as number;
        if (!bar.active) return;
        bar.clear();
        bar.fillStyle(0x44ff88, 1);
        bar.fillRect(x - BAR_W / 2, barY, BAR_W * progress, BAR_H);
      },
      onComplete: () => {
        this.stopResurrectChannelEffect(casterId);
      },
    });
  }

  stopResurrectChannelEffect(casterId: string) {
    const entry = this.resurrectChannelFxByCasterId.get(casterId);
    if (!entry) {
      return;
    }
    if (entry.sprite.active) entry.sprite.destroy();
    if (entry.bar.active) entry.bar.destroy();
    if (entry.barBg.active) entry.barBg.destroy();
    this.resurrectChannelFxByCasterId.delete(casterId);
  }

  private showPlayerChatBubble(playerId: string, text: string): void {
    if (playerId === this.mpController?.getLocalPlayerId()) {
      this.showLocalChatBubble(text);
      return;
    }
    this.multiplayer?.getRemotePlayers()?.showChatBubble(playerId, text);
  }

  private showLocalChatBubble(text: string): void {
    const message = text.trim().slice(0, 90);
    this.localChatBubbleTimer?.remove(false);
    this.localChatBubbleTimer = undefined;

    if (!message) {
      this.localChatBubbleText?.destroy();
      this.localChatBubbleText = undefined;
      return;
    }

    if (!this.localChatBubbleText) {
      this.localChatBubbleText = this.add
        .text(this.player.x, this.player.y - 54, message, {
          fontFamily: GAME_FONT,
          fontSize: "14px",
          color: "#fff2cf",
          fontStyle: "bold",
          stroke: "#1a0705",
          strokeThickness: 4,
          resolution: GAME_TEXT_RESOLUTION,
          align: "center",
          wordWrap: { width: 190, useAdvancedWrap: true },
        })
        .setOrigin(0.5, 1);
      if (this.uiCamera) {
        this.uiCamera.ignore(this.localChatBubbleText);
      }
    } else {
      this.localChatBubbleText.setText(message);
      this.localChatBubbleText.setVisible(true);
    }

    this.syncLocalChatBubblePosition();
    this.localChatBubbleTimer = this.time.delayedCall(4000, () => {
      this.localChatBubbleText?.destroy();
      this.localChatBubbleText = undefined;
      this.localChatBubbleTimer = undefined;
    });
  }

  private syncLocalChatBubblePosition(): void {
    if (!this.localChatBubbleText || !this.player) {
      return;
    }
    const depth = this.depthFromFeetY(this.player.y);
    this.localChatBubbleText.setPosition(
      this.player.x,
      this.player.y - Math.max(54, this.player.displayHeight + 12)
    );
    this.localChatBubbleText.setDepth(depth + 4);
  }

  private playSpellEffect(spellId: number, tileX: number, tileY: number, playSound = true) {
    if (playSound) {
      this.soundController.playSpellCastSound(spellId);
    }

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

  private playSpellEffectOnTarget(
    spellId: number,
    target: Phaser.GameObjects.Sprite,
    playSound = true
  ) {
    if (playSound) {
      this.soundController.playSpellCastSound(spellId);
    }

    const fxConfig = getSpellEffectConfig(spellId);
    if (!fxConfig) {
      return;
    }

    const animKey = spellEffectAnimKey(spellId);
    if (!this.anims.exists(animKey)) {
      return;
    }

    const offsetX = fxConfig.offsetX ?? 0;
    const offsetY = fxConfig.offsetY ?? 0;
    const sprite = this.add
      .sprite(
        target.x + offsetX,
        target.y + offsetY,
        fxConfig.sheetKey,
        getSpellEffectFirstFrame(fxConfig)
      )
      .setOrigin(fxConfig.originX ?? 0.5, fxConfig.originY ?? 0.5)
      .setDepth(this.depthFromFeetY(target.y) + 1)
      .setScale(fxConfig.scale ?? 1)
      .setBlendMode(Phaser.BlendModes.ADD);

    if (fxConfig.tint != null) {
      sprite.setTint(fxConfig.tint);
    }

    if (this.uiCamera) {
      this.uiCamera.ignore(sprite);
    }

    const syncFx = () => {
      if (!sprite.active) {
        this.events.off(Phaser.Scenes.Events.UPDATE, syncFx);
        return;
      }
      if (!target.active) {
        sprite.destroy();
        this.events.off(Phaser.Scenes.Events.UPDATE, syncFx);
        return;
      }
      sprite.setPosition(target.x + offsetX, target.y + offsetY);
      sprite.setDepth(this.depthFromFeetY(target.y) + 1);
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, syncFx);

    const destroyFx = () => {
      this.events.off(Phaser.Scenes.Events.UPDATE, syncFx);
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
    this.soundController.playSpawnSound();
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
