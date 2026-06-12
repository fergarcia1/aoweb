import type { CharacterClassId } from "./items/catalog";
import type { ItemDefinition } from "./items/definitions";
import { canRaceEquipArmor } from "./armorRules";

export type ItemUsabilityResult = {
  allowed: boolean;
  reason?: string;
};

export function canUseItem(
  classId: CharacterClassId,
  raceId: string,
  playerLevel: number,
  item: ItemDefinition,
  isAdmin: boolean = false
): ItemUsabilityResult {
  if (isAdmin) return { allowed: true };

  if (playerLevel < item.nivelMinimo) {
    return {
      allowed: false,
      reason: `NecesitÃ¡s nivel ${item.nivelMinimo} para usar ${item.name}.`,
    };
  }

  if (!item.usableBy.includes(classId)) {
    return {
      allowed: false,
      reason: `Tu clase no puede usar ${item.name}.`,
    };
  }

  if (item.equipSlot === "armor" || item.type === "armor") {
    const armorCheck = canRaceEquipArmor(
      raceId,
      item.clasesBajas ?? false,
      Boolean(item.spritesheetBajosPath)
    );
    if (!armorCheck.allowed) {
      return armorCheck;
    }
  }

  return { allowed: true };
}
