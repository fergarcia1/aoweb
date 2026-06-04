import { describe, expect, it } from "vitest";
import {
  PLAYER_HITBOX_HEIGHT_PX,
  PLAYER_HITBOX_OFFSET_Y,
} from "../../src/scenes/gameSceneModules/constants";

/** Misma fórmula que buildHitboxFrameRect (sin depender de Phaser en tests). */
function hitboxTop(frameH: number, height: number, offsetY: number): number {
  return frameH - height + offsetY;
}

describe("player body hitbox", () => {
  it("aligns bottom to frame feet and spans full body height", () => {
    const frameH = 48;
    const top = hitboxTop(frameH, PLAYER_HITBOX_HEIGHT_PX, PLAYER_HITBOX_OFFSET_Y);
    const bottom = top + PLAYER_HITBOX_HEIGHT_PX;

    expect(PLAYER_HITBOX_OFFSET_Y).toBe(0);
    expect(bottom).toBe(frameH);
    expect(top).toBe(0);
  });
});
