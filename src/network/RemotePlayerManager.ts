import Phaser from "phaser";
import { STEP_DURATION_MS, TILE_SIZE } from "../config";
import { ensureItemAssetsLoaded } from "../scenes/gameSceneModules/gameSceneAssetQueue";
import { GHOST_PLAYER_ALPHA } from "../game/deathConfig";
import {
  GHOST_RACE_ID,
  getPlayerNameColors,
  normalizeFactionId,
  type CharacterFactionId,
  type CharacterGenderId,
  type CharacterRaceId,
} from "../data/characters";
import {
  GAME_FONT,
  GAME_TEXT_RESOLUTION,
  WORLD_NAME_FONT_SIZE,
  WORLD_NAME_STROKE,
} from "../ui/fonts";
import {
  applyPlayerOrigin,
  BOAT_BODY_TEXTURE_KEY,
  Facing,
  Outfit,
  getDefaultArmorVisualForOutfit,
  buildEquippedArmorVisualFromItem,
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
} from "../../game-data/items/definitions";
import {
  createEquippedOverlaySprite,
  getPlayerHeadWalkSway,
  syncEquippedHeldItemVisuals,
  type EquippedGearSyncContext,
} from "../game/equippedGear";
import type { NetPlayerEquipment, NetPlayerState, PlayerRole } from "../../shared/types";
import { syncInvisibilityVisual } from "../game/invisibilityVisual";
import { normalizeOutfit, outfitForArmorItemId } from "../../game-data/outfits";
import {
  applyMeditationSpriteVisuals,
  getMeditationVisualConfig,
  MEDITATION_FX_OFFSET_Y,
  type MeditationVisualConfig,
} from "../systems/meditationVisuals";
import { buildHitboxFrameRect, containsWorldPointInHitArea, type BodyHitboxConfig } from "../game/hitboxUtils";
import {
  PLAYER_HITBOX_WIDTH_PX,
  PLAYER_HITBOX_PROFILE_WIDTH_PX,
  PLAYER_HITBOX_HEIGHT_PX,
  PLAYER_HITBOX_OFFSET_X,
  PLAYER_HITBOX_OFFSET_Y,
} from "../scenes/gameSceneModules/constants";

function remoteOutfitFromState(state: { equipment?: NetPlayerEquipment }): Outfit {
  const fromServer = normalizeOutfit(state.equipment?.equippedOutfit);
  if (fromServer !== "base") {
    return fromServer as Outfit;
  }
  const fromArmor = outfitForArmorItemId(state.equipment?.armorId ?? null);
  return (fromArmor === "base" ? "base" : fromArmor) as Outfit;
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
    const visual = buildEquippedArmorVisualFromItem(item);
    if (visual) {
      return visual;
    }
  }
  if (outfit === "base") {
    return undefined;
  }
  return getDefaultArmorVisualForOutfit(outfit);
}

export type RemoteEntry = {
  id: string;
  body: Phaser.GameObjects.Sprite;
  face: Phaser.GameObjects.Sprite;
  weaponSprite: Phaser.GameObjects.Sprite;
  shieldSprite: Phaser.GameObjects.Sprite;
  helmetSprite: Phaser.GameObjects.Sprite;
  meditationSprite: Phaser.GameObjects.Sprite;
  partyHpBar: Phaser.GameObjects.Graphics;
  meditationConfig?: MeditationVisualConfig;
  label: Phaser.GameObjects.Text;
  playerName: string;
  classId: string;
  factionId: string;
  level: number;
  role: PlayerRole;
  raceId: CharacterRaceId;
  genderId: CharacterGenderId;
  faceIndex: number;
  equippedOutfit: Outfit;
  armorVisual?: PlayerArmorVisualOptions;
  equipment: Record<EquipmentSlot, ItemId | null>;
  tileX: number;
  tileY: number;
  facing: Facing;
  hp: number;
  hpMax: number;
  isMoving: boolean;
  isGhost: boolean;
  invisibleUntilMs: number;
  isMeditating: boolean;
  isNavigating: boolean;
  lastSyncBodyX?: number;
  lastSyncBodyY?: number;
  lastSyncFacing?: Facing;
  lastSyncIsMoving?: boolean;
  lastSyncIsGhost?: boolean;
  lastSyncIsNavigating?: boolean;
  lastSyncHp?: number;
  lastSyncHpMax?: number;
  lastSyncParty?: boolean;
};

