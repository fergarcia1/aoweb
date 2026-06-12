import { CLASS_USES_MANA } from "./classes";
import type { CharacterClassId } from "./items/catalog";

/** Hechizos iniciales (ids alineados con `src/data/spells.ts` / SPELL_ID). */
export const STARTER_SPELL_CURAR_VENENO = 1;
export const STARTER_SPELL_PROYECTIL_MAGICO = 2;
export const STARTER_SPELL_SAETA_IGNEA = 4;

/** Clases con barra de mana que reciben además Saeta Ígnea al crear personaje. */
export const STARTER_SEMI_MAGIC_CLASS_IDS: readonly CharacterClassId[] = [
  "mago",
  "druida",
  "clerigo",
  "bardo",
  "nigromante",
] as const;

export const STARTER_ARMOR_ITEM_ID = "armor_citizen" as const;export const STARTER_POTION_MP_AMOUNT = 1500;
export const STARTER_POTION_HP_AMOUNT = 800;

export function getStarterWeaponItemId(classId: CharacterClassId): string {
  switch (classId) {
    case "nigromante":
    case "druida":
      return "weapon_baston";
    case "bardo":
      return "weapon_nudillos_bronce";
    case "cazador":
      return "weapon_arco_largo";
    case "mago":
      return "weapon_baculo_lazurt";
    case "paladin":
    case "clerigo":
    case "guerrero":
    case "asesino":
    default:
      return "weapon_espada_larga";
  }
}

export type StarterLoadout = {
  weaponItemId: string;
  armorItemId: string;
  inventorySlots: Array<{ slotIndex: number; itemId: string; amount: number }>;
  equipment: {
    weaponId: string;
    armorId: string;
  };
};

export function buildStarterLoadout(classId: CharacterClassId): StarterLoadout {
  const weaponItemId = getStarterWeaponItemId(classId);
  return {
    weaponItemId,
    armorItemId: STARTER_ARMOR_ITEM_ID,
    inventorySlots: [
      { slotIndex: 0, itemId: weaponItemId, amount: 1 },
      { slotIndex: 1, itemId: STARTER_ARMOR_ITEM_ID, amount: 1 },
      { slotIndex: 2, itemId: "potion_mp", amount: STARTER_POTION_MP_AMOUNT },
      { slotIndex: 3, itemId: "potion_hp", amount: STARTER_POTION_HP_AMOUNT },
    ],
    equipment: {
      weaponId: weaponItemId,
      armorId: STARTER_ARMOR_ITEM_ID,
    },
  };
}

export function isStarterInventoryEmpty(
  slots: Array<{ itemId: string | null; amount: number }>
): boolean {
  return !slots.some((slot) => Boolean(slot.itemId) && slot.amount > 0);
}

/**
 * Hechizos al crear personaje:
 * - Con mana: Curar Veneno + Proyectil Mágico.
 * - Semi/mágicas (mago, druida, clérigo, bardo, nigromante): + Saeta Ígnea.
 * - Sin mana (guerrero, cazador): ninguno.
 */
export function getStarterLearnedSpellIds(classId: CharacterClassId): number[] {
  if (!CLASS_USES_MANA[classId]) {
    return [];
  }
  const ids = [STARTER_SPELL_CURAR_VENENO, STARTER_SPELL_PROYECTIL_MAGICO];
  if ((STARTER_SEMI_MAGIC_CLASS_IDS as readonly string[]).includes(classId)) {
    ids.push(STARTER_SPELL_SAETA_IGNEA);
  }
  return ids;
}
