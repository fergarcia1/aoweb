import Phaser from "phaser";

const MENU_MUSIC_KEY = "aoweb_menu_music_crown";
const MENU_MUSIC_PATH = "/assets/audio/music/the-crown-of-the-seven-seas.mp3";
const MENU_MUSIC_VOLUME = 0.42;

let menuMusic: Phaser.Sound.BaseSound | null = null;
let pendingUnlock = false;

export function preloadMenuMusic(scene: Phaser.Scene): void {
  if (scene.cache.audio.exists(MENU_MUSIC_KEY)) {
    return;
  }
  scene.load.audio(MENU_MUSIC_KEY, MENU_MUSIC_PATH);
}

export function playMenuMusic(scene: Phaser.Scene): void {
  if (!scene.cache.audio.exists(MENU_MUSIC_KEY)) {
    return;
  }
  if (!menuMusic || !scene.sound.get(MENU_MUSIC_KEY)) {
    menuMusic = scene.sound.add(MENU_MUSIC_KEY, {
      loop: true,
      volume: MENU_MUSIC_VOLUME,
    });
  }
  if (menuMusic.isPlaying) {
    return;
  }

  const play = () => {
    pendingUnlock = false;
    if (menuMusic && !menuMusic.isPlaying) {
      menuMusic.play();
    }
  };

  if (scene.sound.locked) {
    (scene.sound as Phaser.Sound.BaseSoundManager & { unlock?: () => void }).unlock?.();
  }

  if (scene.sound.locked) {
    if (!pendingUnlock) {
      pendingUnlock = true;
      scene.sound.once(Phaser.Sound.Events.UNLOCKED, play);
    }
    return;
  }

  play();
}

export function stopMenuMusic(scene?: Phaser.Scene): void {
  if (!menuMusic) {
    return;
  }
  if (menuMusic.isPlaying) {
    menuMusic.stop();
  }
  if (scene?.sound.get(MENU_MUSIC_KEY)) {
    scene.sound.remove(menuMusic);
    menuMusic = null;
  }
}
