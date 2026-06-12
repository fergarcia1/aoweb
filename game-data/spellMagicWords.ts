import { SPELL_CAST_META_BY_ID } from "./spellCastMeta";

/** @deprecated Usar SPELL_MAGIC_WORDS_DURATION_MS desde `src/spells/spellEffects`. */
export const SPELL_MAGIC_WORDS_DURATION_MS = 1000;

export function getSpellMagicWordsFromImported(
  aowebId: number,
  _aowebNombre?: string
): string | undefined {
  const words = SPELL_CAST_META_BY_ID[aowebId]?.palabrasMagicas?.trim();
  return words || undefined;
}

export function buildSpellMagicWordsLookup(
  spells: ReadonlyArray<{ idSpell: number; nombre: string }>
): Readonly<Record<number, string>> {
  const out: Record<number, string> = {};
  for (const spell of spells) {
    const words = getSpellMagicWordsFromImported(spell.idSpell, spell.nombre);
    if (words) {
      out[spell.idSpell] = words;
    }
  }
  return out;
}