export class RemotePlayerManager {
  private readonly entries = new Map<string, RemoteEntry>();
  private partyMemberIds = new Set<string>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depthFromFeetY: (feetY: number) => number,
    private readonly uiCamera?: Phaser.Cameras.Scene2D.Camera,
    private readonly resolveInteractiveCursor: () => string = () => "pointer"
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

  isTileOccupiedByRemote(
    tileX: number,
    tileY: number,
    mapId: string,
    options?: { ignoreGhosts?: boolean }
  ): boolean {
    for (const entry of this.entries.values()) {
      if (entry.tileX === tileX && entry.tileY === tileY) {
        if (options?.ignoreGhosts && (entry.isGhost || entry.hp <= 0)) {
          continue;
        }
        return true;
      }
    }
    return false;
  }

  getPlayerSprite(id: string): Phaser.GameObjects.Sprite | undefined {
    return this.entries.get(id)?.body;
  }

  getVisibleRemoteTilesByIds(ids: ReadonlySet<string>): Array<{ id: string; tileX: number; tileY: number }> {
    const tiles: Array<{ id: string; tileX: number; tileY: number }> = [];
    for (const id of ids) {
      const entry = this.entries.get(id);
      if (!entry || entry.isGhost || entry.hp <= 0) {
        continue;
      }
      tiles.push({ id, tileX: entry.tileX, tileY: entry.tileY });
    }
    return tiles;
  }

  setPartyMemberIds(ids: ReadonlySet<string>): void {
    this.partyMemberIds = new Set(ids);
    for (const entry of this.entries.values()) {
      this.syncPartyHpBar(entry, this.depthFromFeetY(entry.body.y));
    }
  }

  updateInvisibilityVisuals(nowMs: number): void {
    for (const entry of this.entries.values()) {
      if (entry.isGhost) {
        continue;
      }
      syncInvisibilityVisual(
        {
          body: entry.body,
          face: entry.face,
          weapon: entry.weaponSprite,
          shield: entry.shieldSprite,
          helmet: entry.helmetSprite,
          nameLabel: entry.label,
        },
        nowMs,
        entry.invisibleUntilMs
      );
    }
  }

  /** Profundidad, cara y equipo en cada frame (como el jugador local). */
  syncFrame(): void {
    for (const entry of this.entries.values()) {
      this.syncRemoteVisuals(entry);
    }
  }

  getRemoteBySprite(sprite: Phaser.GameObjects.GameObject): RemoteEntry | undefined {
    for (const entry of this.entries.values()) {
      if (
        entry.body === sprite ||
        entry.face === sprite ||
        entry.label === sprite
      ) {
        return entry;
      }
    }
    return undefined;
  }

  findRemoteAtWorldPoint(worldX: number, worldY: number): RemoteEntry | undefined {
    for (const entry of this.entries.values()) {
      if (entry.isGhost) continue;
      if (containsWorldPointInHitArea(entry.body, worldX, worldY)) {
        return entry;
      }
    }
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    return this.findRemoteAtTile(tileX, tileY);
  }

  findRemoteAtTile(tileX: number, tileY: number): RemoteEntry | undefined {
    for (const entry of this.entries.values()) {
      if (entry.isGhost) continue;
      if (entry.tileX === tileX && entry.tileY === tileY) {
        return entry;
      }
      if (Math.abs(entry.tileX - tileX) + Math.abs(entry.tileY - tileY) === 1) {
        return entry;
      }
    }
    return undefined;
  }

  private isRemoteDead(entry: RemoteEntry): boolean {
    return entry.isGhost || entry.hp <= 0;
  }

  findRemoteGhostAtWorldPoint(worldX: number, worldY: number): RemoteEntry | undefined {
    for (const entry of this.entries.values()) {
      if (!this.isRemoteDead(entry)) continue;
      if (containsWorldPointInHitArea(entry.body, worldX, worldY)) {
        return entry;
      }
    }
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    return this.findRemoteGhostAtTile(tileX, tileY);
  }

