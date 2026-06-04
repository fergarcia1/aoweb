import { describe, expect, it } from "vitest";
import {
  getImperiumNpcCatalogEntry,
  IMPERIUM_NPC_CATALOG,
  IMPERIUM_NPC_CATALOG_META,
  listImperiumCreatureTemplates,
  listImperiumServiceTemplates,
} from "../../game-data/imperium/npcCatalog";

describe("imperiumNpcCatalog", () => {
  it("loads catalog with expected scale", () => {
    expect(IMPERIUM_NPC_CATALOG_META.totalEntries).toBeGreaterThan(200);
    expect(IMPERIUM_NPC_CATALOG.length).toBe(IMPERIUM_NPC_CATALOG_META.totalEntries);
  });

  it("classifies known templates", () => {
    expect(getImperiumNpcCatalogEntry(24)?.kind).toBe("service");
    expect(getImperiumNpcCatalogEntry(24)?.serviceRole).toBe("banker");

    expect(getImperiumNpcCatalogEntry(63)?.kind).toBe("service");
    expect(getImperiumNpcCatalogEntry(63)?.serviceRole).toBe("priest");

    expect(getImperiumNpcCatalogEntry(500)?.kind).toBe("creature");

    expect(getImperiumNpcCatalogEntry(1)?.name).toBe("Aldeano");
    expect(getImperiumNpcCatalogEntry(1)?.kind).toBe("ambient");
  });

  it("keeps guards as service not creature", () => {
    const guard = getImperiumNpcCatalogEntry(6);
    expect(guard?.npcType).toBe(2);
    expect(guard?.kind).toBe("service");
    expect(guard?.serviceRole).toBe("guard");
    expect(guard?.attackable).toBe(true);
  });

  it("lists filter by kind", () => {
    const creatures = listImperiumCreatureTemplates();
    const services = listImperiumServiceTemplates();
    expect(creatures.every((e) => e.kind === "creature")).toBe(true);
    expect(services.every((e) => e.kind === "service")).toBe(true);
    expect(
      IMPERIUM_NPC_CATALOG_META.byKind.creature +
        IMPERIUM_NPC_CATALOG_META.byKind.service +
        IMPERIUM_NPC_CATALOG_META.byKind.ambient
    ).toBe(IMPERIUM_NPC_CATALOG_META.totalEntries);
  });
});
