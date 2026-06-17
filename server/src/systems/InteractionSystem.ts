import { logger } from "../logger";
import { WorldContext } from "./WorldContext";
import { PlayerSession } from "../PlayerSession";
import {
  BANKER_INTERACT_MAX_TILE_DISTANCE,
  MERCHANT_INTERACT_MAX_TILE_DISTANCE,
  getNpcsForMap,
} from "../../../shared/npcDefinitions";
import { isMerchantRole } from "../../../shared/npcData";
import {
  MerchantRole,
  getShopCatalogForRole,
  isSpellMerchantRole,
  getBuyPrice,
  getSellPrice,
} from "../../../game-data/shopCatalogs";
import {
  getItemDefinition,
  ItemId,
} from "../../../game-data/items/definitions";
import { isKnownItemId } from "../../../game-data/items/registry";
import { canUseItem } from "../../../game-data/itemUsability";
import type { CharacterClassId } from "../../../game-data/classes";
import {
  addToServerInventory,
  removeFromServerSlot,
} from "../../../shared/serverInventory";
import {
  sanitizeJoinInventory,
  sanitizeJoinBankSlots,
} from "../../../shared/joinValidation";
import { getMageVendorSpellCatalog } from "../../../game-data/spellShopCatalog";
import { isSpellLearnedByPlayer } from "../../../shared/spellLearned";
import { createEmptyPvpSpellHitRecords } from "../../../game-data/antiOneshot";
import {
  getNearestPriestSpawn,
  findWalkableTileBeside,
} from "../../../shared/priestSpawn";
import {
  getMapSpawnTile,
  isMapTileWalkable,
} from "../../../shared/mapWalkability";
import { getMap } from "../../../shared/maps";
import { resolveImportedObjDef } from "../../../shared/legacyMapObjects";

export class InteractionSystem {
  constructor(private readonly world: WorldContext) {}

  public handleBankAction(
    session: PlayerSession,
    action: "deposit_item" | "withdraw_item" | "deposit_gold" | "withdraw_gold",
    amountRaw: number,
    slotIndexRaw?: number
  ): void {
    if (!session.joined || session.hp <= 0) return;
    if (
      !this.isNearNpcRole(session, "banker", BANKER_INTERACT_MAX_TILE_DISTANCE)
    ) {
      this.world.sendCombatLog(session, "Tenés que estar cerca del banquero.");
      return;
    }

    const amount = Math.max(1, Math.floor(Number(amountRaw)));
    if (!Number.isFinite(amount)) return;
    const slotIndex =
      typeof slotIndexRaw === "number" && Number.isFinite(slotIndexRaw)
        ? Math.floor(slotIndexRaw)
        : -1;

    session.inventorySlots = sanitizeJoinInventory(session.inventorySlots);
    session.bankSlots = sanitizeJoinBankSlots(session.bankSlots);

    if (action === "deposit_gold" || action === "withdraw_gold") {
      if (action === "deposit_gold") {
        const transfer = Math.min(amount, session.gold);
        if (transfer <= 0) {
          this.world.sendCombatLog(session, "No tenés oro para depositar.");
          return;
        }
        session.gold -= transfer;
        session.bankGold += transfer;
        this.world.sendCombatLog(
          session,
          `Depositaste ${transfer.toLocaleString("es-AR")} monedas de oro.`
        );
      } else {
        const transfer = Math.min(amount, session.bankGold);
        if (transfer <= 0) {
          this.world.sendCombatLog(session, "No tenés oro en el banco.");
          return;
        }
        session.bankGold -= transfer;
        session.gold += transfer;
        this.world.sendCombatLog(
          session,
          `Retiraste ${transfer.toLocaleString(
            "es-AR"
          )} monedas de oro del banco.`
        );
      }
      this.world.sendInventoryUpdated(session);
      this.world.sendBankUpdated(session);
      void this.world.persistSession(session);
      return;
    }

    if (slotIndex < 0) return;

    if (action === "deposit_item") {
      const slot = session.inventorySlots[slotIndex];
      if (!slot?.itemId || slot.amount <= 0 || !isKnownItemId(slot.itemId))
        return;
      if (
        slot.isEquipped ||
        Object.values(session.equipment).includes(slot.itemId)
      ) {
        this.world.sendCombatLog(
          session,
          "Desequipá ese objeto antes de guardarlo en el banco."
        );
        return;
      }
      const itemId = slot.itemId;
      const { removed } = removeFromServerSlot(
        session.inventorySlots,
        slotIndex,
        amount
      );
      if (removed <= 0) return;
      const { added, remaining } = this.world.addToBankSlots(session, itemId, removed);
      if (remaining > 0) {
        addToServerInventory(session.inventorySlots, itemId, remaining);
      }
      if (added <= 0) {
        this.world.sendCombatLog(
          session,
          "No hay espacio en el banco para ese objeto."
        );
      } else {
        const item = getItemDefinition(itemId as ItemId);
        this.world.sendCombatLog(
          session,
          `Depositaste ${item.name} x${added} en el banco.`
        );
      }
    } else {
      const { removed, itemId } = this.world.removeFromBankSlot(
        session,
        slotIndex,
        amount
      );
      if (removed <= 0 || !itemId) return;
      const { added, remaining } = addToServerInventory(
        session.inventorySlots,
        itemId,
        removed
      );
      if (remaining > 0) {
        this.world.addToBankSlots(session, itemId, remaining);
      }
      if (added <= 0) {
        this.world.sendCombatLog(session, "No hay espacio en tu inventario.");
      } else {
        const item = getItemDefinition(itemId as ItemId);
        this.world.sendCombatLog(
          session,
          `Retiraste ${item.name} x${added} del banco.`
        );
      }
    }

    this.world.syncInventoryEquippedFlags(session);
    this.world.sendInventoryUpdated(session);
    this.world.sendBankUpdated(session);
    void this.world.persistSession(session);
  }

