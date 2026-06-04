import { MAP_MAPA1 } from "../src/maps/mapa1.ts";

const m = MAP_MAPA1;
const legacy = m.legacyCsmData;

// Check L4 tiles near temple area (y=24-34, x=39-47)
console.log("=== L4 tiles near temple ===");
for (let ty = 22; ty <= 36; ty++) {
  const row = [];
  for (let tx = 38; tx <= 48; tx++) {
    const l4 = legacy.L4[ty]?.[tx] ?? 0;
    const l3 = legacy.L3[ty]?.[tx] ?? 0;
    if (l4 > 0 || l3 > 0) {
      row.push(`(${tx},${ty}) L3=${l3} L4=${l4}`);
    }
  }
  if (row.length) console.log(row.join("  |  "));
}

// Count total L4 tiles
let totalL4 = 0;
for (let ty = 0; ty < m.height; ty++) {
  for (let tx = 0; tx < m.width; tx++) {
    if ((legacy.L4[ty]?.[tx] ?? 0) > 0) totalL4++;
  }
}
console.log(`Total L4 tiles: ${totalL4}`);
