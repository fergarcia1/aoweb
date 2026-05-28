import { randomUUID } from "node:crypto";
import { isInAoi } from "../../shared/aoi";
import type { NetWorldItemState } from "../../shared/types";

export type WorldItemRecord = {
  id: string;
  mapId: string;
  tileX: number;
  tileY: number;
  itemId: string;
  count: number;
};

export class WorldItemRegistry {
  private readonly byId = new Map<string, WorldItemRecord>();

  findAtTile(mapId: string, tileX: number, tileY: number): WorldItemRecord | null {
    for (const item of this.byId.values()) {
      if (item.mapId === mapId && item.tileX === tileX && item.tileY === tileY) {
        return item;
      }
    }
    return null;
  }

  findById(id: string): WorldItemRecord | null {
    return this.byId.get(id) ?? null;
  }

  listForMap(mapId: string): WorldItemRecord[] {
    return [...this.byId.values()].filter((item) => item.mapId === mapId);
  }

  listInAoi(mapId: string, tileX: number, tileY: number): WorldItemRecord[] {
    return this.listForMap(mapId).filter((item) =>
      isInAoi(tileX, tileY, item.tileX, item.tileY)
    );
  }

  spawn(
    mapId: string,
    itemId: string,
    tileX: number,
    tileY: number,
    count: number
  ): WorldItemRecord | null {
    if (count <= 0) {
      return null;
    }

    const existing = this.findAtTile(mapId, tileX, tileY);
    if (existing && existing.itemId === itemId) {
      if (itemId === "gold") {
        const maxGoldStack = 10_000;
        const next = Math.min(maxGoldStack, existing.count + count);
        const added = next - existing.count;
        if (added <= 0) {
          return null;
        }
        existing.count = next;
        return existing;
      }
      existing.count += count;
      return existing;
    }

    if (existing) {
      return null;
    }

    const record: WorldItemRecord = {
      id: randomUUID(),
      mapId,
      tileX,
      tileY,
      itemId,
      count,
    };
    this.byId.set(record.id, record);
    return record;
  }

  remove(id: string): WorldItemRecord | null {
    const record = this.byId.get(id);
    if (!record) {
      return null;
    }
    this.byId.delete(id);
    return record;
  }

  updateCount(id: string, count: number): WorldItemRecord | null {
    const record = this.byId.get(id);
    if (!record || count <= 0) {
      return this.remove(id);
    }
    record.count = count;
    return record;
  }

  toNetState(record: WorldItemRecord): NetWorldItemState {
    return {
      id: record.id,
      tileX: record.tileX,
      tileY: record.tileY,
      itemId: record.itemId,
      count: record.count,
    };
  }
}
