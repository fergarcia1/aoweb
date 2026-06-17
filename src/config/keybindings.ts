import { getAccountScopedStorageKey } from "./accountScopedStorage";

export type ActionName =
  | "attack"
  | "pickup"
  | "equip"
  | "drop"
  | "meditate"
  | "map"
  | "moveUp"
  | "moveLeft"
  | "moveDown"
  | "moveRight";

export type Keybindings = Record<ActionName, number>;

const KEYBINDINGS_STORAGE_KEY = "aoweb_keybindings";

const defaultBindings: Keybindings = {
  attack: 17, // Phaser.Input.Keyboard.KeyCodes.CTRL
  pickup: 81, // Q
  equip: 69, // E
  drop: 84, // T
  meditate: 78, // N
  map: 77, // M
  moveUp: 87, // W
  moveLeft: 65, // A
  moveDown: 83, // S
  moveRight: 68, // D
};

export function loadKeybindings(): Keybindings {
  try {
    const stored =
      localStorage.getItem(getAccountScopedStorageKey(KEYBINDINGS_STORAGE_KEY)) ??
      localStorage.getItem(KEYBINDINGS_STORAGE_KEY);
    if (stored) {
      return { ...defaultBindings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to load keybindings", e);
  }
  return { ...defaultBindings };
}

export function saveKeybindings(bindings: Keybindings) {
  try {
    localStorage.setItem(
      getAccountScopedStorageKey(KEYBINDINGS_STORAGE_KEY),
      JSON.stringify(bindings)
    );
  } catch (e) {
    console.error("Failed to save keybindings", e);
  }
}

export function getKeyCodeName(keyCode: number): string {
  // Simplificado, Phaser KeyCodes mapean mayormente al event.keyCode estándar.
  if (keyCode === 17) return "CTRL";
  if (keyCode === 16) return "SHIFT";
  if (keyCode === 32) return "SPACE";
  if (keyCode === 27) return "ESC";
  if (keyCode === 38) return "UP";
  if (keyCode === 40) return "DOWN";
  if (keyCode === 37) return "LEFT";
  if (keyCode === 39) return "RIGHT";
  return String.fromCharCode(keyCode);
}
