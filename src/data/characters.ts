import type { CharacterClassId } from "./items";
import type {
  CharacterGenderId,
  CharacterRaceId,
} from "../../shared/characterTypes";
import { GHOST_RACE_ID } from "../../shared/characterTypes";
import {
  FACTION_LABELS,
  normalizeFactionId,
  type CharacterFactionId,
} from "../../shared/faction";

export type { CharacterFactionId } from "../../shared/faction";
export type { CharacterGenderId, CharacterRaceId } from "../../shared/characterTypes";
export { GHOST_RACE_ID } from "../../shared/characterTypes";
export { FACTION_LABELS, normalizeFactionId, canFactionsFight } from "../../shared/faction";

export const CHARACTER_SLOT_COUNT = 6;
const STORAGE_KEY = "aoweb_character_slots_v3";
const ACTIVE_SLOT_KEY = "aoweb_active_character_slot";
const AUTH_ACCOUNT_KEY = "aoweb_auth_account";

export type SavedCharacter = {
  id: string;
  name: string;
  classId: CharacterClassId;
  raceId: CharacterRaceId;
  genderId: CharacterGenderId;
  factionId: CharacterFactionId;
  /** Columna 0-based en {race}_{gender}_faces.png (cara 1 → 0). */
  faceIndex: number;
  level: number;
  /** Ciudad marcada con /marcarhogar; el sacerdote de revive está aquí. */
  homeMapId?: string;
};

export type CharacterSlot = SavedCharacter | null;

function getCurrentAccountStorageSuffix(): string {
  const raw = localStorage.getItem(AUTH_ACCOUNT_KEY);
  if (!raw) {
    return "guest";
  }
  try {
    const account = JSON.parse(raw) as { id?: unknown };
    return typeof account.id === "string" && account.id.trim()
      ? `account_${account.id.trim()}`
      : "guest";
  } catch {
    return "guest";
  }
}

function getCharacterSlotsStorageKey(): string {
  return `${STORAGE_KEY}_${getCurrentAccountStorageSuffix()}`;
}

function getActiveSlotStorageKey(): string {
  return `${ACTIVE_SLOT_KEY}_${getCurrentAccountStorageSuffix()}`;
}

function isGuestCharacterStorage(): boolean {
  return getCurrentAccountStorageSuffix() === "guest";
}

export const CLASS_LABELS: Record<CharacterClassId, string> = {
  paladin: "Paladín",
  clerigo: "Clérigo",
  mago: "Mago",
  nigromante: "Nigromante",
  druida: "Druida",
  bardo: "Bardo",
  guerrero: "Guerrero",
  cazador: "Cazador",
  asesino: "Asesino",
};

export const RACE_LABELS: Record<CharacterRaceId, string> = {
  human: "Humano",
  elf: "Elfo",
  drow: "Elfo Oscuro",
  dwarf: "Enano",
  gnome: "Gnomo",
  orc: "Orco",
  fantasma: "Fantasma",
};

const GENDER_LABELS: Record<CharacterGenderId, string> = {
  male: "Hombre",
  female: "Mujer",
};

export const GENDER_UI_LABELS: Record<CharacterGenderId, string> = {
  male: "Masculino",
  female: "Femenino",
};

/** Color del nombre en mundo / HUD / selección de personaje. */
export const FACTION_NAME_COLORS: Record<CharacterFactionId, { fill: string; stroke: string }> = {
  ciudadano: { fill: "#4da6ff", stroke: "#001a33" },
  armada: { fill: "#4da6ff", stroke: "#001a33" },
  caos: { fill: "#ff5252", stroke: "#330808" },
  renegado: { fill: "#b0b0b0", stroke: "#2a2a2a" },
};

export function getFactionNameColors(factionId: CharacterFactionId) {
  return FACTION_NAME_COLORS[factionId];
}

export type PlayerRole = "player" | "admin";

const ADMIN_CHARACTER_NAMES = new Set(["lonler"]);

export function isAdminCharacterName(name: string): boolean {
  return ADMIN_CHARACTER_NAMES.has(name.trim().toLowerCase());
}

export const ADMIN_NAME_COLORS = { fill: "#00e676", stroke: "#003d20" };

export function getPlayerNameColors(
  factionId: CharacterFactionId,
  role: PlayerRole = "player"
) {
  if (role === "admin") {
    return ADMIN_NAME_COLORS;
  }
  return getFactionNameColors(factionId);
}

export const ALL_RACES: CharacterRaceId[] = [
  "human",
  "elf",
  "drow",
  "dwarf",
  "gnome",
  "orc",
];

export const ALL_CLASSES: CharacterClassId[] = [
  "paladin",
  "clerigo",
  "mago",
  "nigromante",
  "druida",
  "bardo",
  "guerrero",
  "cazador",
  "asesino",
];

export const ALL_GENDERS: CharacterGenderId[] = ["male", "female"];

