import mobsRaw from "./mobs.json";
import {
  DEFAULT_MOB_DETECTION_RANGE_TILES,
  DEFAULT_MOB_HITBOX,
  DEFAULT_MOB_LEASH_RANGE_TILES,
} from "./constants";
import { normalizeMobHitRange } from "./mobCombat";
import { ALL_ITEM_IDS, type ItemId } from "./items/definitions";
import type { Facing } from "../shared/types";
import { MOB_VISUAL_CONFIGS } from "./mobVisualConfig";
import { buildMobModelsFromVisualConfigs } from "./toMobModelConfig";

/** Resuelve spawn de red → config visual en `mobs/npc_bodies` (no catálogo BMP). */
export type NetMobSpawnLookup = {
  id: string;
  mobId: string;
  npcId?: number;
  mapId?: string;
};

export type MobModelId =
  | "gallina"
  | "conejo"
  | "lobo"
  | "serpiente"
  | "arana"
  | "oso"
  | "golem_plata"
  | "golem_bronce"
  | "golem_hielo"
  | "goblin_mago"
  | "aparicion"
  | "aprendiz_mago"
  | "asesino"
  | "basilisco"
  | "bruja_drow"
  | "demonio"
  | "chaman_nieves"
  | "ciclope"
  | "goblin"
  | "guardia"
  | "fango"
  | "esqueleto"
  | "escorpion"
  | "ent"
  | "duende"
  | "dragon_rojo"
  | "cuervo"
  | "training_dummy"
  | "golem_infernal"
  | "golem_piedra"
  | "hormiga"
  | "huargo"
  | "leviatan"
  | "sirena"
  | "rata"
  | "cracko"
  | "yeti"
  | "zombie"
  | "hombre_lagarto"
  | "demonio_abisal"
  | "lobo_invernal"
  | "wisp"
  | "ogro"
  | "ogro_esclavo"
  | "ogro_lider"
  | "pirata_arquero"
  | "pirata_guerrero";

export type MobId =
  | "gallina"
  | "conejo"
  | "lobo"
  | "serpiente"
  | "arana"
  | "oso"
  | "golem_plata"
  | "golem_bronce"
  | "golem_hielo"
  | "goblin_mago"
  | "aparicion"
  | "aprendiz_mago"
  | "asesino"
  | "basilisco"
  | "bruja_drow"
  | "demonio"
  | "chaman_nieves"
  | "ciclope"
  | "goblin"
  | "guardia"
  | "fango"
  | "esqueleto"
  | "escorpion"
  | "ent"
  | "duende"
  | "dragon_rojo"
  | "cuervo"
  | "golem_infernal"
  | "golem_piedra"
  | "hormiga"
  | "huargo"
  | "leviatan"
  | "sirena"
  | "rata"
  | "cracko"
  | "yeti"
  | "zombie"
  | "hombre_lagarto"
  | "demonio_abisal"
  | "lobo_invernal"
  | "wisp"
  | "ogro"
  | "ogro_esclavo"
  | "ogro_lider"
  | "pirata_arquero"
  | "pirata_guerrero";

const MOB_IDS: MobId[] = [
  "gallina",
  "conejo",
  "lobo",
  "serpiente",
  "arana",
  "oso",
  "golem_plata",
  "golem_bronce",
  "golem_hielo",
  "goblin_mago",
  "aparicion",
  "aprendiz_mago",
  "asesino",
  "basilisco",
  "bruja_drow",
  "demonio",
  "chaman_nieves",
  "ciclope",
  "goblin",
  "guardia",
  "fango",
  "esqueleto",
  "escorpion",
  "ent",
  "duende",
  "dragon_rojo",
  "cuervo",
  "golem_infernal",
  "golem_piedra",
  "hormiga",
  "huargo",
  "leviatan",
  "sirena",
  "rata",
  "cracko",
  "yeti",
  "zombie",
  "hombre_lagarto",
  "demonio_abisal",
  "lobo_invernal",
  "wisp",
  "ogro",
  "ogro_esclavo",
  "ogro_lider",
  "pirata_arquero",
  "pirata_guerrero",
];
const MOB_MODEL_IDS: MobModelId[] = [
  "gallina",
  "conejo",
  "lobo",
  "serpiente",
  "arana",
  "oso",
  "golem_plata",
  "golem_bronce",
  "golem_hielo",
  "goblin_mago",
  "aparicion",
  "aprendiz_mago",
  "asesino",
  "basilisco",
  "bruja_drow",
  "demonio",
  "chaman_nieves",
  "ciclope",
  "goblin",
  "guardia",
  "fango",
  "esqueleto",
  "escorpion",
  "ent",
  "duende",
  "dragon_rojo",
  "cuervo",
  "training_dummy",
  "golem_infernal",
  "golem_piedra",
  "hormiga",
  "huargo",
  "leviatan",
  "sirena",
  "rata",
  "cracko",
  "yeti",
  "zombie",
  "hombre_lagarto",
  "demonio_abisal",
  "lobo_invernal",
  "wisp",
  "ogro",
  "ogro_esclavo",
  "ogro_lider",
  "pirata_arquero",
  "pirata_guerrero",
];
const GLOBAL_MOB_ATTACK_COOLDOWN_MS = 1400;

