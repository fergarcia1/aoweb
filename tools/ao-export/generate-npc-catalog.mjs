/**
 * Genera game-data/imperium/npcCatalog.json desde Imperium NPCs.dat.
 * Uso: node tools/ao-export/generate-npc-catalog.mjs
 *      node tools/ao-export/generate-npc-catalog.mjs --npc-dat path/to/NPCs.dat
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

const DEFAULT_NPC_DAT = path.join(
  REPO_ROOT,
  "tools/imperium-clasico-ref/Server/Dat/NPCs.dat"
);
const OUT_JSON = path.join(REPO_ROOT, "game-data/imperium/npcCatalog.json");

/** NpcType de Imperium con rol de servicio fijo (0 = vendedor solo si Comercia=1). */
const SERVICE_NPC_TYPES = new Set([1, 2, 3, 4, 8, 10, 11, 12, 16, 18]);

function parseArgs() {
  const args = process.argv.slice(2);
  let npcDat = DEFAULT_NPC_DAT;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--npc-dat" && args[i + 1]) {
      npcDat = path.resolve(args[++i]);
    }
  }
  return { npcDat };
}

function asInt(value) {
  if (value == null) return null;
  const match = String(value).match(/^\s*(-?\d+)/);
  return match ? Number(match[1]) : null;
}

function asString(value) {
  return value == null ? "" : String(value).trim();
}

function truncateDesc(text, maxLen = 240) {
  const s = asString(text).replace(/\s+/g, " ");
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1)}…`;
}

function mapServiceRole(npcType, name) {
  switch (npcType) {
    case 1:
      return "priest";
    case 2:
      return "guard";
    case 3:
      return "trainer";
    case 4:
      return "banker";
    case 8:
      return "jailer";
    case 10:
      return "bounty_hunter";
    case 11:
      return "vet";
    case 12:
      return "lumberjack";
    case 16:
      return "auctioneer";
    case 0:
      return "vendor";
    default: {
      const lower = name.toLowerCase();
      if (lower.includes("sacerdote")) return "priest";
      if (lower.includes("banquero")) return "banker";
      if (lower.includes("herrero") || lower.includes("armero")) return "vendor";
      return "generic";
    }
  }
}

/**
 * Clasifica plantilla Imperium sin unificar runtime (mobs vs NPCs de servicio).
 * - creature → futuro MobSystem / spawns combatientes
 * - service → banquero, sacerdote, tienda, guardia, etc.
 * - ambient → aldeanos y decoración con cuerpo pero sin combate ni tienda
 */
export function classifyImperiumNpcKind(raw) {
  const name = asString(raw.name);
  if (!name) return null;

  const body = asInt(raw.body) ?? 0;
  const attackable = asInt(raw.attackable) === 1;
  const hostile = asInt(raw.hostile) === 1;
  const comercia = asInt(raw.comercia) === 1;
  const npcType = asInt(raw.npctype) ?? 0;
  const giveExp = asInt(raw.giveexp) ?? 0;
  const maxHp = asInt(raw.maxhp) ?? 0;
  const inCriaturas = Boolean(raw.inCriaturas);

  if (attackable && body > 0) {
    if (inCriaturas || (giveExp > 0 && npcType === 0)) {
      return "creature";
    }
    if (hostile && maxHp > 0 && (npcType === 0 || npcType >= 6)) {
      return "creature";
    }
    if (npcType === 2) {
      return "service";
    }
    if (giveExp > 0) {
      return "creature";
    }
  }

  if (comercia || SERVICE_NPC_TYPES.has(npcType)) {
    return "service";
  }

  if (body > 0 && !attackable) {
    return "ambient";
  }

  return "ambient";
}

function parseNpcsDat(text) {
  const lines = text.split(/\r?\n/);
  const npcs = [];
  let inCriaturas = false;
  let cur = null;

  const flush = () => {
    if (cur) npcs.push(cur);
    cur = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (/^'\-+>/.test(line)) {
      if (/criaturas/i.test(line)) {
        inCriaturas = true;
      } else if (inCriaturas) {
        inCriaturas = false;
      }
    }
    const npcMatch = line.match(/^\[NPC(\d+)\]/i);
    if (npcMatch) {
      flush();
      cur = { npcId: Number(npcMatch[1]), inCriaturas };
      continue;
    }
    if (!cur) continue;
    const kv = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!kv) continue;
    cur[kv[1].toLowerCase()] = kv[2];
  }
  flush();
  return npcs;
}

function buildEntry(raw) {
  const kind = classifyImperiumNpcKind(raw);
  if (!kind) return null;

  const name = asString(raw.name);
  const npcType = asInt(raw.npctype) ?? 0;
  const serviceRole = kind === "service" ? mapServiceRole(npcType, name) : null;

  return {
    npcId: raw.npcId,
    name,
    kind,
    serviceRole,
    npcType,
    body: asInt(raw.body) ?? 0,
    head: asInt(raw.head) ?? 0,
    heading: asInt(raw.heading) ?? 3,
    movement: asInt(raw.movement) ?? 0,
    attackable: asInt(raw.attackable) === 1,
    hostile: asInt(raw.hostile) === 1,
    comercia: asInt(raw.comercia) === 1,
    giveExp: asInt(raw.giveexp) ?? 0,
    giveGold: asInt(raw.givegld) ?? 0,
    minHp: asInt(raw.minhp) ?? 0,
    maxHp: asInt(raw.maxhp) ?? 0,
    minHit: asInt(raw.minhit) ?? 0,
    maxHit: asInt(raw.maxhit) ?? 0,
    def: asInt(raw.def) ?? 0,
    inCriaturas: Boolean(raw.inCriaturas),
    localeId: asInt(raw.localeid) ?? 0,
    desc: truncateDesc(raw.desc),
  };
}

function main() {
  const { npcDat } = parseArgs();
  if (!fs.existsSync(npcDat)) {
    throw new Error(`No existe NPCs.dat: ${npcDat}`);
  }

  const rawNpcs = parseNpcsDat(fs.readFileSync(npcDat, "latin1"));
  const entries = [];
  let skippedUnnamed = 0;

  for (const raw of rawNpcs) {
    const entry = buildEntry(raw);
    if (!entry) {
      skippedUnnamed += 1;
      continue;
    }
    entries.push(entry);
  }

  entries.sort((a, b) => a.npcId - b.npcId);

  const byKind = { service: 0, creature: 0, ambient: 0 };
  const byServiceRole = {};
  for (const entry of entries) {
    byKind[entry.kind] += 1;
    if (entry.serviceRole) {
      byServiceRole[entry.serviceRole] = (byServiceRole[entry.serviceRole] ?? 0) + 1;
    }
  }

  const catalog = {
    meta: {
      source: path.relative(REPO_ROOT, npcDat).replace(/\\/g, "/"),
      generatedAt: new Date().toISOString(),
      totalEntries: entries.length,
      skippedUnnamed,
      byKind,
      byServiceRole,
    },
    entries,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  console.log(`NPCs.dat parseados: ${rawNpcs.length}`);
  console.log(`Entradas en catálogo: ${entries.length} (sin nombre: ${skippedUnnamed})`);
  console.log(
    `Por kind: service=${byKind.service}, creature=${byKind.creature}, ambient=${byKind.ambient}`
  );
  console.log(`Salida: ${OUT_JSON}`);
}

main();
