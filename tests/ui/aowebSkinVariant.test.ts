import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AOWEB_SKIN_FILES,
  AOWEB_SKIN_STORAGE_KEY,
  getAowebSkinTextureKey,
  getAowebSkinVariant,
  parseUiSkinCommandArg,
  setAowebSkinVariant,
} from "../../src/ui/aowebSkinVariant";

function mockLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  });
  return store;
}

describe("aowebSkinVariant", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("parsea clear como white", () => {
    expect(parseUiSkinCommandArg("clear")).toBe("white");
    expect(parseUiSkinCommandArg("dark")).toBe("dark");
    expect(parseUiSkinCommandArg("red")).toBe("red");
    expect(parseUiSkinCommandArg("nope")).toBeNull();
  });

  it("persiste en localStorage", () => {
    setAowebSkinVariant("red");
    expect(getAowebSkinVariant()).toBe("red");
    expect(localStorage.getItem(AOWEB_SKIN_STORAGE_KEY)).toBe("red");
  });

  it("usa VITE_UI_SKIN si no hay valor guardado", () => {
    vi.stubEnv("VITE_UI_SKIN", "white");
    expect(getAowebSkinVariant()).toBe("white");
  });

  it("asigna textura por variante", () => {
    expect(getAowebSkinTextureKey("dark")).toBe("aoweb_skin_dark");
    expect(AOWEB_SKIN_FILES.white).toBe("UIAOWEBWhite.png");
  });
});
