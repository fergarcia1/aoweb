import type { WebSocket } from "ws";
import type { AttributeBuffState } from "../../game-data/consumables";
import { INVENTORY_SLOT_COUNT } from "../../game-data/constants";
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

  level = 50;
  hp = 100;
  hpMax = 100;
  mp = 50;
  mpMax = 50;
  gold = 0;
  attackMin = 8;
  attackMax = 16;
  canCrit = false;
  critChance = 0;
  critDamage = 1.5;
  magicDamageBonusPercent = 0;
  damageReductionPercent = 0;
  magicResistancePercent = 0;
  nextAttackAt = 0;
  nextMoveAt = 0;
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
    this.mapId = "pueblo";
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
    this.role = this.name.trim().toLowerCase() === "lonler" ? "admin" : "player";
  }

  recalcDefenseStats() {
    const stats = getDefenseStatsFromEquipment(this.equipment);
    this.damageReductionPercent = stats.damageReductionPercent;
    this.magicResistancePercent = stats.magicResistancePercent;
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

  toNetState(): NetPlayerState {
    return {
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
    };
  }
}
