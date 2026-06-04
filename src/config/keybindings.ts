export type ActionName = "attack" | "pickup" | "equip" | "drop" | "meditate" | "map";

export type Keybindings = Record<ActionName, number>;

const defaultBindings: Keybindings = {
  attack: 17, // Phaser.Input.Keyboard.KeyCodes.CTRL
  pickup: 81, // Q
  equip: 69, // E
  drop: 84, // T
  meditate: 78, // N
  map: 77, // M
};

export function loadKeybindings(): Keybindings {
  try {
    const stored = localStorage.getItem("aoweb_keybindings");
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
    localStorage.setItem("aoweb_keybindings", JSON.stringify(bindings));
  } catch (e) {
    console.error("Failed to save keybindings", e);
  }
}

export function getKeyCodeName(keyCode: number): string {
  // Simplificado, Phaser KeyCodes mapean mayormente al event.keyCode estándar.
  if (keyCode === 17) return "CTRL";
  if (keyCode === 16) return "SHIFT";
  if (keyCode === 32) return "SPACE";
  return String.fromCharCode(keyCode);
}
