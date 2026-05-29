import Phaser from "phaser";
import { TILE_SIZE } from "../../config";
import { getMap } from "../../maps";
import {
  buildAllInitialMobPlacements,
  TRAINING_DUMMY_HITBOX_HEIGHT_TILES,
  TRAINING_DUMMY_HITBOX_OFFSET_Y,
  TRAINING_DUMMY_HITBOX_WIDTH_TILES,
  TRAINING_DUMMY_HP,
  TRAINING_DUMMY_ID,
} from "../../../shared/mobSpawns";
import {
  MOB_SPAWNS,
  type MobModelId,
  type MobSpawnConfig,
} from "../../data/mobs";
import { createMobSprite } from "../../game/mobs/mobVisualRuntime";
import {
  getMobShowcaseAnchorTile,
  MOB_SHOWCASE_CONFIG,
  MOB_SHOWCASE_MODEL_ORDER,
} from "../../data/mobShowcase";
import { PEACEFUL_WANDER_MIN_MS, PEACEFUL_WANDER_MAX_MS } from "../../systems/MobAiSystem";
import { buildHitboxFrameRect } from "../../game/hitboxUtils";
import type { NetMobState } from "../../../shared/types";
import { GAME_FONT, GAME_TEXT_RESOLUTION } from "../../ui/fonts";
import type { Facing } from "../../player/playerSprites";
import {
  applyMobHitboxOverrideToDummy,
  clearMobHitboxOverrides,
  exportMobHitboxOverridesToConsole,
  getMobHitboxOverrides,
  persistMobHitboxOverrideForDummy,
  resolveMobHitbox,
  saveMobHitboxOverridesFromDummies,
} from "./mobHitboxOverrides";
import {
  DEFAULT_MOB_HITBOX_HEIGHT_TILES,
  DEFAULT_MOB_HITBOX_OFFSET_Y,
  DEFAULT_MOB_HITBOX_WIDTH_TILES,
  MOB_HITBOX_HEIGHT_RATIO,
  TRAINING_DUMMY_NAME,
} from "./constants";
import type { DummyState, MoveDirection } from "./types";

export type GameSceneMobDeps = {
  scene: Phaser.Scene;
  getUiCamera: () => Phaser.Cameras.Scene2D.Camera | undefined;
  time: Phaser.Time.Clock;
  tweens: Phaser.Tweens.TweenManager;

  getCurrentMapId: () => string;
  getPlayerTile: () => { x: number; y: number };
  getInspectedDummyId: () => string | null;
  setInspectedDummyId: (id: string | null) => void;
  isMultiplayerActive: () => boolean;
  isHitboxDebugEnabled: () => boolean;
  setHitboxDebugEnabled: (enabled: boolean) => void;

  addChatLine: (text: string) => void;
  refreshInspectedDummyLabel: () => void;
  killDummy: (dummy: DummyState) => void;
  applyMobDeathFromServer: (dummy: DummyState) => void;
  applyMobReviveFromServer: (
    dummy: DummyState,
    netMob: Pick<import("../../../shared/types").NetMobState, "hp" | "hpMax" | "tileX" | "tileY" | "facing">
  ) => void;
  restoreLocalMobsAfterDisconnect: () => void;

  getMobFeetWorld: (modelId: MobModelId, tileX: number, tileY: number) => { x: number; y: number };
  getMobStepDurationMs: (modelId: MobModelId) => number;
  depthFromFeetY: (feetY: number) => number;
  setupMobHitboxInteraction: (
    sprite: Phaser.GameObjects.Sprite,
    hitboxHeightTiles: number,
    hitboxWidthTiles: number,
    hitboxOffsetY: number
  ) => void;
  syncDummyWorldPosition: (dummy: DummyState) => void;
  attachMobFaceIfNeeded: (dummy: DummyState, facing?: Facing) => void;
  setMobAnimationState: (dummy: DummyState, state: "idle" | "walk") => void;
  syncMobFaceForDummy: (dummy: DummyState) => void;
  rebuildMobHitbox: (dummy: DummyState) => void;
  startDummyStep: (
    dummy: DummyState,
    nextTileX: number,
    nextTileY: number,
    facing: Facing
  ) => boolean;
  isTileWalkableForMob: (tileX: number, tileY: number, source: DummyState) => boolean;
  isTileOccupiedByStaticNpc: (tileX: number, tileY: number, mapId?: string) => boolean;
  pickRandomMobSpawnTile: (spawn: MobSpawnConfig) => { x: number; y: number };
};

/**
 * Mobs locales: spawn, showcase, sync desde servidor y editor /mob.
 */
export class GameSceneMobController {
  private readonly dummies: DummyState[] = [];

