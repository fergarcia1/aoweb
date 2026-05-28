import type { PlayerSession } from "../PlayerSession";
import type {
  CharacterRow,
  CharacterSnapshot,
  PersistedCharacterSnapshot,
} from "./types";

/**
 * Maps runtime PlayerSession -> persistence snapshot.
 * Inventory/bank/skills/spells are placeholders until server-side authority is completed.
 */
export function buildSnapshotFromPlayerSession(
  session: PlayerSession,
  accountId: string | null = null
): PersistedCharacterSnapshot {
  const character: CharacterSnapshot = {
    id: session.characterId,
    accountId: session.accountId ?? accountId,
    name: session.name,
    role: session.role,
    mapId: session.mapId,
    tileX: session.tileX,
    tileY: session.tileY,
    facing: session.facing,
    raceId: session.raceId,
    genderId: session.genderId,
    classId: session.classId,
    factionId: session.factionId,
    faceIndex: session.faceIndex,
    level: session.level,
    hp: session.hp,
    hpMax: session.hpMax,
    mp: session.mp,
    mpMax: session.mpMax,
    equipment: {
      weaponItemId: session.equipment.weaponId,
      shieldItemId: session.equipment.shieldId,
      helmetItemId: session.equipment.helmetId,
      armorItemId: session.equipment.armorId,
      equippedOutfit: session.equipment.equippedOutfit,
    },
    attributeBuffs: {
      strengthBonus: Math.floor(session.attributeBuffs.strength),
      agilityBonus: Math.floor(session.attributeBuffs.agility),
      expiresAtMs: Math.max(0, Math.floor(session.attributeBuffs.expiresAtMs)),
    },
  };

  return {
    character,
    inventorySlots: session.inventorySlots.map((slot) => ({ ...slot })),
    bankSlots: [],
    skills: [],
    spells: [],
  };
}

export function mapCharacterSnapshotToRow(snapshot: CharacterSnapshot): CharacterRow {
  return {
    id: snapshot.id,
    account_id: snapshot.accountId,
    name: snapshot.name,
    role: snapshot.role,
    map_id: snapshot.mapId,
    tile_x: snapshot.tileX,
    tile_y: snapshot.tileY,
    facing: snapshot.facing,
    race_id: snapshot.raceId,
    gender_id: snapshot.genderId,
    class_id: snapshot.classId,
    faction_id: snapshot.factionId,
    face_index: snapshot.faceIndex,
    level: snapshot.level,
    hp: snapshot.hp,
    hp_max: snapshot.hpMax,
    mp: snapshot.mp,
    mp_max: snapshot.mpMax,
    weapon_item_id: snapshot.equipment.weaponItemId,
    shield_item_id: snapshot.equipment.shieldItemId,
    helmet_item_id: snapshot.equipment.helmetItemId,
    armor_item_id: snapshot.equipment.armorItemId,
    equipped_outfit: snapshot.equipment.equippedOutfit,
    attr_strength_bonus: snapshot.attributeBuffs.strengthBonus,
    attr_agility_bonus: snapshot.attributeBuffs.agilityBonus,
    attr_buffs_expires_at_ms: snapshot.attributeBuffs.expiresAtMs,
  };
}

export function mapCharacterRowToSnapshot(row: CharacterRow): PersistedCharacterSnapshot {
  return {
    character: {
      id: row.id,
      accountId: row.account_id,
      name: row.name,
      role: row.role,
      mapId: row.map_id,
      tileX: row.tile_x,
      tileY: row.tile_y,
      facing: row.facing,
      raceId: row.race_id,
      genderId: row.gender_id,
      classId: row.class_id,
      factionId: row.faction_id,
      faceIndex: row.face_index,
      level: row.level,
      hp: row.hp,
      hpMax: row.hp_max,
      mp: row.mp,
      mpMax: row.mp_max,
      equipment: {
        weaponItemId: row.weapon_item_id,
        shieldItemId: row.shield_item_id,
        helmetItemId: row.helmet_item_id,
        armorItemId: row.armor_item_id,
        equippedOutfit: row.equipped_outfit,
      },
      attributeBuffs: {
        strengthBonus: row.attr_strength_bonus,
        agilityBonus: row.attr_agility_bonus,
        expiresAtMs: row.attr_buffs_expires_at_ms,
      },
    },
    inventorySlots: [],
    bankSlots: [],
    skills: [],
    spells: [],
  };
}
