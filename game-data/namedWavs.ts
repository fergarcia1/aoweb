/**
 * WAV de Imperium por nombre de archivo (public/assets/ao/wav/{archivo}).
 * Copiar con: npm run wav:spells
 */

export const NAMED_WAV_FILES = {
  step: "step.wav",
  step2: "step2.wav",
  pasoGolem: "pasoGolem.wav",
  pasoGolem2: "pasoGolem2.wav",
  apoca: "apoca.wav",
  furiaUkhrul: "furiaUkhrul.wav",
  lvlUp: "lvlUp.wav",
  spawnInWorld: "spawnInWorld.wav",
  goldDrop: "goldDrop.wav",
  golpeAire: "golpeAire.wav",
  golpeAim: "golpeAim.wav",
  weaponEquip: "weaponEquip.wav",
  equiparArmor: "equiparArmor.wav",
  apu: "apu.wav",
  arrowHit: "arrowHit.wav",
  arrowMiss: "arrowMiss.wav",
  creacionClan: "creacionClan.wav",
  drop: "drop.wav",
  openingDoor: "openingDoor.wav",
  shieldBlock: "shieldBlock.wav",
  medu: "medu.wav",
  medu2: "medu (2).wav",
  muerte: "../imperium/mobs/npc_bodies/muerte.wav",
  pocionAzul: "pocionAzul.wav",
  arana: "arana.wav",
  basilisco: "basilisco.wav",
  bruja: "bruja.wav",
  ciclope: "ciclope.wav",
  ciclope2: "ciclope2.wav",
  escorpion: "escorpion.wav",
  fango: "fango.wav",
  lobo: "lobo.wav",
  murcielago: "murcielago.wav",
  serpienteHit: "serpienteHit.wav",
} as const;

export type NamedWavId = keyof typeof NAMED_WAV_FILES;

/** Todos los archivos a copiar desde la carpeta Wav de Imperium. */
export const ALL_NAMED_WAV_FILE_NAMES: readonly string[] = Object.values(NAMED_WAV_FILES);
