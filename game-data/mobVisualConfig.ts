import type { CharacterGenderId, CharacterRaceId } from "../shared/characterTypes";
import type { Facing } from "../shared/types";
import type { MobModelId } from "./mobs";
import { MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX, mobScaleForFrameHeight } from "./mobSheetLayouts";

/**
 * Convención Imperium (casi todos los PNG en una sola hoja):
 *   Fila 1 → S (Sur / abajo)
 *   Fila 2 → W (Norte / arriba, tecla W)
 *   Fila 3 → A (Oeste / izquierda)
 *   Fila 4 → D (Este / derecha)
 *
 * Los frames de caminar van en columnas dentro de cada fila.
 * Excepciones: se documentan en `notes` del mob.
 *
 * Mobs grandes: 4 PNG con sufijo S|W|A|D en el nombre (ej. golemPlataA.png).
 */

export type MobDirection = Facing;

/** Velocidad de desplazamiento por tile (mayor = más rápido). */
export const MOB_DEFAULT_MOVE_SPEED_RATIO = 0.45;

/** Escala del frame rate de caminar (0.75 = 25 % más lento que el paso). */
export const MOB_WALK_ANIM_FRAME_RATE_SCALE = 0.75;

/** Filas S W A D (convención por defecto para mobs/npc_bodies). */
export const MOB_DIRECTION_ROWS_SWAD: Record<MobDirection, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
};

/** Filas W D S A en hojas generadas desde Personajes.ind (import catálogo). */
export const MOB_DIRECTION_ROWS_WDSA: Record<MobDirection, number> = {
  up: 0,
  right: 1,
  down: 2,
  left: 3,
};

export type MobFaceOverlayConfig = {
  raceId: CharacterRaceId;
  genderId: CharacterGenderId;
  /** Columna 0-based en `{raza}_{genero}_faces.png`. */
  faceIndex: number;
  faceDropY?: number;
  faceOffsetX?: number;
  /** Ajuste fino por dirección (suma a offset de raza y base). */
  faceOffsetByFacing?: Partial<Record<MobDirection, { x?: number; y?: number }>>;
};

type MobVisualBase = {
  /** Textura Phaser: `mob_{modelId}` o `mob_{modelId}_{facing}` para hojas por dirección. */
  textureKeyPrefix: string;
  frameWidth: number;
  frameHeight: number;
  frameRate?: number;
  scale?: number;
  moveSpeedRatio?: number;
  mirrorRightFromLeft?: boolean;
  visualOffsetY?: number;
  facingOriginY?: Partial<Record<MobDirection, number>>;
  notes?: string;
};

/** Un PNG con varias filas (una por dirección). */
export type SingleSheetMobVisualConfig = MobVisualBase & {
  type: "singleSheet";
  path: string;
  columns: number;
  /** Por defecto filas S W A D; usar otro mapa solo si el PNG es excepción. */
  directionRows?: Partial<Record<MobDirection, number>>;
  /** Índices de columna dentro de la fila para el ciclo de caminar. */
  walkFrames: number[];
  /** Columna del frame quieto en la fila (default: primer walkFrame). */
  idleColumn?: number;
  /** Frame plano por dirección (grillas 2×2 u otras excepciones). */
  directionFrames?: Partial<Record<MobDirection, number>>;
  /** Máximo de columnas de caminar por dirección (ej. A/D con 5 cols en hoja de 6). */
  walkColumnCountByFacing?: Partial<Record<MobDirection, number>>;
  /** Cuerpo sin cabeza: cara de raza encima del sprite. */
  faceOverlay?: MobFaceOverlayConfig;
};

/** Layout de una hoja por dirección (cuando S/W/A/D no comparten grilla). */
export type DirectionSheetFacingLayout = {
  frameWidth: number;
  frameHeight: number;
  walkFrames: number[];
};

/** Cuatro PNG: nombre termina en S, W, A o D (golem, etc.). */
export type DirectionSheetsMobVisualConfig = MobVisualBase & {
  type: "directionSheets";
  paths: Record<MobDirection, string>;
  /** Columnas del spritesheet en cada PNG (ej. grilla 3×3 → 3 columnas). */
  columns: number;
  walkFrames: number[];
  /** Override por dirección (ej. dragón: S/A/D 1×2, W 1×1). */
  directionLayout?: Partial<Record<MobDirection, DirectionSheetFacingLayout>>;
};

