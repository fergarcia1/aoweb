import type Phaser from "phaser";
import type { CharacterGenderId, CharacterRaceId } from "../../data/characters";
import type { MacroActionType } from "../../ui/gameUi";
import type { Facing } from "../../player/playerSprites";
import type { ItemId } from "../../items/itemDefinitions";
import type { MobBehavior, MobDropConfig, MobModelId, MobSpawnConfig } from "../../data/mobs";
import type { ImperiumNpcBodySpriteConfig } from "../../game/npcs/imperiumNpcVisual";

export type MoveDirection = {
  dx: number;
  dy: number;
  facing: Facing;
};

export type DummyState = {
  spawnConfig: MobSpawnConfig;
  id: string;
  behavior: MobBehavior;
  modelId: MobModelId;
  name: string;
  mapId: string;
  tileX: number;
  tileY: number;
  hitboxOffsetY: number;
  hitboxHeightTiles: number;
  hitboxWidthTiles: number;
  sizeTiles: number;
  hp: number;
  maxHp: number;
  detectionRangeTiles: number;
  leashRangeTiles: number;
  minHit: number;
  maxHit: number;
  attackCooldownMs: number;
  respawnMs: number;
  expReward: number;
  gold: number;
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
  /** Tile destino del tween de red (evita reiniciar animación a mitad de paso). */
  netMoveTargetTile?: { x: number; y: number };
  /** Pasos pendientes del servidor para movimiento fluido en MP. */
  netMoveQueue?: Array<{ x: number; y: number; facing: Facing }>;
  wasAdjacentToPlayer: boolean;
  sprite: Phaser.GameObjects.Sprite;
  face?: Phaser.GameObjects.Sprite;
  hpLabel: Phaser.GameObjects.Text;
  alive: boolean;
  /** Timer de respawn local (solo modo solo; cancelar si el servidor revive el mob). */
  respawnTimer?: Phaser.Time.TimerEvent;
  /** Exhibición en caja de arena: circuito S→D→W→A sin IA de combate. */
  isShowcase?: boolean;
  showcaseStepIndex?: number;
  /** ID numérico del catálogo Imperium; presente solo en mobs del catálogo. */
  npcId?: number;
  /** Config visual Imperium; sustituye MOB_VISUAL_CONFIGS cuando está presente. */
  imperiumSpriteConfig?: ImperiumNpcBodySpriteConfig;
};

export type PlayerProgressState = {
  level: number;
  exp: number;
  expToNext: number;
  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;
  gold: number;
};

export type PlayerCombatSnapshot = {
  attackMin: number;
  attackMax: number;
  damageReductionPercent: number;
  magicResistancePercent: number;
  magicDamageBonusPercent: number;
  weaponCanCrit: boolean;
  weaponCritChance: number;
  weaponCritDamage: number;
};

export type DamageType = "physical" | "magic";

export type MacroBinding = {
  keyCode: string | null;
  action: MacroActionType;
  itemId: ItemId | null;
  /** Casillero de inventario elegido en el editor (evita equipar siempre el primer stack). */
  inventorySlotIndex: number | null;
  spellId: number | null;
};

export type SpellCastRequest = {
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

export type RaceId = CharacterRaceId;
export type ClassId =
  | "paladin"
  | "clerigo"
  | "mago"
  | "nigromante"
  | "druida"
  | "bardo"
  | "guerrero"
  | "cazador"
  | "asesino";
export type { CharacterFactionId } from "../../data/characters";

export type GameSceneInitData = {
  character?: import("../../data/characters").SavedCharacter;
  slotIndex?: number;
};

export type WorldItemEntry = {
  /** UUID del servidor en multijugador. */
  worldItemId?: string;
  id: ItemId | "gold";
  tileX: number;
  tileY: number;
  count: number;
  sprite: Phaser.GameObjects.Sprite;
};

export type MobHitboxOverride = {
  hitboxOffsetY: number;
  hitboxHeightTiles: number;
  hitboxWidthTiles: number;
};
