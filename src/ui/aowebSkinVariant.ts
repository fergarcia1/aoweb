import { getAccountScopedStorageKey } from "../config/accountScopedStorage";

export const AOWEB_SKIN_STORAGE_KEY = "aoweb_ui_skin_variant";

export const AOWEB_SKIN_FILES = {
  white: "UIAOWEBWhite.png",
  dark: "UIAOWEBDark.png",
  red: "UIAOWEBRed.png",
  /** Skin histórica 1024×768 (solo dev / VITE_UI_SKIN=light). */
  light: "aoweb_skin.png",
} as const;

export type AowebUiSkinVariant = keyof typeof AOWEB_SKIN_FILES;

export const AOWEB_UI_SKIN_VARIANTS = Object.keys(AOWEB_SKIN_FILES) as AowebUiSkinVariant[];

const TEXTURE_KEY_PREFIX = "aoweb_skin_";

export function getAowebSkinTextureKey(variant: AowebUiSkinVariant = getAowebSkinVariant()): string {
  return `${TEXTURE_KEY_PREFIX}${variant}`;
}

export function isAowebUiSkinVariant(value: string): value is AowebUiSkinVariant {
  return value in AOWEB_SKIN_FILES;
}

/** Alias de chat: `/ui clear` → skin blanca. */
export function parseUiSkinCommandArg(arg: string): AowebUiSkinVariant | null {
  const normalized = arg.trim().toLowerCase();
  if (normalized === "clear") {
    return "white";
  }
  return isAowebUiSkinVariant(normalized) ? normalized : null;
}

export function getAowebSkinVariant(): AowebUiSkinVariant {
  try {
    const stored =
      localStorage.getItem(getAccountScopedStorageKey(AOWEB_SKIN_STORAGE_KEY)) ??
      localStorage.getItem(AOWEB_SKIN_STORAGE_KEY);
    if (stored && isAowebUiSkinVariant(stored)) {
      return stored;
    }
  } catch {
    // ignore
  }

  const env = import.meta.env.VITE_UI_SKIN as string | undefined;
  if (env && isAowebUiSkinVariant(env)) {
    return env;
  }
  if (env === "light") {
    return "light";
  }

  return "dark";
}

export function setAowebSkinVariant(variant: AowebUiSkinVariant): void {
  localStorage.setItem(getAccountScopedStorageKey(AOWEB_SKIN_STORAGE_KEY), variant);
}

export function resolveAowebSkinFile(variant: AowebUiSkinVariant = getAowebSkinVariant()): string {
  return AOWEB_SKIN_FILES[variant];
}

export function getAowebSkinThemeLabel(variant: AowebUiSkinVariant = getAowebSkinVariant()): string {
  switch (variant) {
    case "white":
      return "clara (UIAOWEBWhite)";
    case "red":
      return "roja (UIAOWEBRed)";
    case "light":
      return "legacy (aoweb_skin)";
    case "dark":
    default:
      return "oscura (UIAOWEBDark)";
  }
}
