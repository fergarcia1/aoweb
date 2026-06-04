import Phaser from "phaser";
import {
  NAMED_WAV_FILES,
  type NamedWavId,
} from "../../game-data/namedWavs";

export function namedWavAudioKey(id: NamedWavId): string {
  return `ao_named_wav_${id}`;
}

export function namedWavAssetPath(id: NamedWavId): string {
  return `/assets/ao/wav/${NAMED_WAV_FILES[id]}`;
}

export function preloadNamedWavs(
  scene: Phaser.Scene,
  ids: readonly NamedWavId[] = Object.keys(NAMED_WAV_FILES) as NamedWavId[]
): void {
  for (const id of ids) {
    const key = namedWavAudioKey(id);
    if (scene.cache.audio.exists(key)) continue;
    scene.load.audio(key, namedWavAssetPath(id));
  }
}

export function playNamedWav(
  scene: Phaser.Scene,
  id: NamedWavId,
  volume = 0.45
): boolean {
  const key = namedWavAudioKey(id);
  if (!scene.cache.audio.exists(key)) {
    return false;
  }

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

const alternatingIndex = new Map<string, number>();

export function playAlternatingNamedWavs(
  scene: Phaser.Scene,
  ids: readonly [NamedWavId, NamedWavId],
  volume = 0.38,
  groupKey = ids.join("|")
): boolean {
  const index = alternatingIndex.get(groupKey) ?? 0;
  const id = ids[index % 2];
  alternatingIndex.set(groupKey, index + 1);
  return playNamedWav(scene, id, volume);
}
