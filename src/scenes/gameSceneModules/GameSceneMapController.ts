import Phaser from "phaser";
import { TILE_SIZE } from "../../config";
import {
  EDGE_TRANSITION_TRIGGER_DISTANCE,
  getMap,
  getWorldMapBiomeColor,
  getWorldMapGridBounds,
  getWorldMapMarkerPosition,
  WORLD_MAP_CELLS,
  type GameMap,
} from "../../maps";
import { getTileDefinition, TILE } from "../../maps/tileDefinitions";
import { spawnMapObjectImage } from "../../maps/mapObjects";
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

    const scenery = [...this.mapTrees, ...this.mapBuildings];
    if (this.uiCamera && scenery.length > 0) {
      this.uiCamera.ignore(scenery);
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
      this.deps.getPlayer(),
      this.deps.getPlayerFace(),
      this.deps.getPlayerNameLabel(),
      ...equipped,
      ...this.deps.getWorldItemSprites(),
      ...this.deps.getDummyRenderObjects(),
    ]);

    this.applyCameraLayout();
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

  getMinimapBounds() {
    const map = this.deps.getCurrentMap();
    let minTileX = 0;
    let minTileY = 0;
    let maxTileX = map.width - 1;
    let maxTileY = map.height - 1;
    const edgeTransitions = map.edgeTransitions;

    if (edgeTransitions?.left) {
      minTileX = Math.min(maxTileX, EDGE_TRANSITION_TRIGGER_DISTANCE + 1);
    }
    if (edgeTransitions?.right) {
      maxTileX = Math.max(minTileX, map.width - 2 - EDGE_TRANSITION_TRIGGER_DISTANCE);
    }
    if (edgeTransitions?.up) {
      minTileY = Math.min(maxTileY, EDGE_TRANSITION_TRIGGER_DISTANCE + 1);
    }
    if (edgeTransitions?.down) {
      maxTileY = Math.max(minTileY, map.height - 2 - EDGE_TRANSITION_TRIGGER_DISTANCE);
    }

    return { minTileX, minTileY, maxTileX, maxTileY };
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
