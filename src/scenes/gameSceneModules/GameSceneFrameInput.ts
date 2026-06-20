import type { MoveDirection } from "./types";

export type GameSceneFrameInputDeps = {
  isChangingMap: boolean;
  hasCursors: boolean;
  isChatFocused: boolean;
  isConfirmOpen: boolean;
  isMacroEditorOpen: boolean;
  isStatsOverlayOpen: boolean;
  isOptionsOverlayOpen: boolean;
  isPartyOverlayOpen: boolean;
  isAuctionOpen: boolean;
  isBankOpen: boolean;
  isShopOpen: boolean;
  isSpellShopOpen: boolean;
  justPressedWorldMapToggle: boolean;
  justPressedPartyToggle: boolean;
  hasPendingSpellCast: boolean;
  justPressedCancelTargeting: boolean;
  isWorldMapOpen: boolean;
  isPlayerDeadOrGhost: boolean;
  justPressedMeditate: boolean;
  isAttackKeyDown: boolean;
  justPressedEquipSlot: boolean;
  justPressedDropSlot: boolean;
  justPressedPickup: boolean;
  isMoving: boolean;
  getPressedDirection: () => MoveDirection | null;
  isPlayerImmobilized: () => boolean;
  getTimeNow: () => number;
  getNextImmobilizedFeedbackAt: () => number;
  setNextImmobilizedFeedbackAt: (at: number) => void;
  isMultiplayerActive: () => boolean;
  isServerJoinPending: () => boolean;
  toggleWorldMap: () => void;
  togglePartyOverlay: () => void;
  cancelSpellTargeting: (message: string) => void;
  handleShopEscape: () => void;
  handleBankEscape: () => void;
  handleAuctionEscape: () => void;
  handleWorldMapEscape: () => void;
  onMeditateHotkeyWhileDead: () => void;
  onAttackWhileDead: () => void;
  tryNetworkStep: (direction: MoveDirection) => void;
  onMeditateToggle: () => void;
  onAttack: () => void;
  onEquipSelectedSlot: () => void;
  onDropSelectedSlot: () => void;
  onPickup: () => void;
  updateDesiredFacing: () => void;
  stopMeditation: (reason: string) => void;
  onImmobilizedMoveAttempt: () => void;
};

/**
 * Procesa input de movimiento/combate/UI por frame (después de sync visual).
 * Devuelve true si el frame debe terminar sin más lógica de input.
 */
export function processGameSceneFrameInput(deps: GameSceneFrameInputDeps): boolean {
  if (!deps.hasCursors || deps.isChangingMap) {
    return true;
  }

  if (
    deps.isChatFocused ||
    deps.isConfirmOpen ||
    deps.isMacroEditorOpen ||
    deps.isOptionsOverlayOpen
  ) {
    return true;
  }

  if (deps.justPressedPartyToggle) {
    deps.togglePartyOverlay();
    return true;
  }

  if (deps.isAuctionOpen && deps.justPressedCancelTargeting) {
    deps.handleAuctionEscape();
    return true;
  }

  if (deps.isShopOpen && deps.justPressedCancelTargeting) {
    deps.handleShopEscape();
    return true;
  }

  if (deps.isSpellShopOpen && deps.justPressedCancelTargeting) {
    deps.handleShopEscape();
    return true;
  }

  if (deps.isBankOpen && deps.justPressedCancelTargeting) {
    deps.handleBankEscape();
    return true;
  }

  if (deps.isWorldMapOpen && deps.justPressedCancelTargeting) {
    deps.handleWorldMapEscape();
    return true;
  }

  if (
    deps.isStatsOverlayOpen ||
    deps.isPartyOverlayOpen ||
    deps.isAuctionOpen ||
    deps.isBankOpen ||
    deps.isShopOpen ||
    deps.isSpellShopOpen
  ) {
    return true;
  }

  if (deps.justPressedWorldMapToggle) {
    deps.toggleWorldMap();
    return true;
  }

  if (deps.hasPendingSpellCast && deps.justPressedCancelTargeting) {
    deps.cancelSpellTargeting("Lanzamiento cancelado.");
    return true;
  }

  if (deps.isWorldMapOpen) {
    return true;
  }

  if (deps.isServerJoinPending()) {
    return true;
  }

  if (deps.isPlayerDeadOrGhost) {
    if (deps.justPressedMeditate) {
      deps.onMeditateHotkeyWhileDead();
    }
    if (deps.isAttackKeyDown) {
      deps.onAttackWhileDead();
    }
    if (deps.isMoving) {
      return true;
    }
    const direction = deps.getPressedDirection();
    if (direction) {
      deps.stopMeditation("Dejaste de meditar.");
      deps.tryNetworkStep(direction);
    }
    return true;
  }

  if (deps.justPressedMeditate) {
    deps.onMeditateToggle();
    return true;
  }

  if (deps.isAttackKeyDown) {
    deps.stopMeditation("Dejaste de meditar.");
    deps.onAttack();
  }

  if (deps.justPressedEquipSlot) {
    deps.stopMeditation("Dejaste de meditar.");
    deps.onEquipSelectedSlot();
  }

  if (deps.justPressedDropSlot) {
    deps.stopMeditation("Dejaste de meditar.");
    deps.onDropSelectedSlot();
  }

  deps.updateDesiredFacing();

  if (deps.justPressedPickup) {
    deps.stopMeditation("Dejaste de meditar.");
    deps.onPickup();
  }

  if (deps.isMoving) {
    return true;
  }

  const direction = deps.getPressedDirection();
  if (!direction) {
    return true;
  }

  if (deps.isPlayerImmobilized()) {
    const now = deps.getTimeNow();
    if (now >= deps.getNextImmobilizedFeedbackAt()) {
      deps.setNextImmobilizedFeedbackAt(now + 900);
      deps.onImmobilizedMoveAttempt();
    }
    return true;
  }

  deps.stopMeditation("Dejaste de meditar.");
  deps.tryNetworkStep(direction);
  return true;
}
