import Phaser from "phaser";
import { STEP_DURATION_MS } from "../config";
import { GHOST_MOVE_SPEED_RATIO } from "../game/deathConfig";
import type { CharacterGenderId, CharacterRaceId } from "../data/characters";
import {
  armorBajosTextureKey,
  inferBajosSpritesheetPath,
  isShortRace,
} from "../game/armorUtils";
import type { Outfit } from "../../game-data/outfits";

export type { Outfit };

const FRAME_W = 32;
const FRAME_H = 48;
const SHEET_COLS = 6;
const FRAME_INSET = 0;

export function raceBodyTextureKey(
  raceId: CharacterRaceId,
  genderId: CharacterGenderId
): string {
  if (raceId === "fantasma") {
    return "fantasma_std";
  }
  if (raceId === "gnome" && genderId === "female") {
    return "gnome_base_female";
  }
  return `${raceId}_${genderId}_base`;
}

const RACE_BODY_ENTRIES: Array<{ raceId: CharacterRaceId; genderId: CharacterGenderId }> = [
  { raceId: "human", genderId: "male" },
  { raceId: "human", genderId: "female" },
  { raceId: "elf", genderId: "male" },
  { raceId: "elf", genderId: "female" },
  { raceId: "drow", genderId: "male" },
  { raceId: "drow", genderId: "female" },
  { raceId: "dwarf", genderId: "male" },
  { raceId: "dwarf", genderId: "female" },
  { raceId: "gnome", genderId: "male" },
  { raceId: "gnome", genderId: "female" },
  { raceId: "orc", genderId: "male" },
  { raceId: "orc", genderId: "female" },
  { raceId: "fantasma", genderId: "male" },
];

function raceBodyAssetPath(raceId: CharacterRaceId, genderId: CharacterGenderId): string {
  const key = raceBodyTextureKey(raceId, genderId);
  if (raceId === "fantasma") {
    return `/assets/ao/razes/fantasma_std.png`;
  }
  return `/assets/ao/razes/${key}.png`;
}

const RACE_BODY_PATHS: Record<string, string> = Object.fromEntries(
  RACE_BODY_ENTRIES.map(({ raceId, genderId }) => {
    const key = raceBodyTextureKey(raceId, genderId);
    return [key, raceBodyAssetPath(raceId, genderId)];
  })
);

/** Armaduras y ropa equipable (el cuerpo base va por raza). */
const PLAYER_TEXTURE_KEYS: Record<Exclude<Outfit, "base">, string> = {
  citizen: "citizenClothesBajos_std",
  cuero: "cuero_std",
  placas: "placas_std",
  placasRojas: "placasRojas_std",
  placasAzules: "placasAzules_std",
  tunicaNigro: "tunicaNigro_std",
  tunicaAzul: "tunicaAzul_std",
  tunicaCruz: "tunicaCruz_Std",
  dragonNegro: "dragonNegro_std",
  dragonNegroBajos: "dragonNegroBajos_std",
  dragonBlanco: "dragonBlanco_std",
  dragonBlancoBajos: "dragonBlancoBajos_std",
  dragonRojo: "dragonRojo_std",
  dragonRojoBajos: "dragonRojoBajos_std",
};
const OUTFIT_FEET_OFFSET: Record<Outfit, { x: number; y: number }> = {
  base: { x: 0, y: 0 },
  citizen: { x: 0, y: 0 },
  cuero: { x: 0, y: 0 },
  placas: { x: 0, y: 0 },
  placasRojas: { x: 0, y: 0 },
  placasAzules: { x: 0, y: 0 },
  tunicaNigro: { x: 0, y: 0 },
  tunicaAzul: { x: 0, y: 0 },
  tunicaCruz: { x: 0, y: 0 },
  dragonNegro: { x: 0, y: 0 },
  dragonNegroBajos: { x: 0, y: 0 },
  dragonBlanco: { x: 0, y: 0 },
  dragonBlancoBajos: { x: 0, y: 0 },
  dragonRojo: { x: 0, y: 0 },
  dragonRojoBajos: { x: 0, y: 0 },
};
const PLAYER_SHEET_PATHS: Record<Exclude<Outfit, "base">, string> = {
  citizen: "/assets/ao/armors/citizenClothesBajos_std.png",
  cuero: "/assets/ao/armors/cuero_std.png",
  placas: "/assets/ao/armors/placas_std.png",
  placasRojas: "/assets/ao/armors/placasRojas_std.png",
  placasAzules: "/assets/ao/armors/placasAzules_std.png",
  tunicaNigro: "/assets/ao/armors/tunicaNigro_std.png",
  tunicaAzul: "/assets/ao/armors/tunicaAzul_std.png",
  tunicaCruz: "/assets/ao/armors/tunicaCruz_Std.png",
  dragonNegro: "/assets/ao/armors/dragonNegro_std.png",
  dragonNegroBajos: "/assets/ao/armors/dragonNegroBajos_std.png",
  dragonBlanco: "/assets/ao/armors/dragonBlanco_std.png",
  dragonBlancoBajos: "/assets/ao/armors/dragonBlancoBajos_std.png",
  dragonRojo: "/assets/ao/armors/dragonRojo_std.png",
  dragonRojoBajos: "/assets/ao/armors/dragonRojoBajos_std.png",
};

