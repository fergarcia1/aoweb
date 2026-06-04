import type { CharacterGenderId, CharacterRaceId } from "./characterTypes";
import type { Facing } from "./types";

/** Roles de NPCs neutrales con los que se comercia o interactúa. */
export type NpcRole =
  | "priest"
  | "blacksmith"
  | "armorer"
  | "tailor"
  | "alchemist"
  | "mage"
  | "banker";

export type StaticNpcDefinition = {
  id: string;
  role: NpcRole;
  displayName: string;
  mapId: string;
  tileX: number;
  tileY: number;
  facing: Facing;
  raceId: CharacterRaceId;
  genderId: CharacterGenderId;
  /**
   * Columna 0-based en `{raza}_{genero}_faces.png`.
   * En creación de personaje la UI muestra `faceIndex + 1` (cara 9 → índice 8).
   */
  faceIndex: number;
  /** Número de cara 1–11 (misma convención que la UI de creación). Prioridad sobre faceIndex. */
  faceCara?: number;
  bodyTextureKey: string;
  bodyAssetPath: string;
  /** Ajuste vertical de la cara (px); mayor = más abajo. Por defecto +10 en armaduras Bajos. */
  faceDropY?: number;
  /** Ajuste horizontal de la cara (px); mayor = más a la derecha. */
  faceOffsetX?: number;
  /** Multiplicador de escala de la cara (1 = igual que el jugador de esa raza). */
  faceScale?: number;
};
