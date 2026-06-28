export const IMPERIAL_CITY_MAP_IDS = [
  "mapa61",
  "mapa60",
  "mapa59",
  "mapa58",
  "mapa1",
  "mapa34",
] as const;

export const NEUTRAL_CITY_MAP_IDS = [
  "mapa63",
  "mapa62",
  "mapa64",
  "mapa20",
  "mapa151",
  "mapa112",
  "mapa111",
  "mapa218",
] as const;

export const CHAOS_CITY_MAP_IDS = [
  "mapa181",
  "mapa182",
] as const;

const LEGACY_CITY_MAP_IDS = [
  "mapa156",
] as const;

export const CITY_MAP_IDS = [
  ...IMPERIAL_CITY_MAP_IDS,
  ...NEUTRAL_CITY_MAP_IDS,
  ...CHAOS_CITY_MAP_IDS,
  ...LEGACY_CITY_MAP_IDS,
] as const;

export const CITY_MAP_ID_SET: ReadonlySet<string> = new Set(CITY_MAP_IDS);
export const IMPERIAL_CITY_MAP_ID_SET: ReadonlySet<string> = new Set(IMPERIAL_CITY_MAP_IDS);
export const NEUTRAL_CITY_MAP_ID_SET: ReadonlySet<string> = new Set(NEUTRAL_CITY_MAP_IDS);
export const CHAOS_CITY_MAP_ID_SET: ReadonlySet<string> = new Set(CHAOS_CITY_MAP_IDS);
