import type Phaser from "phaser";
import { patchSavedCharacterMeta } from "../data/characters";
import {
  deleteCharacterProgress,
  hasCharacterProgress,
  loadCharacterProgress,
  saveCharacterProgress,
  type SavedCharacterProgress,
} from "./characterProgressStorage";

const DEFAULT_SAVE_DEBOUNCE_MS = 1200;

/**
 * Persistencia local del personaje (localStorage) con debounce desde la escena.
 */
export class ProgressService {
  private characterId: string | null = null;
  private debounceTimer?: Phaser.Time.TimerEvent;

  constructor(private readonly scene: Phaser.Scene) {}

  setCharacterId(characterId: string | null) {
    this.characterId = characterId;
  }

  getCharacterId() {
    return this.characterId;
  }

  hasProgress(characterId?: string): boolean {
    const id = characterId ?? this.characterId;
    return id ? hasCharacterProgress(id) : false;
  }

  load(characterId?: string): SavedCharacterProgress | null {
    const id = characterId ?? this.characterId;
    if (!id) return null;
    return loadCharacterProgress(id);
  }

  save(
    snapshot: SavedCharacterProgress,
    meta?: { homeMapId?: string }
  ): void {
    if (!this.characterId) return;
    saveCharacterProgress(this.characterId, snapshot);
    patchSavedCharacterMeta(this.characterId, {
      level: snapshot.playerProgress.level,
      ...(meta?.homeMapId !== undefined ? { homeMapId: meta.homeMapId } : {}),
    });
  }

  delete(characterId?: string): void {
    const id = characterId ?? this.characterId;
    if (!id) return;
    deleteCharacterProgress(id);
  }

  persistNow(
    getSnapshot: () => SavedCharacterProgress,
    meta?: { homeMapId?: string }
  ): void {
    this.save(getSnapshot(), meta);
  }

  schedulePersist(
    getSnapshot: () => SavedCharacterProgress,
    meta?: { homeMapId?: string },
    delayMs = DEFAULT_SAVE_DEBOUNCE_MS
  ): void {
    if (!this.characterId) return;
    if (this.debounceTimer) {
      this.debounceTimer.remove(false);
    }
    this.debounceTimer = this.scene.time.delayedCall(delayMs, () => {
      this.debounceTimer = undefined;
      if (!this.scene.sys) return;
      this.persistNow(getSnapshot, meta);
    });
  }

  cancelScheduledPersist(): void {
    if (this.debounceTimer) {
      this.debounceTimer.remove(false);
      this.debounceTimer = undefined;
    }
  }
}
