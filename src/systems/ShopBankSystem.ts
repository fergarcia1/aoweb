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
  isSpellMerchantRole,
  type MerchantRole,
} from "../data/shopCatalogs";
import { getMageVendorSpellCatalog } from "../../game-data/spellShopCatalog";
import { isSpellLearnedByPlayer } from "../../shared/spellLearned";
import { SPELL_DEFINITIONS } from "../data/spells";
import type { SpellShopViewState } from "../ui/spellShopOverlay";
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
import { canUseItem } from "../game/itemUsability";
import type { CharacterClassId } from "../data/items";
import type { CharacterRaceId } from "../data/characters";

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
  /** Sincroniza bóveda y oro en mano con el servidor en multijugador. */
  onBankChanged?(): void;
  isMultiplayerActive?: () => boolean;
  requestServerBankAction?: (
    action: "deposit_item" | "withdraw_item" | "deposit_gold" | "withdraw_gold",
    amount: number,
    slotIndex?: number
  ) => void;
  requestServerShopBuy?: (role: MerchantRole, itemId: ItemId, amount: number) => void;
  requestServerShopSell?: (role: MerchantRole, inventorySlot: number, amount: number) => void;
  requestServerSpellShopBuy?: (spellId: number) => void;
  isPlayerAdmin(): boolean;
  getPlayerLevel(): number;
  getPlayerClass(): CharacterClassId;
  getPlayerRace(): CharacterRaceId;
  getLearnedSpellIds(): number[];
  learnSpell(spellId: number): void;
  refreshKnownSpellsUi(): void;
  persistProgressNow(): void;
};

export class ShopBankSystem {
  private bankState: BankState;
  private activeShopRole: MerchantRole | null = null;
  private bankOverlay?: { show(rect: any, state: any): void; hide(): void; refresh(state: any): void; isOpen(): boolean; layout(rect: any): void; getContainer(): any; getDomObjects(): any };
  private shopOverlay?: { show(rect: any, state: any): void; hide(): void; refresh(state: any): void; isOpen(): boolean; layout(rect: any): void; getContainer(): any; getDomObjects(): any };
  private spellShopOverlay?: {
    show(rect: any, state: SpellShopViewState): void;
    hide(): void;
    refresh(state: SpellShopViewState): void;
    isOpen(): boolean;
    layout(rect: any): void;
    getContainer(): any;
    getDomObjects(): any;
  };
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