  findRemoteGhostAtTile(tileX: number, tileY: number): RemoteEntry | undefined {
    for (const entry of this.entries.values()) {
      if (!this.isRemoteDead(entry)) continue;
      if (entry.tileX === tileX && entry.tileY === tileY) {
        return entry;
      }
      if (Math.abs(entry.tileX - tileX) + Math.abs(entry.tileY - tileY) === 1) {
        return entry;
      }
    }
    return undefined;
  }

  findNearestRemoteGhostInRange(
    fromTileX: number,
    fromTileY: number,
    maxTiles: number,
    preferTileX?: number,
    preferTileY?: number
  ): RemoteEntry | undefined {
    let best: RemoteEntry | undefined;
    let bestDist = Infinity;
    for (const entry of this.entries.values()) {
      if (!this.isRemoteDead(entry)) {
        continue;
      }
      const distFromOrigin =
        Math.abs(entry.tileX - fromTileX) + Math.abs(entry.tileY - fromTileY);
      const distFromPrefer =
        preferTileX !== undefined && preferTileY !== undefined
          ? Math.abs(entry.tileX - preferTileX) + Math.abs(entry.tileY - preferTileY)
          : distFromOrigin;
      const dist = Math.min(distFromOrigin, distFromPrefer);
      if (dist > maxTiles) {
        continue;
      }
      if (dist < bestDist) {
        bestDist = dist;
        best = entry;
      }
    }
    return best;
  }

  setPlayerGhost(id: string) {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.hp = 0;
    this.applyRemoteGhostAppearance(entry);
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
    const nextEquipment = netEquipmentToLocal(state.equipment);
    return (
      entry.playerName !== state.name ||
      entry.raceId !== state.raceId ||
      entry.genderId !== state.genderId ||
      entry.faceIndex !== state.faceIndex ||
      entry.equippedOutfit !== nextOutfit ||
      entry.equipment.armor !== nextEquipment.armor ||
      entry.isNavigating !== (state.isNavigating === true)
    );
  }

  private createRemote(state: NetPlayerState): RemoteEntry {
    const raceId = state.raceId as CharacterRaceId;
    const genderId = state.genderId as CharacterGenderId;
    const equippedOutfit = remoteOutfitFromState(state);
    const equipment = netEquipmentToLocal(state.equipment);
    const armorVisual = remoteArmorVisual(equipment, equippedOutfit, raceId);
    const feet = tileToFeetWorld(state.tileX, state.tileY, TILE_SIZE);
    const bodyKey = state.isNavigating === true
      ? BOAT_BODY_TEXTURE_KEY
      : textureKeyForPlayer(
          equippedOutfit,
          raceBodyTextureKey(raceId, genderId),
          armorVisual,
          raceId
        );
    const body = this.scene.add.sprite(feet.x, feet.y, bodyKey, 0);
    applyPlayerOrigin(body);

    const isProfile = state.facing === "left" || state.facing === "right";
    const config: BodyHitboxConfig = {
      width: isProfile ? PLAYER_HITBOX_PROFILE_WIDTH_PX : PLAYER_HITBOX_WIDTH_PX,
      height: PLAYER_HITBOX_HEIGHT_PX,
      offsetX: PLAYER_HITBOX_OFFSET_X,
      offsetY: PLAYER_HITBOX_OFFSET_Y,
    };
    body.setInteractive(buildHitboxFrameRect(body, config), Phaser.Geom.Rectangle.Contains);
    body.input!.cursor = this.resolveInteractiveCursor();

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
    const partyHpBar = this.scene.add.graphics().setVisible(false);
    const meditationConfig = getMeditationVisualConfig(state.factionId, state.level);
    const meditationSprite = this.scene.add
      .sprite(feet.x, feet.y + MEDITATION_FX_OFFSET_Y, meditationConfig.key, 0)
      .setOrigin(0.5, 1)
      .setVisible(false);
    applyMeditationSpriteVisuals(meditationSprite, meditationConfig);

    const colors = getPlayerNameColors(
      normalizeFactionId(state.factionId) as CharacterFactionId,
      state.role
    );
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
      this.uiCamera.ignore([
        body,
        face,
        weaponSprite,
        shieldSprite,
        helmetSprite,
        partyHpBar,
        meditationSprite,
        label,
      ]);
    }

