import Phaser from "phaser";
import { getAdjacentMapIds, getMap } from "../../maps";
import { loadMobVisualAssetsForModels } from "../../game/mobs/mobVisualRuntime";
import { loadImperiumNpcVisualAssetsForBodyIds } from "../../game/npcs/loadImperiumNpcVisualAssets";
import type { GrhIndexEntry } from "../../maps/legacyMapObjects";
import type { GameScenePreloadContext } from "./gameScenePreloadContext";
import {
  queueMapVisualAssets,
} from "./gameSceneAssetQueue";
import { registerMobWalkAnimations } from "../../game/mobs/registerMobWalkAnimations";
import {
  collectImperiumBodyIdsForMaps,
  collectMobModelIdsForMaps,
} from "./gameScenePreloadContext";

const BACKGROUND_PRELOAD_DELAY_MS = 800;
const ADJACENT_PRELOAD_DELAY_MS = 120;

type ScenePreloadState = {
  pendingMapIds: Set<string>;
  loadedMapIds: Set<string>;
  waitingForLoader: boolean;
  scheduled: boolean;
};

const scenePreloadStates = new WeakMap<Phaser.Scene, ScenePreloadState>();

function getScenePreloadState(scene: Phaser.Scene): ScenePreloadState {
  let state = scenePreloadStates.get(scene);
  if (!state) {
    state = {
      pendingMapIds: new Set(),
      loadedMapIds: new Set(),
      waitingForLoader: false,
      scheduled: false,
    };
    scenePreloadStates.set(scene, state);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scenePreloadStates.delete(scene);
    });
  }
  return state;
}

function getCachedGrhIndex(scene: Phaser.Scene): Record<string, GrhIndexEntry> | null {
  const grhIndex = scene.cache.json.get("grh_index") as Record<string, GrhIndexEntry> | undefined;
  return grhIndex ?? null;
}

/** Precarga en segundo plano los mapas vecinos al actual (tras un cambio de mapa). */
export function queueAdjacentMapPreload(scene: Phaser.Scene, mapId: string): void {
  queuePredictiveMapPreload(scene, getAdjacentMapIds(mapId));
}

function queuePredictiveMapPreload(scene: Phaser.Scene, mapIds: Iterable<string>): void {
  const state = getScenePreloadState(scene);
  for (const id of mapIds) {
    if (!state.loadedMapIds.has(id)) {
      state.pendingMapIds.add(id);
    }
  }

  schedulePredictivePreload(scene, state);
}

function schedulePredictivePreload(scene: Phaser.Scene, state: ScenePreloadState): void {
  if (state.scheduled) {
    return;
  }
  state.scheduled = true;
  scene.time.delayedCall(ADJACENT_PRELOAD_DELAY_MS, () => {
    state.scheduled = false;
    processPredictivePreload(scene, state);
  });
}

function waitForActiveLoader(scene: Phaser.Scene, state: ScenePreloadState): void {
  if (state.waitingForLoader) {
    return;
  }
  state.waitingForLoader = true;
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    state.waitingForLoader = false;
    schedulePredictivePreload(scene, state);
  });
}

function processPredictivePreload(scene: Phaser.Scene, state: ScenePreloadState): void {
  if (state.pendingMapIds.size === 0) {
    return;
  }
  if (scene.load.isLoading()) {
    waitForActiveLoader(scene, state);
    return;
  }

  const grhIndex = getCachedGrhIndex(scene);
  if (!grhIndex) {
    console.warn("grh_index.json no cargado para precarga de mapas vecinos.");
    return;
  }

  const batchMapIds = Array.from(state.pendingMapIds);
  state.pendingMapIds.clear();

  let queued = 0;
  for (const pendingMapId of batchMapIds) {
    queued += queueMapVisualAssets(scene, getMap(pendingMapId), grhIndex);
  }
  queued += queueMapEntityVisualAssets(scene, batchMapIds);

  if (queued === 0) {
    for (const mapId of batchMapIds) {
      state.loadedMapIds.add(mapId);
    }
    return;
  }

  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    registerMobWalkAnimations(scene);
    for (const mapId of batchMapIds) {
      state.loadedMapIds.add(mapId);
    }
    if (state.pendingMapIds.size > 0) {
      schedulePredictivePreload(scene, state);
    }
  });
  scene.load.start();
}

export function queueMapEntityVisualAssets(
  scene: Phaser.Scene,
  mapIds: Iterable<string>
): number {
  const scopedIds = Array.from(mapIds);
  if (scopedIds.length === 0) {
    return 0;
  }
  return (
    loadMobVisualAssetsForModels(scene, collectMobModelIdsForMaps(scopedIds)) +
    loadImperiumNpcVisualAssetsForBodyIds(scene, collectImperiumBodyIdsForMaps(scopedIds))
  );
}

export function ensureMapEntityVisualAssetsLoaded(
  scene: Phaser.Scene,
  mapIds: Iterable<string>
): Promise<void> {
  const queued = queueMapEntityVisualAssets(scene, mapIds);
  if (queued === 0) {
    registerMobWalkAnimations(scene);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      registerMobWalkAnimations(scene);
      resolve();
    });
    if (!scene.load.isLoading()) {
      scene.load.start();
    }
  });
}

/** Resto de assets en segundo plano tras entrar al mundo. */
export function scheduleGameSceneBackgroundPreload(
  scene: Phaser.Scene,
  loaded: GameScenePreloadContext,
  onBatchComplete?: () => void
): void {
  scene.time.delayedCall(BACKGROUND_PRELOAD_DELAY_MS, () => {
    const queued = queueRemainingGameAssets(scene, loaded);
    if (queued === 0) {
      onBatchComplete?.();
      return;
    }

    scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      registerMobWalkAnimations(scene);
      onBatchComplete?.();
    });
    if (!scene.load.isLoading()) {
      scene.load.start();
    }
  });
}

function queueRemainingGameAssets(
  scene: Phaser.Scene,
  loaded: GameScenePreloadContext
): number {
  const grhIndex = getCachedGrhIndex(scene);
  let queued = 0;

  for (const mapId of loaded.preloadMapIds) {
    queued += queueMapVisualAssets(scene, getMap(mapId), grhIndex ?? undefined);
  }

  queued += loadMobVisualAssetsForModels(scene, loaded.mobModelIds);
  queued += loadImperiumNpcVisualAssetsForBodyIds(scene, loaded.imperiumBodyIds);
  queued += queueMapEntityVisualAssets(scene, loaded.preloadMapIds);
  return queued;
}
