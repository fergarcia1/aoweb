import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");

const DEFAULT_FILES = [
  "game-data/items/catalog.ts",
  "game-data/mobVisualConfig.ts",
  "game-data/spellEffects.ts",
  "shared/npcDefinitions.ts",
  "src/player/playerSprites.ts",
  "src/player/raceFaces.ts",
  "src/terrain/aoTerrain.ts",
  "src/maps/portalVisuals.ts",
  "src/ui/loginMusic.ts",
];

const ASSET_PATH_RE = /["'`](\/?assets\/[^"'`]+?\.(?:png|jpg|jpeg|webp|mp3|wav|ogg))["'`]/gi;

function normalizeAssetPath(rawPath) {
  return rawPath.replace(/^\/+/, "").replace(/\\/g, "/");
}

function fileExistsCaseInsensitive(relativeAssetPath) {
  const parts = relativeAssetPath.split("/");
  let current = publicDir;

  for (const part of parts) {
    if (!fs.existsSync(current)) {
      return false;
    }
    const entries = fs.readdirSync(current);
    const exact = entries.find((entry) => entry === part);
    const match = exact ?? entries.find((entry) => entry.toLowerCase() === part.toLowerCase());
    if (!match) {
      return false;
    }
    current = path.join(current, match);
  }

  return fs.existsSync(current);
}

function collectAssetRefs(filePath) {
  const absolutePath = path.resolve(root, filePath);
  if (!fs.existsSync(absolutePath)) {
    return [];
  }
  const source = fs.readFileSync(absolutePath, "utf8");
  const refs = [];
  let match;
  while ((match = ASSET_PATH_RE.exec(source)) != null) {
    refs.push({
      sourceFile: filePath,
      rawPath: match[1],
      assetPath: normalizeAssetPath(match[1]),
    });
  }
  return refs;
}

function main() {
  const inputFiles = process.argv.slice(2);
  const files = inputFiles.length > 0 ? inputFiles : DEFAULT_FILES;
  const refs = files.flatMap(collectAssetRefs);
  const byPath = new Map();

  for (const ref of refs) {
    if (ref.rawPath.includes("${")) {
      continue;
    }
    const list = byPath.get(ref.assetPath) ?? [];
    list.push(ref);
    byPath.set(ref.assetPath, list);
  }

  const missing = [];
  const caseMismatches = [];

  for (const [assetPath, locations] of [...byPath.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const absolutePath = path.join(publicDir, assetPath);
    if (fs.existsSync(absolutePath)) {
      continue;
    }
    if (fileExistsCaseInsensitive(assetPath)) {
      caseMismatches.push({ assetPath, locations: locations.map((ref) => ref.sourceFile) });
      continue;
    }
    missing.push({ assetPath, locations: locations.map((ref) => ref.sourceFile) });
  }

  const report = {
    checkedFiles: files,
    referencedAssets: byPath.size,
    missing,
    caseMismatches,
  };

  console.log(JSON.stringify(report, null, 2));

  if (missing.length > 0 || caseMismatches.length > 0) {
    process.exitCode = 1;
  }
}

main();
