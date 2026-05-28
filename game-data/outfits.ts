import { ARMORS } from "./items/catalog";

/** Visual de armadura equipada (spritesheet del personaje). */
export type Outfit =
  | "base"
  | "citizen"
  | "cuero"
  | "placas"
  | "placasRojas"
  | "placasAzules"
  | "tunicaNigro"
  | "tunicaAzul"
  | "tunicaCruz"
  | "dragonNegro"
  | "dragonNegroBajos"
  | "dragonBlanco"
  | "dragonBlancoBajos"
  | "dragonRojo"
  | "dragonRojoBajos";

const VALID_OUTFITS = new Set<string>([
  "base",
  "citizen",
  "cuero",
  "placas",
  "placasRojas",
  "placasAzules",
  "tunicaNigro",
  "tunicaAzul",
  "tunicaCruz",
  "dragonNegro",
  "dragonNegroBajos",
  "dragonBlanco",
  "dragonBlancoBajos",
  "dragonRojo",
  "dragonRojoBajos",
]);

/** itemId de armadura → outfit visual. */
export const ARMOR_ITEM_TO_OUTFIT: Record<string, Outfit> = Object.fromEntries(
  ARMORS.map((armor) => [armor.itemId, armor.outfitOverride])
) as Record<string, Outfit>;

export function normalizeOutfit(value: unknown): Outfit {
  if (typeof value === "string" && VALID_OUTFITS.has(value)) {
    return value as Outfit;
  }
  return "base";
}

export function outfitForArmorItemId(armorId: string | null | undefined): Outfit {
  if (!armorId) return "base";
  return ARMOR_ITEM_TO_OUTFIT[armorId] ?? "base";
}
