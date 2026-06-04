/**
 * Decodifica BMP de Argentum / Imperium con paleta correcta.
 * bmp-js deja R=0 en píxeles indexados → tono azulado; Jimp aplica la paleta bien.
 */
import { Jimp } from "jimp";

/**
 * @param {string} bmpPath
 * @returns {Promise<{ width: number; height: number; data: Buffer }>}
 */
export async function decodeAoBmpFile(bmpPath) {
  const image = await Jimp.read(bmpPath);
  const { width, height, data } = image.bitmap;
  return { width, height, data };
}
