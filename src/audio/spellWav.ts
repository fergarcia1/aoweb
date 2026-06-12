import { SPELL_CAST_META_BY_ID } from "../../game-data/spellCastMeta";
import { NAMED_WAV_FILES, type NamedWavId } from "../../game-data/namedWavs";
import { playNamedWav, preloadNamedWavs } from "./namedWav";

/** Índices WAV referenciados por hechizos (sin 0 = silencio en IAO). */
export function getUniqueSpellWavIndices(): number[] {
  const set = new Set<number>();
  for (const meta of Object.values(SPELL_CAST_META_BY_ID)) {
    if (meta.wav > 0) set.add(meta.wav);
  }
  return [...set].sort((a, b) => a - b);
}

export function spellWavAssetPath(wavIndex: number): string {
  return `/assets/ao/wav/${wavIndex}.wav`;
}

export function spellWavAudioKey(wavIndex: number): string {
  return `ao_spell_wav_${wavIndex}`;
}

export function preloadSpellWavs(scene: Phaser.Scene): number {
  let queued = 0;
  for (const wavIndex of getUniqueSpellWavIndices()) {
    const key = spellWavAudioKey(wavIndex);
    if (scene.cache.audio.exists(key)) continue;
    scene.load.audio(key, spellWavAssetPath(wavIndex));
    queued += 1;
  }
  return queued;
}

/** WAV de lanzamiento solo para los hechizos que el personaje puede usar. */
export function preloadSpellAudioForSpellIds(
  scene: Phaser.Scene,
  spellIds: Iterable<number>
): number {
  let queued = 0;
  const namedIds = new Set<NamedWavId>();

  for (const spellId of spellIds) {
    const meta = SPELL_CAST_META_BY_ID[spellId];
    if (!meta) continue;
    if (meta.namedWav && meta.namedWav in NAMED_WAV_FILES) {
      namedIds.add(meta.namedWav as NamedWavId);
      continue;
    }
    if (meta.wav <= 0) continue;
    const key = spellWavAudioKey(meta.wav);
    if (scene.cache.audio.exists(key)) continue;
    scene.load.audio(key, spellWavAssetPath(meta.wav));
    queued += 1;
  }

  queued += preloadNamedWavs(scene, [...namedIds]);
  return queued;
}

export function playSpellNamedWav(
  scene: Phaser.Scene,
  namedId: string | undefined,
  volume = 0.5
): boolean {
  if (!namedId) return false;
  return playNamedWav(scene, namedId as NamedWavId, volume);
}

export function playSpellWav(
  scene: Phaser.Scene,
  wavIndex: number | undefined,
  volume = 0.5
): boolean {
  if (wavIndex === undefined || wavIndex <= 0) return false;
  const key = spellWavAudioKey(wavIndex);
  if (!scene.cache.audio.exists(key)) return false;

  const play = () => {
    scene.sound.play(key, { volume });
  };

  if (scene.sound.locked) {
    scene.sound.once(Phaser.Sound.Events.UNLOCKED, play);
    return true;
  }
  play();
  return true;
}
