import type { NetPlayerEquipment } from "../shared/types";

import {
  getUnarmedDamageRange,
  getWeaponDamageRangeWithStrength,
} from "./attackDamage";
import { ARMORS, HELMETS, SHIELDS, WEAPONS } from "./items/catalog";



export type DefenseStats = {

  /** Reducción plana de armadura/casco (no escudo). */

  damageReductionPercent: number;

  magicResistancePercent: number;

  shieldBlockChancePercent: number;

  shieldBlockReductionPercent: number;

};



export type AttackStats = {

  attackMin: number;

  attackMax: number;

  canCrit: boolean;

  critChance: number;

  critDamage: number;

  magicDamageBonusPercent: number;

};



export function getAttackStatsFromEquipment(
  equipment: NetPlayerEquipment,
  options?: { strength?: number }
): AttackStats {

  const strength = options?.strength ?? 0;
  const baseRange = getUnarmedDamageRange(strength);
  let attackMin = baseRange.attackMin;

  let attackMax = baseRange.attackMax;

  let magicDamageBonusPercent = 0;

  let canCrit = false;

  let critChance = 0;

  let critDamage = 1.5;



  const weaponId = equipment.weaponId;

  if (weaponId) {

    const weapon = WEAPONS.find((entry) => entry.itemId === weaponId);

    if (weapon) {

      const weaponRange = getWeaponDamageRangeWithStrength(
        weapon.danioMin,
        weapon.danioMax,
        strength
      );
      attackMin = weaponRange.attackMin;

      attackMax = weaponRange.attackMax;

      magicDamageBonusPercent += weapon.aumentoDanioMagicoPercent ?? 0;

      if (weapon.canCrit) {

        canCrit = true;

        critChance = weapon.critChance ?? 0;

        critDamage = weapon.critDamage ?? 1.5;

      }

    }

  }



  attackMin = Math.max(1, Math.floor(attackMin));

  attackMax = Math.max(attackMin, Math.floor(attackMax));



  return { attackMin, attackMax, canCrit, critChance, critDamage, magicDamageBonusPercent };

}



export function getDefenseStatsFromEquipment(equipment: NetPlayerEquipment): DefenseStats {

  let damageReductionPercent = 0;

  let magicResistancePercent = 0;

  let shieldBlockChancePercent = 0;

  let shieldBlockReductionPercent = 0;



  const shield = equipment.shieldId

    ? SHIELDS.find((entry) => entry.itemId === equipment.shieldId)

    : undefined;

  if (shield) {

    shieldBlockChancePercent = shield.probabilidadBloqueoPercent;

    shieldBlockReductionPercent = shield.reduccionAlBloquearPercent;

    magicResistancePercent += shield.resistenciaMagicaPercent;

  }



  const helmet = equipment.helmetId

    ? HELMETS.find((entry) => entry.itemId === equipment.helmetId)

    : undefined;

  if (helmet) {

    damageReductionPercent += helmet.reduccionDanioPercent;

    magicResistancePercent += helmet.resistenciaMagicaPercent;

  }



  const armor = equipment.armorId

    ? ARMORS.find((entry) => entry.itemId === equipment.armorId)

    : undefined;

  if (armor) {

    damageReductionPercent += armor.reduccionDanioPercent;

    magicResistancePercent += armor.resistenciaMagicaPercent;

  }



  return {

    damageReductionPercent: Math.min(damageReductionPercent, 0.9),

    magicResistancePercent: Math.min(magicResistancePercent, 0.9),

    shieldBlockChancePercent: Math.min(shieldBlockChancePercent, 1),

    shieldBlockReductionPercent: Math.min(shieldBlockReductionPercent, 0.9),

  };

}


