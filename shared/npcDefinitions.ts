import { START_MAP_ID } from "./mapConstants";
import type { StaticNpcDefinition } from "./npcTypes";

/**
 * NPCs colocados a mano en el mapa. Catálogo completo Imperium (NPCs.dat):
 * `game-data/imperium/npcCatalog.json` — ver `npm run import:npc-catalog`.
 */

export const BANKER_INTERACT_MAX_TILE_DISTANCE = 3;

export const PRIEST_TUNIC_TEXTURE_KEY = "tunicaSacerdote_std";
export const PRIEST_TUNIC_PATH = "/assets/ao/armors/tunicaSacerdote_std.png";

export const BANKER_ARMOR_TEXTURE_KEY = "atuendoBanquero_std";
export const BANKER_ARMOR_PATH = "/assets/ao/armors/atuendoBanquero_std.png";

export const TAILOR_ARMOR_TEXTURE_KEY = "ropaEleganteBajos_std";
export const TAILOR_ARMOR_PATH = "/assets/ao/armors/ropaEleganteBajos_std.png";

export const BLACKSMITH_ARMOR_TEXTURE_KEY = "cueroBajos_std";
export const BLACKSMITH_ARMOR_PATH = "/assets/ao/armors/cueroBajos_std.png";

export const ARMORER_ARMOR_TEXTURE_KEY = "placas_std";
export const ARMORER_ARMOR_PATH = "/assets/ao/armors/placas_std.png";

export const ALCHEMIST_TUNIC_TEXTURE_KEY = "citizenClothesBajos_std";
export const ALCHEMIST_TUNIC_PATH = "/assets/ao/armors/citizenClothesBajos_std.png";

export const MAGE_VENDOR_ARMOR_TEXTURE_KEY = "tunicaAzul_std";
export const MAGE_VENDOR_ARMOR_PATH = "/assets/ao/armors/tunicaAzul_std.png";

export const MERCHANT_INTERACT_MAX_TILE_DISTANCE = 3;

/** Texturas de cuerpo usadas por NPCs (spritesheets 32×48 como armaduras). */
export const NPC_BODY_TEXTURES: Array<{ key: string; path: string }> = [
  { key: PRIEST_TUNIC_TEXTURE_KEY, path: PRIEST_TUNIC_PATH },
  { key: BANKER_ARMOR_TEXTURE_KEY, path: BANKER_ARMOR_PATH },
  { key: BLACKSMITH_ARMOR_TEXTURE_KEY, path: BLACKSMITH_ARMOR_PATH },
  { key: ARMORER_ARMOR_TEXTURE_KEY, path: ARMORER_ARMOR_PATH },
  { key: TAILOR_ARMOR_TEXTURE_KEY, path: TAILOR_ARMOR_PATH },
  { key: ALCHEMIST_TUNIC_TEXTURE_KEY, path: ALCHEMIST_TUNIC_PATH },
  { key: MAGE_VENDOR_ARMOR_TEXTURE_KEY, path: MAGE_VENDOR_ARMOR_PATH },
];

/** Sacerdote en el interior del templo de Ullathorpe (mapa1); mapa1.csm NPC 5 @ (78,63). */
export const MAPA1_PRIEST: StaticNpcDefinition = {
  id: "priest_mapa1",
  role: "priest",
  displayName: "Sacerdote",
  mapId: START_MAP_ID,
  tileX: 76,
  tileY: 61,
  facing: "down",
  raceId: "human",
  genderId: "male",
  faceIndex: 6,
  bodyTextureKey: PRIEST_TUNIC_TEXTURE_KEY,
  bodyAssetPath: PRIEST_TUNIC_PATH,
  faceDropY: 0,
  faceScale: 1,
};

/** Banquero en el interior del banco de Ullathorpe (mapa1); mapa1.csm NPC 24 @ (78,48). */
export const MAPA1_BANKER: StaticNpcDefinition = {
  id: "banker_mapa1",
  role: "banker",
  displayName: "Banquero",
  mapId: START_MAP_ID,
  tileX: 76,
  tileY: 47,
  facing: "down",
  raceId: "human",
  genderId: "male",
  faceIndex: 8,
  faceCara: 9,
  bodyTextureKey: BANKER_ARMOR_TEXTURE_KEY,
  bodyAssetPath: BANKER_ARMOR_PATH,
  faceOffsetX: 1,
};

