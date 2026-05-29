import type { Facing, PlayerRole } from "../../../shared/types";

export type EquipmentSnapshot = {
  weaponItemId: string | null;
  shieldItemId: string | null;
  helmetItemId: string | null;
  armorItemId: string | null;
  equippedOutfit: string;
};

export type AttributeBuffSnapshot = {
  strengthBonus: number;
  agilityBonus: number;
  expiresAtMs: number;
};

export type CharacterSnapshot = {
  id: string;
  accountId: string | null;
  name: string;
  role: PlayerRole;
  mapId: string;
  tileX: number;
  tileY: number;
  facing: Facing;
  raceId: string;
  genderId: string;
  classId: string;
  factionId: string;
  faceIndex: number;
  level: number;
  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;
  gold: number;
  equipment: EquipmentSnapshot;
  attributeBuffs: AttributeBuffSnapshot;
};

export type InventorySlotSnapshot = {
  slotIndex: number;
  itemId: string | null;
  amount: number;
  isEquipped: boolean;
};

export type BankSlotSnapshot = {
  slotIndex: number;
  itemId: string | null;
  amount: number;
};

export type SkillSnapshot = {
  skillId: string;
  level: number;
};

export type SpellSnapshot = {
  spellId: number;
};

export type PersistedCharacterSnapshot = {
  character: CharacterSnapshot;
  inventorySlots: InventorySlotSnapshot[];
  bankSlots: BankSlotSnapshot[];
  skills: SkillSnapshot[];
  spells: SpellSnapshot[];
};

export type CharacterRow = {
  id: string;
  account_id: string | null;
  name: string;
  role: PlayerRole;
  map_id: string;
  tile_x: number;
  tile_y: number;
  facing: Facing;
  race_id: string;
  gender_id: string;
  class_id: string;
  faction_id: string;
  face_index: number;
  level: number;
  hp: number;
  hp_max: number;
  mp: number;
  mp_max: number;
  gold: number;
  weapon_item_id: string | null;
  shield_item_id: string | null;
  helmet_item_id: string | null;
  armor_item_id: string | null;
  equipped_outfit: string;
  attr_strength_bonus: number;
  attr_agility_bonus: number;
  attr_buffs_expires_at_ms: number;
};
