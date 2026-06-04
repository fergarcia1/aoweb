import type { MapObjectId } from "./mapObjectDefinitions";

/** 0 pasto | 1 agua | 2 piedra | 3 portal | 4 suelo bosque | 5 árbol | 6 pasto bloqueado | 7 bosque bloqueado | 8 arena | 9 arena bloqueada | 10 tierra */
export type TileType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Instancia de un prefab en el mapa (ancla = centro inferior). */
export type MapObjectPlacement = {
  objectId: MapObjectId;
  tileX: number;
  tileY: number;
};

export interface MapTransition {
  tileX: number;
  tileY: number;
  toMapId: string;
  toTileX: number;
  toTileY: number;
  /** Dirección al aparecer en el mapa destino. */
  facing?: "up" | "down" | "left" | "right";
}

export type MapEdge = "up" | "down" | "left" | "right";

export interface EdgeTransition {
  toMapId: string;
  /** Dirección sugerida al aparecer en el mapa destino. */
  facing?: MapEdge;
}

/** Imagen decorativa a nivel del suelo (caminos, marcas en el terreno). */
export interface GroundOverlay {
  /** Clave de textura registrada en Phaser. */
  textureKey: string;
  /** Ruta al asset (PNG). */
  texturePath: string;
  /** Tile X de la esquina superior izquierda. */
  tileX: number;
  /** Tile Y de la esquina superior izquierda. */
  tileY: number;
  /** Ancho que ocupa en tiles. */
  widthTiles: number;
  /** Alto que ocupa en tiles. */
  heightTiles: number;
}

export interface GameMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileType[][];
  transitions: MapTransition[];
  edgeTransitions?: Partial<Record<MapEdge, EdgeTransition>>;
  roofTriggers?: { tileX: number; tileY: number }[];
  /** Tile usado para el fondo fuera de mapa (si la cámara se aleja del borde). */
  outsideTile?: TileType;
  /** Color de fondo del canvas cuando el mapa lo define (ej. catacumbas). */
  backgroundColor?: string;
  /** Edificios y props colocados (sprites del export AO). */
  objects?: MapObjectPlacement[];
  /** Imágenes decorativas a nivel del suelo (caminos, etc.). */
  groundOverlays?: GroundOverlay[];
  /** Objetos interactivos clásicos del mapa (Puertas, Carteles). */
  legacyObjs?: { tileX: number; tileY: number; objIndex: number; objAmount: number }[];
  /** Datos crudos del mapa original de ImperiumAO para renderizado gráfico clásico. */
  legacyCsmData?: {
    L1: number[][];
    L2: number[][];
    L3: number[][];
    L4: number[][];
    fileNums?: number[];
  };
}
