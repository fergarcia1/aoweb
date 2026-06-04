import type Phaser from "phaser";
import { TILE_SIZE } from "../../config";
import {
  loadSharedWorldItemsByMap,
  saveSharedWorldItemsByMap,
  type SavedWorldItem,
} from "../../game/characterProgressStorage";
import { isKnownItemId } from "../../../game-data/items/registry";
import { getItemDefinition, type ItemId } from "../../items/itemDefinitions";
import type { GameMap } from "../../maps";
import { tileToFeetWorld } from "../../player/playerSprites";
import type { NetWorldItemState } from "../../../shared/types";
import { findNearestWalkableDropTile } from "../../../shared/deathLootPlacement";
import { isWorldItemDropTileAllowed } from "../../../shared/mapEdgeZones";
import type { WorldItemEntry } from "./types";

export type WorldItemManagerDeps = {
  scene: Phaser.Scene;
  uiCamera: Phaser.Cameras.Scene2D.Camera;
  getCurrentMap: () => GameMap;
  getCurrentMapId: () => string;
  depthFromFeetY: (feetY: number) => number;
  isMapTileWalkable: (tileX: number, tileY: number) => boolean;
  isServerAuthoritative: () => boolean;
  onPersist: () => void;
  onInspect: (entry: WorldItemEntry) => void;
};

/**
 * Ítems en el suelo del mapa.
 * Solo: persistencia global en localStorage. Multijugador: estado del servidor.
 */
export class WorldItemManager {
  private readonly entries: WorldItemEntry[] = [];
  private itemsByMap: Record<string, SavedWorldItem[]> = {};

  constructor(private readonly deps: WorldItemManagerDeps) {}

  loadSharedStorage(): void {
    if (this.deps.isServerAuthoritative()) {
      return;
    }
    this.itemsByMap = loadSharedWorldItemsByMap();
  }

  getItemsByMap(): Record<string, SavedWorldItem[]> {
    return this.itemsByMap;
  }

  setItemsByMap(itemsByMap: Record<string, SavedWorldItem[]>): void {
    this.itemsByMap = itemsByMap;
  }

  getEntries(): readonly WorldItemEntry[] {
    return this.entries;
  }

  getSprites(): Phaser.GameObjects.Sprite[] {
    return this.entries.map((entry) => entry.sprite);
  }

  findIndexAtTile(tileX: number, tileY: number): number {
    return this.entries.findIndex(
      (item) => item.tileX === tileX && item.tileY === tileY
    );
  }

  findIndexByWorldItemId(worldItemId: string): number {
    return this.entries.findIndex((item) => item.worldItemId === worldItemId);
  }

  removeAt(index: number): WorldItemEntry {
    const entry = this.entries[index];
    entry.sprite.destroy();
    this.entries.splice(index, 1);
    return entry;
  }

  updateCountAt(index: number, count: number): void {
    this.entries[index].count = count;
    this.persistIfLocal();
  }

  clearSprites(): void {
    for (const entry of this.entries) {
      entry.sprite.destroy();
    }
    this.entries.length = 0;
  }

  clearAll(): void {
    this.clearSprites();
    this.itemsByMap = {};
    if (!this.deps.isServerAuthoritative()) {
      saveSharedWorldItemsByMap(this.itemsByMap);
    }
  }

  cacheCurrentMap(): void {
    if (this.deps.isServerAuthoritative()) {
      return;
    }
    const mapId = this.deps.getCurrentMapId();
    this.itemsByMap[mapId] = this.entries.map((entry) => ({
      itemId: entry.id,
      tileX: entry.tileX,
      tileY: entry.tileY,
      count: entry.count,
    }));
    saveSharedWorldItemsByMap(this.itemsByMap);
  }

  restoreForCurrentMap(): void {
    if (this.deps.isServerAuthoritative()) {
      return;
    }
    this.clearSprites();
    const savedItems = this.itemsByMap[this.deps.getCurrentMapId()] ?? [];
    for (const entry of savedItems) {
      if (entry.itemId === "gold") {
        this.createGold(entry.tileX, entry.tileY, entry.count, { exactTile: true });
      } else {
        this.createItem(entry.itemId, entry.tileX, entry.tileY, entry.count, {
          exactTile: true,
        });
      }
    }
  }

  /** Reemplaza ítems visibles con el snapshot AOI del servidor. */
  syncFromNetStates(items: NetWorldItemState[] | null | undefined): void {
    this.clearSprites();
    if (!Array.isArray(items)) {
      return;
    }
    for (const state of items) {
      this.upsertNetState(state);
    }
  }

  applyNetSpawned(_mapId: string, state: NetWorldItemState): void {
    this.upsertNetState(state);
  }

  applyNetUpdated(_mapId: string, state: NetWorldItemState): void {
    const index = this.findIndexByWorldItemId(state.id);
    if (index === -1) {
      this.upsertNetState(state);
      return;
    }
    const entry = this.entries[index];
    if (entry.tileX !== state.tileX || entry.tileY !== state.tileY) {
      entry.sprite.destroy();
      this.entries.splice(index, 1);
      this.upsertNetState(state);
      return;
    }
    entry.count = state.count;
  }

  applyNetRemoved(_mapId: string, worldItemId: string): void {
    const index = this.findIndexByWorldItemId(worldItemId);
    if (index !== -1) {
      this.removeAt(index);
    }
  }

