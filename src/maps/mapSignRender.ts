import type Phaser from "phaser";

import { TILE_SIZE } from "../config";

import type { GrhIndexEntry } from "./legacyMapObjects";

const PHASER_NEAREST_FILTER = 0 as unknown as Phaser.Textures.FilterMode;



export type MapSignPlacement = {

  tileX: number;

  tileY: number;

  grhIndex: number;

};



export type SignGrhDrawParams = {

  textureKey: string;

  cropX: number;

  cropY: number;

  cropW: number;

  cropH: number;

};



/**

 * Carteles de comercio en Imperium: grhIndex = número del .bmp (21.bmp → 21).

 * Se usa el PNG completo en graficos/{id}.png, no el recorte del atlas en grh_index.

 */

export function resolveShopSignBmpFileNum(grhId: number): number {

  return grhId;

}



export function collectSignGrhFileNums(

  placements: MapSignPlacement[],

  _grhIndex?: Record<string, GrhIndexEntry>

): number[] {

  const nums = new Set<number>();

  for (const sign of placements) {

    nums.add(resolveShopSignBmpFileNum(sign.grhIndex));

  }

  return [...nums];

}



export function resolveShopSignDrawParams(

  grhId: number,

  textures: Phaser.Textures.TextureManager

): SignGrhDrawParams | null {

  const fileNum = resolveShopSignBmpFileNum(grhId);

  const textureKey = `grh_file_${fileNum}`;

  if (!textures.exists(textureKey)) {

    return null;

  }



  const source = textures.get(textureKey).getSourceImage() as

    | HTMLImageElement

    | HTMLCanvasElement;

  const w = "width" in source ? source.width : textures.get(textureKey).get(0).width;

  const h = "height" in source ? source.height : textures.get(textureKey).get(0).height;

  return {

    textureKey,

    cropX: 0,

    cropY: 0,

    cropW: w,

    cropH: h,

  };

}



export function spawnMapSignAtTile(

  scene: Phaser.Scene,

  placement: MapSignPlacement,

  _grhIndex: Record<string, GrhIndexEntry>,

  depthFromFeetY: (feetY: number) => number

): Phaser.GameObjects.Image | null {

  const draw = resolveShopSignDrawParams(placement.grhIndex, scene.textures);

  if (!draw) {

    return null;

  }



  const px = placement.tileX * TILE_SIZE;

  const py = placement.tileY * TILE_SIZE;

  const tileFeetY = py + TILE_SIZE;



  const img = scene.add

    .image(

      px + TILE_SIZE / 2 - draw.cropW / 2,

      py + TILE_SIZE - draw.cropH,

      draw.textureKey

    )

    .setOrigin(0, 0)

    .setCrop(draw.cropX, draw.cropY, draw.cropW, draw.cropH);



  img.setDepth(depthFromFeetY(tileFeetY));

  img.setData("grhPixelHeight", draw.cropH);

  img.setData("mapTileX", placement.tileX);

  img.setData("mapTileY", placement.tileY);

  img.setData("isShopSign", true);

  scene.textures.get(draw.textureKey).setFilter(PHASER_NEAREST_FILTER);

  return img;

}


