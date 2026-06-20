import type { Facing } from "../../player/playerSprites";
import type { EquipmentSlot, ItemId } from "../../../game-data/items/definitions";
import type { InventorySlot } from "../../items/inventoryStack";
import type { SavedCharacterProgress, SavedMacroBinding, SavedKillStats } from "../../game/characterProgressStorage";
import type { DeathPhase } from "../../systems/DeathSystem";
import type { PlayerProgressState, MacroBinding, ClassId, RaceId, CharacterFactionId } from "./types";
import type { Outfit } from "../../../game-data/outfits";
import type { PlayerArmorVisualOptions } from "../../player/playerSprites";
import { INVENTORY_SLOT_COUNT, BANK_SLOT_COUNT } from "../../../game-data/constants";
import type { CharacterGenderId, PlayerRole } from "../../data/characters";
import type { BankState } from "../../game/bankStorage";

/**
 * Contenedor central para el estado del personaje local.
 * Esta clase actúa como la única fuente de verdad para los datos del personaje,
 * facilitando la sincronización, persistencia y comunicación entre sistemas.
 */
export class CharacterState {
  // Identificación y Configuración (Normalmente inmutables durante la sesión)
  public characterId: string = "";
  public playerName: string = "";
  public playerRole: PlayerRole = "player";
  public selectedRace: RaceId = "human";
  public selectedGender: CharacterGenderId = "male";
  public selectedClass: ClassId = "guerrero";
  public selectedFaction: CharacterFactionId = "ciudadano";
  public selectedFaceIndex: number = 0;
  public homeMapId: string = "";

  // Posición y Mundo
  public currentMapId: string = "";
  public playerTileX: number = 0;
  public playerTileY: number = 0;
  public facing: Facing = "down";
  public isMoving: boolean = false;
  public isNavigating: boolean = false;
  public isChangingMap: boolean = false;
  public desiredFacing: Facing | null = null;

  // Estadísticas de Juego (Progreso)
  public playerProgress: PlayerProgressState = {
    level: 1,
    exp: 0,
    expToNext: 0,
    hp: 100,
    hpMax: 100,
    mp: 50,
    mpMax: 50,
    gold: 0,
  };

  // Inventario y Equipo
  public inventory: InventorySlot[] = Array(INVENTORY_SLOT_COUNT).fill(null);
  public equipment: Record<EquipmentSlot, ItemId | null> = {
    weapon: null,
    shield: null,
    helmet: null,
    armor: null,
  };
  public bankState: BankState = { slots: Array(BANK_SLOT_COUNT).fill(null), gold: 0 };
  public equippedOutfit: Outfit = "base";
  public equippedArmorVisual?: PlayerArmorVisualOptions;

  // Habilidades y Macros
  public learnedSpellIds = new Set<number>();
  public spellListOrder: number[] = [];
  public macroBindings: MacroBinding[] = Array.from({ length: 10 }, () => ({
    keyCode: null,
    action: "use_item",
    itemId: null,
    inventorySlotIndex: null,
    spellId: null,
  }));

  // Estadísticas y Estado Social
  public killStats: SavedKillStats = {
    creaturesKilled: 0,
    criminalsKilled: 0,
    usersKilled: 0,
  };

  // Estados de Vida y Visuales Especiales
  public deathPhase: DeathPhase = "alive";
  public useGhostAppearance: boolean = false;

  // Buffs y Estados Temporales (No necesariamente persistidos)
  public attributeBuffs = { strength: 0, agility: 0 };
  public attributeBuffExpiresAt = 0;
  public playerImmobilizedUntilMs = 0;
  public playerInvisibleUntilMs = 0;

  /** Aplica un snapshot de progreso (carga). */
  public applySnapshot(snapshot: SavedCharacterProgress) {
    this.currentMapId = snapshot.mapId;
    this.playerTileX = snapshot.tileX;
    this.playerTileY = snapshot.tileY;
    this.facing = snapshot.facing;
    this.inventory = snapshot.inventory.map((s) => (s ? { ...s } : null));
    this.equipment = { ...snapshot.equipment };
    this.equippedOutfit = snapshot.equippedOutfit;
    this.playerProgress = { ...snapshot.playerProgress };
    this.learnedSpellIds = new Set(snapshot.learnedSpellIds);
    this.spellListOrder = [...(snapshot.spellListOrder ?? [])];
    this.macroBindings = snapshot.macroBindings.map((b) => ({
      keyCode: b.keyCode,
      action: b.action,
      itemId: b.itemId,
      inventorySlotIndex: b.inventorySlotIndex ?? null,
      spellId: b.spellId,
    }));
    this.killStats = { ...snapshot.killStats };
    this.deathPhase = snapshot.deathPhase;
    this.useGhostAppearance = snapshot.useGhostAppearance;
  }

  /** Crea un snapshot de progreso (guardado). */
  public createSnapshot(worldItemsByMap: Record<string, any[]>): SavedCharacterProgress {
    return {
      version: 1,
      mapId: this.currentMapId,
      tileX: this.playerTileX,
      tileY: this.playerTileY,
      facing: this.facing,
      inventory: this.inventory.map((s) => (s ? { ...s } : null)),
      equipment: { ...this.equipment },
      equippedOutfit: this.equippedOutfit,
      playerProgress: { ...this.playerProgress },
      learnedSpellIds: Array.from(this.learnedSpellIds),
      spellListOrder: [...this.spellListOrder],
      macroBindings: this.macroBindings.map((b) => ({
        keyCode: b.keyCode,
        action: b.action,
        itemId: b.itemId,
        inventorySlotIndex: b.inventorySlotIndex,
        spellId: b.spellId,
      })),
      killStats: { ...this.killStats },
      deathPhase: this.deathPhase,
      useGhostAppearance: this.useGhostAppearance,
      worldItemsByMap,
    };
  }
}
