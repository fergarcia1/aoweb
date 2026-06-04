import { SPELL_CAST_META_BY_ID } from "../../game-data/spellCastMeta";
import type { NamedWavId } from "../../game-data/namedWavs";
import { playNamedWav } from "./namedWav";

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

export function preloadSpellWavs(scene: Phaser.Scene): void {
  for (const wavIndex of getUniqueSpellWavIndices()) {
    const key = spellWavAudioKey(wavIndex);
    if (scene.cache.audio.exists(key)) continue;
    scene.load.audio(key, spellWavAssetPath(wavIndex));
  }
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
