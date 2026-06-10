import { describe, expect, it } from "vitest";
import { findTransition, EDGE_TRANSITION_TRIGGER_DISTANCE } from "../../src/maps/index";
import { isMapEdgeTransitionZoneTile } from "../../shared/mapEdgeZones";

describe("map edge transitions", () => {
  it("uses margin 9 so tile 10/89 are walkable before changing map", () => {
    expect(EDGE_TRANSITION_TRIGGER_DISTANCE).toBe(9);
    expect(findTransition("mapa1", 50, 10, "up")).toBeUndefined();
    expect(findTransition("mapa1", 50, 9, "up")?.toMapId).toBe("mapa5");
    expect(findTransition("mapa1", 50, 89, "down")).toBeUndefined();
    expect(findTransition("mapa1", 50, 90, "down")?.toMapId).toBe("mapa2");
  });

  it("marks edge transition tiles as invalid for world item drops", () => {
    expect(isMapEdgeTransitionZoneTile("mapa1", 50, 10)).toBe(false);
    expect(isMapEdgeTransitionZoneTile("mapa1", 50, 9)).toBe(true);
    expect(isMapEdgeTransitionZoneTile("mapa1", 50, 89)).toBe(false);
    expect(isMapEdgeTransitionZoneTile("mapa1", 50, 90)).toBe(true);
  });
});
