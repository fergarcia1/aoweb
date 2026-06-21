import Phaser from "phaser";
import type { GameMap } from "../../../shared/mapTypes";
import {
  collectLegacyObjGrhFileNums,
  type GrhIndexEntry,
} from "../../maps/legacyMapObjects";
import {
  registerArmorSpritesheet,
  textureKeyFromAssetPath,
} from "../../player/playerSprites";
import type { ItemDefinition, ItemId } from "../../../game-data/items/definitions";
import { ITEM_DEFINITIONS } from "../../../game-data/items/definitions";
import type { CharacterRaceId } from "../../data/characters";

export function queueImageIfMissing(
  scene: Phaser.Scene,
  key: string,
  path: string
): boolean {
  if (scene.textures.exists(key)) {
    return false;
  }
  scene.load.image(key, path);
  return true;
}

export function queueSpritesheetIfMissing(
  scene: Phaser.Scene,
  key: string,
  path: string,
  frameWidth: number,
  frameHeight: number
): boolean {
  if (scene.textures.exists(key)) {
    return false;
  }
  scene.load.spritesheet(key, path, { frameWidth, frameHeight });
  return true;
}

export function queueMapVisualAssets(
  scene: Phaser.Scene,
  map: GameMap,
  grhIndex?: Record<string, GrhIndexEntry>
): number {
  let queued = 0;

  const queue = (key: string, path: string) => {
    if (queueImageIfMissing(scene, key, path)) {
      queued += 1;
    }
  };

  for (const overlay of map.groundOverlays ?? []) {
    queue(overlay.textureKey, overlay.texturePath);
  }

  const legacyFileNums = new Set<number>();
  if (map.legacyCsmData?.fileNums) {
    for (const fileNum of map.legacyCsmData.fileNums) {
      legacyFileNums.add(fileNum);
    }
  }
  if (grhIndex) {
    for (const fileNum of collectLegacyObjGrhFileNums(map, grhIndex)) {
      legacyFileNums.add(fileNum);
    }
  }
  for (const fileNum of legacyFileNums) {
    queue(`grh_file_${fileNum}`, `assets/ao/graficos/${fileNum}.png`);
  }

  return queued;
}

export function queueItemDefinitionAssets(
  scene: Phaser.Scene,
  item: ItemDefinition,
  options?: { raceId?: CharacterRaceId; includeAllArmorSheets?: boolean }
): number {
  let queued = 0;

  if (queueImageIfMissing(scene, item.textureKey, item.assetPath)) {
    queued += 1;
  }

  if (item.equippedTextureKey && item.equippedAssetPath) {
    if (item.equippedFrameWidth && item.equippedFrameHeight) {
      if (
        queueSpritesheetIfMissing(
          scene,
          item.equippedTextureKey,
          item.equippedAssetPath,
          item.equippedFrameWidth,
          item.equippedFrameHeight
        )
      ) {
        queued += 1;
      }
    } else if (queueImageIfMissing(scene, item.equippedTextureKey, item.equippedAssetPath)) {
      queued += 1;
    }
  }

  if (item.type !== "armor") {
    return queued;
  }

  const armorPaths = new Set<string>();
  if (options?.includeAllArmorSheets) {
    if (item.spritesheetStdPath) armorPaths.add(item.spritesheetStdPath);
    if (item.spritesheetBajosPath) armorPaths.add(item.spritesheetBajosPath);
    if (item.spritesheetFemalePath) armorPaths.add(item.spritesheetFemalePath);
    if (item.spritesheetPathsByRace) {
      for (const path of Object.values(item.spritesheetPathsByRace)) {
        if (path) armorPaths.add(path);
      }
    }
  } else {
    if (item.spritesheetStdPath) armorPaths.add(item.spritesheetStdPath);
    if (item.spritesheetBajosPath) armorPaths.add(item.spritesheetBajosPath);
    if (item.spritesheetFemalePath) armorPaths.add(item.spritesheetFemalePath);
    const racePath =
      options?.raceId && item.spritesheetPathsByRace
        ? item.spritesheetPathsByRace[options.raceId]
        : undefined;
    if (racePath) armorPaths.add(racePath);
  }

  for (const sheetPath of armorPaths) {
    const key = textureKeyFromAssetPath(sheetPath);
    if (!scene.textures.exists(key)) {
      registerArmorSpritesheet(scene, key, sheetPath);
      queued += 1;
    }
  }

  return queued;
}