  constructor(private readonly deps: GameSceneMobDeps) {}

  /** Objetos de mob solo en cámara de mundo (no fijos en viewport UI). */
  private registerMobWorldCamera(...objects: Phaser.GameObjects.GameObject[]) {
    const uiCamera = this.deps.getUiCamera();
    if (!uiCamera) {
      return;
    }
    const valid = objects.filter((obj): obj is Phaser.GameObjects.GameObject => Boolean(obj));
    if (valid.length > 0) {
      uiCamera.ignore(valid);
    }
  }

  getDummies(): DummyState[] {
    return this.dummies;
  }

  findById(id: string): DummyState | undefined {
    return this.dummies.find((entry) => entry.id === id);
  }

  createAllIfNeeded(): void {
    if (this.dummies.length > 0) {
      this.syncVisibilityForCurrentMap();
      this.createShowcaseIfNeeded();
      this.applyHitboxOverrides();
      return;
    }

    this.dummies.length = 0;
    const placementBySpawnId = new Map(
      buildAllInitialMobPlacements().map((placement) => [placement.spawnId, placement])
    );

    MOB_SPAWNS.forEach((spawn) => {
      const placed = placementBySpawnId.get(spawn.id);
      const spawnTile = placed
        ? { x: placed.tileX, y: placed.tileY }
        : this.deps.pickRandomMobSpawnTile(spawn);
      this.dummies.push(this.spawnLocalMob(spawn, spawnTile, spawn.maxHp));
    });

    this.spawnTrainingDummy(placementBySpawnId);
    this.syncVisibilityForCurrentMap();
    this.createShowcaseIfNeeded();
    this.applyHitboxOverrides();
    this.reregisterAllMobWorldCamera();
  }

  /** Tras recrear mobs (p. ej. desconexión MP) hay que volver a ignorarlos en la UI cam. */
  reregisterAllMobWorldCamera(): void {
    for (const dummy of this.dummies) {
      this.registerMobWorldCamera(
        dummy.sprite,
        dummy.hpLabel,
        ...(dummy.face ? [dummy.face] : [])
      );
    }
  }

  destroyAll(): void {
    this.deps.setInspectedDummyId(null);
    for (const dummy of this.dummies) {
      this.deps.tweens.killTweensOf(dummy.sprite);
      dummy.sprite.destroy();
      dummy.face?.destroy();
      dummy.hpLabel.destroy();
    }
    this.dummies.length = 0;
  }

  syncFromServer(mobs: NetMobState[] | null | undefined): void {
    if (!Array.isArray(mobs)) {
      return;
    }
    for (const netMob of mobs) {
      this.applyNetState(netMob);
    }
    this.applyHitboxOverrides();
    this.reregisterAllMobWorldCamera();
  }

  applyNetState(netMob: NetMobState): void {
    if (netMob.mapId !== this.deps.getCurrentMapId()) return;

    let dummy: DummyState | null = this.findById(netMob.id) ?? null;
    if (!dummy) {
      dummy = this.spawnFromNetMob(netMob);
      if (!dummy) return;
    }

    dummy.hp = netMob.hp;
    dummy.maxHp = netMob.hpMax;

    if (!netMob.alive && dummy.alive) {
      this.deps.applyMobDeathFromServer(dummy);
      return;
    }

    if (netMob.alive && !dummy.alive) {
      this.deps.applyMobReviveFromServer(dummy, netMob);
    } else if (netMob.alive) {
      dummy.sprite.setVisible(true);
    }

    const tileChanged =
      dummy.tileX !== netMob.tileX || dummy.tileY !== netMob.tileY;
    const facingChanged = netMob.facing !== dummy.facing;

    if (tileChanged) {
      const prevTileX = dummy.tileX;
      const prevTileY = dummy.tileY;
      dummy.tileX = netMob.tileX;
      dummy.tileY = netMob.tileY;
      const dist =
        Math.abs(netMob.tileX - prevTileX) + Math.abs(netMob.tileY - prevTileY);

      if (dist > 2) {
        this.snapNetMobToTile(dummy, netMob.tileX, netMob.tileY, netMob.facing);
      } else if (dist > 0) {
        this.enqueueNetMobStep(dummy, netMob.tileX, netMob.tileY, netMob.facing);
      }
    } else if (facingChanged) {
      dummy.facing = netMob.facing;
      if (dummy.isMoving) {
        this.deps.syncMobFaceForDummy(dummy);
      } else {
        this.deps.setMobAnimationState(dummy, "idle");
      }
    }

    if (dummy.id === this.deps.getInspectedDummyId()) {
      this.deps.refreshInspectedDummyLabel();
    }
  }

