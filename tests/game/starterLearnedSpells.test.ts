import { describe, expect, it } from "vitest";
import {
  getStarterLearnedSpellIds,
  STARTER_SPELL_CURAR_VENENO,
  STARTER_SPELL_PROYECTIL_MAGICO,
  STARTER_SPELL_SAETA_IGNEA,
} from "../../game-data/starterLoadout";

describe("getStarterLearnedSpellIds", () => {
  it("guerrero y cazador sin mana no reciben hechizos", () => {
    expect(getStarterLearnedSpellIds("guerrero")).toEqual([]);
    expect(getStarterLearnedSpellIds("cazador")).toEqual([]);
  });

  it("paladin y asesino con mana reciben curar veneno y proyectil magico", () => {
    expect(getStarterLearnedSpellIds("paladin")).toEqual([
      STARTER_SPELL_CURAR_VENENO,
      STARTER_SPELL_PROYECTIL_MAGICO,
    ]);
    expect(getStarterLearnedSpellIds("asesino")).toEqual([
      STARTER_SPELL_CURAR_VENENO,
      STARTER_SPELL_PROYECTIL_MAGICO,
    ]);
  });

  it("clases semi-magicas reciben ademas saeta ignea", () => {
    const expected = [
      STARTER_SPELL_CURAR_VENENO,
      STARTER_SPELL_PROYECTIL_MAGICO,
      STARTER_SPELL_SAETA_IGNEA,
    ];
    for (const classId of ["mago", "druida", "clerigo", "bardo", "nigromante"] as const) {
      expect(getStarterLearnedSpellIds(classId)).toEqual(expected);
    }
  });
});