export type MobBehavior = "aggressive" | "peaceful" | "static";

export type MobDropConfig = {
  itemId: ItemId;
  chancePercent: number;
};

export type MobCasterConfig = {
  spellId: number;
  cooldownMs: number;
  minDamage: number;
  maxDamage: number;
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
  minHit: number;
  maxHit: number;
  attackCooldownMs: number;
  respawnMs: number;
  expReward: number;
  /** Oro fijo que recibe el jugador que lo mata. */
  gold: number;
  npcId?: number;
  tileX?: number;
  tileY?: number;
  drops: MobDropConfig[];
  aquatic?: boolean;
  caster?: MobCasterConfig;
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
  minHit: number;
  maxHit: number;
  attackCooldownMs: number;
  respawnMs: number;
  expReward: number;
  gold: number;
  npcId?: number;
  drops: MobDropConfig[];
  aquatic?: boolean;
  caster?: MobCasterConfig;
};

type MobJsonEntry = (typeof mobsRaw.mobs)[number] & {
  minHit?: number;
  maxHit?: number;
  attackDamage?: number;
  aquatic?: boolean;
  caster?: Partial<MobCasterConfig>;
};


function parseMobCombatStats(mob: MobJsonEntry) {
  return normalizeMobHitRange(mob.minHit, mob.maxHit, mob.attackDamage);
}

function parseMobCasterConfig(mob: MobJsonEntry): MobCasterConfig | undefined {
  if (!mob.caster) {
    return undefined;
  }
  const spellId = Math.floor(Number(mob.caster.spellId));
  const cooldownMs = Math.floor(Number(mob.caster.cooldownMs));
  const minDamage = Math.floor(Number(mob.caster.minDamage));
  const maxDamage = Math.floor(Number(mob.caster.maxDamage));
  if (
    !Number.isFinite(spellId) ||
    !Number.isFinite(cooldownMs) ||
    !Number.isFinite(minDamage) ||
    !Number.isFinite(maxDamage)
  ) {
    return undefined;
  }
  return {
    spellId: Math.max(1, spellId),
    cooldownMs: Math.max(500, cooldownMs),
    minDamage: Math.max(0, Math.min(minDamage, maxDamage)),
    maxDamage: Math.max(0, Math.max(minDamage, maxDamage)),
  };
}

