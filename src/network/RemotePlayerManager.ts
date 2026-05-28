import Phaser from "phaser";
import { STEP_DURATION_MS, TILE_SIZE } from "../config";
import type { CharacterFactionId, CharacterGenderId, CharacterRaceId } from "../data/characters";
import { getPlayerNameColors } from "../data/characters";
import {
  GAME_FONT,
  GAME_TEXT_RESOLUTION,
  WORLD_NAME_FONT_SIZE,
  WORLD_NAME_STROKE,
} from "../ui/fonts";
import {
  applyPlayerOrigin,
  Facing,
  Outfit,
  getDefaultArmorVisualForOutfit,
  playerAnimationKey,
  raceBodyTextureKey,
  textureKeyForPlayer,
  tileToFeetWorld,
  type PlayerArmorVisualOptions,
} from "../player/playerSprites";
import { faceTextureKey, getFaceFrame } from "../player/raceFaces";
import { getRaceFaceLayout } from "../player/raceFaceLayout";
import {
  getItemDefinition,
  type EquipmentSlot,
  type ItemId,
} from "../items/itemDefinitions";
import { inferBajosSpritesheetPath, isShortRace } from "../game/armorUtils";
import {
  createEquippedOverlaySprite,
  syncEquippedHeldItemVisuals,
  type EquippedGearSyncContext,
} from "../game/equippedGear";
import type { NetPlayerEquipment, NetPlayerState } from "../../shared/types";

const REMOTE_OUTFITS = new Set<string>([
  "base",
  "citizen",
  "cuero",
  "placas",
  "placasRojas",
  "placasAzules",
  "tunicaNigro",
  "tunicaAzul",
  "tunicaCruz",
  "dragonNegro",
  "dragonNegroBajos",
  "dragonBlanco",
  "dragonBlancoBajos",
  "dragonRojo",
  "dragonRojoBajos",
]);

function remoteOutfitFromState(state: { equipment?: { equippedOutfit?: string } }): Outfit {
  const raw = state.equipment?.equippedOutfit ?? "base";
  return REMOTE_OUTFITS.has(raw) ? (raw as Outfit) : "base";
}

function netEquipmentToLocal(net: NetPlayerEquipment): Record<EquipmentSlot, ItemId | null> {
  const id = (value: string | null) => (value ? (value as ItemId) : null);
  return {
    weapon: id(net.weaponId),
    shield: id(net.shieldId),
    helmet: id(net.helmetId),
    armor: id(net.armorId),
  };
}

function remoteArmorVisual(
  equipment: Record<EquipmentSlot, ItemId | null>,
  outfit: Outfit,
  raceId: CharacterRaceId
): PlayerArmorVisualOptions | undefined {
  const armorId = equipment.armor;
  if (armorId) {
    const item = getItemDefinition(armorId);
    if (
      item.equipSlot === "armor" &&
      item.outfitOverride &&
      item.outfitOverride !== "base"
    ) {
      const armorOutfit = item.outfitOverride;
      const stdPath =
        item.spritesheetStdPath ??
        getDefaultArmorVisualForOutfit(armorOutfit).spritesheetStdPath;
      return {
        clasesBajas: item.clasesBajas ?? isShortRace(raceId),
        spritesheetStdPath: stdPath,
        spritesheetBajosPath:
          item.spritesheetBajosPath ??
          (stdPath ? inferBajosSpritesheetPath(stdPath) : undefined),
      };
    }
  }
  if (outfit === "base") {
    return undefined;
  }
  return getDefaultArmorVisualForOutfit(outfit);
}

type RemoteEntry = {
  body: Phaser.GameObjects.Sprite;
  face: Phaser.GameObjects.Sprite;
  weaponSprite: Phaser.GameObjects.Sprite;
  shieldSprite: Phaser.GameObjects.Sprite;
  helmetSprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  playerName: string;
  raceId: CharacterRaceId;
  genderId: CharacterGenderId;
  faceIndex: number;
  equippedOutfit: Outfit;
  armorVisual?: PlayerArmorVisualOptions;
  equipment: Record<EquipmentSlot, ItemId | null>;
  tileX: number;
  tileY: number;
  facing: Facing;
  isMoving: boolean;
  isGhost: boolean;
};

