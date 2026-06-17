import { WorldContext } from "./WorldContext";
import { PlayerSession } from "../PlayerSession";
import { AuctionSnapshot } from "../persistence/types";
import { NetAuctionState } from "../../../shared/types";
import { getItemDefinition, ItemId } from "../../../game-data/items/definitions";
import { removeFromServerSlot, addToServerInventory } from "../../../shared/serverInventory";
import { isKnownItemId } from "../../../game-data/items/registry";
import { randomUUID } from "node:crypto";

export class AuctionSystem {

  private auctions: AuctionSnapshot[] = [];

  constructor(private readonly world: WorldContext) {}

  public async init() {
    this.auctions = await this.world.getAuctionRepo().getAll();
    this.checkExpirations();
    setInterval(() => this.checkExpirations(), 60_000); // Cada minuto
  }

  public async handleListAuction(
    session: PlayerSession,
    slotIndex: number,
    amount: number,
    price: number,
    durationHours: number
  ) {
    if (!session.joined || session.hp <= 0) return;
    
    if (price <= 0 || amount <= 0 || durationHours <= 0) {
      this.world.sendCombatLog(session, "Valores de subasta inválidos.");
      return;
    }

    const slot = session.inventorySlots[slotIndex];
    if (!slot || !slot.itemId || slot.amount < amount) {
      this.world.sendCombatLog(session, "No tenés ese objeto o cantidad.");
      return;
    }

    if (slot.isEquipped) {
      this.world.sendCombatLog(session, "Desequipá el objeto antes de subastarlo.");
      return;
    }

    const itemId = slot.itemId;
    const { removed } = removeFromServerSlot(session.inventorySlots, slotIndex, amount);
    if (removed <= 0) return;

    const auction: AuctionSnapshot = {
      id: randomUUID(),
      sellerId: session.id,
      sellerName: session.name,
      itemId,
      amount: removed,
      price,
      expiresAtMs: Date.now() + durationHours * 60 * 60 * 1000,
    };


    await this.world.getAuctionRepo().add(auction);
    this.auctions.push(auction);

    this.world.sendCombatLog(session, `Pusiste en subasta ${removed}x ${getItemDefinition(itemId as ItemId).name} por ${price} oro.`);
    this.world.sendInventoryUpdated(session);
    void this.world.persistSession(session);
    this.broadcastAuctionCatalog();
  }

  public async handleBuyAuction(session: PlayerSession, auctionId: string) {
    if (!session.joined || session.hp <= 0) return;

    const auction = this.auctions.find((a) => a.id === auctionId);
    if (!auction) {
      this.world.sendCombatLog(session, "Esa subasta ya no existe.");
      return;
    }

    if (session.gold < auction.price) {
      this.world.sendCombatLog(session, "No tenés suficiente oro.");
      return;
    }

    // Cobrar al comprador
    session.gold -= auction.price;

    // Dar item al comprador
    const { added, remaining } = addToServerInventory(session.inventorySlots, auction.itemId, auction.amount);
    
    // Si no entra en inventario, mandamos el resto al banco
    if (remaining > 0) {
      this.world.addToBankSlots(session, auction.itemId, remaining);
      this.world.sendCombatLog(session, "Tu inventario estaba lleno, el resto fue enviado al banco.");
    }

    // Pagar al vendedor (siempre al banco según el plan)
    await this.creditSeller(auction.sellerId, auction.price, auction.itemId, auction.amount, true);

    // Remover subasta
    await this.world.getAuctionRepo().remove(auction.id);
    this.auctions = this.auctions.filter((a) => a.id !== auction.id);

    this.world.sendCombatLog(session, `Compraste ${auction.amount}x ${getItemDefinition(auction.itemId as ItemId).name} por ${auction.price} oro.`);
    this.world.sendInventoryUpdated(session);
    this.world.sendBankUpdated(session);
    void this.world.persistSession(session);
    this.broadcastAuctionCatalog();
  }

  public async handleCancelAuction(session: PlayerSession, auctionId: string) {
    const auction = this.auctions.find((a) => a.id === auctionId);
    if (!auction) return;

    if (auction.sellerId !== session.id && !session.isAdmin()) {
      this.world.sendCombatLog(session, "No podés cancelar una subasta que no es tuya.");
      return;
    }

    // Devolver item al banco del vendedor
    this.world.addToBankSlots(session, auction.itemId, auction.amount);
    
    await this.world.getAuctionRepo().remove(auction.id);
    this.auctions = this.auctions.filter((a) => a.id !== auction.id);

    this.world.sendCombatLog(session, "Subasta cancelada. El objeto fue enviado a tu banco.");
    this.world.sendBankUpdated(session);
    void this.world.persistSession(session);
    this.broadcastAuctionCatalog();
  }

  public sendAuctionCatalog(session: PlayerSession) {
    const netAuctions: NetAuctionState[] = this.auctions.map((a) => ({
      id: a.id,
      sellerId: a.sellerId,
      sellerName: a.sellerName,
      itemId: a.itemId,
      amount: a.amount,
      price: a.price,
      expiresAtMs: Number(a.expiresAtMs),
    }));
    this.world.send(session, { type: "auction_catalog", auctions: netAuctions });
  }

  private broadcastAuctionCatalog() {
    for (const session of this.world.getPlayers().values()) {
      if (session.joined) {
        this.sendAuctionCatalog(session);
      }
    }
  }

  private async creditSeller(sellerId: string, gold: number, itemId: string, amount: number, sold: boolean) {
    const onlineSeller = Array.from(this.world.getPlayers().values()).find((p) => p.id === sellerId);
    
    if (onlineSeller) {
      if (sold) {
        onlineSeller.bankGold += gold;
        this.world.sendCombatLog(onlineSeller, `¡Se vendió un objeto en subasta! Recibiste ${gold} oro en tu banco.`);
      } else {
        this.world.addToBankSlots(onlineSeller, itemId, amount);
        this.world.sendCombatLog(onlineSeller, `Una de tus subastas expiró. El objeto fue devuelto a tu banco.`);
      }
      this.world.sendBankUpdated(onlineSeller);
      void this.world.persistSession(onlineSeller);
    } else {
      // Offline: Cargar de DB, actualizar y guardar
      // Nota: Esto requiere que el characterRepo soporte cargar por ID o que busquemos otra forma.
      // Actualmente characterRepo tiene getByName. 
      // Podríamos necesitar getById o usar una query SQL directa si estamos en SqlRepo.
      
      // Por simplicidad en este paso, si no está online, dejamos el crédito pendiente o 
      // implementamos getById en Repository.
      
      // Vamos a asumir que necesitamos getById en el repositorio para esto.
    }
  }

  private checkExpirations() {
    const now = Date.now();
    const expired = this.auctions.filter((a) => a.expiresAtMs <= now);
    for (const auction of expired) {
      void this.creditSeller(auction.sellerId, 0, auction.itemId, auction.amount, false);
      void this.world.getAuctionRepo().remove(auction.id);
      this.auctions = this.auctions.filter((a) => a.id !== auction.id);
    }
    if (expired.length > 0) {
      this.broadcastAuctionCatalog();
    }
  }
}
