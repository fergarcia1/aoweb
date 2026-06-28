import type { PlayerSession } from "../PlayerSession";
import type {
  BankSlotSnapshot,
  CharacterRow,
  CharacterSnapshot,
  PersistedCharacterSnapshot,
  SpellSnapshot,
} from "./types";
import { expRequiredForLevel } from "../../../game-data/progressFormulas";

/**
 * Maps runtime PlayerSession -> persistence snapshot.
 */
export function buildSnapshotFromPlayerSession(
  session: PlayerSession,
  accountId: string | null = null
): PersistedCharacterSnapshot {
  const level = Math.max(1, Math.floor(session.level));
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
    level,
    exp: Math.max(0, Math.floor(session.exp)),
    expToNext: Math.max(1, Math.floor(session.expToNext)),
    usersKilled: Math.max(0, Math.floor(session.usersKilled || 0)),
    armadaEnemyKills: Math.max(0, Math.floor(session.armadaEnemyKills || 0)),
    arenaWins1v1: Math.max(0, Math.floor(session.arenaWins1v1 || 0)),
    pendingClanCreationPaid: session.pendingClanCreationPaid === true,
    clanName: session.clanName?.trim() || null,
    hp: session.hp,
    hpMax: session.hpMax,
    mp: session.mp,
    mpMax: session.mpMax,
    gold: session.gold,
    bankGold: Math.max(0, Math.floor(session.bankGold)),
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

  const spells: SpellSnapshot[] = [...session.learnedSpellIds]
    .filter((id) => Number.isFinite(id) && id > 0)
    .sort((a, b) => a - b)
    .map((spellId) => ({ spellId }));

  return {
    character,
    inventorySlots: session.inventorySlots.map((slot) => ({ ...slot })),
    bankSlots: session.bankSlots.map((slot) => ({ ...slot })),
    spells,
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
    exp: snapshot.exp,
    exp_to_next: snapshot.expToNext,
    users_killed: snapshot.usersKilled,
    armada_enemy_kills: snapshot.armadaEnemyKills,
    arena_wins_1v1: snapshot.arenaWins1v1,
    pending_clan_creation_paid: snapshot.pendingClanCreationPaid,
    clan_name: snapshot.clanName?.trim() || null,
    hp: snapshot.hp,
    hp_max: snapshot.hpMax,
    mp: snapshot.mp,
    mp_max: snapshot.mpMax,
    gold: snapshot.gold,
    bank_gold: snapshot.bankGold,
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

export function mapCharacterRowToSnapshot(
  row: CharacterRow,
  extras?: {
    inventorySlots?: PersistedCharacterSnapshot["inventorySlots"];
    bankSlots?: BankSlotSnapshot[];
    spells?: SpellSnapshot[];
  }
): PersistedCharacterSnapshot {
  const level = Math.max(1, Math.floor(row.level));
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
      level,
      exp: Math.max(0, Math.floor(row.exp)),
      expToNext:
        row.exp_to_next > 0 ? Math.floor(row.exp_to_next) : expRequiredForLevel(level),
      usersKilled: Math.max(0, Math.floor(row.users_killed || 0)),
      armadaEnemyKills: Math.max(0, Math.floor(row.armada_enemy_kills || 0)),
      arenaWins1v1: Math.max(0, Math.floor(row.arena_wins_1v1 || 0)),
      pendingClanCreationPaid: row.pending_clan_creation_paid === true,
      clanName: row.clan_name?.trim() || null,
      hp: row.hp,
      hpMax: row.hp_max,
      mp: row.mp,
      mpMax: row.mp_max,
      gold: row.gold,
      bankGold: Math.max(0, Math.floor(row.bank_gold)),
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
    inventorySlots: extras?.inventorySlots ?? [],
    bankSlots: extras?.bankSlots ?? [],
    spells: extras?.spells ?? [],
  };
}
