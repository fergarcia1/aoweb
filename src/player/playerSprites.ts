import Phaser from "phaser";

const FRAME_W = 32;
const FRAME_H = 48;
const SHEET_COLS = 6;
const FRAME_INSET = 0;

export type Outfit =
  | "base"
  | "citizen"
  | "cuero"
  | "placas"
  | "placasRojas"
  | "placasAzules";

/** Variante base (sin armadura) y ropa de ciudadano equipable. */
const PLAYER_TEXTURE_KEYS: Record<Outfit, string> = {
  base: "human_male_base",
  citizen: "armor_citizen_clothes_std",
  cuero: "armor_cuero_std",
  placas: "armor_placas_std",
  placasRojas: "armor_placas_rojas_std",
  placasAzules: "armor_placas_azules_std",
};
const OUTFIT_FEET_OFFSET: Record<Outfit, { x: number; y: number }> = {
  base: { x: 0, y: 0 },
  citizen: { x: 0, y: 0 },
  cuero: { x: 0, y: 0 },
  placas: { x: 0, y: 0 },
  placasRojas: { x: 0, y: 0 },
  placasAzules: { x: 0, y: 0 },
};
const PLAYER_SHEET_PATHS: Record<Outfit, string> = {
  base: "/assets/ao/razes/human_male_base.png",
  citizen: "/assets/ao/_normalized/player_citizen.png",
  cuero: "/assets/ao/armors/armor_cuero_std.png",
  placas: "/assets/ao/armors/armor_placas_std.png",
  placasRojas: "/assets/ao/armors/armor_placasRojas_std.png",
  placasAzules: "/assets/ao/armors/armor_placasAzules_std.png",
};
const playerInsetAliases = new Map<string, string>();

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

const DIR_FRAME_COUNT: Record<Facing, number> = {
  down: 5,
  up: 5,
  left: 5,
  right: 5,
};
const DIR_FRAME_RATE: Record<Facing, number> = {
  down: 9,
  up: 9,
  left: 7,
  right: 7,
};
const DIR_YOYO: Record<Facing, boolean> = {
  down: false,
  up: false,
  left: true,
  right: true,
};

export const FACING_BY_KEY = {
  S: "down",
  W: "up",
  D: "right",
  A: "left",
} as const satisfies Record<string, Facing>;

export function registerPlayerSprites(scene: Phaser.Scene): void {
  for (const outfit of Object.keys(PLAYER_TEXTURE_KEYS) as Outfit[]) {
    scene.load.spritesheet(PLAYER_TEXTURE_KEYS[outfit], PLAYER_SHEET_PATHS[outfit], {
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
    });
  }
}

export function setupPlayerTexture(scene: Phaser.Scene): void {
  playerInsetAliases.clear();

  for (const outfit of Object.keys(PLAYER_TEXTURE_KEYS) as Outfit[]) {
    const texture = scene.textures.get(PLAYER_TEXTURE_KEYS[outfit]);
    if (texture.key !== "__MISSING") {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }
}

function frameIndex(facing: Facing, frame: number): number {
  return DIR_ROW[facing] * SHEET_COLS + frame;
}

function registerInsetFrame(
  texture: Phaser.Textures.Texture,
  textureKey: string,
  frameIdx: number
): string {
  const aliasKey = `${textureKey}:${frameIdx}`;
  const existing = playerInsetAliases.get(aliasKey);
  if (existing) {
    return existing;
  }

  const col = frameIdx % SHEET_COLS;
  const row = Math.floor(frameIdx / SHEET_COLS);
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

export function registerPlayerAnimations(scene: Phaser.Scene): void {
  const facings: Facing[] = ["down", "up", "right", "left"];

  for (const outfit of Object.keys(PLAYER_TEXTURE_KEYS) as Outfit[]) {
    for (const facing of facings) {
      const count = DIR_FRAME_COUNT[facing];
      const start = frameIndex(facing, 0);
      const end = frameIndex(facing, count - 1);
      const textureKey = PLAYER_TEXTURE_KEYS[outfit];
      const texture = scene.textures.get(textureKey);
      const frames: Phaser.Types.Animations.AnimationFrame[] = [];

      for (let idx = start; idx <= end; idx++) {
        const frameName = registerInsetFrame(texture, textureKey, idx);
        frames.push({ key: textureKey, frame: frameName });
      }

      scene.anims.create({
        key: playerAnimationKey("walk", facing, outfit),
        frames,
        frameRate: DIR_FRAME_RATE[facing],
        yoyo: DIR_YOYO[facing],
        repeat: -1,
      });

      scene.anims.create({
        key: playerAnimationKey("idle", facing, outfit),
        frames: [frames[0]],
        frameRate: 1,
      });
    }
  }
}

export function playerAnimationKey(
  state: "walk" | "idle",
  facing: Facing,
  outfit: Outfit
) {
  return `${state}_${facing}_${outfit}`;
}

export function textureKeyForOutfit(outfit: Outfit): string {
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
