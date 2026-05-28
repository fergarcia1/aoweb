import type { PersistedCharacterSnapshot } from "./types";

export interface CharacterRepository {
  getByName(name: string): Promise<PersistedCharacterSnapshot | null>;
  upsert(snapshot: PersistedCharacterSnapshot): Promise<void>;
}

