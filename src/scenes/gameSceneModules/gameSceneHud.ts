import type { GameMap } from "../../maps/types";
import { getPlayerNameColors, type CharacterFactionId, type PlayerRole } from "../../data/characters";
import type { GameUi } from "../../ui/gameUi";
import type { PlayerProgressState } from "./types";
import type { GameSceneMapController } from "./GameSceneMapController";

export type GameSceneHudDeps = {
  getGameUi: () => GameUi | undefined;
  getCurrentMap: () => GameMap;
  getMapController: () => GameSceneMapController;
  getPlayerTileX: () => number;
  getPlayerTileY: () => number;
  getPlayerName: () => string;
  getPlayerFaction: () => CharacterFactionId;
  getPlayerRole: () => PlayerRole;
  getPlayerProgress: () => PlayerProgressState;
  getPartyMemberMinimapTiles: () => Array<{ tileX: number; tileY: number }>;
  refreshStatsOverlay: () => void;
};

export function refreshGameSceneMapLocation(deps: GameSceneHudDeps): void {
  const ui = deps.getGameUi();
  if (!ui) return;
  const map = deps.getCurrentMap();
  ui.setMapLocation(map.name, deps.getPlayerTileX(), deps.getPlayerTileY());
}

export function refreshGameSceneMinimap(deps: GameSceneHudDeps): void {
  const ui = deps.getGameUi();
  if (!ui) return;
  const bounds = deps.getMapController().getMinimapBounds();
  const partyMembers = deps.getPartyMemberMinimapTiles();
  ui.updateMinimap(
    deps.getCurrentMap(),
    deps.getPlayerTileX(),
    deps.getPlayerTileY(),
    bounds,
    partyMembers
  );
}

export function refreshGameSceneHud(deps: GameSceneHudDeps): void {
  const ui = deps.getGameUi();
  if (!ui) return;
  deps.refreshStatsOverlay();
  const p = deps.getPlayerProgress();
  ui.setStats({
    name: deps.getPlayerName(),
    nameColor: getPlayerNameColors(deps.getPlayerFaction(), deps.getPlayerRole()).fill,
    level: p.level,
    hp: p.hp,
    hpMax: p.hpMax,
    mp: Math.floor(p.mp),
    mpMax: p.mpMax,
    exp: p.exp,
    expMax: p.expToNext,
    gold: p.gold,
  });
}
