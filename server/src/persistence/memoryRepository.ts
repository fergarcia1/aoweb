import type { AuctionRepository, CharacterRepository } from "./repository";
import type { AuctionSnapshot, PersistedCharacterSnapshot } from "./types";

function cloneSnapshot(snapshot: PersistedCharacterSnapshot): PersistedCharacterSnapshot {
  return {
    character: {
      ...snapshot.character,
      equipment: { ...snapshot.character.equipment },
      attributeBuffs: { ...snapshot.character.attributeBuffs },
    },
    inventorySlots: snapshot.inventorySlots.map((slot) => ({ ...slot })),
    bankSlots: snapshot.bankSlots.map((slot) => ({ ...slot })),
    spells: snapshot.spells.map((spell) => ({ ...spell })),
  };
}

export class MemoryCharacterRepository
  implements CharacterRepository, AuctionRepository
{
  private readonly byName = new Map<string, PersistedCharacterSnapshot>();
  private readonly auctions = new Map<string, AuctionSnapshot>();

  async getByName(name: string): Promise<PersistedCharacterSnapshot | null> {
    const key = name.trim().toLowerCase();
    const snapshot = this.byName.get(key);
    return snapshot ? cloneSnapshot(snapshot) : null;
  }

  async upsert(snapshot: PersistedCharacterSnapshot): Promise<void> {
    const key = snapshot.character.name.trim().toLowerCase();
    this.byName.set(key, cloneSnapshot(snapshot));
  }

  async getAll(): Promise<AuctionSnapshot[]> {
    return Array.from(this.auctions.values()).map((a) => ({ ...a }));
  }

  async getById(id: string): Promise<AuctionSnapshot | null> {
    const a = this.auctions.get(id);
    return a ? { ...a } : null;
  }

  async add(auction: AuctionSnapshot): Promise<void> {
    this.auctions.set(auction.id, { ...auction });
  }

  async remove(id: string): Promise<void> {
    this.auctions.delete(id);
  }
}

