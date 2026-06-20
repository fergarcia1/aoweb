import type { AuctionRepository, CharacterRepository } from "./repository";
import type { AuctionSnapshot, PersistedCharacterSnapshot } from "./types";
import { Pool, type PoolClient } from "pg";
import {
  mapCharacterRowToSnapshot,
  mapCharacterSnapshotToRow,
} from "./playerMapper";
import type { CharacterRow } from "./types";

/**
 * PostgreSQL-backed repository.
 */
export class SqlCharacterRepository
  implements CharacterRepository, AuctionRepository
{
  private readonly pool: Pool;

  constructor(private readonly connectionString: string) {
    this.pool = new Pool({ connectionString: this.connectionString });
  }

  async getAll(): Promise<AuctionSnapshot[]> {
    const result = await this.pool.query<AuctionSnapshot>(
      `SELECT id, seller_id AS "sellerId", seller_name AS "sellerName", item_id AS "itemId", amount, price, expires_at_ms AS "expiresAtMs" FROM auctions`
    );
    return result.rows;
  }

  async getById(id: string): Promise<AuctionSnapshot | null> {
    const result = await this.pool.query<AuctionSnapshot>(
      `SELECT id, seller_id AS "sellerId", seller_name AS "sellerName", item_id AS "itemId", amount, price, expires_at_ms AS "expiresAtMs" FROM auctions WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async add(auction: AuctionSnapshot): Promise<void> {
    await this.pool.query(
      `INSERT INTO auctions (id, seller_id, seller_name, item_id, amount, price, expires_at_ms) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        auction.id,
        auction.sellerId,
        auction.sellerName,
        auction.itemId,
        auction.amount,
        auction.price,
        auction.expiresAtMs,
      ]
    );
  }

  async remove(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM auctions WHERE id = $1`, [id]);
  }

  async getByName(name: string): Promise<PersistedCharacterSnapshot | null> {

    const normalized = name.trim();
    if (!normalized) return null;

    const result = await this.pool.query<CharacterRow>(
      `
      SELECT
        id, account_id, name, role, map_id, tile_x, tile_y, facing,
        race_id, gender_id, class_id, faction_id, face_index,
        level, exp, exp_to_next, users_killed, hp, hp_max, mp, mp_max, gold, bank_gold,
        weapon_item_id, shield_item_id, helmet_item_id, armor_item_id,
        equipped_outfit, attr_strength_bonus, attr_agility_bonus, attr_buffs_expires_at_ms
      FROM characters
      WHERE lower(name) = lower($1) AND deleted_at IS NULL
      LIMIT 1
      `,
      [normalized]
    );

    const row = result.rows[0];
    if (!row) return null;

    const [inventoryRes, bankRes, spellsRes] = await Promise.all([
      this.pool.query<{
        slot_index: number;
        item_id: string | null;
        amount: number;
        is_equipped: boolean;
      }>(
        `
        SELECT slot_index, item_id, amount, is_equipped
        FROM character_inventory_slots
        WHERE character_id = $1
        ORDER BY slot_index ASC
        `,
        [row.id]
      ),
      this.pool.query<{
        slot_index: number;
        item_id: string | null;
        amount: number;
      }>(
        `
        SELECT slot_index, item_id, amount
        FROM character_bank_slots
        WHERE character_id = $1
        ORDER BY slot_index ASC
        `,
        [row.id]
      ),
      this.pool.query<{ spell_id: number }>(
        `
        SELECT spell_id
        FROM character_spells
        WHERE character_id = $1
        ORDER BY spell_id ASC
        `,
        [row.id]
      ),
    ]);

    return mapCharacterRowToSnapshot(row, {
      inventorySlots: inventoryRes.rows.map((entry) => ({
        slotIndex: entry.slot_index,
        itemId: entry.item_id,
        amount: entry.amount,
        isEquipped: entry.is_equipped,
      })),
      bankSlots: bankRes.rows.map((entry) => ({
        slotIndex: entry.slot_index,
        itemId: entry.item_id,
        amount: entry.amount,
      })),
      spells: spellsRes.rows.map((entry) => ({ spellId: entry.spell_id })),
    });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async upsertCharacterRow(client: PoolClient, row: CharacterRow) {
    await client.query(
      `
      INSERT INTO characters (
        id, account_id, name, role, map_id, tile_x, tile_y, facing,
        race_id, gender_id, class_id, faction_id, face_index,
        level, exp, exp_to_next, users_killed, hp, hp_max, mp, mp_max, gold, bank_gold,
        weapon_item_id, shield_item_id, helmet_item_id, armor_item_id,
        equipped_outfit, attr_strength_bonus, attr_agility_bonus, attr_buffs_expires_at_ms,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23,
        $24, $25, $26, $27,
        $28, $29, $30, $31,
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        account_id = EXCLUDED.account_id,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        map_id = EXCLUDED.map_id,
        tile_x = EXCLUDED.tile_x,
        tile_y = EXCLUDED.tile_y,
        facing = EXCLUDED.facing,
        race_id = EXCLUDED.race_id,
        gender_id = EXCLUDED.gender_id,
        class_id = EXCLUDED.class_id,
        faction_id = EXCLUDED.faction_id,
        face_index = EXCLUDED.face_index,
        level = EXCLUDED.level,
        exp = EXCLUDED.exp,
        exp_to_next = EXCLUDED.exp_to_next,
        users_killed = EXCLUDED.users_killed,
        hp = EXCLUDED.hp,
        hp_max = EXCLUDED.hp_max,
        mp = EXCLUDED.mp,
        mp_max = EXCLUDED.mp_max,
        gold = EXCLUDED.gold,
        bank_gold = EXCLUDED.bank_gold,
        weapon_item_id = EXCLUDED.weapon_item_id,
        shield_item_id = EXCLUDED.shield_item_id,
        helmet_item_id = EXCLUDED.helmet_item_id,
        armor_item_id = EXCLUDED.armor_item_id,
        equipped_outfit = EXCLUDED.equipped_outfit,
        attr_strength_bonus = EXCLUDED.attr_strength_bonus,
        attr_agility_bonus = EXCLUDED.attr_agility_bonus,
        attr_buffs_expires_at_ms = EXCLUDED.attr_buffs_expires_at_ms,
        updated_at = NOW()
      `,
      [
        row.id,
        row.account_id,
        row.name,
        row.role,
        row.map_id,
        row.tile_x,
        row.tile_y,
        row.facing,
        row.race_id,
        row.gender_id,
        row.class_id,
        row.faction_id,
        row.face_index,
        row.level,
        row.exp,
        row.exp_to_next,
        row.users_killed,
        row.hp,
        row.hp_max,
        row.mp,
        row.mp_max,
        row.gold,
        row.bank_gold,
        row.weapon_item_id,
        row.shield_item_id,
        row.helmet_item_id,
        row.armor_item_id,
        row.equipped_outfit,
        row.attr_strength_bonus,
        row.attr_agility_bonus,
        row.attr_buffs_expires_at_ms,
      ]
    );
  }

  private async upsertInventorySlots(client: PoolClient, snapshot: PersistedCharacterSnapshot) {
    await client.query("DELETE FROM character_inventory_slots WHERE character_id = $1", [
      snapshot.character.id,
    ]);
    for (const slot of snapshot.inventorySlots) {
      if (!slot.itemId && slot.amount <= 0) continue;
      await client.query(
        `
        INSERT INTO character_inventory_slots (
          character_id, slot_index, item_id, amount, is_equipped, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        `,
        [
          snapshot.character.id,
          slot.slotIndex,
          slot.itemId,
          slot.amount,
          slot.isEquipped,
        ]
      );
    }
  }

  private async upsertBankSlots(client: PoolClient, snapshot: PersistedCharacterSnapshot) {
    await client.query("DELETE FROM character_bank_slots WHERE character_id = $1", [
      snapshot.character.id,
    ]);
    for (const slot of snapshot.bankSlots) {
      if (!slot.itemId && slot.amount <= 0) continue;
      await client.query(
        `
        INSERT INTO character_bank_slots (
          character_id, slot_index, item_id, amount, updated_at
        ) VALUES ($1, $2, $3, $4, NOW())
        `,
        [snapshot.character.id, slot.slotIndex, slot.itemId, slot.amount]
      );
    }
  }

  private async upsertSpells(client: PoolClient, snapshot: PersistedCharacterSnapshot) {
    await client.query("DELETE FROM character_spells WHERE character_id = $1", [
      snapshot.character.id,
    ]);
    for (const spell of snapshot.spells) {
      await client.query(
        `
        INSERT INTO character_spells (character_id, spell_id, learned_at)
        VALUES ($1, $2, NOW())
        `,
        [snapshot.character.id, spell.spellId]
      );
    }
  }

  async upsert(snapshot: PersistedCharacterSnapshot): Promise<void> {
    const row = mapCharacterSnapshotToRow(snapshot.character);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await this.upsertCharacterRow(client, row);
      await this.upsertInventorySlots(client, snapshot);
      await this.upsertBankSlots(client, snapshot);
      await this.upsertSpells(client, snapshot);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
