import Phaser from "phaser";
import { getInvisibilityAlpha } from "../../game-data/invisibility";

export type PlayerVisualParts = {
  body: Phaser.GameObjects.Sprite;
  face?: Phaser.GameObjects.Sprite | null;
  weapon?: Phaser.GameObjects.Sprite | null;
  shield?: Phaser.GameObjects.Sprite | null;
  helmet?: Phaser.GameObjects.Sprite | null;
  nameLabel?: Phaser.GameObjects.Text | null;
};

export function applyInvisibilityAlphaToParts(
  parts: PlayerVisualParts,
  alpha: number
): void {
  const a = Math.min(1, Math.max(0, alpha));
  parts.body.setAlpha(a);
  if (parts.face?.active) {
    parts.face.setAlpha(a);
  }
  if (parts.weapon?.active && parts.weapon.visible) {
    parts.weapon.setAlpha(a);
  }
  if (parts.shield?.active && parts.shield.visible) {
    parts.shield.setAlpha(a);
  }
  if (parts.helmet?.active && parts.helmet.visible) {
    parts.helmet.setAlpha(a);
  }
  if (parts.nameLabel?.active) {
    parts.nameLabel.setAlpha(a);
  }
}

export function syncInvisibilityVisual(
  parts: PlayerVisualParts,
  nowMs: number,
  invisibleUntilMs: number,
  options?: { skipWhenGhost?: boolean }
): boolean {
  if (options?.skipWhenGhost) {
    applyInvisibilityAlphaToParts(parts, 1);
    return false;
  }
  const alpha = getInvisibilityAlpha(nowMs, invisibleUntilMs);
  applyInvisibilityAlphaToParts(parts, alpha);
  return alpha < 1;
}
