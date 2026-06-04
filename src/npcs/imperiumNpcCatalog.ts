/**
 * Puente cliente/servidor hacia el catálogo Imperium (solo datos, sin runtime unificado).
 */
export {
  getImperiumNpcCatalogEntry,
  IMPERIUM_NPC_CATALOG,
  IMPERIUM_NPC_CATALOG_META,
  listImperiumCreatureTemplates,
  listImperiumNpcCatalogByKind,
  listImperiumNpcCatalogByServiceRole,
  listImperiumServiceTemplates,
  type ImperiumNpcCatalogEntry,
  isImperiumNpcVisualReady,
  type ImperiumNpcKind,
  type ImperiumNpcVisualStatus,
  type ImperiumServiceRole,
} from "../../game-data/imperium/npcCatalog";

export {
  getImperiumNpcBodySpriteConfig,
  getImperiumNpcSpriteConfigFromCatalog,
  type ImperiumNpcBodySpriteConfig,
  type ImperiumNpcFaceConfig,
} from "../game/npcs/imperiumNpcVisual";
export {
  createImperiumNpcFaceSprite,
  getCatalogEntryFace,
  syncImperiumNpcFaceSprite,
} from "../game/npcs/imperiumNpcFace";