/** Herrero en la herrería de Ullathorpe (mapa1); sin NPC de herrería en mapa1.csm. */
export const MAPA1_BLACKSMITH: StaticNpcDefinition = {
  id: "blacksmith_mapa1",
  role: "blacksmith",
  displayName: "Herrero",
  mapId: START_MAP_ID,
  tileX: 59,
  tileY: 62,
  facing: "down",
  raceId: "dwarf",
  genderId: "male",
  faceIndex: 1,
  bodyTextureKey: BLACKSMITH_ARMOR_TEXTURE_KEY,
  bodyAssetPath: BLACKSMITH_ARMOR_PATH,
  faceDropY: 2,
  faceOffsetX: 1,
};

/** Armero en la herrería de Ullathorpe (mapa1); sin spawn de armero en mapa1.csm. */
export const MAPA1_ARMORER: StaticNpcDefinition = {
  id: "armorer_mapa1",
  role: "armorer",
  displayName: "Armaduras",
  mapId: START_MAP_ID,
  tileX: 41,
  tileY: 35,
  facing: "down",
  raceId: "human",
  genderId: "male",
  faceIndex: 3,
  bodyTextureKey: ARMORER_ARMOR_TEXTURE_KEY,
  bodyAssetPath: ARMORER_ARMOR_PATH,
};

/** Sastre en Ullathorpe (mapa1), junto al alquimista. */
export const MAPA1_TAILOR: StaticNpcDefinition = {
  id: "tailor_mapa1",
  role: "tailor",
  displayName: "Sastre",
  mapId: START_MAP_ID,
  tileX: 77,
  tileY: 32,
  facing: "down",
  raceId: "gnome",
  genderId: "male",
  faceIndex: 9,
  bodyTextureKey: TAILOR_ARMOR_TEXTURE_KEY,
  bodyAssetPath: TAILOR_ARMOR_PATH,
  faceDropY: -2,
  faceOffsetX: 1,
};

/** Alquimista en el local de Ullathorpe (mapa1); mapa1.csm NPC 14 @ (80,33) queda fuera del edificio. */
export const MAPA1_ALCHEMIST: StaticNpcDefinition = {
  id: "alchemist_mapa1",
  role: "alchemist",
  displayName: "Alquimista",
  mapId: START_MAP_ID,
  tileX: 69,
  tileY: 32,
  facing: "down",
  raceId: "gnome",
  genderId: "male",
  faceIndex: 0,
  bodyTextureKey: ALCHEMIST_TUNIC_TEXTURE_KEY,
  bodyAssetPath: ALCHEMIST_TUNIC_PATH,
  faceDropY: -2,
  faceOffsetX: 2,
};

/** Vendedor de magia en Ullathorpe (mapa1), local de hechizos @ (57,26). */
export const MAPA1_MAGE_VENDOR: StaticNpcDefinition = {
  id: "mage_vendor_mapa1",
  role: "mage",
  displayName: "Mago",
  mapId: START_MAP_ID,
  tileX: 57,
  tileY: 26,
  facing: "down",
  raceId: "elf",
  genderId: "male",
  faceIndex: 4,
  bodyTextureKey: MAGE_VENDOR_ARMOR_TEXTURE_KEY,
  bodyAssetPath: MAGE_VENDOR_ARMOR_PATH,
  faceDropY: 0,
  faceOffsetX: 0,
};

/** NPCs estáticos por mapa. */
export const STATIC_NPCS: StaticNpcDefinition[] = [
  MAPA1_PRIEST,
  MAPA1_BANKER,
  MAPA1_BLACKSMITH,
  MAPA1_ARMORER,
  MAPA1_TAILOR,
  MAPA1_ALCHEMIST,
  MAPA1_MAGE_VENDOR,
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
