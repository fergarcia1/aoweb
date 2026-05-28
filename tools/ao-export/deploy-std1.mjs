/**
 * Copia los *_std.png generados al proyecto (armors + iconos si existen).
 *
 *   node tools/ao-export/deploy-std1.mjs
 *   node tools/ao-export/deploy-std1.mjs --from "C:/Users/imaga/Desktop/output Script"
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const defaultFrom = "C:/Users/imaga/Desktop/output Script";
const armorsDir = path.join(projectRoot, "public/assets/ao/armors");

function parseArgs() {
  const args = process.argv.slice(2);
  let fromDir = defaultFrom;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--from") fromDir = args[++i];
  }
  return { fromDir: path.resolve(fromDir) };
}

function main() {
  const { fromDir } = parseArgs();
  if (!fs.existsSync(fromDir)) {
    console.error(`No existe la carpeta: ${fromDir}`);
    process.exit(1);
  }

  fs.mkdirSync(armorsDir, { recursive: true });

  const files = fs
    .readdirSync(fromDir)
    .filter(
      (name) =>
        name.toLowerCase().endsWith(".png") &&
        /_std\.png$/i.test(name) &&
        !/_std1_raw\.png$/i.test(name)
    );

  if (files.length === 0) {
    console.error(`No hay PNG *_std en ${fromDir}`);
    process.exit(1);
  }

  let copied = 0;
  for (const name of files) {
    const src = path.join(fromDir, name);
    const dest = path.join(armorsDir, name);
    fs.copyFileSync(src, dest);
    copied += 1;
    console.log(`${name} -> public/assets/ao/armors/`);
  }

  console.log(`Listo: ${copied} archivo(s) copiados a armors.`);
}

main();
