/**

 * Compone STD1 de 1105.png en un spritesheet para Phaser.

 *

 * Filas en 1105.png (orden confirmado):

 *   0 = S, 1 = W, 2 = A, 3 = D

 * Piernas de S en fila 4 (mismo índice de frame; frame 4 usa fila 5 col 4).

 *

 * node export-player-std1.mjs

 */



import fs from "fs";

import path from "path";

import { PNG } from "pngjs";



const SRC = "C:/Users/imaga/Desktop/recursosAO/Recursos/Graficos_extraido/1105.png";

const OUT =

  "C:/Users/imaga/Desktop/AOWEB/public/assets/ao/player_std1.png";



const TILE = 32;

const COLS = 5;

const ROWS = 4;



/** Salida: fila 0=S, 1=W, 2=A, 3=D (igual que 1105 filas 0–3). */

const DIRS = [

  {

    name: "down",

    bodyRow: 0,

    legRow: 4,

    bodyOffsetY: 0,

    frames: 5,

    legFrame(frame) {

      if (frame === 4) return { row: 5, col: 4 };

      return { row: 4, col: frame };

    },

  },

  { name: "up", bodyRow: 1, frames: 5 },

  { name: "left", bodyRow: 2, frames: 5 },

  { name: "right", bodyRow: 3, frames: 4 },

];



function getPixel(png, x, y) {

  if (x < 0 || y < 0 || x >= png.width || y >= png.height) {

    return [0, 0, 0, 0];

  }

  const i = (y * png.width + x) * 4;

  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];

}



function setPixel(out, x, y, r, g, b, a) {

  if (x < 0 || y < 0 || x >= TILE || y >= TILE || a < 20) return;

  const i = (y * TILE + x) * 4;

  out[i] = r;

  out[i + 1] = g;

  out[i + 2] = b;

  out[i + 3] = a;

}



function blitTile(src, srcX, srcY, dest, destOffsetY) {

  for (let y = 0; y < TILE; y++) {

    for (let x = 0; x < TILE; x++) {

      const [r, g, b, a] = getPixel(src, srcX + x, srcY + y);

      setPixel(dest, x, y + destOffsetY, r, g, b, a);

    }

  }

}



const sheet = PNG.sync.read(fs.readFileSync(SRC));

const outPng = new PNG({ width: COLS * TILE, height: ROWS * TILE });



for (let outRow = 0; outRow < DIRS.length; outRow++) {

  const dir = DIRS[outRow];

  for (let frame = 0; frame < dir.frames; frame++) {

    const tile = Buffer.alloc(TILE * TILE * 4);



    if (dir.legRow !== undefined || dir.legFrame) {

      const leg = dir.legFrame

        ? dir.legFrame(frame)

        : { row: dir.legRow, col: frame };

      blitTile(sheet, leg.col * TILE, leg.row * TILE, tile, 0);

    }



    blitTile(

      sheet,

      frame * TILE,

      dir.bodyRow * TILE,

      tile,

      dir.bodyOffsetY ?? 0

    );



    const ox = frame * TILE;

    const oy = outRow * TILE;

    for (let y = 0; y < TILE; y++) {

      for (let x = 0; x < TILE; x++) {

        const si = (y * TILE + x) * 4;

        const di = ((oy + y) * outPng.width + (ox + x)) * 4;

        outPng.data[di] = tile[si];

        outPng.data[di + 1] = tile[si + 1];

        outPng.data[di + 2] = tile[si + 2];

        outPng.data[di + 3] = tile[si + 3];

      }

    }

  }

}



fs.mkdirSync(path.dirname(OUT), { recursive: true });

fs.writeFileSync(OUT, PNG.sync.write(outPng));

console.log("OK ->", OUT);


