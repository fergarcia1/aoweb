import { getShopSignGrh } from "../../game-data/imperium/shopSignCatalog";
import type { MapSignPlacement } from "./mapSignRender";

/** Carteles de comercios en Ullathorpe (mapa1), colocados a mano. */
export const MAPA1_MANUAL_SIGNS: MapSignPlacement[] = [
  { tileX: 70, tileY: 38, grhIndex: getShopSignGrh("alquimia") },
  { tileX: 78, tileY: 38, grhIndex: getShopSignGrh("sastreria") },
  { tileX: 80, tileY: 56, grhIndex: getShopSignGrh("banco") },
  { tileX: 72, tileY: 70, grhIndex: getShopSignGrh("templo") },
  { tileX: 60, tileY: 68, grhIndex: getShopSignGrh("herreria") },
  { tileX: 42, tileY: 41, grhIndex: getShopSignGrh("armaduras") },
  { tileX: 58, tileY: 32, grhIndex: getShopSignGrh("magia") },
];

export function getManualSignPlacementsForMap(mapId: string): MapSignPlacement[] {
  if (mapId === "mapa1") {
    return MAPA1_MANUAL_SIGNS;
  }
  return [];
}
