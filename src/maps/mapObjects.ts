import Phaser from "phaser";
import {
  getMapObjectDefinition,
  MAP_OBJECT_DEFINITIONS,
  type MapObjectId,
} from "./mapObjectDefinitions";
import type { MapObjectPlacement } from "./types";
import { TILE_SIZE } from "../config";

export function registerMapObjectAssets(scene: Phaser.Scene): void {
  Object.values(MAP_OBJECT_DEFINITIONS).forEach((def) => {
    scene.load.image(def.textureKey, def.texturePath);
  });
}

export function mapObjectFeetWorld(placement: MapObjectPlacement) {
  return {
    x: placement.tileX * TILE_SIZE + TILE_SIZE / 2,
    y: (placement.tileY + 1) * TILE_SIZE,
  };
}

export function mapObjectFootprintTiles(
  placement: MapObjectPlacement
): Array<{ x: number; y: number }> {
  const def = getMapObjectDefinition(placement.objectId);
  const left = placement.tileX - Math.floor(def.footprintW / 2);
  const top = placement.tileY - def.footprintH + 1;
  const tiles: Array<{ x: number; y: number }> = [];

  for (let dy = 0; dy < def.footprintH; dy += 1) {
    for (let dx = 0; dx < def.footprintW; dx += 1) {
      tiles.push({ x: left + dx, y: top + dy });
    }
  }
  return tiles;
}

export function isTileBlockedByMapObject(
  objects: MapObjectPlacement[] | undefined,
  tileX: number,
  tileY: number
): boolean {
  if (!objects?.length) {
    return false;
  }
  return objects.some((placement) =>
    mapObjectFootprintTiles(placement).some((t) => t.x === tileX && t.y === tileY)
  );
}

export function spawnMapObjectImage(
  scene: Phaser.Scene,
  placement: MapObjectPlacement,
  depthFromFeetY: (feetY: number) => number
): Phaser.GameObjects.Image {
  const def = getMapObjectDefinition(placement.objectId);
  const feet = mapObjectFeetWorld(placement);
  const image = scene.add
    .image(feet.x, feet.y, def.textureKey)
    .setOrigin(0.5, 1)
    .setDepth(depthFromFeetY(feet.y));

  const texture = scene.textures.get(def.textureKey);
  if (texture.key !== "__MISSING") {
    texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }

  return image;
}

export type { MapObjectId };
