import type Phaser from "phaser";
import { getAccountScopedStorageKey } from "./accountScopedStorage";

export const AOWEB_MASTER_VOLUME_STORAGE_KEY = "aoweb_master_volume";
export const DEFAULT_MASTER_VOLUME = 0.5;

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_MASTER_VOLUME;
  }
  return Math.min(1, Math.max(0, value));
}

export function loadMasterVolume(): number {
  try {
    const stored =
      localStorage.getItem(getAccountScopedStorageKey(AOWEB_MASTER_VOLUME_STORAGE_KEY)) ??
      localStorage.getItem(AOWEB_MASTER_VOLUME_STORAGE_KEY);
    if (stored !== null) {
      return clampVolume(parseFloat(stored));
    }
  } catch {
    // ignore
  }
  return DEFAULT_MASTER_VOLUME;
}

export function saveMasterVolume(volume: number): number {
  const clamped = clampVolume(volume);
  try {
    localStorage.setItem(
      getAccountScopedStorageKey(AOWEB_MASTER_VOLUME_STORAGE_KEY),
      String(clamped)
    );
  } catch {
    // ignore
  }
  return clamped;
}

export function applyMasterVolume(scene: Phaser.Scene, volume = loadMasterVolume()): number {
  const clamped = clampVolume(volume);
  scene.sound.volume = clamped;
  return clamped;
}
