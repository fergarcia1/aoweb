import { describe, expect, it } from "vitest";
import { orderSpellIds } from "../../shared/spellListOrder";

describe("orderSpellIds", () => {
  it("respeta el orden guardado y agrega hechizos nuevos al final", () => {
    expect(orderSpellIds([1, 2, 3, 4], [3, 1, 99])).toEqual([3, 1, 2, 4]);
  });

  it("devuelve el orden natural si no hay guardado", () => {
    expect(orderSpellIds([5, 2, 8], [])).toEqual([5, 2, 8]);
  });
});
