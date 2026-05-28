import type { CharacterRepository } from "./repository";
import type { PersistedCharacterSnapshot } from "./types";

function cloneSnapshot(snapshot: PersistedCharacterSnapshot): PersistedCharacterSnapshot {
  return {
    character: {
      ...snapshot.character,
      equipment: { ...snapshot.character.equipment },
      attributeBuffs: { ...snapshot.character.attributeBuffs },
    },
    inventorySlots: snapshot.inventorySlots.map((slot) => ({ ...slot })),
    bankSlots: snapshot.bankSlots.map((slot) => ({ ...slot })),
    skills: snapshot.skills.map((skill) => ({ ...skill })),
    spells: snapshot.spells.map((spell) => ({ ...spell })),
  };
}

export class MemoryCharacterRepository implements CharacterRepository {
  private readonly byName = new Map<string, PersistedCharacterSnapshot>();

  async getByName(name: string): Promise<PersistedCharacterSnapshot | null> {
    const key = name.trim().toLowerCase();
    const snapshot = this.byName.get(key);
    return snapshot ? cloneSnapshot(snapshot) : null;
  }

  async upsert(snapshot: PersistedCharacterSnapshot): Promise<void> {
    const key = snapshot.character.name.trim().toLowerCase();
    this.byName.set(key, cloneSnapshot(snapshot));
  }
}

