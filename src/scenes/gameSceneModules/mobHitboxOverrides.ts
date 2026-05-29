import { MOB_SPAWNS } from "../../data/mobs";
import type { DummyState, MobHitboxOverride } from "./types";

const STORAGE_KEY = "mob_hitbox_overrides";
const SPAWN_IDS = new Set(MOB_SPAWNS.map((spawn) => spawn.id));
const MOB_TYPE_IDS = new Set<string>(MOB_SPAWNS.map((spawn) => spawn.mobId));

export type MobHitboxSource = {
  id: string;
  mobId: string;
  hitboxOffsetY: number;
  hitboxHeightTiles: number;
  hitboxWidthTiles: number;
};

function toMobHitboxSource(
  id: string,
  mobId: string,
  defaults: Pick<
    MobHitboxSource,
    "hitboxOffsetY" | "hitboxHeightTiles" | "hitboxWidthTiles"
  >
): MobHitboxSource {
  return { id, mobId, ...defaults };
}

function normalizeOverride(raw: unknown): MobHitboxOverride | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const entry = raw as Record<string, unknown>;
  const hitboxOffsetY = Number(entry.hitboxOffsetY);
  const hitboxHeightTiles = Number(entry.hitboxHeightTiles);
  const hitboxWidthTiles = Number(entry.hitboxWidthTiles);
  if (
    Number.isNaN(hitboxOffsetY) ||
    Number.isNaN(hitboxHeightTiles) ||
    Number.isNaN(hitboxWidthTiles)
  ) {
    return null;
  }
  return {
    hitboxOffsetY,
    hitboxHeightTiles: Math.max(1, Math.floor(hitboxHeightTiles)),
    hitboxWidthTiles: Math.max(1, Math.floor(hitboxWidthTiles)),
  };
}

/** Copia overrides por mobId (ej. "lobo") a cada spawn (ej. "lobo_pueblo_1"). */
function migrateMobIdKeysToSpawnIds(
  overrides: Record<string, MobHitboxOverride>
): Record<string, MobHitboxOverride> {
  let migrated = false;
  const next = { ...overrides };

  for (const [key, values] of Object.entries(overrides)) {
    if (SPAWN_IDS.has(key) || !MOB_TYPE_IDS.has(key)) {
      continue;
    }
    for (const spawn of MOB_SPAWNS) {
      if (spawn.mobId !== key || next[spawn.id]) {
        continue;
      }
      next[spawn.id] = { ...values };
      migrated = true;
    }
  }

  if (migrated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

function loadMobHitboxOverrides(): Record<string, MobHitboxOverride> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, unknown>;
    const normalized: Record<string, MobHitboxOverride> = {};
    for (const [key, value] of Object.entries(raw)) {
      const override = normalizeOverride(value);
      if (override) {
        normalized[key] = override;
      }
    }
    return migrateMobIdKeysToSpawnIds(normalized);
  } catch {
    return {};
  }
}

export function getMobHitboxOverrides(): Record<string, MobHitboxOverride> {
  return loadMobHitboxOverrides();
}

export function clearMobHitboxOverrides(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function overrideKeysFor(source: MobHitboxSource): string[] {
  return [...new Set([source.id, source.mobId].filter(Boolean))];
}

export function resolveMobHitbox(source: MobHitboxSource): MobHitboxOverride {
  const overrides = getMobHitboxOverrides();
  for (const key of overrideKeysFor(source)) {
    const override = overrides[key];
    if (override) {
      return override;
    }
  }
  return {
    hitboxOffsetY: source.hitboxOffsetY,
    hitboxHeightTiles: source.hitboxHeightTiles,
    hitboxWidthTiles: source.hitboxWidthTiles,
  };
}

export function saveMobHitboxOverridesFromDummies(dummies: DummyState[]): number {
  const overrides: Record<string, MobHitboxOverride> = { ...getMobHitboxOverrides() };
  let saved = 0;

  for (const dummy of dummies) {
    const def = dummy.spawnConfig;
    const values = {
      hitboxOffsetY: dummy.hitboxOffsetY,
      hitboxHeightTiles: dummy.hitboxHeightTiles,
      hitboxWidthTiles: dummy.hitboxWidthTiles,
    };
    const matchesDefaults =
      values.hitboxOffsetY === def.hitboxOffsetY &&
      values.hitboxHeightTiles === def.hitboxHeightTiles &&
      values.hitboxWidthTiles === def.hitboxWidthTiles;

    if (matchesDefaults) {
      for (const key of overrideKeysFor(
        toMobHitboxSource(dummy.id, def.mobId, def)
      )) {
        if (overrides[key]) {
          delete overrides[key];
          saved += 1;
        }
      }
      continue;
    }

    overrides[dummy.id] = values;
    saved += 1;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  return saved;
}

export function exportMobHitboxOverridesToConsole(
  overrides: Record<string, MobHitboxOverride>
): void {
  const json = JSON.stringify(overrides, null, 2);
  console.log("[mob export] Copiar al mobs.json o conservar en localStorage:\n", json);
}

export function applyMobHitboxOverrideToDummy(dummy: DummyState): MobHitboxOverride {
  const def = dummy.spawnConfig;
  const resolved = resolveMobHitbox(
    toMobHitboxSource(dummy.id, def.mobId, def)
  );

  dummy.hitboxOffsetY = resolved.hitboxOffsetY;
  dummy.hitboxHeightTiles = resolved.hitboxHeightTiles;
  dummy.hitboxWidthTiles = resolved.hitboxWidthTiles;
  return resolved;
}

/** Guarda en localStorage el override del mob inspeccionado (clave = id de spawn). */
export function persistMobHitboxOverrideForDummy(dummy: DummyState): void {
  const def = dummy.spawnConfig;
  const overrides = getMobHitboxOverrides();
  const values = {
    hitboxOffsetY: dummy.hitboxOffsetY,
    hitboxHeightTiles: dummy.hitboxHeightTiles,
    hitboxWidthTiles: dummy.hitboxWidthTiles,
  };
  const matchesDefaults =
    values.hitboxOffsetY === def.hitboxOffsetY &&
    values.hitboxHeightTiles === def.hitboxHeightTiles &&
    values.hitboxWidthTiles === def.hitboxWidthTiles;

  for (const key of overrideKeysFor(toMobHitboxSource(dummy.id, def.mobId, def))) {
    if (matchesDefaults) {
      delete overrides[key];
    }
  }

  if (!matchesDefaults) {
    overrides[dummy.id] = values;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}
