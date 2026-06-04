/**
 * Copia al repo los .wav usados por SPELL_CAST_META (índice = nombre de archivo).
 *
 * Origen por defecto (Imperium Clásico):
 *   .../Fixtures/Recursos descomprimidos/Wav/{n}.wav
 *
 * Uso:
 *   node tools/copy-spell-wavs.mjs
 *   IMPERIUM_WAV_DIR="D:/otra/ruta/Wav" node tools/copy-spell-wavs.mjs
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const DEFAULT_SRC =
  process.env.IMPERIUM_WAV_DIR ??
  "C:/Users/imaga/Desktop/Imperium-Clasico/Fixtures/Recursos descomprimidos/Wav";

const DEST = join(ROOT, "public/assets/ao/wav");

const metaPath = join(ROOT, "game-data/spellCastMeta.ts");
const metaText = readFileSync(metaPath, "utf8");
const indices = new Set();
for (const m of metaText.matchAll(/wav:\s*(\d+)/g)) {
  const n = Number(m[1]);
  if (n > 0) indices.add(n);
}

mkdirSync(DEST, { recursive: true });

let copied = 0;
let missing = [];
for (const id of [...indices].sort((a, b) => a - b)) {
  const src = join(DEFAULT_SRC, `${id}.wav`);
  const dest = join(DEST, `${id}.wav`);
  if (!existsSync(src)) {
    missing.push(id);
    continue;
  }
  copyFileSync(src, dest);
  copied++;
}

console.log(`Copied ${copied} wav → public/assets/ao/wav/`);
if (missing.length) {
  console.warn(`Missing (${missing.length}):`, missing.join(", "));
}

const namedPath = join(ROOT, "game-data/namedWavs.ts");
const namedText = readFileSync(namedPath, "utf8");
const namedFiles = [...namedText.matchAll(/:\s*"([^"]+\.wav)"/g)].map((m) => m[1]);

const IMPERIUM_ALIASES = [
  ["araña.wav", "arana.wav"],
  ["Araña.wav", "arana.wav"],
];

for (const destName of namedFiles) {
  let src = join(DEFAULT_SRC, destName);
  if (!existsSync(src)) {
    const alias = IMPERIUM_ALIASES.find(([, d]) => d === destName);
    if (alias) {
      src = join(DEFAULT_SRC, alias[0]);
    }
  }
  const dest = join(DEST, destName);
  if (!existsSync(src)) {
    console.warn(`Missing named wav: ${destName}`);
    continue;
  }
  copyFileSync(src, dest);
  console.log(`Copied named ${destName}`);
}

for (const name of ["step.wav", "step2.wav"]) {
  const src = join(DEFAULT_SRC, name);
  const dest = join(DEST, name);
  if (!existsSync(src)) {
    console.warn(`Missing footstep: ${name}`);
    continue;
  }
  copyFileSync(src, dest);
  console.log(`Copied footstep ${name}`);
}
