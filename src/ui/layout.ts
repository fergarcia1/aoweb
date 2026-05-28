import { getSkinDerivedLayout, getSkinGameViewport } from "./aowebSkinLayout";



/** Medidas del marco de interfaz (derivadas de aoweb_skin.png a 800×600). */

const SKIN_LAYOUT_800 = getSkinDerivedLayout(800, 600);



export const UI_LAYOUT = {

  sidebarWidth: SKIN_LAYOUT_800.sidebarWidth,

  chatHeight: SKIN_LAYOUT_800.chatHeight,

  macroBarHeight: SKIN_LAYOUT_800.macroBarHeight,

} as const;



export function getGameViewport(scaleWidth: number, scaleHeight: number) {

  return getSkinGameViewport(scaleWidth, scaleHeight);

}


