import { INVENTORY_SLOT_COUNT } from "../../game/characterProgressStorage";
import { canUseItem } from "../../game/itemUsability";
import {
  getItemDefinition,
  type EquipmentSlot,
  type ItemId,
} from "../../items/itemDefinitions";
import { addToInventory, type InventorySlot } from "../../items/inventoryStack";
import type { GameUi } from "../../ui/gameUi";
import type { ClassId, RaceId } from "./types";
import type { WorldItemManager } from "./WorldItemManager";

export type GameSceneInventoryDeps = {
  getGameUi: () => GameUi;
  getInventory: () => InventorySlot[];
  getEquipment: () => Record<EquipmentSlot, ItemId | null>;
  getPlayerProgress: () => { level: number; gold: number };
  getSelectedClass: () => ClassId;
  getSelectedRace: () => RaceId;
  getPlayerTile: () => { x: number; y: number };
  getWorldItemManager: () => WorldItemManager;
  isMultiplayerActive: () => boolean;
  sendEquipToServer: (
    action: "equip" | "unequip",
    payload:
      | { inventorySlot: number; itemId: ItemId }
      | { equipSlot: EquipmentSlot }
  ) => void;
  syncServerInventory: () => void;
  sendDropItemToServer: (inventorySlot: number, amount: number) => void;
  sendDropGoldToServer: (amount: number) => void;
  sendPickupWorldItemToServer: () => void;
  createWorldItem: (itemId: ItemId, tileX: number, tileY: number, count: number) => void;
  createWorldGold: (tileX: number, tileY: number, count: number) => void;
  addChatLine: (text: string) => void;
  refreshHud: () => void;
  refreshInventoryUi: () => void;
  scheduleSave: () => void;
  useConsumableFromSlot: (slotIndex: number) => void;
  syncEquippedArmorOutfit: () => void;
  syncEquippedHeldItemVisuals: () => void;
  getCombatSnapshot: () => {
    attackMin: number;
    attackMax: number;
    damageReductionPercent: number;
    magicResistancePercent: number;
    magicDamageBonusPercent: number;
  };
};

/**
 * Inventario: equipar, tirar, mover slots y pickup del suelo.
 */
export class GameSceneInventoryController {
  constructor(private readonly deps: GameSceneInventoryDeps) {}

  handleSlotDoubleClick(slotIndex: number): void {
    const stack = this.deps.getInventory()[slotIndex];
    if (!stack) return;

    const item = getItemDefinition(stack.itemId);
    if (item.type === "consumable") {
      this.deps.useConsumableFromSlot(slotIndex);
      return;
    }

    this.toggleEquipFromSlot(slotIndex);
  }

  handleSlotMove(fromSlotIndex: number, toSlotIndex: number): void {
    const inventory = this.deps.getInventory();
    if (
      fromSlotIndex < 0 ||
      toSlotIndex < 0 ||
      fromSlotIndex >= inventory.length ||
      toSlotIndex >= inventory.length ||
      fromSlotIndex === toSlotIndex
    ) {
      return;
    }

    const fromStack = inventory[fromSlotIndex];
    const toStack = inventory[toSlotIndex];
    inventory[fromSlotIndex] = toStack;
    inventory[toSlotIndex] = fromStack;
    this.deps.refreshInventoryUi();
    this.deps.syncServerInventory();
  }

  tryToggleEquipmentFromSelectedSlot(): void {
    const slotIndex = this.deps.getGameUi().getSelectedInventorySlot();
    if (slotIndex < 0 || slotIndex >= INVENTORY_SLOT_COUNT) {
      this.deps.addChatLine("Seleccioná un casillero del inventario primero.");
      return;
    }
    this.toggleEquipFromSlot(slotIndex);
  }

  tryDropSelectedItem(): void {
    const gameUi = this.deps.getGameUi();
    const slotIndex = gameUi.getSelectedInventorySlot();
    if (slotIndex < 0 || slotIndex >= INVENTORY_SLOT_COUNT) {
      this.deps.addChatLine("Seleccioná un casillero del inventario primero.");
      return;
    }

    const stack = this.deps.getInventory()[slotIndex];
    if (!stack) {
      this.deps.addChatLine("Ese casillero está vacío.");
      return;
    }

    if (stack.count === 1) {
      this.dropFromSlot(slotIndex, 1);
      return;
    }

    const item = getItemDefinition(stack.itemId);
    gameUi.showDropConfirm(item.name, stack.count, (dropCount) =>
      this.dropFromSlot(slotIndex, dropCount)
    );
  }

