import Phaser from "phaser";

/** Pergaminos de paso de Imperium (step.wav / step2.wav). */
export const FOOTSTEP_AUDIO_KEYS = ["ao_footstep_step", "ao_footstep_step2"] as const;

const FOOTSTEP_PATHS = [
  "/assets/ao/wav/step.wav",
  "/assets/ao/wav/step2.wav",
] as const;

let nextFootstepIndex = 0;

export function preloadFootstepWavs(scene: Phaser.Scene): void {
  for (let i = 0; i < FOOTSTEP_AUDIO_KEYS.length; i += 1) {
    const key = FOOTSTEP_AUDIO_KEYS[i];
    if (scene.cache.audio.exists(key)) continue;
    scene.load.audio(key, FOOTSTEP_PATHS[i]);
  }
}

/** Alterna step / step2 en cada tile de caminata del jugador local. */
export function playFootstepWav(scene: Phaser.Scene, volume = 0.38): boolean {
  const key = FOOTSTEP_AUDIO_KEYS[nextFootstepIndex];
  nextFootstepIndex = (nextFootstepIndex + 1) % FOOTSTEP_AUDIO_KEYS.length;

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
