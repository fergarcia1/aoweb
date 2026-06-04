import { SPELL_DEFINITIONS, type SpellDefinition } from "./spells";
import { SPELL_EFFECT_BY_ID } from "./spellEffects";
import {
  STARTER_SPELL_CURAR_VENENO,
  STARTER_SPELL_PROYECTIL_MAGICO,
  STARTER_SPELL_SAETA_IGNEA,
} from "./starterLoadout";

const SPELL_DEFAULT_ICON = "spell_default.png";

/** Hechizos que no se venden en la tienda de magia (NPC, WIP, GM, ritual, etc.). */
export const MAGE_VENDOR_EXCLUDED_SPELL_IDS = new Set<number>([
  36,
  37,
  100,
  101,
  103, // Resucitar — solo multijugador / ritual, no tienda
  STARTER_SPELL_CURAR_VENENO,
  STARTER_SPELL_PROYECTIL_MAGICO,
  STARTER_SPELL_SAETA_IGNEA,
]);

export function hasSpellShopIcon(spell: SpellDefinition): boolean {
  const path = spell.iconAssetPath?.trim();
  if (!path) return false;
  return !path.includes(SPELL_DEFAULT_ICON);
}

/** Tiene FX de combate registrado (hechizo jugable en el cliente actual). */
export function isSpellImplementedForPlay(spellId: number): boolean {
  return spellId in SPELL_EFFECT_BY_ID;
}

/** Catálogo del vendedor de magia: pergamino propio, FX, precio > 0, no excluido. */
export function getMageVendorSpellCatalog(): SpellDefinition[] {
  return SPELL_DEFINITIONS.filter(
    (spell) =>
      hasSpellShopIcon(spell) &&
      isSpellImplementedForPlay(spell.idSpell) &&
      !MAGE_VENDOR_EXCLUDED_SPELL_IDS.has(spell.idSpell) &&
      spell.valor > 0
  ).sort(
    (a, b) =>
      a.nivelRequerido - b.nivelRequerido ||
      a.valor - b.valor ||
      a.idSpell - b.idSpell
  );
}

export function getMageVendorSpellIds(): number[] {
  return getMageVendorSpellCatalog().map((spell) => spell.idSpell);
}

