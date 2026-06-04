import Phaser from "phaser";
import { normalizeFactionId } from "../../shared/faction";
import type { CharacterFactionId } from "../../shared/faction";

export type MeditationVisualTier = "lvl1" | "lvl20" | "lvl40";
export type MeditationVisualGroup = "imperial" | "renegado" | "caos";

export type MeditationVisualConfig = {
  key: string;
  animKey: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameRate: number;
  displayHeight: number;
  alpha: number;
  tint?: number;
};

const FRAME_COUNT = 10;
const MEDITATION_DISPLAY_SCALE = 2;
export const MEDITATION_FX_OFFSET_Y = 8;

export const MEDITATION_VISUALS: Record<MeditationVisualGroup, Record<MeditationVisualTier, MeditationVisualConfig>> = {
  imperial: {
    lvl1: {
      key: "meditation_imperial_lvl1",
      animKey: "meditation_imperial_lvl1_anim",
      path: "/assets/ao/meditations/imperialLvl1Meditation.png",
      frameWidth: 51,
      frameHeight: 128,
      frameCount: FRAME_COUNT,
      frameRate: 10,
      displayHeight: 86,
      alpha: 0.78,
    },
    lvl20: {
      key: "meditation_imperial_lvl20",
      animKey: "meditation_imperial_lvl20_anim",
      path: "/assets/ao/meditations/imperialLvl20Meditation.png",
      frameWidth: 102,
      frameHeight: 256,
      frameCount: FRAME_COUNT,
      frameRate: 10,
      displayHeight: 104,
      alpha: 0.8,
    },
    lvl40: {
      key: "meditation_imperial_lvl40",
      animKey: "meditation_imperial_lvl40_anim",
      path: "/assets/ao/meditations/imperialLvl40Meditation.png",
      frameWidth: 120,
      frameHeight: 255,
      frameCount: FRAME_COUNT,
      frameRate: 11,
      displayHeight: 120,
      alpha: 0.82,
    },
  },
  renegado: {
    lvl1: {
      key: "meditation_renegado_lvl1",
      animKey: "meditation_renegado_lvl1_anim",
      path: "/assets/ao/meditations/reneLvl1Meditation.png",
      frameWidth: 51,
      frameHeight: 128,
      frameCount: FRAME_COUNT,
      frameRate: 10,
      displayHeight: 86,
      alpha: 0.74,
    },
    lvl20: {
      key: "meditation_renegado_lvl20",
      animKey: "meditation_renegado_lvl20_anim",
      path: "/assets/ao/meditations/reneLvl20Meditation.png",
      frameWidth: 51,
      frameHeight: 128,
      frameCount: FRAME_COUNT,
      frameRate: 10,
      displayHeight: 104,
      alpha: 0.78,
    },
    lvl40: {
      key: "meditation_renegado_lvl40",
      animKey: "meditation_renegado_lvl40_anim",
      path: "/assets/ao/meditations/reneLvl40Meditation.png",
      frameWidth: 120,
      frameHeight: 255,
      frameCount: FRAME_COUNT,
      frameRate: 11,
      displayHeight: 120,
      alpha: 0.8,
    },
  },
  caos: {
    lvl1: {
      key: "meditation_caos_lvl1",
      animKey: "meditation_caos_lvl1_anim",
      path: "/assets/ao/meditations/reneLvl1Meditation.png",
      frameWidth: 51,
      frameHeight: 128,
      frameCount: FRAME_COUNT,
      frameRate: 10,
      displayHeight: 86,
      alpha: 0.78,
      tint: 0xff3535,
    },
    lvl20: {
      key: "meditation_caos_lvl20",
      animKey: "meditation_caos_lvl20_anim",
      path: "/assets/ao/meditations/caosLvl20Meditation.png",
      frameWidth: 51,
      frameHeight: 128,
      frameCount: FRAME_COUNT,
      frameRate: 10,
      displayHeight: 104,
      alpha: 0.8,
    },
    lvl40: {
      key: "meditation_caos_lvl40",
      animKey: "meditation_caos_lvl40_anim",
      path: "/assets/ao/meditations/caosLvl40Meditation.png",
      frameWidth: 120,
      frameHeight: 255,
      frameCount: FRAME_COUNT,
      frameRate: 11,
      displayHeight: 120,
      alpha: 0.82,
    },
  },
};

export function getMeditationTier(level: number): MeditationVisualTier {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  if (safeLevel >= 40) return "lvl40";
  if (safeLevel >= 20) return "lvl20";
  return "lvl1";
}

export function getMeditationGroup(factionId: unknown): MeditationVisualGroup {
  const faction = normalizeFactionId(factionId) as CharacterFactionId;
  if (faction === "caos") return "caos";
  if (faction === "renegado") return "renegado";
  return "imperial";
}

export function getMeditationVisualConfig(
  factionId: unknown,
  level: number
): MeditationVisualConfig {
  return MEDITATION_VISUALS[getMeditationGroup(factionId)][getMeditationTier(level)];
}

export function registerMeditationAnimations(scene: Phaser.Scene): void {
  for (const group of Object.values(MEDITATION_VISUALS)) {
    for (const config of Object.values(group)) {
      if (scene.anims.exists(config.animKey)) {
        continue;
      }
      scene.anims.create({
        key: config.animKey,
        frames: scene.anims.generateFrameNumbers(config.key, {
          start: 0,
          end: config.frameCount - 1,
        }),
        frameRate: config.frameRate,
        repeat: -1,
      });
    }
  }
}

export function preloadMeditationVisuals(scene: Phaser.Scene): void {
  const seen = new Set<string>();
  for (const group of Object.values(MEDITATION_VISUALS)) {
    for (const config of Object.values(group)) {
      if (seen.has(config.key)) {
        continue;
      }
      seen.add(config.key);
      scene.load.spritesheet(config.key, config.path, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
      });
    }
  }
}

export function applyMeditationSpriteVisuals(
  sprite: Phaser.GameObjects.Sprite,
  config: MeditationVisualConfig
): void {
  const displayHeight = config.displayHeight * MEDITATION_DISPLAY_SCALE;
  sprite
    .setOrigin(0.5, 1)
    .setAlpha(config.alpha)
    .setDisplaySize(
      Math.max(1, Math.round((config.frameWidth / config.frameHeight) * displayHeight)),
      displayHeight
    )
    .setBlendMode(Phaser.BlendModes.ADD);
  if (config.tint != null) {
    sprite.setTint(config.tint);
  } else {
    sprite.clearTint();
  }
}
