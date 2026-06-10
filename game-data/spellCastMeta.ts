/**
 * Metadatos de lanzamiento por hechizo (WAV + palabras mágicas de IAO).
 * Generado con: node tools/generate-spell-cast-meta.mjs
 * No importar spells_imported en runtime.
 */
export type SpellCastMeta = {
  /** Índice de sonido original de Argentum Online. */
  wav: number;
  /** WAV por nombre en public/assets/ao/wav (prioridad sobre `wav`). */
  namedWav?: string;
  /** Texto sobre la cabeza al lanzar. */
  palabrasMagicas?: string;
};

export const SPELL_CAST_META_BY_ID: Record<number, SpellCastMeta> = {
  1: { wav: 239, palabrasMagicas: "Nihil Ved" },
  2: { wav: 233, palabrasMagicas: "Rah'Za'Lu" },
  3: { wav: 238, palabrasMagicas: "Corp Sanc" },
  4: { wav: 19, palabrasMagicas: "Fogûs Saex" },
  5: { wav: 16, palabrasMagicas: "SUN VAP" },
  6: { wav: 57 },
  7: { wav: 65, palabrasMagicas: "Nihil Mortem" },
  8: { wav: 253, palabrasMagicas: "Är Prop s'uo" },
  9: { wav: 240, palabrasMagicas: "EN CORP SANCTIS" },
  10: { wav: 203, palabrasMagicas: "HOAX VORP" },
  11: { wav: 56, palabrasMagicas: "T'HY KOOOL" },
  13: { wav: 0, namedWav: "furiaUkhrul", palabrasMagicas: "ÛX'ÔL'HIC" },
  14: { wav: 123 },
  15: { wav: 27, palabrasMagicas: "RAX IN ZAR" },
  16: { wav: 49, palabrasMagicas: "Impendere et worg" },
  17: { wav: 124, palabrasMagicas: "Lüpus Aident" },
  18: { wav: 230, palabrasMagicas: "YUP A'INC" },
  19: { wav: 17, palabrasMagicas: "ASYNC YUP A'INC" },
  20: { wav: 230, palabrasMagicas: "Ar A'kron" },
  21: { wav: 17, palabrasMagicas: "Xoom Varp" },
  22: { wav: 59, palabrasMagicas: "Disincanto" },
  23: { wav: 56, palabrasMagicas: "T'HY KOOOL" },
  25: { wav: 0, namedWav: "apoca", palabrasMagicas: "Rahma Nañarak O'al" },
  29: { wav: 17, palabrasMagicas: "Ar'Cos Mantra'rax" },
  32: { wav: 55, palabrasMagicas: "Nihil Vitae" },
  35: { wav: 26, palabrasMagicas: "Hut Inefectus" },
  36: { wav: 27 },
  37: { wav: 10 },
  38: { wav: 57 },
  39: { wav: 57 },
  40: { wav: 57 },
  44: { wav: 57 },
  50: { wav: 57 },
  51: { wav: 56 },
  52: { wav: 66, palabrasMagicas: "Finis Mortem" },
  53: { wav: 129, palabrasMagicas: "Opercure Dimentia" },
  54: { wav: 100, palabrasMagicas: "HÎC KNÄ XÄR" },
  62: { wav: 130, palabrasMagicas: "Fant Visiblî" },
  63: { wav: 94, palabrasMagicas: "VÂR NI MÈS" },
  66: { wav: 32 },
  67: { wav: 240, palabrasMagicas: "CORP CURATIO" },
  68: { wav: 0, palabrasMagicas: "SACRE ASTAIM" },
  69: { wav: 27, palabrasMagicas: "Jâf Rashida" },
  70: { wav: 0, palabrasMagicas: "Ajàunis Herinoenous" },
  71: { wav: 103, palabrasMagicas: "In nómini Pater, Filum, Sanctis Espiritum" },
  72: { wav: 55, palabrasMagicas: "Ar'Sen Benerim" },
  73: { wav: 0, palabrasMagicas: "Ar'Sen Benerim" },
  75: { wav: 18, palabrasMagicas: "AMAÎRI SANCTIS" },
  76: { wav: 204, palabrasMagicas: "Samarin Tar" },
  77: { wav: 27, palabrasMagicas: "Pelor In bodem" },
  78: { wav: 65, palabrasMagicas: "Nature Obad-Hai Eventî" },
  81: { wav: 16, palabrasMagicas: "Teliönem Enneryl" },
  82: { wav: 17, palabrasMagicas: "Mortem" },
  83: { wav: 92, palabrasMagicas: "Leomund secure cobijim" },
  84: { wav: 105, palabrasMagicas: "Espirictum Nifis Mortem" },
  85: { wav: 30, palabrasMagicas: "Inspiratum" },
  86: { wav: 17, palabrasMagicas: "In Enterinum Zôrx" },
  87: { wav: 27, palabrasMagicas: "Abra Ainum" },
  88: { wav: 55, palabrasMagicas: "Abra Ainum" },
  89: { wav: 103, palabrasMagicas: "Ar'Cos Sanctis Hic" },
  92: { wav: 27, palabrasMagicas: "INX TO RÂ" },
  93: { wav: 234, palabrasMagicas: "T'HY KOOOL" },
  94: { wav: 242, palabrasMagicas: "IGNÎS XAR" },
  100: { wav: 18, palabrasMagicas: "Toma toda la Vida." },
  101: { wav: 65, palabrasMagicas: "Rahma Nañarak O'al '^GM^'" },
  102: { wav: 255, palabrasMagicas: "AN HOAX VORP" },
  103: { wav: 20, palabrasMagicas: "AHIL KNÄ XÄR" },
};
