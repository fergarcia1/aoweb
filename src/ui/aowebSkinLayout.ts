/** Regiones del marco UI (referencia nativa 1024×768, medidas sobre aoweb_skin.png). */
export const AOWEB_SKIN_NATIVE = { w: 1024, h: 768 } as const;

/** Tamaño de cada casilla del inventario en la skin (px nativos). */
export const AOWEB_SKIN_INVENTORY_CELL = { w: 47, h: 47, gapX: 2, gapY: 3 } as const;

export const AOWEB_SKIN_REGIONS = {
  /** Historial de chat (sin la columna derecha de tabs/scroll). */
  chatHistory: { x: 36, y: 22, w: 560, h: 88 },
  /** Botón desplegable de canal (cuadrado en la skin, arriba del chat). */
  chatChannelToggle: { x: 606, y: 84, w: 60, h: 26 },
  /** Lista vertical Chat / Combate / Global (debajo del botón de canal). */
  chatChannelList: { x: 604, y: 110, w: 66, h: 56 },
  /** Ventana de juego (viewport Phaser) — interior oscuro del marco. */
  viewport: { x: 20, y: 132, w: 661, h: 556 },
  /** Barra de macros (10 ranuras). */
  macroBar: { x: 38, y: 692, w: 628, h: 68 },
  /** Nombre del personaje (barra izquierda del header). */
  name: { x: 720, y: 48, w: 168, h: 24 },
  /** Barra de experiencia (debajo del nombre). */
  exp: { x: 721, y: 105, w: 175, h: 16 },
  /** Círculo de nivel (abajo a la derecha). */
  levelCircle: { x: 925, y: 42, w: 64, h: 64 },
  /** Pestañas inventario / hechizos / stats. */
  tabs: { x: 710, y: 168, w: 298, h: 40 },
  /** Recuadro negro (inventario / lista de hechizos comparten este panel). */
  inventoryPanel: { x: 706, y: 182, w: 296, h: 232 },
  /** Ranura de barra de vida (hueco junto al corazón, debajo del inventario). */
  hpBar: { x: 741, y: 454, w: 111, h: 27 },
  /** Ranura de barra de maná (hueco junto a la estrella). */
  mpBar: { x: 741, y: 502, w: 112, h: 27 },
  /** Caja numérica de oro (junto a monedas, a la derecha de las barras). */
  gold: { x: 910, y: 479, w: 58, h: 18 },
  /** Casillero de fuerza (recuadro decorado con "F"). */
  strengthSlot: { x: 660, y: 613, w: 114, h: 42 },
  /** Casillero de agilidad (recuadro decorado con "A"). */
  agilitySlot: { x: 660, y: 676, w: 114, h: 42 },
  /** Caja de hint / descripción de ítem (panel inferior). */
  hint: { x: 712, y: 408, w: 296, h: 72 },
  /** Minimapa (círculo superior derecho, centro ~984,50). */
  minimap: { x: 820, y: 548, w: 191, h: 191},
} as const;

export function scaleSkinX(value: number, screenW: number): number {
  return Math.round((value * screenW) / AOWEB_SKIN_NATIVE.w);
}

export function scaleSkinY(value: number, screenH: number): number {
  return Math.round((value * screenH) / AOWEB_SKIN_NATIVE.h);
}

export function scaleSkinRect(
  region: { x: number; y: number; w: number; h: number },
  screenW: number,
  screenH: number
): { x: number; y: number; w: number; h: number } {
  return {
    x: scaleSkinX(region.x, screenW),
    y: scaleSkinY(region.y, screenH),
    w: scaleSkinX(region.w, screenW),
    h: scaleSkinY(region.h, screenH),
  };
}

export function getSkinGameViewport(screenW: number, screenH: number) {
  const rect = scaleSkinRect(AOWEB_SKIN_REGIONS.viewport, screenW, screenH);
  return { x: rect.x, y: rect.y, width: rect.w, height: rect.h };
}

/** Valores de UI_LAYOUT para pantalla 800×600. */
export function getSkinDerivedLayout(screenW: number, screenH: number) {
  const vp = AOWEB_SKIN_REGIONS.viewport;
  const sidebarWidth = scaleSkinX(AOWEB_SKIN_NATIVE.w - vp.x - vp.w, screenW);
  const chatHeight = scaleSkinY(vp.y, screenH);
  const macroBarHeight = scaleSkinY(
    AOWEB_SKIN_NATIVE.h - AOWEB_SKIN_REGIONS.macroBar.y,
    screenH
  );
  return { sidebarWidth, chatHeight, macroBarHeight };
}