  tryDropGold(): void {
    const gold = this.deps.getPlayerProgress().gold;
    if (gold <= 0) {
      this.deps.addChatLine("No tenés oro para tirar.");
      return;
    }

    const maxDrop = Math.min(gold, 100_000);
    if (maxDrop === 1) {
      this.dropGold(1);
      return;
    }

    this.deps.getGameUi().showDropConfirm("Oro", maxDrop, (amount) => this.dropGold(amount));
  }

  tryPickupAtPlayerTile(): void {
    const tile = this.deps.getPlayerTile();
    const manager = this.deps.getWorldItemManager();
    const itemIndex = manager.findIndexAtTile(tile.x, tile.y);

    if (itemIndex === -1) {
      this.deps.addChatLine("No hay ningún item para agarrar.");
      return;
    }

    if (this.deps.isMultiplayerActive()) {
      this.deps.sendPickupWorldItemToServer();
      return;
    }

    const worldItem = manager.getEntries()[itemIndex];

    if (worldItem.id === "gold") {
      this.deps.getPlayerProgress().gold += worldItem.count;
      manager.removeAt(itemIndex);
      this.deps.refreshHud();
      this.deps.scheduleSave();
      this.deps.addChatLine(
        `Agarraste ${worldItem.count.toLocaleString("es-AR")} de oro.`
      );
      return;
    }

    const { added, remaining } = addToInventory(
      this.deps.getInventory(),
      worldItem.id,
      worldItem.count
    );

    if (added <= 0) {
      this.deps.addChatLine("No tenés espacio en el inventario.");
      return;
    }

    const item = getItemDefinition(worldItem.id);
    if (remaining <= 0) {
      manager.removeAt(itemIndex);
    } else {
      manager.updateCountAt(itemIndex, remaining);
    }

    this.deps.scheduleSave();
    this.deps.addChatLine(
      added > 1 ? `Agarraste ${item.name} x${added}.` : `Agarraste ${item.name}.`
    );

    this.deps.refreshInventoryUi();
    this.deps.syncServerInventory();
  }

  private dropGold(amount: number): void {
    const progress = this.deps.getPlayerProgress();
    const maxDrop = Math.min(progress.gold, 100_000);
    const safeAmount = Math.min(Math.max(1, Math.floor(amount)), maxDrop);
    if (safeAmount <= 0) return;

    if (this.deps.isMultiplayerActive()) {
      this.deps.sendDropGoldToServer(safeAmount);
      return;
    }

    progress.gold -= safeAmount;
    const tile = this.deps.getPlayerTile();

    let remaining = safeAmount;
    while (remaining > 0) {
      const stackSize = Math.min(remaining, 10_000);
      this.deps.createWorldGold(tile.x, tile.y, stackSize);
      remaining -= stackSize;
    }

    this.deps.refreshHud();
    this.deps.addChatLine(`Tiraste ${safeAmount.toLocaleString("es-AR")} de oro.`);
  }

  private dropFromSlot(slotIndex: number, dropCount: number): void {
    const inventory = this.deps.getInventory();
    const stack = inventory[slotIndex];
    if (!stack || dropCount <= 0) return;

    const { itemId } = stack;
    const originalCount = stack.count;
    const safeDropCount = Math.min(dropCount, originalCount);

    if (this.deps.isMultiplayerActive()) {
      this.deps.sendDropItemToServer(slotIndex, safeDropCount);
      return;
    }

    const isDroppingAll = safeDropCount >= originalCount;
    const equipment = this.deps.getEquipment();

    if (isDroppingAll) {
      const equippedSlot = this.getEquippedSlotForItem(itemId);
      if (equippedSlot) {
        equipment[equippedSlot] = null;
        if (equippedSlot === "armor") {
          this.deps.syncEquippedArmorOutfit();
        }
        if (equippedSlot === "weapon") {
          this.deps.syncEquippedHeldItemVisuals();
        }
      }
      inventory[slotIndex] = null;
      this.deps.getGameUi().clearInventorySlot(slotIndex);
    } else {
      stack.count = originalCount - safeDropCount;
      const itemDef = getItemDefinition(itemId);
      this.deps.getGameUi().setInventorySlot(
        slotIndex,
        itemDef.textureKey,
        stack.count,
        stack.itemId
      );
    }

    const tile = this.deps.getPlayerTile();
    this.deps.createWorldItem(itemId, tile.x, tile.y, safeDropCount);

    const item = getItemDefinition(itemId);
    this.deps.addChatLine(
      safeDropCount > 1 ? `Tiraste ${item.name} x${safeDropCount}.` : `Tiraste ${item.name}.`
    );
  }

