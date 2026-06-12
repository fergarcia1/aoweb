import { DEFAULT_MAP_ID } from "./constants";
import { BANK_SLOT_COUNT, INVENTORY_SLOT_COUNT } from "../game-data/constants";
import { isKnownEquipmentItemId } from "../game-data/items/registry";
import type { Facing, NetPlayerEquipment } from "./types";

/** Mapas con simulación en el servidor hosteado (ampliar al habilitar más zonas). */
export const MULTIPLAYER_SERVER_MAP_IDS = new Set<string>([
  DEFAULT_MAP_ID,
  "mapa1",
  "mapa2",
  "mapa3",
  "mapa4",
  "mapa5",
  "mapa6",
  "mapa7",
  "mapa8",
  "mapa9",
  "mapa10",
  "mapa11",
  "mapa12",
  "mapa13",
  "mapa14",
  "mapa15",
  "mapa16",
  "mapa17",
  "mapa18",
  "mapa19",
  "mapa20",
  "mapa21",
  "mapa22",
  "mapa23",
  "mapa24",
  "mapa25",
  "mapa26",
  "mapa27",
  "mapa28",
  "mapa29",
  "mapa30",
  "mapa31",
  "mapa32",
  "mapa33",
  "mapa34",
  "mapa35",
  "mapa36",
  "mapa37",
  "mapa38",
  "mapa39",
  "mapa40",
  "mapa41",
  "mapa42",
  "mapa43",
  "mapa44",
  "mapa45",
  "mapa46",
  "mapa47",
  "mapa48",
  "mapa49",
  "mapa50",
  "mapa51",
  "mapa52",
  "mapa53",
  "mapa54",
  "mapa55",
  "mapa56",
  "mapa57",
  "mapa58",
  "mapa59",
  "mapa60",
  "mapa61",
  "mapa62",
  "mapa63",
  "mapa64",
  "mapa65",
  "mapa66",
  "mapa67",
  "mapa68",
  "mapa69",
  "mapa70",
  "mapa71",
  "mapa72",
  "mapa73",
  "mapa74",
  "mapa75",
  "mapa76",
  "mapa77",
  "mapa78",
  "mapa79",
  "mapa80",
  "mapa81",
  "mapa82",
  "mapa83",
  "mapa84",
  "mapa85",
  "mapa86",
  "mapa87",
  "mapa88",
  "mapa89",
  "mapa90",
  "mapa91",
  "mapa92",
  "mapa93",
  "mapa94",
  "mapa95",
  "mapa96",
  "mapa97",
  "mapa98",
  "mapa99",
  "mapa100",
  "mapa101",
  "mapa102",
  "mapa103",
  "mapa104",
  "mapa105",
  "mapa106",
  "mapa107",
  "mapa108",
  "mapa109",
  "mapa110",
  "mapa111",
  "mapa112",
  "mapa113",
  "mapa114",
  "mapa115",
  "mapa116",
  "mapa117",
  "mapa118",
  "mapa119",
  "mapa120",
  "mapa121",
  "mapa122",
  "mapa123",
  "mapa124",
  "mapa125",
  "mapa126",
  "mapa127",
  "mapa128",
  "mapa129",
  "mapa130",
  "mapa131",
  "mapa132",
  "mapa133",
  "mapa134",
  "mapa135",
  "mapa136",
  "mapa137",
  "mapa138",
  "mapa139",
  "mapa140",
  "mapa141",
  "mapa142",
  "mapa143",
  "mapa144",
  "mapa145",
  "mapa146",
  "mapa147",
  "mapa148",
  "mapa149",
  "mapa150",
  "mapa151",
  "mapa152",
  "mapa153",
  "mapa154",
  "mapa155",
  "mapa156",
  "mapa157",
  "mapa158",
  "mapa159",
  "mapa160",
  "mapa161",
  "mapa162",
  "mapa163",
  "mapa164",
  "mapa165",
  "mapa166",
  "mapa167",
  "mapa168",
  "mapa169",
  "mapa170",
  "mapa171",
  "mapa172",
  "mapa173",
  "mapa174",
  "mapa175",
  "mapa176",
  "mapa177",
  "mapa178",
  "mapa179",
  "mapa180",
  "mapa181",
  "mapa182",
  "mapa183",
  "mapa184",
  "mapa185",
  "mapa186",
  "mapa187",
  "mapa188",
  "mapa189",
  "mapa190",
  "mapa191",
  "mapa192",
  "mapa193",
  "mapa194",
  "mapa195",
  "mapa196",
  "mapa197",
  "mapa198",
  "mapa199",
  "mapa200",
  "mapa201",
  "mapa202",
  "mapa203",
  "mapa204",
  "mapa205",
  "mapa206",
  "mapa207",
  "mapa208",
  "mapa209",
  "mapa210",
  "mapa211",
  "mapa212",
  "mapa213",
  "mapa214",
  "mapa215",
  "mapa216",
  "mapa217",
  "mapa218",
  "mapa219",
  "mapa220",
  "mapa221",
  "mapa222",
  "mapa223",
  "mapa224",
  "mapa225",
  "mapa226",
  "mapa227",
  "mapa228",
  "mapa229",
  "mapa230",
  "mapa231",
  "mapa232",
  "mapa233",
  "mapa234",
  "mapa235",
  "mapa236",
  "mapa237",
  "mapa238",
  "mapa239",
  "mapa240",
  "mapa241",
  "mapa242",
  "mapa243",
  "mapa244",
  "mapa245",
  "mapa246",
  "mapa247",
  "mapa248",
  "mapa249",
  "mapa250",
  "mapa251",
  "mapa252",
  "mapa253",
  "mapa254",
  "mapa255",
  "mapa256"
]);

