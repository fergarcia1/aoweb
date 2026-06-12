import { INVENTORY_SLOT_COUNT } from "../../game/characterProgressStorage";
import { canUseItem } from "../../game/itemUsability";
import { OFFLINE_GAMEPLAY_MESSAGE } from "../../game/mmoMode";
import { GOLD_DROP_MAX_AMOUNT } from "../../../game-data/constants";
import {
  getItemDefinition,
  type EquipmentSlot,
  type ItemId,
} from "../../../game-data/items/definitions";
import type { InventorySlot } from "../../items/inventoryStack";
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
  useMiscItemFromSlot: (slotIndex: number) => void;
  isPlayerAdmin: () => boolean;
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
    if (item.type === "misc" && item.usableFromInventory) {
      this.deps.useMiscItemFromSlot(slotIndex);
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

    const maxDrop = Math.min(gold, GOLD_DROP_MAX_AMOUNT);
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

    this.deps.addChatLine(OFFLINE_GAMEPLAY_MESSAGE);
  }

  private dropGold(amount: number): void {
    const progress = this.deps.getPlayerProgress();
    const maxDrop = Math.min(progress.gold, GOLD_DROP_MAX_AMOUNT);
    const safeAmount = Math.min(Math.max(1, Math.floor(amount)), maxDrop);
    if (safeAmount <= 0) return;

    if (this.deps.isMultiplayerActive()) {
      this.deps.sendDropGoldToServer(safeAmount);
      return;
    }

    this.deps.addChatLine(OFFLINE_GAMEPLAY_MESSAGE);
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

    this.deps.addChatLine(OFFLINE_GAMEPLAY_MESSAGE);
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

    const usability = canUseItem(
      this.deps.getSelectedClass(),
      this.deps.getSelectedRace(),
      this.deps.getPlayerProgress().level,
      item,
      this.deps.isPlayerAdmin()
    );
    if (!usability.allowed) {
      this.deps.addChatLine(usability.reason ?? "No podés equipar ese objeto.");
      return;
    }

    if (this.deps.isMultiplayerActive()) {
      this.deps.syncServerInventory();
      this.deps.sendEquipToServer("equip", {
        inventorySlot: slotIndex,
        itemId: stack.itemId,
      });
      return;
    }

    this.deps.addChatLine(OFFLINE_GAMEPLAY_MESSAGE);
  }

  private unequip(slot: EquipmentSlot): void {
    const equipment = this.deps.getEquipment();
    const equippedItemId = equipment[slot];
    if (!equippedItemId) return;

    if (this.deps.isMultiplayerActive()) {
      this.deps.sendEquipToServer("unequip", { equipSlot: slot });
      return;
    }

    this.deps.addChatLine(OFFLINE_GAMEPLAY_MESSAGE);
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
