import {
  getAowebSkinVariant,
  type AowebUiSkinVariant,
} from "./aowebSkinVariant";

export type SkinRect = { x: number; y: number; w: number; h: number };

export type MacroSlotLayout = { cx: number; cy: number; size: number };

/** Zonas (relativas a `regions.viewport`) que no se perforan al limpiar el PNG. */
export type ViewportCornerKeep = {
  w: number;
  h: number;
};

export type AowebSkinLayout = {
  native: { w: number; h: number };
  inventoryCell: { w: number; h: number; gapX: number; gapY: number };
  /** Desplazamiento de la rejilla dentro de `inventoryPanel` (px nativos). */
  inventoryGridPad?: { top: number; left: number };
  /** Área útil del minimapa dentro de `regions.minimap` (px nativos). */
  minimapContentPad?: { top: number; left: number; right: number; bottom: number };
  /**
   * Minimapa detrás del marco PNG (centro transparente, como el viewport).
   * Requiere `npm run skin:viewport-alpha` en el PNG.
   */
  minimapFrameOverlay?: boolean;
  /** Altura reservada abajo para nombre/coords al centrar tiles (px nativos). */
  minimapLabelBand?: number;
  /** Margen inferior del texto al borde útil del minimapa (px nativos). */
  minimapLabelPadBottom?: number;
  /**
   * Marco encima del mundo: viewport del PNG transparente, adornos de esquina opacos.
   * Sin máscara en runtime (`npm run skin:viewport-alpha` en el PNG).
   */
  viewportFrameOverlay?: boolean;
  /** Tamaño de las esquinas decorativas a conservar al perforar el viewport (px nativos). */
  viewportCornerKeep?: {
    top: ViewportCornerKeep;
    bottom: ViewportCornerKeep;
  };
  /** Centros de cada hotbar (la skin no tiene slots equiespaciados). */
  macroSlots?: {
    centersX: readonly number[];
    centerY: number;
    slotSize: number;
  };
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
    macroBar: { x: 12, y: 700, w: 480, h: 50 },
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
  minimapContentPad: { top: 36, left: 16, right: 16, bottom: 42 },
  minimapFrameOverlay: true,
  minimapLabelBand: 36,
  minimapLabelPadBottom: 6,
  regions: {
    chatHistory: { x: 28, y: 16, w: 940, h: 188 },
    chatChannelToggle: { x: 982, y: 168, w: 62, h: 28 },
    chatChannelList: { x: 980, y: 198, w: 66, h: 58 },
    /** Hueco del mapa; con overlay el marco decorativo queda encima del mundo. */
    viewport: { x: 9, y: 235, w: 1033, h: 728 },
    macroBar: { x: 30, y: 1000, w: 800, h: 60 },
    name: { x: 1100, y: 52, w: 180, h: 26 },
    exp: { x: 1100, y: 88, w: 185, h: 18 },
    levelCircle: { x: 1325, y: 38, w: 95, h: 95 },
    tabs: { x: 1100, y: 205, w: 302, h: 32 },
    inventoryPanel: { x: 1103, y: 236, w: 296, h: 338 },
    hpBar: { x: 1118, y: 685, w: 148, h: 22 },
    mpBar: { x: 1118, y: 737, w: 148, h: 22 },
    gold: { x: 1282, y: 704, w: 82, h: 22 },
    strengthSlot: { x: 658, y: 885, w: 115, h: 42 },
    agilitySlot: { x: 658, y: 946, w: 115, h: 42 },
    hint: { x: 1105, y: 545, w: 290, h: 58 },
    minimap: { x: 1218, y: 788, w: 200, h: 213 },
  },
  macroSlots: {
    centersX: [71, 146, 222, 322, 402, 487, 571, 656, 743, 815],
    centerY: 1000,
    slotSize: 57,
  },
  viewportFrameOverlay: true,
  viewportCornerKeep: {
    top: { w: 168, h: 128 },
    bottom: { w: 140, h: 100 },
  },
};

