import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  getImperiumBodyVisual,
  isImperiumBodyVisualReady,
  IMPERIUM_BODY_VISUALS_META,
} from "../../game-data/imperium/npcBodyVisuals";
import { getImperiumNpcCatalogEntry, isImperiumNpcVisualReady } from "../../game-data/imperium/npcCatalog";
import { getCatalogEntryFace } from "../../src/game/npcs/imperiumNpcFaceConfig";
import { getImperiumNpcBodySpriteConfig } from "../../src/game/npcs/imperiumNpcVisual";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const BODY_PNG = (bodyId: number) =>
  path.join(REPO_ROOT, "public/assets/ao/imperium/npc_bodies", `body_${bodyId}.png`);

describe("imperiumNpcVisuals", () => {
  it("has body manifest with mostly ready entries", () => {
    expect(IMPERIUM_BODY_VISUALS_META.bodyCount).toBeGreaterThan(100);
    expect(IMPERIUM_BODY_VISUALS_META.stats.ready).toBeGreaterThan(80);
  });

  it("resolves aldeano body 18 with PNG on disk", () => {
    const visual = getImperiumBodyVisual(18);
    expect(isImperiumBodyVisualReady(visual)).toBe(true);
    if (!isImperiumBodyVisualReady(visual)) return;
    expect(visual.texturePath).toBe("/assets/ao/imperium/npc_bodies/body_18.png");
    expect(fs.existsSync(BODY_PNG(18))).toBe(true);
    expect(visual.frameWidth).toBeGreaterThan(0);
    expect(visual.sheetCols).toBeGreaterThan(0);
  });

  it("maps catalog entry to sprite config", () => {
    const entry = getImperiumNpcCatalogEntry(1);
    expect(entry?.body).toBe(18);
    expect(isImperiumNpcVisualReady(entry!)).toBe(true);
    const sprite = getImperiumNpcBodySpriteConfig(entry!.body);
    expect(sprite?.textureKey).toBe("imperium_npc_body_18");
    expect(sprite?.directionRows.down).toBe(2);
    expect(sprite?.directionRows.up).toBe(0);
  });

  it("assigns stable random face on humanoid catalog entries", () => {
    const entry = getImperiumNpcCatalogEntry(1);
    expect(entry).toBeTruthy();
    const face = getCatalogEntryFace(entry!);
    expect(face).toBeTruthy();
    expect(face?.source).toBe("random_seeded");
    expect(["human", "elf", "drow", "dwarf", "gnome", "orc"]).toContain(face?.raceId);
    expect(["male", "female"]).toContain(face?.genderId);
    expect(face?.faceIndex).toBeGreaterThanOrEqual(0);
    expect(face?.faceIndex).toBeLessThan(11);

    const again = getImperiumNpcCatalogEntry(1);
    expect(getCatalogEntryFace(again!)).toEqual(face);
  });

  it("classifies murcielago creature body", () => {
    const entry = getImperiumNpcCatalogEntry(500);
    expect(entry?.kind).toBe("creature");
    const visual = getImperiumBodyVisual(entry?.body ?? 0);
    expect(isImperiumBodyVisualReady(visual)).toBe(true);
  });
});
