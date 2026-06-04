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
import { getManualSignPlacementsForMap } from "../../maps/mapa1SignPlacements";
import {
  getLegacyObjGrhId,
  resolveImportedObjDef,
  shouldSpawnLegacyCsmObj,
  type GrhIndexEntry,
} from "../../maps/legacyMapObjects";
import { spawnMapSignAtTile } from "../../maps/mapSignRender";
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
};

/**
 * Renderizado del mapa, cámaras mundo/UI y overlay del mapa mundial (tecla M).
 */
export class GameSceneMapController {
  readonly mapTiles: Phaser.GameObjects.Container;
  readonly mapOverlay: Phaser.GameObjects.Graphics;

  private uiCamera?: Phaser.Cameras.Scene2D.Camera;
  private readonly mapTrees: Phaser.GameObjects.Image[] = [];
  private readonly mapBuildings: Phaser.GameObjects.Image[] = [];
  private readonly mapRoofs: Phaser.GameObjects.Image[] = [];
  private readonly dynamicObjs = new Map<string, Phaser.GameObjects.Image>();
  private lastRoofTileKey = "";
  private lastRoofHidden = false;
  private worldMapOverlay?: Phaser.GameObjects.Container;
  private worldMapCurrentMarker?: Phaser.GameObjects.Arc;
  private worldMapPanelGeom = { x: 0, y: 0, w: 0, h: 0 };
  private worldMapOpen = false;

  constructor(private readonly deps: GameSceneMapDeps) {
    const { scene } = deps;
    this.mapTiles = scene.add.container(0, 0).setDepth(0);
    this.mapOverlay = scene.add.graphics().setDepth(1);
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
      for (const sign of getManualSignPlacementsForMap(map.id)) {
        const img = spawnMapSignAtTile(scene, sign, grhIndex, (feetY) =>
          this.deps.depthFromFeetY(feetY)
        );
        if (img) {
          this.mapBuildings.push(img);
          this.dynamicObjs.set(`${sign.tileX},${sign.tileY}`, img);
        }
      }
    }

    this.refreshSceneryUiCameraIgnore();
  }

  /** Mantiene árboles/edificios en la cámara del mundo (no en la UI). */
  refreshSceneryUiCameraIgnore(): void {
    if (!this.uiCamera) {
      return;
    }
    const scenery = [
      ...this.mapTrees,
      ...this.mapBuildings,
      ...this.mapRoofs,
      ...Array.from(this.dynamicObjs.values()),
    ];
    if (scenery.length > 0) {
      this.uiCamera.ignore(scenery);
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
      } else {
        const tileFeetY = py + TILE_SIZE;
        img.setDepth(this.deps.depthFromFeetY(tileFeetY));
        img.setData("grhPixelHeight", grh.pixelHeight);
        img.setData("mapTileX", tileX);
        img.setData("mapTileY", tileY);
        this.mapBuildings.push(img);
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
    this.mapBuildings.push(img);
    return img;
  }

  updateDynamicObject(tileX: number, tileY: number, newObjIndex: number): void {
    const key = `${tileX},${tileY}`;
    const img = this.dynamicObjs.get(key);
    if (img) {
      img.destroy();
      this.dynamicObjs.delete(key);
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
    const mapAreaX = panelX + sidePadding;
    const mapAreaY = panelY + topPadding;
    const mapAreaW = panelW - sidePadding * 2;
    const mapAreaH = panelH - topPadding - 16;

    const bounds = getWorldMapGridBounds();
    const cellW = mapAreaW / bounds.width;
    const cellH = mapAreaH / bounds.height;

    const ocean = scene.add
      .rectangle(mapAreaX, mapAreaY, mapAreaW, mapAreaH, getWorldMapBiomeColor("water"), 1)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.worldMapOverlay.add(ocean);

    if (scene.textures.exists("world_map_art")) {
      const art = scene.add
        .image(mapAreaX + mapAreaW / 2, mapAreaY + mapAreaH / 2, "world_map_art")
        .setScrollFactor(0);
      art.setDisplaySize(mapAreaW, mapAreaH);
      this.worldMapOverlay.add(art);
    }

    for (const cell of WORLD_MAP_CELLS) {
      const col = cell.gridX - bounds.minX;
      const row = cell.gridY - bounds.minY;
      const x = mapAreaX + col * cellW;
      const y = mapAreaY + row * cellH;
      const land = scene.add
        .rectangle(x + 1, y + 1, cellW - 2, cellH - 2, getWorldMapBiomeColor(cell.biome), 1)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x9fc4ef, 0.55)
        .setScrollFactor(0);
      const label = cell.label ?? cell.mapId;
      const mapName = scene.add
        .text(x + cellW / 2, y + cellH - 10, label, {
          fontFamily: GAME_FONT,
          fontSize: "11px",
          color: "#e8f4ff",
          align: "center",
          resolution: GAME_TEXT_RESOLUTION,
        })
        .setOrigin(0.5, 1)
        .setScrollFactor(0);
      this.worldMapOverlay.add([land, mapName]);
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
    });
  }
}