  private snapNetMobToTile(
    dummy: DummyState,
    tileX: number,
    tileY: number,
    facing: Facing
  ): void {
    this.deps.tweens.killTweensOf(dummy.sprite);
    dummy.netMoveQueue = [];
    dummy.isMoving = false;
    dummy.netMoveTargetTile = undefined;
    dummy.tileX = tileX;
    dummy.tileY = tileY;
    dummy.facing = facing;
    const feet = this.deps.getMobFeetWorld(dummy.modelId, tileX, tileY);
    dummy.sprite.setPosition(feet.x, feet.y);
    this.deps.syncDummyWorldPosition(dummy);
    this.deps.setMobAnimationState(dummy, "idle");
  }

  private enqueueNetMobStep(
    dummy: DummyState,
    tileX: number,
    tileY: number,
    facing: Facing
  ): void {
    if (!dummy.netMoveQueue) {
      dummy.netMoveQueue = [];
    }

    const lastQueued = dummy.netMoveQueue[dummy.netMoveQueue.length - 1];
    if (lastQueued?.x === tileX && lastQueued?.y === tileY) {
      lastQueued.facing = facing;
      return;
    }

    if (
      dummy.isMoving &&
      dummy.netMoveTargetTile?.x === tileX &&
      dummy.netMoveTargetTile?.y === tileY
    ) {
      dummy.facing = facing;
      this.deps.syncMobFaceForDummy(dummy);
      return;
    }

    dummy.netMoveQueue.push({ x: tileX, y: tileY, facing });
    this.pumpNetMobStep(dummy);
  }

  private pumpNetMobStep(dummy: DummyState): void {
    if (dummy.isMoving || !dummy.netMoveQueue?.length) {
      return;
    }

    const next = dummy.netMoveQueue.shift()!;
    dummy.facing = next.facing;
    dummy.netMoveTargetTile = { x: next.x, y: next.y };

    const target = this.deps.getMobFeetWorld(dummy.modelId, next.x, next.y);
    const stepMs = this.deps.getMobStepDurationMs(dummy.modelId);
    const distPx = Phaser.Math.Distance.Between(
      dummy.sprite.x,
      dummy.sprite.y,
      target.x,
      target.y
    );
    const duration = Math.max(
      80,
      Math.min(stepMs, Math.round(stepMs * (distPx / TILE_SIZE)))
    );

    dummy.isMoving = true;
    this.deps.setMobAnimationState(dummy, "walk");

    this.deps.tweens.add({
      targets: dummy.sprite,
      x: target.x,
      y: target.y,
      duration,
      ease: "Linear",
      onUpdate: () => {
        dummy.hpLabel.setPosition(dummy.sprite.x, dummy.sprite.y - 30);
        dummy.sprite.setDepth(this.deps.depthFromFeetY(dummy.sprite.y));
        if (dummy.face) {
          this.deps.syncMobFaceForDummy(dummy);
        }
      },
      onComplete: () => {
        dummy.isMoving = false;
        dummy.netMoveTargetTile = undefined;
        dummy.sprite.setPosition(target.x, target.y);
        if (dummy.face) {
          this.deps.syncMobFaceForDummy(dummy);
        }
        if (dummy.netMoveQueue && dummy.netMoveQueue.length > 0) {
          this.pumpNetMobStep(dummy);
        } else {
          this.deps.setMobAnimationState(dummy, "idle");
        }
      },
    });
  }

  applyNetLeft(mobId: string): void {
    const dummy = this.findById(mobId);
    if (!dummy) return;
    dummy.sprite.setVisible(false);
    dummy.hpLabel.setVisible(false);
  }

