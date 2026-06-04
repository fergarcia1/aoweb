import { BANK_SLOT_COUNT } from "../../game-data/constants";
import type { ItemId } from "../items/itemDefinitions";
import type { InventorySlot } from "../items/inventoryStack";

export { BANK_SLOT_COUNT };

export type BankState = {
  slots: InventorySlot[];
  gold: number;
};

const STORAGE_PREFIX = "aoweb_bank_v1_";

export function createEmptyBankState(): BankState {
  return {
    slots: Array(BANK_SLOT_COUNT).fill(null),
    gold: 0,
  };
}

export function loadBankState(characterId: string): BankState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${characterId}`);
    if (!raw) {
      return createEmptyBankState();
    }
    const parsed = JSON.parse(raw) as Partial<BankState>;
    const slots = Array(BANK_SLOT_COUNT).fill(null) as InventorySlot[];
    if (Array.isArray(parsed.slots)) {
      for (let i = 0; i < BANK_SLOT_COUNT; i += 1) {
        const entry = parsed.slots[i];
        if (
          entry &&
          typeof entry === "object" &&
          typeof entry.itemId === "string" &&
          typeof entry.count === "number" &&
          entry.count > 0
        ) {
          slots[i] = {
            itemId: entry.itemId as ItemId,
            count: Math.floor(entry.count),
          };
        }
      }
    }
    return {
      slots,
      gold: typeof parsed.gold === "number" ? Math.max(0, Math.floor(parsed.gold)) : 0,
    };
  } catch {
    return createEmptyBankState();
  }
}

export function saveBankState(characterId: string, state: BankState): void {
  localStorage.setItem(
    `${STORAGE_PREFIX}${characterId}`,
    JSON.stringify({
      slots: state.slots,
      gold: Math.max(0, Math.floor(state.gold)),
    })
  );
}

export function deleteBankState(characterId: string): void {
  localStorage.removeItem(`${STORAGE_PREFIX}${characterId}`);
}
