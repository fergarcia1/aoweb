import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AOWEB_SKIN_LAYOUT_DARK,
  AOWEB_SKIN_LAYOUT_LIGHT,
  AOWEB_SKIN_LAYOUT_RED,
  AOWEB_SKIN_LAYOUT_WHITE,
  AOWEB_SKIN_LAYOUTS,
  getAowebSkinLayout,
  getAowebSkinLayoutForVariant,
  getAowebSkinMacroSlotMetrics,
  getSkinDerivedLayout,
  getSkinGameViewport,
  getViewportTransparentContentRect,
  scaleSkinRect,
  usesViewportFrameOverlay,
} from "../../src/ui/aowebSkinLayout";
import { setAowebSkinVariant } from "../../src/ui/aowebSkinVariant";

describe("aowebSkinLayout", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("usa layout oscuro por defecto", () => {
    vi.stubEnv("VITE_UI_SKIN", "");
    expect(getAowebSkinLayout().native).toEqual(AOWEB_SKIN_LAYOUT_DARK.native);
  });

  it("usa layout claro solo con variante light", () => {
    vi.stubEnv("VITE_UI_SKIN", "light");
    expect(getAowebSkinLayout().native).toEqual(AOWEB_SKIN_LAYOUT_LIGHT.native);
    setAowebSkinVariant("white");
    expect(getAowebSkinLayout()).toBe(AOWEB_SKIN_LAYOUT_WHITE);
    setAowebSkinVariant("red");
    expect(getAowebSkinLayout()).toBe(AOWEB_SKIN_LAYOUT_RED);
  });

  it("expone layout dedicado por variante", () => {
    expect(AOWEB_SKIN_LAYOUTS.red).toBe(AOWEB_SKIN_LAYOUT_RED);
    expect(AOWEB_SKIN_LAYOUTS.white).toBe(AOWEB_SKIN_LAYOUT_WHITE);
    expect(getAowebSkinLayoutForVariant("red")).toBe(AOWEB_SKIN_LAYOUT_RED);
  });

  it("viewport oscuro ocupa más ancho que el claro a 1920×1080", () => {
    const darkVp = scaleSkinRect(AOWEB_SKIN_LAYOUT_DARK.regions.viewport, 1920, 1080);
    const lightVp = scaleSkinRect(AOWEB_SKIN_LAYOUT_LIGHT.regions.viewport, 1920, 1080);
    expect(darkVp.w).toBeGreaterThan(lightVp.w);
    expect(darkVp.y).toBeGreaterThan(lightVp.y);
    vi.stubEnv("VITE_UI_SKIN", "dark");
    const darkVpNative = scaleSkinRect(AOWEB_SKIN_LAYOUT_DARK.regions.viewport, 1449, 1085);
    const darkCamNative = getSkinGameViewport(1449, 1085);
    expect(darkCamNative).toEqual({
      x: darkVpNative.x,
      y: darkVpNative.y,
      width: darkVpNative.w,
      height: darkVpNative.h,
    });
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

  it("macro slots oscuros usan centros medidos del PNG (no equiespaciados)", () => {
    vi.stubEnv("VITE_UI_SKIN", "dark");
    const slots = getAowebSkinMacroSlotMetrics(1449, 1085, 10);
    expect(slots).toHaveLength(10);
    for (let i = 1; i < slots.length; i += 1) {
      expect(slots[i].cx).toBeGreaterThan(slots[i - 1].cx);
    }
    expect(slots[0].cx).toBe(71);
    expect(slots[9].cx).toBe(815);
  });

  it("skin oscura usa overlay: cámara = viewport completo, PNG perforado entero", () => {
    vi.stubEnv("VITE_UI_SKIN", "dark");
    expect(usesViewportFrameOverlay()).toBe(true);
    expect(getViewportTransparentContentRect()).toEqual(
      AOWEB_SKIN_LAYOUT_DARK.regions.viewport
    );
    const cam = getSkinGameViewport(1449, 1085);
    expect(cam).toEqual({ x: 9, y: 235, width: 1033, height: 728 });
  });

  it("skin clara sigue recortando viewport con máscara (sin overlay)", () => {
    vi.stubEnv("VITE_UI_SKIN", "light");
    expect(usesViewportFrameOverlay()).toBe(false);
    expect(getViewportTransparentContentRect()).toBeNull();
  });

  it("scaleSkinRect escala contra native activo", () => {
    vi.stubEnv("VITE_UI_SKIN", "dark");
    const rect = scaleSkinRect(AOWEB_SKIN_LAYOUT_DARK.regions.viewport, 1449, 1085);
    expect(rect).toEqual({ x: 9, y: 235, w: 1033, h: 728 });
  });
});
