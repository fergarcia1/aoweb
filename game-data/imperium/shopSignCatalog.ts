/**
 * Catálogo de gráficos de carteles de comercios (grhIndex = número de .bmp en Imperium).
 * Reutilizable en cualquier mapa al colocar carteles a mano.
 */
export type ShopSignKind =
  | "alquimia"
  | "carpinteria"
  | "armaduras"
  | "sastreria"
  | "magia"
  | "banco"
  | "templo"
  | "banderbill_entrada"
  | "pesca"
  | "herreria"
  | "mineria";

export type ShopSignGrhEntry = {
  kind: ShopSignKind;
  /** GrhIndex / archivo .bmp (ej. 9934.bmp → grh 9934). */
  grhIndex: number;
  label: string;
};

/** Registro maestro de carteles de tienda conocidos. */
export const SHOP_SIGN_GRH_CATALOG: Record<ShopSignKind, ShopSignGrhEntry> = {
  alquimia: { kind: "alquimia", grhIndex: 21, label: "Alquimia" },
  carpinteria: { kind: "carpinteria", grhIndex: 23, label: "Carpinteria" },
  armaduras: { kind: "armaduras", grhIndex: 577, label: "Armaduras" },
  sastreria: { kind: "sastreria", grhIndex: 528, label: "Sastreria" },
  magia: { kind: "magia", grhIndex: 630, label: "Magia" },
  banco: { kind: "banco", grhIndex: 666, label: "Banco" },
  templo: { kind: "templo", grhIndex: 669, label: "Templo" },
  banderbill_entrada: {
    kind: "banderbill_entrada",
    grhIndex: 664,
    label: "Banderbill Entrada",
  },
  pesca: { kind: "pesca", grhIndex: 631, label: "Pesca" },
  herreria: { kind: "herreria", grhIndex: 9934, label: "Herreria" },
  mineria: { kind: "mineria", grhIndex: 618, label: "Mineria" },
};

export function getShopSignGrh(kind: ShopSignKind): number {
  return SHOP_SIGN_GRH_CATALOG[kind].grhIndex;
}
