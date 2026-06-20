import Phaser from "phaser";
import { TILE_SIZE } from "../../config";
import {
  getMap,
  getWorldMapBiomeColor,
  getWorldMapGridBounds,
  getWorldMapMarkerPosition,
  WORLD_MAP_CELLS,
  type GameMap,
} from "../../maps";
import { isPlayerUnderLegacyRoof } from "../../../shared/mapWalkability";
import { syncMapSceneryOcclusion } from "./mapSceneryOcclusion";
import { getTileDefinition, TILE } from "../../maps/tileDefinitions";
import { spawnMapObjectImage } from "../../maps/mapObjects";
import {
  collectLegacyObjGrhFileNums,
  getLegacyObjGrhId,
  resolveImportedObjDef,
  shouldSpawnLegacyCsmObj,
  type GrhIndexEntry,
} from "../../maps/legacyMapObjects";
import {
  createGrassTile,
  createTerrainTile,
  pickGrassFrame,
  pickWaterFrame,
} from "../../terrain/aoTerrain";
import { GAME_FONT, GAME_TEXT_RESOLUTION } from "../../ui/fonts";
import { getGameViewport } from "../../ui/layout";
import type { GameUi } from "../../ui/gameUi";
import {
  CAMERA_BOUNDS_PADDING_TILES,
  TREE_FRONT_DEPTH,
  TREE_SCALE,
  TREE_TEXTURE_KEY,
} from "./constants";
import { spawnMapPortalSprites } from "../../maps/portalVisuals";
import { findLegacyDoorInteractionTile } from "../../../shared/legacyDoorInteraction";

type WorldCameraObjectInput =
  | Phaser.GameObjects.GameObject
  | (Phaser.GameObjects.GameObject | undefined | null)[]
  | undefined
  | null;

export type GameSceneMapDeps = {
  scene: Phaser.Scene;
  getGameUi: () => GameUi;
  getPlayer: () => Phaser.GameObjects.Sprite;
  getPlayerFace: () => Phaser.GameObjects.Sprite;
  getPlayerNameLabel: () => Phaser.GameObjects.Text;
  getEquippedSprites: () => Phaser.GameObjects.Sprite[];
  getWorldItemSprites: () => Phaser.GameObjects.Sprite[];
  getDummyRenderObjects: () => Phaser.GameObjects.GameObject[];
  depthFromFeetY: (feetY: number) => number;
  getCurrentMap: () => GameMap;
  getCurrentMapId: () => string;
  getPlayerTile: () => { x: number; y: number };
  refreshMinimap: () => void;
  onViewportLayout: () => void;
  setDoorTileOverride: (tileX: number, tileY: number, isOpen: boolean) => void;
  isMapTileWalkable: (tileX: number, tileY: number) => boolean;
  registerForUiIgnore?: (...objects: WorldCameraObjectInput[]) => void;
  addToWorld?: (...objects: WorldCameraObjectInput[]) => void;
};

/**
 * Renderizado del mapa, cámaras mundo/UI y overlay del mapa mundial (tecla M).
 */
export class GameSceneMapController {
  readonly mapTiles: Phaser.GameObjects.Container;
  readonly mapOverlay: Phaser.GameObjects.Graphics;
  readonly worldLayer: Phaser.GameObjects.Container;

  private uiCamera?: Phaser.Cameras.Scene2D.Camera;
  private readonly mapTrees: Phaser.GameObjects.Image[] = [];
  private readonly mapBuildings: Phaser.GameObjects.Image[] = [];
  private readonly mapRoofs: Phaser.GameObjects.Image[] = [];
  private readonly dynamicObjs = new Map<string, Phaser.GameObjects.Image>();
  private readonly mapPortalSprites: Phaser.GameObjects.Sprite[] = [];
  private lastRoofTileKey = "";
  private lastRoofHidden = false;
  private worldMapOverlay?: Phaser.GameObjects.Container;
  private worldMapCurrentMarker?: Phaser.GameObjects.Arc;
  private worldMapPanelGeom = { x: 0, y: 0, w: 0, h: 0 };
  private worldMapGridParams: {
    gridStartX: number;
    gridStartY: number;
    cellSize: number;
    bounds: ReturnType<typeof getWorldMapGridBounds>;
  } | null = null;
  private lastOcclusionPlayerX: number | null = null;
  private lastOcclusionPlayerY: number | null = null;
  private worldMapOpen = false;

