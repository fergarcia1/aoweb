/**
 * Constantes de balance y red compartidas entre cliente, servidor y tests.
 * Sin dependencias de Phaser ni del DOM.
 */

/** Tamaño de tile en píxeles (Argentum clásico: 32×32). */
export const TILE_SIZE = 32;

/**
 * Offset Y de la hitbox de cuerpo (jugador y mobs) respecto al borde inferior del frame.
 * Negativo = caja más abajo, alineada a los pies con origen (0.5, 1).
 */
export const BODY_HITBOX_OFFSET_Y_PX = -32;

/** Milisegundos por paso de movimiento (animación cliente; servidor avanza al instante). */
export const STEP_DURATION_MS = 220;

/** Intervalo del loop de simulación del servidor (respawns, etc.). */
export const WORLD_TICK_MS = 100;

export const DEFAULT_MAP_ID = "mapa1";

export const SAFE_ZONE_MAP_IDS: ReadonlySet<string> = new Set(["mapa1"]);

/**
 * El servidor envía `world_snapshot` solo al join (estado inicial).
 * Cambios posteriores: eventos (`player_moved`, `mob_updated`, `game_event`, …).
 */
export const FULL_SNAPSHOT_ON_JOIN_ONLY = true;

/** Radio AOI en tiles (Chebyshev) para jugadores/mobs y combate. */
export const AOI_RADIUS_TILES = 24;

/** Tope de atributos en creación (raza + clase). */
export const STAT_MIN = 10;
export const STAT_MAX = 25;

/** Slots de inventario (rejilla 5×4, marco UI). */
export const INVENTORY_SLOT_COUNT = 20;

/** Slots del banco (cadena Goliath / AO clásico). */
export const BANK_SLOT_COUNT = 20;

/** Bonificación máxima por pociones de fuerza/agilidad (por encima del tope natural). */
export const ATTRIBUTE_POTION_BUFF_MAX = 15;

/** Duración del bono tras la última poción verde/amarilla o hechizo de buff de stats (ms). */
export const ATTRIBUTE_POTION_BUFF_DURATION_MS = 90_000;

/** Rango de puntos ganados por uso de poción verde/amarilla. */
export const ATTRIBUTE_POTION_GAIN_MIN = 3;
export const ATTRIBUTE_POTION_GAIN_MAX = 5;

/** Inmovilizar (id 8): duración sobre mobs / jugadores (ms). */
export const INMOVILIZAR_MOB_DURATION_MS = 60_000;
export const INMOVILIZAR_PLAYER_DURATION_MS = 12_000;

/** Paralizar (id 10) y hechizos similares: duración sobre mobs / jugadores (ms). */
export const PARALIZAR_MOB_DURATION_MS = 90_000;
export const PARALIZAR_PLAYER_DURATION_MS = 20_000;
