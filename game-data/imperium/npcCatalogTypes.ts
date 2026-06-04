/** Clasificación de plantillas Imperium (NPCs.dat) para runtime AOWEB. */
export type ImperiumNpcKind = "service" | "creature" | "ambient";

/** Estado de resolución gráfica (Personajes.ind + BMP). */
export type ImperiumNpcVisualStatus =
  | "ready"
  | "missing_bmp"
  | "missing_body_index"
  | "missing_grh"
  | "mixed_frame_size"
  | "invalid_frame"
  | "not_built"
  | "no_body";

/** Razas con hoja `{raza}_{genero}_faces.png` en AOWEB. */
export type ImperiumNpcFaceRaceId =
  | "human"
  | "elf"
  | "drow"
  | "dwarf"
  | "gnome"
  | "orc";

export type ImperiumNpcFaceGenderId = "male" | "female";

/** Cabeza procedural (hasta mapear `Head` de Imperium). */
export type ImperiumNpcFaceAppearance = {
  raceId: ImperiumNpcFaceRaceId;
  genderId: ImperiumNpcFaceGenderId;
  /** Columna 0-based en la hoja de caras (0..10). */
  faceIndex: number;
  faceDropY?: number;
  faceOffsetX?: number;
  source?: "random_seeded" | "imperium_head";
};

/** Resumen visual en cada entrada del catálogo (detalle en npcBodyVisuals.json). */
export type ImperiumNpcCatalogVisual = {
  status: ImperiumNpcVisualStatus;
  bodyId: number;
  head: number;
  texturePath?: string;
  textureKey?: string;
  frameWidth?: number;
  frameHeight?: number;
  sheetCols?: number;
  /** null si el NPC no lleva cara (animal chico, etc.). */
  face?: ImperiumNpcFaceAppearance | null;
};

/** Rol de servicio (banquero, sacerdote, etc.); null si kind !== "service". */
export type ImperiumServiceRole =
  | "priest"
  | "banker"
  | "vendor"
  | "trainer"
  | "guard"
  | "jailer"
  | "bounty_hunter"
  | "vet"
  | "lumberjack"
  | "auctioneer"
  | "generic";

/** Entrada de catálogo generada desde Imperium Clásico `NPCs.dat`. */
export type ImperiumNpcCatalogEntry = {
  /** ID `[NPCn]` en NPCs.dat. */
  npcId: number;
  name: string;
  kind: ImperiumNpcKind;
  serviceRole: ImperiumServiceRole | null;
  npcType: number;
  body: number;
  head: number;
  heading: number;
  movement: number;
  attackable: boolean;
  hostile: boolean;
  comercia: boolean;
  giveExp: number;
  giveGold: number;
  minHp: number;
  maxHp: number;
  minHit: number;
  maxHit: number;
  def: number;
  inCriaturas: boolean;
  localeId: number;
  /** Texto de diálogo / descripción (recortado en export). */
  desc: string;
  /** Gráfico de cuerpo resuelto (`npm run import:npc-visuals`). */
  visual?: ImperiumNpcCatalogVisual;
};

export type ImperiumNpcCatalogMeta = {
  source: string;
  generatedAt: string;
  totalEntries: number;
  byKind: Record<ImperiumNpcKind, number>;
  byServiceRole: Partial<Record<ImperiumServiceRole, number>>;
};

export type ImperiumNpcCatalogFile = {
  meta: ImperiumNpcCatalogMeta;
  entries: ImperiumNpcCatalogEntry[];
};