  public handleShopBuy(
    session: PlayerSession,
    role: MerchantRole,
    itemId: string,
    amountRaw: number
  ): void {
    if (!this.validateShopAccess(session, role) || isSpellMerchantRole(role))
      return;
    if (
      !isKnownItemId(itemId) ||
      !getShopCatalogForRole(role).includes(itemId as ItemId)
    ) {
      this.world.sendCombatLog(session, "Ese objeto no está a la venta.");
      return;
    }
    const qty = Math.min(1_000, Math.max(1, Math.floor(Number(amountRaw))));
    if (!Number.isFinite(qty)) return;
    const item = getItemDefinition(itemId as ItemId);
    const usability = canUseItem(
      session.classId as CharacterClassId,
      session.raceId as any,
      session.level,
      item,
      session.isAdmin()
    );
    if (!usability.allowed) {
      this.world.sendCombatLog(
        session,
        usability.reason ?? "No podés usar ese objeto."
      );
      return;
    }
    if (session.gold < getBuyPrice(item.value, 1)) {
      this.world.sendCombatLog(session, "No tenés suficiente oro.");
      return;
    }
    const affordableQty = Math.min(
      qty,
      Math.floor(session.gold / getBuyPrice(item.value, 1))
    );
    const { added } = addToServerInventory(
      session.inventorySlots,
      itemId,
      affordableQty
    );
    if (added <= 0) {
      this.world.sendCombatLog(session, "No tenés espacio en el inventario.");
      return;
    }
    const cost = getBuyPrice(item.value, added);
    session.gold -= cost;
    this.world.sendCombatLog(
      session,
      `Compraste ${item.name} x${added} por ${cost.toLocaleString(
        "es-AR"
      )} de oro.`
    );
    this.world.sendInventoryUpdated(session);
    void this.world.persistSession(session);
  }

  public handleShopSell(
    session: PlayerSession,
    role: MerchantRole,
    inventorySlotRaw: number,
    amountRaw: number
  ): void {
    if (!this.validateShopAccess(session, role) || isSpellMerchantRole(role))
      return;
    const slotIndex = Math.floor(Number(inventorySlotRaw));
    const amount = Math.max(1, Math.floor(Number(amountRaw)));
    if (!Number.isFinite(slotIndex) || !Number.isFinite(amount)) return;
    const slot = session.inventorySlots[slotIndex];
    if (!slot?.itemId || slot.amount <= 0 || !isKnownItemId(slot.itemId))
      return;
    if (
      slot.isEquipped ||
      Object.values(session.equipment).includes(slot.itemId)
    ) {
      this.world.sendCombatLog(session, "Desequipá ese objeto antes de venderlo.");
      return;
    }
    const itemId = slot.itemId;
    const { removed } = removeFromServerSlot(
      session.inventorySlots,
      slotIndex,
      amount
    );
    if (removed <= 0) return;
    const item = getItemDefinition(itemId as ItemId);
    const gained = getSellPrice(item.value, removed);
    session.gold += gained;
    this.world.sendCombatLog(
      session,
      `Vendiste ${item.name} x${removed} por ${gained.toLocaleString(
        "es-AR"
      )} de oro.`
    );
    this.world.sendInventoryUpdated(session);
    void this.world.persistSession(session);
  }

