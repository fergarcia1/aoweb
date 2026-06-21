import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(serverRoot, "..");
const renderFreeMapsPath = resolve(repoRoot, "shared/renderFreeMaps.ts");
const useRenderFreeMaps = process.env.AOWEB_FREE_MAPS === "1";

const sharedMapsAliasPlugin = {
  name: "shared-maps-alias",
  setup(build) {
    build.onResolve({ filter: /^(\.\.\/\.\.\/shared\/maps|\.\.\/\.\.\/\.\.\/shared\/maps|\.\.\/shared\/maps)$/ }, () => ({
      path: renderFreeMapsPath,
    }));

    build.onResolve({ filter: /^\.\/maps$/ }, (args) => {
      if (args.importer.replaceAll("\\", "/").endsWith("/shared/mapWalkability.ts")) {
        return { path: renderFreeMapsPath };
      }
      if (args.importer.replaceAll("\\", "/").endsWith("/shared/mapEdgeZones.ts")) {
        return { path: renderFreeMapsPath };
      }
      if (args.importer.replaceAll("\\", "/").endsWith("/shared/mobSpawns.ts")) {
        return { path: renderFreeMapsPath };
      }
      return undefined;
    });
  },
};

await build({
  entryPoints: [resolve(serverRoot, "src/index.ts")],
  outfile: resolve(serverRoot, "dist/index.js"),
  absWorkingDir: repoRoot,
  bundle: true,
  minify: true,
  platform: "node",
  format: "esm",
  target: "node22",
  packages: "external",
  plugins: useRenderFreeMaps ? [sharedMapsAliasPlugin] : [],
});