export type JoinEquipmentPayload = {
  weaponId?: string | null;
  shieldId?: string | null;
  helmetId?: string | null;
  armorId?: string | null;
  equippedOutfit?: string;
};

export type JoinInventorySlotPayload = {
  slotIndex?: number;
  itemId?: string | null;
  amount?: number;
  isEquipped?: boolean;
};

export function clampPlayerLevel(level: unknown): number {
  if (typeof level !== "number" || !Number.isFinite(level)) {
    return 1;
  }
  return Math.min(200, Math.max(1, Math.floor(level)));
}

export function clampVitalPair(
  current: unknown,
  max: unknown,
  fallbackMax: number
): { current: number; max: number } {
  const maxVal =
    typeof max === "number" && Number.isFinite(max)
      ? Math.min(100_000, Math.max(1, Math.floor(max)))
      : fallbackMax;
  const cur =
    typeof current === "number" && Number.isFinite(current)
      ? Math.min(maxVal, Math.max(0, Math.floor(current)))
      : maxVal;
  return { current: cur, max: maxVal };
}

export function normalizeFacing(raw: unknown): Facing {
  if (raw === "up" || raw === "down" || raw === "left" || raw === "right") {
    return raw;
  }
  return "down";
}

function nullableItemId(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  return raw.trim().slice(0, 64);
}

export function sanitizeJoinEquipment(
  raw: JoinEquipmentPayload | undefined
): NetPlayerEquipment {
  const weaponId = nullableItemId(raw?.weaponId);
  const shieldId = nullableItemId(raw?.shieldId);
  const helmetId = nullableItemId(raw?.helmetId);
  const armorId = nullableItemId(raw?.armorId);
  return {
    weaponId: isKnownEquipmentItemId(weaponId) ? weaponId : null,
    shieldId: isKnownEquipmentItemId(shieldId) ? shieldId : null,
    helmetId: isKnownEquipmentItemId(helmetId) ? helmetId : null,
    armorId: isKnownEquipmentItemId(armorId) ? armorId : null,
    equippedOutfit:
      typeof raw?.equippedOutfit === "string" && raw.equippedOutfit.trim()
        ? raw.equippedOutfit.trim().slice(0, 32)
        : "base",
  };
}

export function resolveMultiplayerMapId(clientMapId: string): string {
  return MULTIPLAYER_SERVER_MAP_IDS.has(clientMapId) ? clientMapId : DEFAULT_MAP_ID;
}

export function sanitizeJoinInventory(
  raw: JoinInventorySlotPayload[] | null | undefined
): Array<{ slotIndex: number; itemId: string | null; amount: number; isEquipped: boolean }> {
  const slots = Array.from({ length: INVENTORY_SLOT_COUNT }, (_, slotIndex) => ({
    slotIndex,
    itemId: null as string | null,
    amount: 0,
    isEquipped: false,
  }));
  if (!Array.isArray(raw)) {
    return slots;
  }
  for (const entry of raw) {
    const slotIndex =
      typeof entry?.slotIndex === "number" && Number.isFinite(entry.slotIndex)
        ? Math.floor(entry.slotIndex)
        : -1;
    if (slotIndex < 0 || slotIndex >= INVENTORY_SLOT_COUNT) continue;
    const amount =
      typeof entry?.amount === "number" && Number.isFinite(entry.amount)
        ? Math.max(0, Math.floor(entry.amount))
        : 0;
    const itemId = nullableItemId(entry?.itemId);
    slots[slotIndex] = {
      slotIndex,
      itemId: amount > 0 ? itemId : null,
      amount: amount > 0 && itemId ? amount : 0,
      isEquipped: entry?.isEquipped === true,
    };
  }
  return slots;
}

export type JoinBankSlotPayload = {
  slotIndex?: number;
  itemId?: string | null;
  amount?: number;
};

export function sanitizeJoinBankSlots(
  raw: JoinBankSlotPayload[] | null | undefined
): Array<{ slotIndex: number; itemId: string | null; amount: number }> {
  const slots = Array.from({ length: BANK_SLOT_COUNT }, (_, slotIndex) => ({
    slotIndex,
    itemId: null as string | null,
    amount: 0,
  }));
  if (!Array.isArray(raw)) {
    return slots;
  }
  for (const entry of raw) {
    const slotIndex =
      typeof entry?.slotIndex === "number" && Number.isFinite(entry.slotIndex)
        ? Math.floor(entry.slotIndex)
        : -1;
    if (slotIndex < 0 || slotIndex >= BANK_SLOT_COUNT) continue;
    const amount =
      typeof entry?.amount === "number" && Number.isFinite(entry.amount)
        ? Math.max(0, Math.floor(entry.amount))
        : 0;
    const itemId = nullableItemId(entry?.itemId);
    slots[slotIndex] = {
      slotIndex,
      itemId: amount > 0 ? itemId : null,
      amount: amount > 0 && itemId ? amount : 0,
    };
  }
  return slots;
}

export function sanitizeJoinLearnedSpellIds(raw: unknown): Set<number> {
  const out = new Set<number>();
  if (!Array.isArray(raw)) {
    return out;
  }
  for (const value of raw) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const id = Math.floor(value);
    if (id > 0) {
      out.add(id);
    }
  }
  return out;
}
