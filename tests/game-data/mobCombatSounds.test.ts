import { describe, expect, it } from "vitest";
import { usesHeavyMobFootsteps } from "../../game-data/mobCombatSounds";

describe("mobCombatSounds", () => {
  it("usa pasos pesados para todos los golems", () => {
    expect(usesHeavyMobFootsteps("golem_plata")).toBe(true);
    expect(usesHeavyMobFootsteps("golem_bronce")).toBe(true);
    expect(usesHeavyMobFootsteps("golem_hielo")).toBe(true);
    expect(usesHeavyMobFootsteps("golem_infernal")).toBe(true);
    expect(usesHeavyMobFootsteps("golem_piedra")).toBe(true);
    expect(usesHeavyMobFootsteps("yeti")).toBe(true);
  });
});
