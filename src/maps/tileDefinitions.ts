/** Color promedio del tile Pasto en 20.png (Grh468: posición 256×0, 32×32). */
const AO20_GRASS_COLOR = 0x2f3918;

/** Variante un poco más oscura para bordes, derivada del mismo pasto. */
const AO20_GRASS_BORDER_COLOR = 0x252f12;

/** Color promedio del tile agua en 20.png (columna 2, fila 2 → frame 34). */
const AO20_WATER_COLOR = 0x1f5b9c;

export const TILE = {
    GRASS: 0,
    WATER: 1,
    WALL: 2,
    PORTAL: 3,
    FOREST_GRASS: 4,
    TREE: 5,
    GRASS_BLOCKED: 6,
    FOREST_GRASS_BLOCKED: 7,
    SAND: 8,
    SAND_BLOCKED: 9,
  } as const;
  
  export type TileId = (typeof TILE)[keyof typeof TILE];
  
  export type TileRenderMode = "solid" | "ao_grass" | "ao_water";

  export type TileDefinition = {
    name: string;
    color: number;
    walkable: boolean;
    renderAs?: TileRenderMode;
    isPortal?: boolean;
    decoration?: "tree";
  };
  
  export const TILE_DEFINITIONS: Record<TileId, TileDefinition> = {
    [TILE.GRASS]: {
      name: "Pasto",
      color: AO20_GRASS_COLOR,
      walkable: true,
      renderAs: "ao_grass",
    },
  
    [TILE.WATER]: {
      name: "Agua",
      color: AO20_WATER_COLOR,
      walkable: false,
      renderAs: "ao_water",
    },
  
    [TILE.WALL]: {
      name: "Borde",
      color: AO20_GRASS_BORDER_COLOR,
      walkable: false,
    },
  
    [TILE.PORTAL]: {
      name: "Portal",
      color: AO20_GRASS_COLOR,
      walkable: true,
      renderAs: "ao_grass",
      isPortal: true,
    },
  
    [TILE.FOREST_GRASS]: {
      name: "Pasto de bosque",
      color: AO20_GRASS_COLOR,
      walkable: true,
      renderAs: "ao_grass",
    },

    [TILE.GRASS_BLOCKED]: {
      name: "Pasto de borde",
      color: AO20_GRASS_COLOR,
      walkable: false,
      renderAs: "ao_grass",
    },

    [TILE.FOREST_GRASS_BLOCKED]: {
      name: "Pasto de bosque (borde)",
      color: AO20_GRASS_COLOR,
      walkable: false,
      renderAs: "ao_grass",
    },

    [TILE.SAND]: {
      name: "Arena",
      color: 0xb99a5a,
      walkable: true,
      renderAs: "solid",
    },

    [TILE.SAND_BLOCKED]: {
      name: "Arena de borde",
      color: 0xb99a5a,
      walkable: false,
      renderAs: "solid",
    },
  
    [TILE.TREE]: {
      name: "Árbol",
      color: AO20_GRASS_COLOR,
      walkable: false,
      renderAs: "ao_grass",
      decoration: "tree",
    },
  };
  
  export function getTileDefinition(tileId: number): TileDefinition {
    return (
      TILE_DEFINITIONS[tileId as TileId] ?? {
        name: "Tile desconocido",
        color: 0xff00ff,
        walkable: false,
      }
    );
  }