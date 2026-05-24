import mobsRaw from "./mobs.json";
import type { ItemId } from "../items/itemDefinitions";

export type MobModelId = "gallina";
export type MobId = "gallina";
const GLOBAL_MOB_ATTACK_COOLDOWN_MS = 1000;

export type MobDropConfig = {
  itemId: ItemId;
  chancePercent: number;
};

export type MobSpawnConfig = {
  id: string;
  mobId: MobId;
  name: string;
  mapId: string;
  hitboxOffsetY: number;
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
  hitboxOffsetY: number;
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
  visualOffsetY: number;
  scale: number;
};

export const MOB_MODELS: Record<MobModelId, MobModelConfig> = {
  gallina: {
    textureKey: "mob_gallina",
    texturePath: "/assets/ao/imperium/mobs/npc_bodies/gallina.png",
    frameWidth: 32,
    frameHeight: 48,
    idleFrame: 0,
    sheetCols: 6,
    moveFrameCount: 6,
    dirAxis: "rows",
    dirRows: {
      down: 0,
      up: 1,
      left: 2,
      right: 3,
    },
    visualOffsetY: 0,
    scale: 1,
  },
};

function asMobId(value: string): MobId {
  if (value === "gallina") return value;
  throw new Error(`Mob no soportado: ${value}`);
}

function asMobModelId(value: string): MobModelId {
  if (value === "gallina") return value;
  throw new Error(`Modelo de mob no soportado: ${value}`);
}

function asItemId(value: string): ItemId {
  if (value === "weapon_saramiana") return value;
  if (value === "armor_cuero") return value;
  if (value === "armor_placas") return value;
  if (value === "armor_placas_rojas") return value;
  if (value === "armor_placas_azules") return value;
  if (value === "potion_hp") return value;
  if (value === "scroll_implosion") return value;
  throw new Error(`Item de drop no soportado: ${value}`);
}

export const MOB_DEFINITIONS: Record<MobId, MobDefinitionConfig> = Object.fromEntries(
  mobsRaw.mobs.map((mob) => [
    asMobId(mob.mobId),
    {
      mobId: asMobId(mob.mobId),
      name: mob.name,
      hitboxOffsetY: Math.floor(mob.hitboxOffsetY),
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
    mapId: entry.mapId,
    hitboxOffsetY: base.hitboxOffsetY,
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