const PLAYER_BAJOS_TEXTURE_KEYS: Record<Exclude<Outfit, "base">, string> = {
  citizen: PLAYER_TEXTURE_KEYS.citizen,
  cuero: armorBajosTextureKey(PLAYER_TEXTURE_KEYS.cuero),
  placas: armorBajosTextureKey(PLAYER_TEXTURE_KEYS.placas),
  placasRojas: armorBajosTextureKey(PLAYER_TEXTURE_KEYS.placasRojas),
  placasAzules: armorBajosTextureKey(PLAYER_TEXTURE_KEYS.placasAzules),
  tunicaNigro: armorBajosTextureKey(PLAYER_TEXTURE_KEYS.tunicaNigro),
  tunicaAzul: armorBajosTextureKey(PLAYER_TEXTURE_KEYS.tunicaAzul),
  tunicaCruz: armorBajosTextureKey(PLAYER_TEXTURE_KEYS.tunicaCruz),
  dragonNegro: armorBajosTextureKey(PLAYER_TEXTURE_KEYS.dragonNegro),
  dragonNegroBajos: PLAYER_TEXTURE_KEYS.dragonNegroBajos,
  dragonBlanco: armorBajosTextureKey(PLAYER_TEXTURE_KEYS.dragonBlanco),
  dragonBlancoBajos: PLAYER_TEXTURE_KEYS.dragonBlancoBajos,
  dragonRojo: armorBajosTextureKey(PLAYER_TEXTURE_KEYS.dragonRojo),
  dragonRojoBajos: PLAYER_TEXTURE_KEYS.dragonRojoBajos,
};

const PLAYER_BAJOS_SHEET_PATHS: Record<Exclude<Outfit, "base">, string> = {
  citizen: PLAYER_SHEET_PATHS.citizen,
  cuero: inferBajosSpritesheetPath(PLAYER_SHEET_PATHS.cuero),
  placas: inferBajosSpritesheetPath(PLAYER_SHEET_PATHS.placas),
  placasRojas: inferBajosSpritesheetPath(PLAYER_SHEET_PATHS.placasRojas),
  placasAzules: inferBajosSpritesheetPath(PLAYER_SHEET_PATHS.placasAzules),
  tunicaNigro: inferBajosSpritesheetPath(PLAYER_SHEET_PATHS.tunicaNigro),
  tunicaAzul: inferBajosSpritesheetPath(PLAYER_SHEET_PATHS.tunicaAzul),
  tunicaCruz: inferBajosSpritesheetPath(PLAYER_SHEET_PATHS.tunicaCruz),
  dragonNegro: inferBajosSpritesheetPath(PLAYER_SHEET_PATHS.dragonNegro),
  dragonNegroBajos: PLAYER_SHEET_PATHS.dragonNegroBajos,
  dragonBlanco: inferBajosSpritesheetPath(PLAYER_SHEET_PATHS.dragonBlanco),
  dragonBlancoBajos: PLAYER_SHEET_PATHS.dragonBlancoBajos,
  dragonRojo: inferBajosSpritesheetPath(PLAYER_SHEET_PATHS.dragonRojo),
  dragonRojoBajos: PLAYER_SHEET_PATHS.dragonRojoBajos,
};

