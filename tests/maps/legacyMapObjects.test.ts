import { describe, expect, it } from "vitest";
import { SHOP_SIGN_GRH_CATALOG, getShopSignGrh } from "../../game-data/imperium/shopSignCatalog";
import {
  collectLegacyObjGrhFileNums,
  IMPERIUM_GENERIC_CARTEL_OBJ_INDEX,
  resolveImportedObjDef,
  shouldSpawnLegacyCsmObj,
} from "../../src/maps/legacyMapObjects";
import { MAPA1_MANUAL_SIGNS } from "../../src/maps/mapa1SignPlacements";
import { collectSignGrhFileNums } from "../../src/maps/mapSignRender";
import { MAP_MAPA1 } from "../../src/maps/mapa1";
import grhIndexJson from "../../public/assets/ao/grh_index.json";

describe("legacyMapObjects", () => {
  it("no usa cartel genérico con grh de Rinkel para objIndex 1", () => {
    expect(resolveImportedObjDef(1)).toBeNull();
    expect(
      shouldSpawnLegacyCsmObj({
        tileX: 0,
        tileY: 0,
        objIndex: IMPERIUM_GENERIC_CARTEL_OBJ_INDEX,
        objAmount: 74,
      })
    ).toBe(false);
  });

  it("catálogo de carteles conserva los grh indicados", () => {
    expect(getShopSignGrh("alquimia")).toBe(21);
    expect(getShopSignGrh("herreria")).toBe(9934);
    expect(SHOP_SIGN_GRH_CATALOG.carpinteria.grhIndex).toBe(23);
    expect(SHOP_SIGN_GRH_CATALOG.mineria.grhIndex).toBe(618);
  });

  it("precarga texturas de carteles de Ullathorpe (incl. herreria 9934.bmp)", () => {
    const fileNums = collectLegacyObjGrhFileNums(
      MAP_MAPA1,
      grhIndexJson as Record<string, { fileNum?: number; numFrames?: number; frames?: number[] }>
    );
    expect(fileNums).toContain(9934);
    expect(fileNums).not.toContain(15181);
    const signFiles = collectSignGrhFileNums(MAPA1_MANUAL_SIGNS, grhIndexJson as Record<string, never>);
    expect(signFiles).toContain(9934);
    expect(signFiles).toContain(21);
    expect(signFiles).not.toContain(10071);
  });

  it("carteles manuales en tiles pedidos", () => {
    const tiles = MAPA1_MANUAL_SIGNS.map((s) => `${s.tileX},${s.tileY}`);
    expect(tiles).toContain("70,38");
    expect(tiles).toContain("78,38");
    expect(tiles).toContain("80,56");
    expect(tiles).toContain("72,70");
    expect(tiles).toContain("60,68");
    expect(tiles).toContain("42,41");
  });
});
