import type { StaticNpcDefinition } from "../npcs/types";
import {
  BANKER_INTERACT_MAX_TILE_DISTANCE,
  MERCHANT_INTERACT_MAX_TILE_DISTANCE,
} from "../npcs/npcDefinitions";
import {
  getBuyPrice,
  getMerchantDisplayTitle,
  getSellPrice,
  getShopCatalogForRole,
  isMerchantRole,
  type MerchantRole,
} from "../data/shopCatalogs";
import {
  getItemDefinition,
  type ItemId,
} from "../items/itemDefinitions";
import {
  addToInventory,
  moveStackAmount,
  type InventorySlot,
} from "../items/inventoryStack";
import { saveBankState, type BankState } from "../game/bankStorage";

export type ShopBankCallbacks = {
  getInventory(): (InventorySlot | null)[];
  setInventorySlot(index: number, value: InventorySlot | null): void;
  getPlayerGold(): number;
  setPlayerGold(value: number): void;
  refreshInventoryUi(): void;
  refreshHud(): void;
  addChatLine(msg: string): void;
  isPlayerDeadOrGhost(): boolean;
  getPlayerTile(): { x: number; y: number };
  getCharacterId(): string;
  getGameViewportRect(): any;
  scheduleProgressSave(): void;
  clearInventorySlotUi(index: number): void;
  setInventorySlotUi(index: number, textureKey: string, count: number): void;
  getEquipment(): Record<string, ItemId | null>;
  /** Sincroniza inventario con el servidor en multijugador. */
  onInventoryChanged?(): void;
};

export class ShopBankSystem {
  private bankState: BankState;
  private activeShopRole: MerchantRole | null = null;
  private bankOverlay?: { show(rect: any, state: any): void; hide(): void; refresh(state: any): void; isOpen(): boolean; layout(rect: any): void; getContainer(): any; getDomObjects(): any };
  private shopOverlay?: { show(rect: any, state: any): void; hide(): void; refresh(state: any): void; isOpen(): boolean; layout(rect: any): void; getContainer(): any; getDomObjects(): any };
  private readonly cb: ShopBankCallbacks;

  constructor(callbacks: ShopBankCallbacks, initialBankState: BankState) {
    this.cb = callbacks;
    this.bankState = initialBankState;
  }

  setBankOverlay(overlay: typeof this.bankOverlay) {
    this.bankOverlay = overlay;
  }

  setShopOverlay(overlay: typeof this.shopOverlay) {
    this.shopOverlay = overlay;
  }

  getBankState(): BankState {
    return this.bankState;
  }

  setBankState(state: BankState) {
    this.bankState = state;
  }

  getActiveShopRole(): MerchantRole | null {
    return this.activeShopRole;
  }

  isBankOpen(): boolean {
    return this.bankOverlay?.isOpen() ?? false;
  }

  isShopOpen(): boolean {
    return this.shopOverlay?.isOpen() ?? false;
  }

  layoutOnResize(rect: any) {
    if (this.bankOverlay?.isOpen()) {
      this.bankOverlay.layout(rect);
      this.refreshBankOverlay();
    }
    if (this.shopOverlay?.isOpen()) {
      this.shopOverlay.layout(rect);
      this.refreshShopOverlay();
    }
  }

  private getBankViewState() {
    return {
      inventory: this.cb.getInventory(),
      bankSlots: this.bankState.slots,
      playerGold: this.cb.getPlayerGold(),
      bankGold: this.bankState.gold,
    };
  }

  refreshBankOverlay() {
    this.bankOverlay?.refresh(this.getBankViewState());
  }

  private persistBankState() {
    saveBankState(this.cb.getCharacterId(), this.bankState);
  }

  closeBank() {
    this.bankOverlay?.hide();
    this.persistBankState();
  }

  openBank() {
    this.bankOverlay?.show(this.cb.getGameViewportRect(), this.getBankViewState());
  }

