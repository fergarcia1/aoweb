import {
  SPELL_CAST_META_BY_ID,
  type SpellCastMeta,
} from "./spellCastMeta";

export type { SpellCastMeta };
export { SPELL_CAST_META_BY_ID };

/** Texto sobre la cabeza al lanzar un hechizo (como IAO). */
export const SPELL_MAGIC_WORDS_DURATION_MS = 1000;

/**
 * Registro fijo de FX por hechizo (spritesheets en public/assets/ao/spells).
 * Sin detección automática: frameWidth, frameHeight y frameCount son manuales.
 */
export type SpellEffectConfig = {
  idSpell: number;
  /** Índice WAV de Argentum Online (ver SPELL_CAST_META_BY_ID). */
  wav?: number;
  /** Palabras mágicas al lanzar. */
  palabrasMagicas?: string;
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
  /** Tinte en modo ADD (grises → color). Ej. 0x55ccff rayo eléctrico. */
  tint?: number;
};

/** Sheets 512×512 en grilla 4×4 (128×128 por frame). */
const FX_128 = { frameWidth: 128, frameHeight: 128 };
/** Sheets 512×512 en grilla 5×2 (102×128 por frame). */
const FX_102x128 = { frameWidth: 102, frameHeight: 128 };
/** Misil mágico: 512×512, 5 cols × 2 filas (102×256, 10 frames). */
const FX_102x256 = { frameWidth: 102, frameHeight: 256 };

/** Descarga eléctrica (512×512, grilla 4×4). Compartida por hechizos eléctricos similares. */
const DESCARGA_ELECTRICA_FX = {
  sheetKey: "spell_descarga_electrica_fx",
  path: "/assets/ao/spells/descargaElectricaAnimation.png",
  ...FX_128,
  frameCount: 15,
  frameRate: 14,
  scale: 0.9,
  offsetY: -22,
  originX: 0.5,
  originY: 0.5,
  tint: 0x55ccff,
  playHitSound: true,
} as const;

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
    ...DESCARGA_ELECTRICA_FX,
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
    playHitSound: true,
  },
  {
    idSpell: 93,
    ...DESCARGA_ELECTRICA_FX,
  },
  {
    idSpell: 102,
    sheetKey: "spell_remover_paralisis_fx",
    path: "/assets/ao/spells/removerParalisisAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.9,
    offsetY: -22,
    originX: 0.5,
    originY: 0.5,
    tint: 0x4499dd,
  },
  {
    idSpell: 94,
    sheetKey: "spell_rafaga_ignea_fx",
    path: "/assets/ao/spells/rafagaIgneaAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.9,
    offsetY: -24,
    originX: 0.5,
    originY: 0.5,
    tint: 0xff6622,
    playHitSound: true,
  },
  {
    idSpell: 18,
    sheetKey: "spell_celeridad_fx",
    path: "/assets/ao/spells/celeridadAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.9,
    offsetY: -22,
    originX: 0.5,
    originY: 0.5,
    tint: 0x66ffaa,
  },
  {
    idSpell: 13,
    sheetKey: "spell_furia_ukhrul_fx",
    path: "/assets/ao/spells/furiaUkhrulAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.9,
    offsetY: -22,
    originX: 0.5,
    originY: 0.5,
    tint: 0xcc3300,
  },
  {
    idSpell: 14,
    sheetKey: "spell_invisibilidad_fx",
    path: "/assets/ao/spells/invisibilidadAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.9,
    offsetY: -22,
    originX: 0.5,
    originY: 0.5,
    tint: 0xdddddd,
  },
  {
    idSpell: 25,
    sheetKey: "spell_apocalipsis_fx",
    path: "/assets/ao/spells/apocalipsisAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.95,
    offsetY: -24,
    originX: 0.5,
    originY: 0.5,
    tint: 0xff1100,
    playHitSound: true,
  },
  {
    idSpell: 52,
    sheetKey: "spell_juicio_final_fx",
    path: "/assets/ao/spells/juicioFinalAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.95,
    offsetY: -24,
    originX: 0.5,
    originY: 0.5,
    tint: 0xffdd44,
    playHitSound: true,
  },
  {
    idSpell: 84,
    sheetKey: "spell_lamento_de_almas_fx",
    path: "/assets/ao/spells/lamentoDeAlmasAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.95,
    offsetY: -24,
    originX: 0.5,
    originY: 0.5,
    tint: 0x8899bb,
    playHitSound: true,
  },
  {
    idSpell: 76,
    sheetKey: "spell_semillas_fuego_fx",
    path: "/assets/ao/spells/semillasDeFuegoAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.95,
    offsetY: -24,
    originX: 0.5,
    originY: 0.5,
    tint: 0xff6622,
    playHitSound: true,
  },
  {
    idSpell: 103,
    sheetKey: "spell_resucitar_fx",
    path: "/assets/ao/spells/resucitarAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 12,
    scale: 0.95,
    offsetY: -22,
    originX: 0.5,
    originY: 0.5,
    tint: 0x88ffcc,
  },
  {
    idSpell: 15,
    sheetKey: "spell_bomba_magica_fx",
    path: "/assets/ao/spells/bombaMagicaAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.95,
    offsetY: -24,
    originX: 0.5,
    originY: 0.5,
    tint: 0xff6622,
    playHitSound: true,
  },
  {
    idSpell: 23,
    ...DESCARGA_ELECTRICA_FX,
    sheetKey: "spell_corriente_electrica_fx",
  },
  {
    idSpell: 19,
    sheetKey: "spell_torpeza_fx",
    path: "/assets/ao/spells/celeridadAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.9,
    offsetY: -22,
    originX: 0.5,
    originY: 0.5,
    tint: 0xaa6644,
  },
  {
    idSpell: 20,
    sheetKey: "spell_fuerza_fx",
    path: "/assets/ao/spells/celeridadAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.9,
    offsetY: -22,
    originX: 0.5,
    originY: 0.5,
    tint: 0xffcc44,
  },
  {
    idSpell: 21,
    sheetKey: "spell_debilidad_fx",
    path: "/assets/ao/spells/celeridadAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.9,
    offsetY: -22,
    originX: 0.5,
    originY: 0.5,
    tint: 0x776655,
  },
  {
    idSpell: 22,
    sheetKey: "spell_desencantar_fx",
    path: "/assets/ao/spells/curarVenenoAnimation.png",
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 3,
    frameRate: 10,
    scale: 1.2,
    offsetY: -30,
    originX: 0.5,
    originY: 0.5,
    tint: 0xaaddff,
  },
  {
    idSpell: 32,
    sheetKey: "spell_sanar_fx",
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
    idSpell: 35,
    sheetKey: "spell_lluvia_mosquitos_fx",
    path: "/assets/ao/spells/paralizarAnimation.png",
    ...FX_102x256,
    frameCount: 10,
    frameRate: 12,
    scale: 0.85,
    offsetY: 50,
    originX: 0.5,
    originY: 1,
    tint: 0x44aa44,
  },
  {
    idSpell: 62,
    sheetKey: "spell_detectar_invis_fx",
    path: "/assets/ao/spells/invisibilidadAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.9,
    offsetY: -22,
    originX: 0.5,
    originY: 0.5,
    tint: 0x88aaff,
  },
  {
    idSpell: 63,
    sheetKey: "spell_lamento_banshee_fx",
    path: "/assets/ao/spells/lamentoDeAlmasAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.95,
    offsetY: -24,
    originX: 0.5,
    originY: 0.5,
    tint: 0x8899bb,
    playHitSound: true,
  },
  {
    idSpell: 67,
    sheetKey: "spell_curar_criticas_fx",
    path: "/assets/ao/spells/heridasGravesAnimation.png",
    ...FX_102x256,
    frameCount: 10,
    frameRate: 8,
    scale: 0.95,
    offsetY: 30,
    originX: 0.5,
    originY: 1,
    tint: 0xffddaa,
  },
  {
    idSpell: 69,
    sheetKey: "spell_descarga_flamigera_fx",
    path: "/assets/ao/spells/rafagaIgneaAnimation.png",
    ...FX_128,
    frameCount: 15,
    frameRate: 14,
    scale: 0.9,
    offsetY: -24,
    originX: 0.5,
    originY: 0.5,
    tint: 0xffaa22,
    playHitSound: true,
  },
  {
    idSpell: 71,
    sheetKey: "spell_pregonar_fx",
    path: "/assets/ao/spells/heridasGravesAnimation.png",
    ...FX_102x256,
    frameCount: 10,
    frameRate: 8,
    scale: 0.95,
    offsetY: 30,
    originX: 0.5,
    originY: 1,
    tint: 0xffffcc,
  },
  {
    idSpell: 75,
    sheetKey: "spell_circulo_curativo_fx",
    path: "/assets/ao/spells/circuloCurativoAnimation.png",
    ...FX_128,
    frameCount: 16,
    frameRate: 14,
    scale: 1.1,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    tint: 0x44ff88,
  },
].map(enrichSpellEffectWithCastMeta);

