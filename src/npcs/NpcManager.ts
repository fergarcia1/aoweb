import Phaser from "phaser";
import { TILE_SIZE } from "../config";
import {
  GAME_FONT,
  GAME_TEXT_RESOLUTION,
  WORLD_NAME_FONT_SIZE,
  WORLD_NAME_STROKE,
} from "../ui/fonts";
import {
  applyPlayerOrigin,
  type Facing,
  tileToFeetWorld,
} from "../player/playerSprites";
import { resolveStaticNpcFaceColumn } from "../player/faceColumn";
import { faceTextureKey, getFaceFrame } from "../player/raceFaces";
import { getRaceFaceLayout } from "../player/raceFaceLayout";
import { inferClasesBajasFromSpritesheetName } from "../game/armorUtils";
import {
  buildHitboxFrameRect,
  containsWorldPointInHitArea,
  getInteractiveHitAreaWorldBounds,
} from "../game/hitboxUtils";
import { getNpcsForMap, getNpcOccupiedTiles } from "./npcDefinitions";
import { getStaticNpcBodyScale } from "./npcBodyScale";
import type { StaticNpcDefinition } from "./types";

const NPC_NAME_COLORS = { fill: "#ffd966", stroke: "#3d3010" };

/** Misma caja que el jugador para facilitar el click. */
const NPC_HITBOX_WIDTH_PX = TILE_SIZE * 1.35;
const NPC_HITBOX_HEIGHT_PX = TILE_SIZE * 2 * 0.8;

type NpcEntry = {
  definition: StaticNpcDefinition;
  body: Phaser.GameObjects.Sprite;
  face: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
};

