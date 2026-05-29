import {
  deathStateFromSavedProgress,
  freshDeathStateForCharacterSwitch,
} from "../../../shared/characterDeathState";
import { normalizeOutfit } from "../../../game-data/outfits";
import type { Facing } from "../../player/playerSprites";
import type { EquipmentSlot, ItemId } from "../../items/itemDefinitions";
import type { InventorySlot } from "../../items/inventoryStack";
import type { SkillId } from "../../game/skills";
import type { SavedCharacterProgress } from "../../game/characterProgressStorage";
import type { DeathPhase } from "../../systems/DeathSystem";
import type { PlayerProgressState } from "./types";

/** Aplica un snapshot de progreso al estado mutable de la escena (sin mundo/Phaser). */
export function applySavedProgressToSceneState(input: {
  progress: SavedCharacterProgress;
  setMapPosition: (mapId: string, tileX: number, tileY: number, facing: Facing) => void;
  setInventory: (slots: InventorySlot[]) => void;
  setEquipment: (equipment: Record<EquipmentSlot, ItemId | null>) => void;
  setEquippedOutfit: (outfit: ReturnType<typeof normalizeOutfit>) => void;
  clearEquippedArmorVisual: () => void;
  setPlayerProgress: (progress: PlayerProgressState) => void;
  setSkillLevels: (levels: Record<SkillId, number>) => void;
  setLearnedSpellIds: (ids: number[]) => void;
  setMacroBindings: (bindings: SavedCharacterProgress["macroBindings"]) => void;
  setKillStats: (stats: SavedCharacterProgress["killStats"]) => void;
  setDeathState: (phase: DeathPhase, useGhost: boolean) => void;
  onWorldItemsStorageReload: () => void;
}): void {
  const { progress } = input;
  input.setMapPosition(progress.mapId, progress.tileX, progress.tileY, progress.facing);
  input.setInventory(
    progress.inventory.map((slot) =>
      slot ? { itemId: slot.itemId, count: slot.count } : null
    )
  );
  input.setEquipment({ ...progress.equipment });
  input.setEquippedOutfit("base");
  input.clearEquippedArmorVisual();
  input.setPlayerProgress({ ...progress.playerProgress });
  input.setSkillLevels({ ...progress.skillLevels });
  input.setLearnedSpellIds([...progress.learnedSpellIds]);
  input.setMacroBindings(progress.macroBindings.map((b) => ({ ...b })));
  input.setKillStats({ ...progress.killStats });

  const death = deathStateFromSavedProgress(
    progress.deathPhase,
    progress.useGhostAppearance
  );
  input.setDeathState(death.deathPhase, death.useGhostAppearance);
  input.onWorldItemsStorageReload();
}

export function resetDeathStateForCharacterSwitch(): {
  deathPhase: DeathPhase;
  useGhostAppearance: boolean;
} {
  return freshDeathStateForCharacterSwitch();
}
