import { describe, expect, it } from "vitest";
import {
  getMaxVitalsAtLevel,
  getVitalGainForLevelUp,
  getVitalGrowthEntry,
} from "../../game-data/vitalProgression";

describe("vitalProgression", () => {
  it("nivel 1 coincide con hp_l1/mp_l1 del benchmark", () => {
    const entry = getVitalGrowthEntry("human", "paladin");
    expect(entry).toBeDefined();
    const l1 = getMaxVitalsAtLevel("human", "paladin", 1);
    expect(l1.hpMax).toBe(entry!.hpL1);
    expect(l1.mpMax).toBe(entry!.mpL1);
  });

  it("nivel 50 coincide con hp_50/mp_50 del benchmark (anclas)", () => {
    const cases: Array<{
      race: string;
      classId: Parameters<typeof getMaxVitalsAtLevel>[1];
      hp: number;
      mp: number;
    }> = [
      { race: "human", classId: "paladin", hp: 452, mp: 1020 },
      { race: "human", classId: "clerigo", hp: 410, mp: 1800 },
      { race: "gnome", classId: "mago", hp: 326, mp: 2660 },
      { race: "elf", classId: "druida", hp: 365, mp: 2150 },
      { race: "drow", classId: "nigromante", hp: 366, mp: 2320 },
      { race: "dwarf", classId: "guerrero", hp: 502, mp: 0 },
      { race: "human", classId: "cazador", hp: 454, mp: 0 },
    ];
    for (const c of cases) {
      const v = getMaxVitalsAtLevel(c.race, c.classId, 50);
      expect(v.hpMax, `${c.race} ${c.classId} HP`).toBe(c.hp);
      expect(v.mpMax, `${c.race} ${c.classId} MP`).toBe(c.mp);
    }
  });

  it("ganancias por nivel suman exactamente al delta 1→50", () => {
    const entry = getVitalGrowthEntry("human", "mago")!;
    const hpSum = entry.hpPerLevel.reduce((a, b) => a + b, 0);
    const mpSum = entry.mpPerLevel.reduce((a, b) => a + b, 0);
    expect(entry.hpL1 + hpSum).toBe(entry.hp50);
    expect(entry.mpL1 + mpSum).toBe(entry.mp50);
  });

  it("ganancias varían (no todas iguales) cuando hay suficiente total", () => {
    const entry = getVitalGrowthEntry("gnome", "mago")!;
    const uniqueHp = new Set(entry.hpPerLevel);
    const uniqueMp = new Set(entry.mpPerLevel);
    expect(uniqueHp.size).toBeGreaterThan(1);
    expect(uniqueMp.size).toBeGreaterThan(1);
  });

  it("getVitalGainForLevelUp devuelve entrada de la tabla", () => {
    const gain = getVitalGainForLevelUp("elf", "druida", 10);
    const entry = getVitalGrowthEntry("elf", "druida")!;
    expect(gain.hpGain).toBe(entry.hpPerLevel[9]);
    expect(gain.mpGain).toBe(entry.mpPerLevel[9]);
  });
});