export class NpcManager {
  private readonly entries = new Map<string, NpcEntry>();
  private currentMapId = "";

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depthFromFeetY: (feetY: number) => number,
    private readonly uiCamera?: Phaser.Cameras.Scene2D.Camera
  ) {}

  syncForMap(mapId: string) {
    const definitions = getNpcsForMap(mapId);
    if (this.currentMapId === mapId && this.matchesDefinitions(definitions)) {
      return;
    }
    this.clear();
    this.currentMapId = mapId;

    for (const definition of definitions) {
      this.spawn(definition);
    }
  }

  /** Recrea NPCs del mapa actual (útil tras editar npcDefinitions sin cambiar de mapa). */
  forceRespawnForCurrentMap() {
    if (!this.currentMapId) {
      return;
    }
    const mapId = this.currentMapId;
    this.clear();
    this.currentMapId = mapId;
    for (const definition of getNpcsForMap(mapId)) {
      this.spawn(definition);
    }
  }

  private matchesDefinitions(definitions: StaticNpcDefinition[]): boolean {
    if (this.entries.size !== definitions.length) {
      return false;
    }
    for (const definition of definitions) {
      const entry = this.entries.get(definition.id);
      if (!entry || !this.definitionVisualEquals(entry.definition, definition)) {
        return false;
      }
    }
    return true;
  }

  private definitionVisualEquals(
    a: StaticNpcDefinition,
    b: StaticNpcDefinition
  ): boolean {
    return (
      a.faceIndex === b.faceIndex &&
      (a.faceCara ?? null) === (b.faceCara ?? null) &&
      a.raceId === b.raceId &&
      a.genderId === b.genderId &&
      a.bodyTextureKey === b.bodyTextureKey &&
      a.facing === b.facing &&
      a.tileX === b.tileX &&
      a.tileY === b.tileY &&
      a.faceDropY === b.faceDropY &&
      a.faceOffsetX === b.faceOffsetX &&
      (a.faceScale ?? 1) === (b.faceScale ?? 1)
    );
  }

  clear() {
    for (const entry of this.entries.values()) {
      entry.body.destroy();
      entry.face.destroy();
      entry.label.destroy();
    }
    this.entries.clear();
    this.currentMapId = "";
  }

  isTileOccupied(mapId: string, tileX: number, tileY: number): boolean {
    return getNpcOccupiedTiles(mapId).some(
      (tile) => tile.x === tileX && tile.y === tileY
    );
  }

  findNpcByGameObject(
    gameObject: Phaser.GameObjects.GameObject
  ): StaticNpcDefinition | undefined {
    for (const entry of this.entries.values()) {
      if (entry.body === gameObject || entry.face === gameObject) {
        return entry.definition;
      }
    }
    return undefined;
  }

  forEachInteractiveHitArea(callback: (rect: Phaser.Geom.Rectangle) => void) {
    for (const entry of this.entries.values()) {
      const rect = getInteractiveHitAreaWorldBounds(entry.body);
      if (rect) {
        callback(rect);
      }
    }
  }

  forEachInteractiveBody(callback: (body: Phaser.GameObjects.Sprite) => void) {
    for (const entry of this.entries.values()) {
      callback(entry.body);
    }
  }

  findNpcAtWorldPoint(worldX: number, worldY: number): StaticNpcDefinition | undefined {
    for (const entry of this.entries.values()) {
      if (containsWorldPointInHitArea(entry.body, worldX, worldY)) {
        return entry.definition;
      }
    }
    return undefined;
  }

  private spawn(definition: StaticNpcDefinition) {
    const feet = tileToFeetWorld(definition.tileX, definition.tileY, TILE_SIZE);
    const depth = this.depthFromFeetY(feet.y);
    const bodyScale = getStaticNpcBodyScale(
      definition.bodyTextureKey,
      definition.raceId
    );

    const body = this.scene.add.sprite(
      feet.x,
      feet.y,
      definition.bodyTextureKey,
      0
    );
    applyPlayerOrigin(body);
    body.setScale(bodyScale);
    body.setDepth(depth);
    this.playIdle(body, definition);
    this.enableNpcInteraction(body, bodyScale);

    const faceLayout = getRaceFaceLayout(definition.raceId, definition.genderId);
    const faceColumn = resolveStaticNpcFaceColumn(
      definition.faceIndex,
      definition.faceCara
    );
    const face = this.scene.add.sprite(
      feet.x,
      feet.y,
      faceTextureKey(definition.raceId, definition.genderId),
      getFaceFrame(
        definition.raceId,
        definition.genderId,
        faceColumn,
        definition.facing
      )
    );
    face.setOrigin(0.5, 1);
    face.setScale(faceLayout.scale * (definition.faceScale ?? 1));
    face.setDepth(depth + 0.02);
    this.syncFacePosition(body, face, definition, bodyScale);
    this.enableNpcInteraction(face, bodyScale);

    const label = this.scene.add
      .text(feet.x, feet.y + 2, definition.displayName, {
        fontFamily: GAME_FONT,
        fontSize: `${WORLD_NAME_FONT_SIZE}px`,
        color: NPC_NAME_COLORS.fill,
        fontStyle: "bold",
        stroke: NPC_NAME_COLORS.stroke,
        strokeThickness: WORLD_NAME_STROKE,
        resolution: GAME_TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0)
      .setDepth(depth + 2);

    if (this.uiCamera) {
      this.uiCamera.ignore([body, face, label]);
    }

    // Asegurar que estén en el worldLayer si el controlador lo soporta
    if ((this.scene as any).mapController?.addToWorld) {
      (this.scene as any).mapController.addToWorld([body, face, label]);
    }

    this.entries.set(definition.id, { definition, body, face, label });
  }

  private enableNpcInteraction(sprite: Phaser.GameObjects.Sprite, bodyScale: number) {
    const hitArea = buildHitboxFrameRect(sprite, {
      width: NPC_HITBOX_WIDTH_PX * bodyScale,
      height: NPC_HITBOX_HEIGHT_PX * bodyScale,
      offsetX: 0,
      offsetY: 0,
    });
    sprite.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    sprite.input!.cursor = "pointer";
  }

  private playIdle(body: Phaser.GameObjects.Sprite, definition: StaticNpcDefinition) {
    const bodyFacing = this.bodyFacing(definition.facing);
    body.setFlipX(definition.facing === "right");
    const animKey = `idle_${bodyFacing}_${definition.bodyTextureKey}`;
    if (this.scene.anims.exists(animKey)) {
      body.play(animKey);
    }
  }

  private syncFacePosition(
    body: Phaser.GameObjects.Sprite,
    face: Phaser.GameObjects.Sprite,
    definition: StaticNpcDefinition,
    bodyScale: number
  ) {
    const offset = getRaceFaceLayout(definition.raceId, definition.genderId).offset[
      definition.facing
    ];
    const faceDropY = this.getNpcFaceDropY(definition);
    const faceOffsetX = definition.faceOffsetX ?? 0;
    face.setPosition(
      body.x + offset.x + faceOffsetX,
      body.y - offset.y + faceDropY
    );
    if (definition.facing === "left" || definition.facing === "right") {
      face.setFlipX(definition.facing === "right");
    } else {
      face.setFlipX(false);
    }
  }

  private bodyFacing(facing: Facing): Facing {
    return facing === "right" ? "left" : facing;
  }

  /** Armaduras *Bajos_std tienen el cuello más bajo; acercar la cara al cuerpo. */
  private getNpcFaceDropY(definition: StaticNpcDefinition): number {
    if (definition.faceDropY !== undefined) {
      return definition.faceDropY;
    }
    if (!inferClasesBajasFromSpritesheetName(definition.bodyTextureKey)) {
      return 0;
    }
    if (definition.facing === "down" || definition.facing === "up") {
      return 10;
    }
    return 7;
  }
}