export class RemotePlayerManager {
  private readonly entries = new Map<string, RemoteEntry>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depthFromFeetY: (feetY: number) => number,
    private readonly uiCamera?: Phaser.Cameras.Scene2D.Camera
  ) {}

  syncFromSnapshot(players: NetPlayerState[], localPlayerId: string | null, mapId: string) {
    const visible = players.filter((p) => p.id !== localPlayerId && p.mapId === mapId);
    const visibleIds = new Set(visible.map((p) => p.id));

    for (const id of [...this.entries.keys()]) {
      if (!visibleIds.has(id)) {
        this.remove(id);
      }
    }

    for (const player of visible) {
      this.upsert(player);
    }
  }

  clear() {
    for (const id of [...this.entries.keys()]) {
      this.remove(id);
    }
  }

  removeRemote(playerId: string) {
    this.remove(playerId);
  }

  updateRemote(state: NetPlayerState, localPlayerId: string | null, mapId: string) {
    if (state.id === localPlayerId || state.mapId !== mapId) {
      return;
    }
    this.upsert(state);
  }

  isTileOccupiedByRemote(tileX: number, tileY: number, mapId: string): boolean {
    for (const entry of this.entries.values()) {
      if (entry.tileX === tileX && entry.tileY === tileY) {
        return true;
      }
    }
    return false;
  }

  getPlayerSprite(id: string): Phaser.GameObjects.Sprite | undefined {
    return this.entries.get(id)?.body;
  }

  setPlayerGhost(id: string) {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.isGhost = true;
    entry.body.setAlpha(0.35);
    entry.face.setAlpha(0.35);
    entry.weaponSprite.setAlpha(0.35);
    entry.shieldSprite.setAlpha(0.35);
    entry.helmetSprite.setAlpha(0.35);
    entry.label.setAlpha(0.5);
    this.syncRemoteGear(entry);
  }

  forEachVisibleBody(callback: (body: Phaser.GameObjects.Sprite) => void) {
    for (const entry of this.entries.values()) {
      callback(entry.body);
    }
  }

  private upsert(state: NetPlayerState) {
    let entry = this.entries.get(state.id);
    if (entry && this.needsAppearanceRebuild(entry, state)) {
      this.remove(state.id);
      entry = undefined;
    }
    if (!entry) {
      entry = this.createRemote(state);
      this.entries.set(state.id, entry);
    }

    this.applyState(entry, state);
  }

  private needsAppearanceRebuild(entry: RemoteEntry, state: NetPlayerState): boolean {
    const nextOutfit = remoteOutfitFromState(state);
    return (
      entry.playerName !== state.name ||
      entry.raceId !== state.raceId ||
      entry.genderId !== state.genderId ||
      entry.faceIndex !== state.faceIndex ||
      entry.equippedOutfit !== nextOutfit
    );
  }

  private createRemote(state: NetPlayerState): RemoteEntry {
    const raceId = state.raceId as CharacterRaceId;
    const genderId = state.genderId as CharacterGenderId;
    const equippedOutfit = remoteOutfitFromState(state);
    const equipment = netEquipmentToLocal(state.equipment);
    const armorVisual = remoteArmorVisual(equipment, equippedOutfit, raceId);
    const feet = tileToFeetWorld(state.tileX, state.tileY, TILE_SIZE);
    const bodyKey = textureKeyForPlayer(
      equippedOutfit,
      raceBodyTextureKey(raceId, genderId),
      armorVisual,
      raceId
    );
    const body = this.scene.add.sprite(feet.x, feet.y, bodyKey, 0);
    applyPlayerOrigin(body);

    const faceLayout = getRaceFaceLayout(raceId, genderId);
    const face = this.scene.add.sprite(
      feet.x,
      feet.y,
      faceTextureKey(raceId, genderId),
      getFaceFrame(raceId, genderId, state.faceIndex, state.facing)
    );
    face.setOrigin(0.5, 1);
    face.setScale(faceLayout.scale);

    const weaponSprite = createEquippedOverlaySprite(this.scene, feet.x, feet.y);
    const shieldSprite = createEquippedOverlaySprite(this.scene, feet.x, feet.y);
    const helmetSprite = createEquippedOverlaySprite(this.scene, feet.x, feet.y);

    const colors = getPlayerNameColors(state.factionId as CharacterFactionId, state.role);
    const label = this.scene.add
      .text(feet.x, feet.y + 2, state.name, {
        fontFamily: GAME_FONT,
        fontSize: `${WORLD_NAME_FONT_SIZE}px`,
        color: colors.fill,
        fontStyle: "bold",
        stroke: colors.stroke,
        strokeThickness: WORLD_NAME_STROKE,
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);

    if (this.uiCamera) {
      this.uiCamera.ignore([body, face, weaponSprite, shieldSprite, helmetSprite, label]);
    }

    const entry: RemoteEntry = {
      body,
      face,
      weaponSprite,
      shieldSprite,
      helmetSprite,
      label,
      playerName: state.name,
      raceId,
      genderId,
      faceIndex: state.faceIndex,
      equippedOutfit,
      armorVisual,
      equipment,
      tileX: state.tileX,
      tileY: state.tileY,
      facing: state.facing,
      isMoving: false,
      isGhost: false,
    };

    this.applyBodyFacing(entry);
    this.playRemoteBodyAnim(entry, "idle");
    this.syncRemoteVisuals(entry);

    return entry;
  }

  private applyState(entry: RemoteEntry, state: NetPlayerState) {
    entry.playerName = state.name;
    entry.faceIndex = state.faceIndex;
    if (entry.label.text !== state.name) {
      entry.label.setText(state.name);
      const colors = getPlayerNameColors(
        state.factionId as CharacterFactionId,
        state.role
      );
      entry.label.setColor(colors.fill);
      entry.label.setStroke(colors.stroke, WORLD_NAME_STROKE);
    }

    const facingChanged = entry.facing !== state.facing;
    if (facingChanged) {
      entry.facing = state.facing;
      this.applyBodyFacing(entry);
    }

    entry.face.setFrame(
      getFaceFrame(entry.raceId, entry.genderId, entry.faceIndex, entry.facing)
    );

    const nextOutfit = remoteOutfitFromState(state);
    entry.equipment = netEquipmentToLocal(state.equipment);
    entry.armorVisual = remoteArmorVisual(
      entry.equipment,
      nextOutfit,
      entry.raceId
    );

    const nextBodyKey = textureKeyForPlayer(
      nextOutfit,
      raceBodyTextureKey(entry.raceId, entry.genderId),
      entry.armorVisual,
      entry.raceId
    );
    if (nextOutfit !== entry.equippedOutfit || entry.body.texture.key !== nextBodyKey) {
      entry.equippedOutfit = nextOutfit;
      entry.body.setTexture(nextBodyKey);
      entry.body.anims.stop();
    }

    const moved = entry.tileX !== state.tileX || entry.tileY !== state.tileY;

    if (!moved && !facingChanged) {
      this.playRemoteBodyAnim(entry, "idle");
      this.syncRemoteVisuals(entry);
      return;
    }

    entry.tileX = state.tileX;
    entry.tileY = state.tileY;
    if (!facingChanged) {
      entry.facing = state.facing;
      this.applyBodyFacing(entry);
    }

    const target = tileToFeetWorld(state.tileX, state.tileY, TILE_SIZE);
    const depth = this.depthFromFeetY(target.y);
    entry.body.setDepth(depth);

    this.scene.tweens.killTweensOf(entry.body);

    if (moved) {
      entry.isMoving = true;
      this.playRemoteBodyAnim(entry, "walk");
      this.scene.tweens.add({
        targets: entry.body,
        x: target.x,
        y: target.y,
        duration: STEP_DURATION_MS,
        ease: "Linear",
        onUpdate: () => {
          this.syncRemoteVisuals(entry);
        },
        onComplete: () => {
          entry.body.setPosition(target.x, target.y);
          entry.isMoving = false;
          this.playRemoteBodyAnim(entry, "idle");
          this.syncRemoteVisuals(entry);
        },
      });
      return;
    }

    entry.body.setPosition(target.x, target.y);
    this.playRemoteBodyAnim(entry, "idle");
    this.syncRemoteVisuals(entry);
  }

  private applyBodyFacing(entry: RemoteEntry) {
    const isProfile = entry.facing === "left" || entry.facing === "right";
    entry.body.setFlipX(entry.facing === "right");
    if (isProfile) {
      entry.face.setFlipX(entry.facing === "right");
    } else {
      entry.face.setFlipX(false);
    }
  }

  private syncRemoteVisuals(entry: RemoteEntry) {
    const layout = getRaceFaceLayout(entry.raceId, entry.genderId);
    const offset = layout.offset[entry.facing];
    entry.face.setPosition(entry.body.x + offset.x, entry.body.y - offset.y);
    entry.face.setDepth(entry.body.depth + 0.02);
    entry.label.setPosition(entry.body.x, entry.body.y + 2);
    entry.label.setDepth(entry.body.depth + 2);
    this.syncRemoteGear(entry);
  }

  private buildGearSyncContext(entry: RemoteEntry): EquippedGearSyncContext {
    return {
      player: entry.body,
      facing: entry.facing,
      isMoving: entry.isMoving,
      useGhostAppearance: entry.isGhost,
      equipment: entry.equipment,
      weaponSprite: entry.weaponSprite,
      shieldSprite: entry.shieldSprite,
      helmetSprite: entry.helmetSprite,
    };
  }

  private syncRemoteGear(entry: RemoteEntry) {
    syncEquippedHeldItemVisuals(this.buildGearSyncContext(entry));
  }

  private playRemoteBodyAnim(entry: RemoteEntry, state: "walk" | "idle") {
    const isProfile = entry.facing === "left" || entry.facing === "right";
    const bodyFacing: Facing = isProfile ? "left" : entry.facing;
    const bodyKey = raceBodyTextureKey(entry.raceId, entry.genderId);
    const key = playerAnimationKey(
      state,
      bodyFacing,
      entry.equippedOutfit,
      bodyKey,
      entry.armorVisual,
      entry.raceId
    );

    if (state === "walk" && isProfile) {
      entry.body.play({ key, repeat: -1 }, true);
      return;
    }

    if (entry.body.anims.currentAnim?.key !== key) {
      entry.body.play(key);
    }
  }

  private remove(id: string) {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.scene.tweens.killTweensOf(entry.body);
    entry.body.destroy();
    entry.face.destroy();
    entry.weaponSprite.destroy();
    entry.shieldSprite.destroy();
    entry.helmetSprite.destroy();
    entry.label.destroy();
    this.entries.delete(id);
  }
}