  public handleSpellShopBuy(session: PlayerSession, spellIdRaw: number): void {
    if (!this.validateShopAccess(session, "mage")) return;
    const spellId = Math.floor(Number(spellIdRaw));
    if (!Number.isFinite(spellId)) return;
    const spell = getMageVendorSpellCatalog().find(
      (entry) => entry.idSpell === spellId
    );
    if (!spell) {
      this.world.sendCombatLog(session, "Ese hechizo no está a la venta.");
      return;
    }
    if (isSpellLearnedByPlayer(spellId, session.learnedSpellIds)) {
      this.world.sendCombatLog(session, `Ya conocés ${spell.nombre}.`);
      return;
    }
    if (session.gold < spell.valor) {
      this.world.sendCombatLog(session, "No tenés suficiente oro.");
      return;
    }

    session.gold -= spell.valor;
    session.learnedSpellIds.add(spellId);
    this.world.sendCombatLog(
      session,
      `Aprendiste ${spell.nombre} por ${spell.valor.toLocaleString(
        "es-AR"
      )} de oro.`
    );
    this.world.sendInventoryUpdated(session);
    this.world.sendSpellsUpdated(session);
    void this.world.persistSession(session);
  }

  public handleRevive(
    session: PlayerSession,
    source: "priest" | "ally",
    tileX?: number,
    tileY?: number,
    mapId?: string
  ) {
    if (!session.joined) {
      return;
    }
    if (!session.isDead && session.hp > 0) {
      return;
    }

    session.isDead = false;
    session.deathLootProcessed = false;
    session.recentPvpSpellHits = createEmptyPvpSpellHitRecords();
    if (source === "priest") {
      session.hp = session.hpMax;
      this.applyServerPriestRevivePosition(session);
    } else {
      session.hp = Math.max(1, Math.floor(session.hpMax * 0.35));
      this.applyRevivePosition(session, tileX, tileY, mapId);
    }

    this.world.sendPlayerState(session);
    this.world.sendInventoryUpdated(session);
    this.world.send(session, {
      type: "player_moved",
      player: session.toNetState(),
    });
    this.world.broadcastPlayerMoved(session);
    this.world.notifyPartyOfHpChange(session.id);
    void this.world.persistSession(session).catch((error) => {
      logger.error("interactionsystem", "[revive] persist failed:", error);
    });
  }

  public handleInteractMap(
    session: PlayerSession,
    tileX: number,
    tileY: number
  ) {
    if (!session.joined) return;
    const distance = Math.max(
      Math.abs(session.tileX - tileX),
      Math.abs(session.tileY - tileY)
    );
    if (distance > 2) {
      this.world.sendCombatLog(session, "Estás demasiado lejos.");
      return;
    }

    const map = getMap(session.mapId);
    const obj = map.legacyObjs?.find((o) => o.tileX === tileX && o.tileY === tileY);
    if (obj) {
      const def = resolveImportedObjDef(obj.objIndex);
      if (def?.objType === 6 && (def.indexAbierta > 0 || def.indexCerrada > 0)) {
        // Puerta
        const dynamicObjs = this.world.getDynamicMapObjs(session.mapId) || [];
        const entry = dynamicObjs.find(
          (d) => d.tileX === tileX && d.tileY === tileY
        );
        const isOpen = entry ? entry.isOpen : (obj.objIndex === def.indexAbierta);
        const nextOpen = !isOpen;

        const nextIndex = nextOpen ? def.indexAbierta : def.indexCerrada;

        if (entry) {
          entry.isOpen = nextOpen;
          entry.objIndex = nextIndex;
        } else {
          dynamicObjs.push({
            tileX,
            tileY,
            objIndex: nextIndex,
            isOpen: nextOpen,
          });
          this.world.setDynamicMapObjs(session.mapId, dynamicObjs);
        }

        this.world.setDoorTileOverride(session.mapId, tileX, tileY, nextOpen);

        this.world.broadcastToAoi(session.mapId, tileX, tileY, {
          type: "game_event",
          event: {
            kind: "map_object_updated",
            tileX,
            tileY,
            objIndex: nextIndex,
          },
        });
        return;
      }
    }
  }

