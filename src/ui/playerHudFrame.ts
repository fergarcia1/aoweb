import Phaser from "phaser";

const UI_PATH = "/assets/ao/uiGrafica/";

export const LVL_NAME_EXP_TEXTURE_KEY = "lvl_name_exp";
export const VENTANA_CHAT_TEXTURE_KEY = "ventana_chat";
export const FONDO_BOTONES_TEXTURE_KEY = "fondo_botones";

const LVL_NAME_EXP_FILE = "lvlNameExp.png";
const VENTANA_CHAT_FILE = "ventanaChat.png";
const FONDO_BOTONES_FILE = "fondoBotones.png";

import { resolveAowebSkinFile } from "./aowebSkinVariant";

export { getAowebSkinVariant, type AowebUiSkinVariant } from "./aowebSkinVariant";

export const AOWEB_SKIN_TEXTURE_KEY = "aoweb_skin";
export const AOWEB_SKIN_FALLBACK_SIZE = { w: 1024, h: 768 };

/** Regiones del PNG 128×32 (medidas sobre lvlNameExp.png). */
export const LVL_NAME_EXP_LAYOUT = {
  circleCenterX: 20 / 128,
  circleCenterY: 15 / 32,
  nameX: 40 / 128,
  nameY: 5 / 32,
  nameW: 67 / 128,
  nameH: 12 / 32,
  expBarX: 40 / 128,
  expBarY: 18 / 32,
  expBarW: 67 / 128,
  expBarH: 7 / 32,
  expBarPadX: 1 / 128,
  expBarPadY: 1 / 32,
} as const;

export const LVL_NAME_EXP_FALLBACK_SIZE = { w: 128, h: 32 };
export const VENTANA_CHAT_FALLBACK_SIZE = { w: 174, h: 50 };
export const FONDO_BOTONES_FALLBACK_SIZE = { w: 644, h: 123 };

/** Márgenes internos de ventanaChat (referencia 174×50). */
export const VENTANA_CHAT_LAYOUT = {
  padLeft: 10 / 174,
  padRight: 14 / 174,
  padTop: 5 / 50,
  padBottom: 10 / 50,
} as const;

/** Chat: historial arriba; con Enter, input + 3 tabs en la misma fila. */
export const CHAT_PANEL_LAYOUT = {
  columnGap: 4,
  inputHeight: 22,
  historyGapAboveInput: 6,
  tabGap: 4,
  minTabWidth: 44,
} as const;

export function registerPlayerHudAssets(scene: Phaser.Scene): void {
  scene.load.image(LVL_NAME_EXP_TEXTURE_KEY, UI_PATH + LVL_NAME_EXP_FILE);
  scene.load.image(VENTANA_CHAT_TEXTURE_KEY, UI_PATH + VENTANA_CHAT_FILE);
  scene.load.image(FONDO_BOTONES_TEXTURE_KEY, UI_PATH + FONDO_BOTONES_FILE);
  scene.load.image(AOWEB_SKIN_TEXTURE_KEY, UI_PATH + resolveAowebSkinFile());
}

const UI_GRAFICA_TEXTURE_KEYS = [
  LVL_NAME_EXP_TEXTURE_KEY,
  VENTANA_CHAT_TEXTURE_KEY,
  FONDO_BOTONES_TEXTURE_KEY,
  AOWEB_SKIN_TEXTURE_KEY,
] as const;

export function setupPlayerHudTextures(scene: Phaser.Scene): void {
  for (const key of UI_GRAFICA_TEXTURE_KEYS) {
    const texture = scene.textures.get(key);
    if (!texture || texture.key === "__MISSING") {
      continue;
    }
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
}

export function getTextureNativeSize(
  scene: Phaser.Scene,
  key: string,
  fallback: { w: number; h: number }
): { w: number; h: number } {
  const texture = scene.textures.get(key);
  if (!texture || texture.key === "__MISSING") {
    return { ...fallback };
  }
  const source = texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  return {
    w: source.width || fallback.w,
    h: source.height || fallback.h,
  };
}

export function getLvlNameExpNativeSize(scene: Phaser.Scene): { w: number; h: number } {
  return getTextureNativeSize(scene, LVL_NAME_EXP_TEXTURE_KEY, LVL_NAME_EXP_FALLBACK_SIZE);
}
