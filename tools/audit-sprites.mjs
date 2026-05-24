import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const configPath = path.resolve(__dirname, "sprite-sheet-standards.json");
const outputPath = path.resolve(__dirname, "sprite-audit-report.json");

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function frameBounds(png, frameX, frameY, frameWidth, frameHeight) {
  let minX = frameWidth;
  let minY = frameHeight;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < frameHeight; y++) {
    const sourceY = frameY + y;
    for (let x = 0; x < frameWidth; x++) {
      const sourceX = frameX + x;
      const pixelIndex = (sourceY * png.width + sourceX) * 4;
      const alpha = png.data[pixelIndex + 3];
      if (alpha === 0) continue;

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0 || maxY < 0) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

async function main() {
  const configRaw = await fs.readFile(configPath, "utf8");
  const config = JSON.parse(configRaw);
  const results = [];
  const byId = new Map();

  for (const sheet of config.sheets) {
    const absolutePath = path.resolve(workspaceRoot, sheet.path);
    const buffer = await fs.readFile(absolutePath);
    const png = PNG.sync.read(buffer);
    const cols = Math.floor(png.width / sheet.frameWidth);
    const rows = Math.floor(png.height / sheet.frameHeight);
    const totalFrames = sheet.frames ?? cols * rows;
    const centersX = [];
    const bottomsY = [];
    let emptyFrames = 0;

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const col = frameIndex % cols;
      const row = Math.floor(frameIndex / cols);
      const frameX = col * sheet.frameWidth;
      const frameY = row * sheet.frameHeight;
      const bounds = frameBounds(png, frameX, frameY, sheet.frameWidth, sheet.frameHeight);
      if (!bounds) {
        emptyFrames++;
        continue;
      }
      centersX.push((bounds.minX + bounds.maxX) / 2);
      bottomsY.push(bounds.maxY);
    }

    const result = {
      id: sheet.id,
      path: sheet.path,
      imageWidth: png.width,
      imageHeight: png.height,
      frameWidth: sheet.frameWidth,
      frameHeight: sheet.frameHeight,
      grid: { cols, rows },
      framesAnalyzed: totalFrames,
      emptyFrames,
      averageOpaqueCenterX: Number(average(centersX).toFixed(2)),
      averageOpaqueBottomY: Number(average(bottomsY).toFixed(2)),
      warnings: [],
      recommendedOffsetFromReference: null,
    };

    if (png.width % sheet.frameWidth !== 0) {
      result.warnings.push(
        `image width ${png.width} is not divisible by frame width ${sheet.frameWidth}`
      );
    }
    if (png.height % sheet.frameHeight !== 0) {
      result.warnings.push(
        `image height ${png.height} is not divisible by frame height ${sheet.frameHeight}`
      );
    }
    if (totalFrames > cols * rows) {
      result.warnings.push(
        `requested frames ${totalFrames} exceeds grid capacity ${cols * rows}`
      );
    }
    if (emptyFrames > 0) {
      result.warnings.push(`contains ${emptyFrames} empty frames`);
    }

    results.push(result);
    byId.set(result.id, result);
  }

  for (const result of results) {
    const sheetConfig = config.sheets.find((sheet) => sheet.id === result.id);
    if (!sheetConfig?.referenceId) continue;
    const reference = byId.get(sheetConfig.referenceId);
    if (!reference) {
      result.warnings.push(`reference sheet "${sheetConfig.referenceId}" was not found`);
      continue;
    }
    result.recommendedOffsetFromReference = {
      referenceId: reference.id,
      offsetX: Number((reference.averageOpaqueCenterX - result.averageOpaqueCenterX).toFixed(2)),
      offsetY: Number((reference.averageOpaqueBottomY - result.averageOpaqueBottomY).toFixed(2)),
    };
  }

  const report = {
    generatedAt: new Date().toISOString(),
    configPath: path.relative(workspaceRoot, configPath),
    outputPath: path.relative(workspaceRoot, outputPath),
    results,
  };

  await fs.writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log(`Sprite audit report generated: ${path.relative(workspaceRoot, outputPath)}`);
  for (const entry of results) {
    const offset = entry.recommendedOffsetFromReference
      ? ` | refOffset(x:${entry.recommendedOffsetFromReference.offsetX}, y:${entry.recommendedOffsetFromReference.offsetY})`
      : "";
    console.log(
      `- ${entry.id}: centerX=${entry.averageOpaqueCenterX}, bottomY=${entry.averageOpaqueBottomY}${offset}`
    );
    for (const warning of entry.warnings) {
      console.log(`  warning: ${warning}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
