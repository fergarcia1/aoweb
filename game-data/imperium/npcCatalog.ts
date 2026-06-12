import catalogFile from "./npcCatalog.json";
import type {
  ImperiumNpcCatalogEntry,
  ImperiumNpcCatalogFile,
  ImperiumNpcKind,
  ImperiumNpcVisualStatus,
  ImperiumServiceRole,
} from "./npcCatalogTypes";
import { getImperiumBodyVisual, isImperiumBodyVisualReady } from "./npcBodyVisuals";

export type {
  ImperiumNpcCatalogEntry,
  ImperiumNpcCatalogFile,
  ImperiumNpcFaceAppearance,
  ImperiumNpcFaceGenderId,
  ImperiumNpcFaceRaceId,
  ImperiumNpcKind,
  ImperiumNpcVisualStatus,
  ImperiumServiceRole,
} from "./npcCatalogTypes";
export {
  getImperiumBodyVisual,
  isImperiumBodyVisualReady,
  listReadyImperiumBodyVisuals,
  IMPERIUM_BODY_VISUALS_META,
} from "./npcBodyVisuals";

const catalog = catalogFile as ImperiumNpcCatalogFile;

export const IMPERIUM_NPC_CATALOG_META = catalog.meta;

/** Todas las plantillas exportadas (con nombre en NPCs.dat). */
export const IMPERIUM_NPC_CATALOG: ImperiumNpcCatalogEntry[] = catalog.entries;

const byId = new Map<number, ImperiumNpcCatalogEntry>(
  IMPERIUM_NPC_CATALOG.map((entry) => [entry.npcId, entry])
);

export function getImperiumNpcCatalogEntry(
  npcId: number
): ImperiumNpcCatalogEntry | undefined {
  return byId.get(npcId);
}

export function listImperiumNpcCatalogByKind(
  kind: ImperiumNpcKind
): ImperiumNpcCatalogEntry[] {
  return IMPERIUM_NPC_CATALOG.filter((entry) => entry.kind === kind);
}

export function listImperiumNpcCatalogByServiceRole(
  role: ImperiumServiceRole
): ImperiumNpcCatalogEntry[] {
  return IMPERIUM_NPC_CATALOG.filter(
    (entry) => entry.kind === "service" && entry.serviceRole === role
  );
}

/** Plantillas listas para `MobSystem` (criaturas atacables). */
export function listImperiumCreatureTemplates(): ImperiumNpcCatalogEntry[] {
  return listImperiumNpcCatalogByKind("creature");
}

/** Plantillas para NPCs de interacción (banco, tienda, sacerdote, etc.). */
export function listImperiumServiceTemplates(): ImperiumNpcCatalogEntry[] {
  return listImperiumNpcCatalogByKind("service");
}

/** true si el NPC tiene spritesheet de cuerpo exportado y listo. */
export function isImperiumNpcVisualReady(entry: ImperiumNpcCatalogEntry): boolean {
  if (entry.visual?.status === "ready") return true;
  return isImperiumBodyVisualReady(getImperiumBodyVisual(entry.body));
}

export function listImperiumNpcCatalogWithReadyVisual(): ImperiumNpcCatalogEntry[] {
  return IMPERIUM_NPC_CATALOG.filter((entry) => isImperiumNpcVisualReady(entry));
}
