import {
  ATTRIBUTE_POTION_BUFF_DURATION_MS,
  ATTRIBUTE_POTION_BUFF_MAX,
  ATTRIBUTE_POTION_GAIN_MAX,
  ATTRIBUTE_POTION_GAIN_MIN,
  STAT_MAX,
} from "./constants";
import type { CharacterClassId, ConsumableData } from "./items/catalog";
import { CONSUMABLES } from "./items/catalog";
import { isKnownItemId } from "./items/registry";
import { CLASS_USES_MANA } from "./classes";

export type VitalPair = { current: number; max: number };

export type AttributeBuffState = {
  strength: number;
  agility: number;
  expiresAtMs: number;
};

export type UseConsumableResult =
  | {
      ok: true;
      message: string;
      hp?: number;
      mp?: number;
      attributeBuffs?: AttributeBuffState;
      /** Scrolls / efectos solo cliente por ahora. */
      clientOnly?: boolean;
    }
  | { ok: false; message: string };

export function getConsumableById(itemId: string): ConsumableData | undefined {
  if (!isKnownItemId(itemId)) return undefined;
  return CONSUMABLES.find((entry) => entry.itemId === itemId);
}

function rollAttributeGain(currentBonus: number): number {
  const roll =
    ATTRIBUTE_POTION_GAIN_MIN +
    Math.floor(Math.random() * (ATTRIBUTE_POTION_GAIN_MAX - ATTRIBUTE_POTION_GAIN_MIN + 1));
  return Math.min(roll, Math.max(0, ATTRIBUTE_POTION_BUFF_MAX - currentBonus));
}

export function tryUseConsumableOnVitals(
  itemId: string,
  classId: CharacterClassId,
  vitals: { hp: VitalPair; mp: VitalPair },
  buffs: AttributeBuffState,
  nowMs: number
): UseConsumableResult {
  const consumable = getConsumableById(itemId);
  if (!consumable) {
    return { ok: false, message: "Objeto desconocido." };
  }
  if (!consumable.usableBy.includes(classId)) {
    return { ok: false, message: `Tu clase no puede usar ${consumable.nombre}.` };
  }

  if (consumable.learnSpellId) {
    return {
      ok: true,
      message: `${consumable.nombre} debe usarse en modo local.`,
      clientOnly: true,
    };
  }

  if (consumable.attributeBuff === "strength" || consumable.attributeBuff === "agility") {
    const stat = consumable.attributeBuff;
    const statLabel = stat === "strength" ? "Fuerza" : "Agilidad";
    const current = Math.floor(buffs[stat]);
    const expiresAtMs = nowMs + ATTRIBUTE_POTION_BUFF_DURATION_MS;
    const nextBuffs: AttributeBuffState = {
      strength: Math.floor(buffs.strength),
      agility: Math.floor(buffs.agility),
      expiresAtMs,
    };

    if (current >= ATTRIBUTE_POTION_BUFF_MAX) {
      return {
        ok: true,
        message: `Usaste ${consumable.nombre}. Renovaste el efecto por 90 s (ya tenés el máximo de ${statLabel}).`,
        attributeBuffs: nextBuffs,
      };
    }

    const gained = rollAttributeGain(current);
    nextBuffs[stat] = current + gained;
    const ceiling = STAT_MAX + ATTRIBUTE_POTION_BUFF_MAX;
    return {
      ok: true,
      message: `Usaste ${consumable.nombre} y ganaste +${gained} ${statLabel} (bono +${nextBuffs[stat]}, tope ${ceiling}, 90 s).`,
      attributeBuffs: nextBuffs,
    };
  }

  if (consumable.restoreMpPercent && consumable.restoreMpPercent > 0) {
    if (!CLASS_USES_MANA[classId] || vitals.mp.max <= 0) {
      return { ok: false, message: "Tu clase no usa maná." };
    }
    if (vitals.mp.current >= vitals.mp.max) {
      return { ok: false, message: "Ya tenés el maná al máximo." };
    }
    const amount = Math.max(1, Math.floor(vitals.mp.max * consumable.restoreMpPercent));
    const before = vitals.mp.current;
    const mp = Math.min(vitals.mp.max, before + amount);
    const restored = mp - before;
    return {
      ok: true,
      message: `Usaste ${consumable.nombre} y recuperaste ${restored} MP (${Math.round(consumable.restoreMpPercent * 100)}%).`,
      mp,
    };
  }

  if (consumable.healHpPercent && consumable.healHpPercent > 0) {
    if (vitals.hp.current >= vitals.hp.max) {
      return { ok: false, message: "Ya tenés la vida al máximo." };
    }
    const amount = Math.max(1, Math.floor(vitals.hp.max * consumable.healHpPercent));
    const before = vitals.hp.current;
    const hp = Math.min(vitals.hp.max, before + amount);
    const restored = hp - before;
    return {
      ok: true,
      message: `Usaste ${consumable.nombre} y recuperaste ${restored} HP (${Math.round(consumable.healHpPercent * 100)}%).`,
      hp,
    };
  }

  return { ok: false, message: `${consumable.nombre} no tiene efecto en multijugador.` };
}

export function expireAttributeBuffs(buffs: AttributeBuffState, nowMs: number): AttributeBuffState {
  if (buffs.expiresAtMs <= 0 || nowMs < buffs.expiresAtMs) {
    return buffs;
  }
  return { strength: 0, agility: 0, expiresAtMs: 0 };
}
