import { describe, expect, it } from "vitest";
import {
  canEnterNewbieDungeon,
  canStayInNewbieDungeon,
  NEWBIE_DUNGEON_MAX_STAY_LEVEL,
} from "../../shared/newbieDungeon";

describe("newbieDungeon level rules", () => {
  it("blocks entry at level 14 and above", () => {
    expect(canEnterNewbieDungeon(13)).toBe(true);
    expect(canEnterNewbieDungeon(14)).toBe(false);
    expect(canEnterNewbieDungeon(20)).toBe(false);
  });

  it("allows staying through level 14 inside the dungeon", () => {
    expect(canStayInNewbieDungeon(13)).toBe(true);
    expect(canStayInNewbieDungeon(NEWBIE_DUNGEON_MAX_STAY_LEVEL)).toBe(true);
    expect(canStayInNewbieDungeon(15)).toBe(false);
  });
});