export type PlayerArmorVisualOptions = {
  clasesBajas?: boolean;
  spritesheetStdPath?: string;
  spritesheetBajosPath?: string;
};

const playerInsetAliases = new Map<string, string>();
const dynamicArmorTexturePaths = new Map<string, string>();

export type Facing = "down" | "up" | "right" | "left";

/**
 * Filas en player_std1.png (orden 1105.png STD1):
 * 0=S, 1=W, 2=A, 3=D
 */
const DIR_ROW: Record<Facing, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
};

/**
 * Columnas de caminata por fila SWAD en hojas 192×192 (armaduras / cuerpo).
 * S/W: 6 cols (0–5). A/D: 4 cols de caminar (1–4; c0 idle, c5 vacía).
 */
export const DIR_WALK_COLUMNS: Record<Facing, number> = {
  down: 6,
  up: 6,
  left: 4,
  right: 4,
};

/** @deprecated Usar `DIR_WALK_COLUMNS.left`. */
export const PROFILE_WALK_FRAME_COUNT = DIR_WALK_COLUMNS.left;

const DIR_WALK_START_COL: Record<Facing, number> = {
  down: 0,
  up: 0,
  left: 1,
  right: 1,
};

type BodyAnimLayout = {
  sheetCols: number;
  walkColumns: Record<Facing, number>;
  walkStartCol: Record<Facing, number>;
  /** Duración del paso vs jugador vivo (1.2 = 20 % más rápido). */
  moveSpeedRatio?: number;
};

const DEFAULT_BODY_ANIM: BodyAnimLayout = {
  sheetCols: SHEET_COLS,
  walkColumns: DIR_WALK_COLUMNS,
  walkStartCol: DIR_WALK_START_COL,
};

/** fantasma_std: 3 columnas, caminata 1→2→3 (cols 0–2). */
const BODY_ANIM_BY_TEXTURE: Partial<Record<string, BodyAnimLayout>> = {
  fantasma_std: {
    sheetCols: 3,
    walkColumns: { down: 3, up: 3, left: 3, right: 3 },
    walkStartCol: { down: 0, up: 0, left: 0, right: 0 },
    moveSpeedRatio: GHOST_MOVE_SPEED_RATIO,
  },
};

function bodyAnimLayout(textureKey: string): BodyAnimLayout {
  return BODY_ANIM_BY_TEXTURE[textureKey] ?? DEFAULT_BODY_ANIM;
}

/** AO recorre 1→N en loop; el perfil no usa ping-pong (yoyo). */
const DIR_YOYO: Record<Facing, boolean> = {
  down: false,
  up: false,
  left: false,
  right: false,
};

/** Escala global del frame rate de caminar (0.8 = 20 % más lento que el paso). */
const PLAYER_WALK_ANIM_FRAME_RATE_SCALE = 0.8;

/** Extra en armaduras/capas *_std (0.75 = 25 % más lento que el cuerpo). */
const ARMOR_WALK_ANIM_FRAME_RATE_SCALE = 0.75;

function computeWalkFrameRate(
  facing: Facing,
  frameCount: number,
  stepDurationMs = STEP_DURATION_MS,
  layerScale = 1
): number {
  const stepSeconds = stepDurationMs / 1000;
  const animScale = PLAYER_WALK_ANIM_FRAME_RATE_SCALE * layerScale;
  if (DIR_YOYO[facing]) {
    const yoyoSteps = Math.max(1, (frameCount - 1) * 2);
    return (yoyoSteps / stepSeconds) * animScale;
  }
  return (frameCount / stepSeconds) * animScale;
}

export function stepDurationMsForBodyTexture(textureKey: string): number {
  const ratio = bodyAnimLayout(textureKey).moveSpeedRatio;
  if (!ratio || ratio <= 0) {
    return STEP_DURATION_MS;
  }
  return Math.ceil(STEP_DURATION_MS / ratio);
}

