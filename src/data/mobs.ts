import mobsRaw from "./mobs.json";
import { ALL_ITEM_IDS, type ItemId } from "../items/itemDefinitions";
import type { Facing } from "../player/playerSprites";
import { MOB_VISUAL_CONFIGS } from "../game/mobs/mobVisualConfig";
import { buildMobModelsFromVisualConfigs } from "../game/mobs/toMobModelConfig";

export type MobModelId =
  | "gallina"
  | "conejo"
  | "lobo"
  | "serpiente"
  | "arana"
  | "oso"
  | "golem_plata"
  | "aparicion"
  | "aprendiz_mago"
  | "asesino"
  | "basilisco"
  | "bruja_drow"
  | "demonio"
  | "chaman_nieves"
  | "ciclope"
  | "training_dummy";

export type MobId =
  | "gallina"
  | "conejo"
  | "lobo"
  | "serpiente"
  | "arana"
  | "oso"
  | "golem_plata"
  | "aparicion"
  | "aprendiz_mago"
  | "asesino"
  | "basilisco"
  | "bruja_drow"
  | "demonio"
  | "chaman_nieves"
  | "ciclope";

const MOB_IDS: MobId[] = [
  "gallina",
  "conejo",
  "lobo",
  "serpiente",
  "arana",
  "oso",
  "golem_plata",
  "aparicion",
  "aprendiz_mago",
  "asesino",
  "basilisco",
  "bruja_drow",
  "demonio",
  "chaman_nieves",
  "ciclope",
];
const MOB_MODEL_IDS: MobModelId[] = [
  "gallina",
  "conejo",
  "lobo",
  "serpiente",
  "arana",
  "oso",
  "golem_plata",
  "aparicion",
  "aprendiz_mago",
  "asesino",
  "basilisco",
  "bruja_drow",
  "demonio",
  "chaman_nieves",
  "ciclope",
  "training_dummy",
];
const GLOBAL_MOB_ATTACK_COOLDOWN_MS = 1000;

export type MobBehavior = "aggressive" | "peaceful";

export type MobDropConfig = {
  itemId: ItemId;
  chancePercent: number;
};

export type MobSpawnConfig = {
  id: string;
  mobId: MobId;
  name: string;
  behavior: MobBehavior;
  mapId: string;
  hitboxOffsetY: number;
  hitboxHeightTiles: number;
  hitboxWidthTiles: number;
  sizeTiles: number;
  modelId: MobModelId;
  maxHp: number;
  detectionRangeTiles: number;
  leashRangeTiles: number;
  attackDamage: number;
  attackCooldownMs: number;
  respawnMs: number;
  expReward: number;
  drops: MobDropConfig[];
};

export type MobDefinitionConfig = {
  mobId: MobId;
  name: string;
  behavior: MobBehavior;
  hitboxOffsetY: number;
  hitboxHeightTiles: number;
  hitboxWidthTiles: number;
  sizeTiles: number;
  modelId: MobModelId;
  maxHp: number;
  detectionRangeTiles: number;
  leashRangeTiles: number;
  attackDamage: number;
  attackCooldownMs: number;
  respawnMs: number;
  expReward: number;
  drops: MobDropConfig[];
};

export type MapMobSpawnConfig = {
  mapId: string;
  mobId: MobId;
  count: number;
};

export type MobModelConfig = {
  textureKey: string;
  texturePath: string;
  frameWidth: number;
  frameHeight: number;
  idleFrame: number;
  sheetCols: number;
  moveFrameCount: number;
  walkStartFrame?: number;
  walkAnimFrameCount?: number;
  mirrorRightFromLeft?: boolean;
  moveSpeedRatio?: number;
  dirAxis: "rows" | "columns";
  dirRows?: {
    down: number;
    up: number;
    left: number;
    right: number;
  };
  dirCols?: {
    down: number;
    up: number;
    left: number;
    right: number;
  };
  /** Frame base por dirección (grillas 2×2 u otras no alineadas a filas). */
  directionFrames?: Record<Facing, number>;
  /** Origen Y (0–1) por dirección; 1 = borde inferior del frame en Phaser. */
  facingOriginY?: Partial<Record<Facing, number>>;
  /** Columnas de animación de caminar (índices dentro de la fila SWAD). */
  walkColumns?: number[];
  visualType?: "singleSheet" | "directionSheets";
  textureKeysByFacing?: Partial<Record<Facing, string>>;
  texturePathsByFacing?: Partial<Record<Facing, string>>;
  visualOffsetY: number;
  scale: number;
};

