import type { PlayerSession } from "../PlayerSession";
import type { WorldContext } from "./WorldContext";
import { MECHANICS } from "../../../shared/gameMechanics";
import { MULTIPLAYER_SERVER_MAP_IDS, sanitizeJoinInventory } from "../../../shared/joinValidation";
import { canUseItem } from "../../../game-data/itemUsability";
import {
  getItemDefinition,
  itemDropsOnDeath,
  type EquipmentSlot,
  type ItemId,
} from "../../../game-data/items/definitions";
import { isKnownItemId } from "../../../game-data/items/registry";
import { outfitForArmorItemId } from "../../../game-data/outfits";
import type { CharacterClassId } from "../../../game-data/items/catalog";
import { addToServerInventory, removeFromServerSlot } from "../../../shared/serverInventory";
import { getConsumableById, tryUseConsumableOnVitals, expireAttributeBuffs } from "../../../game-data/consumables";
import { isMapTileWalkable } from "../../../shared/mapWalkability";
import { isWorldItemDropTileAllowed } from "../../../shared/mapEdgeZones";
import { getMap } from "../../../shared/maps";
import { BOAT_ITEM_IDS, canStartNavigationAtTile, isWaterTile } from "../../../shared/navigation";
import { findNearestWalkableDropTile, findSpreadDropTiles } from "../../../shared/deathLootPlacement";
import { GOLD_DROP_MAX_AMOUNT } from "../../../game-data/constants";
import { splitGoldIntoWorldStacks } from "../../../shared/goldDrop";
import type { ServerMessage } from "../../../shared/protocol";

export class InventorySystem {
  constructor(private readonly world: WorldContext) {}

  /** Asegura 30 slots indexados; corrige inventarios compactados al cargar de DB. */
  private normalizeInventory(session: PlayerSession): void {
    session.inventorySlots = sanitizeJoinInventory(session.inventorySlots);
  }

