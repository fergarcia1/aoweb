/**
 * Extrae PNGs de un video de referencia del cliente AO (para comparar movimiento/UI).
 *
 * Uso:
 *   node tools/extract-ao-reference-frames.mjs --input "C:/ruta/video.mp4" --name horizontal-walk
 *   node tools/extract-ao-reference-frames.mjs --input "C:/ruta/video.mp4" --name horizontal-walk --fps 12
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs() {
  const args = process.argv.slice(2);
  let input = null;
  let name = "clip";
  let fps = 10;

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--input") input = args[++i];
    else if (args[i] === "--name") name = args[++i];
    else if (args[i] === "--fps") fps = Number(args[++i]);
  }

  if (!input) {
    console.error(
      "Uso: node tools/extract-ao-reference-frames.mjs --input <video.mp4> [--name carpeta] [--fps 10]"
    );
    process.exit(1);
  }

  return {
    input: path.resolve(input),
    name: name.replace(/[^\w.-]+/g, "-"),
    fps,
  };
}

function run(cmd, cmdArgs) {
  const result = spawnSync(cmd, cmdArgs, { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    throw new Error(`${cmd} falló`);
  }
  return result.stdout;
}

function main() {
  const { input, name, fps } = parseArgs();
  if (!fs.existsSync(input)) {
    console.error(`No existe: ${input}`);
    process.exit(1);
  }

  const outDir = path.join(root, "tools/reference/ao-client-frames", name);
  fs.mkdirSync(outDir, { recursive: true });

  const probe = run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    input,
  ]);
  console.log(`Duración: ${probe.trim()}s`);

  run("ffmpeg", ["-y", "-i", input, "-vf", `fps=${fps}`, path.join(outDir, "frame_%03d.png")]);

  const count = fs.readdirSync(outDir).filter((f) => f.endsWith(".png")).length;
  console.log(`OK -> ${outDir} (${count} frames @ ${fps} fps)`);
}

main();
