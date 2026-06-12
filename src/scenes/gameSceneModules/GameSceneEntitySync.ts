import {
  getPlayerHeadWalkSway,
  syncEquippedHeldItemVisuals,
  syncEquippedHelmetVisual,
  type EquippedGearSyncContext,
} from "../../game/equippedGear";
import { syncMobFaceSprite } from "../../game/mobs/mobFaceOverlay";
import type { DummyState } from "./types";
import type { Facing } from "../../../shared/types";
import type { GameSceneMapController } from "./GameSceneMapController";

export type GameSceneEntitySyncDeps = {
  getPlayer: () => Phaser.GameObjects.Sprite;
  getPlayerFace: () => Phaser.GameObjects.Sprite | undefined;
  getPlayerNameLabel: () => Phaser.GameObjects.Text | undefined;
  getPlayerTileY: () => number;
  getPlayerTileX: () => number;
  getFacing: () => Facing;
  getIsMoving: () => boolean;
  getActiveFaceLayout: () => { offset: Record<Facing, { x: number; y: number }> };
  getEquippedGearContext: () => EquippedGearSyncContext;
  getDummies: () => DummyState[];
  getCurrentMapId: () => string;
  depthFromFeetY: (feetY: number) => number;
  getMapController: () => GameSceneMapController;
  isWorldSceneLive: () => boolean;
  syncSpellMagicWordsOverlayPosition: () => void;
};

export class GameSceneEntitySync {
  constructor(private readonly deps: GameSceneEntitySyncDeps) {}

  syncEntityDepths(): void {
    const player = this.deps.getPlayer();
    if (!player) return;
    const playerDepth = this.deps.depthFromFeetY(player.y);
    player.setDepth(playerDepth);
    this.deps
      .getMapController()
      .syncBuildingDepths(
        this.deps.getPlayerTileX(),
        this.deps.getPlayerTileY(),
        playerDepth
      );
    const face = this.deps.getPlayerFace();
    if (face) {
      face.setDepth(player.depth + 0.02);
    }
    const nameLabel = this.deps.getPlayerNameLabel();
    if (nameLabel) {
      nameLabel.setDepth(player.depth + 2);
    }
  }

  syncMovingMobFaces(): void {
    const mapId = this.deps.getCurrentMapId();
    for (const dummy of this.deps.getDummies()) {
      if (!dummy.face || !dummy.alive || dummy.mapId !== mapId) continue;
      syncMobFaceSprite(dummy.sprite, dummy.face, dummy.modelId, dummy.facing);
      dummy.face.setDepth(dummy.sprite.depth + 0.02);
    }
  }

  syncPlayerFacePosition(): void {
    const player = this.deps.getPlayer();
    const face = this.deps.getPlayerFace();
    if (!player || !face) return;

    const offset = this.deps.getActiveFaceLayout().offset[this.deps.getFacing()];
    const { x: walkSwayX, y: walkSwayY } = getPlayerHeadWalkSway(
      player,
      this.deps.getFacing(),
      this.deps.getIsMoving()
    );

    face.setPosition(player.x + offset.x + walkSwayX, player.y - offset.y + walkSwayY);
    face.setDepth(player.depth + 0.02);
    this.syncEquippedHelmetVisual(walkSwayX, walkSwayY);
  }

  syncPlayerNameLabelPosition(): void {
    const player = this.deps.getPlayer();
    const label = this.deps.getPlayerNameLabel();
    if (!player || !label) return;
    label.setPosition(player.x, player.y + 2);
    label.setDepth(player.depth + 2);
    this.deps.syncSpellMagicWordsOverlayPosition();
  }

  syncEquippedHeldItemVisuals(): void {
    if (!this.deps.isWorldSceneLive()) {
      return;
    }
    syncEquippedHeldItemVisuals(this.deps.getEquippedGearContext());
  }

  private syncEquippedHelmetVisual(walkSwayX?: number, walkSwayY?: number): void {
    if (!this.deps.isWorldSceneLive()) {
      return;
    }
    syncEquippedHelmetVisual({
      ...this.deps.getEquippedGearContext(),
      walkSwayX,
      walkSwayY,
    });
  }

  /** Llamar cada frame antes del input. */
  syncFrame(): void {
    this.syncEntityDepths();
    this.syncMovingMobFaces();
    this.syncPlayerFacePosition();
    this.syncPlayerNameLabelPosition();
    this.syncEquippedHeldItemVisuals();
  }
}
