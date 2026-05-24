/** Medidas del marco de interfaz estilo AO (pantalla fija). */
export const UI_LAYOUT = {
  sidebarWidth: 210,
  chatHeight: 152,
  macroBarHeight: 0,
} as const;

export function getGameViewport(scaleWidth: number, scaleHeight: number) {
  const { sidebarWidth, chatHeight, macroBarHeight } = UI_LAYOUT;
  return {
    x: 0,
    y: chatHeight,
    width: scaleWidth - sidebarWidth,
    height: scaleHeight - chatHeight - macroBarHeight,
  };
}
