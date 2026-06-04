import {
  CLAN_GEM_TIER_LABELS,
  DRUID_FORM_LABELS,
  MOUNT_ID_LABELS,
  type ItemSpecialUse,
} from "../../game-data/items/itemSpecialUse";
import type { ItemDefinition } from "../items/itemDefinitions";
import { TILE } from "../maps/tileDefinitions";

const ADJACENT_OFFSETS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
] as const;

export type ItemSpecialUseContext = {
  playerTileX: number;
  playerTileY: number;
  selectedClass: string;
  getMapTileId: (tileX: number, tileY: number) => number | null;
  addChatLine: (message: string) => void;
};

function isAdjacentWaterTile(ctx: ItemSpecialUseContext): boolean {
  for (const { dx, dy } of ADJACENT_OFFSETS) {
    const tileId = ctx.getMapTileId(ctx.playerTileX + dx, ctx.playerTileY + dy);
    if (tileId === TILE.WATER) {
      return true;
    }
  }
  return false;
}

function describeSpecialUse(specialUse: ItemSpecialUse): string {
  switch (specialUse.kind) {
    case "boat_navigation":
      return "navegación";
    case "mount":
      return MOUNT_ID_LABELS[specialUse.mountId] ?? "montura";
    case "clan_founding_gem":
      return `fundar un clan (${CLAN_GEM_TIER_LABELS[specialUse.gemTier]})`;
    case "druid_polymorph":
      return `transformarte en ${DRUID_FORM_LABELS[specialUse.mobFormId] ?? specialUse.mobFormId}`;
    case "future":
      return specialUse.note;
    default:
      return "uso especial";
  }
}

/**
 * Intenta usar un misc con `specialUse` / `usableFromInventory`.
 * Devuelve true si el objeto tiene interacción definida (aunque aún no esté implementada).
 */
export function tryUseItemSpecial(
  item: ItemDefinition,
  ctx: ItemSpecialUseContext
): boolean {
  if (!item.usableFromInventory || !item.specialUse) {
    return false;
  }

  const specialUse = item.specialUse;

  if (specialUse.kind === "druid_polymorph" && ctx.selectedClass !== "druida") {
    ctx.addChatLine("Solo los druidas pueden usar este objeto.");
    return true;
  }

  if (specialUse.kind === "boat_navigation") {
    if (!isAdjacentWaterTile(ctx)) {
      ctx.addChatLine("Tenés que estar junto a un tile de agua para usar la barca.");
      return true;
    }
    ctx.addChatLine(
      `Navegación con ${item.name}: próximamente. (Estás junto al agua.)`
    );
    return true;
  }

  if (specialUse.kind === "mount") {
    const mountLabel = MOUNT_ID_LABELS[specialUse.mountId] ?? item.name;
    ctx.addChatLine(`Montura (${mountLabel}): próximamente.`);
    return true;
  }

  if (specialUse.kind === "clan_founding_gem") {
    const gemLabel = CLAN_GEM_TIER_LABELS[specialUse.gemTier];
    ctx.addChatLine(
      `${gemLabel}: necesaria para fundar un clan — sistema de clanes próximamente.`
    );
    return true;
  }

  if (specialUse.kind === "druid_polymorph") {
    const formLabel = DRUID_FORM_LABELS[specialUse.mobFormId] ?? specialUse.mobFormId;
    ctx.addChatLine(
      `Transformación en ${formLabel}: próximamente.`
    );
    return true;
  }

  if (specialUse.kind === "future") {
    ctx.addChatLine(`${item.name}: ${specialUse.note}`);
    return true;
  }

  ctx.addChatLine(`${item.name} (${describeSpecialUse(specialUse)}): próximamente.`);
  return true;
}