  setSpellShopOverlay(overlay: typeof this.spellShopOverlay) {
    this.spellShopOverlay = overlay;
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

  isSpellShopOpen(): boolean {
    return this.spellShopOverlay?.isOpen() ?? false;
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
    if (this.spellShopOverlay?.isOpen()) {
      this.spellShopOverlay.layout(rect);
      this.refreshSpellShopOverlay();
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
    this.cb.onBankChanged?.();
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
    const catalog = role ? getShopCatalogForRole(role) : [];
    
    const unusableCatalogIds = new Set<string>();
    catalog.forEach(itemId => {
      const item = getItemDefinition(itemId);
      if (item) {
        const usability = canUseItem(
          this.cb.getPlayerClass(),
          this.cb.getPlayerRace(),
          this.cb.getPlayerLevel(),
          item,
          this.cb.isPlayerAdmin()
        );
        if (!usability.allowed) unusableCatalogIds.add(itemId);
      }
    });

    return {
      title: role ? getMerchantDisplayTitle(role) : "Comerciante",
      catalog,
      inventory: this.cb.getInventory(),
      playerGold: this.cb.getPlayerGold(),
      unusableCatalogIds
    };
  }

  refreshShopOverlay() {
    this.shopOverlay?.refresh(this.getShopViewState());
  }

  closeShop() {
    this.shopOverlay?.hide();
    this.spellShopOverlay?.hide();
    this.activeShopRole = null;
  }

  openShop(role: MerchantRole) {
    this.closeBank();
    this.spellShopOverlay?.hide();
    this.activeShopRole = role;
    if (isSpellMerchantRole(role)) {
      this.shopOverlay?.hide();
      this.spellShopOverlay?.show(this.cb.getGameViewportRect(), this.getSpellShopViewState());
      return;
    }
    this.shopOverlay?.show(this.cb.getGameViewportRect(), this.getShopViewState());
  }

  private getSpellShopViewState(): SpellShopViewState {
    const learned = new Set(
      this.cb.getLearnedSpellIds().map((id) => Math.floor(id)).filter((id) => id > 0)
    );
    return {
      title: "Vendedor de Magia",
      catalog: getMageVendorSpellCatalog(),
      playerGold: this.cb.getPlayerGold(),
      learnedSpellIds: learned,
      playerClass: this.cb.getPlayerClass(),
      playerLevel: this.cb.getPlayerLevel(),
      isAdmin: this.cb.isPlayerAdmin(),
    };
  }

  refreshSpellShopOverlay() {
    if (!this.spellShopOverlay?.isOpen()) return;
    this.spellShopOverlay.refresh(this.getSpellShopViewState());
  }

  buySpellFromShop(spellId: number) {
    if (this.cb.isMultiplayerActive?.()) {
      this.cb.requestServerSpellShopBuy?.(spellId);
      return;
    }

    const spell =
      getMageVendorSpellCatalog().find((entry) => entry.idSpell === spellId) ??
      SPELL_DEFINITIONS.find((entry) => entry.idSpell === spellId);
    if (!spell) {
      this.cb.addChatLine("Ese hechizo no está a la venta.");
      return;
    }
    if (!getMageVendorSpellCatalog().some((entry) => entry.idSpell === spellId)) {
      this.cb.addChatLine("Ese hechizo no está a la venta.");
      return;
    }
    if (isSpellLearnedByPlayer(spellId, new Set(this.cb.getLearnedSpellIds()))) {
      this.cb.addChatLine(`Ya conocés ${spell.nombre}.`);
      this.refreshSpellShopOverlay();
      return;
    }
    if (
      !this.cb.isPlayerAdmin() &&
      !spell.usableBy.includes(this.cb.getPlayerClass())
    ) {
      this.cb.addChatLine(`Tu clase no puede aprender ${spell.nombre}.`);
      return;
    }
    if (!this.cb.isPlayerAdmin() && spell.nivelRequerido > this.cb.getPlayerLevel()) {
      this.cb.addChatLine(
        `Necesitás ser nivel ${spell.nivelRequerido} para aprender ${spell.nombre}.`
      );
      return;
    }
    const cost = Math.max(0, Math.floor(spell.valor));
    if (this.cb.getPlayerGold() < cost) {
      this.cb.addChatLine("No tenés suficiente oro.");
      return;
    }
    this.cb.setPlayerGold(this.cb.getPlayerGold() - cost);
    this.cb.learnSpell(spellId);
    this.cb.refreshHud();
    this.cb.refreshKnownSpellsUi();
    this.cb.persistProgressNow();
    this.refreshSpellShopOverlay();
    this.cb.addChatLine(`Aprendiste ${spell.nombre} por ${cost.toLocaleString("es-AR")} de oro.`);
  }

  buyFromShop(itemId: ItemId, amount: number) {
    if (this.cb.isMultiplayerActive?.()) {
      if (this.activeShopRole) {
        this.cb.requestServerShopBuy?.(this.activeShopRole, itemId, amount);
      }
      return;
    }

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
    if (this.cb.isMultiplayerActive?.()) {
      if (this.activeShopRole) {
        this.cb.requestServerShopSell?.(this.activeShopRole, slotIndex, amount);
      }
      return;
    }

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
    if (this.cb.isMultiplayerActive?.()) {
      this.cb.requestServerBankAction?.("deposit_item", amount, slotIndex);
      return;
    }

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
    if (this.cb.isMultiplayerActive?.()) {
      this.cb.requestServerBankAction?.("withdraw_item", amount, slotIndex);
      return;
    }

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
    if (this.cb.isMultiplayerActive?.()) {
      this.cb.requestServerBankAction?.("deposit_gold", amount);
      return;
    }

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
    if (this.cb.isMultiplayerActive?.()) {
      this.cb.requestServerBankAction?.("withdraw_gold", amount);
      return;
    }

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
