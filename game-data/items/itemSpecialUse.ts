/** Uso especial planificado para objetos misc (barca, monturas, clanes, druida, etc.). */
export type ItemSpecialUse =
  | { kind: "boat_navigation" }
  | { kind: "mount"; mountId: string }
  | { kind: "clan_founding_gem"; gemTier: "dorada" | "naranja" | "lunar" | "gris" }
  | { kind: "druid_polymorph"; mobFormId: string }
  | { kind: "future"; note: string };

export const CLAN_GEM_TIER_LABELS: Record<
  Extract<ItemSpecialUse, { kind: "clan_founding_gem" }>["gemTier"],
  string
> = {
  dorada: "Gema Dorada",
  naranja: "Gema Naranja",
  lunar: "Gema Lunar",
  gris: "Gema Gris",
};

export const MOUNT_ID_LABELS: Record<string, string> = {
  caballo_mago: "Caballo (mago)",
  caballo_negro: "Caballo negro",
  caballo_nw: "Caballo del Noroeste",
  caballo_semielfo: "Caballo semielfo",
  huargo: "Huargo",
  hipocampo: "Hipocampo",
};

export const DRUID_FORM_LABELS: Record<string, string> = {
  oso: "Oso",
  lobo: "Lobo",
  lobo_invernal: "Lobo invernal",
  ent: "Ent",
  tigre: "Tigre",
  ave: "Ave",
  dragon: "Dragón",
  golem: "Gólem",
};
