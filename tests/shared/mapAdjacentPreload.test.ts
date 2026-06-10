import { describe, expect, it } from "vitest";
import {
  getAdjacentMapIds,
  getScopedPreloadMapIds,
} from "../../shared/maps";

describe("map adjacent preload", () => {
  it("mapa1 incluye vecinos cardinales, diagonales, grilla y portal", () => {
    const adjacent = getAdjacentMapIds("mapa1");

    expect(adjacent).toContain("mapa2");
    expect(adjacent).toContain("mapa5");
    expect(adjacent).toContain("mapa37");
    expect(adjacent).toContain("mapa8");
    expect(adjacent).toContain("mapa11");
    expect(adjacent).toContain("mapa13");
  });

  it("getScopedPreloadMapIds incluye el mapa actual y sus adyacentes", () => {
    const scoped = getScopedPreloadMapIds("mapa1");

    expect(scoped).toContain("mapa1");
    expect(scoped).toContain("mapa2");
    expect(scoped).toContain("mapa5");
    expect(scoped).toContain("mapa37");
    expect(scoped.length).toBeGreaterThan(1);
  });
});
