import { MemoryCharacterRepository } from "./memoryRepository";
import type { CharacterRepository } from "./repository";
import { SqlCharacterRepository } from "./sqlRepository";

export type CharacterRepositoryRuntime = CharacterRepository & {
  close?: () => Promise<void>;
};

export function createCharacterRepositoryFromEnv(): CharacterRepositoryRuntime {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.log("[persistence] Using in-memory repository (DATABASE_URL not set).");
    return new MemoryCharacterRepository();
  }
  console.log("[persistence] Using PostgreSQL repository.");
  return new SqlCharacterRepository(connectionString);
}

