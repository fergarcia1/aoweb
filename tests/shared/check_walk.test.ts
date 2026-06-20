import { describe, expect, it } from "vitest";
import { MAP_MAPA1 } from "../../shared/maps/mapa1";

describe("check_walk", () => {
  it("prints tiles", () => {
    console.log("62,66 tile type:", MAP_MAPA1.tiles[66]?.[62]);
    console.log("63,66 tile type:", MAP_MAPA1.tiles[66]?.[63]);

    console.log("72,36 tile type:", MAP_MAPA1.tiles[36]?.[72]);
    console.log("73,36 tile type:", MAP_MAPA1.tiles[36]?.[73]);

    console.log("80,36 tile type:", MAP_MAPA1.tiles[36]?.[80]);
    console.log("81,36 tile type:", MAP_MAPA1.tiles[36]?.[81]);
  });
});
