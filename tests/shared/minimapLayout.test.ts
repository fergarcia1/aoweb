import { describe, expect, it } from "vitest";
import { computeMinimapCellSize, minimapTileCenterPx } from "../../shared/minimapLayout";

const MINIMAP_SIZE = 160;

function markerInside(
  renderW: number,
  renderH: number,
  tileX: number,
  tileY: number
): boolean {
  const cell = computeMinimapCellSize(MINIMAP_SIZE, MINIMAP_SIZE, renderW, renderH);
  const mapPixelW = renderW * cell;
  const mapPixelH = renderH * cell;
  const originX = Math.floor((MINIMAP_SIZE - mapPixelW) / 2);
  const originY = Math.floor((MINIMAP_SIZE - mapPixelH) / 2);
  const px = minimapTileCenterPx(tileX, 0, cell, originX);
  const py = minimapTileCenterPx(tileY, 0, cell, originY);
  const markerR = Math.max(2, Math.floor(cell * 0.35));
  return (
    px - markerR >= 0 &&
    py - markerR >= 0 &&
    px + markerR < MINIMAP_SIZE &&
    py + markerR < MINIMAP_SIZE
  );
}

describe("computeMinimapCellSize", () => {
  it("mapa 100×100 cabe en 160px sin desbordar", () => {
    expect(computeMinimapCellSize(160, 160, 100, 100)).toBe(1);
    expect(markerInside(100, 100, 82, 82)).toBe(true);
    expect(markerInside(100, 100, 0, 0)).toBe(true);
    expect(markerInside(100, 100, 99, 99)).toBe(true);
  });

  it("mapa ~83 tiles: borde sur/este (82) sigue visible", () => {
    const w = 83;
    const h = 83;
    expect(computeMinimapCellSize(160, 160, w, h)).toBe(1);
    expect(markerInside(w, h, 82, 46)).toBe(true);
    expect(markerInside(w, h, 46, 82)).toBe(true);
    expect(markerInside(w, h, 82, 82)).toBe(true);
  });

  it("no fuerza cell=2 cuando el mapa no cabe", () => {
    const oldCell = Math.max(2, Math.floor(160 / 100));
    expect(oldCell).toBe(2);
    expect(100 * oldCell).toBeGreaterThan(160);
    expect(computeMinimapCellSize(160, 160, 100, 100)).toBe(1);
    expect(100 * computeMinimapCellSize(160, 160, 100, 100)).toBeLessThanOrEqual(160);
  });
});
