import type { DummyState, MobHitboxOverride } from "./types";

const STORAGE_KEY = "mob_hitbox_overrides";

export function getMobHitboxOverrides(): Record<string, MobHitboxOverride> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function clearMobHitboxOverrides(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function saveMobHitboxOverridesFromDummies(dummies: DummyState[]): number {
  const overrides: Record<string, MobHitboxOverride> = {};
  try {
    Object.assign(overrides, getMobHitboxOverrides());
  } catch {
    /* ignore */
  }

  for (const dummy of dummies) {
    const def = dummy.spawnConfig;
    if (
      dummy.hitboxOffsetY !== def.hitboxOffsetY ||
      dummy.hitboxHeightTiles !== def.hitboxHeightTiles ||
      dummy.hitboxWidthTiles !== def.hitboxWidthTiles
    ) {
      overrides[dummy.spawnConfig.mobId] = {
        hitboxOffsetY: dummy.hitboxOffsetY,
        hitboxHeightTiles: dummy.hitboxHeightTiles,
        hitboxWidthTiles: dummy.hitboxWidthTiles,
      };
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  return Object.keys(overrides).length;
}

export function exportMobHitboxOverridesToConsole(
  overrides: Record<string, MobHitboxOverride>
): void {
  const json = JSON.stringify(overrides, null, 2);
  console.log("[mob export] Copiar al mobs.json:\n", json);
}

export function applyMobHitboxOverrideToDummy(
  dummy: DummyState,
  overrides: Record<string, MobHitboxOverride>
): MobHitboxOverride | null {
  const override = overrides[dummy.spawnConfig.mobId];
  if (!override) return null;
  dummy.hitboxOffsetY = override.hitboxOffsetY;
  dummy.hitboxHeightTiles = override.hitboxHeightTiles;
  dummy.hitboxWidthTiles = override.hitboxWidthTiles;
  return override;
}