  constructor(private readonly deps: GameSceneMapDeps) {
    const { scene } = deps;
    this.mapTiles = scene.add.container(0, 0).setDepth(0).setScrollFactor(1);
    this.mapOverlay = scene.add.graphics().setDepth(1).setScrollFactor(1);
    this.worldLayer = this.mapTiles;
  }

  addToWorld(...objects: WorldCameraObjectInput[]): void {
    const flat = objects.flat();
    const valid = flat.filter((obj): obj is Phaser.GameObjects.GameObject => Boolean(obj));
    if (valid.length === 0) return;

    for (const obj of valid) {
      const scrollable = obj as Phaser.GameObjects.GameObject & {
        setScrollFactor?: (x: number, y?: number) => Phaser.GameObjects.GameObject;
      };
      scrollable.setScrollFactor?.(1, 1);
    }

    if (this.uiCamera) {
      this.uiCamera.ignore(valid);
    }
  }

  registerForUiIgnore(...objects: WorldCameraObjectInput[]): void {
    const flat = objects.flat();
    const valid = flat.filter((obj): obj is Phaser.GameObjects.GameObject => Boolean(obj));
    if (valid.length > 0 && this.uiCamera) {
      this.uiCamera.ignore(valid);
    }
  }

  getMapTrees(): readonly Phaser.GameObjects.Image[] {
    return this.mapTrees;
  }

  getMapBuildings(): readonly Phaser.GameObjects.Image[] {
    return this.mapBuildings;
  }

  getMapRoofs(): readonly Phaser.GameObjects.Image[] {
    return this.mapRoofs;
  }

  getUiCamera(): Phaser.Cameras.Scene2D.Camera | undefined {
    return this.uiCamera;
  }

  setUiCamera(camera: Phaser.Cameras.Scene2D.Camera): void {
    this.uiCamera = camera;
  }

  getWorldMapOverlay(): Phaser.GameObjects.Container | undefined {
    return this.worldMapOverlay;
  }

  getLegacyDoorTileAtWorldPoint(
    worldX: number,
    worldY: number
  ): { tileX: number; tileY: number } | null {
    const clickTileX = Math.floor(worldX / TILE_SIZE);
    const clickTileY = Math.floor(worldY / TILE_SIZE);
    return findLegacyDoorInteractionTile(this.deps.getCurrentMap(), clickTileX, clickTileY);
  }