  public handleSyncVitals(
    session: PlayerSession,
    patch: { hp?: number; mp?: number }
  ): void {
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(session.mapId)) return;
    this.world.sendPlayerState(session);
  }

  public handleUseItem(session: PlayerSession, itemId: string, inventorySlot?: number) {
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(session.mapId)) {
      this.world.sendCombatLog(session, "No podés usar objetos fuera del Ullathorpe en multijugador.");
      return;
    }
    if (session.hp <= 0) {
      this.world.sendCombatLog(session, "Estás muerto.");
      return;
    }

    if (isKnownItemId(itemId) && BOAT_ITEM_IDS.has(itemId)) {
      this.handleBoatNavigationUse(session, itemId, inventorySlot);
      return;
    }

    if (!isKnownItemId(itemId) || !getConsumableById(itemId)) {
      this.world.sendCombatLog(session, "No podés usar ese objeto aquí.");
      return;
    }
    const preferredSlotIndex =
      typeof inventorySlot === "number" && Number.isFinite(inventorySlot)
        ? Math.floor(inventorySlot)
        : -1;
    const preferredSlot =
      preferredSlotIndex >= 0 && preferredSlotIndex < session.inventorySlots.length
        ? session.inventorySlots[preferredSlotIndex]
        : undefined;
    const slot =
      preferredSlot && preferredSlot.amount > 0 && preferredSlot.itemId === itemId
        ? preferredSlot
        : session.inventorySlots.find((entry) => entry.itemId === itemId && entry.amount > 0);
    if (!slot) {
      this.world.sendCombatLog(session, "No tenés esa poción en el inventario.");
      return;
    }

    const classId = session.classId as CharacterClassId;
    const now = Date.now();
    // Assuming expireAttributeBuffs is available, wait, we need to import it!

    const result = tryUseConsumableOnVitals(
      itemId,
      classId,
      {
        hp: { current: session.hp, max: session.hpMax },
        mp: { current: session.mp, max: session.mpMax },
      },
      session.attributeBuffs,
      now
    );

    if (!result.ok) {
      this.world.sendCombatLog(session, result.message);
      return;
    }

    if (result.clientOnly) {
      this.consumeInventorySlot(session, slot.slotIndex);
      this.world.send(session, {
        type: "use_item_ack",
        itemId,
        inventorySlot: slot.slotIndex,
        message: result.message,
        clientOnly: true,
      });
      void this.world.persistSession(session).catch((error) => {
        console.error("[use_item] persist failed:", error);
      });
      return;
    }

    if (typeof result.hp === "number") {
      session.hp = result.hp;
    }
    if (typeof result.mp === "number") {
      session.mp = result.mp;
    }
    if (result.attributeBuffs) {
      session.attributeBuffs = result.attributeBuffs;
    }
    if (typeof result.hp === "number" || result.attributeBuffs) {
      this.world.broadcastToAoi(session.mapId, session.tileX, session.tileY, {
        type: "player_updated",
        player: session.toNetState(),
      });
      if (typeof result.hp === "number") {
        this.world.notifyPartyOfHpChange(session.id);
      }
    }
    this.consumeInventorySlot(session, slot.slotIndex);

    this.world.send(session, {
      type: "use_item_ack",
      itemId,
      inventorySlot: slot.slotIndex,
      ...(typeof result.hp === "number" ? { hp: session.hp } : {}),
      ...(typeof result.mp === "number" ? { mp: session.mp } : {}),
      ...(result.attributeBuffs && {
        attributeBuffs: {
          strength: session.attributeBuffs.strength,
          agility: session.attributeBuffs.agility,
        },
        buffExpiresAtMs: session.attributeBuffs.expiresAtMs,
      }),
      message: result.message,
    });
    this.world.sendInventoryUpdated(session);
    void this.world.persistSession(session).catch((error) => {
      console.error("[use_item] persist failed:", error);
    });
  }

  private findInventorySlot(
    session: PlayerSession,
    itemId: string,
    inventorySlot?: number
  ) {
    const preferredSlotIndex =
      typeof inventorySlot === "number" && Number.isFinite(inventorySlot)
        ? Math.floor(inventorySlot)
        : -1;
    const preferredSlot =
      preferredSlotIndex >= 0 && preferredSlotIndex < session.inventorySlots.length
        ? session.inventorySlots[preferredSlotIndex]
        : undefined;
    return preferredSlot && preferredSlot.amount > 0 && preferredSlot.itemId === itemId
      ? preferredSlot
      : session.inventorySlots.find((entry) => entry.itemId === itemId && entry.amount > 0);
  }

  private handleBoatNavigationUse(
    session: PlayerSession,
    itemId: string,
    inventorySlot?: number
  ) {
    const slot = this.findInventorySlot(session, itemId, inventorySlot);
    if (!slot) {
      this.world.sendCombatLog(session, "No tenes una barca en el inventario.");
      return;
    }

    const map = getMap(session.mapId);
    const overrides = this.world.getMapTileOverrides(session.mapId);
    if (session.isNavigating) {
      if (!this.canDisembarkAtCurrentTile(session)) {
        this.world.sendCombatLog(session, "Acercate a una orilla para bajar de la barca.");
        return;
      }
      session.isNavigating = false;
      this.world.send(session, {
        type: "use_item_ack",
        itemId,
        inventorySlot: slot.slotIndex,
        navigationMode: null,
        message: "Bajaste de la barca.",
      });
      this.world.sendPlayerState(session);
      this.world.broadcastPlayerMoved(session);
      void this.world.persistSession(session).catch((error) => {
        console.error("[boat_navigation] persist failed:", error);
      });
      return;
    }

    if (!canStartNavigationAtTile(map, session.tileX, session.tileY, overrides)) {
      this.world.sendCombatLog(session, "Tenes que estar junto al agua para usar la barca.");
      return;
    }

    session.isNavigating = true;
    session.isMeditating = false;
    this.world.send(session, {
      type: "use_item_ack",
      itemId,
      inventorySlot: slot.slotIndex,
      navigationMode: "boat",
      message: "Subiste a la barca.",
    });
    this.world.sendPlayerState(session);
    this.world.broadcastPlayerMoved(session);
    void this.world.persistSession(session).catch((error) => {
      console.error("[boat_navigation] persist failed:", error);
    });
  }

  private canDisembarkAtCurrentTile(session: PlayerSession): boolean {
    const map = getMap(session.mapId);
    const overrides = this.world.getMapTileOverrides(session.mapId);
    if (!isWaterTile(map, session.tileX, session.tileY, overrides)) {
      return true;
    }
    const offsets = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as const;
    return offsets.some(([dx, dy]) =>
      isMapTileWalkable(session.mapId, session.tileX + dx, session.tileY + dy, overrides)
    );
  }

  public handleEquipItem(
    session: PlayerSession,
    action: "equip" | "unequip",
    inventorySlot?: number,
    equipSlot?: EquipmentSlot,
    itemId?: string
  ) {
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(session.mapId)) {
      this.world.sendCombatLog(session, "No podés equipar objetos fuera del Ullathorpe en multijugador.");
      return;
    }

    if (action === "equip") {
      const preferredSlotIndex =
        typeof inventorySlot === "number" && Number.isFinite(inventorySlot)
          ? Math.floor(inventorySlot)
          : -1;
      const preferredSlot =
        preferredSlotIndex >= 0 && preferredSlotIndex < session.inventorySlots.length
          ? session.inventorySlots[preferredSlotIndex]
          : undefined;
      const normalizedItemId =
        typeof itemId === "string" && itemId.trim() ? itemId.trim() : null;
      const sourceSlot =
        preferredSlot &&
        preferredSlot.amount > 0 &&
        preferredSlot.itemId &&
        (!normalizedItemId || preferredSlot.itemId === normalizedItemId)
          ? preferredSlot
          : normalizedItemId
            ? session.inventorySlots.find(
                (entry) => entry.itemId === normalizedItemId && entry.amount > 0
              )
            : session.inventorySlots.find((entry) => entry.itemId && entry.amount > 0);
      if (!sourceSlot || !sourceSlot.itemId || sourceSlot.amount <= 0) {
        this.world.sendCombatLog(session, "Ese casillero está vacío.");
        return;
      }
      if (!isKnownItemId(sourceSlot.itemId)) {
        this.world.sendCombatLog(session, "No podés equipar ese objeto.");
        return;
      }

      const item = getItemDefinition(sourceSlot.itemId as ItemId);
      if (!item.equipSlot) {
        this.world.sendCombatLog(session, `${item.name} no se puede equipar.`);
        return;
      }
      const usability = canUseItem(
        session.classId as CharacterClassId,
        session.raceId as any,
        session.level,
        item,
        session.isAdmin()
      );
      if (!usability.allowed) {
        this.world.sendCombatLog(session, usability.reason ?? "No podés equipar ese objeto.");
        return;
      }

      const targetSlot = item.equipSlot;
      const targetEquipmentKey = this.toEquipmentKey(targetSlot);
      session.equipment[targetEquipmentKey] = sourceSlot.itemId;
      session.equipment.equippedOutfit = outfitForArmorItemId(session.equipment.armorId) ?? "base";
      this.syncInventoryEquippedFlags(session);
      session.recalcDefenseStats();
      session.recalcAttackStats();
      this.world.sendCombatLog(session, `Equipaste ${item.name}.`);
      this.world.broadcastPlayerState(session);
      void this.world.persistSession(session);
      return;
    }

    if (!equipSlot) {
      this.world.sendCombatLog(session, "Slot de equipo inválido.");
      return;
    }
    const equippedKey = this.toEquipmentKey(equipSlot);
    const equippedItemId = session.equipment[equippedKey];
    if (!equippedItemId) {
      return;
    }
    const item = getItemDefinition(equippedItemId as ItemId);
    session.equipment[equippedKey] = null;
    session.equipment.equippedOutfit = outfitForArmorItemId(session.equipment.armorId) ?? "base";
    this.syncInventoryEquippedFlags(session);
    session.recalcDefenseStats();
    session.recalcAttackStats();
    this.world.sendCombatLog(session, `Te quitaste ${item.name}.`);
    this.world.broadcastPlayerState(session);
    void this.world.persistSession(session);
  }

  private toEquipmentKey(slot: EquipmentSlot): "weaponId" | "shieldId" | "helmetId" | "armorId" {
    if (slot === "weapon") return "weaponId";
    if (slot === "shield") return "shieldId";
    if (slot === "helmet") return "helmetId";
    return "armorId";
  }

  public unequipItemIdIfNeeded(session: PlayerSession, itemId: string): boolean {
    const keys = ["weaponId", "shieldId", "helmetId", "armorId"] as const;
    let changed = false;
    for (const key of keys) {
      if (session.equipment[key] === itemId) {
        session.equipment[key] = null;
        changed = true;
      }
    }
    if (changed) {
      session.equipment.equippedOutfit =
        outfitForArmorItemId(session.equipment.armorId) ?? "base";
      session.recalcDefenseStats();
      session.recalcAttackStats();
    }
    return changed;
  }

  private consumeInventorySlot(session: PlayerSession, slotIndex: number) {
    const slot = session.inventorySlots[slotIndex];
    if (!slot || slot.amount <= 0) return;
    slot.amount -= 1;
    if (slot.amount <= 0) {
      slot.itemId = null;
      slot.isEquipped = false;
    }
    this.syncInventoryEquippedFlags(session);
    this.world.sendInventoryUpdated(session);
  }

  public syncInventoryEquippedFlags(session: PlayerSession) {
    const equippedItemIds = new Set<string>();
    if (session.equipment.weaponId) equippedItemIds.add(session.equipment.weaponId);
    if (session.equipment.shieldId) equippedItemIds.add(session.equipment.shieldId);
    if (session.equipment.helmetId) equippedItemIds.add(session.equipment.helmetId);
    if (session.equipment.armorId) equippedItemIds.add(session.equipment.armorId);

    for (const slot of session.inventorySlots) {
      if (!slot.itemId || slot.amount <= 0) {
        slot.isEquipped = false;
        continue;
      }
      slot.isEquipped = equippedItemIds.has(slot.itemId);
    }
  }

  public handleDropItem(session: PlayerSession, inventorySlot: number, amount: number) {
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(session.mapId)) {
      this.world.sendCombatLog(session, "No podés tirar objetos fuera del Ullathorpe en multijugador.");
      return;
    }

    this.normalizeInventory(session);

    const slotIndex = Math.floor(inventorySlot);
    if (slotIndex < 0 || slotIndex >= session.inventorySlots.length) {
      return;
    }

    const slot = session.inventorySlots[slotIndex];
    if (!slot || !slot.itemId || slot.amount <= 0) {
      return;
    }

    const itemId = slot.itemId;
    const safeAmount = Math.max(1, Math.floor(amount));

    const { removed } = removeFromServerSlot(session.inventorySlots, slotIndex, safeAmount);
    if (removed <= 0) {
      return;
    }

    let unequipped = false;
    if (!slot.itemId || slot.amount <= 0) {
      slot.isEquipped = false;
      unequipped = this.unequipItemIdIfNeeded(session, itemId);
    }
    this.syncInventoryEquippedFlags(session);
    
    if (unequipped) {
      this.world.broadcastPlayerState(session);
      this.world.broadcastPlayerMoved(session);
    }

    const tileX = session.tileX;
    const tileY = session.tileY;
    const beforeId = this.world.getWorldItems().findAtTile(session.mapId, tileX, tileY)?.id;

    const record = this.world.getWorldItems().spawn(
      session.mapId,
      itemId,
      tileX,
      tileY,
      removed
    );

    if (!record) {
      addToServerInventory(session.inventorySlots, itemId, removed);
      this.syncInventoryEquippedFlags(session);
      this.world.sendInventoryUpdated(session);
      this.world.sendCombatLog(session, "No hay espacio para tirar el objeto.");
      return;
    }

    const kind = beforeId === record.id ? "updated" : "spawned";
    this.world.broadcastWorldItemState(session.mapId, tileX, tileY, record, kind);
    this.world.sendInventoryUpdated(session);

    const item = getItemDefinition(itemId as ItemId);
    this.world.sendCombatLog(
      session,
      removed > 1 ? `Tiraste ${item.name} x${removed}.` : `Tiraste ${item.name}.`
    );
    void this.world.persistSession(session);
  }

  public handleDropGold(session: PlayerSession, amount: number) {
    if (!MULTIPLAYER_SERVER_MAP_IDS.has(session.mapId)) {
      this.world.sendCombatLog(session, "No podés tirar oro fuera del Ullathorpe en multijugador.");
      return;
    }

    const maxDrop = Math.min(session.gold, GOLD_DROP_MAX_AMOUNT);
    const safeAmount = Math.min(Math.max(1, Math.floor(amount)), maxDrop);
    if (safeAmount <= 0) {
      this.world.sendCombatLog(session, "No tenés oro para tirar.");
      return;
    }

    const stackSizes = splitGoldIntoWorldStacks(safeAmount);
    const originX = session.tileX;
    const originY = session.tileY;
    const canDropGoldStack = (tileX: number, tileY: number) =>
      isWorldItemDropTileAllowed(session.mapId, tileX, tileY, (x, y) =>
        isMapTileWalkable(session.mapId, x, y, this.world.getMapTileOverrides(session.mapId))
      ) && this.world.getWorldItems().canSpawnAt(session.mapId, tileX, tileY);

    const dropTiles = findSpreadDropTiles(
      originX,
      originY,
      stackSizes.length,
      canDropGoldStack,
      32
    );
    if (dropTiles.length === 0) {
      this.world.sendCombatLog(session, "No hay espacio para tirar oro.");
      return;
    }

    let droppedTotal = 0;
    for (let index = 0; index < stackSizes.length; index += 1) {
      const stackSize = stackSizes[index];
      const dropTile = dropTiles[index];
      if (!dropTile) {
        break;
      }

      const record = this.world.getWorldItems().spawn(
        session.mapId,
        "gold",
        dropTile.tileX,
        dropTile.tileY,
        stackSize
      );
      if (!record) {
        continue;
      }

      this.world.broadcastWorldItemState(
        session.mapId,
        dropTile.tileX,
        dropTile.tileY,
        record,
        "spawned"
      );
      droppedTotal += stackSize;
    }

    if (droppedTotal <= 0) {
      this.world.sendCombatLog(session, "No hay espacio para tirar oro.");
      return;
    }

    session.gold -= droppedTotal;
    this.world.sendInventoryUpdated(session);
    if (droppedTotal < safeAmount) {
      this.world.sendCombatLog(
        session,
        `Tiraste ${droppedTotal.toLocaleString("es-AR")} de oro (sin espacio para el resto).`
      );
    } else {
      this.world.sendCombatLog(
        session,
        `Tiraste ${droppedTotal.toLocaleString("es-AR")} de oro.`
      );
    }
    void this.world.persistSession(session);
  }

  private findNearestWorldItemDropTile(
    mapId: string,
    originX: number,
    originY: number
  ): { tileX: number; tileY: number } | null {
    return findNearestWalkableDropTile(
      originX,
      originY,
      (tileX, tileY) =>
        isWorldItemDropTileAllowed(mapId, tileX, tileY, (x, y) =>
          isMapTileWalkable(mapId, x, y, this.world.getMapTileOverrides(mapId))
        ) && this.world.getWorldItems().canSpawnAt(mapId, tileX, tileY),
      32
    );
  }

  private spawnDeathLootAt(session: PlayerSession, itemId: string, count: number) {
    const dropTile = this.findNearestWorldItemDropTile(
      session.mapId,
      session.tileX,
      session.tileY
    );
    if (!dropTile) {
      return;
    }

    const before = this.world.getWorldItems().findAtTile(session.mapId, dropTile.tileX, dropTile.tileY);
    const record = this.world.getWorldItems().spawn(
      session.mapId,
      itemId,
      dropTile.tileX,
      dropTile.tileY,
      count
    );
    if (!record) {
      return;
    }

    const kind = before?.id === record.id ? "updated" : "spawned";
    const msgType = kind === "spawned" ? "world_item_spawned" : "world_item_updated";
    const itemMsg: ServerMessage = {
      type: msgType,
      mapId: session.mapId,
      item: this.world.getWorldItems().toNetState(record),
    };
    this.world.send(session, itemMsg);
    this.world.broadcastWorldItemState(
      session.mapId,
      dropTile.tileX,
      dropTile.tileY,
      record,
      kind,
      session.id
    );
  }

  public dropPlayerDeathLoot(session: PlayerSession) {
    this.world.dropPlayerDeathLoot(session);
  }

  public handlePickupWorldItem(session: PlayerSession) {
    if (session.hp <= 0) {
      this.world.sendCombatLog(session, "Estás muerto.");
      return;
    }

    this.normalizeInventory(session);

    const mapId = session.mapId;
    const tileX = session.tileX;
    const tileY = session.tileY;

    const itemsOnTile = this.world.getWorldItems().listInAoi(mapId, tileX, tileY).filter(
      (item: any) => item.tileX === tileX && item.tileY === tileY
    );
    const worldItem = itemsOnTile[itemsOnTile.length - 1];

    if (!worldItem) {
      this.world.sendCombatLog(session, "No hay nada en el suelo.");
      return;
    }

    if (worldItem.itemId === "gold") {
      session.gold += worldItem.count;
      this.world.sendCombatLog(session, `Agarraste ${worldItem.count.toLocaleString("es-AR")} de oro.`);
      this.world.getWorldItems().remove(worldItem.id);
      
      this.world.send(session, { type: "world_item_removed", mapId, worldItemId: worldItem.id });
      this.world.broadcastWorldItemRemoved(mapId, tileX, tileY, worldItem.id, session.id);
      this.world.sendInventoryUpdated(session);
      void this.world.persistSession(session);
      return;
    }

    const { added, remaining } = addToServerInventory(
      session.inventorySlots,
      worldItem.itemId,
      worldItem.count
    );

    if (added <= 0) {
      this.world.sendCombatLog(session, "No tienes espacio en el inventario.");
      return;
    }

    const item = getItemDefinition(worldItem.itemId as ItemId);
    if (remaining <= 0) {
      this.world.getWorldItems().remove(worldItem.id);
      this.world.send(session, { type: "world_item_removed", mapId, worldItemId: worldItem.id });
      this.world.broadcastWorldItemRemoved(mapId, tileX, tileY, worldItem.id, session.id);
    } else {
      const updated = this.world.getWorldItems().updateCount(worldItem.id, remaining);
      if (updated) {
        this.world.broadcastWorldItemState(mapId, tileX, tileY, updated, "updated");
      }
    }

    this.syncInventoryEquippedFlags(session);
    this.world.sendInventoryUpdated(session);
    this.world.sendCombatLog(
      session,
      added > 1 ? `Agarraste ${item.name} x${added}.` : `Agarraste ${item.name}.`
    );
    void this.world.persistSession(session);
  }
}
