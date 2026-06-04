import { describe, expect, it } from "vitest";
import { findFirstChaseStep } from "../../shared/gridPathfinding";

describe("findFirstChaseStep", () => {
  const walkable = new Set<string>();
  for (let y = 0; y < 5; y += 1) {
    for (let x = 0; x < 5; x += 1) {
      walkable.add(`${x},${y}`);
    }
  }

  const canEnter = (tileX: number, tileY: number) => walkable.has(`${tileX},${tileY}`);

  it("returns null when already adjacent", () => {
    expect(
      findFirstChaseStep({ tileX: 1, tileY: 1 }, { tileX: 2, tileY: 1 }, { canEnter })
    ).toBeNull();
  });

  it("steps directly toward an open target", () => {
    expect(
      findFirstChaseStep({ tileX: 0, tileY: 2 }, { tileX: 4, tileY: 2 }, { canEnter })
    ).toEqual({ tileX: 1, tileY: 2 });
  });

  it("routes around a wall", () => {
    walkable.delete("2,2");
    walkable.delete("2,1");
    walkable.delete("2,0");

    const step = findFirstChaseStep(
      { tileX: 1, tileY: 2 },
      { tileX: 3, tileY: 2 },
      { canEnter }
    );

    expect(step).toBeTruthy();
    expect([{ tileX: 1, tileY: 1 }, { tileX: 1, tileY: 3 }]).toContainEqual(step);
  });
});