export function resolveDirectionSheetFacingLayout(
  visual: DirectionSheetsMobVisualConfig,
  facing: MobDirection
): DirectionSheetFacingLayout {
  const override = visual.directionLayout?.[facing];
  return {
    frameWidth: override?.frameWidth ?? visual.frameWidth,
    frameHeight: override?.frameHeight ?? visual.frameHeight,
    walkFrames: override?.walkFrames ?? visual.walkFrames,
  };
}

export type MobVisualConfig = SingleSheetMobVisualConfig | DirectionSheetsMobVisualConfig;

/** Sufijos de dirección en nombres de archivo Imperium. */
export const MOB_DIRECTION_SUFFIXES: Record<MobDirection, string> = {
  down: "S",
  up: "W",
  left: "A",
  right: "D",
};

export function mobTextureKey(modelId: string, facing?: MobDirection): string {
  if (!facing) return `mob_${modelId}`;
  return `mob_${modelId}_${facing}`;
}

/**
 * Fase 1 — contrato visual por mob implementado.
 * Gameplay (stats, spawns) sigue en mobs.json / MOB_SPAWNS.
 */
export const MOB_VISUAL_CONFIGS: Record<MobModelId, MobVisualConfig> = {
  gallina: {
    type: "singleSheet",
    textureKeyPrefix: "gallina",
    path: "/assets/ao/imperium/mobs/npc_bodies/gallina.png",
    frameWidth: 32,
    frameHeight: 48,
    columns: 6,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [1, 2, 3, 4, 5],
    mirrorRightFromLeft: false,
    notes: "192×192, estilo personaje: col 0 idle, cols 1–5 caminar.",
  },

  conejo: {
    type: "singleSheet",
    textureKeyPrefix: "conejo",
    path: "/assets/ao/imperium/mobs/npc_bodies/murcielago.png",
    frameWidth: 64,
    frameHeight: 32,
    columns: 2,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1],
    mirrorRightFromLeft: false,
    scale: mobScaleForFrameHeight(32) * 0.7,
    notes: "Murciélago: 128×128, 2 cols × 4 filas SWAD (2 frames de walk por dirección).",
  },

  lobo: {
    type: "singleSheet",
    textureKeyPrefix: "lobo",
    path: "/assets/ao/imperium/mobs/npc_bodies/lobo.png",
    frameWidth: 128,
    frameHeight: 128,
    columns: 4,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3],
    mirrorRightFromLeft: true,
    notes: "512×512 4×4 filas SWAD; fila D vacía en PNG → derecha = fila A espejada.",
  },

  serpiente: {
    type: "singleSheet",
    textureKeyPrefix: "serpiente",
    path: "/assets/ao/imperium/mobs/npc_bodies/serpiente.png",
    frameWidth: 42,
    frameHeight: 32,
    columns: 3,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2],
    mirrorRightFromLeft: false,
    scale: mobScaleForFrameHeight(32) * 0.5,
    notes: "128×128, grilla 3×4 filas SWAD (3 frames de walk por dirección).",
  },

  arana: {
    type: "singleSheet",
    textureKeyPrefix: "arana",
    path: "/assets/ao/imperium/mobs/npc_bodies/araña.png",
    frameWidth: 128,
    frameHeight: 128,
    columns: 4,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2],
    notes: "256×256, filas SWAD.",
  },

  oso: {
    type: "directionSheets",
    textureKeyPrefix: "oso",
    frameWidth: 128,
    frameHeight: 128,
    columns: 4,
    paths: {
      down: "/assets/ao/imperium/mobs/npc_bodies/osoPardoS.png",
      up: "/assets/ao/imperium/mobs/npc_bodies/osoPardoW.png",
      left: "/assets/ao/imperium/mobs/npc_bodies/osoPardoA.png",
      right: "/assets/ao/imperium/mobs/npc_bodies/osoPardoD.png",
    },
    walkFrames: [0, 1, 2, 3, 4, 5, 6, 7],
    scale: mobScaleForFrameHeight(128, MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX) * 1.1,
    notes: "512×512 por PNG, grilla 4×4 de 128×128; 8 frames de animación por dirección.",
  },

  aprendiz_mago: {
    type: "singleSheet",
    textureKeyPrefix: "aprendizMago",
    path: "/assets/ao/imperium/mobs/npc_bodies/aprendizMago.png",
    frameWidth: 42,
    frameHeight: 64,
    columns: 6,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3, 4, 5],
    walkColumnCountByFacing: { left: 5, right: 5 },
    faceOverlay: {
      raceId: "gnome",
      genderId: "male",
      faceIndex: 7,
      faceDropY: 10,
      faceOffsetByFacing: {
        down: { x: 2, y: -2 },
        up: { x: 1, y: -2 },
        left: { x: -2, y: -2 },
        right: { x: 4, y: -2 },
      },
    },
    notes: "256×256, celdas 42×64; S/W 6 frames, A/D 5; túnica bajos + cara gnomo #7.",
  },

  aparicion: {
    type: "directionSheets",
    textureKeyPrefix: "aparicion",
    frameWidth: 170,
    frameHeight: 256,
    columns: 3,
    paths: {
      down: "/assets/ao/imperium/mobs/npc_bodies/aparicionS.png",
      up: "/assets/ao/imperium/mobs/npc_bodies/aparicionW.png",
      left: "/assets/ao/imperium/mobs/npc_bodies/aparicionA.png",
      right: "/assets/ao/imperium/mobs/npc_bodies/aparicionD.png",
    },
    walkFrames: [0, 1, 2, 3, 4],
    scale: mobScaleForFrameHeight(256, MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX) * 2.25,
    notes:
      "512×512 por PNG, grilla 3×2 (170×256): f1 c1–c3, f2 c1–c2. Sufijos S/W/A/D.",
  },

  golem_plata: {
    type: "directionSheets",
    textureKeyPrefix: "golemPlata",
    frameWidth: 170,
    frameHeight: 170,
    columns: 3,
    paths: {
      down: "/assets/ao/imperium/mobs/npc_bodies/golemPlataS.png",
      up: "/assets/ao/imperium/mobs/npc_bodies/golemPlataW.png",
      left: "/assets/ao/imperium/mobs/npc_bodies/golemPlataA.png",
      right: "/assets/ao/imperium/mobs/npc_bodies/golemPlataD.png",
    },
    walkFrames: [0, 1, 2, 3, 4, 5, 6, 7],
    scale: 0.8,
    notes:
      "512×512 por PNG, grilla 3×3 de 170×170; 8 frames (f1c1–c3, f2c1–c3, f3c1–c2). Sufijos S/W/A/D.",
  },

  golem_bronce: {
    type: "directionSheets",
    textureKeyPrefix: "golemBronce",
    frameWidth: 170,
    frameHeight: 170,
    columns: 3,
    paths: {
      down: "/assets/ao/imperium/mobs/npc_bodies/golemBronceS.png",
      up: "/assets/ao/imperium/mobs/npc_bodies/golemBronce3W.png",
      left: "/assets/ao/imperium/mobs/npc_bodies/golemBronce2A.png",
      right: "/assets/ao/imperium/mobs/npc_bodies/golemBronce4D.png",
    },
    walkFrames: [0, 1, 2, 3, 4, 5, 6, 7],
    scale: 0.8,
    notes:
      "Igual que gólem de plata: 512×512, grilla 3×3 de 170×170, 8 frames. PNG: S / 3W / 2A / 4D.",
  },

  golem_hielo: {
    type: "directionSheets",
    textureKeyPrefix: "golemHielo",
    frameWidth: 170,
    frameHeight: 256,
    columns: 3,
    paths: {
      down: "/assets/ao/imperium/mobs/npc_bodies/golemHieloS.png",
      up: "/assets/ao/imperium/mobs/npc_bodies/golemHieloW.png",
      left: "/assets/ao/imperium/mobs/npc_bodies/golemHieloA.png",
      right: "/assets/ao/imperium/mobs/npc_bodies/golemHieloD.png",
    },
    walkFrames: [0, 1, 2, 3, 4],
    scale: mobScaleForFrameHeight(256, MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX) * 0.85 * 3,
    notes:
      "512×512 por PNG, grilla 3×2 (170×256): f1 c1–c3, f2 c1–c2 (f2 c3 vacío). Sufijos S/W/A/D.",
  },

  goblin_mago: {
    type: "singleSheet",
    textureKeyPrefix: "goblinMago",
    path: "/assets/ao/imperium/mobs/npc_bodies/goblinMago.png",
    frameWidth: 42,
    frameHeight: 64,
    columns: 6,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3, 4, 5],
    walkColumnCountByFacing: { left: 5, right: 5 },
    scale: 1.125,
    notes: "256×256 SWAD, 6 cols × 4 filas (42×64); S/W 6 frames, A/D 5.",
  },

  basilisco: {
    type: "directionSheets",
    textureKeyPrefix: "basilisco",
    frameWidth: 128,
    frameHeight: 256,
    columns: 4,
    paths: {
      down: "/assets/ao/imperium/mobs/npc_bodies/basiliscoS.png",
      up: "/assets/ao/imperium/mobs/npc_bodies/basiliscoW.png",
      left: "/assets/ao/imperium/mobs/npc_bodies/basiliscoA.png",
      right: "/assets/ao/imperium/mobs/npc_bodies/basiliscoD.png",
    },
    walkFrames: [0, 1, 2, 3, 4, 5, 6, 7],
    scale: mobScaleForFrameHeight(256, MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX) * 3.0,
    notes: "512×512 por PNG, grilla 4×2 (128×256): 8 frames. Sufijos S/W/A/D.",
  },

  demonio: {
    type: "directionSheets",
    textureKeyPrefix: "demonio",
    frameWidth: 128,
    frameHeight: 256,
    columns: 4,
    paths: {
      down: "/assets/ao/imperium/mobs/npc_bodies/demonioS.png",
      up: "/assets/ao/imperium/mobs/npc_bodies/demonioW.png",
      left: "/assets/ao/imperium/mobs/npc_bodies/demonioA.png",
      right: "/assets/ao/imperium/mobs/npc_bodies/demonioD.png",
    },
    walkFrames: [0, 1, 2, 3, 4],
    scale: mobScaleForFrameHeight(256, MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX) * 2.1,
    notes: "512×512 por dirección, grilla 4×2 (128×256), 5 frames por dirección.",
  },

  chaman_nieves: {
    type: "singleSheet",
    textureKeyPrefix: "chamanDeLasNieves",
    path: "/assets/ao/imperium/mobs/npc_bodies/chamanDeLasNieves.png",
    frameWidth: 42,
    frameHeight: 64,
    columns: 6,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3, 4, 5],
    walkColumnCountByFacing: { left: 5, right: 5 },
    scale: 1.125 * 0.7,
    notes: "256×256 SWAD, 6 frames para S/W y 5 para A/D.",
  },

  ciclope: {
    type: "singleSheet",
    textureKeyPrefix: "ciclope",
    path: "/assets/ao/imperium/mobs/npc_bodies/ciclope.png",
    frameWidth: 85,
    frameHeight: 128,
    columns: 6,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3, 4, 5],
    walkColumnCountByFacing: { left: 5, right: 5 },
    scale: mobScaleForFrameHeight(128, MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX) * 1.55 * 0.7,
    notes: "512×512 SWAD, 6 frames para S/W y 5 para A/D.",
  },

  bruja_drow: {
    type: "singleSheet",
    textureKeyPrefix: "brujaDrow",
    path: "/assets/ao/imperium/mobs/npc_bodies/brujaDrow.png",
    frameWidth: 42,
    frameHeight: 64,
    columns: 6,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3, 4, 5],
    walkColumnCountByFacing: { left: 5, right: 5 },
    scale: 1.125,
    faceOverlay: {
      raceId: "drow",
      genderId: "female",
      faceIndex: 0,
      faceDropY: 0,
      faceOffsetByFacing: {
        down: { x: 1, y: -3 },
        up: { x: 1, y: -3 },
        left: { x: -3, y: -3 },
        right: { x: 6, y: -3 },
      },
    },
  },

  asesino: {
    type: "singleSheet",
    textureKeyPrefix: "asesino",
    path: "/assets/ao/imperium/mobs/npc_bodies/asesino.png",
    frameWidth: 42,
    frameHeight: 64,
    columns: 6,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3, 4, 5],
    walkColumnCountByFacing: { left: 5, right: 5 },
    scale: 1.125,
    faceOverlay: {
      raceId: "drow",
      genderId: "male",
      faceIndex: 8,
      faceDropY: 0,
      faceOffsetByFacing: {
        down: { x: 3, y: -3 },
        up: { x: 2, y: -3 },
        left: { x: -3, y: -3 },
        right: { x: 6, y: -3 },
      },
    },
  },

  fango: {
    type: "singleSheet",
    textureKeyPrefix: "fango",
    path: "/assets/ao/imperium/mobs/npc_bodies/fango.png",
    frameWidth: 128,
    frameHeight: 128,
    columns: 4,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3],
    scale: mobScaleForFrameHeight(128, MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX) * 1.35 * 0.7,
    notes: "512×512 SWAD, grilla 4×4 de 128×128.",
  },

  esqueleto: {
    type: "singleSheet",
    textureKeyPrefix: "esqueleto",
    path: "/assets/ao/imperium/mobs/npc_bodies/esqueleto.png",
    frameWidth: 64,
    frameHeight: 64,
    columns: 4,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3],
    scale: mobScaleForFrameHeight(64),
    notes: "256×256 SWAD, grilla 4×4 de 64×64.",
  },

  escorpion: {
    type: "singleSheet",
    textureKeyPrefix: "escorpion",
    path: "/assets/ao/imperium/mobs/npc_bodies/escorpion.png",
    frameWidth: 32,
    frameHeight: 32,
    columns: 4,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3],
    scale: mobScaleForFrameHeight(32) * 0.85,
    notes: "128×128 SWAD, grilla 4×4 de 32×32.",
  },

  ent: {
    type: "singleSheet",
    textureKeyPrefix: "ent",
    path: "/assets/ao/imperium/mobs/npc_bodies/ent.png",
    frameWidth: 128,
    frameHeight: 128,
    columns: 4,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3],
    scale: mobScaleForFrameHeight(128, MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX) * 1.5,
    notes: "512×512 SWAD, grilla 4×4 de 128×128.",
  },

  duende: {
    type: "singleSheet",
    textureKeyPrefix: "duende",
    path: "/assets/ao/imperium/mobs/npc_bodies/duende.png",
    frameWidth: 48,
    frameHeight: 48,
    columns: 4,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3],
    scale: mobScaleForFrameHeight(48),
    notes: "192×192 SWAD, grilla 4×4 de 48×48.",
  },

  dragon_rojo: {
    type: "directionSheets",
    textureKeyPrefix: "dragonRojo",
    frameWidth: 512,
    frameHeight: 256,
    columns: 1,
    paths: {
      down: "/assets/ao/imperium/mobs/npc_bodies/dragonRojoS.png",
      up: "/assets/ao/imperium/mobs/npc_bodies/dragonRojoW.png",
      left: "/assets/ao/imperium/mobs/npc_bodies/dragonRojoA.png",
      right: "/assets/ao/imperium/mobs/npc_bodies/dragonRojoD.png",
    },
    walkFrames: [0, 1],
    directionLayout: {
      up: {
        frameWidth: 512,
        frameHeight: 512,
        walkFrames: [0],
      },
    },
    scale: mobScaleForFrameHeight(256, MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX) * 2.3,
    notes: "512×512 por PNG. S/A/D: 1 col × 2 filas (512×256). W: 1 col × 1 fila.",
  },

  cuervo: {
    type: "singleSheet",
    textureKeyPrefix: "cuervo",
    path: "/assets/ao/imperium/mobs/npc_bodies/cuervo.png",
    frameWidth: 64,
    frameHeight: 32,
    columns: 2,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1],
    scale: mobScaleForFrameHeight(32) * 0.9,
    notes: "128×128 SWAD, 4 filas × 2 columnas, 2 frames por orientación.",
  },

  training_dummy: {
    type: "singleSheet",
    textureKeyPrefix: "training_dummy",
    path: "/assets/ao/imperium/mobs/npc_bodies/armaduraEncantada.png",
    frameWidth: 32,
    frameHeight: 48,
    columns: 6,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [1, 2, 3, 4, 5],
    mirrorRightFromLeft: false,
  },

  goblin: {
    type: "singleSheet",
    textureKeyPrefix: "goblin",
    path: "/assets/ao/imperium/mobs/npc_bodies/goblin.png",
    frameWidth: 128,
    frameHeight: 128,
    columns: 4,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3],
    scale: mobScaleForFrameHeight(128, MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX),
    notes: "512×512 SWAD, grilla 4×4 de 128×128; 4 frames de caminar por dirección.",
  },

  guardia: {
    type: "singleSheet",
    textureKeyPrefix: "guardia",
    path: "/assets/ao/imperium/mobs/npc_bodies/armaduraEncantada.png",
    frameWidth: 32,
    frameHeight: 48,
    columns: 6,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [1, 2, 3, 4, 5],
    mirrorRightFromLeft: false,
  },

  golem_infernal: {
    type: "directionSheets",
    textureKeyPrefix: "golemInfernal",
    frameWidth: 150,
    frameHeight: 180,
    columns: 8,
    paths: {
      down: "/assets/ao/imperium/mobs/npc_bodies/golemInfernalS.png",
      up: "/assets/ao/imperium/mobs/npc_bodies/golemInfernal2W.png",
      left: "/assets/ao/imperium/mobs/npc_bodies/golemInfernalA.png",
      right: "/assets/ao/imperium/mobs/npc_bodies/golemInfernalA.png", // Mirrored
    },
    walkFrames: [0, 1, 2, 3, 4, 5, 6, 7],
    mirrorRightFromLeft: true,
    scale: 0.85,
    notes: "Golem infernal: 1200×180 por PNG, grilla 8×1. Espejado derecha.",
  },

  golem_piedra: {
    type: "directionSheets",
    textureKeyPrefix: "golemPiedra",
    frameWidth: 140,
    frameHeight: 170,
    columns: 8,
    paths: {
      down: "/assets/ao/imperium/mobs/npc_bodies/golemPiedraS.png",
      up: "/assets/ao/imperium/mobs/npc_bodies/golemPiedraW.png",
      left: "/assets/ao/imperium/mobs/npc_bodies/golemPiedraA.png",
      right: "/assets/ao/imperium/mobs/npc_bodies/golemPiedraD.png",
    },
    walkFrames: [0, 1, 2, 3, 4, 5, 6, 7],
    scale: 0.8,
    notes: "Golem de piedra: 1120×170 por PNG, grilla 8×1.",
  },

  hormiga: {
    type: "singleSheet",
    textureKeyPrefix: "hormiga",
    path: "/assets/ao/imperium/mobs/npc_bodies/hormiga.png",
    frameWidth: 32,
    frameHeight: 25,
    columns: 3,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2],
    scale: mobScaleForFrameHeight(25) * 0.5,
    notes: "96×100 SWAD, grilla 3×4.",
  },

  huargo: {
    type: "singleSheet",
    textureKeyPrefix: "huargo",
    path: "/assets/ao/imperium/mobs/npc_bodies/huargo.png",
    frameWidth: 78,
    frameHeight: 72,
    columns: 6,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3, 4, 5],
    scale: mobScaleForFrameHeight(72) * 1.2,
    notes: "468×288 SWAD, grilla 6×4.",
  },

  leviatan: {
    type: "singleSheet",
    textureKeyPrefix: "leviatan",
    path: "/assets/ao/imperium/mobs/npc_bodies/leviatan.png",
    frameWidth: 328,
    frameHeight: 200,
    columns: 5,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3, 4],
    walkColumnCountByFacing: { left: 4, right: 4 },
    scale: 1.0,
    notes: "Leviatán: 1640x800 SWAD, grilla 5x4. S/W 5 frames, A/D 4.",
  },

  sirena: {
    type: "singleSheet",
    textureKeyPrefix: "sirena",
    path: "/assets/ao/imperium/mobs/npc_bodies/sirena.png",
    frameWidth: 132,
    frameHeight: 110,
    columns: 5,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3, 4],
    walkColumnCountByFacing: { left: 4, right: 4 },
    scale: mobScaleForFrameHeight(110, MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX) * 0.95,
    notes: "Sirena: 660x440 SWAD, grilla 5x4. S/W 5 frames, A/D 4.",
  },

  lobo_invernal: {
    type: "singleSheet",
    textureKeyPrefix: "loboInvernal",
    path: "/assets/ao/imperium/mobs/npc_bodies/loboInvernal.png",
    frameWidth: 74,
    frameHeight: 49,
    columns: 4,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3],
    scale: mobScaleForFrameHeight(49) * 1.1,
    notes: "296x196 SWAD, grilla 4x4.",
  },

  rata: {
    type: "singleSheet",
    textureKeyPrefix: "rata",
    path: "/assets/ao/imperium/mobs/npc_bodies/loboInvernal.png",
    frameWidth: 74,
    frameHeight: 49,
    columns: 4,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3],
    scale: 1,
    notes: "Falta spritesheet original",
  },
  cracko: {
    type: "singleSheet",
    textureKeyPrefix: "cracko",
    path: "/assets/ao/imperium/mobs/npc_bodies/loboInvernal.png",
    frameWidth: 74,
    frameHeight: 49,
    columns: 4,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3],
    scale: 1,
    notes: "Falta spritesheet original",
  },
  yeti: {
    type: "singleSheet",
    textureKeyPrefix: "yeti",
    path: "/assets/ao/imperium/mobs/npc_bodies/loboInvernal.png",
    frameWidth: 74,
    frameHeight: 49,
    columns: 4,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3],
    scale: 1,
    notes: "Falta spritesheet original",
  },
  zombie: {
    type: "singleSheet",
    textureKeyPrefix: "zombie",
    path: "/assets/ao/imperium/mobs/npc_bodies/loboInvernal.png",
    frameWidth: 74,
    frameHeight: 49,
    columns: 4,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3],
    scale: 1,
    notes: "Falta spritesheet original",
  },
  hombre_lagarto: {
    type: "singleSheet",
    textureKeyPrefix: "hombre_lagarto",
    path: "/assets/ao/imperium/mobs/npc_bodies/loboInvernal.png",
    frameWidth: 74,
    frameHeight: 49,
    columns: 4,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3],
    scale: 1,
    notes: "Falta spritesheet original",
  },
  demonio_abisal: {
    type: "singleSheet",
    textureKeyPrefix: "demonio_abisal",
    path: "/assets/ao/imperium/mobs/npc_bodies/loboInvernal.png",
    frameWidth: 74,
    frameHeight: 49,
    columns: 4,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3],
    scale: 1,
    notes: "Falta spritesheet original",
  },

  wisp: {
    type: "singleSheet",
    textureKeyPrefix: "wisp",
    path: "/assets/ao/imperium/mobs/npc_bodies/luciernaga.png",
    frameWidth: 15,
    frameHeight: 15,
    columns: 8,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3, 4, 5, 6, 7],
    scale: 2.0,
    notes: "Wisp (Luciérnaga): 120×60 SWAD, grilla 8×4.",
  },

  ogro: {
    type: "singleSheet",
    textureKeyPrefix: "ogro",
    path: "/assets/ao/imperium/mobs/npc_bodies/ogro.png",
    frameWidth: 57,
    frameHeight: 98,
    columns: 6,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3, 4, 5],
    scale: mobScaleForFrameHeight(98, MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX) * 1.2,
    notes: "342×392 SWAD, grilla 6×4.",
  },

  ogro_esclavo: {
    type: "singleSheet",
    textureKeyPrefix: "ogroEsclavo",
    path: "/assets/ao/imperium/mobs/npc_bodies/ogroEsclavo.png",
    frameWidth: 57,
    frameHeight: 98,
    columns: 6,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3, 4, 5],
    scale: mobScaleForFrameHeight(98, MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX) * 1.0,
    notes: "Ogro Esclavo: 342×392 SWAD, grilla 6×4.",
  },

  ogro_lider: {
    type: "singleSheet",
    textureKeyPrefix: "ogroLider",
    path: "/assets/ao/imperium/mobs/npc_bodies/ogroLider.png",
    frameWidth: 57,
    frameHeight: 99,
    columns: 6,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3, 4, 5],
    scale: mobScaleForFrameHeight(99, MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX) * 1.4,
    notes: "Ogro Líder: 342×396 SWAD, grilla 6×4.",
  },

  pirata_arquero: {
    type: "singleSheet",
    textureKeyPrefix: "pirataArquero",
    path: "/assets/ao/imperium/npc_bodies/body_110.png",
    frameWidth: 26,
    frameHeight: 46,
    columns: 6,
    directionRows: MOB_DIRECTION_ROWS_WDSA,
    idleColumn: 0,
    walkFrames: [1, 2, 3, 4, 5],
    notes: "Placeholder usando body_110.png (catálogo).",
  },

  pirata_guerrero: {
    type: "singleSheet",
    textureKeyPrefix: "pirataGuerrero",
    path: "/assets/ao/imperium/npc_bodies/body_110.png",
    frameWidth: 26,
    frameHeight: 46,
    columns: 6,
    directionRows: MOB_DIRECTION_ROWS_WDSA,
    idleColumn: 0,
    walkFrames: [1, 2, 3, 4, 5],
    notes: "Placeholder usando body_110.png (catálogo).",
  },
};
