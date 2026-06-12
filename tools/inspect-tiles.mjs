import { readFileSync } from "fs";

const mapId = process.argv[2] || "mapa1";
const src = readFileSync(`./src/maps/${mapId}.ts`, "utf8");

const l3Match = src.match(/^const L3 = (\[\[.*\]\]);/m);
const L3 = l3Match ? JSON.parse(l3Match[1]) : null;

const l4Match = src.match(/^const L4 = (\[\[.*\]\]);/m);
const L4 = l4Match ? JSON.parse(l4Match[1]) : null;

function getTileRows() {
  const rows = [];
  let inTiles = false;
  for (const line of src.split("\n")) {
    if (line.includes("tiles: [")) {
      inTiles = true;
      continue;
    }
    if (!inTiles) continue;
    const t = line.trim();
    if (t.startsWith("[TILE.")) {
      rows.push(t.slice(1, -1).split(", "));
    } else if (t === "],") break;
  }
  return rows;
}

const tiles = getTileRows();

const rtMatch = src.match(/roofTriggers:\s*(\[[\s\S]*?\])\s*,\s*\n\s*legacyCsmData/);
let roofTriggers = [];
if (rtMatch) {
  roofTriggers = JSON.parse(rtMatch[1].replace(/(\w+):/g, '"$1":'));
}

console.log("roofTriggers:", roofTriggers.length);
const rtSet = new Set(roofTriggers.map((t) => `${t.tileX},${t.tileY}`));

const check = (x, y) => {
  const tile = tiles[y]?.[x] ?? "?";
  const l3 = L3?.[y]?.[x] ?? 0;
  const l4 = L4?.[y]?.[x] ?? 0;
  const rt = rtSet.has(`${x},${y}`) ? "ROOF_TRIGGER" : "";
  console.log(`  ${x},${y}: tile=${tile} l3=${l3} l4=${l4} ${rt}`);
};

console.log("\n79,54 area:");
for (let y = 52; y <= 56; y++) {
  let row = `y${y}: `;
  for (let x = 77; x <= 81; x++) {
    row += rtSet.has(`${x},${y}`) ? "T" : ".";
  }
  console.log(row);
}

console.log("\nDoor/house area:");
for (const [x, y] of [
  [63, 66], [62, 66], [65, 65], [65, 64], [65, 61], [63, 61], [59, 61],
  [57, 61], [57, 64], [57, 65], [57, 66], [58, 66], [59, 66],
]) {
  check(x, y);
}

console.log("\nTemple interior (sample):");
for (let y = 36; y <= 42; y++) {
  for (let x = 23; x <= 29; x++) {
    if (rtSet.has(`${x},${y}`)) check(x, y);
  }
}
