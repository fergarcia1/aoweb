import Phaser from "phaser";
import { loadMasterVolume } from "../config/audioSettings";

const MENU_MUSIC_KEY = "aoweb_menu_music_crown";
const MENU_MUSIC_PATH = "/assets/audio/music/the-crown-of-the-seven-seas.mp3";
const MENU_MUSIC_VOLUME = 0.42;

let menuMusic: HTMLAudioElement | null = null;

export function preloadMenuMusic(scene: Phaser.Scene): void {
  if (scene.cache.audio.exists(MENU_MUSIC_KEY)) {
    return;
  }
  scene.load.audio(MENU_MUSIC_KEY, MENU_MUSIC_PATH);
}

function getMenuMusic(): HTMLAudioElement {
  if (!menuMusic) {
    menuMusic = new Audio(MENU_MUSIC_PATH);
    menuMusic.loop = true;
    menuMusic.preload = "auto";
  }
  menuMusic.volume = Math.min(1, Math.max(0, loadMasterVolume() * MENU_MUSIC_VOLUME));
  return menuMusic;
}

export function playMenuMusic(_scene: Phaser.Scene): void {
  const audio = getMenuMusic();
  if (!audio.paused) {
    return;
  }

  void audio.play().catch(() => {
    // Browser autoplay policy: a real click/key gesture will retry from AuthScene.
  });
}

export function playMenuMusicFromUserGesture(scene: Phaser.Scene): void {
  playMenuMusic(scene);
}

export function hasMenuMusicStarted(): boolean {
  return Boolean(menuMusic && !menuMusic.paused);
}

export function stopMenuMusic(_scene?: Phaser.Scene): void {
  if (!menuMusic) {
    return;
  }
  menuMusic.pause();
  menuMusic.currentTime = 0;
  menuMusic = null;
}
