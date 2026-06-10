import {
  isLegacyInteriorDoorwayTile,
  isLegacyWallLayerTile,
} from "../../../shared/mapWalkability";
import type { GameMap } from "../../maps/types";
import {
  BUILDING_OCCLUDED_ALPHA,
  SCENERY_OCCLUDER_MIN_HEIGHT_PX,
  TREE_OCCLUDED_ALPHA,
} from "./constants";

export type MapSceneryOcclusionParams = {
  map: GameMap;
  playerTileX: number;
  playerTileY: number;
  playerX: number;
  playerY: number;
  isMapTileWalkable: (tileX: number, tileY: number) => boolean;
  trees: Phaser.GameObjects.Image[];
  buildings: Phaser.GameObjects.Image[];
  onUpdateRoofTransparency: (tileX: number, tileY: number) => void;
  isPlayerUnderRoof: (tileX: number, tileY: number) => boolean;
};

/** Oclusión de árboles/edificios y techo interior (L3 y carteles no se ocultan). */
export function syncMapSceneryOcclusion(params: MapSceneryOcclusionParams): void {
  const {
    map,
    playerTileX,
    playerTileY,
    playerX,
    playerY,
    isMapTileWalkable,
    trees,
    buildings,
    onUpdateRoofTransparency,
    isPlayerUnderRoof,
  } = params;

  onUpdateRoofTransparency(playerTileX, playerTileY);

  const isUnderRoof = isPlayerUnderRoof(playerTileX, playerTileY);

  const applyOcclusion = (sprite: Phaser.GameObjects.Image, occludedAlpha: number) => {
    const wallTileY = sprite.getData("mapTileY") as number | undefined;
    if (wallTileY !== undefined && wallTileY >= playerTileY) {
      sprite.setAlpha(1);
      return;
    }
    const bounds = sprite.getBounds();
    if (bounds.height < SCENERY_OCCLUDER_MIN_HEIGHT_PX) {
      sprite.setAlpha(1);
      return;
    }
    const shrinkX = bounds.width * 0.2;
    const playerBehind =
      playerX >= bounds.left + shrinkX &&
      playerX <= bounds.right - shrinkX &&
      playerY <= bounds.bottom &&
      playerY >= bounds.bottom - bounds.height * 0.8;
    sprite.setAlpha(playerBehind ? occludedAlpha : 1);
  };

  trees.forEach((tree) => applyOcclusion(tree, TREE_OCCLUDED_ALPHA));

  buildings.forEach((building) => {
    if (isUnderRoof) {
      const tx = building.getData("mapTileX") as number | undefined;
      const ty = building.getData("mapTileY") as number | undefined;
      if (tx !== undefined && ty !== undefined) {
        if (isLegacyWallLayerTile(map, tx, ty)) {
          building.setAlpha(1);
          return;
        }
        if (!isMapTileWalkable(tx, ty)) {
          building.setAlpha(1);
          return;
        }
        if (building.getData("isShopSign") === true) {
          building.setAlpha(1);
          return;
        }
        if (building.getData("isLegacyDoor") === true) {
          building.setAlpha(1);
          return;
        }
        const isCeiling = isLegacyInteriorDoorwayTile(map, tx, ty);
        building.setAlpha(isCeiling ? 0 : 1);
      }
      return;
    }
    applyOcclusion(building, BUILDING_OCCLUDED_ALPHA);
  });
}
