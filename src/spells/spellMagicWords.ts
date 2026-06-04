import { SPELL_DEFINITIONS } from "../data/spells";
import {
  getSpellMagicWords,
  SPELL_MAGIC_WORDS_DURATION_MS,
} from "./spellEffects";

export { SPELL_MAGIC_WORDS_DURATION_MS };

export const SPELL_MAGIC_WORDS_BY_ID: Record<number, string> = {};
for (const spell of SPELL_DEFINITIONS) {
  const words = getSpellMagicWords(spell.idSpell);
  if (words) {
    SPELL_MAGIC_WORDS_BY_ID[spell.idSpell] = words;
  }
}

export function getSpellMagicWordsForCast(spellId: number, _nombre?: string): string | undefined {
  return getSpellMagicWords(spellId);
}
