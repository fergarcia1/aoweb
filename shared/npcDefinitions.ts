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

export const ARMADA_ARMOR_TEXTURE_KEY = "armadaBajosMago_std";
export const ARMADA_ARMOR_PATH = "/assets/ao/armors/armadaBajosMago_std.png";

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
  { key: ARMADA_ARMOR_TEXTURE_KEY, path: ARMADA_ARMOR_PATH },
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

// ======================= VENDEDORES ESTÁNDAR DE CIUDAD (MAPA 1) =======================

export const MAPA1_BLACKSMITH: StaticNpcDefinition = {
  id: "blacksmith_mapa1",
  role: "blacksmith",
  displayName: "Herrero",
  mapId: START_MAP_ID,
  tileX: 34,
  tileY: 61,
  facing: "down",
  raceId: "dwarf",
  genderId: "male",
  faceIndex: 1,
  bodyTextureKey: BLACKSMITH_ARMOR_TEXTURE_KEY,
  bodyAssetPath: BLACKSMITH_ARMOR_PATH,
  faceDropY: 2,
  faceOffsetX: 1,
};

export const MAPA1_ARMORER: StaticNpcDefinition = {
  id: "armorer_mapa1",
  role: "armorer",
  displayName: "Armaduras",
  mapId: START_MAP_ID,
  tileX: 32,
  tileY: 61,
  facing: "down",
  raceId: "human",
  genderId: "male",
  faceIndex: 3,
  bodyTextureKey: ARMORER_ARMOR_TEXTURE_KEY,
  bodyAssetPath: ARMORER_ARMOR_PATH,
};