export type MapMobSpawnConfig = {
  mapId: string;
  mobId: MobId;
  count: number;
  tileX?: number;
  tileY?: number;
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

export { MOB_VISUAL_CONFIGS } from "./mobVisualConfig";

function asMobBehavior(value: string | undefined): MobBehavior {
  if (value === "peaceful") return "peaceful";
  if (value === "static") return "static";
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
  mobsRaw.mobs.map((mob) => {
    const entry = mob as MobJsonEntry;
    const hits = parseMobCombatStats(entry);
    const caster = parseMobCasterConfig(entry);
    return [
    asMobId(mob.mobId),
    {
      mobId: asMobId(mob.mobId),
      name: mob.name,
      behavior: asMobBehavior(mob.behavior),
      hitboxOffsetY: DEFAULT_MOB_HITBOX.offsetY,
      hitboxHeightTiles: DEFAULT_MOB_HITBOX.heightTiles,
      hitboxWidthTiles: DEFAULT_MOB_HITBOX.widthTiles,
      sizeTiles: Math.max(1, Math.floor(mob.sizeTiles)),
      modelId: asMobModelId(mob.modelId),
      maxHp: Math.max(1, Math.floor(mob.maxHp)),
      detectionRangeTiles: DEFAULT_MOB_DETECTION_RANGE_TILES,
      leashRangeTiles: DEFAULT_MOB_LEASH_RANGE_TILES,
      minHit: hits.minHit,
      maxHit: hits.maxHit,
      attackCooldownMs: GLOBAL_MOB_ATTACK_COOLDOWN_MS,
      respawnMs: Math.max(500, Math.floor(mob.respawnMs)),
      expReward: Math.max(0, Math.floor(mob.expReward)),
      gold: Math.max(0, Math.floor((mob as MobJsonEntry).gold ?? 0)),
      npcId: (mob as any).npcId,
      drops: mob.drops.map((drop) => ({
        itemId: asItemId(drop.itemId),
        chancePercent: Math.min(100, Math.max(0, drop.chancePercent)),
      })),
      aquatic: entry.aquatic,
      caster,
    } satisfies MobDefinitionConfig,
  ];
  })
) as Record<MobId, MobDefinitionConfig>;


export const MAP_MOB_SPAWNS: MapMobSpawnConfig[] = mobsRaw.mapSpawns.map((entry) => ({
  mapId: entry.mapId,
  mobId: asMobId(entry.mobId),
  count: Math.max(0, Math.floor(entry.count)),
  tileX: entry.tileX,
  tileY: entry.tileY,
}));

/** npcId Imperium (ej. 133 = Lobo) → definición con `modelId` en mobs/npc_bodies. */
export const MOB_DEFINITIONS_BY_NPC_ID: ReadonlyMap<number, MobDefinitionConfig> = new Map(
  Object.values(MOB_DEFINITIONS)
    .filter((def) => def.npcId !== undefined)
    .map((def) => [def.npcId!, def])
);

export function hasMobVisualModel(modelId: MobModelId): boolean {
  return modelId in MOB_VISUAL_CONFIGS;
}

function isMobId(value: string): value is MobId {
  return (MOB_IDS as readonly string[]).includes(value);
}

/** `{mobId}_mapa2_3` → mobId cuando el servidor envía `mobId` = `id` por error. */
export function inferMobIdFromSpawnId(spawnId: string): MobId | undefined {
  const match = spawnId.match(/^(.+)_(mapa\d+)_(\d+)$/);
  if (!match || !isMobId(match[1])) {
    return undefined;
  }
  return match[1];
}

/** Config de spawn mínima para dibujar con MOB_VISUAL_CONFIGS (mobs/npc_bodies). */
export function buildMobSpawnConfigFromDefinition(
  def: MobDefinitionConfig,
  netMob: NetMobSpawnLookup
): MobSpawnConfig {
  return {
    id: netMob.id,
    mobId: def.mobId,
    name: def.name,
    behavior: def.behavior,
    mapId: netMob.mapId ?? "mapa1",
    hitboxOffsetY: def.hitboxOffsetY,
    hitboxHeightTiles: def.hitboxHeightTiles,
    hitboxWidthTiles: def.hitboxWidthTiles,
    sizeTiles: def.sizeTiles,
    modelId: def.modelId,
    maxHp: def.maxHp,
    detectionRangeTiles: def.detectionRangeTiles,
    leashRangeTiles: def.leashRangeTiles,
    minHit: def.minHit,
    maxHit: def.maxHit,
    attackCooldownMs: GLOBAL_MOB_ATTACK_COOLDOWN_MS,
    respawnMs: def.respawnMs,
    expReward: def.expReward,
    gold: def.gold,
    npcId: def.npcId,
    drops: def.drops,
    aquatic: def.aquatic,
    caster: def.caster,
  };
}

export function resolveMobDefinitionForNetMob(
  netMob: NetMobSpawnLookup
): MobDefinitionConfig | undefined {
  if (isMobId(netMob.mobId)) {
    return MOB_DEFINITIONS[netMob.mobId];
  }
  const fromSpawnId = inferMobIdFromSpawnId(netMob.id);
  if (fromSpawnId) {
    return MOB_DEFINITIONS[fromSpawnId];
  }
  if (netMob.npcId !== undefined) {
    return MOB_DEFINITIONS_BY_NPC_ID.get(netMob.npcId);
  }
  return undefined;
}

/** Criatura con PNG propio en mobs/npc_bodies (no usar body_*.png del import BMP). */
export function shouldUseMobNpcBodiesArt(netMob: NetMobSpawnLookup): boolean {
  const def = resolveMobDefinitionForNetMob(netMob);
  return Boolean(def && hasMobVisualModel(def.modelId));
}

/** Índice O(1) por spawnId (servidor / lookups). */
const mobSpawnById = new Map<string, MobSpawnConfig>();
export const MOB_SPAWN_BY_ID: ReadonlyMap<string, MobSpawnConfig> = mobSpawnById;

function buildMapMobSpawnsByMapId(): ReadonlyMap<string, readonly MapMobSpawnConfig[]> {
  const byMap = new Map<string, MapMobSpawnConfig[]>();
  for (const entry of MAP_MOB_SPAWNS) {
    let list = byMap.get(entry.mapId);
    if (!list) {
      list = [];
      byMap.set(entry.mapId, list);
    }
    list.push(entry);
  }
  return byMap;
}

/** Entradas compactas de `mapSpawns` agrupadas por mapa (O(1) por mapId). */
export const MAP_MOB_SPAWNS_BY_MAP_ID = buildMapMobSpawnsByMapId();

export const MOB_SPAWNS: MobSpawnConfig[] = MAP_MOB_SPAWNS.flatMap((entry) => {
  const base = MOB_DEFINITIONS[entry.mobId];
  return Array.from({ length: entry.count }, (_unused, index) => ({
    id: `${entry.mobId}_${entry.mapId}_${index + 1}`,
    mobId: entry.mobId,
    name: base.name,
    behavior: base.behavior,
    mapId: entry.mapId,
    tileX: entry.tileX,
    tileY: entry.tileY,
    hitboxOffsetY: base.hitboxOffsetY,
    hitboxHeightTiles: base.hitboxHeightTiles,
    hitboxWidthTiles: base.hitboxWidthTiles,
    sizeTiles: base.sizeTiles,
    modelId: base.modelId,
    maxHp: base.maxHp,
    detectionRangeTiles: base.detectionRangeTiles,
    leashRangeTiles: base.leashRangeTiles,
    minHit: base.minHit,
    maxHit: base.maxHit,
    attackCooldownMs: base.attackCooldownMs,
    respawnMs: base.respawnMs,
    expReward: base.expReward,
    gold: base.gold,
    npcId: base.npcId,
    drops: base.drops,
    aquatic: base.aquatic,
    caster: base.caster,
  }));
});

for (const spawn of MOB_SPAWNS) {
  mobSpawnById.set(spawn.id, spawn);
}

/**
 * Spawn de criatura para estado de red: prioriza id, luego mobId (o inferido desde id), luego npcId.
 * Si hay arte en MOB_VISUAL_CONFIGS, el cliente usa mobs/npc_bodies (no body_*.png importados).
 */
export function resolveMobSpawnConfigForNetMob(
  netMob: NetMobSpawnLookup
): MobSpawnConfig | undefined {
  const byId = MOB_SPAWNS.find((entry) => entry.id === netMob.id);
  if (byId) return byId;

  const def = resolveMobDefinitionForNetMob(netMob);
  if (def && hasMobVisualModel(def.modelId)) {
    const fromSpawns =
      MOB_SPAWNS.find((entry) => entry.mobId === def.mobId) ??
      MOB_SPAWNS.find((entry) => entry.id === netMob.id);
    if (fromSpawns) return fromSpawns;
    return buildMobSpawnConfigFromDefinition(def, netMob);
  }

  if (isMobId(netMob.mobId)) {
    const byMobId = MOB_SPAWNS.find((entry) => entry.mobId === netMob.mobId);
    if (byMobId) return byMobId;
  }

  return undefined;
}