  toggleEquipFromSlot(slotIndex: number): void {
    const stack = this.deps.getInventory()[slotIndex];
    if (!stack) {
      this.deps.addChatLine("Ese casillero está vacío.");
      return;
    }

    const item = getItemDefinition(stack.itemId);
    if (!item.equipSlot) {
      this.deps.addChatLine(`${item.name} no se puede equipar.`);
      return;
    }

    const equipment = this.deps.getEquipment();
    if (equipment[item.equipSlot] === stack.itemId) {
      this.unequip(item.equipSlot);
      return;
    }

    this.equip(slotIndex);
  }

  private equip(slotIndex: number): void {
    const stack = this.deps.getInventory()[slotIndex];
    if (!stack) return;

    const item = getItemDefinition(stack.itemId);
    if (!item.equipSlot) return;

    if (this.deps.isMultiplayerActive()) {
      this.deps.syncServerInventory();
      this.deps.sendEquipToServer("equip", {
        inventorySlot: slotIndex,
        itemId: stack.itemId,
      });
      return;
    }

    const usability = canUseItem(
      this.deps.getSelectedClass(),
      this.deps.getSelectedRace(),
      this.deps.getPlayerProgress().level,
      item
    );
    if (!usability.allowed) {
      this.deps.addChatLine(usability.reason ?? "No podés equipar ese objeto.");
      return;
    }

    const equipment = this.deps.getEquipment();
    equipment[item.equipSlot] = stack.itemId;
    this.deps.syncEquippedArmorOutfit();
    this.deps.syncEquippedHeldItemVisuals();

    const combat = this.deps.getCombatSnapshot();
    const parts: string[] = [];
    if (item.combatModifiers?.attackMinBonus || item.combatModifiers?.attackMaxBonus) {
      parts.push(`danio ${combat.attackMin}-${combat.attackMax}`);
    }
    if ((item.combatModifiers?.damageReductionPercent ?? 0) > 0) {
      parts.push(`reduccion ${Math.round(combat.damageReductionPercent * 100)}%`);
    }
    if ((item.combatModifiers?.magicResistancePercent ?? 0) > 0) {
      parts.push(`res. magica ${Math.round(combat.magicResistancePercent * 100)}%`);
    }
    if ((item.combatModifiers?.magicDamageBonusPercent ?? 0) > 0) {
      parts.push(`danio magico +${Math.round(combat.magicDamageBonusPercent * 100)}%`);
    }
    if (item.canCrit) {
      parts.push(
        `crit ${Math.round((item.critChance ?? 0) * 100)}% x${item.critDamage ?? 1.5}`
      );
    }
    const statsText = parts.length > 0 ? ` (${parts.join(", ")})` : "";
    this.deps.addChatLine(`Equipaste ${item.name}${statsText}.`);
    this.deps.getGameUi().setEquippedItemIds(
      Object.values(equipment).filter((id): id is ItemId => id != null)
    );
  }

  private unequip(slot: EquipmentSlot): void {
    const equipment = this.deps.getEquipment();
    const equippedItemId = equipment[slot];
    if (!equippedItemId) return;

    if (this.deps.isMultiplayerActive()) {
      this.deps.sendEquipToServer("unequip", { equipSlot: slot });
      return;
    }

    const item = getItemDefinition(equippedItemId);
    equipment[slot] = null;
    this.deps.syncEquippedArmorOutfit();
    this.deps.syncEquippedHeldItemVisuals();
    this.deps.addChatLine(`Te quitaste ${item.name}.`);
    this.deps.getGameUi().setEquippedItemIds(
      Object.values(equipment).filter((id): id is ItemId => id != null)
    );
  }

  private getEquippedSlotForItem(itemId: ItemId): EquipmentSlot | null {
    const equipment = this.deps.getEquipment();
    for (const slot of ["weapon", "shield", "helmet", "armor"] as const) {
      if (equipment[slot] === itemId) {
        return slot;
      }
    }
    return null;
  }
}
