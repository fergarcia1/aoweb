import type { CharacterGenderId, CharacterRaceId } from "../data/characters";
import type { Facing } from "../player/playerSprites";

/** Roles de NPCs neutrales con los que se comercia o interactúa. */
export type NpcRole =
  | "priest"
  | "blacksmith"
  | "armorer"
  | "alchemist"
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
  /** Columna 0-based en `{raza}_{genero}_faces.png` (cara AO 3 → 2). */
  faceIndex: number;
  bodyTextureKey: string;
  bodyAssetPath: string;
  /** Ajuste vertical de la cara (px); mayor = más abajo. Por defecto +10 en armaduras Bajos. */
  faceDropY?: number;
  /** Ajuste horizontal de la cara (px); mayor = más a la derecha. */
  faceOffsetX?: number;
};
