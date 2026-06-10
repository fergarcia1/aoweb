/** Dungeon Newbie (mapa37): entrada desde Ullathorpe y reglas de nivel. */

export const NEWBIE_DUNGEON_MAP_ID = "mapa37";
export const ULLATHORPE_MAP_ID = "mapa1";

/** Portal en Ullathorpe (tile de transición). */
export const ULLATHORPE_NEWBIE_PORTAL_TILE = { tileX: 58, tileY: 47 } as const;

/** Aparición al entrar al dungeon. */
export const NEWBIE_DUNGEON_ENTRY_TILE = { tileX: 77, tileY: 80 } as const;

/** Destino al ser expulsado por nivel (junto al portal en Ullathorpe). */
export const ULLATHORPE_NEWBIE_RETURN_TILE = { tileX: 58, tileY: 48 } as const;

/** Máximo nivel permitido dentro del dungeon (inclusive). */
export const NEWBIE_DUNGEON_MAX_STAY_LEVEL = 14;

export const NEWBIE_DUNGEON_ENTRY_DENIED_MESSAGE =
  "Sólo los aventureros de nivel 1 a 13 pueden entrar aquí.";

export const NEWBIE_DUNGEON_LEVEL_EXCEEDED_MESSAGE =
  "Has superado el nivel permitido para estar en la mazmorra Newbie.";

export function canEnterNewbieDungeon(level: number): boolean {
  return level < NEWBIE_DUNGEON_MAX_STAY_LEVEL;
}

export function canStayInNewbieDungeon(level: number): boolean {
  return level <= NEWBIE_DUNGEON_MAX_STAY_LEVEL;
}
