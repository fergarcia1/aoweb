import type { CharacterClassId } from "./items";

export const CHARACTER_SLOT_COUNT = 6;
const STORAGE_KEY = "aoweb_character_slots";
const ACTIVE_SLOT_KEY = "aoweb_active_character_slot";

export type CharacterRaceId = "human" | "drow";

export type SavedCharacter = {
  id: string;
  name: string;
  classId: CharacterClassId;
  raceId: CharacterRaceId;
  /** Columna 0-based en human_faces.png (cara 1 → 0). */
  faceIndex: number;
  level: number;
};

export type CharacterSlot = SavedCharacter | null;

export const CLASS_LABELS: Record<CharacterClassId, string> = {
  paladin: "Paladín",
  mago: "Mago",
  druida: "Druida",
  guerrero: "Guerrero",
  cazador: "Cazador",
  asesino: "Asesino",
};

export const RACE_LABELS: Record<CharacterRaceId, string> = {
  human: "Humano",
  drow: "Elfo Oscuro",
};

function createDefaultSlots(): CharacterSlot[] {
  return [
    {
      id: "demo-lonler",
      name: "Lonler",
      classId: "paladin",
      raceId: "human",
      faceIndex: 0,
      level: 1,
    },
    null,
    null,
    null,
    null,
    null,
  ];
}

function normalizeSlots(raw: unknown): CharacterSlot[] {
  const slots: CharacterSlot[] = Array.from({ length: CHARACTER_SLOT_COUNT }, () => null);
  if (!Array.isArray(raw)) {
    return slots;
  }

  for (let index = 0; index < CHARACTER_SLOT_COUNT; index += 1) {
    const entry = raw[index];
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as Partial<SavedCharacter>;
    if (
      typeof record.id !== "string" ||
      typeof record.name !== "string" ||
      typeof record.classId !== "string" ||
      typeof record.raceId !== "string" ||
      typeof record.level !== "number"
    ) {
      continue;
    }
    const faceIndex =
      typeof record.faceIndex === "number" ? Math.max(0, Math.floor(record.faceIndex)) : 0;
    slots[index] = {
      id: record.id,
      name: record.name,
      classId: record.classId as CharacterClassId,
      raceId: record.raceId as CharacterRaceId,
      faceIndex,
      level: Math.max(1, Math.floor(record.level)),
    };
  }

  return slots;
}

export function loadCharacterSlots(): CharacterSlot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaults = createDefaultSlots();
      saveCharacterSlots(defaults);
      return defaults;
    }
    return normalizeSlots(JSON.parse(raw));
  } catch {
    const defaults = createDefaultSlots();
    saveCharacterSlots(defaults);
    return defaults;
  }
}

export function saveCharacterSlots(slots: CharacterSlot[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slots.slice(0, CHARACTER_SLOT_COUNT)));
}

export function getActiveCharacterSlotIndex(): number | null {
  const raw = localStorage.getItem(ACTIVE_SLOT_KEY);
  if (raw === null) return null;
  const index = Number.parseInt(raw, 10);
  if (!Number.isInteger(index) || index < 0 || index >= CHARACTER_SLOT_COUNT) {
    return null;
  }
  return index;
}

export function setActiveCharacterSlotIndex(index: number): void {
  localStorage.setItem(ACTIVE_SLOT_KEY, String(index));
}

export function getActiveCharacter(): SavedCharacter | null {
  const index = getActiveCharacterSlotIndex();
  if (index === null) return null;
  const slots = loadCharacterSlots();
  return slots[index] ?? null;
}