  createShowcaseIfNeeded(): void {
    if (this.deps.isMultiplayerActive()) {
      this.removeShowcaseDummies();
      return;
    }

    if (this.dummies.some((dummy) => dummy.isShowcase)) {
      return;
    }

    const showcaseMap = getMap(MOB_SHOWCASE_CONFIG.mapId);
    MOB_SHOWCASE_MODEL_ORDER.forEach((modelId, index) => {
      const templateSpawn =
        MOB_SPAWNS.find((spawn) => spawn.modelId === modelId) ?? MOB_SPAWNS[0];
      const anchor = getMobShowcaseAnchorTile(index, showcaseMap.width, showcaseMap.height);
      const showcaseId = `showcase_${modelId}`;
      const feet = this.deps.getMobFeetWorld(modelId, anchor.x, anchor.y);
      const sprite = createMobSprite(this.deps.scene, modelId, feet.x, feet.y, "down");
      this.deps.setupMobHitboxInteraction(
        sprite,
        templateSpawn.hitboxHeightTiles,
        templateSpawn.hitboxWidthTiles,
        templateSpawn.hitboxOffsetY
      );

      const hpLabel = this.deps.scene.add.text(feet.x, feet.y - 30, modelId, {
        fontFamily: GAME_FONT,
        fontSize: "11px",
        color: "#b8e6ff",
        stroke: "#000000",
        strokeThickness: 3,
        resolution: GAME_TEXT_RESOLUTION,
      });
      hpLabel.setOrigin(0.5, 1);
      hpLabel.setDepth(12);
      hpLabel.setVisible(this.deps.getCurrentMapId() === MOB_SHOWCASE_CONFIG.mapId);

      const spawnConfig: MobSpawnConfig = {
        ...templateSpawn,
        id: showcaseId,
        name: modelId,
        behavior: "peaceful",
        mapId: MOB_SHOWCASE_CONFIG.mapId,
        modelId,
        maxHp: 999_999,
        detectionRangeTiles: 0,
        leashRangeTiles: 0,
        attackDamage: 0,
        expReward: 0,
        drops: [],
        respawnMs: 0,
      };

      const dummy: DummyState = {
        spawnConfig,
        id: showcaseId,
        behavior: "peaceful",
        modelId,
        name: modelId,
        mapId: MOB_SHOWCASE_CONFIG.mapId,
        tileX: anchor.x,
        tileY: anchor.y,
        hitboxOffsetY: templateSpawn.hitboxOffsetY,
        hitboxHeightTiles: templateSpawn.hitboxHeightTiles,
        hitboxWidthTiles: templateSpawn.hitboxWidthTiles,
        sizeTiles: templateSpawn.sizeTiles,
        hp: 999_999,
        maxHp: 999_999,
        detectionRangeTiles: 0,
        leashRangeTiles: 0,
        attackDamage: 0,
        attackCooldownMs: 1000,
        respawnMs: 0,
        expReward: 0,
        drops: [],
        aiMoveCooldownMs: 0,
        nextAiMoveAt: this.deps.time.now + index * 200 + MOB_SHOWCASE_CONFIG.stepIntervalMs,
        nextAttackAt: 0,
        immobilizedUntilMs: 0,
        isAggroed: false,
        isStatic: false,
        facing: "down",
        isMoving: false,
        wasAdjacentToPlayer: false,
        sprite,
        hpLabel,
        alive: true,
        isShowcase: true,
        showcaseStepIndex: 0,
      };
      dummy.aiMoveCooldownMs = this.deps.getMobStepDurationMs(dummy.modelId);
      this.deps.syncDummyWorldPosition(dummy);
      this.deps.attachMobFaceIfNeeded(dummy);
      this.deps.setMobAnimationState(dummy, "idle");
      this.dummies.push(dummy);
    });
  }

  removeShowcaseDummies(): void {
    const showcaseIds = new Set(
      this.dummies.filter((dummy) => dummy.isShowcase).map((dummy) => dummy.id)
    );
    if (showcaseIds.size === 0) {
      return;
    }

    for (let i = this.dummies.length - 1; i >= 0; i -= 1) {
      const dummy = this.dummies[i];
      if (!showcaseIds.has(dummy.id)) continue;
      this.deps.tweens.killTweensOf(dummy.sprite);
      dummy.sprite.destroy();
      dummy.face?.destroy();
      dummy.hpLabel.destroy();
      this.dummies.splice(i, 1);
    }
  }

  updateShowcaseAi(): void {
    const now = this.deps.time.now;

    this.dummies.forEach((dummy) => {
      if (!dummy.isShowcase || !dummy.alive || dummy.mapId !== this.deps.getCurrentMapId()) {
        return;
      }
      if (dummy.isMoving || now < dummy.nextAiMoveAt) {
        return;
      }

      const stepIndex = dummy.showcaseStepIndex ?? 0;
      const deltas: MoveDirection[] = [
        { dx: 0, dy: 1, facing: "down" },
        { dx: 1, dy: 0, facing: "right" },
        { dx: 0, dy: -1, facing: "up" },
        { dx: -1, dy: 0, facing: "left" },
      ];
      const step = deltas[stepIndex % deltas.length];
      const nextTileX = dummy.tileX + step.dx;
      const nextTileY = dummy.tileY + step.dy;

      if (this.deps.isTileWalkableForMob(nextTileX, nextTileY, dummy)) {
        if (this.deps.startDummyStep(dummy, nextTileX, nextTileY, step.facing)) {
          dummy.showcaseStepIndex = (stepIndex + 1) % deltas.length;
        }
      }

      dummy.nextAiMoveAt = now + MOB_SHOWCASE_CONFIG.stepIntervalMs;
    });
  }