export function queueItemAssetsById(
  scene: Phaser.Scene,
  itemId: ItemId,
  options?: { raceId?: CharacterRaceId; includeAllArmorSheets?: boolean }
): number {
  const item = ITEM_DEFINITIONS[itemId];
  if (!item) {
    return 0;
  }
  return queueItemDefinitionAssets(scene, item, options);
}

export function queueEquippableVisualAssets(scene: Phaser.Scene): number {
  let queued = 0;

  for (const item of Object.values(ITEM_DEFINITIONS)) {
    if (!item.equipSlot) {
      continue;
    }

    if (item.equippedTextureKey && item.equippedAssetPath) {
      if (item.equippedFrameWidth && item.equippedFrameHeight) {
        if (
          queueSpritesheetIfMissing(
            scene,
            item.equippedTextureKey,
            item.equippedAssetPath,
            item.equippedFrameWidth,
            item.equippedFrameHeight
          )
        ) {
          queued += 1;
        }
      } else if (queueImageIfMissing(scene, item.equippedTextureKey, item.equippedAssetPath)) {
        queued += 1;
      }
    }

    if (item.type !== "armor") {
      continue;
    }

    const armorPaths = new Set<string>();
    if (item.spritesheetStdPath) armorPaths.add(item.spritesheetStdPath);
    if (item.spritesheetBajosPath) armorPaths.add(item.spritesheetBajosPath);
    if (item.spritesheetFemalePath) armorPaths.add(item.spritesheetFemalePath);
    if (item.spritesheetPathsByRace) {
      for (const path of Object.values(item.spritesheetPathsByRace)) {
        if (path) armorPaths.add(path);
      }
    }

    for (const sheetPath of armorPaths) {
      const key = textureKeyFromAssetPath(sheetPath);
      if (!scene.textures.exists(key)) {
        registerArmorSpritesheet(scene, key, sheetPath);
        queued += 1;
      }
    }
  }

  return queued;
}

export function startQueuedLoads(scene: Phaser.Scene): Promise<void> {
  if (scene.load.totalToLoad === 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
    if (!scene.load.isLoading()) {
      scene.load.start();
    }
  });
}

export function ensureItemAssetsLoaded(
  scene: Phaser.Scene,
  itemId: ItemId,
  options?: { raceId?: CharacterRaceId; onComplete?: () => void }
): void {
  const item = ITEM_DEFINITIONS[itemId];
  if (!item) {
    options?.onComplete?.();
    return;
  }

  const hasTexture = scene.textures.exists(item.textureKey);
  const hasEquipped = !item.equippedTextureKey || scene.textures.exists(item.equippedTextureKey);
  
  let hasArmor = true;
  if (item.type === "armor") {
    const stdPath = item.spritesheetStdPath;
    if (stdPath && !scene.textures.exists(textureKeyFromAssetPath(stdPath))) {
      hasArmor = false;
    }
    const racePath = options?.raceId && item.spritesheetPathsByRace ? item.spritesheetPathsByRace[options.raceId] : undefined;
    if (racePath && !scene.textures.exists(textureKeyFromAssetPath(racePath))) {
      hasArmor = false;
    }
  }

  if (hasTexture && hasEquipped && hasArmor) {
    options?.onComplete?.();
    return;
  }

  const queuedCount = queueItemAssetsById(scene, itemId, { raceId: options?.raceId });
  if (queuedCount === 0) {
    options?.onComplete?.();
    return;
  }

  if (options?.onComplete) {
    scene.load.once(Phaser.Loader.Events.COMPLETE, options.onComplete);
  }

  if (!scene.load.isLoading()) {
    scene.load.start();
  }
}
