import { getAowebSkinVariant } from "./aowebSkinVariant";

export type SkinRect = { x: number; y: number; w: number; h: number };

export type AowebSkinLayout = {
  native: { w: number; h: number };
  inventoryCell: { w: number; h: number; gapX: number; gapY: number };
  /** Desplazamiento de la rejilla dentro de `inventoryPanel` (px nativos). */
  inventoryGridPad?: { top: number; left: number };
  regions: {
    chatHistory: SkinRect;
    chatChannelToggle: SkinRect;
    chatChannelList: SkinRect;
    viewport: SkinRect;
    macroBar: SkinRect;
    name: SkinRect;
    exp: SkinRect;
    levelCircle: SkinRect;
    tabs: SkinRect;
    inventoryPanel: SkinRect;
    hpBar: SkinRect;
    mpBar: SkinRect;
    gold: SkinRect;
    strengthSlot: SkinRect;
    agilitySlot: SkinRect;
    hint: SkinRect;
    minimap: SkinRect;
  };
};

/** Regiones medidas sobre aoweb_skin.png (referencia histórica 1024×768). */
export const AOWEB_SKIN_LAYOUT_LIGHT: AowebSkinLayout = {
  native: { w: 1024, h: 768 },
  inventoryCell: { w: 47, h: 47, gapX: 2, gapY: 3 },
  regions: {
    chatHistory: { x: 36, y: 22, w: 560, h: 88 },
    chatChannelToggle: { x: 606, y: 84, w: 60, h: 26 },
    chatChannelList: { x: 604, y: 110, w: 66, h: 56 },
    viewport: { x: 20, y: 132, w: 661, h: 556 },
    macroBar: { x: 12, y: 700, w: 450, h: 0 },
    name: { x: 720, y: 48, w: 168, h: 24 },
    exp: { x: 721, y: 105, w: 175, h: 16 },
    levelCircle: { x: 925, y: 42, w: 64, h: 64 },
    tabs: { x: 710, y: 168, w: 298, h: 40 },
    inventoryPanel: { x: 706, y: 182, w: 296, h: 232 },
    hpBar: { x: 741, y: 454, w: 111, h: 27 },
    mpBar: { x: 741, y: 502, w: 112, h: 27 },
    gold: { x: 910, y: 479, w: 58, h: 18 },
    strengthSlot: { x: 660, y: 613, w: 114, h: 42 },
    agilitySlot: { x: 660, y: 676, w: 114, h: 42 },
    hint: { x: 712, y: 408, w: 296, h: 72 },
    minimap: { x: 834, y: 564, w: 160, h: 160 },
  },
};

/** Regiones medidas sobre UIAOWEBDark.png (1449×1085). */
export const AOWEB_SKIN_LAYOUT_DARK: AowebSkinLayout = {
  native: { w: 1449, h: 1085 },
  inventoryCell: { w: 57, h: 57, gapX: 3, gapY: 3 },
  inventoryGridPad: { top: 70, left: 0 },
  regions: {
    chatHistory: { x: 28, y: 16, w: 940, h: 188 },
    chatChannelToggle: { x: 982, y: 168, w: 62, h: 28 },
    chatChannelList: { x: 980, y: 198, w: 66, h: 58 },
    /** Alto hasta justo encima de `macroBar` (el hueco oscuro del PNG incluye la hotbar). */
    viewport: { x: 9, y: 235, w: 1033, h: 728 },
    macroBar: { x: 48, y: 968, w: 580, h: 88 },
    name: { x: 1100, y: 52, w: 180, h: 26 },
    exp: { x: 1100, y: 88, w: 185, h: 18 },
    levelCircle: { x: 1325, y: 38, w: 95, h: 95 },
    tabs: { x: 1100, y: 205, w: 302, h: 32 },
    inventoryPanel: { x: 1103, y: 236, w: 296, h: 338 },
    hpBar: { x: 1118, y: 698, w: 148, h: 24 },
    mpBar: { x: 1118, y: 752, w: 148, h: 24 },
    gold: { x: 1282, y: 718, w: 82, h: 22 },
    strengthSlot: { x: 658, y: 898, w: 115, h: 42 },
    agilitySlot: { x: 658, y: 958, w: 115, h: 42 },
    hint: { x: 1105, y: 545, w: 290, h: 58 },
    minimap: { x: 1219, y: 813, w: 200, h: 213 },
  },
};

export function getAowebSkinLayout(): AowebSkinLayout {
  return getAowebSkinVariant() === "dark"
    ? AOWEB_SKIN_LAYOUT_DARK
    : AOWEB_SKIN_LAYOUT_LIGHT;
}

/** @deprecated Usar getAowebSkinLayout().native */
export const AOWEB_SKIN_NATIVE = AOWEB_SKIN_LAYOUT_LIGHT.native;

/** @deprecated Usar getAowebSkinLayout().inventoryCell */
export const AOWEB_SKIN_INVENTORY_CELL = AOWEB_SKIN_LAYOUT_LIGHT.inventoryCell;

/** @deprecated Usar getAowebSkinLayout().regions */
export const AOWEB_SKIN_REGIONS = AOWEB_SKIN_LAYOUT_LIGHT.regions;

export function getAowebSkinRegions() {
  return getAowebSkinLayout().regions;
}

export function getAowebSkinInventoryCell() {
  return getAowebSkinLayout().inventoryCell;
}

function nativeSize() {
  return getAowebSkinLayout().native;
}

export function scaleSkinX(value: number, screenW: number): number {
  return Math.round((value * screenW) / nativeSize().w);
}

export function scaleSkinY(value: number, screenH: number): number {
  return Math.round((value * screenH) / nativeSize().h);
}

export function scaleSkinRect(
  region: SkinRect,
  screenW: number,
  screenH: number
): SkinRect {
  return {
    x: scaleSkinX(region.x, screenW),
    y: scaleSkinY(region.y, screenH),
    w: scaleSkinX(region.w, screenW),
    h: scaleSkinY(region.h, screenH),
  };
}

export function getSkinGameViewport(screenW: number, screenH: number) {
  const rect = scaleSkinRect(getAowebSkinRegions().viewport, screenW, screenH);
  return { x: rect.x, y: rect.y, width: rect.w, height: rect.h };
}

/** Valores derivados del marco para el tamaño de pantalla actual. */
export function getSkinDerivedLayout(screenW: number, screenH: number) {
  const { native, regions } = getAowebSkinLayout();
  const vp = regions.viewport;
  const sidebarWidth = scaleSkinX(native.w - vp.x - vp.w, screenW);
  const chatHeight = scaleSkinY(vp.y, screenH);
  const macroBarHeight = scaleSkinY(native.h - regions.macroBar.y, screenH);
  return { sidebarWidth, chatHeight, macroBarHeight };
}
