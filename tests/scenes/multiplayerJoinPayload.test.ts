import { describe, expect, it } from "vitest";
import {
  buildJoinInventorySlots,
  buildMultiplayerJoinPayload,
} from "../../src/scenes/gameSceneModules/multiplayerJoinPayload";

describe("multiplayerJoinPayload", () => {
  it("includes gold in join payload", () => {
    const payload = buildMultiplayerJoinPayload({
      name: "Lonler",
      characterId: "id-lonler",
      mapId: "pueblo",
      raceId: "human",
      genderId: "male",
      classId: "warrior",
      factionId: "neutral",
      faceIndex: 0,
      tileX: 10,
      tileY: 12,
      facing: "down",
      level: 5,
      hp: 0,
      hpMax: 100,
      mp: 20,
      mpMax: 50,
      gold: 1337,
      equipment: {
        weaponId: null,
        shieldId: null,
        helmetId: null,
        armorId: null,
        equippedOutfit: "base",
      },
      inventory: [],
    });

    expect(payload.gold).toBe(1337);
    expect(payload.characterId).toBe("id-lonler");
    expect(payload.hp).toBe(0);
  });

  it("maps inventory slots for join", () => {
    const slots = buildJoinInventorySlots([
      { itemId: "potion_roja" as const, count: 3 },
      null,
    ]);
    expect(slots).toHaveLength(2);
    expect(slots[0]).toMatchObject({ slotIndex: 0, itemId: "potion_roja", amount: 3 });
    expect(slots[1].itemId).toBeNull();
  });
});
