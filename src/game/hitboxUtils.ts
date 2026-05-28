import Phaser from "phaser";

/**
 * Sprites con origen (0.5, 1): Phaser traduce el pointer a espacio local del sprite y
 * luego suma displayOriginX/Y; el hitArea Rectangle va en coords de esquina del frame.
 */
export type BodyHitboxConfig = {
  width: number;
  height: number;
  offsetX: number;
  /** Desplaza el borde inferior de la caja hacia abajo (px desde la base del frame). */
  offsetY: number;
};

export function buildHitboxFrameRect(
  sprite: Phaser.GameObjects.Sprite,
  config: BodyHitboxConfig
): Phaser.Geom.Rectangle {
  const frameW = sprite.frame.width;
  const frameH = sprite.frame.height;
  const offsetX = sprite.flipX ? -config.offsetX : config.offsetX;
  return new Phaser.Geom.Rectangle(
    frameW / 2 - config.width / 2 + offsetX,
    frameH - config.height + config.offsetY,
    config.width,
    config.height
  );
}

/** Mismo espacio que usa Phaser en pointWithinHitArea (esquina superior del frame). */
export function worldPointToHitAreaCoords(
  sprite: Phaser.GameObjects.Sprite,
  worldX: number,
  worldY: number,
  output = new Phaser.Math.Vector2()
): Phaser.Math.Vector2 {
  Phaser.Math.TransformXY(
    worldX,
    worldY,
    sprite.x,
    sprite.y,
    sprite.rotation,
    sprite.scaleX,
    sprite.scaleY,
    output
  );
  output.x += sprite.displayOriginX;
  output.y += sprite.displayOriginY;
  return output;
}

export function containsWorldPointInHitArea(
  sprite: Phaser.GameObjects.Sprite,
  worldX: number,
  worldY: number
): boolean {
  const area = sprite.input?.hitArea;
  if (!area || !(area instanceof Phaser.Geom.Rectangle)) {
    return false;
  }
  const local = worldPointToHitAreaCoords(sprite, worldX, worldY);
  return Phaser.Geom.Rectangle.Contains(area, local.x, local.y);
}

/** Rectángulo en mundo del hitArea que Phaser usa para click (alineado a enableDebug). */
export function getInteractiveHitAreaWorldBounds(
  sprite: Phaser.GameObjects.Sprite
): Phaser.Geom.Rectangle | null {
  const area = sprite.input?.hitArea;
  if (!area || !(area instanceof Phaser.Geom.Rectangle)) {
    return null;
  }

  const ox = sprite.displayOriginX;
  const oy = sprite.displayOriginY;
  const corners = [
    { x: area.x - ox, y: area.y - oy },
    { x: area.right - ox, y: area.y - oy },
    { x: area.x - ox, y: area.bottom - oy },
    { x: area.right - ox, y: area.bottom - oy },
  ];

  const world = new Phaser.Math.Vector2();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const corner of corners) {
    localPointToWorld(sprite, corner.x, corner.y, world);
    minX = Math.min(minX, world.x);
    maxX = Math.max(maxX, world.x);
    minY = Math.min(minY, world.y);
    maxY = Math.max(maxY, world.y);
  }

  if (!Number.isFinite(minX)) {
    return null;
  }

  return new Phaser.Geom.Rectangle(minX, minY, maxX - minX, maxY - minY);
}

function localPointToWorld(
  sprite: Phaser.GameObjects.Sprite,
  localX: number,
  localY: number,
  output: Phaser.Math.Vector2
): Phaser.Math.Vector2 {
  const rotation = sprite.rotation;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const a = cos * sprite.scaleX;
  const b = sin * sprite.scaleX;
  const c = -sin * sprite.scaleY;
  const d = cos * sprite.scaleY;
  output.x = sprite.x + a * localX + c * localY;
  output.y = sprite.y + b * localX + d * localY;
  return output;
}

export function tileToWorldRect(tileX: number, tileY: number, tileSize: number): Phaser.Geom.Rectangle {
  return new Phaser.Geom.Rectangle(tileX * tileSize, tileY * tileSize, tileSize, tileSize);
}
