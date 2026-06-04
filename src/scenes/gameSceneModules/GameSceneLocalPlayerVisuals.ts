import {
  applyInvisibilityAlphaToParts,
  syncInvisibilityVisual,
  type PlayerVisualParts,
} from "../../game/invisibilityVisual";
import { GHOST_PLAYER_ALPHA } from "../../game/deathConfig";
import type { DeathPhase } from "../../systems/DeathSystem";

export type GameSceneLocalPlayerVisualsDeps = {
  getPlayer: () => Phaser.GameObjects.Sprite | undefined;
  getDeathPhase: () => DeathPhase;
  getUseGhostAppearance: () => boolean;
  getInvisibleUntilMs: () => number;
  setInvisibleUntilMs: (ms: number) => void;
  getVisualParts: () => PlayerVisualParts;
};

export class GameSceneLocalPlayerVisuals {
  constructor(private readonly deps: GameSceneLocalPlayerVisualsDeps) {}

  resetAlpha(): void {
    if (!this.deps.getPlayer()) {
      return;
    }
    const alpha = this.deps.getUseGhostAppearance() ? GHOST_PLAYER_ALPHA : 1;
    applyInvisibilityAlphaToParts(this.deps.getVisualParts(), alpha);
  }

  updateInvisibility(now = Date.now()): void {
    const player = this.deps.getPlayer();
    if (!player || this.deps.getDeathPhase() !== "alive" || this.deps.getUseGhostAppearance()) {
      if (player) {
        this.resetAlpha();
      }
      return;
    }
    const until = this.deps.getInvisibleUntilMs();
    if (until <= now) {
      this.deps.setInvisibleUntilMs(0);
      this.resetAlpha();
      return;
    }
    syncInvisibilityVisual(this.deps.getVisualParts(), now, until);
  }
}
