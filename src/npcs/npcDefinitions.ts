import { START_MAP_ID } from "../maps/index";
import type { StaticNpcDefinition } from "./types";

export const BANKER_INTERACT_MAX_TILE_DISTANCE = 3;

export const PRIEST_TUNIC_TEXTURE_KEY = "tunicaSacerdote_std";
export const PRIEST_TUNIC_PATH = "/assets/ao/armors/tunicaSacerdote_std.png";

export const BANKER_ARMOR_TEXTURE_KEY = "placasDoradas_std";
export const BANKER_ARMOR_PATH = "/assets/ao/armors/placasDoradas_std.png";

export const BLACKSMITH_ARMOR_TEXTURE_KEY = "cueroBajos_std";
export const BLACKSMITH_ARMOR_PATH = "/assets/ao/armors/cueroBajos_std.png";

export const ARMORER_ARMOR_TEXTURE_KEY = "placas_std";
export const ARMORER_ARMOR_PATH = "/assets/ao/armors/placas_std.png";

export const ALCHEMIST_TUNIC_TEXTURE_KEY = "citizenClothesBajos_std";
export const ALCHEMIST_TUNIC_PATH = "/assets/ao/armors/citizenClothesBajos_std.png";

export const MERCHANT_INTERACT_MAX_TILE_DISTANCE = 3;

/** Texturas de cuerpo usadas por NPCs (spritesheets 32×48 como armaduras). */
export const NPC_BODY_TEXTURES: Array<{ key: string; path: string }> = [
  { key: PRIEST_TUNIC_TEXTURE_KEY, path: PRIEST_TUNIC_PATH },
  { key: BANKER_ARMOR_TEXTURE_KEY, path: BANKER_ARMOR_PATH },
  { key: BLACKSMITH_ARMOR_TEXTURE_KEY, path: BLACKSMITH_ARMOR_PATH },
  { key: ARMORER_ARMOR_TEXTURE_KEY, path: ARMORER_ARMOR_PATH },
  { key: ALCHEMIST_TUNIC_TEXTURE_KEY, path: ALCHEMIST_TUNIC_PATH },
];

/** Sacerdote en Caja de arena (pueblo). */
export const PUEBLO_PRIEST: StaticNpcDefinition = {
  id: "priest_pueblo",
  role: "priest",
  displayName: "Sacerdote",
  mapId: START_MAP_ID,
  tileX: 38,
  tileY: 34,
  facing: "down",
  raceId: "human",
  genderId: "male",
  faceIndex: 2,
  bodyTextureKey: PRIEST_TUNIC_TEXTURE_KEY,
  bodyAssetPath: PRIEST_TUNIC_PATH,
};

/** Banquero en Caja de arena (pueblo). */
export const PUEBLO_BANKER: StaticNpcDefinition = {
  id: "banker_pueblo",
  role: "banker",
  displayName: "Banquero",
  mapId: START_MAP_ID,
  tileX: 42,
  tileY: 34,
  facing: "down",
  raceId: "human",
  genderId: "male",
  faceIndex: 5,
  bodyTextureKey: BANKER_ARMOR_TEXTURE_KEY,
  bodyAssetPath: BANKER_ARMOR_PATH,
};

/** Herrero en Caja de arena (pueblo). */
export const PUEBLO_BLACKSMITH: StaticNpcDefinition = {
  id: "blacksmith_pueblo",
  role: "blacksmith",
  displayName: "Herrero",
  mapId: START_MAP_ID,
  tileX: 36,
  tileY: 32,
  facing: "down",
  raceId: "dwarf",
  genderId: "male",
  faceIndex: 1,
  bodyTextureKey: BLACKSMITH_ARMOR_TEXTURE_KEY,
  bodyAssetPath: BLACKSMITH_ARMOR_PATH,
  faceDropY: 3,
  faceOffsetX: -1,
};

/** Armero en Caja de arena (pueblo). */
export const PUEBLO_ARMORER: StaticNpcDefinition = {
  id: "armorer_pueblo",
  role: "armorer",
  displayName: "Armero",
  mapId: START_MAP_ID,
  tileX: 44,
  tileY: 32,
  facing: "down",
  raceId: "human",
  genderId: "male",
  faceIndex: 3,
  bodyTextureKey: ARMORER_ARMOR_TEXTURE_KEY,
  bodyAssetPath: ARMORER_ARMOR_PATH,
};

/** Alquimista en Caja de arena (pueblo). */
export const PUEBLO_ALCHEMIST: StaticNpcDefinition = {
  id: "alchemist_pueblo",
  role: "alchemist",
  displayName: "Alquimista",
  mapId: START_MAP_ID,
  tileX: 40,
  tileY: 30,
  facing: "down",
  raceId: "gnome",
  genderId: "male",
  faceIndex: 0,
  bodyTextureKey: ALCHEMIST_TUNIC_TEXTURE_KEY,
  bodyAssetPath: ALCHEMIST_TUNIC_PATH,
  faceDropY: -2,
  faceOffsetX: 1,
};

/** NPCs estáticos por mapa. */
export const STATIC_NPCS: StaticNpcDefinition[] = [
  PUEBLO_PRIEST,
  PUEBLO_BANKER,
  PUEBLO_BLACKSMITH,
  PUEBLO_ARMORER,
  PUEBLO_ALCHEMIST,
];

export function getNpcsForMap(mapId: string): StaticNpcDefinition[] {
  return STATIC_NPCS.filter((npc) => npc.mapId === mapId);
}

export function getPriestNpcForMap(mapId: string): StaticNpcDefinition | undefined {
  return STATIC_NPCS.find((npc) => npc.mapId === mapId && npc.role === "priest");
}

export function getNpcOccupiedTiles(mapId: string): Array<{ x: number; y: number }> {
  return getNpcsForMap(mapId).map((npc) => ({ x: npc.tileX, y: npc.tileY }));
}
