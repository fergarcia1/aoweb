/**
 * Comportamientos especiales de hechizos (compartido cliente + servidor).
 */

export type SpellBuffEffect = {
  stat: "strength" | "agility";
  amount: number;
};

export type SpellBehavior = {
  buffEffects?: SpellBuffEffect[];
  removeImmobilize?: boolean;
  removeAllEffects?: boolean;
  /** Invisibilidad parpadeante (hechizo 14). */
  invisibility?: boolean;
  /** Resucitar aliado muerto tras carga (hechizo 103). */
  resurrect?: boolean;
};

export const SPELL_BEHAVIORS: Record<number, SpellBehavior> = {
  18: {
    buffEffects: [{ stat: "agility", amount: 4 }],
  },
  20: {
    buffEffects: [{ stat: "strength", amount: 4 }],
  },
  13: {
    buffEffects: [
      { stat: "strength", amount: 8 },
      { stat: "agility", amount: 8 },
    ],
  },
  73: {
    buffEffects: [
      { stat: "strength", amount: 8 },
      { stat: "agility", amount: 8 },
    ],
  },
  19: {
    buffEffects: [{ stat: "agility", amount: -5 }],
  },
  21: {
    buffEffects: [{ stat: "strength", amount: -5 }],
  },
  33: {
    buffEffects: [
      { stat: "strength", amount: -10 },
      { stat: "agility", amount: -10 },
    ],
  },
  14: {
    invisibility: true,
  },
  103: {
    resurrect: true,
  },
  102: {
    removeImmobilize: true,
  },
  22: {
    removeAllEffects: true,
  },
  32: {
    removeAllEffects: true,
  },
};

export function getSpellBehavior(spellId: number): SpellBehavior | undefined {
  return SPELL_BEHAVIORS[spellId];
}

export function isAllyStatBuffSpell(spellId: number): boolean {
  const behavior = getSpellBehavior(spellId);
  return Boolean(behavior?.buffEffects?.length);
}

export function isRemoveImmobilizeSpell(spellId: number): boolean {
  return Boolean(getSpellBehavior(spellId)?.removeImmobilize);
}

export function isInvisibilitySpell(spellId: number): boolean {
  return Boolean(getSpellBehavior(spellId)?.invisibility);
}

export function isResurrectSpell(spellId: number): boolean {
  return Boolean(getSpellBehavior(spellId)?.resurrect);
}

export const TARGET_NOT_IMMOBILIZED_MESSAGE = "El objetivo no está inmovilizado.";
