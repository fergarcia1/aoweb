import type { WebSocket } from "ws";
import type { PvpSpellHitRecord } from "../../game-data/antiOneshot";
import { createEmptyPvpSpellHitRecords } from "../../game-data/antiOneshot";
import type { AttributeBuffState } from "../../game-data/consumables";
import { ADMIN_GM_HP_MAX, ADMIN_GM_MP_MAX, BANK_SLOT_COUNT, INVENTORY_SLOT_COUNT } from "../../game-data/constants";
import { expRequiredForLevel } from "../../game-data/progressFormulas";
import type {
  Facing,
  NetPlayerEquipment,
  NetPlayerState,
  PlayerRole,
} from "../../shared/types";
import { getAttackStatsFromEquipment, getDefenseStatsFromEquipment } from "../../shared/equipmentStats";

export type ServerInventorySlot = {
  slotIndex: number;
  itemId: string | null;
  amount: number;
  isEquipped: boolean;
};

export type ServerBankSlot = {
  slotIndex: number;
  itemId: string | null;
  amount: number;
};

export class PlayerSession {
  readonly id: string;
  characterId: string;
  accountId: string | null = null;
  socket: WebSocket;
  name: string;
  mapId: string;
  tileX: number;
  tileY: number;
  facing: Facing;
  raceId: string;
  genderId: string;
  classId: string;
  factionId: string;
  faceIndex: number;
  joined = false;
  role: PlayerRole = "player";
  /** Muerto en el mundo (fantasma); autoritativo para Resucitar aunque hp se desincronice. */
  isDead = false;
  /** Evita dropear loot de muerte más de una vez por ciclo muerte/revive. */
  deathLootProcessed = false;

  level = 1;
  exp = 0;
  expToNext = expRequiredForLevel(1);
  usersKilled = 0;
  hp = 100;
  hpMax = 100;
  mp = 50;
  mpMax = 50;
  gold = 0;
  bankGold = 0;
  attackMin = 8;
  attackMax = 16;
  canCrit = false;
  critChance = 0;
  critDamage = 1.5;
  magicDamageBonusPercent = 0;
  damageReductionPercent = 0;
  magicResistancePercent = 0;
  shieldBlockChancePercent = 0;
  shieldBlockReductionPercent = 0;
  nextAttackAt = 0;
  nextSpellAt = 0;
  nextMoveAt = 0;
  speedMultiplier = 1;
  isMeditating = false;
  isNavigating = false;
  nextMeditationRegenAt = 0;
  /** Hasta cuándo no puede moverse (inmovilizar / paralizar). */
  immobilizedUntil = 0;
  /** Hasta cuándo aplica invisibilidad (hechizo 14). */
  invisibleUntil = 0;
  /** Hechizos PvP recibidos (anti-oneshot por fuente distinta). */
  recentPvpSpellHits: PvpSpellHitRecord[] = createEmptyPvpSpellHitRecords();
  attributeBuffs: AttributeBuffState = { strength: 0, agility: 0, expiresAtMs: 0 };
  inventorySlots: ServerInventorySlot[] = Array.from(
    { length: INVENTORY_SLOT_COUNT },
    (_, slotIndex) => ({
      slotIndex,
      itemId: null,
      amount: 0,
      isEquipped: false,
    })
  );
  bankSlots: ServerBankSlot[] = Array.from({ length: BANK_SLOT_COUNT }, (_, slotIndex) => ({
    slotIndex,
    itemId: null,
    amount: 0,
  }));
  learnedSpellIds = new Set<number>();
  equipment: NetPlayerEquipment = {
    weaponId: null,
    shieldId: null,
    helmetId: null,
    armorId: null,
    equippedOutfit: "base",
  };

  /** Otros jugadores actualmente visibles en AOI (simétrico entre pares). */
  readonly aoiVisiblePlayerIds = new Set<string>();

  constructor(id: string, socket: WebSocket) {
    this.id = id;
    this.characterId = id;
    this.socket = socket;
    this.name = "Viajero";
    this.mapId = "mapa44";
    this.tileX = 0;
    this.tileY = 0;
    this.facing = "down";
    this.raceId = "human";
    this.genderId = "male";
    this.classId = "paladin";
    this.factionId = "ciudadano";
    this.faceIndex = 0;
  }

  assignRoleByName() {
    if (this.name.trim().toLowerCase() === "lonler") {
      this.role = "admin";
    }
    if (this.role === "admin") {
      this.hpMax = ADMIN_GM_HP_MAX;
      this.hp = ADMIN_GM_HP_MAX;
      this.mpMax = ADMIN_GM_MP_MAX;
      this.mp = ADMIN_GM_MP_MAX;
    }
  }

  recalcDefenseStats() {
    const stats = getDefenseStatsFromEquipment(this.equipment);
    this.damageReductionPercent = stats.damageReductionPercent;
    this.magicResistancePercent = stats.magicResistancePercent;
    this.shieldBlockChancePercent = stats.shieldBlockChancePercent;
    this.shieldBlockReductionPercent = stats.shieldBlockReductionPercent;
  }

  recalcAttackStats() {
    const stats = getAttackStatsFromEquipment(this.equipment);
    this.attackMin = stats.attackMin;
    this.attackMax = stats.attackMax;
    this.canCrit = stats.canCrit;
    this.critChance = stats.critChance;
    this.critDamage = stats.critDamage;
    this.magicDamageBonusPercent = stats.magicDamageBonusPercent;
  }

  isAdmin(): boolean {
    return this.role === "admin";
  }

  isImmobilized(nowMs = Date.now()): boolean {
    return nowMs < this.immobilizedUntil;
  }

  clearImmobilized(): void {
    this.immobilizedUntil = 0;
  }

  isInvisible(nowMs = Date.now()): boolean {
    return nowMs < this.invisibleUntil;
  }

  clearInvisible(): void {
    this.invisibleUntil = 0;
  }

  toNetState(options?: { includeAttributeBuffs?: boolean }): NetPlayerState {
    const state: NetPlayerState = {
      id: this.id,
      name: this.name,
      mapId: this.mapId,
      tileX: this.tileX,
      tileY: this.tileY,
      facing: this.facing,
      raceId: this.raceId,
      genderId: this.genderId,
      classId: this.classId,
      factionId: this.factionId,
      faceIndex: this.faceIndex,
      hp: this.hp,
      hpMax: this.hpMax,
      mp: this.mp,
      mpMax: this.mpMax,
      level: this.level,
      role: this.role,
      equipment: { ...this.equipment },
      isMeditating: this.isMeditating,
      isNavigating: this.isNavigating,
      invisibleUntilMs: Math.max(0, Math.floor(this.invisibleUntil)),
    };
    if (options?.includeAttributeBuffs) {
      state.attributeBuffs = {
        strength: Math.floor(this.attributeBuffs.strength),
        agility: Math.floor(this.attributeBuffs.agility),
      };
      state.buffExpiresAtMs = Math.max(0, Math.floor(this.attributeBuffs.expiresAtMs));
    }
    return state;
  }
}
