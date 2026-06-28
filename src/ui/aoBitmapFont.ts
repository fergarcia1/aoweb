import Phaser from "phaser";

/** Fuente bitmap AO (font2) — atlas + XML generado desde font2.dat de Imperium. */
export const AO_FONT2_BITMAP_KEY = "ao-font2";

export const AO_FONT2_ASSET = {
  png: "assets/ao/fonts/font2.png",
  xml: "assets/ao/fonts/font2.xml",
} as const;

/** Tinte dorado para palabras mágicas (glyphs blancos en el atlas). */
export const AO_FONT2_MAGIC_WORDS_TINT = 0xffe08a;

/** Escala del atlas (~46px de alto); 0.275 ≈ mitad del tamaño anterior (0.55). */
export const AO_FONT2_MAGIC_WORDS_SCALE = 0.37;

const BLACK_THRESHOLD = 18;

let aoFont2BackgroundStripped = false;

/**
 * El atlas viene con fondo negro opaco; Phaser necesita alpha en el PNG.
 */
export function applyAoFont2TransparentBackground(scene: Phaser.Scene): void {
  if (aoFont2BackgroundStripped) {
    return;
  }

  const texture = scene.textures.get(AO_FONT2_BITMAP_KEY);
  if (!texture) {
    return;
  }

  const source = texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const width = source.width;
  const height = source.height;
  if (!width || !height) {
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return;
  }

  ctx.drawImage(source as CanvasImageSource, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    if (r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD) {
      pixels[i + 3] = 0;
    } else if (pixels[i + 3] === 0) {
      pixels[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  scene.textures.remove(AO_FONT2_BITMAP_KEY);
  const updated = scene.textures.addCanvas(AO_FONT2_BITMAP_KEY, canvas);
  if (!updated) {
    return;
  }
  updated.setFilter(Phaser.Textures.FilterMode.LINEAR);
  aoFont2BackgroundStripped = true;
}

export function preloadAoFont2(scene: Phaser.Scene): void {
  if (scene.cache.bitmapFont.exists(AO_FONT2_BITMAP_KEY)) {
    return;
  }

  const onBitmapFontLoaded = (_key: string, type: string) => {
    if (type !== "bitmapfont" || _key !== AO_FONT2_BITMAP_KEY) {
      return;
    }
    applyAoFont2TransparentBackground(scene);
  };

  scene.load.on(Phaser.Loader.Events.FILE_COMPLETE, onBitmapFontLoaded);
  scene.load.bitmapFont(AO_FONT2_BITMAP_KEY, AO_FONT2_ASSET.png, AO_FONT2_ASSET.xml);
}

/** Llamar al inicio de create() por si el loader ya terminó. */
export function ensureAoFont2TransparentBackground(scene: Phaser.Scene): void {
  applyAoFont2TransparentBackground(scene);
}

export function isAoFont2Ready(scene: Phaser.Scene): boolean {
  return scene.cache.bitmapFont.exists(AO_FONT2_BITMAP_KEY);
}
