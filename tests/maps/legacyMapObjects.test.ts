import { describe, expect, it } from "vitest";
import {
  collectLegacyObjGrhFileNums,
  IMPERIUM_GENERIC_CARTEL_OBJ_INDEX,
  resolveImportedObjDef,
  shouldSpawnLegacyCsmObj,
} from "../../src/maps/legacyMapObjects";
import { MAP_MAPA1 } from "../../shared/maps/mapa1";
import { MAP_MAPA252 } from "../../shared/maps/mapa252";
import grhIndexJson from "../../public/assets/ao/grh_index.json";

describe("legacyMapObjects", () => {
  it("mantiene omitidos los carteles genericos del CSM por ahora", () => {
    expect(
      shouldSpawnLegacyCsmObj({
        tileX: 0,
        tileY: 0,
        objIndex: IMPERIUM_GENERIC_CARTEL_OBJ_INDEX,
        objAmount: 74,
      })
    ).toBe(false);
  });

  it("precarga grh usados por capas y objetos legacy del mapa", () => {
    const fileNums = collectLegacyObjGrhFileNums(
      MAP_MAPA252,
      grhIndexJson as Record<string, { fileNum?: number; numFrames?: number; frames?: number[] }>
    );
    expect(fileNums).toContain(15237);
    expect(fileNums).not.toContain(15181);
  });

  it("incluye objetos importados por pipeline, como escaleras", () => {
    expect(resolveImportedObjDef(1469)?.grhIndex).toBe(26940);
    expect(MAP_MAPA252.legacyObjs?.some((obj) => obj.objIndex === 1469)).toBe(true);
  });
});
