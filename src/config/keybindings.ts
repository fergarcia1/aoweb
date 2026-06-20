import { getAccountScopedStorageKey } from "./accountScopedStorage";

export type ActionName =
  | "attack"
  | "useItem"
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
  useItem: 81, // Q
  pickup: 71, // G
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
      const parsed = JSON.parse(stored) as Partial<Keybindings>;
      const legacyUseKey =
        typeof parsed.useItem === "number"
          ? parsed.useItem
          : typeof parsed.pickup === "number"
            ? parsed.pickup
            : defaultBindings.useItem;
      return {
        ...defaultBindings,
        ...parsed,
        useItem: legacyUseKey,
        pickup:
          typeof parsed.useItem === "number" && typeof parsed.pickup === "number"
            ? parsed.pickup
            : defaultBindings.pickup,
      };
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
