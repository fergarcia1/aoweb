/** True si el objeto sigue en una escena activa (no destruido por shutdown/restart). */
export function isPhaserObjectLive(
  obj?: Phaser.GameObjects.GameObject | null
): boolean {
  const scene = obj?.scene;
  return Boolean(obj?.active && scene?.sys?.isActive());
}
