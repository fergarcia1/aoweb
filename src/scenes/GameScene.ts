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
  getPlayerHeadWalkSway,
  syncEquippedHelmetVisual as applyEquippedHelmetVisual,
  syncEquippedHeldItemVisuals as applyEquippedHeldItemVisuals,
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
  buildSkillDisplayEntries,
  createInitialSkillLevels,
  getSkillCapGainBetweenLevels,
  tryImproveSkill,
  type SkillId,
} from "../game/skills";
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
import {
  registerInventoryPanelAssets,
  setupInventoryPanelTextures,
} from "../ui/inventoryPanel";
import {
  getActiveCharacter,
  getActiveCharacterSlotIndex,
  getPlayerNameColors,
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
import { DeathOverlay } from "../ui/deathOverlay";
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
import {
  ALL_FX_SHEETS,
  getSpellEffectConfig,
  getSpellEffectFirstFrame,
  SPAWN_FX_CONFIG,
  SPAWN_FX_ID,
  spellEffectAnimKey,
  SPELL_EFFECTS,
} from "../spells/spellEffects";
import type { NetInventorySlotState, ServerUseItemAckMessage } from "../../shared/protocol";
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
import {
  getMobShowcaseAnchorTile,
  MOB_SHOWCASE_CONFIG,
  MOB_SHOWCASE_MODEL_ORDER,
} from "../data/mobShowcase";
import {
  WorldItemManager,
  GameSceneChatCommands,
  GameSceneMultiplayerController,
  GameSceneMobController,
  GameSceneMapController,
  GameSceneInventoryController,
  GameSceneCombatController,
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
  BUILDING_OCCLUDED_ALPHA,
  CLASS_USES_MANA,
  DEFAULT_MACRO_ACTION,
  DEFAULT_MOB_HITBOX_HEIGHT_TILES,
  DEFAULT_MOB_HITBOX_OFFSET_Y,
  DEFAULT_MOB_HITBOX_WIDTH_TILES,
  DEFAULT_PLAYER_NAME,
  HUD_AGILITY_POTION_TEXTURE_KEY,
  HUD_STRENGTH_POTION_TEXTURE_KEY,
  INMOVILIZADO_PLAYER_DURATION_MS,
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
  TREE_OCCLUDED_ALPHA,
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
  type PlayerAffiliation,
  type PlayerProgressState,
  type RaceId,
  type SpellCastRequest,
  type WorldItemEntry,
} from "./gameSceneModules/index";

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private playerFace!: Phaser.GameObjects.Sprite;
  private playerNameLabel!: Phaser.GameObjects.Text;
  private equippedWeaponSprite?: Phaser.GameObjects.Sprite;
  private equippedShieldSprite?: Phaser.GameObjects.Sprite;
  private equippedHelmetSprite?: Phaser.GameObjects.Sprite;

  private gameUi!: GameUi;
  private mapController!: GameSceneMapController;
  private inventoryController!: GameSceneInventoryController;
  private combatController!: GameSceneCombatController;

  private currentMap!: GameMap;
  private currentMapId = START_MAP_ID;

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
  private selectedFaction: CharacterFactionId = "imperial";
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
  private skillLevels: Record<SkillId, number> = createInitialSkillLevels();
  private killStats: PlayerKillStats = {
    creaturesKilled: 0,
    criminalsKilled: 0,
    usersKilled: 0,
  };
  /** Evita FX duplicado si el servidor reenvía spell_fx tras un cast local. */
  private suppressServerSpellFxUntil = 0;
  private inspectedDummyId: string | null = null;
  private playerImmobilizedUntilMs = 0;
  private wasPlayerImmobilizedLastFrame = false;
  private nextImmobilizedMoveFeedbackAt = 0;
  private meditationSystem!: MeditationSystem;
  private mobAiSystem!: MobAiSystem;
  private hitboxDebugEnabled = false;
  private hitboxDebugGraphics?: Phaser.GameObjects.Graphics;
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
      sendEquipToServer: (action, payload) => {
        if (action === "equip" && "inventorySlot" in payload) {
          this.multiplayer!.sendEquipItem("equip", payload);
        } else if (action === "unequip" && "equipSlot" in payload) {
          this.multiplayer!.sendEquipItem("unequip", payload);
        }
      },
      syncServerInventory: () => this.syncServerInventoryIfMultiplayer(),
      sendDropItemToServer: (slot, amount) =>
        this.mpController.sendDropItem(slot, amount),
      sendDropGoldToServer: (amount) => this.mpController.sendDropGold(amount),
      sendPickupWorldItemToServer: () => this.mpController.sendPickupWorldItem(),
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
      getMagicSkillLevel: () => this.getMagicSkillLevel(),
      hasAnilloEspectralInInventory: () => this.hasAnilloEspectralInInventory(),
      isPlayerDeadOrGhost: () => this.isPlayerDeadOrGhost(),
      isMultiplayerActive: () => this.isMultiplayerActive(),
      stopMeditation: () => this.stopMeditation(),
      refreshHud: () => this.refreshHud(),
      tryImproveMagicOnSpellCast: () => this.tryImproveMagicOnSpellCast(),
      onPlayerHpDepleted: () => {
        if (this.deathPhase === "alive") {
          this.handlePlayerDeath();
        }
      },
      sendAttackToServer: (facing) => this.multiplayer!.sendAttack(facing),
      sendCastSpellToServer: (spellId, tileX, tileY) =>
        this.multiplayer!.sendCastSpell(spellId, tileX, tileY),
      getDummyInAttackRange: () => this.getDummyInAttackRange(),
      getDummyHitTile: (dummy) => this.getDummyHitTile(dummy),
      killDummy: (dummy) => this.killDummy(dummy),
      refreshInspectedDummyLabel: () => this.refreshInspectedDummyLabel(),
      getInspectedDummyId: () => this.inspectedDummyId,
      playSpellEffect: (spellId, tx, ty) => this.playSpellEffect(spellId, tx, ty),
      setSuppressServerSpellFxUntil: (until) => {
        this.suppressServerSpellFxUntil = until;
      },
      onMeleeImpact: () => {
        this.cameras.main.shake(45, 0.0016, true);
        this.playHitSound();
      },
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
      addChatLine: (text) => this.gameUi.addChatLine(text),
      addCombatLine: (text) => this.gameUi.addCombatLine(text),
      syncLocalVitalsFromServer: (state) => this.syncLocalVitalsFromServer(state),
      syncLocalEquipmentFromServer: (state) => this.syncLocalEquipmentFromServer(state),
      syncLocalInventoryFromServer: (slots) => this.syncLocalInventoryFromServer(slots),
      syncLocalGoldFromServer: (gold) => this.syncLocalGoldFromServer(gold),
      syncWorldItemsFromServer: (items) => this.syncWorldItemsFromServer(items),
      applyWorldItemSpawned: (mapId, item) => this.applyWorldItemSpawned(mapId, item),
      applyWorldItemUpdated: (mapId, item) => this.applyWorldItemUpdated(mapId, item),
      applyWorldItemRemoved: (mapId, worldItemId) =>
        this.applyWorldItemRemoved(mapId, worldItemId),
      syncMobsFromServer: (mobs) => this.mobController.syncFromServer(mobs),
      applyNetMobState: (mob) => this.mobController.applyNetState(mob),
      applyNetMobLeft: (mobId) => this.mobController.applyNetLeft(mobId),
      handleServerPlayerDied: (playerId, killerName) =>
        this.handleServerPlayerDied(playerId, killerName),
      handleServerUseItemAck: (ack) => this.handleServerUseItemAck(ack),
      handleServerPlayerUpdated: (state) => this.handleServerPlayerUpdated(state),
      applyServerPlayerRole: (role) => {
        this.playerRole = this.resolvePlayerRole(role);
        this.syncPlayerNameLabelStyle();
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
      applyIncomingDamage: (amount, type) =>
        this.combatController.applyIncomingDamage(amount, type),
      showDamageNumber: (x, y, amount, source) =>
        this.combatController.showDamageNumber(x, y, amount, source),
      playSpellEffect: (spellId, tx, ty) => this.playSpellEffect(spellId, tx, ty),
      getSuppressServerSpellFxUntil: () => this.suppressServerSpellFxUntil,
      getPlayerSprite: () => this.player,
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
    });
  }

  init(data: GameSceneInitData = {}) {
    this.characterSlotIndex = data.slotIndex ?? getActiveCharacterSlotIndex();
    const character = data.character ?? getActiveCharacter();
    if (character) {
      this.applyActiveCharacter(character);
    }
  }

  preload() {
    registerPlayerSprites(this);
    registerNpcAssets(this);
    registerAoTerrain(this);
    registerRaceFaces(this);
    registerInventoryPanelAssets(this);
    loadMobVisualAssets(this);
    ALL_FX_SHEETS.forEach((fx) => {
      this.load.spritesheet(fx.sheetKey, fx.path, {
        frameWidth: fx.frameWidth,
        frameHeight: fx.frameHeight,
      });
    });
    this.load.spritesheet(
      MEDITATION_TEXTURE_KEY,
      "/assets/ao/meditations/lowLvlMed.png",
      {
        frameWidth: MEDITATION_FRAME_WIDTH,
        frameHeight: MEDITATION_FRAME_HEIGHT,
      }
    );
    this.load.image(TREE_TEXTURE_KEY, TREE_TEXTURE_PATH);
    registerMapObjectAssets(this);
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
    Object.values(ITEM_DEFINITIONS).forEach((item) => {
      if (item.type !== "armor") return;
      const armorSheets = [item.spritesheetStdPath, item.spritesheetBajosPath].filter(
        (path): path is string => Boolean(path)
      );
      armorSheets.forEach((sheetPath) => {
        registerArmorSpritesheet(this, textureKeyFromAssetPath(sheetPath), sheetPath);
      });
    });

    this.load.image("world_gold", "assets/ao/otherItems/oro.png");
    this.load.image(HUD_STRENGTH_POTION_TEXTURE_KEY, "assets/ao/otherItems/pocionVerde.png");
    this.load.image(HUD_AGILITY_POTION_TEXTURE_KEY, "assets/ao/otherItems/pocionAmarilla.png");

    for (const map of getAllMaps()) {
      for (const overlay of map.groundOverlays ?? []) {
        this.load.image(overlay.textureKey, overlay.texturePath);
      }
    }
  }

  create() {
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
    this.createPlayer();
    if (!this.hasLoadedCharacterProgress) {
      this.spawnAllItemsNearSpawn(centerTileX, centerTileY);
    }
    this.initMobController();
    this.mobController.createAllIfNeeded();
    this.time.delayedCall(200, () => this.playSpawnEffect());

    this.gameUi = new GameUi(this);
    this.gameUi.setMinimapRedrawHandler(() => this.refreshMinimap());
    this.initChatCommands();
    this.gameUi.setChatSubmitHandler((message) => this.chatCommands.handleSubmit(message));
    this.gameUi.setInventoryHoverHandler((slotIndex) => this.buildInventoryHoverHint(slotIndex));
    this.gameUi.setMacroSlotClickHandler((slotIndex) => {
      this.openMacroEditor(slotIndex);
    });
    this.initializeStarterSpells();
    this.refreshKnownSpellsUi();
    this.refreshSkillsUi();
    this.gameUi.setSpellInfoRequestHandler((spell) => {
      const debuffText = spell.remueveDebuff ? ` | Quita: ${spell.remueveDebuff}` : "";
      const classesText = spell.usableBy.join(", ");
      this.gameUi.addChatLine(
        `${spell.nombre} [#${spell.idSpell}] MP:${spell.manaCost} Danio:${spell.danioMin}-${spell.danioMax} Cura:${spell.healMin}-${spell.healMax} AoE:${spell.aoe ? `si (${spell.aoeRadiusTiles} tiles)` : "no"} Aliados:${spell.puedeUsarseEnAliados ? "si" : "no"} Valor:${spell.valor} MagiaReq:${spell.nivelMagiaRequerido} Clases:${classesText}${debuffText} | ${spell.descripcion}`
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
      this.refreshSkillsUi();
      this.refreshInventoryUi();
      if (this.deathPhase !== "alive") {
        this.applyGhostVisual();
      } else {
        this.syncEquippedArmorOutfit();
      }
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
    this.initInventoryController();
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
    if (this.hasLoadedCharacterProgress && this.deathPhase !== "alive") {
      this.deathOverlay?.show(this.getGameViewportRect());
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

    this.initMpController();
    this.mpController.connect();
  }

  private isWorldSceneLive(): boolean {
    return Boolean(this.sys && this.player?.scene === this);
  }

  private handleScenePause = () => {
    this.progressService?.cancelScheduledPersist();
    this.persistCharacterProgress();
  };

  private handleSceneResume() {
    const character = this.game.registry.get("activeCharacter") as SavedCharacter | undefined;
    if (!character) {
      return;
    }
    if (!this.isWorldSceneLive()) {
      return;
    }
    this.applyActiveCharacter(character);
    this.game.registry.remove("activeCharacter");
    this.game.registry.remove("activeCharacterSlotIndex");

    this.ensureProgressService().setCharacterId(character.id);
    const savedProgress = this.ensureProgressService().load(character.id);
    if (savedProgress) {
      this.applyCharacterProgress(savedProgress);
      this.hasLoadedCharacterProgress = true;
      this.applyWorldStateFromProgress();
    } else {
      this.syncCharacterVitalsAndSpells();
    }

    this.validateEquippedArmorForRace();
    this.refreshInventoryUsability();
    this.refreshKnownSpellsUi();
    this.refreshSkillsUi();
    this.refreshMacroVisuals();
    this.refreshHud();
    if (this.playerNameLabel) {
      this.playerNameLabel.setText(this.playerName);
      this.syncPlayerNameLabelStyle();
    }
    this.gameUi.addChatLine(`Volviste con ${this.playerName}.`);
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
    this.refreshSkillsUi();
    this.refreshInventoryUsability();
    this.refreshMacroVisuals();
    this.refreshHud();
  }

  private getMagicSkillLevel(): number {
    return this.skillLevels.magia ?? 0;
  }

  private refreshSkillsUi() {
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
    this.gameUi.setSkillEntries(
      buildSkillDisplayEntries(this.skillLevels, this.playerProgress.level)
    );
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
        item
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

  private tryImproveMagicOnSpellCast() {
    if (!CLASS_USES_MANA[this.selectedClass]) {
      return;
    }
    const result = tryImproveSkill("magia", this.skillLevels, this.playerProgress.level);
    if (!result.improved) {
      return;
    }
    this.gameUi.addCombatLine(`Subiste Magia a ${result.newValue}.`);
    this.refreshKnownSpellsUi();
    this.refreshSkillsUi();
  }

  private applyActiveCharacter(character: SavedCharacter) {
    this.playerName = character.name;
    this.playerRole = isAdminCharacterName(character.name) ? "admin" : "player";
    this.selectedClass = character.classId;
    this.selectedRace = character.raceId;
    this.selectedGender = character.genderId;
    this.selectedFaction = character.factionId;
    this.selectedBodyTextureKey = raceBodyTextureKey(character.raceId, character.genderId);
    this.selectedFaceIndex = character.faceIndex;
    this.homeMapId = character.homeMapId ?? DEFAULT_HOME_MAP_ID;
    this.characterId = character.id;
    this.ensureProgressService().setCharacterId(character.id);
    this.bankState = loadBankState(character.id);
    this.syncPlayerBodyAndFace();
    this.syncPlayerNameLabelStyle();
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
      skillLevels: { ...this.skillLevels },
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
    this.currentMapId = progress.mapId;
    this.playerTileX = progress.tileX;
    this.playerTileY = progress.tileY;
    this.facing = progress.facing;
    this.inventory = progress.inventory.map((slot) =>
      slot ? { itemId: slot.itemId, count: slot.count } : null
    );
    this.equipment = { ...progress.equipment };
    // El outfit se deriva del slot armor en syncEquippedArmorOutfit (evita desync con el sprite).
    this.equippedOutfit = "base";
    this.equippedArmorVisual = undefined;
    this.playerProgress = { ...progress.playerProgress };
    this.skillLevels = { ...progress.skillLevels };
    this.learnedSpellIds.clear();
    progress.learnedSpellIds.forEach((spellId) => {
      this.learnedSpellIds.add(spellId);
    });
    this.macroBindings = progress.macroBindings.map((binding) => ({
      keyCode: binding.keyCode,
      action: binding.action,
      itemId: binding.itemId,
      spellId: binding.spellId,
    }));
    this.killStats = { ...progress.killStats };
    this.deathPhase = progress.deathPhase;
    this.useGhostAppearance =
      progress.deathPhase === "alive" ? false : progress.useGhostAppearance;
    // Estado global por mapa compartido entre personajes en este cliente.
    if (this.worldItemManager) {
      this.worldItemManager.loadSharedStorage();
    }
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
    if (this.deathPhase !== "alive") {
      this.applyGhostVisual();
    } else {
      this.syncEquippedArmorOutfit();
      this.syncEquippedHeldItemVisuals();
      this.playFacingAnim("idle");
    }
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
    if (!this.playerNameLabel) return;
    const colors = getPlayerNameColors(this.selectedFaction, this.playerRole);
    this.playerNameLabel.setColor(colors.fill);
    this.playerNameLabel.setStroke(colors.stroke, WORLD_NAME_STROKE);
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

  private createPlayer() {
    if (this.player) return;

    const { x, y } = this.getPlayerFeetWorldForTile(this.playerTileX, this.playerTileY);

    this.player = this.add.sprite(
      x,
      y,
      this.useGhostAppearance && this.deathPhase !== "alive"
        ? textureKeyForPlayer(
            "base",
            raceBodyTextureKey(GHOST_RACE_ID, "male"),
            undefined
          )
        : textureKeyForPlayer(
            this.equippedOutfit,
            this.getVisualBodyTextureKey(),
            this.equippedArmorVisual,
            this.selectedRace
          ),
      0
    );
    applyPlayerOrigin(this.player);
    this.player.setDepth(this.depthFromFeetY(y));

    const faceLayout = this.getActiveFaceLayout();

    this.playerFace = this.add.sprite(
      x,
      y,
      faceTextureKey(this.selectedRace, this.selectedGender),
      getFaceFrame(this.selectedRace, this.selectedGender, this.selectedFaceIndex, this.facing)
    );

  this.playerFace.setOrigin(0.5, 1);
  this.playerFace.setScale(faceLayout.scale);
  this.playerFace.setDepth(this.player.depth + 0.02);
  this.syncPlayerFacePosition();

  this.equippedWeaponSprite = createEquippedOverlaySprite(this, x, y);
  this.equippedShieldSprite = createEquippedOverlaySprite(this, x, y);
  this.equippedHelmetSprite = createEquippedOverlaySprite(this, x, y);
  this.syncEquippedHeldItemVisuals();

  const nameColors = getPlayerNameColors(this.selectedFaction, this.playerRole);
  this.playerNameLabel = this.add
    .text(x, y + 2, this.playerName, {
      fontFamily: GAME_FONT,
      fontSize: `${WORLD_NAME_FONT_SIZE}px`,
      color: nameColors.fill,
      fontStyle: "bold",
      stroke: nameColors.stroke,
      strokeThickness: WORLD_NAME_STROKE,
      resolution: GAME_TEXT_RESOLUTION,
    })
    .setOrigin(0.5, 0)
    .setDepth(this.player.depth + 2);

  this.setupPlayerHitboxInteraction();
  this.player.on("pointerdown", () => {
    if (this.combatController.hasPendingSpellCast()) {
      this.combatController.tryCastSpellOnPlayer();
      return;
    }
    this.inspectPlayerCharacter();
  });
    
    this.playFacingAnim("idle");
  }

  private inspectPlayerCharacter() {
    const baseText = formatCharacterInspectLine(
      this.playerName,
      this.playerAffiliation,
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

  private handleServerPlayerUpdated(state: NetPlayerState) {
    const localId = this.mpController.getPlayerId();
    if (!localId) return;
    if (state.id === localId) {
      this.syncLocalVitalsFromServer(state);
      this.syncLocalEquipmentFromServer(state);
      return;
    }
    this.multiplayer?.updateRemote(state, this.currentMapId);
  }

  private syncLocalVitalsFromServer(state: NetPlayerState | null | undefined) {
    if (!state) {
      return;
    }
    this.playerProgress.hp = state.hp;
    this.playerProgress.hpMax = state.hpMax;
    this.playerProgress.mp = state.mp;
    this.playerProgress.mpMax = state.mpMax;
    this.playerProgress.level = state.level;
    this.refreshHud();
  }

  private syncLocalEquipmentFromServer(state: NetPlayerState | null | undefined) {
    if (!state?.equipment) {
      return;
    }
    this.equipment.weapon = (state.equipment.weaponId as ItemId | null) ?? null;
    this.equipment.shield = (state.equipment.shieldId as ItemId | null) ?? null;
    this.equipment.helmet = (state.equipment.helmetId as ItemId | null) ?? null;
    this.equipment.armor = (state.equipment.armorId as ItemId | null) ?? null;
    this.syncEquippedArmorOutfit();
    this.syncEquippedHeldItemVisuals();
    this.gameUi.setEquippedItemIds(
      Object.values(this.equipment).filter((id): id is ItemId => id != null)
    );
    this.refreshInventoryUi();
  }

  private handleServerPlayerDied(playerId: string, killerName: string) {
    if (playerId === this.mpController.getPlayerId()) {
      this.playerProgress.hp = 0;
      this.handlePlayerDeath();
      this.gameUi.addCombatLine(`Has sido asesinado por ${killerName}.`);
    } else {
      this.multiplayer?.getRemotePlayers()?.setPlayerGhost(playerId);
    }
  }

  private isMultiplayerActive() {
    return this.mpController.isActive();
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
    WEAPONS.forEach((weapon) => {
      addToInventory(this.inventory, weapon.itemId, 1);
    });
    addToInventory(this.inventory, "potion_hp", TEST_HEALTH_POTION_STACK);
    addToInventory(this.inventory, "potion_mp", TEST_MANA_POTION_STACK);
    addToInventory(this.inventory, "potion_strength", 5);
    addToInventory(this.inventory, "potion_agility", 5);
    addToInventory(this.inventory, "anillo_espectral", 1);
    addToInventory(this.inventory, "armor_cuero", 1);
    addToInventory(this.inventory, "armor_placas", 1);
    addToInventory(this.inventory, "armor_placas_rojas", 1);
    addToInventory(this.inventory, "armor_placas_azules", 1);
    addToInventory(this.inventory, "armor_tunica_nigro", 1);
    addToInventory(this.inventory, "armor_tunica_azul", 1);
    addToInventory(this.inventory, "armor_dragon_negro", 1);
    addToInventory(this.inventory, "armor_dragon_negro_bajos", 1);
    this.refreshInventoryUi();
  }

  private initializeStarterSpells() {
    SPELL_DEFINITIONS.forEach((spell) => {
      this.learnedSpellIds.add(spell.idSpell);
    });
  }

  private refreshKnownSpellsUi() {
    const knownSpells = SPELL_DEFINITIONS.filter(
      (spell) =>
        this.learnedSpellIds.has(spell.idSpell) &&
        spell.usableBy.includes(this.selectedClass) &&
        spell.nivelMagiaRequerido <= this.getMagicSkillLevel()
    );
    this.gameUi.setSpells(knownSpells);
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
    this.gameUi.addChatLine(`Debug hitbox: ${enabled ? "ON" : "OFF"}`);
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
    const stack = this.inventory[slotIndex];
    if (!stack) {
      return;
    }

    const item = getItemDefinition(stack.itemId);
    const usability = canUseItem(
      this.selectedClass,
      this.selectedRace,
      this.playerProgress.level,
      item
    );
    if (!usability.allowed) {
      this.gameUi.addChatLine(usability.reason ?? "No podés usar ese objeto.");
      return;
    }

    if (item.type !== "consumable" || !item.consumableEffects) {
      this.gameUi.addChatLine(`${item.name} no se puede usar.`);
      return;
    }

    const { healHpPercent, restoreMpPercent, learnSpellId, attributeBuff } =
      item.consumableEffects;

    if (
      !options?.skipMultiplayer &&
      this.multiplayer?.isConnected() &&
      !learnSpellId &&
      (healHpPercent || restoreMpPercent || attributeBuff)
    ) {
      if (!this.isMultiplayerActive()) {
        this.gameUi.addChatLine("Conectando con el servidor...");
        return;
      }
      if (!this.multiplayer!.getSpawnSynced()) {
        this.gameUi.addChatLine("Esperá a que termine la conexión con el servidor.");
        return;
      }
      this.multiplayer!.sendUseItem(stack.itemId, slotIndex);
      return;
    }
    if (learnSpellId) {
      const learned = this.tryLearnSpellFromScroll(learnSpellId, item.name);
      if (!learned) {
        return;
      }

      this.consumeOneFromSlot(slotIndex, item.textureKey);
      this.refreshKnownSpellsUi();
      return;
    }

    if (attributeBuff === "strength" || attributeBuff === "agility") {
      this.expireAttributePotionBuffsIfNeeded();
      const statLabel = attributeBuff === "strength" ? "Fuerza" : "Agilidad";
      const result = this.tryApplyAttributeBuffFromPotion(attributeBuff);
      this.resetAttributePotionTimer();

      this.consumeOneFromSlot(slotIndex, item.textureKey);
      this.refreshSkillsUi();
      this.refreshHud();

      if (result.atCap && result.gained <= 0) {
        this.gameUi.addChatLine(
          `Usaste ${item.name}. Renovaste el efecto por 90 s (ya tenés el máximo de ${statLabel}).`
        );
        return;
      }

      const totalBonus = Math.floor(this.attributeBuffs[attributeBuff]);
      this.gameUi.addChatLine(
        `Usaste ${item.name} y ganaste +${result.gained} ${statLabel} (bono +${totalBonus}, stat ${result.newStatValue}/${STAT_MAX + ATTRIBUTE_POTION_BUFF_MAX}, 90 s).`
      );
      return;
    }

    if (restoreMpPercent && restoreMpPercent > 0) {
      if (!CLASS_USES_MANA[this.selectedClass] || this.playerProgress.mpMax <= 0) {
        this.gameUi.addChatLine("Tu clase no usa maná.");
        return;
      }
      if (this.playerProgress.mp >= this.playerProgress.mpMax) {
        this.gameUi.addChatLine("Ya tenés el maná al máximo.");
        return;
      }

      const manaAmount = Math.max(
        1,
        Math.floor(this.playerProgress.mpMax * restoreMpPercent)
      );
      const before = this.playerProgress.mp;
      this.playerProgress.mp = Math.min(
        this.playerProgress.mpMax,
        this.playerProgress.mp + manaAmount
      );
      const restored = this.playerProgress.mp - before;

      this.consumeOneFromSlot(slotIndex, item.textureKey);
      this.refreshHud();
      this.gameUi.addChatLine(
        `Usaste ${item.name} y recuperaste ${restored} MP (${Math.round(restoreMpPercent * 100)}%).`
      );
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

  private resetAttributePotionTimer() {
    this.attributeBuffExpiresAt = this.time.now + ATTRIBUTE_POTION_BUFF_DURATION_MS;
  }

  private clearAttributePotionBuffs(notify = false) {
    const hadBuff =
      this.attributeBuffs.strength > 0 ||
      this.attributeBuffs.agility > 0 ||
      this.attributeBuffExpiresAt > 0;
    this.attributeBuffs = { strength: 0, agility: 0 };
    this.attributeBuffExpiresAt = 0;
    if (notify && hadBuff) {
      this.gameUi.addChatLine(
        "El efecto de las pociones de fuerza y agilidad terminó."
      );
      this.refreshSkillsUi();
    }
  }

  /** @returns true si se limpiaron buffs por expiración */
  private expireAttributePotionBuffsIfNeeded(): boolean {
    if (this.attributeBuffExpiresAt <= 0) {
      return false;
    }
    if (this.time.now < this.attributeBuffExpiresAt) {
      return false;
    }
    this.clearAttributePotionBuffs(true);
    return true;
  }

  private handleServerUseItemAck(ack: ServerUseItemAckMessage) {
    if (typeof ack.hp === "number") {
      this.playerProgress.hp = ack.hp;
    }
    if (typeof ack.mp === "number") {
      this.playerProgress.mp = ack.mp;
    }
    if (ack.attributeBuffs) {
      this.attributeBuffs = {
        strength: ack.attributeBuffs.strength,
        agility: ack.attributeBuffs.agility,
      };
      this.attributeBuffExpiresAt = ack.buffExpiresAtMs ?? 0;
      this.refreshSkillsUi();
    }
    this.refreshHud();
    this.gameUi.addChatLine(ack.message);

    if (ack.clientOnly && typeof ack.inventorySlot === "number") {
      this.useConsumableFromSlot(ack.inventorySlot, { skipMultiplayer: true });
      this.persistCharacterProgress();
      return;
    }

    const slotIndex = this.resolveInventorySlotForItemAck(ack);
    if (slotIndex >= 0) {
      const item = getItemDefinition(ack.itemId as ItemId);
      this.consumeOneFromSlot(slotIndex, item.textureKey);
    }
    this.persistCharacterProgress();
  }

  private syncLocalGoldFromServer(gold: number | undefined) {
    if (typeof gold !== "number" || !Number.isFinite(gold)) {
      return;
    }
    this.playerProgress.gold = Math.max(0, Math.floor(gold));
    this.refreshHud();
  }

  private syncWorldItemsFromServer(items: NetWorldItemState[] | null | undefined) {
    if (!this.isMultiplayerActive()) {
      return;
    }
    this.worldItemManager.syncFromNetStates(items);
  }

  private applyWorldItemSpawned(mapId: string, item: NetWorldItemState) {
    if (!this.isMultiplayerActive() || mapId !== this.currentMapId) {
      return;
    }
    this.worldItemManager.applyNetSpawned(mapId, item);
  }

  private applyWorldItemUpdated(
    mapId: string,
    item: import("../../shared/types").NetWorldItemState
  ) {
    if (!this.isMultiplayerActive() || mapId !== this.currentMapId) {
      return;
    }
    this.worldItemManager.applyNetUpdated(mapId, item);
  }

  private applyWorldItemRemoved(mapId: string, worldItemId: string) {
    if (!this.isMultiplayerActive() || mapId !== this.currentMapId) {
      return;
    }
    this.worldItemManager.applyNetRemoved(mapId, worldItemId);
  }

  private syncLocalInventoryFromServer(slots: NetInventorySlotState[] | undefined) {
    if (!Array.isArray(slots)) {
      return;
    }
    this.inventory = Array(INVENTORY_SLOT_COUNT).fill(null);
    for (const slot of slots) {
      const slotIndex =
        typeof slot.slotIndex === "number" && Number.isFinite(slot.slotIndex)
          ? Math.floor(slot.slotIndex)
          : -1;
      if (slotIndex < 0 || slotIndex >= INVENTORY_SLOT_COUNT) {
        continue;
      }
      const amount =
        typeof slot.amount === "number" && Number.isFinite(slot.amount)
          ? Math.max(0, Math.floor(slot.amount))
          : 0;
      const itemId =
        typeof slot.itemId === "string" && slot.itemId.trim() ? slot.itemId.trim() : null;
      if (!itemId || amount <= 0) {
        continue;
      }
      try {
        const definition = getItemDefinition(itemId as ItemId);
        this.inventory[slotIndex] = { itemId: definition.id, count: amount };
      } catch {
        continue;
      }
    }
    this.refreshInventoryUi();
    this.gameUi.setEquippedItemIds(
      Object.values(this.equipment).filter((id): id is ItemId => id != null)
    );
  }

  private resolveInventorySlotForItemAck(ack: ServerUseItemAckMessage): number {
    if (typeof ack.inventorySlot === "number" && ack.inventorySlot >= 0) {
      const preferred = this.inventory[ack.inventorySlot];
      if (preferred?.itemId === ack.itemId && preferred.count > 0) {
        return ack.inventorySlot;
      }
    }
    return this.inventory.findIndex(
      (stack) => stack?.itemId === ack.itemId && stack.count > 0
    );
  }

  private tryApplyAttributeBuffFromPotion(stat: "strength" | "agility"): {
    gained: number;
    atCap: boolean;
    newStatValue: number;
  } {
    const current = Math.floor(this.attributeBuffs[stat]);
    if (current >= ATTRIBUTE_POTION_BUFF_MAX) {
      const natural = resolveCoreStats(this.selectedRace, this.selectedClass);
      return {
        gained: 0,
        atCap: true,
        newStatValue: natural[stat] + current,
      };
    }

    const roll = Phaser.Math.Between(ATTRIBUTE_POTION_GAIN_MIN, ATTRIBUTE_POTION_GAIN_MAX);
    const gained = Math.min(roll, ATTRIBUTE_POTION_BUFF_MAX - current);
    this.attributeBuffs[stat] = current + gained;
    const core = this.getCoreStats();
    return { gained, atCap: false, newStatValue: core[stat] };
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
    if (spell.nivelMagiaRequerido > this.getMagicSkillLevel()) {
      this.gameUi.addChatLine(
        `Necesitás ${spell.nivelMagiaRequerido} puntos de Magia para aprender ${spell.nombre}.`
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

    this.gameUi.setInventorySlot(slotIndex, textureKey, stack.count, stack.itemId);
  }

  private createWorldItem(
    itemId: ItemId,
    tileX: number,
    tileY: number,
    count = 1,
    options?: { exactTile?: boolean }
  ) {
    this.worldItemManager.createItem(itemId, tileX, tileY, count, options);
  }

  private createWorldGold(
    tileX: number,
    tileY: number,
    count: number,
    options?: { exactTile?: boolean }
  ) {
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

  revivePlayerFromAlly() {
    this.deathSystem.reviveFromAlly();
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
    this.gameUi.setMapLocation(
      this.currentMap.name,
      this.playerTileX,
      this.playerTileY
    );
  }

  private refreshHud() {
    this.refreshMapLocationLabel();
    this.refreshMinimap();
    this.mapController.updateWorldMapMarker();
    const p = this.playerProgress;

    this.gameUi.setStats({
      name: this.playerName,
      nameColor: getPlayerNameColors(this.selectedFaction, this.playerRole).fill,
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
    const bounds = this.mapController.getMinimapBounds();
    this.gameUi.updateMinimap(
      this.currentMap,
      this.playerTileX,
      this.playerTileY,
      bounds
    );
  }

  update(_time: number, delta: number) {
    this.expireAttributePotionBuffsIfNeeded();
    this.mapController.snapCameraScroll();
    this.drawHitboxDebugOverlay();
    this.updatePlayerDebuffs();
    this.meditationSystem.update(delta);
    this.updateMobShowcaseAi();
    this.updateMobAi();
    this.syncEntityDepths();
    this.syncMovingMobFaces();
    this.syncPlayerFacePosition();
    this.syncPlayerNameLabelPosition();
    this.syncEquippedHeldItemVisuals();
    this.meditationSystem.syncFxPosition();
    this.syncSceneryOcclusion();

    if (!this.cursors || !this.wasd || this.isChangingMap) {
      return;
    }

    if (
      this.gameUi.isChatFocused() ||
      this.gameUi.isConfirmOpen() ||
      this.gameUi.isMacroEditorOpen() ||
      this.gameUi.isStatsOverlayOpen() ||
      (this.bankOverlay?.isOpen() ?? false) ||
      (this.shopOverlay?.isOpen() ?? false)
    ) {
      return;
    }

    if (this.worldMapToggleKey && Phaser.Input.Keyboard.JustDown(this.worldMapToggleKey)) {
      this.mapController.toggleWorldMap();
      return;
    }
    if (
      this.combatController.hasPendingSpellCast() &&
      this.cancelSpellTargetingKey &&
      Phaser.Input.Keyboard.JustDown(this.cancelSpellTargetingKey)
    ) {
      this.combatController.cancelSpellTargeting("Lanzamiento cancelado.");
      return;
    }
    if (this.shopOverlay?.isOpen() && Phaser.Input.Keyboard.JustDown(this.cancelSpellTargetingKey)) {
      this.shopOverlay.handleEscape();
      return;
    }
    if (this.bankOverlay?.isOpen() && Phaser.Input.Keyboard.JustDown(this.cancelSpellTargetingKey)) {
      this.bankOverlay.handleEscape();
      return;
    }
    if (this.mapController.isWorldMapOpen()) {
      return;
    }

    if (this.isPlayerDeadOrGhost()) {
      if (this.meditateKey && Phaser.Input.Keyboard.JustDown(this.meditateKey)) {
        this.gameUi.addChatLine("No podés meditar estando muerto o en forma fantasma.");
      }
      if (this.attackKey && Phaser.Input.Keyboard.JustDown(this.attackKey)) {
        this.gameUi.addChatLine("No podés atacar en esta forma.");
      }
      if (this.isMoving) {
        return;
      }
      const direction = this.getPressedDirection();
      if (direction) {
        this.stopMeditation("Dejaste de meditar.");
        if (this.isMultiplayerActive()) {
          this.tryNetworkStep(direction);
        } else {
          this.tryStep(direction);
        }
      }
      return;
    }

    if (this.meditateKey && Phaser.Input.Keyboard.JustDown(this.meditateKey)) {
      this.meditationSystem.toggle("hotkey");
      return;
    }

    if (this.attackKey && Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.stopMeditation("Dejaste de meditar.");
      this.combatController.tryAttackDummy();
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
      this.inventoryController.tryPickupAtPlayerTile();
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
    if (this.isMultiplayerActive()) {
      this.tryNetworkStep(direction);
      return;
    }
    this.tryStep(direction);
  }

  private isPlayerImmobilized(now = this.time.now): boolean {
    return now < this.playerImmobilizedUntilMs;
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

  private syncSceneryOcclusion() {
    if (!this.player) return;

    const applyOcclusion = (
      sprite: Phaser.GameObjects.Image,
      occludedAlpha: number
    ) => {
      const bounds = sprite.getBounds();
      const playerBehind =
        this.player.x >= bounds.left &&
        this.player.x <= bounds.right &&
        this.player.y <= sprite.y &&
        this.player.y >= bounds.top;
      sprite.setAlpha(playerBehind ? occludedAlpha : 1);
    };

    this.mapController.getMapTrees().forEach((tree) =>
      applyOcclusion(tree, TREE_OCCLUDED_ALPHA)
    );
    this.mapController.getMapBuildings().forEach((building) =>
      applyOcclusion(building, BUILDING_OCCLUDED_ALPHA)
    );
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
        spell.nivelMagiaRequerido <= this.getMagicSkillLevel()
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
        nivelMagiaRequerido: spellDefinition.nivelMagiaRequerido,
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
    const transition = findTransition(
      this.currentMapId,
      this.playerTileX,
      this.playerTileY,
      this.facing
    );

    if (transition) {
      if (this.isMultiplayerActive()) {
        this.gameUi.addChatLine(
          "No podés cambiar de mapa en multijugador (solo Pueblo está disponible online)."
        );
        return;
      }
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
        "No podés cambiar de mapa en multijugador (solo Pueblo está disponible online)."
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

    if (state === "walk" && isProfile) {
      this.player.play({ key, repeat: -1 }, true);
    } else {
      // Siempre reiniciar idle/walk frontal: setTexture(..., 0) deja frame 0 (abajo)
      // aunque currentAnim.key siga siendo el de otro facing.
      this.player.play(key);
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
    if (!this.player || !this.playerFace) return;
  
    const offset = this.getActiveFaceLayout().offset[this.facing];
    const { x: walkSwayX, y: walkSwayY } = getPlayerHeadWalkSway(
      this.player,
      this.facing,
      this.isMoving
    );
  
    this.playerFace.setPosition(
      this.player.x + offset.x + walkSwayX,
      this.player.y - offset.y + walkSwayY
    );
    this.playerFace.setDepth(this.player.depth + 0.02);
    this.syncEquippedHelmetVisual(walkSwayX, walkSwayY);
  }

  private syncPlayerNameLabelPosition() {
    if (!this.player || !this.playerNameLabel) return;

    this.playerNameLabel.setPosition(this.player.x, this.player.y + 2);
    this.playerNameLabel.setDepth(this.player.depth + 2);
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

  private syncEquippedHelmetVisual(walkSwayX?: number, walkSwayY?: number) {
    if (!this.isWorldSceneLive()) {
      return;
    }
    applyEquippedHelmetVisual({
      ...this.getEquippedGearContext(),
      walkSwayX,
      walkSwayY,
    });
  }

  private syncEquippedHeldItemVisuals() {
    if (!this.isWorldSceneLive()) {
      return;
    }
    applyEquippedHeldItemVisuals(this.getEquippedGearContext());
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
    const model = MOB_MODELS[dummy.modelId];
    dummy.sprite.setOrigin(0.5, model.facingOriginY?.[dummy.facing] ?? 1);
  }

  private syncDummyWorldPosition(dummy: DummyState) {
    this.syncMobSpriteOrigin(dummy);
    const feet = this.getMobFeetWorld(dummy.modelId, dummy.tileX, dummy.tileY);
    dummy.sprite.setPosition(feet.x, feet.y);
    const depth = this.depthFromFeetY(feet.y);
    dummy.sprite.setDepth(depth);
    this.syncMobFaceForDummy(dummy);
    dummy.hpLabel.setPosition(feet.x, feet.y - 30);
    dummy.hpLabel.setDepth(depth + 3);
  }

  private attachMobFaceIfNeeded(dummy: DummyState, facing: Facing = dummy.facing) {
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

  private syncMovingMobFaces() {
    for (const dummy of this.dummies) {
      if (!dummy.face || !dummy.alive || dummy.mapId !== this.currentMapId) continue;
      syncMobFaceSprite(dummy.sprite, dummy.face, dummy.modelId, dummy.facing);
      dummy.face.setDepth(dummy.sprite.depth + 0.02);
    }
  }

  private syncMobFaceForDummy(dummy: DummyState) {
    if (!dummy.face) {
      return;
    }
    syncMobFaceSprite(dummy.sprite, dummy.face, dummy.modelId, dummy.facing);
    dummy.face.setDepth(dummy.sprite.depth + 0.02);
    dummy.face.setVisible(dummy.sprite.visible);
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

  private createMobShowcaseIfNeeded() {
    this.mobController.createShowcaseIfNeeded();
  }

  private removeShowcaseDummies() {
    this.mobController.removeShowcaseDummies();
  }

  private destroyAllDummies() {
    this.mobController.destroyAll();
  }

  private updateMobShowcaseAi() {
    this.mobController.updateShowcaseAi();
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

  private killDummy(dummy: DummyState) {
    if (this.inspectedDummyId === dummy.id) {
      this.inspectedDummyId = null;
    }
    this.stopDummyMovement(dummy);
    dummy.alive = false;
    dummy.nextAiMoveAt = 0;
    dummy.nextAttackAt = 0;
    dummy.immobilizedUntilMs = 0;
    dummy.isAggroed = false;
    dummy.sprite.stop();
    dummy.sprite.clearTint();
    dummy.sprite.setVisible(false);
    if (dummy.face) {
      dummy.face.setVisible(false);
    }
    dummy.hpLabel.setVisible(false);
    this.gameUi.addCombatLine(`${dummy.name} fue destruido.`);
    this.killStats.creaturesKilled += 1;
    this.refreshSkillsUi();
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
    this.skillLevels = createInitialSkillLevels();
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
    this.refreshSkillsUi();
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

      const magiaCapGain = getSkillCapGainBetweenLevels(
        "magia",
        this.playerProgress.level - 1,
        this.playerProgress.level
      );
      this.gameUi.addChatLine(
        `Subiste a nivel ${this.playerProgress.level}! HP+${levelBonuses.hpBonus}, MP+${levelBonuses.mpBonus}. Tope de Magia +${magiaCapGain}.`
      );
      this.refreshSkillsUi();
      this.refreshInventoryUsability();
    }

    this.refreshHud();
    this.scheduleCharacterProgressSave();
  }

  private scheduleDummyRespawn(dummy: DummyState) {
    if (dummy.isShowcase || dummy.respawnMs <= 0) {
      return;
    }
    this.time.delayedCall(dummy.respawnMs, () => {
      const spawnTile = dummy.fixedSpawnTile ?? this.pickRandomMobSpawnTile(dummy.spawnConfig);
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
    const byBaseAnchor = getMobFootprintTiles(
      dummy.tileX,
      dummy.tileY,
      dummy.hitboxWidthTiles,
      dummy.hitboxHeightTiles
    );
    const byVisualOffset = this.getDummyTargetTiles(dummy);
    const unique = new Map<string, { x: number; y: number }>();
    for (const tile of [...byBaseAnchor, ...byVisualOffset]) {
      unique.set(`${tile.x},${tile.y}`, tile);
    }
    return [...unique.values()];
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
    const hitArea = this.getPlayerHitboxAreaRect(this.player);
    this.player.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    this.player.input!.cursor = "pointer";
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
    return containsWorldPointInHitArea(this.player, worldX, worldY);
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
          return;
        }

        if (this.combatController.hasPendingSpellCast()) {
          const spell = this.combatController.getPendingSpellCast()!;
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

          if (this.combatController.spellCanTargetPlayer(spell)) {
            for (const gameObject of currentlyOver) {
              if (gameObject === this.player) {
                this.combatController.tryCastSpellOnPlayer();
                return;
              }
            }

            if (this.findPlayerAtWorldPoint(pointer.worldX, pointer.worldY)) {
              this.combatController.tryCastSpellOnPlayer();
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
        }

        const inspectedDummy = this.findDummyAtWorldPoint(
          pointer.worldX,
          pointer.worldY
        );
        if (inspectedDummy?.alive) {
          this.inspectDummy(inspectedDummy);
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
    if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) {
      return false;
    }
    return getTileDefinition(map.tiles[tileY][tileX]).walkable;
  }

  private getDummyOccupiedTiles(dummy: DummyState): { x: number; y: number }[] {
    return this.getDummyTargetTiles(dummy);
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
    if (state === "walk") {
      playMobWalkAnimation(dummy.sprite, dummy.modelId, dummy.facing);
    } else {
      playMobIdleFrame(dummy.sprite, dummy.modelId, dummy.facing);
    }
    this.syncMobFaceForDummy(dummy);
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

  private playSpellEffect(spellId: number, tileX: number, tileY: number) {
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
    if (fxConfig.playHitSound) {
      this.playHitSound();
    }
  }

  private playSpawnEffect() {
    const fx = SPAWN_FX_CONFIG;
    const { x, y } = tileToFeetWorld(this.playerTileX, this.playerTileY, TILE_SIZE);
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
    if (this.equipment.armor) {
      this.gameUi.addChatLine("Quitá la armadura del cuerpo antes de cambiar la ropa de ciudadano.");
      return;
    }
    if (this.equippedOutfit === "base") {
      const check = canRaceEquipArmor(this.selectedRace, true);
      if (!check.allowed) {
        this.gameUi.addChatLine(check.reason ?? "No podés usar esa ropa.");
        return;
      }
      this.equippedOutfit = "citizen";
      this.equippedArmorVisual = getDefaultArmorVisualForOutfit("citizen");
    } else {
      this.equippedOutfit = "base";
      this.equippedArmorVisual = undefined;
    }
    this.applyLocalPlayerBodyVisual();
    this.syncEquippedHeldItemVisuals();
    const label =
      this.equippedOutfit === "citizen"
        ? "Equipaste Ropa de Ciudadano."
        : "Te quitaste la Ropa de Ciudadano.";

    this.gameUi.addChatLine(label);
  }
}