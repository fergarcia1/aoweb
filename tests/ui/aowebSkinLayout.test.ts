import { describe, expect, it, vi } from "vitest";
import {
  AOWEB_SKIN_LAYOUT_DARK,
  AOWEB_SKIN_LAYOUT_LIGHT,
  getAowebSkinLayout,
  getSkinDerivedLayout,
  getSkinGameViewport,
  scaleSkinRect,
} from "../../src/ui/aowebSkinLayout";

describe("aowebSkinLayout", () => {
  it("usa layout oscuro por defecto", () => {
    vi.stubEnv("VITE_UI_SKIN", "");
    expect(getAowebSkinLayout().native).toEqual(AOWEB_SKIN_LAYOUT_DARK.native);
  });

  it("usa layout claro con VITE_UI_SKIN=light", () => {
    vi.stubEnv("VITE_UI_SKIN", "light");
    expect(getAowebSkinLayout().native).toEqual(AOWEB_SKIN_LAYOUT_LIGHT.native);
  });

  it("viewport oscuro ocupa más ancho que el claro a 1920×1080", () => {
    vi.stubEnv("VITE_UI_SKIN", "dark");
    const dark = getSkinGameViewport(1920, 1080);
    vi.stubEnv("VITE_UI_SKIN", "light");
    const light = getSkinGameViewport(1920, 1080);
    expect(dark.width).toBeGreaterThan(light.width);
    expect(dark.y).toBeGreaterThan(light.y);
  });

  it("sidebar oscuro más estrecho que el claro", () => {
    vi.stubEnv("VITE_UI_SKIN", "dark");
    const darkSide = getSkinDerivedLayout(1920, 1080).sidebarWidth;
    vi.stubEnv("VITE_UI_SKIN", "light");
    const lightSide = getSkinDerivedLayout(1920, 1080).sidebarWidth;
    expect(darkSide).toBeLessThan(lightSide);
  });

  it("viewport oscuro no tapa la barra de macros", () => {
    const { viewport, macroBar } = AOWEB_SKIN_LAYOUT_DARK.regions;
    expect(viewport.y + viewport.h).toBeLessThanOrEqual(macroBar.y);
  });

  it("regiones oscuras dejan inventario en el panel derecho", () => {
    expect(AOWEB_SKIN_LAYOUT_DARK.regions.inventoryPanel.x).toBeGreaterThan(1100);
  });

  it("scaleSkinRect escala contra native activo", () => {
    vi.stubEnv("VITE_UI_SKIN", "dark");
    const rect = scaleSkinRect(AOWEB_SKIN_LAYOUT_DARK.regions.viewport, 1449, 1085);
    expect(rect).toEqual({ x: 9, y: 235, w: 1033, h: 728 });
  });
});
