import fs from "fs";

const spellsText = fs.readFileSync("src/data/spells.ts", "utf8");
const fxText = fs.readFileSync("src/spells/spellEffects.ts", "utf8");
const behText = fs.readFileSync("game-data/spellBehaviors.ts", "utf8");
const importedText = fs.readFileSync("game-data/imported/spells_imported.ts", "utf8");

const definitions = [];
const blockRe = /\{\s*idSpell:\s*(\d+),[\s\S]*?nombre:\s*"([^"]+)"/g;
let m;
while ((m = blockRe.exec(spellsText)) !== null) {
  definitions.push({ id: Number(m[1]), nombre: m[2] });
}

const fxIds = new Set([...fxText.matchAll(/idSpell:\s*(\d+)/g)].map((x) => Number(x[1])));
const behIds = new Set([...behText.matchAll(/^\s*(\d+):/gm)].map((x) => Number(x[1])));

const importedIds = new Set(
  [...importedText.matchAll(/\bid:\s*(\d+)/g)].map((x) => Number(x[1]))
);

const noFx = definitions.filter((s) => !fxIds.has(s.id));
const inGameNotImported = definitions.filter((s) => !importedIds.has(s.id));
const importedNotInGame = [...importedIds].filter((id) => !definitions.some((s) => s.id === id));

function parseFlags(spellBlock) {
  const get = (key) => {
    const re = new RegExp(`${key}:\\s*([^,\\n]+)`);
    const hit = spellBlock.match(re);
    return hit ? hit[1].trim() : null;
  };
  return {
    aoe: get("aoe") === "true",
    heal: Number(get("healMax") ?? 0) > 0,
    damage: Number(get("danioMax") ?? 0) > 0,
    debuff: get("remueveDebuff") && get("remueveDebuff") !== "null",
    ally: get("puedeUsarseEnAliados") === "true",
  };
}

const partial = [];
for (const def of definitions) {
  const start = spellsText.indexOf(`idSpell: ${def.id},`);
  const end = spellsText.indexOf("idSpell:", start + 10);
  const block = spellsText.slice(start, end > start ? end : start + 800);
  const flags = parseFlags(block);
  const hasBehavior = behIds.has(def.id);
  const hasFx = fxIds.has(def.id);
  const genericOnly =
    !hasBehavior &&
    !flags.debuff &&
    def.id !== 1 && // curar veneno needs poison system
    !def.nombre.toLowerCase().includes("metamorfosis") &&
    def.id !== 6 &&
    def.id !== 38 &&
    def.id !== 39 &&
    def.id !== 40 &&
    def.id !== 44 &&
    def.id !== 50;

  const issues = [];
  if (!hasFx) issues.push("sin FX");
  if (def.nombre.toLowerCase().includes("metamorfosis") || [6, 38, 39, 40, 44, 50].includes(def.id)) {
    issues.push("metamorfosis sin lógica");
  }
  if (def.id === 1 || flags.debuff) {
    if (def.id === 1) issues.push("antídoto/veneno incompleto");
  }
  if (flags.aoe && !hasFx && flags.damage) issues.push("AoE daño genérico?");
  if (def.nombre.startsWith("HechizoNPC")) issues.push("NPC only");

  if (issues.length) {
    partial.push({ ...def, ...flags, hasFx, hasBehavior, issues });
  }
}

console.log("=== Catálogo ===");
console.log("SPELL_DEFINITIONS:", definitions.length);
console.log("IMPORTED_SPELLS ids:", importedIds.size);
console.log("Con animación FX:", fxIds.size);
console.log("Con SPELL_BEHAVIORS:", behIds.size);
console.log("En juego pero no en imported:", inGameNotImported.map((s) => `${s.id} ${s.nombre}`).join(", ") || "(ninguno)");
console.log("En imported pero no en juego:", importedNotInGame.sort((a, b) => a - b).join(", "));

console.log("\n=== Sin animación FX (" + noFx.length + ") ===");
for (const s of noFx) {
  console.log(`  ${s.id}\t${s.nombre}`);
}

console.log("\n=== Con definición pero mecánica incompleta / placeholder ===");
for (const s of partial.sort((a, b) => a.id - b.id)) {
  console.log(`  ${s.id}\t${s.nombre}\t[${s.issues.join("; ")}]`);
}

const BEH = new Set([13, 18, 19, 20, 21, 33, 14, 103, 102, 22, 32, 73]);
const IMMOB = new Set([8, 10, 35]);
const FX_LIST = [...fxIds].sort((a, b) => a - b);

const parsed = [];
for (const def of definitions) {
  const start = spellsText.indexOf(`idSpell: ${def.id},`);
  const end = spellsText.indexOf("idSpell:", start + 10);
  const block = spellsText.slice(start, end > start ? end : start + 900);
  const aoe = /aoe:\s*true/.test(block);
  const danioMax = Number((block.match(/danioMax:\s*(\d+)/) || [0, 0])[1]);
  const healMax = Number((block.match(/healMax:\s*(\d+)/) || [0, 0])[1]);
  parsed.push({ ...def, aoe, danioMax, healMax });
}

const aoeSpells = parsed.filter((s) => s.aoe);
const noop = parsed.filter(
  (s) =>
    s.danioMax === 0 &&
    s.healMax === 0 &&
    !BEH.has(s.id) &&
    !IMMOB.has(s.id) &&
    s.id !== 1
);
const withFx = parsed.filter((s) => fxIds.has(s.id));
const playableNoFx = parsed.filter(
  (s) =>
    !fxIds.has(s.id) &&
    (s.danioMax > 0 ||
      s.healMax > 0 ||
      BEH.has(s.id) ||
      IMMOB.has(s.id) ||
      s.id === 1 ||
      s.id === 14)
);

console.log("\n=== AoE en datos (servidor solo pega 1 tile) ===");
aoeSpells.forEach((s) => console.log(`  ${s.id}\t${s.nombre}`));

console.log("\n=== En juego pero sin efecto al castear ===");
noop.forEach((s) => console.log(`  ${s.id}\t${s.nombre}`));

console.log("\n=== Jugables sin animación FX ===");
playableNoFx.forEach((s) => console.log(`  ${s.id}\t${s.nombre}`));

console.log("\n=== Con animación FX (" + FX_LIST.length + ") ===");
FX_LIST.forEach((id) => {
  const s = parsed.find((x) => x.id === id);
  console.log(`  ${id}\t${s?.nombre ?? "?"}`);
});
