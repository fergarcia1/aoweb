/**
 * Añade `transitions: []` a mapa1–mapa10 si falta (opción 8 auditoría).
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const mapsDir = join(dirname(fileURLToPath(import.meta.url)), "../src/maps");

for (let n = 1; n <= 10; n++) {
  const path = join(mapsDir, `mapa${n}.ts`);
  let text = readFileSync(path, "utf8");
  if (text.includes("transitions:")) {
    console.log(`mapa${n}: ya tiene transitions`);
    continue;
  }
  const needle = "  groundOverlays: [],\n  legacyCsmData:";
  if (!text.includes(needle)) {
    throw new Error(`mapa${n}: patrón no encontrado`);
  }
  text = text.replace(
    needle,
    "  groundOverlays: [],\n  transitions: [],\n  legacyCsmData:"
  );
  writeFileSync(path, text, "utf8");
  console.log(`mapa${n}: transitions: [] añadido`);
}
