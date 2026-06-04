import { BODY_HITBOX_OFFSET_Y_PX, STAT_MIN } from "../../../game-data/constants";
import { TILE_SIZE } from "../../config";

export const DEFAULT_PLAYER_NAME = "Lonler";
export const ATTACK_COOLDOWN_MS = 800;
export const ATTACK_MIN_DAMAGE = 8;
export const ATTACK_MAX_DAMAGE = 16;
export const EXP_BASE = 100;
export const EXP_GROWTH = 1.35;
export const TREE_TEXTURE_KEY = "ao_tree_arbol1";
export const TREE_TEXTURE_PATH = "/assets/ao/imperium/trees/arbol1.png";
export const TREE_SCALE = 0.75;
export const TREE_FRONT_DEPTH = 11.4;
export const TREE_OCCLUDED_ALPHA = 0.48;
export const BUILDING_OCCLUDED_ALPHA = 0.55;
/** Objetos más bajos que esto no se atenúan (piedras, decoración baja). */
export const SCENERY_OCCLUDER_MIN_HEIGHT_PX = TILE_SIZE * 0.85;
export const CAMERA_BOUNDS_PADDING_TILES = 9999;
export const BASELINE_STRENGTH = 19;
export const BASE_MISS_CHANCE = 0.18;
export const MISS_REDUCTION_PER_AGILITY = 0.007;
export const MIN_MISS_CHANCE = 0.03;
export const MAX_MISS_CHANCE = 0.25;
/** Oro inicial al entrar / resetear. */
export const TEST_START_GOLD = 0;
export const TEST_HEALTH_POTION_STACK = 20;
export const TEST_MANA_POTION_STACK = 15;
export const DEFAULT_MACRO_ACTION = "use_item" as const;
export const HUD_STRENGTH_POTION_TEXTURE_KEY = "hud_strength_potion_icon";
export const HUD_AGILITY_POTION_TEXTURE_KEY = "hud_agility_potion_icon";
/** Caja de objetivo por defecto (estilo IAO: cuerpo sobre los pies, no solo el sprite). */
export const DEFAULT_MOB_HITBOX_OFFSET_Y = BODY_HITBOX_OFFSET_Y_PX;
export const DEFAULT_MOB_HITBOX_HEIGHT_TILES = 2;
export const DEFAULT_MOB_HITBOX_WIDTH_TILES = 1;
/** Escala vertical de la caja de click (0.8 = 20% más baja). */
export const MOB_HITBOX_HEIGHT_RATIO = 0.8;
/** Ancho de la caja de click del jugador (cuerpo, no tile entero). */
export const PLAYER_HITBOX_WIDTH_PX = 22;
export const PLAYER_HITBOX_PROFILE_WIDTH_PX = 16;
/** Alto del frame del cuerpo (32×48); caja de pies a cabeza con offsetY 0. */
export const PLAYER_HITBOX_HEIGHT_PX = 48;
/** Centrado en el origen del sprite (0.5, 1); el arte de perfil usa frame más angosto. */
export const PLAYER_HITBOX_OFFSET_X = 0;
/** 0 = borde inferior de la caja en los pies (origen del sprite). */
export const PLAYER_HITBOX_OFFSET_Y = 0;
export const TRAINING_DUMMY_NAME = "Dummy";
export const WORLD_DEPTH_BASE = 9;
export const WORLD_DEPTH_SCALE = 1000;

export const CLASS_USES_MANA: Record<
  import("./types").ClassId,
  boolean
> = {
  paladin: true,
  clerigo: true,
  mago: true,
  nigromante: true,
  druida: true,
  bardo: true,
  guerrero: false,
  cazador: false,
  asesino: true,
};

export { STAT_MIN };