  private getShopViewState() {
    const role = this.activeShopRole;
    return {
      title: role ? getMerchantDisplayTitle(role) : "Comerciante",
      catalog: role ? getShopCatalogForRole(role) : [],
      inventory: this.cb.getInventory(),
      playerGold: this.cb.getPlayerGold(),
    };
  }

  refreshShopOverlay() {
    this.shopOverlay?.refresh(this.getShopViewState());
  }

  closeShop() {
    this.shopOverlay?.hide();
    this.activeShopRole = null;
  }

  openShop(role: MerchantRole) {
    this.activeShopRole = role;
    this.shopOverlay?.show(this.cb.getGameViewportRect(), this.getShopViewState());
  }

  buyFromShop(itemId: ItemId, amount: number) {
    const item = getItemDefinition(itemId);
    const qty = Math.max(1, Math.floor(amount));
    const totalCost = getBuyPrice(item.value, qty);

    if (this.cb.getPlayerGold() < totalCost) {
      this.cb.addChatLine("No tenés suficiente oro.");
      return;
    }

    const inventory = this.cb.getInventory();
    const { added, remaining } = addToInventory(inventory as (InventorySlot | null)[], itemId, qty);
    if (added <= 0) {
      this.cb.addChatLine("No tenés espacio en el inventario.");
      return;
    }

    this.cb.setPlayerGold(this.cb.getPlayerGold() - getBuyPrice(item.value, added));
    this.cb.refreshHud();
    this.cb.refreshInventoryUi();
    this.cb.onInventoryChanged?.();
    this.refreshShopOverlay();

    if (remaining > 0) {
      this.cb.addChatLine(
        `Compraste ${item.name} x${added}. No entraron ${remaining} unidades.`
      );
    } else {
      this.cb.addChatLine(
        qty > 1
          ? `Compraste ${item.name} x${added} por ${getBuyPrice(item.value, added).toLocaleString("es-AR")} de oro.`
          : `Compraste ${item.name} por ${getBuyPrice(item.value, added).toLocaleString("es-AR")} de oro.`
      );
    }
  }

  sellToShop(slotIndex: number, amount: number) {
    const inventory = this.cb.getInventory();
    const stack = inventory[slotIndex];
    if (!stack) return;

    const equipment = this.cb.getEquipment();
    if (Object.values(equipment).includes(stack.itemId)) {
      this.cb.addChatLine("Desequipá ese objeto antes de venderlo.");
      return;
    }

    const item = getItemDefinition(stack.itemId);
    const qty = Math.min(Math.max(1, Math.floor(amount)), stack.count);
    const goldGain = getSellPrice(item.value, qty);

    if (qty >= stack.count) {
      this.cb.setInventorySlot(slotIndex, null);
      this.cb.clearInventorySlotUi(slotIndex);
    } else {
      stack.count -= qty;
      this.cb.setInventorySlotUi(slotIndex, item.textureKey, stack.count);
    }

    this.cb.setPlayerGold(this.cb.getPlayerGold() + goldGain);
    this.cb.refreshHud();
    this.cb.refreshInventoryUi();
    this.cb.onInventoryChanged?.();
    this.refreshShopOverlay();

    this.cb.addChatLine(
      qty > 1
        ? `Vendiste ${item.name} x${qty} por ${goldGain.toLocaleString("es-AR")} de oro.`
        : `Vendiste ${item.name} por ${goldGain.toLocaleString("es-AR")} de oro.`
    );
  }

  tryOpenShopNpc(npc: StaticNpcDefinition) {
    if (this.cb.isPlayerDeadOrGhost()) {
      this.cb.addChatLine("No podés comerciar estando muerto o en forma fantasma.");
      return;
    }
    if (!isMerchantRole(npc.role)) return;
    const tile = this.cb.getPlayerTile();
    const distance = Math.max(
      Math.abs(tile.x - npc.tileX),
      Math.abs(tile.y - npc.tileY)
    );
    if (distance > MERCHANT_INTERACT_MAX_TILE_DISTANCE) {
      this.cb.addChatLine(
        `Tenés que estar a ${MERCHANT_INTERACT_MAX_TILE_DISTANCE} tiles o menos del comerciante.`
      );
      return;
    }
    this.closeBank();
    this.openShop(npc.role as MerchantRole);
  }

