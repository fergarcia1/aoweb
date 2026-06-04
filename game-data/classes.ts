import type { CharacterClassId } from "./items/catalog";

export type { CharacterClassId };

export const CLASS_USES_MANA: Record<CharacterClassId, boolean> = {
  paladin: true,
  clerigo: true,
  mago: true,
  nigromante: true,
  druida: true,
  bardo: true,
  guerrero: false,
  cazador: false,
  asesino: true,
};
