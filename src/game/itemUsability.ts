import type { CharacterClassId } from "../data/items";
import type { CharacterRaceId } from "../data/characters";
import type { ItemDefinition } from "../items/itemDefinitions";
import { canRaceEquipArmor } from "./armorUtils";

export type ItemUsabilityResult = {
  allowed: boolean;
  reason?: string;
};

export function canUseItem(
  classId: CharacterClassId,
  raceId: CharacterRaceId,
  playerLevel: number,
  item: ItemDefinition
): ItemUsabilityResult {
  if (playerLevel < item.nivelMinimo) {
    return {
      allowed: false,
      reason: `Necesitás nivel ${item.nivelMinimo} para usar ${item.name}.`,
    };
  }

  if (!item.usableBy.includes(classId)) {
    return {
      allowed: false,
      reason: `Tu clase no puede usar ${item.name}.`,
    };
  }

  if (item.equipSlot === "armor" || item.type === "armor") {
    const armorCheck = canRaceEquipArmor(raceId, item.clasesBajas ?? false);
    if (!armorCheck.allowed) {
      return armorCheck;
    }
  }

  return { allowed: true };
}