/**
 * Regiones medidas sobre UIAOWEBWhite.png (1449×1085).
 * Parte copiada de dark; ajustá cada región al medir el PNG blanco.
 */
export const AOWEB_SKIN_LAYOUT_WHITE: AowebSkinLayout = {
  native: { w: 1449, h: 1085 },
  inventoryCell: { w: 57, h: 57, gapX: 3, gapY: 3 },
  inventoryGridPad: { top: 70, left: 0 },
  minimapFrameOverlay: true,
  regions: {
    chatHistory: { x: 45, y: 32, w: 940, h: 188 },
    chatChannelToggle: { x: 965, y: 180, w: 62, h: 28 },
    chatChannelList: { x: 980, y: 198, w: 66, h: 58 },
    /** Hueco del mapa; con overlay el marco decorativo queda encima del mundo. */
    viewport: { x: 9, y: 235, w: 1033, h: 728 },
    macroBar: { x: 30, y: 900, w: 800, h: 30 },
    name: { x: 1100, y: 50, w: 180, h: 26 },
    exp: { x: 1100, y: 88, w: 189, h: 18 },
    levelCircle: { x: 1326, y: 38, w: 95, h: 95 },
    tabs: { x: 1100, y: 205, w: 302, h: 32 },
    inventoryPanel: { x: 1103, y: 236, w: 296, h: 338 },
    hpBar: { x: 1120, y: 698, w: 148, h: 26 },
    mpBar: { x: 1120, y: 748, w: 148, h: 26 },
    gold: { x: 1282, y: 720, w: 82, h: 22 },
    strengthSlot: { x: 658, y: 900, w: 115, h: 42 },
    agilitySlot: { x: 658, y: 960, w: 115, h: 42 },
    hint: { x: 1105, y: 545, w: 290, h: 58 },
    minimap: { x: 1217, y: 812, w: 200, h: 213 },
  },
  macroSlots: {
    centersX: [71, 146, 222, 322, 402, 487, 571, 656, 743, 815],
    centerY: 1000,
    slotSize: 57,
  },
  viewportFrameOverlay: true,
  viewportCornerKeep: {
    top: { w: 168, h: 128 },
    bottom: { w: 140, h: 100 },
  },
};

/**
 * Regiones medidas sobre UIAOWEBRed.png (1449×1085).
 * Parte copiada de dark; ajustá cada región al medir el PNG rojo.
 */
export const AOWEB_SKIN_LAYOUT_RED: AowebSkinLayout = {
  native: { w: 1449, h: 1085 },
  inventoryCell: { w: 57, h: 57, gapX: 3, gapY: 3 },
  inventoryGridPad: { top: 70, left: 0 },
  minimapContentPad: { top: 36, left: 16, right: 16, bottom: 42 },
  minimapFrameOverlay: true,
  minimapLabelBand: 36,
  minimapLabelPadBottom: 6,
  regions: {
    chatHistory: { x: 45, y: 32, w: 940, h: 188 },
    chatChannelToggle: { x: 965, y: 180, w: 62, h: 28 },
    chatChannelList: { x: 980, y: 198, w: 66, h: 58 },
    /** Hueco del mapa; con overlay el marco decorativo queda encima del mundo. */
    viewport: { x: 9, y: 235, w: 1033, h: 728 },
    macroBar: { x: 30, y: 900, w: 800, h: 30 },
    name: { x: 1100, y: 50, w: 180, h: 26 },
    exp: { x: 1100, y: 85, w: 189, h: 24 },
    levelCircle: { x: 1326, y: 38, w: 95, h: 95 },
    tabs: { x: 1100, y: 205, w: 302, h: 32 },
    inventoryPanel: { x: 1103, y: 236, w: 296, h: 338 },
    hpBar: { x: 1120, y: 698, w: 148, h: 26 },
    mpBar: { x: 1120, y: 748, w: 148, h: 26 },
    gold: { x: 1282, y: 720, w: 82, h: 22 },
    strengthSlot: { x: 658, y: 900, w: 115, h: 42 },
    agilitySlot: { x: 658, y: 960, w: 115, h: 42 },
    hint: { x: 1105, y: 545, w: 290, h: 58 },
    minimap: { x: 1217, y: 812, w: 200, h: 213 },
  },
  macroSlots: {
    centersX: [71, 146, 222, 322, 402, 487, 571, 656, 743, 815],
    centerY: 1000,
    slotSize: 57,
  },
  viewportFrameOverlay: true,
  viewportCornerKeep: {
    top: { w: 168, h: 128 },
    bottom: { w: 140, h: 100 },
  },
};