    const entry: RemoteEntry = {
      id: state.id,
      body,
      face,
      weaponSprite,
      shieldSprite,
      helmetSprite,
      partyHpBar,
      meditationSprite,
      meditationConfig,
      label,
      playerName: state.name,
      classId: state.classId,
      factionId: state.factionId,
      level: state.level,
      role: state.role,
      raceId,
      genderId,
      faceIndex: state.faceIndex,
      equippedOutfit,
      armorVisual,
      equipment,
      tileX: state.tileX,
      tileY: state.tileY,
      facing: state.facing,
      hp: state.hp,
      hpMax: state.hpMax,
      isMoving: false,
      isGhost: false,
      invisibleUntilMs: state.invisibleUntilMs ?? 0,
      isMeditating: state.isMeditating === true,
      isNavigating: state.isNavigating === true,
    };

    this.applyBodyFacing(entry);
    this.playRemoteBodyAnim(entry, "idle");
    this.syncRemoteVisuals(entry);
    this.triggerOnDemandLoading(entry);

    return entry;
  }

  private applyState(entry: RemoteEntry, state: NetPlayerState) {
    const serverUntil = state.invisibleUntilMs ?? 0;
    const now = Date.now();
    if (serverUntil > now) {
      entry.invisibleUntilMs = Math.max(entry.invisibleUntilMs, serverUntil);
    } else if (serverUntil === 0 && entry.invisibleUntilMs <= now) {
      entry.invisibleUntilMs = 0;
    }
    entry.playerName = state.name;
    entry.classId = state.classId;
    entry.factionId = state.factionId;
    entry.level = state.level;
    entry.role = state.role;
    entry.faceIndex = state.faceIndex;
    entry.isNavigating = state.isNavigating === true;
    if (entry.label.text !== state.name) {
      entry.label.setText(state.name);
      const colors = getPlayerNameColors(
        normalizeFactionId(state.factionId) as CharacterFactionId,
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

    entry.equipment = netEquipmentToLocal(state.equipment);
    this.triggerOnDemandLoading(entry);

    if (state.hp > 0 && !entry.isNavigating) {
      if (entry.isGhost) {
        this.clearRemoteGhostAppearance(entry, state);
      }
      entry.face.setFrame(
        getFaceFrame(entry.raceId, entry.genderId, entry.faceIndex, entry.facing)
      );
      const nextOutfit = remoteOutfitFromState(state);
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
    }

    const moved = entry.tileX !== state.tileX || entry.tileY !== state.tileY;

    entry.hp = state.hp;
    entry.hpMax = state.hpMax;
    this.syncRemoteMeditation(entry, state.isMeditating === true);

    if (!moved && !facingChanged) {
      entry.tileX = state.tileX;
      entry.tileY = state.tileY;
      this.playRemoteBodyAnim(entry, "idle");
      this.syncRemoteVisuals(entry);
      if (state.hp <= 0) {
        this.applyRemoteGhostAppearance(entry);
      }
      return;
    }

    entry.tileX = state.tileX;
    entry.tileY = state.tileY;
    if (!facingChanged) {
      entry.facing = state.facing;
      this.applyBodyFacing(entry);
    }

    const target = tileToFeetWorld(state.tileX, state.tileY, TILE_SIZE);

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
          if (state.hp <= 0) {
            this.applyRemoteGhostAppearance(entry);
          }
        },
      });
      if (state.hp <= 0) {
        this.applyRemoteGhostAppearance(entry);
      }
      return;
    }

    entry.body.setPosition(target.x, target.y);
    this.playRemoteBodyAnim(entry, "idle");
    this.syncRemoteVisuals(entry);
    if (state.hp <= 0) {
      this.applyRemoteGhostAppearance(entry);
    }
  }

  private applyBodyFacing(entry: RemoteEntry) {
    entry.body.setFlipX(entry.facing === "right");
    entry.face.setFlipX(false);
  }

  private getRemoteBodyTextureKey(entry: RemoteEntry): string {
    if (entry.isNavigating && !entry.isGhost) {
      return BOAT_BODY_TEXTURE_KEY;
    }
    const visualRaceId = entry.isGhost ? GHOST_RACE_ID : entry.raceId;
    const visualGenderId = entry.isGhost ? "male" : entry.genderId;
    return textureKeyForPlayer(
      entry.isGhost ? "base" : entry.equippedOutfit,
      raceBodyTextureKey(visualRaceId, visualGenderId),
      entry.isGhost ? undefined : entry.armorVisual,
      visualRaceId
    );
  }

  /** Layout de cara: usa la identidad de fantasma cuando está muerto para igualar la vista local. */
  private faceLayoutFor(entry: RemoteEntry) {
    return entry.isGhost
      ? getRaceFaceLayout(GHOST_RACE_ID, "male")
      : getRaceFaceLayout(entry.raceId, entry.genderId);
  }

  private syncRemoteVisuals(entry: RemoteEntry, force = false) {
    const isParty = this.partyMemberIds.has(entry.id);

    if (
      !force &&
      entry.lastSyncBodyX === entry.body.x &&
      entry.lastSyncBodyY === entry.body.y &&
      entry.lastSyncFacing === entry.facing &&
      entry.lastSyncIsMoving === entry.isMoving &&
      entry.lastSyncIsGhost === entry.isGhost &&
      entry.lastSyncIsNavigating === entry.isNavigating &&
      entry.lastSyncHp === entry.hp &&
      entry.lastSyncHpMax === entry.hpMax &&
      entry.lastSyncParty === isParty
    ) {
      return;
    }

    entry.lastSyncBodyX = entry.body.x;
    entry.lastSyncBodyY = entry.body.y;
    entry.lastSyncFacing = entry.facing;
    entry.lastSyncIsMoving = entry.isMoving;
    entry.lastSyncIsGhost = entry.isGhost;
    entry.lastSyncIsNavigating = entry.isNavigating;
    entry.lastSyncHp = entry.hp;
    entry.lastSyncHpMax = entry.hpMax;
    entry.lastSyncParty = isParty;

    const depth = this.depthFromFeetY(entry.body.y);
    entry.body.setDepth(depth);

    const layout = this.faceLayoutFor(entry);
    const offset = layout.offset[entry.facing];
    const { x: walkSwayX, y: walkSwayY } = getPlayerHeadWalkSway(
      entry.body,
      entry.facing,
      entry.isMoving
    );

    if (!entry.isGhost) {
      if (entry.isNavigating) {
        entry.face.setVisible(false);
        entry.weaponSprite.setVisible(false);
        entry.shieldSprite.setVisible(false);
        entry.helmetSprite.setVisible(false);
      } else {
        entry.face.setVisible(true);
      }
      entry.face.setFrame(
        getFaceFrame(entry.raceId, entry.genderId, entry.faceIndex, entry.facing)
      );
    }

    entry.face.setPosition(
      entry.body.x + offset.x + walkSwayX,
      entry.body.y - offset.y + walkSwayY
    );
    entry.face.setDepth(depth + 0.02);
    entry.meditationSprite.setPosition(entry.body.x, entry.body.y + MEDITATION_FX_OFFSET_Y);
    entry.meditationSprite.setDepth(depth + 0.06);
    entry.label.setPosition(entry.body.x, entry.body.y + 2);
    entry.label.setDepth(depth + 2);
    this.syncPartyHpBar(entry, depth);
    this.syncRemoteGear(entry, walkSwayX, walkSwayY);
  }

  private syncPartyHpBar(entry: RemoteEntry, depth: number): void {
    const bar = entry.partyHpBar;
    bar.clear();
    const shouldShow =
      this.partyMemberIds.has(entry.id) && !entry.isGhost && entry.hp > 0 && entry.hpMax > 0;
    bar.setVisible(shouldShow);
    if (!shouldShow) {
      return;
    }

    const width = 38;
    const height = 5;
    const x = Math.round(entry.body.x - width / 2);
    const y = Math.round(entry.body.y - Math.max(42, entry.body.displayHeight + 8));
    const ratio = Phaser.Math.Clamp(entry.hp / entry.hpMax, 0, 1);

    bar.setDepth(depth + 3);
    bar.fillStyle(0x111111, 0.78);
    bar.fillRect(x - 1, y - 1, width + 2, height + 2);
    bar.fillStyle(0x15401f, 0.95);
    bar.fillRect(x, y, width, height);
    bar.fillStyle(ratio > 0.35 ? 0x28d15f : 0xd95745, 1);
    bar.fillRect(x, y, Math.max(1, Math.floor(width * ratio)), height);
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

  private syncRemoteGear(
    entry: RemoteEntry,
    walkSwayX = 0,
    walkSwayY = 0
  ) {
    if (entry.isNavigating && !entry.isGhost) {
      entry.weaponSprite.setVisible(false);
      entry.shieldSprite.setVisible(false);
      entry.helmetSprite.setVisible(false);
      return;
    }
    syncEquippedHeldItemVisuals({
      ...this.buildGearSyncContext(entry),
      walkSwayX,
      walkSwayY,
    });
  }

  private syncRemoteMeditation(entry: RemoteEntry, active: boolean): void {
    entry.isMeditating = active && !entry.isGhost && entry.hp > 0;
    const config = getMeditationVisualConfig(entry.factionId, entry.level);
    if (!entry.meditationConfig || entry.meditationConfig.key !== config.key) {
      entry.meditationSprite.setTexture(config.key, 0);
      applyMeditationSpriteVisuals(entry.meditationSprite, config);
      entry.meditationConfig = config;
    }
    if (!entry.isMeditating) {
      entry.meditationSprite.setVisible(false);
      entry.meditationSprite.stop();
      return;
    }
    entry.meditationSprite.setVisible(true);
    entry.meditationSprite.play(config.animKey, true);
  }

  private applyRemoteGhostAppearance(entry: RemoteEntry) {
    entry.isGhost = true;
    const ghostBodyKey = raceBodyTextureKey(GHOST_RACE_ID, "male");
    const ghostFaceKey = faceTextureKey(GHOST_RACE_ID, "male");
    entry.body.setTexture(ghostBodyKey);
    entry.body.setAlpha(GHOST_PLAYER_ALPHA);
    entry.body.anims.stop();
    entry.face.setTexture(ghostFaceKey);
    entry.face.setFrame(getFaceFrame(GHOST_RACE_ID, "male", entry.faceIndex, entry.facing));
    entry.face.setScale(getRaceFaceLayout(GHOST_RACE_ID, "male").scale);
    entry.face.setAlpha(GHOST_PLAYER_ALPHA);
    entry.weaponSprite.setVisible(false);
    entry.shieldSprite.setVisible(false);
    entry.helmetSprite.setVisible(false);
    this.syncRemoteMeditation(entry, false);
    entry.label.setAlpha(1);
    this.applyBodyFacing(entry);
    this.playRemoteBodyAnim(entry, "idle");
    this.syncRemoteVisuals(entry);
  }

  private clearRemoteGhostAppearance(entry: RemoteEntry, state: NetPlayerState) {
    entry.isGhost = false;
    entry.invisibleUntilMs = state.invisibleUntilMs ?? 0;
    entry.body.setAlpha(1);
    entry.face.setAlpha(1);
    entry.weaponSprite.setVisible(true);
    entry.shieldSprite.setVisible(true);
    entry.helmetSprite.setVisible(true);
    entry.label.setAlpha(1);
    const nextOutfit = remoteOutfitFromState(state);
    entry.equippedOutfit = nextOutfit;
    entry.armorVisual = remoteArmorVisual(entry.equipment, nextOutfit, entry.raceId);
    const bodyKey = entry.isNavigating
      ? BOAT_BODY_TEXTURE_KEY
      : textureKeyForPlayer(
          nextOutfit,
          raceBodyTextureKey(entry.raceId, entry.genderId),
          entry.armorVisual,
          entry.raceId
        );
    entry.body.setTexture(bodyKey);
    entry.face.setTexture(faceTextureKey(entry.raceId, entry.genderId));
    entry.face.setFrame(
      getFaceFrame(entry.raceId, entry.genderId, entry.faceIndex, entry.facing)
    );
    entry.face.setScale(getRaceFaceLayout(entry.raceId, entry.genderId).scale);
    this.applyBodyFacing(entry);
    this.playRemoteBodyAnim(entry, "idle");
    this.syncRemoteGear(entry);
    this.syncRemoteVisuals(entry);
  }

  private playRemoteBodyAnim(entry: RemoteEntry, state: "walk" | "idle") {
    const isProfile = entry.facing === "left" || entry.facing === "right";
    const bodyFacing: Facing = isProfile ? "left" : entry.facing;
    const visualRaceId = entry.isGhost ? GHOST_RACE_ID : entry.raceId;
    const visualGenderId = entry.isGhost ? "male" : entry.genderId;
    const bodyKey = raceBodyTextureKey(visualRaceId, visualGenderId);
    const visualOutfit = entry.isGhost || entry.isNavigating ? "base" : entry.equippedOutfit;
    const key = entry.isNavigating && !entry.isGhost
      ? `${state}_${bodyFacing}_${BOAT_BODY_TEXTURE_KEY}`
      : playerAnimationKey(
          state,
          bodyFacing,
          visualOutfit,
          bodyKey,
          entry.isGhost ? undefined : entry.armorVisual,
          visualRaceId
        );

    const bodyTextureKey = this.getRemoteBodyTextureKey(entry);
    if (entry.body.texture.key !== bodyTextureKey) {
      entry.body.setTexture(bodyTextureKey);
      entry.body.anims.stop();
    }

    const playOpts = (animKey: string) => ({ key: animKey, repeat: -1 });

    if (!this.scene.anims.exists(key)) {
      const fallbackFacing: Facing = isProfile ? "left" : entry.facing;
      const fallbackKey = playerAnimationKey(
        "idle",
        fallbackFacing,
        visualOutfit,
        bodyKey,
        entry.isGhost ? undefined : entry.armorVisual,
        visualRaceId
      );
      if (this.scene.anims.exists(fallbackKey)) {
        entry.body.play(playOpts(fallbackKey), true);
      } else {
        entry.body.anims.stop();
      }
      return;
    }

    entry.body.play(playOpts(key), true);
  }

  private triggerOnDemandLoading(entry: RemoteEntry) {
    const itemsToLoad: ItemId[] = [];
    if (entry.equipment.weapon) itemsToLoad.push(entry.equipment.weapon);
    if (entry.equipment.shield) itemsToLoad.push(entry.equipment.shield);
    if (entry.equipment.helmet) itemsToLoad.push(entry.equipment.helmet);
    if (entry.equipment.armor) itemsToLoad.push(entry.equipment.armor);

    for (const itemId of itemsToLoad) {
      ensureItemAssetsLoaded(this.scene, itemId, {
        raceId: entry.raceId,
        onComplete: () => {
          const activeEntry = this.entries.get(entry.id);
          if (activeEntry) {
            this.refreshRemoteTexturesAndGear(activeEntry);
          }
        }
      });
    }
  }

  private refreshRemoteTexturesAndGear(entry: RemoteEntry) {
    if (this.isRemoteDead(entry)) {
      return;
    }

    const mockStateEquipment = {
      weaponId: entry.equipment.weapon,
      shieldId: entry.equipment.shield,
      helmetId: entry.equipment.helmet,
      armorId: entry.equipment.armor,
      equippedOutfit: entry.equippedOutfit,
    };
    const nextOutfit = remoteOutfitFromState({ equipment: mockStateEquipment });
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
    if (entry.body.texture.key !== nextBodyKey) {
      entry.body.setTexture(nextBodyKey);
      entry.body.anims.stop();
    }

    this.playRemoteBodyAnim(entry, entry.isMoving ? "walk" : "idle");
    this.syncRemoteVisuals(entry, true);
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
    entry.meditationSprite.destroy();
    entry.partyHpBar.destroy();
    entry.label.destroy();
    this.entries.delete(id);
  }
}