export const FACING_BY_KEY = {
  S: "down",
  W: "up",
  D: "right",
  A: "left",
} as const satisfies Record<string, Facing>;

export function registerRaceBodySprites(scene: Phaser.Scene): void {
  for (const key of Object.keys(RACE_BODY_PATHS)) {
    scene.load.spritesheet(key, RACE_BODY_PATHS[key], {
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
    });
  }
}

function loadArmorSpritesheet(scene: Phaser.Scene, textureKey: string, assetPath: string): void {
  dynamicArmorTexturePaths.set(textureKey, assetPath);
  scene.load.spritesheet(textureKey, assetPath, {
    frameWidth: FRAME_W,
    frameHeight: FRAME_H,
  });
}

export function registerPlayerSprites(scene: Phaser.Scene): void {
  registerRaceBodySprites(scene);
  for (const outfit of Object.keys(PLAYER_TEXTURE_KEYS) as Array<Exclude<Outfit, "base">>) {
    loadArmorSpritesheet(scene, PLAYER_TEXTURE_KEYS[outfit], PLAYER_SHEET_PATHS[outfit]);
    const bajosKey = PLAYER_BAJOS_TEXTURE_KEYS[outfit];
    const bajosPath = PLAYER_BAJOS_SHEET_PATHS[outfit];
    if (bajosKey !== PLAYER_TEXTURE_KEYS[outfit]) {
      loadArmorSpritesheet(scene, bajosKey, bajosPath);
    }
  }
}

/** Registra un spritesheet de armadura con ruta explícita (p. ej. desde datos del ítem). */
export function registerArmorSpritesheet(
  scene: Phaser.Scene,
  textureKey: string,
  assetPath: string
): void {
  if (dynamicArmorTexturePaths.get(textureKey) === assetPath) {
    return;
  }
  loadArmorSpritesheet(scene, textureKey, assetPath);
}