  syncVisibilityForCurrentMap(): void {
    const inspectedId = this.deps.getInspectedDummyId();
    this.dummies.forEach((dummy) => {
      const visible = this.deps.getCurrentMapId() === dummy.mapId;
      dummy.sprite.setVisible(visible && dummy.alive);
      if (dummy.face) {
        dummy.face.setVisible(visible && dummy.alive);
      }
      if (dummy.isShowcase) {
        dummy.hpLabel.setVisible(visible && dummy.alive);
      } else {
        dummy.hpLabel.setVisible(visible && dummy.alive && dummy.id === inspectedId);
      }

      if (visible && dummy.alive && !dummy.isMoving) {
        this.deps.syncDummyWorldPosition(dummy);
      }
    });
  }

  handleMobEditCommand(normalized: string): boolean {
    const args = normalized.slice("/mob ".length).trim().split(/\s+/);
    const sub = args[0];

    if (sub === "save") {
      const count = saveMobHitboxOverridesFromDummies(this.dummies);
      this.deps.addChatLine(`Guardado ${count} override(s). Persistirá al recargar.`);
      return true;
    }
    if (sub === "export") {
      const overrides = getMobHitboxOverrides();
      if (Object.keys(overrides).length === 0) {
        this.deps.addChatLine("No hay overrides guardados. Usá /mob save primero.");
        return true;
      }
      this.deps.addChatLine("--- Valores para mobs.json ---");
      for (const [mobId, vals] of Object.entries(overrides)) {
        this.deps.addChatLine(
          `"${mobId}": offsetY=${vals.hitboxOffsetY}, h=${vals.hitboxHeightTiles}, w=${vals.hitboxWidthTiles}`
        );
      }
      exportMobHitboxOverridesToConsole(overrides);
      this.deps.addChatLine("(JSON completo impreso en consola del navegador)");
      return true;
    }
    if (sub === "reset") {
      clearMobHitboxOverrides();
      this.deps.addChatLine("Overrides borrados. Recargá para volver a los valores de mobs.json.");
      return true;
    }
    if (sub === "keys") {
      const overrides = getMobHitboxOverrides();
      const keys = Object.keys(overrides);
      if (keys.length === 0) {
        this.deps.addChatLine("No hay overrides en localStorage.");
        return true;
      }
      this.deps.addChatLine(`Overrides guardados (${keys.length}):`);
      for (const key of keys) {
        const vals = overrides[key];
        this.deps.addChatLine(
          `${key}: oy=${vals.hitboxOffsetY} h=${vals.hitboxHeightTiles} w=${vals.hitboxWidthTiles}`
        );
      }
      return true;
    }
    if (sub === "help") {
      this.deps.addChatLine("/mob oy <px> — offset Y en pixels");
      this.deps.addChatLine("/mob h <tiles> — alto en tiles");
      this.deps.addChatLine("/mob w <tiles> — ancho en tiles");
      this.deps.addChatLine("/mob info — ver valores actuales");
      this.deps.addChatLine("/mob save — guardar todos los mobs visibles");
      this.deps.addChatLine("/mob keys — listar overrides en localStorage");
      this.deps.addChatLine("/mob export — copiar valores para mobs.json");
      this.deps.addChatLine("/mob reset — borrar overrides guardados");
      this.deps.addChatLine("Los cambios se guardan por id de spawn (ej. lobo_pueblo_1).");
      return true;
    }

    const inspectedId = this.deps.getInspectedDummyId();
    if (!inspectedId) {
      this.deps.addChatLine("Primero clickeá un mob para inspeccionarlo.");
      return true;
    }

    const dummy = this.findById(inspectedId);
    if (!dummy) {
      this.deps.addChatLine("Mob no encontrado.");
      return true;
    }

    if (sub === "offsety" || sub === "oy") {
      const val = parseInt(args[1], 10);
      if (isNaN(val)) {
        this.deps.addChatLine(`Uso: /mob oy <px>  (actual: ${dummy.hitboxOffsetY})`);
        return true;
      }
      dummy.hitboxOffsetY = val;
      persistMobHitboxOverrideForDummy(dummy);
      this.rebuildHitbox(dummy);
      this.deps.addChatLine(`${dummy.name} hitboxOffsetY = ${val}px`);
      return true;
    }

    if (sub === "height" || sub === "h") {
      const val = parseInt(args[1], 10);
      if (isNaN(val) || val < 1) {
        this.deps.addChatLine(`Uso: /mob h <tiles>  (actual: ${dummy.hitboxHeightTiles})`);
        return true;
      }
      dummy.hitboxHeightTiles = val;
      persistMobHitboxOverrideForDummy(dummy);
      this.rebuildHitbox(dummy);
      this.deps.addChatLine(`${dummy.name} hitboxHeightTiles = ${val}`);
      return true;
    }

    if (sub === "width" || sub === "w") {
      const val = parseInt(args[1], 10);
      if (isNaN(val) || val < 1) {
        this.deps.addChatLine(`Uso: /mob w <tiles>  (actual: ${dummy.hitboxWidthTiles})`);
        return true;
      }
      dummy.hitboxWidthTiles = val;
      persistMobHitboxOverrideForDummy(dummy);
      this.rebuildHitbox(dummy);
      this.deps.addChatLine(`${dummy.name} hitboxWidthTiles = ${val}`);
      return true;
    }

    if (sub === "info" || sub === "i") {
      this.deps.addChatLine(
        `[${dummy.id}] offsetY=${dummy.hitboxOffsetY}px  h=${dummy.hitboxHeightTiles}  w=${dummy.hitboxWidthTiles}`
      );
      return true;
    }

    this.deps.addChatLine("Uso: /mob <oy|h|w|info|save|export|reset|help>");
    return true;
  }

