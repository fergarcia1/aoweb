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

const BACKGROUND_PRELOAD_DELAY_MS = 800;

function getCachedGrhIndex(scene: Phaser.Scene): Record<string, GrhIndexEntry> | null {
  const grhIndex = scene.cache.json.get("grh_index") as Record<string, GrhIndexEntry> | undefined;
  return grhIndex ?? null;
}

/** Precarga en segundo plano los mapas vecinos al actual (tras un cambio de mapa). */
export function queueAdjacentMapPreload(scene: Phaser.Scene, mapId: string): void {
  const grhIndex = getCachedGrhIndex(scene);
  if (!grhIndex) {
    console.warn("grh_index.json no cargado para precarga de mapas vecinos.");
    return;
  }
  let queued = 0;

  for (const adjacentId of getAdjacentMapIds(mapId)) {
    queued += queueMapVisualAssets(scene, getMap(adjacentId), grhIndex);
  }

  if (queued === 0 || scene.load.isLoading()) {
    return;
  }

  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    registerMobWalkAnimations(scene);
  });
  scene.load.start();
}

/** Resto de assets en segundo plano tras entrar al mundo. */
export function scheduleGameSceneBackgroundPreload(
  scene: Phaser.Scene,
  loaded: GameScenePreloadContext,
  onBatchComplete?: () => void
): void {
  scene.time.delayedCall(BACKGROUND_PRELOAD_DELAY_MS, () => {
    queueRemainingGameAssets(scene, loaded);
    if (scene.load.totalToLoad === 0) {
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
): void {
  const grhIndex = getCachedGrhIndex(scene);

  for (const mapId of loaded.preloadMapIds) {
    queueMapVisualAssets(scene, getMap(mapId), grhIndex ?? undefined);
  }

  loadMobVisualAssetsForModels(scene, loaded.mobModelIds);
  loadImperiumNpcVisualAssetsForBodyIds(scene, loaded.imperiumBodyIds);
}