function enrichSpellEffectWithCastMeta(
  fx: Omit<SpellEffectConfig, "wav" | "palabrasMagicas">
): SpellEffectConfig {
  const meta = SPELL_CAST_META_BY_ID[fx.idSpell];
  if (!meta) return fx;
  return {
    ...fx,
    wav: meta.wav,
    ...(meta.palabrasMagicas ? { palabrasMagicas: meta.palabrasMagicas } : {}),
  };
}

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

export function getSpellCastMeta(spellId: number): SpellCastMeta | undefined {
  return SPELL_CAST_META_BY_ID[spellId];
}

export function getSpellWav(spellId: number): number | undefined {
  const meta = SPELL_CAST_META_BY_ID[spellId];
  if (!meta || meta.namedWav) {
    return undefined;
  }
  return meta.wav > 0 ? meta.wav : undefined;
}

export function getSpellNamedWav(spellId: number): string | undefined {
  return SPELL_CAST_META_BY_ID[spellId]?.namedWav;
}

export function getSpellMagicWords(spellId: number): string | undefined {
  return SPELL_CAST_META_BY_ID[spellId]?.palabrasMagicas;
}

export function spellEffectAnimKey(spellId: number): string {
  return `spell_fx_${spellId}`;
}

export function getSpellEffectFirstFrame(fx: SpellEffectConfig): number {
  return fx.frameSequence?.[0] ?? 0;
}

/** Hechizos que inmovilizan (sin daño directo). */
export { IMMOBILIZE_SPELL_IDS } from "./spells";