  createItem(
    itemId: ItemId,
    tileX: number,
    tileY: number,
    count = 1,
    options?: { exactTile?: boolean }
  ): void {
    if (count <= 0) return;

    const existing = this.entries.find(
      (entry) =>
        !entry.worldItemId &&
        entry.id === itemId &&
        entry.tileX === tileX &&
        entry.tileY === tileY
    );
    if (existing) {
      existing.count += count;
      this.persistIfLocal();
      return;
    }

    const dropTile = options?.exactTile
      ? this.deps.isMapTileWalkable(tileX, tileY) &&
        !this.isTileOccupied(tileX, tileY)
        ? { x: tileX, y: tileY }
        : null
      : this.findNearestAvailableDropTile(tileX, tileY);
    if (!dropTile) return;

    this.addItemSprite(itemId, dropTile.x, dropTile.y, count);
    this.persistIfLocal();
  }

  createGold(
    tileX: number,
    tileY: number,
    count: number,
    options?: { exactTile?: boolean }
  ): void {
    if (count <= 0) return;

    const existing = this.entries.find(
      (entry) =>
        !entry.worldItemId &&
        entry.id === "gold" &&
        entry.tileX === tileX &&
        entry.tileY === tileY &&
        entry.count + count <= 10_000
    );
    if (existing) {
      existing.count += count;
      this.persistIfLocal();
      return;
    }

    const dropTile = options?.exactTile
      ? this.deps.isMapTileWalkable(tileX, tileY) &&
        !this.isTileOccupied(tileX, tileY)
        ? { x: tileX, y: tileY }
        : null
      : this.findNearestAvailableDropTile(tileX, tileY);
    if (!dropTile) return;

    this.addGoldSprite(dropTile.x, dropTile.y, count);
    this.persistIfLocal();
  }

  private upsertNetState(state: NetWorldItemState): void {
    console.log(`[CLIENT-SYNC] upsertNetState intentando crear id=${state.id}, itemId=${state.itemId} en ${state.tileX},${state.tileY}`);
    const index = this.findIndexByWorldItemId(state.id);
    if (index !== -1) {
      this.entries[index].sprite.destroy();
      this.entries.splice(index, 1);
    }

    const occupied = this.entries.some(
      (entry) =>
        entry.tileX === state.tileX &&
        entry.tileY === state.tileY &&
        entry.worldItemId !== state.id
    );
    if (occupied) {
      console.warn(`[CLIENT-SYNC] upsertNetState IGNORADO por colision en ${state.tileX},${state.tileY}`);
      return;
    }

    if (state.itemId === "gold") {
      this.addGoldSprite(state.tileX, state.tileY, state.count, state.id);
      console.log(`[CLIENT-SYNC] oro creado`);
    } else if (state.itemId !== "gold" && isKnownItemId(state.itemId)) {
      this.addItemSprite(state.itemId as ItemId, state.tileX, state.tileY, state.count, state.id);
      console.log(`[CLIENT-SYNC] sprite item creado para ${state.itemId}`);
    } else {
      console.warn(`[CLIENT-SYNC] upsertNetState IGNORADO: no es gold ni conocido (${state.itemId})`);
    }
  }

  private addItemSprite(
    itemId: ItemId,
    tileX: number,
    tileY: number,
    count: number,
    worldItemId?: string
  ): void {
    const item = getItemDefinition(itemId);
    const sprite = this.createBaseSprite(tileX, tileY, item.textureKey);
    const worldItem: WorldItemEntry = {
      worldItemId,
      id: itemId,
      tileX,
      tileY,
      count,
      sprite,
    };
    sprite.on("pointerdown", () => this.deps.onInspect(worldItem));
    this.entries.push(worldItem);
  }

  private addGoldSprite(
    tileX: number,
    tileY: number,
    count: number,
    worldItemId?: string
  ): void {
    const sprite = this.createBaseSprite(tileX, tileY, "world_gold");
    const worldItem: WorldItemEntry = {
      worldItemId,
      id: "gold",
      tileX,
      tileY,
      count,
      sprite,
    };
    sprite.on("pointerdown", () => this.deps.onInspect(worldItem));
    this.deps.uiCamera?.ignore(sprite);
    this.entries.push(worldItem);
  }

  private createBaseSprite(tileX: number, tileY: number, textureKey: string) {
    const pos = tileToFeetWorld(tileX, tileY, TILE_SIZE);
    const { scene, uiCamera } = this.deps;
    const sprite = scene.add.sprite(pos.x, pos.y - 8, textureKey);
    sprite.setOrigin(0.5, 1);
    sprite.setY(pos.y + 2);
    sprite.setDepth(this.deps.depthFromFeetY(pos.y + 2) - 0.2);
    sprite.setScale(0.8);
    sprite.setInteractive({ useHandCursor: true, pixelPerfect: true });
    uiCamera.ignore(sprite);
    return sprite;
  }

  private persistIfLocal(): void {
    if (!this.deps.isServerAuthoritative()) {
      this.deps.onPersist();
    }
  }

  private isTileOccupied(tileX: number, tileY: number): boolean {
    return this.entries.some((item) => item.tileX === tileX && item.tileY === tileY);
  }

  private findNearestAvailableDropTile(
    targetTileX: number,
    targetTileY: number
  ): { x: number; y: number } | null {
    const mapId = this.deps.getCurrentMapId();
    const tile = findNearestWalkableDropTile(
      targetTileX,
      targetTileY,
      (tileX, tileY) =>
        isWorldItemDropTileAllowed(mapId, tileX, tileY, (x, y) =>
          this.deps.isMapTileWalkable(x, y)
        ) && !this.isTileOccupied(tileX, tileY)
    );
    return tile ? { x: tile.tileX, y: tile.tileY } : null;
  }
}
