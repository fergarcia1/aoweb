/**
 * Quita prefijos redundantes helm_, armor_, shield_, weapon_ en PNGs de equipo.
 * Uso: node tools/rename-equipment-prefixes.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "assets", "ao");

const PREFIX_BY_DIR = {
  helms: "helm_",
  armors: "armor_",
  shields: "shield_",
  weapons: "weapon_",
};

for (const [dirName, prefix] of Object.entries(PREFIX_BY_DIR)) {
  const dir = path.join(root, dirName);
  if (!fs.existsSync(dir)) continue;

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".png") || !file.startsWith(prefix)) continue;
    const from = path.join(dir, file);
    const to = path.join(dir, file.slice(prefix.length));
    if (fs.existsSync(to)) {
      console.warn(`SKIP (exists): ${dirName}/${file} -> ${path.basename(to)}`);
      continue;
    }
    fs.renameSync(from, to);
    console.log(`${dirName}/${file} -> ${path.basename(to)}`);
  }
}
