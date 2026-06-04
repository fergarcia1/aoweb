/**
 * Deja el viewport y el minimapa del PNG totalmente transparentes en el área útil,
 * conservando el marco decorativo encima del juego / minimapa.
 *
 * Uso: node scripts/ui-skin-punch-viewport.mjs [ruta/UIAOWEBDark.png] [dark|white|red]
 */
import fs from "node:fs";
import path from "node:path";
import { Jimp } from "jimp";

/**
 * Debe coincidir con el layout de cada PNG en aowebSkinLayout.ts
 * (AOWEB_SKIN_LAYOUT_DARK | WHITE | RED).
 */
const LAYOUTS = {
  dark: {
    viewport: { x: 9, y: 235, w: 1033, h: 728 },
    cornerKeep: { top: { w: 168, h: 128 }, bottom: { w: 140, h: 100 } },
    minimap: { x: 1218, y: 788, w: 200, h: 213 },
    minimapContentPad: { top: 36, left: 16, right: 16, bottom: 42 },
    minimapFrameOverlay: true,
  },
  white: {
    viewport: { x: 9, y: 235, w: 1033, h: 728 },
    cornerKeep: { top: { w: 168, h: 128 }, bottom: { w: 140, h: 100 } },
    minimap: { x: 1217, y: 812, w: 200, h: 213 },
    minimapContentPad: { top: 36, left: 16, right: 16, bottom: 42 },
    minimapFrameOverlay: true,
  },
  red: {
    viewport: { x: 9, y: 235, w: 1033, h: 728 },
    cornerKeep: { top: { w: 168, h: 128 }, bottom: { w: 140, h: 100 } },
    minimap: { x: 1217, y: 812, w: 200, h: 213 },
    minimapContentPad: { top: 36, left: 16, right: 16, bottom: 42 },
    minimapFrameOverlay: true,
  },
};

const SKIN_FILES = {
  dark: "UIAOWEBDark.png",
  white: "UIAOWEBWhite.png",
  red: "UIAOWEBRed.png",
};

function cornerRects(layout) {
  const { viewport: VIEWPORT, cornerKeep: CORNER_KEEP } = layout;
  const { x, y, w, h } = VIEWPORT;
  const tw = CORNER_KEEP.top.w;
  const th = CORNER_KEEP.top.h;
  const bw = CORNER_KEEP.bottom.w;
  const bh = CORNER_KEEP.bottom.h;
  return [
    { x, y, w: tw, h: th },
    { x: x + w - tw, y, w: tw, h: th },
    { x, y: y + h - bh, w: bw, h: bh },
    { x: x + w - bw, y: y + h - bh, w: bw, h: bh },
  ];
}

function inViewport(x, y, viewport) {
  return (
    x >= viewport.x &&
    y >= viewport.y &&
    x < viewport.x + viewport.w &&
    y < viewport.y + viewport.h
  );
}

function inCornerKeep(x, y, layout) {
  return cornerRects(layout).some(
    (r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h
  );
}

function minimapInnerRect(layout) {
  const mm = layout.minimap;
  const pad = layout.minimapContentPad ?? { top: 0, left: 0, right: 0, bottom: 0 };
  return {
    x: mm.x + pad.left,
    y: mm.y + pad.top,
    w: mm.w - pad.left - pad.right,
    h: mm.h - pad.top - pad.bottom,
  };
}

function inMinimapInner(x, y, layout) {
  if (!layout.minimapFrameOverlay || !layout.minimap) {
    return false;
  }
  const inner = minimapInnerRect(layout);
  return (
    x >= inner.x &&
    y >= inner.y &&
    x < inner.x + inner.w &&
    y < inner.y + inner.h
  );
}

async function punchSkin(pngPath, layout) {
  const image = await Jimp.read(pngPath);
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const clearViewport =
      inViewport(x, y, layout.viewport) && !inCornerKeep(x, y, layout);
    const clearMinimap = inMinimapInner(x, y, layout);
    if (!clearViewport && !clearMinimap) {
      return;
    }
    this.bitmap.data[idx + 3] = 0;
  });
  await image.write(pngPath);
}

const variantArg = (process.argv[3] ?? "dark").toLowerCase();
const layout = LAYOUTS[variantArg];
if (!layout) {
  console.error(`Variante desconocida: ${variantArg}. Usá dark | white | red`);
  process.exit(1);
}

const pathArg = process.argv[2]?.trim();
const pngPath = path.resolve(
  pathArg ? pathArg : path.join("public/assets/ao/uiGrafica", SKIN_FILES[variantArg])
);
if (!fs.existsSync(pngPath)) {
  console.error(`No existe: ${pngPath}`);
  process.exit(1);
}
await punchSkin(pngPath, layout);
console.log(`Viewport + minimap cleared (${variantArg}): ${pngPath}`);
