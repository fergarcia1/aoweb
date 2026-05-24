import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const configPath = path.resolve(__dirname, "sprite-sheet-standards.json");
const outputRoot = path.resolve(workspaceRoot, "public/assets/ao/_normalized");
const reportPath = path.resolve(__dirname, "sprite-normalize-report.json");

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

  if (maxX < 0 || maxY < 0) return null;
  return { minX, minY, maxX, maxY };
}

function getSheetMetrics(png, frameWidth, frameHeight, frameCount) {
  const cols = Math.floor(png.width / frameWidth);
  const centersX = [];
  const bottomsY = [];
  const boundsByFrame = [];

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const col = frameIndex % cols;
    const row = Math.floor(frameIndex / cols);
    const frameX = col * frameWidth;
    const frameY = row * frameHeight;
    const bounds = frameBounds(png, frameX, frameY, frameWidth, frameHeight);
    boundsByFrame.push(bounds);
    if (!bounds) continue;
    centersX.push((bounds.minX + bounds.maxX) / 2);
    bottomsY.push(bounds.maxY);
  }

  const avgCenterX =
    centersX.length === 0 ? 0 : centersX.reduce((sum, value) => sum + value, 0) / centersX.length;
  const avgBottomY =
    bottomsY.length === 0 ? 0 : bottomsY.reduce((sum, value) => sum + value, 0) / bottomsY.length;

  return { avgCenterX, avgBottomY, cols, boundsByFrame };
}

function blitShiftedFrame({
  srcPng,
  outPng,
  srcFrameX,
  srcFrameY,
  destFrameX,
  destFrameY,
  frameWidth,
  frameHeight,
  shiftX,
  shiftY,
}) {
  for (let y = 0; y < frameHeight; y++) {
    for (let x = 0; x < frameWidth; x++) {
      const srcX = srcFrameX + x;
      const srcY = srcFrameY + y;
      const destX = destFrameX + x + shiftX;
      const destY = destFrameY + y + shiftY;

      if (destX < destFrameX || destX >= destFrameX + frameWidth) continue;
      if (destY < destFrameY || destY >= destFrameY + frameHeight) continue;

      const srcIdx = (srcY * srcPng.width + srcX) * 4;
      const alpha = srcPng.data[srcIdx + 3];
      if (alpha === 0) continue;

      const destIdx = (destY * outPng.width + destX) * 4;
      outPng.data[destIdx] = srcPng.data[srcIdx];
      outPng.data[destIdx + 1] = srcPng.data[srcIdx + 1];
      outPng.data[destIdx + 2] = srcPng.data[srcIdx + 2];
      outPng.data[destIdx + 3] = srcPng.data[srcIdx + 3];
    }
  }
}

async function main() {
  const configRaw = await fs.readFile(configPath, "utf8");
  const config = JSON.parse(configRaw);
  const sheetsById = new Map(config.sheets.map((sheet) => [sheet.id, sheet]));
  const cachedPng = new Map();
  const report = [];

  await fs.mkdir(outputRoot, { recursive: true });

  async function loadPng(sheet) {
    if (cachedPng.has(sheet.id)) return cachedPng.get(sheet.id);
    const absPath = path.resolve(workspaceRoot, sheet.path);
    const buffer = await fs.readFile(absPath);
    const png = PNG.sync.read(buffer);
    const frameCount =
      sheet.frames ??
      Math.floor(png.width / sheet.frameWidth) * Math.floor(png.height / sheet.frameHeight);
    const metrics = getSheetMetrics(png, sheet.frameWidth, sheet.frameHeight, frameCount);
    const value = { png, frameCount, metrics, absPath };
    cachedPng.set(sheet.id, value);
    return value;
  }

  for (const sheet of config.sheets) {
    if (!sheet.referenceId) continue;
    const referenceSheet = sheetsById.get(sheet.referenceId);
    if (!referenceSheet) continue;

    const src = await loadPng(sheet);
    const ref = await loadPng(referenceSheet);
    const outPng = new PNG({
      width: src.png.width,
      height: src.png.height,
      colorType: 6,
    });

    const cols = Math.floor(src.png.width / sheet.frameWidth);
    const frameShifts = [];
    for (let frameIndex = 0; frameIndex < src.frameCount; frameIndex++) {
      const col = frameIndex % cols;
      const row = Math.floor(frameIndex / cols);
      const frameX = col * sheet.frameWidth;
      const frameY = row * sheet.frameHeight;
      const srcBounds = src.metrics.boundsByFrame[frameIndex] ?? null;
      const refBounds = ref.metrics.boundsByFrame[frameIndex] ?? null;
      const shiftX =
        srcBounds && refBounds
          ? Math.round((refBounds.minX + refBounds.maxX - (srcBounds.minX + srcBounds.maxX)) / 2)
          : 0;
      const shiftY =
        srcBounds && refBounds ? Math.round(refBounds.maxY - srcBounds.maxY) : 0;
      frameShifts.push({ frameIndex, shiftX, shiftY });
      blitShiftedFrame({
        srcPng: src.png,
        outPng,
        srcFrameX: frameX,
        srcFrameY: frameY,
        destFrameX: frameX,
        destFrameY: frameY,
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
        shiftX,
        shiftY,
      });
    }

    const outputName = `${sheet.id}.png`;
    const outputPath = path.resolve(outputRoot, outputName);
    await fs.writeFile(outputPath, PNG.sync.write(outPng));

    report.push({
      id: sheet.id,
      source: path.relative(workspaceRoot, src.absPath),
      referenceId: referenceSheet.id,
      averageShiftX:
        frameShifts.length > 0
          ? Number(
              (
                frameShifts.reduce((sum, frameShift) => sum + frameShift.shiftX, 0) /
                frameShifts.length
              ).toFixed(2)
            )
          : 0,
      averageShiftY:
        frameShifts.length > 0
          ? Number(
              (
                frameShifts.reduce((sum, frameShift) => sum + frameShift.shiftY, 0) /
                frameShifts.length
              ).toFixed(2)
            )
          : 0,
      frameShifts,
      output: path.relative(workspaceRoot, outputPath),
    });
  }

  await fs.writeFile(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2));

  console.log(`Normalized sprites generated in: ${path.relative(workspaceRoot, outputRoot)}`);
  for (const entry of report) {
    console.log(`- ${entry.id}: avg shift x=${entry.averageShiftX}, y=${entry.averageShiftY} -> ${entry.output}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