/** Generado desde `MOB_VISUAL_CONFIGS` (fase 1 — contrato visual). */
export const MOB_MODELS: Record<MobModelId, MobModelConfig> =
  buildMobModelsFromVisualConfigs(MOB_VISUAL_CONFIGS);

export { MOB_VISUAL_CONFIGS } from "../game/mobs/mobVisualConfig";

function asMobBehavior(value: string | undefined): MobBehavior {
  if (value === "peaceful") return "peaceful";
  return "aggressive";
}

function asMobId(value: string): MobId {
  if ((MOB_IDS as readonly string[]).includes(value)) {
    return value as MobId;
  }
  throw new Error(`Mob no soportado: ${value}`);
}

function asMobModelId(value: string): MobModelId {
  if ((MOB_MODEL_IDS as readonly string[]).includes(value)) {
    return value as MobModelId;
  }
  throw new Error(`Modelo de mob no soportado: ${value}`);
}

function asItemId(value: string): ItemId {
  if ((ALL_ITEM_IDS as readonly string[]).includes(value)) {
    return value as ItemId;
  }
  throw new Error(`Item de drop no soportado: ${value}`);
}

export const MOB_DEFINITIONS: Record<MobId, MobDefinitionConfig> = Object.fromEntries(
  mobsRaw.mobs.map((mob) => [
    asMobId(mob.mobId),
    {
      mobId: asMobId(mob.mobId),
      name: mob.name,
      behavior: asMobBehavior(mob.behavior),
      hitboxOffsetY: Math.floor(mob.hitboxOffsetY),
      hitboxHeightTiles: Math.max(1, Math.floor(mob.hitboxHeightTiles ?? 2)),
      hitboxWidthTiles: Math.max(1, Math.floor(mob.hitboxWidthTiles ?? 1)),
      sizeTiles: Math.max(1, Math.floor(mob.sizeTiles)),
      modelId: asMobModelId(mob.modelId),
      maxHp: Math.max(1, Math.floor(mob.maxHp)),
      detectionRangeTiles: Math.max(1, Math.floor(mob.detectionRangeTiles)),
      leashRangeTiles: Math.max(1, Math.floor(mob.leashRangeTiles ?? 8)),
      attackDamage: Math.max(0, Math.floor(mob.attackDamage)),
      attackCooldownMs: GLOBAL_MOB_ATTACK_COOLDOWN_MS,
      respawnMs: Math.max(500, Math.floor(mob.respawnMs)),
      expReward: Math.max(0, Math.floor(mob.expReward)),
      drops: mob.drops.map((drop) => ({
        itemId: asItemId(drop.itemId),
        chancePercent: Math.min(100, Math.max(0, drop.chancePercent)),
      })),
    } satisfies MobDefinitionConfig,
  ])
) as Record<MobId, MobDefinitionConfig>;

export const MAP_MOB_SPAWNS: MapMobSpawnConfig[] = mobsRaw.mapSpawns.map((entry) => ({
  mapId: entry.mapId,
  mobId: asMobId(entry.mobId),
  count: Math.max(0, Math.floor(entry.count)),
}));

export const MOB_SPAWNS: MobSpawnConfig[] = MAP_MOB_SPAWNS.flatMap((entry) => {
  const base = MOB_DEFINITIONS[entry.mobId];
  return Array.from({ length: entry.count }, (_unused, index) => ({
    id: `${entry.mobId}_${entry.mapId}_${index + 1}`,
    mobId: entry.mobId,
    name: base.name,
    behavior: base.behavior,
    mapId: entry.mapId,
    hitboxOffsetY: base.hitboxOffsetY,
    hitboxHeightTiles: base.hitboxHeightTiles,
    hitboxWidthTiles: base.hitboxWidthTiles,
    sizeTiles: base.sizeTiles,
    modelId: base.modelId,
    maxHp: base.maxHp,
    detectionRangeTiles: base.detectionRangeTiles,
    leashRangeTiles: base.leashRangeTiles,
    attackDamage: base.attackDamage,
    attackCooldownMs: base.attackCooldownMs,
    respawnMs: base.respawnMs,
    expReward: base.expReward,
    drops: base.drops,
  }));
});