export function setupPlayerTexture(scene: Phaser.Scene): void {
  playerInsetAliases.clear();

  for (const key of Object.keys(RACE_BODY_PATHS)) {
    const texture = scene.textures.get(key);
    if (texture.key !== "__MISSING") {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }

  for (const outfit of Object.keys(PLAYER_TEXTURE_KEYS) as Array<Exclude<Outfit, "base">>) {
    for (const textureKey of [
      PLAYER_TEXTURE_KEYS[outfit],
      PLAYER_BAJOS_TEXTURE_KEYS[outfit],
    ]) {
      const texture = scene.textures.get(textureKey);
      if (texture.key !== "__MISSING") {
        texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
  }

  for (const textureKey of dynamicArmorTexturePaths.keys()) {
    const texture = scene.textures.get(textureKey);
    if (texture.key !== "__MISSING") {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }
}

function frameIndex(facing: Facing, frame: number, sheetCols = SHEET_COLS): number {
  return DIR_ROW[facing] * sheetCols + frame;
}

function registerInsetFrame(
  texture: Phaser.Textures.Texture,
  textureKey: string,
  frameIdx: number,
  sheetCols = SHEET_COLS
): string {
  const aliasKey = `${textureKey}:${sheetCols}:${frameIdx}`;
  const existing = playerInsetAliases.get(aliasKey);
  if (existing) {
    return existing;
  }

  const col = frameIdx % sheetCols;
  const row = Math.floor(frameIdx / sheetCols);
  const alias = `player_inset_${textureKey}_${frameIdx}`;

  texture.add(
    alias,
    0,
    col * FRAME_W + FRAME_INSET,
    row * FRAME_H + FRAME_INSET,
    FRAME_W - FRAME_INSET * 2,
    FRAME_H - FRAME_INSET * 2
  );

  playerInsetAliases.set(aliasKey, alias);
  return alias;
}

function buildAnimationKey(
  state: "walk" | "idle",
  facing: Facing,
  animOutfitKey: string
): string {
  return `${state}_${facing}_${animOutfitKey}`;
}

function registerAnimationsForTexture(
  scene: Phaser.Scene,
  textureKey: string,
  animOutfitKey: string,
  walkLayerScale = 1
): void {
  const facings: Facing[] = ["down", "up", "right", "left"];
  const texture = scene.textures.get(textureKey);
  const layout = bodyAnimLayout(textureKey);
  const stepDurationMs = stepDurationMsForBodyTexture(textureKey);

  for (const facing of facings) {
    const walkColumnCount = layout.walkColumns[facing];
    const walkStartCol = layout.walkStartCol[facing];
    const walkFrames: Phaser.Types.Animations.AnimationFrame[] = [];

    for (let step = 0; step < walkColumnCount; step += 1) {
      const col = walkStartCol + step;
      const idx = frameIndex(facing, col, layout.sheetCols);
      const frameName = registerInsetFrame(texture, textureKey, idx, layout.sheetCols);
      walkFrames.push({ key: textureKey, frame: frameName });
    }

    const idleIdx = frameIndex(facing, 0, layout.sheetCols);
    const idleFrameName = registerInsetFrame(texture, textureKey, idleIdx, layout.sheetCols);

    scene.anims.create({
      key: buildAnimationKey("walk", facing, animOutfitKey),
      frames: walkFrames,
      frameRate: computeWalkFrameRate(
        facing,
        walkColumnCount,
        stepDurationMs,
        walkLayerScale
      ),
      yoyo: DIR_YOYO[facing],
      repeat: -1,
    });

    scene.anims.create({
      key: buildAnimationKey("idle", facing, animOutfitKey),
      frames: [{ key: textureKey, frame: idleFrameName }],
      frameRate: 1,
    });
  }
}

export function registerPlayerAnimations(scene: Phaser.Scene): void {
  for (const { raceId, genderId } of RACE_BODY_ENTRIES) {
    const bodyKey = raceBodyTextureKey(raceId, genderId);
    registerAnimationsForTexture(scene, bodyKey, `base_${bodyKey}`);
  }

  for (const outfit of Object.keys(PLAYER_TEXTURE_KEYS) as Array<Exclude<Outfit, "base">>) {
    registerAnimationsForTexture(
      scene,
      PLAYER_TEXTURE_KEYS[outfit],
      outfit,
      ARMOR_WALK_ANIM_FRAME_RATE_SCALE
    );
    const bajosKey = PLAYER_BAJOS_TEXTURE_KEYS[outfit];
    if (bajosKey !== PLAYER_TEXTURE_KEYS[outfit]) {
      registerAnimationsForTexture(
        scene,
        bajosKey,
        `${outfit}_bajos`,
        ARMOR_WALK_ANIM_FRAME_RATE_SCALE
      );
    }
  }

  for (const textureKey of dynamicArmorTexturePaths.keys()) {
    if (scene.anims.exists(`walk_down_${textureKey}`)) {
      continue;
    }
    registerAnimationsForTexture(
      scene,
      textureKey,
      textureKey,
      ARMOR_WALK_ANIM_FRAME_RATE_SCALE
    );
  }
}

export function playerAnimationKey(
  state: "walk" | "idle",
  facing: Facing,
  outfit: Outfit,
  baseBodyKey?: string,
  armorVisual?: PlayerArmorVisualOptions,
  raceId?: CharacterRaceId
): string {
  if (outfit === "base" && baseBodyKey) {
    return buildAnimationKey(state, facing, `base_${baseBodyKey}`);
  }
  if (outfit !== "base") {
    return buildAnimationKey(
      state,
      facing,
      resolveAnimOutfitKey(outfit, armorVisual, raceId)
    );
  }
  return buildAnimationKey(state, facing, outfit);
}

function shouldUseBajosArmorSheet(
  armorVisual?: PlayerArmorVisualOptions,
  raceId?: CharacterRaceId
): boolean {
  if (armorVisual?.clasesBajas === true) {
    return true;
  }
  return raceId != null && isShortRace(raceId);
}

/** Clave de animación registrada en preload (evita `citizen_bajos` si solo hay un spritesheet). */
function resolveAnimOutfitKey(
  outfit: Exclude<Outfit, "base">,
  armorVisual?: PlayerArmorVisualOptions,
  raceId?: CharacterRaceId
): string {
  if (armorVisual?.spritesheetStdPath || armorVisual?.spritesheetBajosPath) {
    const useBajos = shouldUseBajosArmorSheet(armorVisual, raceId);
    const assetPath = useBajos
      ? armorVisual.spritesheetBajosPath ??
        inferBajosSpritesheetPath(
          armorVisual.spritesheetStdPath ?? PLAYER_SHEET_PATHS[outfit]
        )
      : armorVisual.spritesheetStdPath ?? PLAYER_SHEET_PATHS[outfit];
    return textureKeyFromAssetPath(assetPath);
  }

  const useBajos = shouldUseBajosArmorSheet(armorVisual, raceId);
  if (!useBajos) {
    return outfit;
  }
  if (PLAYER_BAJOS_TEXTURE_KEYS[outfit] === PLAYER_TEXTURE_KEYS[outfit]) {
    return outfit;
  }
  const bajosPath = armorVisual?.spritesheetBajosPath;
  const stdPath = armorVisual?.spritesheetStdPath;
  if (
    bajosPath &&
    stdPath &&
    textureKeyFromAssetPath(bajosPath) === textureKeyFromAssetPath(stdPath)
  ) {
    return outfit;
  }
  return `${outfit}_bajos`;
}

function resolveArmorTextureKey(
  outfit: Exclude<Outfit, "base">,
  armorVisual?: PlayerArmorVisualOptions,
  raceId?: CharacterRaceId
): string {
  if (armorVisual?.spritesheetStdPath || armorVisual?.spritesheetBajosPath) {
    const useBajos = shouldUseBajosArmorSheet(armorVisual, raceId);
    const assetPath = useBajos
      ? armorVisual.spritesheetBajosPath ??
        inferBajosSpritesheetPath(armorVisual.spritesheetStdPath ?? PLAYER_SHEET_PATHS[outfit])
      : armorVisual.spritesheetStdPath ?? PLAYER_SHEET_PATHS[outfit];
    return textureKeyFromAssetPath(assetPath);
  }

  if (shouldUseBajosArmorSheet(armorVisual, raceId)) {
    return PLAYER_BAJOS_TEXTURE_KEYS[outfit];
  }
  return PLAYER_TEXTURE_KEYS[outfit];
}

/** Clave estable para preload/anims a partir de la ruta del png. */
export function textureKeyFromAssetPath(assetPath: string): string {
  const fileName = assetPath.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "");
  return fileName;
}

export function textureKeyForPlayer(
  outfit: Outfit,
  baseBodyKey: string,
  armorVisual?: PlayerArmorVisualOptions,
  raceId?: CharacterRaceId
): string {
  if (outfit === "base") {
    return baseBodyKey;
  }
  return resolveArmorTextureKey(outfit, armorVisual, raceId);
}

export function getDefaultArmorVisualForOutfit(
  outfit: Exclude<Outfit, "base">
): PlayerArmorVisualOptions {
  return {
    clasesBajas:
      outfit === "citizen" ||
      outfit === "dragonNegroBajos" ||
      outfit === "dragonBlancoBajos" ||
      outfit === "dragonRojoBajos",
    spritesheetStdPath: PLAYER_SHEET_PATHS[outfit],
    spritesheetBajosPath: PLAYER_BAJOS_SHEET_PATHS[outfit],
  };
}

/** @deprecated Usar textureKeyForPlayer(outfit, baseBodyKey) */
export function textureKeyForOutfit(outfit: Outfit): string {
  if (outfit === "base") {
    return raceBodyTextureKey("human", "male");
  }
  return PLAYER_TEXTURE_KEYS[outfit];
}

export function feetOffsetForOutfit(outfit: Outfit): { x: number; y: number } {
  return OUTFIT_FEET_OFFSET[outfit];
}

export function applyPlayerOrigin(sprite: Phaser.GameObjects.Sprite): void {
  sprite.setOrigin(0.5, 1);
}

export function tileToFeetWorld(tileX: number, tileY: number, tileSize: number) {
  return {
    x: tileX * tileSize + tileSize / 2,
    y: (tileY + 1) * tileSize,
  };
}
