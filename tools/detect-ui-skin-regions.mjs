/**
 * Detecta huecos en skin UI (píxeles muy oscuros opacos).
 */
import fs from "fs";
import { PNG } from "pngjs";

const file = process.argv[2] ?? "public/assets/ao/uiGrafica/UIAOWEBDark.png";
const buf = fs.readFileSync(file);
const png = PNG.sync.read(buf);
const { width: W, height: H } = png;

function lum(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function connectedBoxes(mask, minArea) {
  const seen = new Uint8Array(W * H);
  const boxes = [];
  for (let sy = 0; sy < H; sy++) {
    for (let sx = 0; sx < W; sx++) {
      const start = sy * W + sx;
      if (!mask[start] || seen[start]) continue;
      const stack = [[sx, sy]];
      seen[start] = 1;
      let minX = sx,
        minY = sy,
        maxX = sx,
        maxY = sy,
        area = 0;
      while (stack.length) {
        const [x, y] = stack.pop();
        area++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const ni = ny * W + nx;
          if (!mask[ni] || seen[ni]) continue;
          seen[ni] = 1;
          stack.push([nx, ny]);
        }
      }
      if (area >= minArea)
        boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area });
    }
  }
  boxes.sort((a, b) => b.area - a.area);
  return boxes;
}

function darkMask(maxLum) {
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) << 2;
      const L = lum(png.data[i], png.data[i + 1], png.data[i + 2]);
      const a = png.data[i + 3];
      mask[y * W + x] = a > 200 && L < maxLum ? 1 : 0;
    }
  }
  return mask;
}

function cropMask(mask, x0, y0, x1, y1) {
  const m2 = new Uint8Array(W * H);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      m2[y * W + x] = mask[y * W + x];
    }
  }
  return m2;
}

console.log(`File: ${file} (${W}x${H})\n`);

const m15 = darkMask(15);
const all = connectedBoxes(m15, 3000);
console.log("All components (lum<15, area>=3000):");
for (const b of all.slice(0, 20)) {
  console.log(`  { x: ${b.x}, y: ${b.y}, w: ${b.w}, h: ${b.h} }, // ${b.area}`);
}

const zones = [
  ["top-left (chat)", 0, 0, 1050, 220],
  ["right sidebar", 980, 150, W, H - 120],
  ["bottom-left (macros)", 0, H - 150, 700, H],
  ["bottom-right (stats)", 600, H - 200, 1100, H],
  ["minimap zone", 1050, 500, W, H - 100],
];

for (const [name, x0, y0, x1, y1] of zones) {
  const cropped = cropMask(m15, x0, y0, x1, y1);
  const boxes = connectedBoxes(cropped, 800);
  console.log(`\n${name}:`);
  for (const b of boxes.slice(0, 5)) {
    console.log(`  { x: ${b.x}, y: ${b.y}, w: ${b.w}, h: ${b.h} },`);
  }
}

// Compare to 1024-scaled current
const OLD = {
  viewport: { x: 20, y: 132, w: 661, h: 556 },
  chatHistory: { x: 36, y: 22, w: 560, h: 88 },
  inventoryPanel: { x: 706, y: 182, w: 296, h: 232 },
  hpBar: { x: 741, y: 454, w: 111, h: 27 },
  minimap: { x: 834, y: 564, w: 160, h: 160 },
};
const sx = W / 1024;
const sy = H / 768;
console.log("\nCurrent regions scaled to PNG px:");
for (const [k, r] of Object.entries(OLD)) {
  console.log(
    `  ${k}: { x: ${Math.round(r.x * sx)}, y: ${Math.round(r.y * sy)}, w: ${Math.round(r.w * sx)}, h: ${Math.round(r.h * sy)} }`
  );
}
