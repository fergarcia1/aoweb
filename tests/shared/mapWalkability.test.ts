import { describe, expect, it } from "vitest";
import { getMapCollisionOverridesFile } from "../../game-data/maps/mapCollision";
import { MAP_MAPA1 } from "../../shared/maps/mapa1";
import { MAP_MAPA61 } from "../../shared/maps/mapa61";
import {
  isLegacyInteriorDoorwayTile,
  isLegacyInvisibleObjectBlock,
  isLegacyPhantomWallGap,
  isLegacyWallLayerTile,
  isMapTileWalkable,
  isMinimapLegacyRoofTile,
  isPlayerUnderLegacyRoof,
  setDoorTileOverride,
} from "../../shared/mapWalkability";
import { TILE } from "../../shared/tileTypes";

describe("mapWalkability", () => {
  it("carga overrides desde mapa1.collision.json", () => {
    const file = getMapCollisionOverridesFile("mapa1");
    expect(file?.allow).toContain("74,37");
    expect(file?.deny).toContain("41,37");
    expect(file?.roofTriggerRects?.length).toBeGreaterThan(0);
    for (const key of file?.allow ?? []) {
      expect(isMapTileWalkable("mapa1", ...parseKey(key))).toBe(true);
    }
  });

  it("treats blocked tiles adjacent to roof triggers as doorways", () => {
    const map = MAP_MAPA1;
    let found = false;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (
          map.tiles[y][x] === TILE.GRASS_BLOCKED &&
          isLegacyInteriorDoorwayTile(map, x, y) &&
          !isLegacyWallLayerTile(map, x, y) &&
          isMapTileWalkable(map.id, x, y)
        ) {
          found = true;
          break;
        }
      }
      if (found) break;
    }
    expect(found).toBe(true);
  });

  it("bloquea GRASS_BLOCKED de muro sin gráficos pegado a edificios (67,80 ya no es cartel caminable)", () => {
    const map = MAP_MAPA1;
    expect(isLegacyInvisibleObjectBlock(map, 67, 80)).toBe(false);
    expect(isMapTileWalkable(map.id, 67, 80)).toBe(false);
  });

  it("allows/blocks both door tiles at 62,66 and 63,66 on the wooden house", () => {
    // Closed by default:
    expect(isMapTileWalkable("mapa1", 62, 66)).toBe(false);
    expect(isMapTileWalkable("mapa1", 63, 66)).toBe(false);

    // Open override:
    const overrides = new Map<string, number>();
    setDoorTileOverride(overrides, 63, 66, true);
    expect(isMapTileWalkable("mapa1", 62, 66, overrides)).toBe(true);
    expect(isMapTileWalkable("mapa1", 63, 66, overrides)).toBe(true);

    // Closed override:
    setDoorTileOverride(overrides, 63, 66, false);
    expect(isMapTileWalkable("mapa1", 62, 66, overrides)).toBe(false);
    expect(isMapTileWalkable("mapa1", 63, 66, overrides)).toBe(false);
  });

  it("allows magic shop entrance tiles 60,30 and 61,30 on mapa1", () => {
    expect(isMapTileWalkable("mapa1", 60, 30)).toBe(true);
    // Closed initially:
    expect(isMapTileWalkable("mapa1", 61, 30)).toBe(false);
    
    // Open override:
    const overrides = new Map<string, number>();
    setDoorTileOverride(overrides, 61, 30, true);
    expect(isMapTileWalkable("mapa1", 61, 30, overrides)).toBe(true);
    
    // Closed override:
    setDoorTileOverride(overrides, 61, 30, false);
    expect(isMapTileWalkable("mapa1", 61, 30, overrides)).toBe(false);
  });

  it("bloquea fachadas de alquimia y sastrería en Ullathorpe (37) sin cerrar puertas", () => {
    const blocked = [
      [41, 37],
      [42, 37],
      [78, 37],
    ] as const;
    for (const [x, y] of blocked) {
      expect(isMapTileWalkable("mapa1", x, y)).toBe(false);
    }
    expect(isMapTileWalkable("mapa1", 71, 38)).toBe(true);
    expect(isMapTileWalkable("mapa1", 79, 38)).toBe(true);
  });

  it("esquina 75,36 bloqueada; pasillos y caminos de sastrería y mercería caminables", () => {
    expect(isMapTileWalkable("mapa1", 75, 36)).toBe(false);
    expect(isMapTileWalkable("mapa1", 75, 38)).toBe(true);
    const sastreDoor: Array<[number, number]> = [
      [74, 37],
      [76, 37],
      [77, 36],
      [80, 37],
      [81, 37],
    ];
    for (const [x, y] of sastreDoor) {
      expect(isMapTileWalkable("mapa1", x, y)).toBe(true);
    }
  });

  it("permite/bloquea puertas de sastrería (72,36 y 73,36)", () => {
    // Cerradas por defecto:
    expect(isMapTileWalkable("mapa1", 72, 36)).toBe(false);
    expect(isMapTileWalkable("mapa1", 73, 36)).toBe(false);

    // Abiertas:
    const overrides = new Map<string, number>();
    setDoorTileOverride(overrides, 73, 36, true);
    expect(isMapTileWalkable("mapa1", 72, 36, overrides)).toBe(true);
    expect(isMapTileWalkable("mapa1", 73, 36, overrides)).toBe(true);

    // Cerradas override:
    setDoorTileOverride(overrides, 73, 36, false);
    expect(isMapTileWalkable("mapa1", 72, 36, overrides)).toBe(false);
    expect(isMapTileWalkable("mapa1", 73, 36, overrides)).toBe(false);
  });

  it("permite/bloquea puertas de mercería general (80,36 y 81,36)", () => {
    // Cerradas por defecto:
    expect(isMapTileWalkable("mapa1", 80, 36)).toBe(false);
    expect(isMapTileWalkable("mapa1", 81, 36)).toBe(false);

    // Abiertas:
    const overrides = new Map<string, number>();
    setDoorTileOverride(overrides, 81, 36, true);
    expect(isMapTileWalkable("mapa1", 80, 36, overrides)).toBe(true);
    expect(isMapTileWalkable("mapa1", 81, 36, overrides)).toBe(true);

    // Cerradas override:
    setDoorTileOverride(overrides, 81, 36, false);
    expect(isMapTileWalkable("mapa1", 80, 36, overrides)).toBe(false);
    expect(isMapTileWalkable("mapa1", 81, 36, overrides)).toBe(false);
  });

  it("puertas/pasillos 44,39 45,39 y 59,68 caminables", () => {
    expect(isMapTileWalkable("mapa1", 44, 39)).toBe(true);
    expect(isMapTileWalkable("mapa1", 45, 39)).toBe(true);
    expect(isMapTileWalkable("mapa1", 59, 68)).toBe(true);
  });

  it("permite overrides de caminabilidad que siguen siendo necesarios en mapa1", () => {
    const allowed = [
      [45, 43],
      [44, 44],
      [45, 37],
      [30, 23],
      [47, 32],
    ] as const;
    for (const [x, y] of allowed) {
      expect(isMapTileWalkable("mapa1", x, y)).toBe(true);
    }
  });

  it("detects under-roof inside temple (73,61)–(82,68)", () => {
    const map = MAP_MAPA1;
    expect(isPlayerUnderLegacyRoof(map, 78, 64)).toBe(true);
    expect(isPlayerUnderLegacyRoof(map, 73, 61)).toBe(true);
    expect(isPlayerUnderLegacyRoof(map, 82, 68)).toBe(true);
  });

  it("bloquea obstáculos manuales del templo en mapa1", () => {
    const blocked = [
      [82, 61],
      [81, 68],
      [79, 65],
      [80, 65],
      [81, 65],
      [79, 68],
    ] as const;
    for (const [x, y] of blocked) {
      expect(isMapTileWalkable("mapa1", x, y)).toBe(false);
    }
    expect(isMapTileWalkable("mapa1", 78, 64)).toBe(true);
  });

  it("detects under-roof inside bank (72,46)–(82,54)", () => {
    const map = MAP_MAPA1;
    expect(isPlayerUnderLegacyRoof(map, 79, 50)).toBe(true);
    expect(isPlayerUnderLegacyRoof(map, 72, 46)).toBe(true);
    expect(isPlayerUnderLegacyRoof(map, 82, 54)).toBe(true);
  });

  it("L3 bloquea aunque el tile sea roof trigger (rectángulos de interior amplios)", () => {
    const map = MAP_MAPA1;
    const legacy = map.legacyCsmData!;
    let found = false;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if ((legacy.L3[y]?.[x] ?? 0) <= 0) continue;
        if (!isLegacyInteriorDoorwayTile(map, x, y)) continue;
        expect(isMapTileWalkable("mapa1", x, y)).toBe(false);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("bloquea perímetro manual 35–43 / 25–30 en mapa1", () => {
    const blocked = [
      [35, 25],
      [35, 30],
      [37, 30],
      [43, 30],
      [42, 25],
    ] as const;
    for (const [x, y] of blocked) {
      expect(isMapTileWalkable("mapa1", x, y)).toBe(false);
    }
  });

  it("huecos y paredes L3 son sólidos en casas", () => {
    const map = MAP_MAPA1;
    const legacy = map.legacyCsmData!;
    const manualL3Allows = new Set(getMapCollisionOverridesFile("mapa1")?.allow ?? []);
    expect(isMapTileWalkable("mapa1", 57, 61)).toBe(false);

    let wallL3 = false;
    let phantomGap = false;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if ((legacy.L3[y]?.[x] ?? 0) > 0) {
          if (!manualL3Allows.has(`${x},${y}`)) {
            expect(isMapTileWalkable("mapa1", x, y)).toBe(false);
          }
          wallL3 = true;
        } else if (isLegacyPhantomWallGap(map, x, y)) {
          expect(isMapTileWalkable("mapa1", x, y)).toBe(false);
          phantomGap = true;
        }
      }
    }
    expect(wallL3).toBe(true);
    expect(phantomGap).toBe(true);
  });

  it("minimap roof tiles include L3 walls and temple interior", () => {
    const map = MAP_MAPA1;
    const legacy = map.legacyCsmData!;
    let wallWithL3 = false;
    for (let y = 0; y < map.height && !wallWithL3; y++) {
      for (let x = 0; x < map.width; x++) {
        if ((legacy.L3[y]?.[x] ?? 0) > 0) {
          expect(isMinimapLegacyRoofTile(map, x, y)).toBe(true);
          wallWithL3 = true;
          break;
        }
      }
    }
    expect(wallWithL3).toBe(true);
    expect(isMinimapLegacyRoofTile(map, 78, 64)).toBe(true);
  });

  it("aplica overrides de puerta sin mutar el mapa", () => {
    const overrides = new Map<string, number>();
    expect(isMapTileWalkable("mapa1", 67, 80)).toBe(false);
    setDoorTileOverride(overrides, 67, 80, true);
    expect(isMapTileWalkable("mapa1", 67, 80, overrides)).toBe(true);
    setDoorTileOverride(overrides, 67, 80, false);
    expect(isMapTileWalkable("mapa1", 67, 80, overrides)).toBe(false);
    expect(MAP_MAPA1.tiles[80][67]).not.toBe(0);
  });

  it("permite overrides de puerta abierta aunque la fachada tenga L3", () => {
    const map = MAP_MAPA1;
    let l3Tile: [number, number] | undefined;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (isLegacyWallLayerTile(map, x, y)) {
          l3Tile = [x, y];
          break;
        }
      }
      if (l3Tile) break;
    }
    expect(l3Tile).toBeTruthy();
    const overrides = new Map<string, number>();
    const [tileX, tileY] = l3Tile!;

    expect(isMapTileWalkable("mapa1", tileX, tileY)).toBe(false);
    setDoorTileOverride(overrides, tileX, tileY, true);
    expect(isMapTileWalkable("mapa1", tileX, tileY, overrides)).toBe(true);
    setDoorTileOverride(overrides, tileX, tileY, false);
    expect(isMapTileWalkable("mapa1", tileX, tileY, overrides)).toBe(false);
  });

  it("bloquea agua legacy de Puerto de Banderbille para personajes a pie", () => {
    expect(MAP_MAPA61.legacyCsmData?.L1[65]?.[39]).toBe(1513);
    expect(MAP_MAPA61.tiles[65]?.[39]).toBe(TILE.GRASS);
    expect(isMapTileWalkable("mapa61", 39, 65)).toBe(false);
  });

  it("permite caminar sobre orilla legacy de Puerto de Banderbille", () => {
    expect(MAP_MAPA61.legacyCsmData?.L1[43]?.[40]).toBe(1506);
    expect(MAP_MAPA61.legacyCsmData?.L1[44]?.[40]).toBe(7704);
    expect(MAP_MAPA61.tiles[43]?.[40]).toBe(TILE.GRASS);
    expect(isMapTileWalkable("mapa61", 40, 43)).toBe(true);
  });
});

function parseKey(key: string): [number, number] {
  const [x, y] = key.split(",").map((n) => Number(n));
  return [x, y];
}