  rebuildHitbox(dummy: DummyState): void {
    const width = Math.max(1, dummy.hitboxWidthTiles) * TILE_SIZE;
    const height = Math.max(1, dummy.hitboxHeightTiles) * TILE_SIZE * MOB_HITBOX_HEIGHT_RATIO;
    const hitArea = buildHitboxFrameRect(dummy.sprite, {
      width,
      height,
      offsetX: 0,
      offsetY: dummy.hitboxOffsetY,
    });

    if (dummy.sprite.input) {
      dummy.sprite.input.hitArea = hitArea;
    } else {
      dummy.sprite.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
      dummy.sprite.input!.cursor = "pointer";
    }
  }

  applyHitboxOverrides(): void {
    const overrides = getMobHitboxOverrides();
    if (Object.keys(overrides).length === 0) {
      return;
    }

    for (const dummy of this.dummies) {
      applyMobHitboxOverrideToDummy(dummy);
      this.rebuildHitbox(dummy);
    }
  }

  private spawnLocalMob(
    spawn: MobSpawnConfig,
    spawnTile: { x: number; y: number },
    hp: number
  ): DummyState {
    const hitbox = resolveMobHitbox({
      id: spawn.id,
      mobId: spawn.mobId,
      hitboxOffsetY: spawn.hitboxOffsetY,
      hitboxHeightTiles: spawn.hitboxHeightTiles,
      hitboxWidthTiles: spawn.hitboxWidthTiles,
    });
    const spawnFeet = this.deps.getMobFeetWorld(spawn.modelId, spawnTile.x, spawnTile.y);
    const sprite = createMobSprite(this.deps.scene, spawn.modelId, spawnFeet.x, spawnFeet.y, "down");
    this.deps.setupMobHitboxInteraction(
      sprite,
      hitbox.hitboxHeightTiles,
      hitbox.hitboxWidthTiles,
      hitbox.hitboxOffsetY
    );

    const hpLabel = this.deps.scene.add.text(
      spawnFeet.x,
      spawnFeet.y - 30,
      `${spawn.name} ${hp}/${hp}`,
      {
        fontFamily: GAME_FONT,
        fontSize: "11px",
        color: "#f7e5c6",
        stroke: "#000000",
        strokeThickness: 3,
        resolution: GAME_TEXT_RESOLUTION,
      }
    );
    hpLabel.setOrigin(0.5, 1);
    hpLabel.setDepth(12);
    hpLabel.setVisible(false);
    this.registerMobWorldCamera(sprite, hpLabel);

    const dummy: DummyState = {
      spawnConfig: spawn,
      id: spawn.id,
      behavior: spawn.behavior,
      modelId: spawn.modelId,
      name: spawn.name,
      mapId: spawn.mapId,
      tileX: spawnTile.x,
      tileY: spawnTile.y,
      hitboxOffsetY: hitbox.hitboxOffsetY,
      hitboxHeightTiles: hitbox.hitboxHeightTiles,
      hitboxWidthTiles: hitbox.hitboxWidthTiles,
      sizeTiles: spawn.sizeTiles,
      hp,
      maxHp: spawn.maxHp,
      detectionRangeTiles: spawn.detectionRangeTiles,
      leashRangeTiles: spawn.leashRangeTiles,
      attackDamage: spawn.attackDamage,
      attackCooldownMs: spawn.attackCooldownMs,
      respawnMs: spawn.respawnMs,
      expReward: spawn.expReward,
      drops: spawn.drops,
      aiMoveCooldownMs: 0,
      nextAiMoveAt:
        spawn.behavior === "peaceful"
          ? this.deps.time.now + Phaser.Math.Between(PEACEFUL_WANDER_MIN_MS, PEACEFUL_WANDER_MAX_MS)
          : 0,
      nextAttackAt: 0,
      immobilizedUntilMs: 0,
      isAggroed: false,
      isStatic: false,
      fixedSpawnTile: undefined,
      facing: "down",
      isMoving: false,
      wasAdjacentToPlayer: false,
      sprite,
      hpLabel,
      alive: true,
    };
    dummy.aiMoveCooldownMs = this.deps.getMobStepDurationMs(dummy.modelId);
    this.deps.syncDummyWorldPosition(dummy);
    this.deps.attachMobFaceIfNeeded(dummy);
    this.deps.setMobAnimationState(dummy, "idle");
    return dummy;
  }

