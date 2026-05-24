import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");

const FRAME_W = 32;
const FRAME_H = 48;
const INNER_MARGIN = 1;

const basePath = path.resolve(
  workspaceRoot,
  "public/assets/ao/razes/human_male_base.png"
);
const armorPath = path.resolve(
  workspaceRoot,
  "public/assets/ao/armors/armor_cuero_std.png"
);

function frameBounds(png, frameX, frameY, frameW, frameH) {
  let minX = frameW;
  let minY = frameH;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < frameH; y++) {
    for (let x = 0; x < frameW; x++) {
      const srcX = frameX + x;
      const srcY = frameY + y;
      const idx = (srcY * png.width + srcX) * 4;
      if (png.data[idx + 3] === 0) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0 || maxY < 0) return null;
  return { minX, minY, maxX, maxY };
}

function copyAlignedFrame({
  srcPng,
  outPng,
  srcFrameX,
  srcFrameY,
  outFrameX,
  outFrameY,
  shiftX,
  shiftY,
}) {
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const srcX = srcFrameX + x;
      const srcY = srcFrameY + y;
      const srcIdx = (srcY * srcPng.width + srcX) * 4;
      const alpha = srcPng.data[srcIdx + 3];
      if (alpha === 0) continue;

      const dstX = outFrameX + x + shiftX;
      const dstY = outFrameY + y + shiftY;

      if (
        dstX < outFrameX + INNER_MARGIN ||
        dstX > outFrameX + FRAME_W - 1 - INNER_MARGIN ||
        dstY < outFrameY + INNER_MARGIN ||
        dstY > outFrameY + FRAME_H - 1 - INNER_MARGIN
      ) {
        continue;
      }

      const dstIdx = (dstY * outPng.width + dstX) * 4;
      outPng.data[dstIdx] = srcPng.data[srcIdx];
      outPng.data[dstIdx + 1] = srcPng.data[srcIdx + 1];
      outPng.data[dstIdx + 2] = srcPng.data[srcIdx + 2];
      outPng.data[dstIdx + 3] = alpha;
    }
  }
}

async function main() {
  const baseBuffer = await fs.readFile(basePath);
  const armorBuffer = await fs.readFile(armorPath);
  const basePng = PNG.sync.read(baseBuffer);
  const armorPng = PNG.sync.read(armorBuffer);

  if (basePng.width !== armorPng.width || basePng.height !== armorPng.height) {
    throw new Error("Base y cuero no tienen el mismo tamaño de sheet.");
  }
  if (basePng.width % FRAME_W !== 0 || basePng.height % FRAME_H !== 0) {
    throw new Error("El sheet no coincide con frame 32x48.");
  }

  const cols = basePng.width / FRAME_W;
  const rows = basePng.height / FRAME_H;
  const frameCount = cols * rows;
  const outPng = new PNG({ width: armorPng.width, height: armorPng.height, colorType: 6 });
  const stats = [];

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const col = frameIndex % cols;
    const row = Math.floor(frameIndex / cols);
    const frameX = col * FRAME_W;
    const frameY = row * FRAME_H;

    const baseBounds = frameBounds(basePng, frameX, frameY, FRAME_W, FRAME_H);
    const armorBounds = frameBounds(armorPng, frameX, frameY, FRAME_W, FRAME_H);

    if (!armorBounds) {
      stats.push({ frameIndex, shiftX: 0, shiftY: 0, note: "empty armor frame" });
      continue;
    }

    const targetCenterX = baseBounds
      ? (baseBounds.minX + baseBounds.maxX) / 2
      : (FRAME_W - 1) / 2;
    const targetBottomY = baseBounds ? baseBounds.maxY : FRAME_H - 1 - INNER_MARGIN;
    const armorCenterX = (armorBounds.minX + armorBounds.maxX) / 2;
    const armorBottomY = armorBounds.maxY;

    const shiftX = Math.round(targetCenterX - armorCenterX);
    const shiftY = Math.round(targetBottomY - armorBottomY);

    copyAlignedFrame({
      srcPng: armorPng,
      outPng,
      srcFrameX: frameX,
      srcFrameY: frameY,
      outFrameX: frameX,
      outFrameY: frameY,
      shiftX,
      shiftY,
    });

    stats.push({ frameIndex, shiftX, shiftY });
  }

  await fs.writeFile(armorPath, PNG.sync.write(outPng));

  const reportPath = path.resolve(__dirname, "rebuild-cuero-report.json");
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceBase: path.relative(workspaceRoot, basePath),
        sourceArmor: path.relative(workspaceRoot, armorPath),
        frameWidth: FRAME_W,
        frameHeight: FRAME_H,
        innerMargin: INNER_MARGIN,
        stats,
      },
      null,
      2
    ) + "\n"
  );

  console.log("Rebuilt armor_cuero_std.png aligned to base model.");
  console.log(`Report: ${path.relative(workspaceRoot, reportPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
