import { logger } from "../logger";
import { MemoryCharacterRepository } from "./memoryRepository";
import type { AuctionRepository, CharacterRepository, ClanRepository } from "./repository";
import { SqlCharacterRepository } from "./sqlRepository";

export type CharacterRepositoryRuntime = CharacterRepository &
  AuctionRepository &
  ClanRepository & {
    close?: () => Promise<void>;
  };

export function createCharacterRepositoryFromEnv(): CharacterRepositoryRuntime {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    logger.info("createrepository", "[persistence] Using in-memory repository (DATABASE_URL not set).");
    return new MemoryCharacterRepository();
  }
  logger.info("createrepository", "[persistence] Using PostgreSQL repository.");
  return new SqlCharacterRepository(connectionString);
}


