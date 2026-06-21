import { defineConfig, type Plugin } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const renderFreeMapsPath = resolve(repoRoot, "shared/renderFreeMaps.ts");

function shouldUseRenderFreeMaps(): boolean {
  return process.env.AOWEB_FREE_MAPS === "1" || process.env.VITE_FREE_MAPS === "1";
}

function isSharedMapsFacade(source: string, importer?: string): boolean {
  const normalizedSource = source.replaceAll("\\", "/");
  const normalizedImporter = importer?.replaceAll("\\", "/") ?? "";

  if (normalizedSource.endsWith("/shared/maps") || normalizedSource.endsWith("/shared/maps.ts")) {
    return true;
  }

  if (
    normalizedSource === "./maps" &&
    (normalizedImporter.endsWith("/shared/mapWalkability.ts") ||
      normalizedImporter.endsWith("/shared/mapEdgeZones.ts") ||
      normalizedImporter.endsWith("/shared/mobSpawns.ts"))
  ) {
    return true;
  }

  return false;
}

function renderFreeMapsAliasPlugin(): Plugin {
  return {
    name: "render-free-maps-alias",
    enforce: "pre",
    resolveId(source: string, importer?: string) {
      if (isSharedMapsFacade(source, importer)) {
        return renderFreeMapsPath;
      }

      return null;
    },
  };
}

export default defineConfig({
  plugins: shouldUseRenderFreeMaps() ? [renderFreeMapsAliasPlugin()] : [],
  test: {
    include: ["tests/**/*.test.ts"],
  },
  server: {
    port: 5173,
    host: true,
    open: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 2000,
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
          game: ["./src/scenes/GameScene", "./src/network/RemotePlayerManager"],
        },
      },
    },
  },
});