export function formatRaceGenderLabel(
  raceId: CharacterRaceId,
  genderId: CharacterGenderId
): string {
  return `${RACE_LABELS[raceId]} (${GENDER_LABELS[genderId]})`;
}

function createDefaultSlots(): CharacterSlot[] {
  const slots: CharacterSlot[] = Array.from({ length: CHARACTER_SLOT_COUNT }, () => null);
  if (isGuestCharacterStorage()) {
    slots[0] = {
      id: "demo-lonler",
      name: "Lonler",
      classId: "paladin",
      raceId: "human",
      genderId: "male",
      faceIndex: 0,
      factionId: "ciudadano",
      level: 50,
      homeMapId: "mapa1",
    };
  }
  return slots;
}

function removeDevOnlySlotsForAccount(slots: CharacterSlot[]): CharacterSlot[] {
  if (isGuestCharacterStorage()) {
    return slots;
  }
  let changed = false;
  const cleaned = slots.map((slot) => {
    if (slot?.name.trim().toLowerCase() === "lonler") {
      changed = true;
      return null;
    }
    return slot;
  });
  if (changed) {
    saveCharacterSlots(cleaned);
  }
  return cleaned;
}

function normalizeRaceId(value: string): CharacterRaceId {
  if (
    value === "human" ||
    value === "elf" ||
    value === "drow" ||
    value === "dwarf" ||
    value === "gnome" ||
    value === "orc"
  ) {
    return value;
  }
  return "human";
}

function normalizeGenderId(value: unknown): CharacterGenderId {
  return value === "female" ? "female" : "male";
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
    let homeMapId =
      typeof record.homeMapId === "string" && record.homeMapId.trim().length > 0
        ? record.homeMapId.trim()
        : undefined;
    if (homeMapId && ["pueblo", "bosque", "montana", "desierto"].includes(homeMapId)) {
      homeMapId = "mapa1";
    }
    slots[index] = {
      id: record.id,
      name: record.name,
      classId: record.classId as CharacterClassId,
      raceId: normalizeRaceId(record.raceId),
      genderId: normalizeGenderId(record.genderId),
      factionId: normalizeFactionId(record.factionId),
      faceIndex,
      level: Math.max(1, Math.floor(record.level)),
      homeMapId,
    };
  }

  return slots;
}

export function loadCharacterSlots(): CharacterSlot[] {
  try {
    const raw = localStorage.getItem(getCharacterSlotsStorageKey());
    if (!raw) {
      const defaults = createDefaultSlots();
      saveCharacterSlots(defaults);
      return defaults;
    }
    return removeDevOnlySlotsForAccount(normalizeSlots(JSON.parse(raw)));
  } catch {
    const defaults = createDefaultSlots();
    saveCharacterSlots(defaults);
    return defaults;
  }
}

export function saveCharacterSlots(slots: CharacterSlot[]): void {
  localStorage.setItem(
    getCharacterSlotsStorageKey(),
    JSON.stringify(slots.slice(0, CHARACTER_SLOT_COUNT))
  );
}

export function getActiveCharacterSlotIndex(): number | null {
  const raw = localStorage.getItem(getActiveSlotStorageKey());
  if (raw === null) return null;
  const index = Number.parseInt(raw, 10);
  if (!Number.isInteger(index) || index < 0 || index >= CHARACTER_SLOT_COUNT) {
    return null;
  }
  return index;
}

export function setActiveCharacterSlotIndex(index: number): void {
  localStorage.setItem(getActiveSlotStorageKey(), String(index));
}

export function getActiveCharacter(): SavedCharacter | null {
  const index = getActiveCharacterSlotIndex();
  if (index === null) return null;
  const slots = loadCharacterSlots();
  return slots[index] ?? null;
}

export function saveCharacterToSlot(slotIndex: number, character: SavedCharacter): boolean {
  if (slotIndex < 0 || slotIndex >= CHARACTER_SLOT_COUNT) {
    return false;
  }
  const slots = loadCharacterSlots();
  slots[slotIndex] = character;
  saveCharacterSlots(slots);
  return true;
}

/** Sincroniza nivel (y hogar) del slot con el progreso guardado en partida. */
export function patchSavedCharacterMeta(
  characterId: string,
  patch: { level?: number; homeMapId?: string; factionId?: CharacterFactionId }
): void {
  const slots = loadCharacterSlots();
  const index = slots.findIndex((slot) => slot?.id === characterId);
  if (index < 0 || !slots[index]) {
    return;
  }
  const current = slots[index]!;
  slots[index] = {
    ...current,
    level:
      patch.level !== undefined
        ? Math.max(1, Math.floor(patch.level))
        : current.level,
    homeMapId: patch.homeMapId ?? current.homeMapId,
    factionId:
      patch.factionId !== undefined
        ? normalizeFactionId(patch.factionId)
        : current.factionId,
  };
  saveCharacterSlots(slots);
}

export function createCharacterId(): string {
  return `char-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
