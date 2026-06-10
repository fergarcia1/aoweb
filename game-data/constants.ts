/**
 * Constantes de balance y red compartidas entre cliente, servidor y tests.
 * Sin dependencias de Phaser ni del DOM.
 */

/** Vitales de personajes GM/admin (Lonler, etc.). */
export const ADMIN_GM_HP_MAX = 10_000;
export const ADMIN_GM_MP_MAX = 10_000;

/** Tamaño de tile en píxeles (Argentum clásico: 32×32). */
export const TILE_SIZE = 32;

/**
 * Offset Y legacy (mobs viejos en JSON). Jugadores usan offsetY 0 (pies en el origen 0.5,1).
 * En buildHitboxFrameRect: negativo sube la caja; 0 alinea el borde inferior con los pies.
 */
export const BODY_HITBOX_OFFSET_Y_PX = -32;

/** Hitbox estándar de mobs (equivalente a `/mob oy 0`, `/mob h 1`, `/mob w 1`). */
export const DEFAULT_MOB_HITBOX = {
  offsetY: 0,
  heightTiles: 1,
  widthTiles: 1,
} as const;

/** Rango de aggro estándar (tiles Manhattan). */
export const DEFAULT_MOB_DETECTION_RANGE_TILES = 6;
export const DEFAULT_MOB_LEASH_RANGE_TILES = 15;

/** Espera antes del primer golpe al entrar en rango melee (Manhattan = 1). */
export const MOB_MELEE_ENGAGE_DELAY_MS = 400;

/** Milisegundos por paso de movimiento (animación cliente; servidor avanza al instante). */
export const STEP_DURATION_MS = 200;

/** Intervalo del loop de simulación del servidor (respawns, etc.). */
export const WORLD_TICK_MS = 100;

export const DEFAULT_MAP_ID = "mapa1";

/** Máximo de oro que se puede tirar en una sola acción. */
export const GOLD_DROP_MAX_AMOUNT = 100_000;

/** Máximo por pila de oro en el suelo. */
export const GOLD_WORLD_STACK_MAX = 10_000;

export const SAFE_ZONE_MAP_IDS: ReadonlySet<string> = new Set(["mapa1"]);

/** Tiempo que el personaje permanece en el mundo tras desconectarse en zona insegura. */
export const LOGOUT_GRACE_MS = 10_000;

/** Cuenta regresiva de /salir en zona insegura (segundos). */
export const UNSAFE_LOGOUT_COUNTDOWN_SECONDS = 10;

/**
 * El servidor envía `world_snapshot` solo al join (estado inicial).
 * Cambios posteriores: eventos (`player_moved`, `mob_updated`, `game_event`, …).
 */
export const FULL_SNAPSHOT_ON_JOIN_ONLY = true;

/** Radio AOI en tiles (Chebyshev) para jugadores/mobs y combate. */
export const AOI_RADIUS_TILES = 24;

/** Radio en tiles para oír combate, hechizos y pasos ajenos (Chebyshev). */
export const SOUND_HEARING_RADIUS_TILES = 15;

/** Tope de atributos en creación (raza + clase). */
export const STAT_MIN = 10;
export const STAT_MAX = 25;

/** Slots de inventario (rejilla 5×4, marco UI). */
export const INVENTORY_COLS = 5;
export const INVENTORY_ROWS = 4;
export const INVENTORY_SLOT_COUNT = INVENTORY_COLS * INVENTORY_ROWS;

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