  ensureMapVisualAssetsLoaded(map: GameMap): Promise<void> {
    const { scene } = this.deps;
    const grhIndex = scene.cache.json.get("grh_index") as
      | Record<string, GrhIndexEntry>
      | undefined;
    let queued = 0;

    const queueImage = (key: string, path: string) => {
      if (scene.textures.exists(key)) {
        return;
      }
      scene.load.image(key, path);
      queued += 1;
    };

    for (const overlay of map.groundOverlays ?? []) {
      queueImage(overlay.textureKey, overlay.texturePath);
    }

    if (grhIndex) {
      const legacyFileNums = new Set<number>();
      if (map.legacyCsmData?.fileNums) {
        for (const fileNum of map.legacyCsmData.fileNums) {
          legacyFileNums.add(fileNum);
        }
      }
      for (const fileNum of collectLegacyObjGrhFileNums(map, grhIndex)) {
        legacyFileNums.add(fileNum);
      }
      for (const fileNum of legacyFileNums) {
        queueImage(`grh_file_${fileNum}`, `assets/ao/graficos/${fileNum}.png`);
      }
    }

    if (queued === 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      if (!scene.load.isLoading()) {
        scene.load.start();
      }
    });
  }

  drawMap(map: GameMap): void {
    const { scene } = this.deps;
    this.mapTiles.removeAll(true);
    this.mapOverlay.clear();
    this.mapTrees.forEach((tree) => tree.destroy());
    this.mapTrees.length = 0;
    this.mapBuildings.forEach((building) => building.destroy());
    this.mapBuildings.length = 0;
    this.mapRoofs.forEach((roof) => roof.destroy());
    this.mapRoofs.length = 0;
    this.dynamicObjs.forEach((obj) => obj.destroy());
    this.dynamicObjs.clear();
    this.mapPortalSprites.forEach((sprite) => sprite.destroy());
    this.mapPortalSprites.length = 0;
    this.lastRoofTileKey = "";
    this.lastRoofHidden = false;

    if (map.legacyCsmData) {
      this.drawLegacyMap(map);
    } else {
      for (let y = 0; y < map.height; y += 1) {
        for (let x = 0; x < map.width; x += 1) {
          const tile = map.tiles[y][x];
          const tileDefinition = getTileDefinition(tile);
          const px = x * TILE_SIZE;
          const py = y * TILE_SIZE;

          if (tileDefinition.renderAs === "ao_grass") {
            this.mapTiles.add(createGrassTile(scene, px, py, x, y));
          } else if (tileDefinition.renderAs === "ao_water") {
            this.mapTiles.add(createTerrainTile(scene, px, py, pickWaterFrame(x, y)));
          } else {
            this.mapOverlay.fillStyle(tileDefinition.color, 1);
            this.mapOverlay.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }

          if (tileDefinition.decoration === "tree") {
            this.drawTreeTile(px, py);
          }
        }
      }
    }

    for (const overlay of map.groundOverlays ?? []) {
      const texture = scene.textures.get(overlay.textureKey);
      if (texture.key === "__MISSING") continue;
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      const img = scene.add
        .image(overlay.tileX * TILE_SIZE, overlay.tileY * TILE_SIZE, overlay.textureKey)
        .setOrigin(0, 0)
        .setDisplaySize(overlay.widthTiles * TILE_SIZE, overlay.heightTiles * TILE_SIZE);
      this.mapTiles.add(img);
    }

    for (const placement of map.objects ?? []) {
      const building = spawnMapObjectImage(scene, placement, (feetY) =>
        this.deps.depthFromFeetY(feetY)
      );
      this.mapBuildings.push(building);
      this.addToWorld(building);
    }

    const grhIndex = scene.cache.json.get("grh_index") as
      | Record<string, GrhIndexEntry>
      | undefined;
    if (grhIndex) {
      if (map.legacyObjs) {
        for (const obj of map.legacyObjs) {
          if (!shouldSpawnLegacyCsmObj(obj)) {
            continue;
          }
          const img = this.spawnLegacyObj(obj.objIndex, obj.tileX, obj.tileY, grhIndex);
          if (img) {
            this.dynamicObjs.set(`${obj.tileX},${obj.tileY}`, img);
          }
        }
      }
    }

    const portalSprites = spawnMapPortalSprites(scene, map.id, (feetY) =>
      this.deps.depthFromFeetY(feetY)
    );
    this.mapPortalSprites.push(...portalSprites);
    this.addToWorld(portalSprites);

    this.refreshSceneryUiCameraIgnore();
  }

  /** Mantiene árboles/edificios en la cámara del mundo (no en la UI). */
  refreshSceneryUiCameraIgnore(): void {
    const scenery = [
      ...this.mapTrees,
      ...this.mapBuildings,
      ...this.mapRoofs,
      ...Array.from(this.dynamicObjs.values()),
      ...this.mapPortalSprites,
    ];
    if (scenery.length > 0) {
      this.addToWorld(scenery);
    }
  }

  private drawLegacyMap(map: GameMap) {
    const { scene } = this.deps;
    const legacy = map.legacyCsmData!;
    const grhIndex = scene.cache.json.get("grh_index");

    if (!grhIndex) {
      console.warn("grh_index.json no cargado.");
      return;
    }

    const drawGrh = (
      grhId: number,
      px: number,
      py: number,
      tileX: number,
      tileY: number,
      layer: "ground" | "above",
      options?: { asRoofLayer?: boolean }
    ) => {
      if (grhId <= 0) return null;
      let grh = grhIndex[grhId];
      if (!grh) return null;
      // Resolve animation to first frame for maps (usually trees/water are animated, we just use frame 1 for now)
      if (grh.numFrames > 1 && grh.frames) {
        grh = grhIndex[grh.frames[0]];
      }
      if (!grh || !grh.fileNum) return null;

      const textureKey = `grh_file_${grh.fileNum}`;
      if (!scene.textures.exists(textureKey)) return null;

      const img = scene.add
        .image(
          px + TILE_SIZE / 2 - grh.pixelWidth / 2 - grh.sX,
          py + TILE_SIZE - grh.pixelHeight - grh.sY,
          textureKey
        )
        .setOrigin(0, 0)
        .setCrop(grh.sX, grh.sY, grh.pixelWidth, grh.pixelHeight);

      if (layer === "ground") {
        this.mapTiles.add(img);
      } else if (options?.asRoofLayer) {
        img.setDepth(100000);
        this.mapRoofs.push(img);
        this.addToWorld(img);
      } else {
        const tileFeetY = py + TILE_SIZE;
        img.setDepth(this.deps.depthFromFeetY(tileFeetY));
        img.setData("grhPixelHeight", grh.pixelHeight);
        img.setData("mapTileX", tileX);
        img.setData("mapTileY", tileY);
        this.mapBuildings.push(img);
        this.addToWorld(img);
      }
      return img;
    };

    for (let x = 0; x < map.width; x += 1) {
      for (let y = 0; y < map.height; y += 1) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        drawGrh(legacy.L1[y][x], px, py, x, y, "ground");
        drawGrh(legacy.L2[y][x], px, py, x, y, "ground");
        drawGrh(legacy.L3[y][x], px, py, x, y, "above");
        const l4Grh = legacy.L4[y][x];
        if (l4Grh > 0) {
          drawGrh(l4Grh, px, py, x, y, "above", { asRoofLayer: true });
        }
      }
    }
  }

  private spawnLegacyObj(
    objIndex: number,
    tileX: number,
    tileY: number,
    grhIndex: Record<string, GrhIndexEntry>
  ): Phaser.GameObjects.Image | null {
    const { scene } = this.deps;
    const def = resolveImportedObjDef(objIndex);
    if (!def) {
      return null;
    }

    const grhId = getLegacyObjGrhId(def, objIndex);
    let grh = grhIndex[grhId];
    if (grh?.numFrames && grh.numFrames > 1 && grh.frames?.[0]) {
      grh = grhIndex[grh.frames[0]];
    }
    if (
      !grh?.fileNum ||
      grh.pixelWidth === undefined ||
      grh.pixelHeight === undefined ||
      grh.sX === undefined ||
      grh.sY === undefined
    ) {
      return null;
    }

    const textureKey = `grh_file_${grh.fileNum}`;
    if (!scene.textures.exists(textureKey)) {
      return null;
    }

    const px = tileX * TILE_SIZE;
    const py = tileY * TILE_SIZE;
    const tileFeetY = py + TILE_SIZE;

    const img = scene.add
      .image(
        px + TILE_SIZE / 2 - grh.pixelWidth / 2 - grh.sX,
        py + TILE_SIZE - grh.pixelHeight - grh.sY,
        textureKey
      )
      .setOrigin(0, 0)
      .setCrop(grh.sX, grh.sY, grh.pixelWidth, grh.pixelHeight);

    img.setDepth(this.deps.depthFromFeetY(tileFeetY));
    img.setData("grhPixelHeight", grh.pixelHeight);
    img.setData("mapTileX", tileX);
    img.setData("mapTileY", tileY);
    if (def.objType === 6 && (def.indexAbierta > 0 || def.indexCerrada > 0)) {
      const isOpen = objIndex === def.indexAbierta;
      img.setData("isLegacyDoor", true);
      img.setData("isLegacyDoorOpen", isOpen);
      this.deps.setDoorTileOverride(tileX, tileY, isOpen);
    }
    this.mapBuildings.push(img);
    this.addToWorld(img);
    return img;
  }

  updateDynamicObject(tileX: number, tileY: number, newObjIndex: number): void {
    const key = `${tileX},${tileY}`;
    const img = this.dynamicObjs.get(key);
    if (img) {
      img.destroy();
      this.dynamicObjs.delete(key);
      const index = this.mapBuildings.indexOf(img);
      if (index !== -1) {
        this.mapBuildings.splice(index, 1);
      }
    }
    const grhIndex = this.deps.scene.cache.json.get("grh_index");
    if (grhIndex) {
      const newImg = this.spawnLegacyObj(newObjIndex, tileX, tileY, grhIndex);
      if (newImg) {
        this.dynamicObjs.set(key, newImg);

        const def = resolveImportedObjDef(newObjIndex);
        if (def && (def.indexAbierta > 0 || def.indexCerrada > 0)) {
          const isOpen = newObjIndex === def.indexAbierta;
          this.deps.setDoorTileOverride(tileX, tileY, isOpen);
        }
      }
    }
  }

  updateCameraBounds(): void {
    const map = this.deps.getCurrentMap();
    const worldWidth = map.width * TILE_SIZE;
    const worldHeight = map.height * TILE_SIZE;
    const cameraPadding = CAMERA_BOUNDS_PADDING_TILES * TILE_SIZE;
    this.deps.scene.cameras.main.setBounds(
      -cameraPadding,
      -cameraPadding,
      worldWidth + cameraPadding * 2,
      worldHeight + cameraPadding * 2
    );
  }

  updateWorldBackgroundColor(): void {
    const map = this.deps.getCurrentMap();
    if (map.backgroundColor) {
      this.deps.scene.cameras.main.setBackgroundColor(map.backgroundColor);
      return;
    }
    const outsideTile = map.outsideTile ?? TILE.GRASS;
    const outsideColor = getTileDefinition(outsideTile).color;
    this.deps.scene.cameras.main.setBackgroundColor(outsideColor);
  }

  setupCameras(): void {
    const { scene } = this.deps;
    const w = scene.scale.width;
    const h = scene.scale.height;

    this.uiCamera = scene.cameras.add(0, 0, w, h);
    this.uiCamera.setScroll(0, 0).setZoom(1);

    const worldCam = scene.cameras.main;
    this.updateCameraBounds();
    worldCam.roundPixels = true;
    worldCam.startFollow(this.deps.getPlayer(), true, 1, 1);
    worldCam.setZoom(1);

    const gameUi = this.deps.getGameUi();
    worldCam.ignore([gameUi.getContainer(), ...gameUi.getSceneUiObjects()]);
    if (this.worldMapOverlay) {
      worldCam.ignore(this.worldMapOverlay);
    }

    const equipped = this.deps.getEquippedSprites();
    this.uiCamera.ignore([
      this.mapTiles,
      this.mapOverlay,
      ...this.mapTrees,
      ...this.mapBuildings,
      ...this.mapRoofs,
      this.deps.getPlayer(),
      this.deps.getPlayerFace(),
      this.deps.getPlayerNameLabel(),
      ...equipped,
      ...this.deps.getWorldItemSprites(),
      ...this.deps.getDummyRenderObjects(),
    ]);

    this.applyCameraLayout();
    this.refreshSceneryUiCameraIgnore();
  }

  applyCameraLayout(): void {
    if (!this.uiCamera) return;

    const { scene } = this.deps;
    const w = scene.scale.width;
    const h = scene.scale.height;
    const view = getGameViewport(w, h);

    this.uiCamera.setViewport(0, 0, w, h);
    this.uiCamera.setSize(w, h);

    const worldCam = scene.cameras.main;
    worldCam.setViewport(view.x, view.y, view.width, view.height);
    this.applyCameraRenderOrder();
    this.rebuildWorldMapOverlay();
    this.deps.refreshMinimap();
    this.deps.onViewportLayout();
  }

  snapCameraScroll(): void {
    const cam = this.deps.scene.cameras.main;
    cam.scrollX = Math.round(cam.scrollX);
    cam.scrollY = Math.round(cam.scrollY);
  }

  getGameViewportRect() {
    const { scene } = this.deps;
    return getGameViewport(scene.scale.width, scene.scale.height);
  }

  /** Área completa del mapa; no recortar por zonas de transición de borde. */
  getMinimapBounds() {
    const map = this.deps.getCurrentMap();
    return {
      minTileX: 0,
      minTileY: 0,
      maxTileX: Math.max(0, map.width - 1),
      maxTileY: Math.max(0, map.height - 1),
    };
  }

  createWorldMapOverlay(): void {
    const { scene } = this.deps;
    this.worldMapOverlay = scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(2000)
      .setVisible(false);
    this.rebuildWorldMapOverlay();
  }

  isWorldMapOpen(): boolean {
    return this.worldMapOpen;
  }

  toggleWorldMap(): void {
    if (!this.worldMapOverlay) return;
    this.worldMapOpen = !this.worldMapOpen;
    this.worldMapOverlay.setVisible(this.worldMapOpen);
    this.updateWorldMapMarker();
  }

  updateWorldMapMarker(): void {
    if (!this.worldMapCurrentMarker) return;
    const marker = this.getWorldMapMarkerScreenPosition();
    if (!marker) return;
    this.worldMapCurrentMarker.setPosition(marker.x, marker.y);
  }

  getDrawPosition(tileX: number, tileY: number): { x: number; y: number } {
    return {
      x: tileX * TILE_SIZE,
      y: tileY * TILE_SIZE,
    };
  }

  isPlayerUnderRoof(tileX: number, tileY: number): boolean {
    return isPlayerUnderLegacyRoof(this.deps.getCurrentMap(), tileX, tileY);
  }

  /** Paredes al sur del jugador (tileY mayor) dibujan por encima; al norte, detrás. */
  syncBuildingDepths(playerTileX: number, playerTileY: number, playerDepth: number): void {
    for (const building of this.mapBuildings) {
      const ty = building.getData("mapTileY") as number | undefined;
      if (ty === undefined) {
        continue;
      }
      if (ty > playerTileY) {
        building.setDepth(playerDepth + 0.2);
      } else if (ty < playerTileY) {
        building.setDepth(playerDepth - 0.2);
      } else {
        building.setDepth(playerDepth + 0.15);
      }
    }
  }

  updateRoofTransparency(tileX: number, tileY: number): void {
    const isUnderRoof = this.isPlayerUnderRoof(tileX, tileY);

    const targetAlpha = isUnderRoof ? 0.0 : 1.0;
    for (const roof of this.mapRoofs) {
      // Opt: Solo si cambió
      if (roof.alpha !== targetAlpha) {
        roof.setAlpha(targetAlpha);
        roof.setVisible(targetAlpha > 0);
      }
    }
  }

  syncSceneryOcclusion(playerTileX: number, playerTileY: number): void {
    const player = this.deps.getPlayer();

    // Dirty-check: only re-evaluate if the player actually moved
    if (this.lastOcclusionPlayerX === player.x && this.lastOcclusionPlayerY === player.y) {
      return;
    }
    this.lastOcclusionPlayerX = player.x;
    this.lastOcclusionPlayerY = player.y;

    syncMapSceneryOcclusion({
      map: this.deps.getCurrentMap(),
      playerTileX,
      playerTileY,
      playerX: player.x,
      playerY: player.y,
      isMapTileWalkable: this.deps.isMapTileWalkable,
      trees: this.mapTrees,
      buildings: this.mapBuildings,
      onUpdateRoofTransparency: (tx, ty) => this.updateRoofTransparency(tx, ty),
      isPlayerUnderRoof: (tx, ty) => this.isPlayerUnderRoof(tx, ty),
    });
  }

  private drawTreeTile(px: number, py: number): void {
    const { scene } = this.deps;
    if (scene.textures.exists(TREE_TEXTURE_KEY)) {
      const tree = scene.add
        .image(px + TILE_SIZE / 2, py + TILE_SIZE + 2, TREE_TEXTURE_KEY)
        .setOrigin(0.5, 1)
        .setScale(TREE_SCALE)
        .setDepth(TREE_FRONT_DEPTH);
      this.mapTrees.push(tree);
      this.addToWorld(tree);
      return;
    }

    const g = this.mapOverlay;
    g.fillStyle(0x6b3f1d, 1);
    g.fillRect(px + 14, py + 15, 4, 12);
    g.fillStyle(0x1f6f2e, 1);
    g.fillRect(px + 7, py + 8, 18, 10);
  }

  private applyCameraRenderOrder(): void {
    if (!this.uiCamera) return;

    const cameras = this.deps.scene.cameras.cameras;
    const uiIndex = cameras.indexOf(this.uiCamera);
    if (uiIndex === -1) return;

    const worldCam = this.deps.scene.cameras.main;
    const worldIndex = cameras.indexOf(worldCam);
    if (worldIndex === -1) return;

    if (uiIndex < worldIndex) {
      cameras.splice(uiIndex, 1);
      const mainIdx = cameras.indexOf(worldCam);
      cameras.splice(mainIdx + 1, 0, this.uiCamera);
    }
  }

  private rebuildWorldMapOverlay(): void {
    if (!this.worldMapOverlay) return;

    const { scene } = this.deps;
    const w = scene.scale.width;
    const h = scene.scale.height;
    this.worldMapOverlay.removeAll(true);

    const backdrop = scene.add
      .rectangle(0, 0, w, h, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    const panelW = Math.min(720, Math.floor(w * 0.88));
    const panelH = Math.min(500, Math.floor(h * 0.84));
    const panelX = Math.floor((w - panelW) / 2);
    const panelY = Math.floor((h - panelH) / 2);
    this.worldMapPanelGeom = { x: panelX, y: panelY, w: panelW, h: panelH };

    const panel = scene.add
      .rectangle(panelX, panelY, panelW, panelH, 0x0e1524, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x7ba7d9, 0.95)
      .setScrollFactor(0);
    const title = scene.add
      .text(panelX + Math.floor(panelW / 2), panelY + 12, "Mapa Mundial (M)", {
        fontFamily: GAME_FONT,
        fontSize: "18px",
        color: "#dbe9ff",
        fontStyle: "bold",
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.worldMapOverlay.add([backdrop, panel, title]);

    const topPadding = 44;
    const sidePadding = 20;
    
    const sidebarW = 200;
    const mapAreaX = panelX + sidePadding + sidebarW;
    const mapAreaY = panelY + topPadding;
    const mapAreaW = panelW - sidePadding * 2 - sidebarW;
    const mapAreaH = panelH - topPadding - 16;

    // Sidebar panel for descriptions
    const sidebar = scene.add
      .rectangle(panelX + sidePadding, mapAreaY, sidebarW - 10, mapAreaH, 0x16223d, 0.5)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3d5a80, 0.8)
      .setScrollFactor(0);
    
    const descTitle = scene.add
      .text(panelX + sidePadding + 10, mapAreaY + 10, "Información", {
        fontFamily: GAME_FONT,
        fontSize: "14px",
        color: "#7ba7d9",
        fontStyle: "bold",
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setScrollFactor(0);
    
    const descSeparator = scene.add
      .rectangle(panelX + sidePadding + 10, mapAreaY + 30, sidebarW - 30, 1, 0x3d5a80, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    const descName = scene.add
      .text(panelX + sidePadding + 10, mapAreaY + 40, "Selecciona un mapa", {
        fontFamily: GAME_FONT,
        fontSize: "12px",
        color: "#ffffff",
        fontStyle: "bold",
        wordWrap: { width: sidebarW - 30 },
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setScrollFactor(0);

    const descText = scene.add
      .text(panelX + sidePadding + 10, mapAreaY + 65, "", {
        fontFamily: GAME_FONT,
        fontSize: "11px",
        color: "#dbe9ff",
        wordWrap: { width: sidebarW - 30 },
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setScrollFactor(0);

    this.worldMapOverlay.add([sidebar, descTitle, descSeparator, descName, descText]);

    const bounds = getWorldMapGridBounds();
    // Use the same size for width and height so every cell is a square.
    const rawCellW = mapAreaW / bounds.width;
    const rawCellH = mapAreaH / bounds.height;
    // Boost cellSize a bit for better readability of names, but clamp to fit
    const cellSize = Math.min(28, rawCellW, rawCellH);

    // Center the square grid inside the available panel area.
    const gridW = cellSize * bounds.width;
    const gridH = cellSize * bounds.height;
    const gridOffsetX = Math.floor((mapAreaW - gridW) / 2);
    const gridOffsetY = Math.floor((mapAreaH - gridH) / 2);
    const gridStartX = mapAreaX + gridOffsetX;
    const gridStartY = mapAreaY + gridOffsetY;

    // Store for dynamic highlight updates when the map changes.
    this.worldMapGridParams = { gridStartX, gridStartY, cellSize, bounds };

    const ocean = scene.add
      .rectangle(gridStartX, gridStartY, gridW, gridH, getWorldMapBiomeColor("water"), 1)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.worldMapOverlay.add(ocean);

    if (scene.textures.exists("world_map_art")) {
      const art = scene.add
        .image(gridStartX + gridW / 2, gridStartY + gridH / 2, "world_map_art")
        .setScrollFactor(0);
      art.setDisplaySize(gridW, gridH);
      this.worldMapOverlay.add(art);
    }

    // Only render labels when cells are large enough to be readable.
    const showLabels = cellSize >= 20;

    for (const cell of WORLD_MAP_CELLS) {
      const col = cell.gridX - bounds.minX;
      const row = cell.gridY - bounds.minY;
      const x = gridStartX + col * cellSize;
      const y = gridStartY + row * cellSize;
      
      const isCity = cell.biome === "city";

      const land = scene.add
        .rectangle(x + 1, y + 1, cellSize - 2, cellSize - 2, getWorldMapBiomeColor(cell.biome), 1)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x9fc4ef, 0.55)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      
      land.on("pointerdown", () => {
        const name = cell.label ?? cell.mapId;
        const id = cell.mapId.replace("mapa", "");
        descName.setText(`${name} (${id})`);
        descText.setText(cell.description ?? "");
      });

      this.worldMapOverlay.add(land);

      if (showLabels) {
        const label = cell.label ?? cell.mapId;
        const fontSize = isCity ? "10px" : "9px";
        const fontColor = isCity ? "#ffffff" : "#e8f4ff";
        const fontStyle = isCity ? "bold" : "normal";

        const mapName = scene.add
          .text(x + cellSize / 2, y + cellSize / 2, label, {
            fontFamily: GAME_FONT,
            fontSize: fontSize,
            color: fontColor,
            fontStyle: fontStyle,
            align: "center",
            resolution: GAME_TEXT_RESOLUTION,
            stroke: "#000000",
            strokeThickness: 1.5,
          })
          .setOrigin(0.5, 0.5)
          .setScrollFactor(0);
        this.worldMapOverlay.add(mapName);
      }
    }

    const markerPos = this.getWorldMapMarkerScreenPosition();
    this.worldMapCurrentMarker = scene.add
      .circle(
        markerPos?.x ?? panelX + panelW / 2,
        markerPos?.y ?? panelY + panelH / 2,
        5,
        0xff2a2a,
        1
      )
      .setStrokeStyle(2, 0xffcccc, 0.9)
      .setScrollFactor(0);
    this.worldMapOverlay.add(this.worldMapCurrentMarker);
    this.worldMapOverlay.setVisible(this.worldMapOpen);
  }

  private getWorldMapMarkerScreenPosition(): { x: number; y: number } | null {
    const map = this.deps.getCurrentMap();
    const { x, y, w, h } = this.worldMapPanelGeom;
    if (w <= 0) return null;
    const tile = this.deps.getPlayerTile();
    return getWorldMapMarkerPosition({
      mapId: this.deps.getCurrentMapId(),
      tileX: tile.x,
      tileY: tile.y,
      mapWidth: map.width,
      mapHeight: map.height,
      panelX: x,
      panelY: y,
      panelW: w,
      panelH: h,
      topPadding: 44,
      sidePadding: 20,
      sidebarW: 200,
    });
  }
}