  tryOpenBankNpc(npc: StaticNpcDefinition) {
    if (this.cb.isPlayerDeadOrGhost()) {
      this.cb.addChatLine("No podés usar el banco estando muerto o en forma fantasma.");
      return;
    }
    if (npc.role !== "banker") return;
    const tile = this.cb.getPlayerTile();
    const distance = Math.max(
      Math.abs(tile.x - npc.tileX),
      Math.abs(tile.y - npc.tileY)
    );
    if (distance > BANKER_INTERACT_MAX_TILE_DISTANCE) {
      this.cb.addChatLine(
        `Tenés que estar a ${BANKER_INTERACT_MAX_TILE_DISTANCE} tiles o menos del banquero.`
      );
      return;
    }
    this.openBank();
  }

  depositInventorySlotToBank(slotIndex: number, amount: number) {
    const inventory = this.cb.getInventory();
    const stack = inventory[slotIndex];
    if (!stack) return;

    const equipment = this.cb.getEquipment();
    if (Object.values(equipment).includes(stack.itemId)) {
      this.cb.addChatLine("Desequipá ese objeto antes de guardarlo en el banco.");
      return;
    }

    const item = getItemDefinition(stack.itemId);
    const result = moveStackAmount(
      inventory as (InventorySlot | null)[],
      slotIndex,
      this.bankState.slots,
      amount
    );
    if (!result.ok) {
      this.cb.addChatLine("No hay espacio en el banco para ese objeto.");
      return;
    }
    this.cb.addChatLine(`Depositaste ${item.name} x${result.moved} en el banco.`);
    this.cb.refreshInventoryUi();
    this.cb.onInventoryChanged?.();
    this.refreshBankOverlay();
    this.persistBankState();
  }

  withdrawBankSlotToInventory(slotIndex: number, amount: number) {
    const stack = this.bankState.slots[slotIndex];
    if (!stack) return;

    const item = getItemDefinition(stack.itemId);
    const inventory = this.cb.getInventory();
    const result = moveStackAmount(
      this.bankState.slots,
      slotIndex,
      inventory as (InventorySlot | null)[],
      amount
    );
    if (!result.ok) {
      this.cb.addChatLine("No hay espacio en tu inventario.");
      return;
    }
    this.cb.addChatLine(`Retiraste ${item.name} x${result.moved} del banco.`);
    this.cb.refreshInventoryUi();
    this.cb.onInventoryChanged?.();
    this.refreshBankOverlay();
    this.persistBankState();
  }

  depositGoldToBank(amount: number) {
    const normalized = Math.max(1, Math.floor(amount));
    const gold = this.cb.getPlayerGold();
    if (gold <= 0) {
      this.cb.addChatLine("No tenés oro para depositar.");
      return;
    }
    const transfer = Math.min(normalized, gold);
    this.cb.setPlayerGold(gold - transfer);
    this.bankState.gold += transfer;
    this.cb.refreshHud();
    this.refreshBankOverlay();
    this.persistBankState();
    this.cb.addChatLine(`Depositaste ${transfer.toLocaleString("es-AR")} monedas de oro.`);
  }

  withdrawGoldFromBank(amount: number) {
    const normalized = Math.max(1, Math.floor(amount));
    if (this.bankState.gold <= 0) {
      this.cb.addChatLine("No tenés oro en el banco.");
      return;
    }
    const transfer = Math.min(normalized, this.bankState.gold);
    this.bankState.gold -= transfer;
    this.cb.setPlayerGold(this.cb.getPlayerGold() + transfer);
    this.cb.refreshHud();
    this.refreshBankOverlay();
    this.persistBankState();
    this.cb.addChatLine(`Retiraste ${transfer.toLocaleString("es-AR")} monedas de oro del banco.`);
  }
}
