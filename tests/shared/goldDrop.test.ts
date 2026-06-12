import { describe, expect, it } from "vitest";
import { splitGoldIntoWorldStacks } from "../../shared/goldDrop";

describe("splitGoldIntoWorldStacks", () => {
  it("divide 100.000 en diez pilas de 10.000", () => {
    expect(splitGoldIntoWorldStacks(100_000)).toEqual(Array(10).fill(10_000));
  });

  it("deja el resto en la última pila", () => {
    expect(splitGoldIntoWorldStacks(25_500)).toEqual([10_000, 10_000, 5_500]);
  });

  it("devuelve vacío para montos no positivos", () => {
    expect(splitGoldIntoWorldStacks(0)).toEqual([]);
  });
});
