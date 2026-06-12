import { buildStarterLoadout, getStarterLearnedSpellIds } from "../../../game-data/starterLoadout";

import {

  hasMobVisualModel,

  MAP_MOB_SPAWNS_BY_MAP_ID,

  MOB_DEFINITIONS,

  type MobModelId,

} from "../../../game-data/mobs";

import { DEFAULT_MAP_ID } from "../../../game-data/constants";

import { getScopedPreloadMapIds } from "../../../shared/maps";

import { loadCharacterProgress } from "../../game/characterProgressStorage";

import type { CharacterRaceId } from "../../data/characters";

import type { CharacterClassId } from "../../../game-data/items/catalog";

import type { ItemId } from "../../items/itemDefinitions";

import {

  getImperiumNpcCatalogEntry,

  isImperiumNpcVisualReady,

} from "../../../game-data/imperium/npcCatalog";



export type GameScenePreloadContext = {

  mapId: string;

  /** Mapa actual + adyacentes (portales y bordes). */

  preloadMapIds: Set<string>;

  raceId: CharacterRaceId;

  itemIds: ReadonlySet<ItemId>;

  spellIds: ReadonlySet<number>;

  mobModelIds: ReadonlySet<MobModelId>;

  imperiumBodyIds: ReadonlySet<number>;

};



export function resolveGameScenePreloadContext(input: {

  characterId: string | null;

  homeMapId: string;

  classId: CharacterClassId;

  raceId: CharacterRaceId;

}): GameScenePreloadContext {

  const saved = input.characterId ? loadCharacterProgress(input.characterId) : null;

  const mapId = saved?.mapId ?? input.homeMapId ?? DEFAULT_MAP_ID;

  const preloadMapIds = new Set(getScopedPreloadMapIds(mapId));



  const itemIds = new Set<ItemId>();

  const spellIds = new Set<number>();



  if (saved) {

    for (const slot of saved.inventory) {

      if (slot?.itemId) {

        itemIds.add(slot.itemId);

      }

    }

    for (const itemId of Object.values(saved.equipment)) {

      if (itemId) {

        itemIds.add(itemId);

      }

    }

    for (const spellId of saved.learnedSpellIds) {

      spellIds.add(spellId);

    }

    for (const macro of saved.macroBindings) {

      if (macro.spellId != null) {

        spellIds.add(macro.spellId);

      }

      if (macro.itemId) {

        itemIds.add(macro.itemId);

      }

    }

    const worldDrops = saved.worldItemsByMap?.[mapId] ?? [];

    for (const drop of worldDrops) {

      if (drop.itemId !== "gold") {

        itemIds.add(drop.itemId);

      }

    }

  } else {

    const starter = buildStarterLoadout(input.classId);

    itemIds.add(starter.weaponItemId as ItemId);

    itemIds.add(starter.armorItemId as ItemId);

    for (const slot of starter.inventorySlots) {

      itemIds.add(slot.itemId as ItemId);

    }

    for (const spellId of getStarterLearnedSpellIds(input.classId)) {

      spellIds.add(spellId);

    }

  }



  return {

    mapId,

    preloadMapIds,

    raceId: input.raceId,

    itemIds,

    spellIds,

    mobModelIds: collectMobModelIdsForMaps(preloadMapIds),

    imperiumBodyIds: collectImperiumBodyIdsForMaps(preloadMapIds),

  };

}



function collectMobModelIdsForMaps(mapIds: Iterable<string>): ReadonlySet<MobModelId> {

  const models = new Set<MobModelId>();

  for (const mapId of mapIds) {

    const entries = MAP_MOB_SPAWNS_BY_MAP_ID.get(mapId) ?? [];

    for (const entry of entries) {

      const def = MOB_DEFINITIONS[entry.mobId];

      if (def && hasMobVisualModel(def.modelId)) {

        models.add(def.modelId);

      }

    }

    if (mapId === DEFAULT_MAP_ID) {

      models.add("training_dummy");

    }

  }

  return models;

}



function collectImperiumBodyIdsForMaps(mapIds: Iterable<string>): ReadonlySet<number> {

  const bodyIds = new Set<number>();

  for (const mapId of mapIds) {

    const entries = MAP_MOB_SPAWNS_BY_MAP_ID.get(mapId) ?? [];

    for (const entry of entries) {

      const def = MOB_DEFINITIONS[entry.mobId];

      if (!def?.npcId || hasMobVisualModel(def.modelId)) {

        continue;

      }

      const catalog = getImperiumNpcCatalogEntry(def.npcId);

      if (catalog && isImperiumNpcVisualReady(catalog) && catalog.body > 0) {

        bodyIds.add(catalog.body);

      }

    }

  }

  return bodyIds;

}


