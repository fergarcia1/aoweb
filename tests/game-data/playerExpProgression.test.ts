import { describe, expect, it } from "vitest";
import { applyExpGain } from "../../game-data/playerExpProgression";
import { expRequiredForLevel } from "../../game-data/progressFormulas";

describe("applyExpGain", () => {
  it("acumula exp sin subir de nivel", () => {
    const result = applyExpGain(1, 5, expRequiredForLevel(1), 10);
    expect(result).toEqual({
      exp: 15,
      expToNext: expRequiredForLevel(1),
      level: 1,
      levelsGained: 0,
    });
  });

  it("puede subir varios niveles con mucha exp", () => {
    const result = applyExpGain(1, 0, expRequiredForLevel(1), 100);
    expect(result.level).toBe(3);
    expect(result.levelsGained).toBe(2);
    expect(result.exp).toBe(20);
    expect(result.expToNext).toBe(expRequiredForLevel(3));
  });

  it("sube de nivel cuando alcanza expToNext", () => {
    const need = expRequiredForLevel(1);
    const result = applyExpGain(1, need - 5, need, 10);
    expect(result.level).toBe(2);
    expect(result.levelsGained).toBe(1);
    expect(result.exp).toBe(5);
    expect(result.expToNext).toBe(expRequiredForLevel(2));
  });
});
