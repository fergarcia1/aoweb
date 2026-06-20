import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadCharacterSlots,
  getActiveCharacterSlotIndex,
  saveCharacterSlots,
  type CharacterSlot,
} from "../../src/data/characters";

function mockLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  });
  return store;
}

function makeSlots(): CharacterSlot[] {
  return [
    {
      id: "char-test",
      name: "Testeo",
      classId: "mago",
      raceId: "human",
      genderId: "male",
      factionId: "ciudadano",
      faceIndex: 0,
      level: 1,
      homeMapId: "mapa1",
    },
    null,
    null,
    null,
    null,
    null,
  ];
}

describe("character account storage", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = mockLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("usa username estable en vez del id efimero de auth", () => {
    store.set("aoweb_auth_account", JSON.stringify({ id: "uuid-1", username: "Test" }));

    saveCharacterSlots(makeSlots());

    expect(store.has("aoweb_character_slots_v3_account_test")).toBe(true);
    expect(store.has("aoweb_character_slots_v3_account_uuid-1")).toBe(false);
  });

  it("migra slots y slot activo desde la key legacy del id actual", () => {
    store.set("aoweb_auth_account", JSON.stringify({ id: "uuid-1", username: "Test" }));
    store.set("aoweb_character_slots_v3_account_uuid-1", JSON.stringify(makeSlots()));
    store.set("aoweb_active_character_slot_account_uuid-1", "0");

    const slots = loadCharacterSlots();
    const activeSlot = getActiveCharacterSlotIndex();

    expect(slots[0]?.name).toBe("Testeo");
    expect(activeSlot).toBe(0);
    expect(store.get("aoweb_character_slots_v3_account_test")).toBe(
      store.get("aoweb_character_slots_v3_account_uuid-1")
    );
    expect(store.get("aoweb_active_character_slot_account_test")).toBe("0");
  });
});
