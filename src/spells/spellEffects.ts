/**
 * Registro fijo de FX por hechizo (spritesheets en public/assets/ao/spells).
 * Sin detección automática: frameWidth, frameHeight y frameCount son manuales.
 */
export type SpellEffectConfig = {
  idSpell: number;
  sheetKey: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameRate: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  originX?: number;
  originY?: number;
  /** Reemplaza frames 0..frameCount-1 cuando hay frames rotos en el PNG. */
  frameSequence?: number[];
  shakeOnPlay?: boolean;
  playHitSound?: boolean;
};

/** Sheets 512×512 en grilla 4×4 (128×128 por frame). */
const FX_128 = { frameWidth: 128, frameHeight: 128 };
/** Sheets 512×512 en grilla 5×2 (102×128 por frame). */
const FX_102x128 = { frameWidth: 102, frameHeight: 128 };
/** Misil mágico: 512×512, 5 cols × 2 filas (102×256, 10 frames). */
const FX_102x256 = { frameWidth: 102, frameHeight: 256 };

export const SPELL_EFFECTS: SpellEffectConfig[] = [
  {
    idSpell: 1,
    sheetKey: "spell_curar_veneno_fx",
    path: "/assets/ao/spells/curarVenenoAnimation.png",
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 3,
    frameRate: 10,
    scale: 1,
    offsetY: -30,
    originX: 0.5,
    originY: 0.5,
  },
  {
    idSpell: 2,
    sheetKey: "spell_misil_magico_fx",
    path: "/assets/ao/spells/misilMagicoAnimation.png",
    ...FX_102x256,
    frameCount: 10,
    frameRate: 14,
    scale: 0.85,
    offsetY: -20,
    originX: 0.5,
    originY: 0.5,
  },
  {
    idSpell: 3,
    sheetKey: "spell_curar_leve_fx",
    path: "/assets/ao/spells/curarVenenoAnimation.png",
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 3,
    frameRate: 10,
    scale: 1,
    offsetY: -30,
    originX: 0.5,
    originY: 0.5,
  },
  {
    idSpell: 4,
    sheetKey: "spell_saeta_ignea_fx",
    path: "/assets/ao/spells/saetaIgneaAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.9,
    offsetY: -24,
    originX: 0.5,
    originY: 0.5,
    playHitSound: true,
  },
  {
    idSpell: 5,
    sheetKey: "spell_electric_fx",
    path: "/assets/ao/spells/electricAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.9,
    offsetY: -22,
    originX: 0.5,
    originY: 0.5,
    playHitSound: true,
  },
  {
    idSpell: 7,
    sheetKey: "spell_implosion_fx",
    path: "/assets/ao/spells/imploAnimation.png",
    ...FX_128,
    frameCount: 16,
    frameRate: 14,
    frameSequence: [0, 1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15],
    scale: 0.9,
    offsetY: -28,
    originX: 0.5,
    originY: 0.5,
    shakeOnPlay: true,
    playHitSound: true,
  },
  {
    idSpell: 8,
    sheetKey: "spell_inmovilizar_fx",
    path: "/assets/ao/spells/inmovilizarAnimation.png",
    ...FX_128,
    frameCount: 11,
    frameSequence: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    frameRate: 12,
    scale: 0.85,
    offsetY: 28,
    originX: 0.5,
    originY: 1,
  },
  {
    idSpell: 9,
    sheetKey: "spell_heridas_graves_fx",
    path: "/assets/ao/spells/heridasGravesAnimation.png",
    ...FX_102x256,
    frameCount: 10,
    frameRate: 8,
    scale: 0.95,
    offsetY: 30,
    originX: 0.5,
    originY: 1,
  },
  {
    idSpell: 10,
    sheetKey: "spell_paralizar_fx",
    path: "/assets/ao/spells/paralizarAnimation.png",
    ...FX_102x256,
    frameCount: 10,
    frameRate: 12,
    scale: 0.85,
    offsetY: 50,
    originX: 0.5,
    originY: 1,
  },
  {
    idSpell: 11,
    sheetKey: "spell_tormenta_electric_fx",
    path: "/assets/ao/spells/tormentaElectric.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 13,
    scale: 1,
    offsetY: -30,
    originX: 0.5,
    originY: 0.5,
    shakeOnPlay: true,
    playHitSound: true,
  },
];

// --- Special FX (non-spell) ---

export const SPAWN_FX_ID = 9000;

export const SPAWN_FX_CONFIG: SpellEffectConfig = {
  idSpell: SPAWN_FX_ID,
  sheetKey: "fx_spawn_logeo",
  path: "/assets/ao/spells/animacionLogeo.png",
  ...FX_128,
  frameCount: 13,
  frameRate: 18,
  scale: 1,
  offsetY: -20,
  originX: 0.5,
  originY: 0.5,
};

export const ALL_FX_SHEETS: SpellEffectConfig[] = [...SPELL_EFFECTS, SPAWN_FX_CONFIG];

export const SPELL_EFFECT_BY_ID: Record<number, SpellEffectConfig> = Object.fromEntries(
  SPELL_EFFECTS.map((fx) => [fx.idSpell, fx])
);

export function getSpellEffectConfig(spellId: number): SpellEffectConfig | undefined {
  return SPELL_EFFECT_BY_ID[spellId];
}

export function spellEffectAnimKey(spellId: number): string {
  return `spell_fx_${spellId}`;
}

export function getSpellEffectFirstFrame(fx: SpellEffectConfig): number {
  return fx.frameSequence?.[0] ?? 0;
}

/** Hechizos que inmovilizan (sin daño directo). */
export const IMMOBILIZE_SPELL_IDS = new Set<number>([8, 10]);