  public handleNpcInteraction(session: PlayerSession, npcId: string) {
    if (!session.joined || session.hp <= 0) return;
    const npcs = getNpcsForMap(session.mapId);
    const npc = npcs.find((n) => n.id === npcId);
    if (!npc) return;

    const distance = Math.max(
      Math.abs(session.tileX - npc.tileX),
      Math.abs(session.tileY - npc.tileY)
    );

    if (distance > MERCHANT_INTERACT_MAX_TILE_DISTANCE) {
      this.world.sendCombatLog(session, "Estás demasiado lejos.");
      return;
    }

    if (npc.role === "priest") {
      this.handleRevive(session, "priest");
    } else if (isMerchantRole(npc.role)) {
      this.world.send(session, {
        type: "inventory_updated",
        inventory: session.inventorySlots.map((slot) => ({
          slotIndex: slot.slotIndex,
          itemId: slot.itemId,
          amount: slot.amount,
          isEquipped: slot.isEquipped,
        })),
        gold: session.gold,
      });
    } else if (npc.role === "banker") {
      this.world.send(session, {
        type: "inventory_updated",
        inventory: session.inventorySlots.map((slot) => ({
          slotIndex: slot.slotIndex,
          itemId: slot.itemId,
          amount: slot.amount,
          isEquipped: slot.isEquipped,
        })),
        gold: session.gold,
      });
      this.world.sendBankUpdated(session);
    } else if (npc.role === "auctioneer") {
      this.world.send(session, {
        type: "inventory_updated",
        inventory: session.inventorySlots.map((slot) => ({
          slotIndex: slot.slotIndex,
          itemId: slot.itemId,
          amount: slot.amount,
          isEquipped: slot.isEquipped,
        })),
        gold: session.gold,
      });
      // @ts-ignore
      this.world.auctionSystem.sendAuctionCatalog(session);
    }
  }

  private isNearNpcRole(
    session: PlayerSession,
    role: string,
    maxDistance: number
  ): boolean {
    return getNpcsForMap(session.mapId).some((npc) => {
      if (npc.role !== role) return false;
      const distance = Math.max(
        Math.abs(session.tileX - npc.tileX),
        Math.abs(session.tileY - npc.tileY)
      );
      return distance <= maxDistance;
    });
  }

  private validateShopAccess(session: PlayerSession, role: MerchantRole): boolean {
    if (!session.joined || session.hp <= 0) return false;
    if (!isMerchantRole(role)) return false;
    if (
      !this.isNearNpcRole(session, role, MERCHANT_INTERACT_MAX_TILE_DISTANCE)
    ) {
      this.world.sendCombatLog(session, "Tenés que estar cerca del comerciante.");
      return false;
    }
    return true;
  }

  private applyServerPriestRevivePosition(session: PlayerSession) {
    const priest = getNearestPriestSpawn(
      session.mapId,
      session.tileX,
      session.tileY,
      {
        mapId: session.mapId,
        tileX: getMapSpawnTile(session.mapId).tileX,
        tileY: getMapSpawnTile(session.mapId).tileY,
      }
    );
    const targetMapId = priest.mapId;
    const beside = findWalkableTileBeside(
      priest.tileX,
      priest.tileY,
      (tileX, tileY) =>
        isMapTileWalkable(
          targetMapId,
          tileX,
          tileY,
          this.world.getMapTileOverrides(targetMapId)
        ) && !this.world.isTileOccupied(tileX, tileY, targetMapId, session.id)
    );

    if (targetMapId !== session.mapId) {
      for (const otherId of session.aoiVisiblePlayerIds) {
        const other = this.world.getPlayers().get(otherId);
        if (other) {
          other.aoiVisiblePlayerIds.delete(session.id);
          this.world.send(other, { type: "player_left", playerId: session.id });
        }
      }
      session.aoiVisiblePlayerIds.clear();
      session.mapId = targetMapId;
    }

    session.tileX = beside.tileX;
    session.tileY = beside.tileY;
    session.facing = "down";
  }

  private applyRevivePosition(
    session: PlayerSession,
    tileX?: number,
    tileY?: number,
    mapId?: string
  ) {
    if (
      typeof tileX !== "number" ||
      typeof tileY !== "number" ||
      !Number.isFinite(tileX) ||
      !Number.isFinite(tileY)
    ) {
      return;
    }
    const targetMapId = mapId || session.mapId;
    if (
      isMapTileWalkable(
        targetMapId,
        tileX,
        tileY,
        this.world.getMapTileOverrides(targetMapId)
      ) &&
      !this.world.isTileOccupied(tileX, tileY, targetMapId, session.id)
    ) {
      session.mapId = targetMapId;
      session.tileX = tileX;
      session.tileY = tileY;
    }
  }
}
