import Phaser from "phaser";
import {
  getMap,
  getScopedPreloadMapIds,
  START_MAP_ID,
  type GameMap,
} from "../../maps";
import {
  isMapTileWalkable as isSharedMapTileWalkable,
} from "../../../shared/mapWalkability";
import { BOAT_ITEM_IDS, canNavigateToTile, canStartNavigationAtTile } from "../../../shared/navigation";
import { Facing } from "../../player/playerSprites";
import { MoveDirection } from "./types";
import { CharacterState } from "./CharacterState";
import { GameSceneMapController } from "./GameSceneMapController";
import { WorldItemManager } from "./WorldItemManager";
import { GameSceneMultiplayerController } from "./GameSceneMultiplayerController";

export type WorldHandlers = {
    onMapChanged: (map: GameMap, silent?: boolean) => void;
    stopMeditation: () => void;
    cancelSpellTargeting: () => void;
    syncNpcs: () => void;
    syncDummies: () => void;
    persistProgress: () => void;
    addChatLine: (text: string) => void;
    playFlash: () => void;
    killPlayerTweens: () => void;
};

/**
 * Gestiona el estado del mundo, transiciones de mapa y colisiones.
 */
export class WorldManager {
  private currentMap!: GameMap;
  private readonly mapTileOverrides = new Map<string, number>();

  constructor(
    private scene: Phaser.Scene,
    private state: CharacterState,
    private mapController: GameSceneMapController,
    private worldItemManager: WorldItemManager,
    private mpController: GameSceneMultiplayerController,
    private handlers: WorldHandlers
  ) {
    this.currentMap = getMap(state.currentMapId || START_MAP_ID);
  }

  public getCurrentMap(): GameMap {
    return this.currentMap;
  }

  public setCurrentMap(map: GameMap): void {
    this.currentMap = map;
    this.state.currentMapId = map.id;
  }

  public getMapTileOverrides(): Map<string, number> {
    return this.mapTileOverrides;
  }

  public isMapTileWalkable(tileX: number, tileY: number, isNavigating: boolean): boolean {
    if (isNavigating) {
      return canNavigateToTile(
        this.currentMap,
        tileX,
        tileY,
        this.mapTileOverrides
      );
    }
    return isSharedMapTileWalkable(
      this.state.currentMapId,
      tileX,
      tileY,
      this.mapTileOverrides
    );
  }

  public changeMap(
    transition: {
      toMapId: string;
      toTileX: number;
      toTileY: number;
      facing?: Facing;
    },
    options?: { silent?: boolean }
  ) {
    this.applyMapTransition(transition, options);
  }

  public applyMapTransition(
    transition: {
      toMapId: string;
      toTileX: number;
      toTileY: number;
      facing?: Facing;
    },
    options?: { silent?: boolean }
  ) {
    this.handlers.stopMeditation();
    this.handlers.cancelSpellTargeting();
    
    this.state.isChangingMap = true;
    this.mpController?.prepareForMapTransition();
    
    this.handlers.killPlayerTweens();

    this.worldItemManager.clearSprites();
    this.mapTileOverrides.clear();

    this.state.currentMapId = transition.toMapId;
    this.currentMap = getMap(this.state.currentMapId);
    
    this.state.playerTileX = transition.toTileX;
    this.state.playerTileY = transition.toTileY;

    if (transition.facing) {
      this.state.facing = transition.facing;
    }

    this.mapController.updateWorldBackgroundColor();

    void this.mapController
      .ensureMapVisualAssetsLoaded(this.currentMap)
      .catch((error) => {
        console.warn("No se pudieron cargar todos los assets del mapa.", error);
      })
      .then(() => {
        this.mapController.drawMap(this.currentMap);
        this.handlers.syncNpcs();
        this.handlers.syncDummies();
        this.mapController.updateCameraBounds();
        this.mapController.updateRoofTransparency(this.state.playerTileX, this.state.playerTileY);

        this.handlers.onMapChanged(this.currentMap, options?.silent);
        
        if (!options?.silent) {
            this.handlers.playFlash();
        }

        this.state.isChangingMap = false;
        this.handlers.persistProgress();
      });
  }
}