  private spawnTrainingDummy(
    placementBySpawnId: Map<string, { tileX: number; tileY: number }>
  ): void {
    const trainingDummyMapId = this.deps.getCurrentMapId();
    const trainingPlacement = placementBySpawnId.get(TRAINING_DUMMY_ID);
    const playerTile = this.deps.getPlayerTile();
    const trainingDummyTileX = trainingPlacement?.tileX ?? playerTile.x;
    const trainingDummyTileY = trainingPlacement?.tileY ?? Math.max(0, playerTile.y - 1);
    const trainingDummyModelId: MobModelId = "training_dummy";
    const trainingFeet = this.deps.getMobFeetWorld(
      trainingDummyModelId,
      trainingDummyTileX,
      trainingDummyTileY
    );
    const trainingHitbox = resolveMobHitbox({
      id: TRAINING_DUMMY_ID,
      mobId: "gallina",
      hitboxOffsetY: TRAINING_DUMMY_HITBOX_OFFSET_Y,
      hitboxHeightTiles: TRAINING_DUMMY_HITBOX_HEIGHT_TILES,
      hitboxWidthTiles: TRAINING_DUMMY_HITBOX_WIDTH_TILES,
    });
    const trainingSprite = createMobSprite(
      this.deps.scene,
      trainingDummyModelId,
      trainingFeet.x,
      trainingFeet.y,
      "down"
    );
    this.deps.setupMobHitboxInteraction(
      trainingSprite,
      trainingHitbox.hitboxHeightTiles,
      trainingHitbox.hitboxWidthTiles,
      trainingHitbox.hitboxOffsetY
    );

    const trainingHpLabel = this.deps.scene.add.text(
      trainingFeet.x,
      trainingFeet.y - 30,
      `${TRAINING_DUMMY_NAME} ${TRAINING_DUMMY_HP}/${TRAINING_DUMMY_HP}`,
      {
        fontFamily: GAME_FONT,
        fontSize: "11px",
        color: "#f7e5c6",
        stroke: "#000000",
        strokeThickness: 3,
        resolution: GAME_TEXT_RESOLUTION,
      }
    );
    trainingHpLabel.setOrigin(0.5, 1);
    trainingHpLabel.setDepth(12);
    trainingHpLabel.setVisible(false);
    this.registerMobWorldCamera(trainingSprite, trainingHpLabel);

    const trainingSpawnConfig: MobSpawnConfig = {
      id: TRAINING_DUMMY_ID,
      mobId: "gallina",
      name: TRAINING_DUMMY_NAME,
      behavior: "peaceful",
      mapId: trainingDummyMapId,
      hitboxOffsetY: TRAINING_DUMMY_HITBOX_OFFSET_Y,
      hitboxHeightTiles: TRAINING_DUMMY_HITBOX_HEIGHT_TILES,
      hitboxWidthTiles: TRAINING_DUMMY_HITBOX_WIDTH_TILES,
      sizeTiles: 1,
      modelId: trainingDummyModelId,
      maxHp: TRAINING_DUMMY_HP,
      detectionRangeTiles: 0,
      leashRangeTiles: 0,
      attackDamage: 0,
      attackCooldownMs: 1000,
      respawnMs: 10_000,
      expReward: 0,
      drops: [],
    };

    const trainingDummy: DummyState = {
      spawnConfig: trainingSpawnConfig,
      id: TRAINING_DUMMY_ID,
      behavior: "peaceful",
      modelId: trainingDummyModelId,
      name: TRAINING_DUMMY_NAME,
      mapId: trainingDummyMapId,
      tileX: trainingDummyTileX,
      tileY: trainingDummyTileY,
      hitboxOffsetY: trainingHitbox.hitboxOffsetY,
      hitboxHeightTiles: trainingHitbox.hitboxHeightTiles,
      hitboxWidthTiles: trainingHitbox.hitboxWidthTiles,
      sizeTiles: 1,
      hp: TRAINING_DUMMY_HP,
      maxHp: TRAINING_DUMMY_HP,
      detectionRangeTiles: 0,
      leashRangeTiles: 0,
      attackDamage: 0,
      attackCooldownMs: 1000,
      respawnMs: 10_000,
      expReward: 0,
      drops: [],
      aiMoveCooldownMs: 0,
      nextAiMoveAt: 0,
      nextAttackAt: 0,
      immobilizedUntilMs: 0,
      isAggroed: false,
      isStatic: true,
      fixedSpawnTile: { x: trainingDummyTileX, y: trainingDummyTileY },
      facing: "down",
      isMoving: false,
      wasAdjacentToPlayer: false,
      sprite: trainingSprite,
      hpLabel: trainingHpLabel,
      alive: true,
    };
    trainingDummy.aiMoveCooldownMs = this.deps.getMobStepDurationMs(trainingDummy.modelId);
    this.deps.syncDummyWorldPosition(trainingDummy);
    this.deps.setMobAnimationState(trainingDummy, "idle");
    this.rebuildHitbox(trainingDummy);
    this.dummies.push(trainingDummy);
  }

