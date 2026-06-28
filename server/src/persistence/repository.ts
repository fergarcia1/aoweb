import type { AuctionSnapshot, ClanSnapshot, PersistedCharacterSnapshot } from "./types";

export interface CharacterRepository {
  getByName(name: string): Promise<PersistedCharacterSnapshot | null>;
  upsert(snapshot: PersistedCharacterSnapshot): Promise<void>;
}

export interface AuctionRepository {
  getAll(): Promise<AuctionSnapshot[]>;
  getById(id: string): Promise<AuctionSnapshot | null>;
  add(auction: AuctionSnapshot): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface ClanRepository {
  getClanByName(name: string): Promise<ClanSnapshot | null>;
  getClanByLeaderId(leaderCharacterId: string): Promise<ClanSnapshot | null>;
  addClan(clan: ClanSnapshot): Promise<void>;
}

