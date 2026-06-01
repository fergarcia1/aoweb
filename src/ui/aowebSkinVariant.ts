export const AOWEB_SKIN_FILES = {
  dark: "UIAOWEBDark.png",
  light: "aoweb_skin.png",
} as const;

export type AowebUiSkinVariant = keyof typeof AOWEB_SKIN_FILES;

export function getAowebSkinVariant(): AowebUiSkinVariant {
  const variant = import.meta.env.VITE_UI_SKIN as string | undefined;
  return variant === "light" ? "light" : "dark";
}

export function resolveAowebSkinFile(): string {
  return AOWEB_SKIN_FILES[getAowebSkinVariant()];
}