  private spawnFromNetMob(netMob: NetMobState): DummyState | null {
    const spawn =
      MOB_SPAWNS.find((entry) => entry.id === netMob.id) ??
      MOB_SPAWNS.find((entry) => entry.mobId === netMob.mobId);
    if (!spawn) {
      return null;
    }

    const hitbox = resolveMobHitbox({
      id: netMob.id,
      mobId: spawn.mobId,
      hitboxOffsetY: spawn.hitboxOffsetY,
      hitboxHeightTiles: spawn.hitboxHeightTiles,
      hitboxWidthTiles: spawn.hitboxWidthTiles,
    });
    const feet = this.deps.getMobFeetWorld(spawn.modelId, netMob.tileX, netMob.tileY);
    const sprite = createMobSprite(this.deps.scene, spawn.modelId, feet.x, feet.y, netMob.facing);
    this.deps.setupMobHitboxInteraction(
      sprite,
      hitbox.hitboxHeightTiles,
      hitbox.hitboxWidthTiles,
      hitbox.hitboxOffsetY
    );

    const hpLabel = this.deps.scene.add.text(feet.x, feet.y - 30, "", {
      fontFamily: GAME_FONT,
      fontSize: "11px",
      color: "#f7e5c6",
      stroke: "#000000",
      strokeThickness: 3,
      resolution: GAME_TEXT_RESOLUTION,
    });
    hpLabel.setOrigin(0.5, 1);
    hpLabel.setDepth(12);
    hpLabel.setVisible(false);
    this.registerMobWorldCamera(sprite, hpLabel);

    const dummy: DummyState = {
      spawnConfig: spawn,
      id: netMob.id,
      behavior: spawn.behavior,
      modelId: spawn.modelId,
      name: netMob.name,
      mapId: netMob.mapId,
      tileX: netMob.tileX,
      tileY: netMob.tileY,
      hitboxOffsetY: hitbox.hitboxOffsetY,
      hitboxHeightTiles: hitbox.hitboxHeightTiles,
      hitboxWidthTiles: hitbox.hitboxWidthTiles,
      sizeTiles: spawn.sizeTiles,
      hp: netMob.hp,
      maxHp: netMob.hpMax,
      detectionRangeTiles: spawn.detectionRangeTiles,
      leashRangeTiles: spawn.leashRangeTiles,
      attackDamage: spawn.attackDamage,
      attackCooldownMs: spawn.attackCooldownMs,
      respawnMs: spawn.respawnMs,
      expReward: spawn.expReward,
      drops: spawn.drops,
      aiMoveCooldownMs: this.deps.getMobStepDurationMs(spawn.modelId),
      nextAiMoveAt: 0,
      nextAttackAt: 0,
      immobilizedUntilMs: 0,
      isAggroed: false,
      isStatic: false,
      fixedSpawnTile: undefined,
      facing: netMob.facing,
      isMoving: false,
      wasAdjacentToPlayer: false,
      sprite,
      hpLabel,
      alive: netMob.alive,
    };

    this.deps.syncDummyWorldPosition(dummy);
    this.deps.attachMobFaceIfNeeded(dummy);
    this.deps.setMobAnimationState(dummy, "idle");
    this.rebuildHitbox(dummy);
    this.dummies.push(dummy);
    return dummy;
  }
}
