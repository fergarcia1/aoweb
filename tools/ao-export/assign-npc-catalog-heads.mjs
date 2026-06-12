/**
 * Asigna apariencia de cabeza (raza/género/cara) al catálogo Imperium.
 * Aleatorio estable por npcId hasta mapear Head de NPCs.dat → caras AO.
 *
 * Uso: node tools/ao-export/assign-npc-catalog-heads.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const CATALOG_JSON = path.join(REPO_ROOT, "game-data/imperium/npcCatalog.json");
const BODY_VISUALS_JSON = path.join(REPO_ROOT, "game-data/imperium/npcBodyVisuals.json");

const RACES = ["human", "elf", "drow", "dwarf", "gnome", "orc"];
const GENDERS = ["male", "female"];
const FACE_COUNT = 11;

/** Criaturas muy chicas: sin cara humana encima. */
const MIN_FRAME_H_FOR_FACE = 28;

function seededIndex(seed, salt, modulo) {
  let h = (seed * 2654435761 + salt * 1597334677) >>> 0;
  return modulo > 0 ? h % modulo : 0;
}

function shouldAssignFace(entry, bodyVisual) {
  if (entry.visual?.status !== "ready") return false;
  if (!bodyVisual || bodyVisual.status !== "ready") return false;
  const h = bodyVisual.frameHeight ?? 0;
  if (h > 0 && h < MIN_FRAME_H_FOR_FACE) return false;
  return true;
}

function buildFaceAppearance(npcId, bodyVisual) {
  const raceId = RACES[seededIndex(npcId, 11, RACES.length)];
  const genderId = GENDERS[seededIndex(npcId, 22, GENDERS.length)];
  const faceIndex = seededIndex(npcId, 33, FACE_COUNT);

  const headOffsetY = bodyVisual.headOffsetY ?? 0;
  const headOffsetX = bodyVisual.headOffsetX ?? 0;
  const frameH = bodyVisual.frameHeight ?? 48;

  return {
    raceId,
    genderId,
    faceIndex,
    faceDropY: Math.round(headOffsetY * 0.4) + (frameH <= 36 ? 10 : 6),
    faceOffsetX: Math.round(headOffsetX * 0.25),
    source: "random_seeded",
  };
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_JSON, "utf8"));
  const bodyVisuals = JSON.parse(fs.readFileSync(BODY_VISUALS_JSON, "utf8"));
  const byBodyId = bodyVisuals.byBodyId ?? {};

  let assigned = 0;
  let skipped = 0;

  for (const entry of catalog.entries) {
    if (!entry.visual) {
      entry.visual = {
        status: "not_built",
        bodyId: entry.body,
        head: entry.head,
      };
    }

    const bodyVisual = byBodyId[String(entry.body)] ?? byBodyId[entry.body];
    if (!shouldAssignFace(entry, bodyVisual)) {
      entry.visual.face = null;
      skipped += 1;
      continue;
    }

    entry.visual.face = buildFaceAppearance(entry.npcId, bodyVisual);
    assigned += 1;
  }

  catalog.meta.facesAssignedAt = new Date().toISOString();
  catalog.meta.faceAssignment = {
    assigned,
    skipped,
    minFrameHeightForFace: MIN_FRAME_H_FOR_FACE,
    faceCount: FACE_COUNT,
    races: RACES,
  };

  fs.writeFileSync(CATALOG_JSON, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  console.log(`Caras asignadas: ${assigned}`);
  console.log(`Sin cara (visual no listo o cuerpo muy chico): ${skipped}`);
  console.log(`Catálogo actualizado: ${CATALOG_JSON}`);
}

main();
