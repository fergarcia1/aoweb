-- AOWEB normalized persistence schema (PostgreSQL-friendly SQL).
-- Notes:
-- - Uses text item ids to match current game-data catalog (e.g. "armor_dragon_negro").
-- - Keeps one row per slot/spell for easier queries and updates.
-- - Sin tabla de skills (el juego usa solo nivel mínimo por hechizo).
-- - `accounts` is optional in local/dev mode.

BEGIN;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'player',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'player',
  map_id TEXT NOT NULL,
  tile_x INTEGER NOT NULL,
  tile_y INTEGER NOT NULL,
  facing TEXT NOT NULL,
  race_id TEXT NOT NULL,
  gender_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  faction_id TEXT NOT NULL,
  face_index INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  hp INTEGER NOT NULL DEFAULT 100,
  hp_max INTEGER NOT NULL DEFAULT 100,
  mp INTEGER NOT NULL DEFAULT 50,
  mp_max INTEGER NOT NULL DEFAULT 50,
  gold INTEGER NOT NULL DEFAULT 0,
  bank_gold INTEGER NOT NULL DEFAULT 0,
  exp BIGINT NOT NULL DEFAULT 0,
  exp_to_next INTEGER NOT NULL DEFAULT 100,
  weapon_item_id TEXT,
  shield_item_id TEXT,
  helmet_item_id TEXT,
  armor_item_id TEXT,
  equipped_outfit TEXT NOT NULL DEFAULT 'base',
  attr_strength_bonus INTEGER NOT NULL DEFAULT 0,
  attr_agility_bonus INTEGER NOT NULL DEFAULT 0,
  attr_buffs_expires_at_ms BIGINT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_characters_account_id ON characters(account_id);
CREATE INDEX IF NOT EXISTS idx_characters_map_id ON characters(map_id);

CREATE TABLE IF NOT EXISTS character_inventory_slots (
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL,
  item_id TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (character_id, slot_index)
);

CREATE INDEX IF NOT EXISTS idx_character_inventory_item_id
  ON character_inventory_slots(character_id, item_id);

CREATE TABLE IF NOT EXISTS character_bank_slots (
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL,
  item_id TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (character_id, slot_index)
);

CREATE TABLE IF NOT EXISTS character_spells (
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  spell_id INTEGER NOT NULL,
  learned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (character_id, spell_id)
);

/** Ítems en el suelo (persistencia futura; el servidor hosteado usa memoria en runtime). */
CREATE TABLE IF NOT EXISTS world_items (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL,
  tile_x INTEGER NOT NULL,
  tile_y INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1,
  dropped_by_character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_world_items_map_tile
  ON world_items(map_id, tile_x, tile_y);

CREATE TABLE IF NOT EXISTS auctions (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  seller_name TEXT NOT NULL,
  item_id TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1,
  price INTEGER NOT NULL,
  expires_at_ms BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON auctions(seller_id);
CREATE INDEX IF NOT EXISTS idx_auctions_expires_at ON auctions(expires_at_ms);

-- Patches for databases created before newer columns (idempotent).
ALTER TABLE characters ADD COLUMN IF NOT EXISTS gold INTEGER NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS bank_gold INTEGER NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS exp BIGINT NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS exp_to_next INTEGER NOT NULL DEFAULT 100;

DROP TABLE IF EXISTS character_skills;

COMMIT;