/** Layout por variante activa (`/ui clear|dark|red` o legacy `light`). */
export const AOWEB_SKIN_LAYOUTS: Record<AowebUiSkinVariant, AowebSkinLayout> = {
  light: AOWEB_SKIN_LAYOUT_LIGHT,
  dark: AOWEB_SKIN_LAYOUT_DARK,
  white: AOWEB_SKIN_LAYOUT_WHITE,
  red: AOWEB_SKIN_LAYOUT_RED,
};

export function getAowebSkinLayoutForVariant(variant: AowebUiSkinVariant): AowebSkinLayout {
  return AOWEB_SKIN_LAYOUTS[variant];
}

export function getAowebSkinLayout(): AowebSkinLayout {
  return getAowebSkinLayoutForVariant(getAowebSkinVariant());
}

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

export function usesMinimapFrameOverlay(): boolean {
  return Boolean(getAowebSkinLayout().minimapFrameOverlay);
}

export function getSkinMinimapContentRect(
  region: SkinRect,
  screenW: number,
  screenH: number
): SkinRect {
  const pad = getAowebSkinLayout().minimapContentPad ?? {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  };
  const panel = scaleSkinRect(region, screenW, screenH);
  const padTop = scaleSkinY(pad.top, screenH);
  const padLeft = scaleSkinX(pad.left, screenW);
  const padRight = scaleSkinX(pad.right, screenW);
  const padBottom = scaleSkinY(pad.bottom, screenH);
  return {
    x: panel.x + padLeft,
    y: panel.y + padTop,
    w: Math.max(8, panel.w - padLeft - padRight),
    h: Math.max(8, panel.h - padTop - padBottom),
  };
}

export function usesViewportFrameOverlay(): boolean {
  return Boolean(getAowebSkinLayout().viewportFrameOverlay);
}

/** Área del PNG que se vuelve transparente (todo el viewport; quedan solo esquinas). */
export function getViewportTransparentContentRect(): SkinRect | null {
  const layout = getAowebSkinLayout();
  if (!layout.viewportFrameOverlay) {
    return null;
  }
  return { ...layout.regions.viewport };
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

/** Posición de cada slot de macro alineada al marco PNG (10 slots). */
export function getAowebSkinMacroSlotMetrics(
  screenW: number,
  screenH: number,
  slotCount: number
): MacroSlotLayout[] {
  const layout = getAowebSkinLayout();
  const bar = layout.regions.macroBar;

  if (layout.macroSlots) {
    const { centersX, centerY, slotSize } = layout.macroSlots;
    const cy = scaleSkinY(centerY, screenH);
    const size = Math.min(scaleSkinX(slotSize, screenW), scaleSkinY(slotSize, screenH));
    const count = Math.min(slotCount, centersX.length);
    return Array.from({ length: count }, (_, index) => ({
      cx: scaleSkinX(centersX[index], screenW),
      cy,
      size,
    }));
  }

  const barScreen = scaleSkinRect(bar, screenW, screenH);
  const pitch = barScreen.w / slotCount;
  const size = Math.min(40, Math.floor(pitch * 0.82));
  const top = barScreen.y + Math.floor((barScreen.h - size) / 2);
  const cy = top + Math.floor(size / 2);
  return Array.from({ length: slotCount }, (_, index) => ({
    cx: barScreen.x + Math.floor(pitch * index + pitch / 2),
    cy,
    size,
  }));
}
