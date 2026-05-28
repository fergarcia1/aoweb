/**
 * Constantes de balance y red compartidas entre cliente, servidor y tests.
 * Sin dependencias de Phaser ni del DOM.
 */

/** Tamaño de tile en píxeles (Argentum clásico: 32×32). */
export const TILE_SIZE = 32;

/** Milisegundos por paso de movimiento (animación cliente; servidor avanza al instante). */
export const STEP_DURATION_MS = 220;

/** Intervalo del loop de simulación del servidor (respawns, etc.). */
export const WORLD_TICK_MS = 100;

export const DEFAULT_MAP_ID = "pueblo";

export const SAFE_ZONE_MAP_IDS: ReadonlySet<string> = new Set(["pueblo"]);

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

/** Slots de inventario actuales del cliente y servidor. */
export const INVENTORY_SLOT_COUNT = 24;

/** Bonificación máxima por pociones de fuerza/agilidad (por encima del tope natural). */
export const ATTRIBUTE_POTION_BUFF_MAX = 15;

/** Duración del bono tras la última poción verde o amarilla (ms). */
export const ATTRIBUTE_POTION_BUFF_DURATION_MS = 90_000;

/** Rango de puntos ganados por uso de poción verde/amarilla. */
export const ATTRIBUTE_POTION_GAIN_MIN = 3;
export const ATTRIBUTE_POTION_GAIN_MAX = 5;
