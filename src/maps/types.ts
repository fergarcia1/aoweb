/** 0 pasto | 1 agua | 2 piedra | 3 portal | 4 suelo bosque | 5 árbol | 6 pasto bloqueado | 7 bosque bloqueado | 8 arena | 9 arena bloqueada */
export type TileType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

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

export interface GameMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileType[][];
  transitions: MapTransition[];
  edgeTransitions?: Partial<Record<MapEdge, EdgeTransition>>;
  /** Tile usado para el fondo fuera de mapa (si la cámara se aleja del borde). */
  outsideTile?: TileType;
}