export const MAPA1_TAILOR: StaticNpcDefinition = {
  id: "tailor_mapa1",
  role: "tailor",
  displayName: "Sastre",
  mapId: START_MAP_ID,
  tileX: 69,
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

export const MAPA1_ALCHEMIST: StaticNpcDefinition = {
  id: "alchemist_mapa1",
  role: "alchemist",
  displayName: "Alquimista",
  mapId: START_MAP_ID,
  tileX: 77,
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

export const MAPA1_MAGE_VENDOR: StaticNpcDefinition = {
  id: "mage_vendor_mapa1",
  role: "mage",
  displayName: "Mago",
  mapId: START_MAP_ID,
  tileX: 59,
  tileY: 62,
  facing: "down",
  raceId: "elf",
  genderId: "male",
  faceIndex: 4,
  bodyTextureKey: MAGE_VENDOR_ARMOR_TEXTURE_KEY,
  bodyAssetPath: MAGE_VENDOR_ARMOR_PATH,
  faceDropY: 0,
  faceOffsetX: 0,
};

export const MAPA1_GENERAL_MERCHANT: StaticNpcDefinition = {
  id: "general_merchant_mapa1",
  role: "general",
  displayName: "Vendedor General",
  mapId: START_MAP_ID,
  tileX: 60,
  tileY: 39,
  facing: "down",
  raceId: "human",
  genderId: "male",
  faceIndex: 1,
  bodyTextureKey: BANKER_ARMOR_TEXTURE_KEY,
  bodyAssetPath: BANKER_ARMOR_PATH,
};

/** Subastador en Ullathorpe (mapa1). */
export const MAPA1_AUCTIONEER: StaticNpcDefinition = {
  id: "auctioneer_mapa1",
  role: "auctioneer",
  displayName: "Subastador",
  mapId: START_MAP_ID,
  tileX: 41,
  tileY: 75,
  facing: "down",
  raceId: "human",
  genderId: "male",
  faceIndex: 5,
  bodyTextureKey: ALCHEMIST_TUNIC_TEXTURE_KEY,
  bodyAssetPath: ALCHEMIST_TUNIC_PATH,
};

// ======================= VENDEDORES DE TESTING (MAPA 251) =======================

export const TEST_BLACKSMITH: StaticNpcDefinition = {
  id: "test_blacksmith",
  role: "test_blacksmith",
  displayName: "Herrero (Test)",
  mapId: "mapa251",
  tileX: 48,
  tileY: 51,
  facing: "down",
  raceId: "dwarf",
  genderId: "male",
  faceIndex: 1,
  bodyTextureKey: BLACKSMITH_ARMOR_TEXTURE_KEY,
  bodyAssetPath: BLACKSMITH_ARMOR_PATH,
  faceDropY: 2,
  faceOffsetX: 1,
};

export const TEST_ARMORER: StaticNpcDefinition = {
  id: "test_armorer",
  role: "test_armorer",
  displayName: "Armero (Test)",
  mapId: "mapa251",
  tileX: 49,
  tileY: 51,
  facing: "down",
  raceId: "human",
  genderId: "male",
  faceIndex: 3,
  bodyTextureKey: ARMORER_ARMOR_TEXTURE_KEY,
  bodyAssetPath: ARMORER_ARMOR_PATH,
};

export const TEST_TAILOR: StaticNpcDefinition = {
  id: "test_tailor",
  role: "test_tailor",
  displayName: "Sastre (Test)",
  mapId: "mapa251",
  tileX: 50,
  tileY: 51,
  facing: "down",
  raceId: "gnome",
  genderId: "male",
  faceIndex: 9,
  bodyTextureKey: TAILOR_ARMOR_TEXTURE_KEY,
  bodyAssetPath: TAILOR_ARMOR_PATH,
  faceDropY: -2,
  faceOffsetX: 1,
};

export const TEST_ALCHEMIST: StaticNpcDefinition = {
  id: "test_alchemist",
  role: "test_alchemist",
  displayName: "Alquimista (Test)",
  mapId: "mapa251",
  tileX: 51,
  tileY: 51,
  facing: "down",
  raceId: "gnome",
  genderId: "male",
  faceIndex: 0,
  bodyTextureKey: ALCHEMIST_TUNIC_TEXTURE_KEY,
  bodyAssetPath: ALCHEMIST_TUNIC_PATH,
  faceDropY: -2,
  faceOffsetX: 2,
};

export const TEST_MAGE_VENDOR: StaticNpcDefinition = {
  id: "test_mage_vendor",
  role: "test_mage",
  displayName: "Mago (Test)",
  mapId: "mapa251",
  tileX: 52,
  tileY: 51,
  facing: "down",
  raceId: "elf",
  genderId: "male",
  faceIndex: 4,
  bodyTextureKey: MAGE_VENDOR_ARMOR_TEXTURE_KEY,
  bodyAssetPath: MAGE_VENDOR_ARMOR_PATH,
  faceDropY: 0,
  faceOffsetX: 0,
};

export const TEST_GENERAL_MERCHANT: StaticNpcDefinition = {
  id: "test_general_merchant",
  role: "test_general",
  displayName: "General (Test)",
  mapId: "mapa251",
  tileX: 53,
  tileY: 51,
  facing: "down",
  raceId: "human",
  genderId: "male",
  faceIndex: 1,
  bodyTextureKey: BANKER_ARMOR_TEXTURE_KEY,
  bodyAssetPath: BANKER_ARMOR_PATH,
};

export const MAPA20_PRIEST: StaticNpcDefinition = {
  ...MAPA1_PRIEST,
  id: "priest_mapa20",
  mapId: "mapa20",
  tileX: 77,
  tileY: 21,
};

export const MAPA20_BANKER: StaticNpcDefinition = {
  ...MAPA1_BANKER,
  id: "banker_mapa20",
  mapId: "mapa20",
  tileX: 42,
  tileY: 44,
};

export const MAPA20_BLACKSMITH: StaticNpcDefinition = {
  ...MAPA1_BLACKSMITH,
  id: "blacksmith_mapa20",
  mapId: "mapa20",
  tileX: 42,
  tileY: 25,
};

export const MAPA20_ARMORER: StaticNpcDefinition = {
  ...MAPA1_ARMORER,
  id: "armorer_mapa20",
  mapId: "mapa20",
  tileX: 26,
  tileY: 26,
};

export const MAPA20_ALCHEMIST: StaticNpcDefinition = {
  ...MAPA1_ALCHEMIST,
  id: "alchemist_mapa20",
  mapId: "mapa20",
  tileX: 57,
  tileY: 26,
};

export const MAPA20_TAILOR: StaticNpcDefinition = {
  ...MAPA1_TAILOR,
  id: "tailor_mapa20",
  mapId: "mapa20",
  tileX: 26,
  tileY: 44,
};

export const MAPA20_THRANDIL: StaticNpcDefinition = {
  ...MAPA1_BANKER,
  id: "thrandil_mapa20",
  role: "clan_manager",
  displayName: "Thrandil",
  mapId: "mapa20",
  tileX: 39,
  tileY: 44,
  facing: "down",
  nameFill: "#d7c38a",
  nameStroke: "#1b1108",
};

/** NPCs estáticos por mapa. */
const NIX_MAP_ID = "mapa34";
const ARGHAL_MAP_ID = "mapa151";

function createNixNpc(
  template: StaticNpcDefinition,
  id: string,
  tileX: number,
  tileY: number,
): StaticNpcDefinition {
  return {
    ...template,
    id,
    mapId: NIX_MAP_ID,
    tileX,
    tileY,
  };
}

function createArghalNpc(
  template: StaticNpcDefinition,
  id: string,
  tileX: number,
  tileY: number,
): StaticNpcDefinition {
  return {
    ...template,
    id,
    mapId: ARGHAL_MAP_ID,
    tileX,
    tileY,
  };
}

function createBanderbillNpc(
  template: StaticNpcDefinition,
  id: string,
  tileX: number,
  tileY: number,
): StaticNpcDefinition {
  return {
    ...template,
    id,
    mapId: "mapa62",
    tileX,
    tileY,
  };
}

// ======================= NPCs DE BANDERBILL (MAPA 62) =======================

export const MAPA62_ALCHEMIST = createBanderbillNpc(MAPA1_ALCHEMIST, "alchemist_mapa62", 52, 37);
export const MAPA62_TAILOR = createBanderbillNpc(MAPA1_TAILOR, "tailor_mapa62", 60, 37);
export const MAPA62_BLACKSMITH = createBanderbillNpc(MAPA1_BLACKSMITH, "blacksmith_mapa62", 42, 56);
export const MAPA62_MAGE_VENDOR = createBanderbillNpc(MAPA1_MAGE_VENDOR, "mage_vendor_mapa62", 42, 74);
export const MAPA62_AUCTIONEER = createBanderbillNpc(MAPA1_AUCTIONEER, "auctioneer_mapa62", 66, 79);
export const MAPA62_ARMORER = createBanderbillNpc(MAPA1_ARMORER, "armorer_mapa62", 68, 49);

function createLindosNpc(
  template: StaticNpcDefinition,
  id: string,
  tileX: number,
  tileY: number,
): StaticNpcDefinition {
  return {
    ...template,
    id,
    mapId: "mapa64",
    tileX,
    tileY,
  };
}

// ======================= NPCs DE LINDOS (MAPA 64) =======================

export const MAPA64_PRIEST = createLindosNpc(MAPA1_PRIEST, "priest_mapa64", 45, 39);
export const MAPA64_BANKER = createLindosNpc(MAPA1_BANKER, "banker_mapa64", 17, 77);


function createEsperanzaNpc(
  template: StaticNpcDefinition,
  id: string,
  tileX: number,
  tileY: number,
): StaticNpcDefinition {
  return {
    ...template,
    id,
    mapId: "mapa112",
    tileX,
    tileY,
  };
}

// ======================= NPCs DE NUEVA ESPERANZA (MAPA 112) =======================

export const MAPA112_ALCHEMIST = createEsperanzaNpc(MAPA1_ALCHEMIST, "alchemist_mapa112", 47, 72);
export const MAPA112_MAGE_VENDOR = createEsperanzaNpc(MAPA1_MAGE_VENDOR, "mage_vendor_mapa112", 50, 72);
export const MAPA112_ARMORER = createEsperanzaNpc(MAPA1_ARMORER, "armorer_mapa112", 59, 75);
export const MAPA112_BLACKSMITH = createEsperanzaNpc(MAPA1_BLACKSMITH, "blacksmith_mapa112", 65, 65);
export const MAPA112_TAILOR = createEsperanzaNpc(MAPA1_TAILOR, "tailor_mapa112", 29, 70);
export const MAPA112_BANKER = createEsperanzaNpc(MAPA1_BANKER, "banker_mapa112", 14, 67);
export const MAPA112_PRIEST = createEsperanzaNpc(MAPA1_PRIEST, "priest_mapa112", 28, 57);


function createTiamaNpc(
  template: StaticNpcDefinition,
  id: string,
  tileX: number,
  tileY: number,
): StaticNpcDefinition {
  return {
    ...template,
    id,
    mapId: "mapa218",
    tileX,
    tileY,
  };
}

// ======================= NPCs DE TIAMA (MAPA 218) =======================

export const MAPA218_MAGE_VENDOR = createTiamaNpc(MAPA1_MAGE_VENDOR, "mage_vendor_mapa218", 35, 42);
export const MAPA218_ALCHEMIST = createTiamaNpc(MAPA1_ALCHEMIST, "alchemist_mapa218", 25, 42);
export const MAPA218_BLACKSMITH = createTiamaNpc(MAPA1_BLACKSMITH, "blacksmith_mapa218", 13, 42);
export const MAPA218_ARMORER = createTiamaNpc(MAPA1_ARMORER, "armorer_mapa218", 13, 52);


export const MAPA218_TAILOR = createTiamaNpc(MAPA1_TAILOR, "tailor_mapa218", 28, 52);
export const MAPA218_BANKER = createTiamaNpc(MAPA1_BANKER, "banker_mapa218", 65, 67);
export const MAPA218_PRIEST = createTiamaNpc(MAPA1_PRIEST, "priest_mapa218", 33, 67);

// ======================= NPCs DE NIX (MAPA 34) =======================

export const MAPA34_ALCHEMIST = createNixNpc(MAPA1_ALCHEMIST, "alchemist_mapa34", 47, 41);
export const MAPA34_ARMORER = createNixNpc(MAPA1_ARMORER, "armorer_mapa34", 72, 29);
export const MAPA34_TAILOR = createNixNpc(MAPA1_TAILOR, "tailor_mapa34", 62, 29);
export const MAPA34_BLACKSMITH = createNixNpc(MAPA1_BLACKSMITH, "blacksmith_mapa34", 40, 29);
export const MAPA34_AUCTIONEER = createNixNpc(MAPA1_AUCTIONEER, "auctioneer_mapa34", 26, 29);
export const MAPA34_BANKER = createNixNpc(MAPA1_BANKER, "banker_mapa34", 25, 43);
export const MAPA34_MAGE_VENDOR = createNixNpc(MAPA1_MAGE_VENDOR, "mage_vendor_mapa34", 15, 62);
export const MAPA34_PRIEST = createNixNpc(MAPA1_PRIEST, "priest_mapa34", 25, 59);

// ======================= NPCs DE ARGHAL (MAPA 151) =======================

export const MAPA151_ALCHEMIST = createArghalNpc(MAPA1_ALCHEMIST, "alchemist_mapa151", 29, 26);
export const MAPA151_ARMORER = createArghalNpc(MAPA1_ARMORER, "armorer_mapa151", 40, 26);
export const MAPA151_BLACKSMITH = createArghalNpc(MAPA1_BLACKSMITH, "blacksmith_mapa151", 48, 26);
export const MAPA151_AUCTIONEER = createArghalNpc(MAPA1_AUCTIONEER, "auctioneer_mapa151", 58, 19);
export const MAPA151_MAGE_VENDOR = createArghalNpc(MAPA1_MAGE_VENDOR, "mage_vendor_mapa151", 68, 19);
export const MAPA151_TAILOR = createArghalNpc(MAPA1_TAILOR, "tailor_mapa151", 20, 26);
export const MAPA151_BANKER = createArghalNpc(MAPA1_BANKER, "banker_mapa151", 17, 48);
export const MAPA151_PRIEST = createArghalNpc(MAPA1_PRIEST, "priest_mapa151", 16, 63);

export const MAPA60_ELESSAR: StaticNpcDefinition = {
  id: "elessar_mapa60",
  role: "armada_manager",
  displayName: "Elessar",
  mapId: "mapa60",
  tileX: 76,
  tileY: 13,
  facing: "down",
  raceId: "human",
  genderId: "male",
  faceIndex: 5,
  bodyTextureKey: ARMADA_ARMOR_TEXTURE_KEY,
  bodyAssetPath: ARMADA_ARMOR_PATH,
  nameFill: "#00bfff",
  nameStroke: "#000000",
};


function createMapa59Npc(
  template: StaticNpcDefinition,
  id: string,
  tileX: number,
  tileY: number,
): StaticNpcDefinition {
  return {
    ...template,
    id,
    mapId: "mapa59",
    tileX,
    tileY,
  };
}

// ======================= NPCs DE MAPA 59 =======================
export const MAPA59_ALCHEMIST = createMapa59Npc(MAPA1_ALCHEMIST, "alchemist_mapa59", 26, 77);
export const MAPA59_TAILOR = createMapa59Npc(MAPA1_TAILOR, "tailor_mapa59", 49, 78);
export const MAPA59_ARMORER = createMapa59Npc(MAPA1_ARMORER, "armorer_mapa59", 74, 78);
export const MAPA59_BLACKSMITH = createMapa59Npc(MAPA1_BLACKSMITH, "blacksmith_mapa59", 55, 58);
export const MAPA59_MAGE_VENDOR = createMapa59Npc(MAPA1_MAGE_VENDOR, "mage_vendor_mapa59", 87, 59);
export const MAPA59_AUCTIONEER = createMapa59Npc(MAPA1_AUCTIONEER, "auctioneer_mapa59", 88, 43);
export const MAPA59_GENERAL_MERCHANT = createMapa59Npc(MAPA1_GENERAL_MERCHANT, "general_merchant_mapa59", 49, 40);
export const MAPA59_PRIEST = createMapa59Npc(MAPA1_PRIEST, "priest_mapa59", 19, 10);

export const MAPA60_BANKER: StaticNpcDefinition = {
  ...MAPA1_BANKER,
  id: "banker_mapa60",
  mapId: "mapa60",
  tileX: 41,
  tileY: 56,
};

export const STATIC_NPCS: StaticNpcDefinition[] = [
  MAPA59_ALCHEMIST,
  MAPA59_TAILOR,
  MAPA59_ARMORER,
  MAPA59_BLACKSMITH,
  MAPA59_MAGE_VENDOR,
  MAPA59_AUCTIONEER,
  MAPA59_GENERAL_MERCHANT,
  MAPA59_PRIEST,
  MAPA60_BANKER,
    MAPA60_ELESSAR,
    MAPA218_PRIEST,
    MAPA218_BANKER,
    MAPA218_TAILOR,
    MAPA218_ARMORER,
    MAPA218_BLACKSMITH,
    MAPA218_ALCHEMIST,
    MAPA218_MAGE_VENDOR,
    MAPA112_PRIEST,
    MAPA112_BANKER,
    MAPA112_TAILOR,
    MAPA112_BLACKSMITH,
    MAPA112_ARMORER,
    MAPA112_MAGE_VENDOR,
    MAPA112_ALCHEMIST,
  MAPA1_PRIEST,
  MAPA1_BANKER,
  MAPA1_BLACKSMITH,
  MAPA1_ARMORER,
  MAPA1_TAILOR,
  MAPA1_ALCHEMIST,
  MAPA1_MAGE_VENDOR,
  MAPA1_GENERAL_MERCHANT,
  MAPA1_AUCTIONEER,
  TEST_BLACKSMITH,
  TEST_ARMORER,
  TEST_TAILOR,
  TEST_ALCHEMIST,
  TEST_MAGE_VENDOR,
  TEST_GENERAL_MERCHANT,
  MAPA20_PRIEST,
  MAPA20_BANKER,
  MAPA20_BLACKSMITH,
  MAPA20_ARMORER,
  MAPA20_ALCHEMIST,
  MAPA20_TAILOR,
  MAPA20_THRANDIL,
  MAPA62_ALCHEMIST,
  MAPA62_TAILOR,
  MAPA62_BLACKSMITH,
  MAPA62_MAGE_VENDOR,
  MAPA62_AUCTIONEER,
  MAPA62_ARMORER,
  MAPA34_ALCHEMIST,
  MAPA34_ARMORER,
  MAPA34_TAILOR,
  MAPA34_BLACKSMITH,
  MAPA34_AUCTIONEER,
  MAPA34_BANKER,
  MAPA34_MAGE_VENDOR,
  MAPA34_PRIEST,
  MAPA151_ALCHEMIST,
  MAPA151_ARMORER,
  MAPA151_BLACKSMITH,
  MAPA151_AUCTIONEER,
  MAPA151_MAGE_VENDOR,
  MAPA151_TAILOR,
  MAPA151_BANKER,
  MAPA151_PRIEST,
  MAPA64_PRIEST,
  MAPA64_BANKER,
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
