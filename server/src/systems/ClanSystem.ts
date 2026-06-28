import { randomUUID } from "node:crypto";
import type { PlayerSession } from "../PlayerSession";
import type { WorldContext } from "./WorldContext";
import type { ItemId } from "../../../game-data/items/definitions";

const CLAN_MANAGER_INTERACTION_TTL_MS = 90_000;
const CLAN_FOUNDING_GOLD_COST = 1_500_000;
const CLAN_FOUNDING_ITEMS: Array<{ itemId: ItemId; label: string; amount: number }> = [
  { itemId: "gema_dorada", label: "Gema Dorada", amount: 1 },
  { itemId: "gema_lunar", label: "Gema Lunar", amount: 1 },
  { itemId: "gema_gris", label: "Gema Gris", amount: 1 },
  { itemId: "gema_naranja", label: "Gema Naranja", amount: 1 },
];

export class ClanSystem {
  constructor(private readonly world: WorldContext) {}

  async tryStartCreation(session: PlayerSession): Promise<void> {
    if (!session.joined || session.hp <= 0) {
      return;
    }
    if (Date.now() - session.lastClanManagerInteractionAt > CLAN_MANAGER_INTERACTION_TTL_MS) {
      this.sendClanChat(session, "Debes hablar con Thrandil antes de usar /crearclan.");
      return;
    }
    const existing = await this.world.getClanRepo().getClanByLeaderId(session.characterId);
    if (existing) {
      if (session.pendingClanCreationPaid) {
        session.pendingClanCreationPaid = false;
      }
      if (session.clanName !== existing.name) {
        session.clanName = existing.name;
        this.world.sendPlayerState(session);
        this.world.broadcastPlayerState(session);
      }
      await this.world.persistSession(session);
      this.sendClanChat(session, `Ya lideras el clan ${existing.name}.`);
      return;
    }
    if (session.pendingClanCreationPaid) {
      this.world.send(session, { type: "clan_creation_started" });
      return;
    }

    const missing = this.getMissingRequirements(session);
    if (missing.length > 0) {
      this.sendClanChat(session, `No tienes los requisitos para crear un clan: falta ${missing.join(", ")}.`);
      return;
    }

    this.consumeFoundingRequirements(session);
    session.pendingClanCreationPaid = true;
    this.world.sendInventoryUpdated(session);
    await this.world.persistSession(session);
    this.world.send(session, { type: "clan_creation_started" });
    this.sendClanChat(session, "Requisitos entregados. Completa el nombre y descripcion del clan.");
  }

  async submitCreation(session: PlayerSession, nameRaw: string, descriptionRaw: string): Promise<void> {
    if (!session.pendingClanCreationPaid) {
      this.sendClanChat(session, "Primero debes usar /crearclan con los requisitos completos.");
      return;
    }

    const name = this.normalizeClanName(nameRaw);
    const description = this.normalizeClanDescription(descriptionRaw);
    if (!name) {
      this.sendClanChat(session, "El nombre del clan debe tener entre 3 y 24 caracteres validos.");
      this.world.send(session, { type: "clan_creation_started" });
      return;
    }
    const existingByName = await this.world.getClanRepo().getClanByName(name);
    if (existingByName) {
      this.sendClanChat(session, "Ya existe un clan con ese nombre.");
      this.world.send(session, { type: "clan_creation_started" });
      return;
    }
    const existingByLeader = await this.world.getClanRepo().getClanByLeaderId(session.characterId);
    if (existingByLeader) {
      this.sendClanChat(session, `Ya lideras el clan ${existingByLeader.name}.`);
      session.pendingClanCreationPaid = false;
      await this.world.persistSession(session);
      return;
    }

    const clan = {
      id: randomUUID(),
      name,
      description,
      leaderCharacterId: session.characterId,
      leaderName: session.name,
      createdAtMs: Date.now(),
    };
    await this.world.getClanRepo().addClan(clan);
    session.clanName = clan.name;
    session.pendingClanCreationPaid = false;
    await this.world.persistSession(session);
    this.world.sendPlayerState(session);
    this.world.broadcastPlayerState(session);
    this.world.send(session, {
      type: "clan_created",
      clan: {
        id: clan.id,
        name: clan.name,
        description: clan.description,
        leaderName: clan.leaderName,
      },
    });
    this.sendClanChat(session, `Clan ${clan.name} creado correctamente.`);
  }

  private getMissingRequirements(session: PlayerSession): string[] {
    const missing: string[] = [];
    for (const req of CLAN_FOUNDING_ITEMS) {
      if (this.countInventoryItem(session, req.itemId) < req.amount) {
        missing.push(req.label);
      }
    }
    if (session.gold < CLAN_FOUNDING_GOLD_COST) {
      missing.push(`${CLAN_FOUNDING_GOLD_COST.toLocaleString("es-AR")} de oro`);
    }
    return missing;
  }

  private consumeFoundingRequirements(session: PlayerSession): void {
    for (const req of CLAN_FOUNDING_ITEMS) {
      this.removeInventoryItem(session, req.itemId, req.amount);
    }
    session.gold = Math.max(0, session.gold - CLAN_FOUNDING_GOLD_COST);
  }

  private countInventoryItem(session: PlayerSession, itemId: ItemId): number {
    return session.inventorySlots.reduce((total, slot) => {
      return total + (slot.itemId === itemId ? Math.max(0, Math.floor(slot.amount)) : 0);
    }, 0);
  }

  private removeInventoryItem(session: PlayerSession, itemId: ItemId, amount: number): void {
    let remaining = Math.max(0, Math.floor(amount));
    for (const slot of session.inventorySlots) {
      if (remaining <= 0) break;
      if (slot.itemId !== itemId || slot.amount <= 0) continue;
      const remove = Math.min(slot.amount, remaining);
      slot.amount -= remove;
      remaining -= remove;
      if (slot.amount <= 0) {
        slot.amount = 0;
        slot.itemId = null;
        slot.isEquipped = false;
      }
    }
  }

  private normalizeClanName(raw: string): string | null {
    const name = raw.trim().replace(/\s+/g, " ").slice(0, 24);
    if (name.length < 3) return null;
    if (!/^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ ]+$/.test(name)) return null;
    return name;
  }

  private normalizeClanDescription(raw: string): string {
    return raw.trim().replace(/\s+/g, " ").slice(0, 160);
  }

  private sendClanChat(session: PlayerSession, text: string): void {
    this.world.send(session, {
      type: "chat",
      from: "Thrandil",
      text,
    });
  }
}
