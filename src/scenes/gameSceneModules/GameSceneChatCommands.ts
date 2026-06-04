import { ALL_ITEM_IDS } from "../../items/itemDefinitions";
import { addToInventory, type InventorySlot } from "../../items/inventoryStack";
import { getItemDefinition } from "../../items/itemDefinitions";
import type { GameUi } from "../../ui/gameUi";
import { getAowebSkinThemeLabel, getAowebSkinVariant, parseUiSkinCommandArg } from "../../ui/aowebSkinVariant";
import { canRenegade } from "../../../shared/faction";
import type { CharacterFactionId } from "../../data/characters";

function parseUiOffsetArg(raw: string | undefined): number | null {
  if (raw === undefined || raw.length === 0) {
    return null;
  }
  if (!/^[+-]?\d+$/.test(raw)) {
    return null;
  }
  return parseInt(raw, 10);
}

function resolveUiOffsetPair(
  current: { x: number; y: number },
  rawX: string | undefined,
  rawY: string | undefined
): { x: number; y: number } | null {
  const xParsed = parseUiOffsetArg(rawX);
  const yParsed = parseUiOffsetArg(rawY);
  if (xParsed === null || yParsed === null || rawX === undefined || rawY === undefined) {
    return null;
  }
  if (rawX.startsWith("+") || rawX.startsWith("-")) {
    return { x: current.x + xParsed, y: current.y + yParsed };
  }
  return { x: xParsed, y: yParsed };
}

export type GameSceneChatDeps = {
  gameUi: GameUi;
  addChatLine: (text: string) => void;
  isMultiplayerConnected: () => boolean;
  sendChat: (message: string) => void;
  meditationToggle: () => void;
  goToHomePriest: () => void;
  markHomeCity: () => void;
  isAlive: () => boolean;
  killPlayer: () => void;
  resetProgress: () => void;
  handleHitboxCommand: (normalized: string) => boolean;
  handleMobEditCommand: (normalized: string) => boolean;
  handleUiCommand: (normalized: string) => boolean;
  handleGiveCommand: (raw: string) => void;
  addGold: (amount: number) => void;
  refreshHud: () => void;
  scheduleSave: () => void;
  tryAdminCommand: (message: string) => boolean;
  isPlayerAdmin: () => boolean;
  getPlayerName: () => string;
  getInventory: () => InventorySlot[];
  refreshInventoryUi: () => void;
  getSelectedFaction: () => CharacterFactionId;
  tryBecomeRenegade: () => void;
  requestLogout: () => void;
};

/**
 * Comandos de chat (/gold, /give, /meditar, etc.).
 */
export class GameSceneChatCommands {
  constructor(private readonly deps: GameSceneChatDeps) {}

  handleSubmit(message: string): boolean {
    if (message.startsWith("/")) {
      return this.handleCommand(message);
    }
    if (this.deps.isMultiplayerConnected()) {
      this.deps.sendChat(message);
      return true;
    }
    return false;
  }

  handleCommand(message: string): boolean {
    const normalized = message.trim().toLowerCase();
    if (normalized === "/commands") {
      this.printCommandsList();
      return true;
    }
    if (normalized === "/meditar") {
      this.deps.meditationToggle();
      return true;
    }
    if (normalized === "/hogar") {
      this.deps.goToHomePriest();
      return true;
    }
    if (normalized === "/marcarhogar") {
      this.deps.markHomeCity();
      return true;
    }
    if (normalized === "/morir") {
      if (this.deps.isAlive()) {
        this.deps.killPlayer();
      }
      return true;
    }
    if (normalized === "/renegar") {
      if (!canRenegade(this.deps.getSelectedFaction())) {
        this.deps.addChatLine("Solo un ciudadano imperial puede renegar.");
        return true;
      }
      this.deps.gameUi.showConfirm(
        "¿Renegarás tu juramento imperial? Pasarás a ser Renegado y podrás atacar a cualquiera.",
        () => this.deps.tryBecomeRenegade()
      );
      return true;
    }
    if (normalized === "/salir") {
      this.deps.requestLogout();
      return true;
    }
    if (normalized === "/reset") {
      this.deps.resetProgress();
      return true;
    }
    if (normalized === "/hitbox" || normalized.startsWith("/hitbox ")) {
      return this.deps.handleHitboxCommand(normalized);
    }
    if (normalized.startsWith("/mob ")) {
      return this.deps.handleMobEditCommand(normalized);
    }
    if (normalized.startsWith("/ui ")) {
      return this.deps.handleUiCommand(normalized);
    }
    if (normalized.startsWith("/gold")) {
      const amt = parseInt(normalized.slice("/gold".length).trim(), 10);
      if (isNaN(amt) || amt <= 0) {
        this.deps.addChatLine("Uso: /gold <cantidad>");
      } else {
        this.deps.addGold(amt);
        this.deps.refreshHud();
        this.deps.scheduleSave();
        this.deps.addChatLine(`Recibiste ${amt.toLocaleString("es-AR")} monedas de oro.`);
      }
      return true;
    }
    if (normalized.startsWith("/give")) {
      this.deps.handleGiveCommand(message.trim());
      return true;
    }
    if (this.deps.tryAdminCommand(message.trim())) {
      return true;
    }
    this.deps.addChatLine(`Comando desconocido: ${message}`);
    return true;
  }

  handleUiCommand(normalized: string): boolean {
    const args = normalized.slice("/ui ".length).trim().split(/\s+/).filter(Boolean);
    if (args.length === 0) {
      this.deps.addChatLine(
        `UI activa: ${getAowebSkinThemeLabel(getAowebSkinVariant())}. Uso: /ui ajuste | minimap | mapname ...`
      );
      return true;
    }

    const sub = args[0];
    const skinTheme = parseUiSkinCommandArg(sub);
    if (skinTheme) {
      if (this.deps.gameUi.switchAowebSkinVariant(skinTheme)) {
        this.deps.addChatLine(`Marco UI: ${getAowebSkinThemeLabel(skinTheme)}.`);
      } else {
        this.deps.addChatLine(
          `No se pudo cargar la skin "${skinTheme}". ¿Está el PNG en public/assets/ao/uiGrafica/?`
        );
      }
      return true;
    }

    if (sub === "ajuste" || sub === "tune") {
      const action = args[1];
      if (action === "off" || action === "0") {
        this.deps.gameUi.setMinimapLayoutTuneActive(false);
        this.deps.addChatLine("Ajuste UI desactivado.");
        return true;
      }
      if (action === "info") {
        this.deps.addChatLine(this.deps.gameUi.getMinimapLayoutTuneSummary());
        return true;
      }
      if (action === "on" || action === "1" || action === undefined) {
        this.deps.gameUi.setMinimapLayoutTuneActive(true);
        this.deps.addChatLine(
          "Ajuste UI activado. Flechas mover · +/- tamaño · Tab cambiar · Shift=5px · R reset · I info · Esc salir"
        );
        this.deps.addChatLine(this.deps.gameUi.getMinimapLayoutTuneSummary());
        return true;
      }
      this.deps.addChatLine("Uso: /ui ajuste on|off|info");
      return true;
    }

    if (sub === "minimap" || sub === "minimapa") {
      if (args[1] === "reset") {
        this.deps.gameUi.resetMinimapLayout();
        this.deps.addChatLine("minimap reseteado (posición y escala).");
        return true;
      }
      if (args[1] === "scale" || args[1] === "escala" || args[1] === "zoom") {
        const rawScale = args[2];
        if (rawScale === undefined) {
          this.deps.addChatLine(
            `minimap scale=${this.deps.gameUi.getMinimapSlotScale().toFixed(2)}. Uso: /ui minimap scale 1.1`
          );
          return true;
        }
        const parsedScale = parseFloat(rawScale.replace(",", "."));
        if (!Number.isFinite(parsedScale) || parsedScale <= 0) {
          this.deps.addChatLine("Uso: /ui minimap scale 1.1");
          return true;
        }
        this.deps.gameUi.setMinimapSlotScale(parsedScale);
        this.deps.addChatLine(
          `minimap scale=${this.deps.gameUi.getMinimapSlotScale().toFixed(2)}`
        );
        return true;
      }
      if (args[1] === "info" || args[1] === undefined) {
        const o = this.deps.gameUi.getMinimapOffset();
        const scale = this.deps.gameUi.getMinimapSlotScale();
        this.deps.addChatLine(`minimapOffset: x=${o.x} y=${o.y} scale=${scale.toFixed(2)}`);
        if (args[1] === undefined) {
          this.deps.addChatLine(
            "Uso: /ui minimap <dx> <dy> | scale 1.1 | +dx +dy | reset | info"
          );
        }
        return true;
      }

      const current = this.deps.gameUi.getMinimapOffset();
      const next = resolveUiOffsetPair(current, args[1], args[2]);
      if (next === null) {
        this.deps.addChatLine("Uso: /ui minimap <dx> <dy>  (ej: /ui minimap +2 -1)");
        return true;
      }
      this.deps.gameUi.setMinimapOffset(next.x, next.y);
      this.deps.addChatLine(`minimapOffset actualizado: x=${next.x} y=${next.y}`);
      return true;
    }

    if (sub === "mapname" || sub === "mapa" || sub === "mapaNombre") {
      if (args[1] === "reset") {
        this.deps.gameUi.resetMapNameOffset();
        this.deps.addChatLine("mapNameOffset reseteado.");
        return true;
      }
      if (args[1] === "info" || args[1] === undefined) {
        const o = this.deps.gameUi.getMapNameOffset();
        this.deps.addChatLine(`mapNameOffset: x=${o.x} y=${o.y}`);
        if (args[1] === undefined) {
          this.deps.addChatLine("Uso: /ui mapname <dx> <dy> | +dx +dy | reset | info");
        }
        return true;
      }

      const current = this.deps.gameUi.getMapNameOffset();
      const next = resolveUiOffsetPair(current, args[1], args[2]);
      if (next === null) {
        this.deps.addChatLine("Uso: /ui mapname <dx> <dy>  (ej: /ui mapname +2 -1)");
        return true;
      }
      this.deps.gameUi.setMapNameOffset(next.x, next.y);
      this.deps.addChatLine(`mapNameOffset actualizado: x=${next.x} y=${next.y}`);
      return true;
    }

    this.deps.addChatLine("Comando UI desconocido. Probá: /ui ajuste | minimap | mapname ...");
    return true;
  }

  handleGiveCommand(raw: string): void {
    const parts = raw.slice("/give".length).trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
      this.deps.addChatLine("Uso: /give <cantidad> <itemId> [personaje]");
      return;
    }

    const amount = parseInt(parts[0], 10);
    if (isNaN(amount) || amount <= 0) {
      this.deps.addChatLine("La cantidad debe ser un número mayor a 0.");
      return;
    }

    const itemId = parts[1] as (typeof ALL_ITEM_IDS)[number];
    if (!ALL_ITEM_IDS.includes(itemId)) {
      this.deps.addChatLine(`Item desconocido: "${parts[1]}". Usá un itemId válido.`);
      return;
    }

    const targetName = parts.slice(2).join(" ");
    if (targetName && targetName.toLowerCase() !== this.deps.getPlayerName().toLowerCase()) {
      this.deps.addChatLine(`No se encontró al personaje "${targetName}".`);
      return;
    }

    const { added, remaining } = addToInventory(this.deps.getInventory(), itemId, amount);
    if (added <= 0) {
      this.deps.addChatLine("No hay espacio en el inventario.");
      return;
    }

    this.deps.refreshInventoryUi();
    const item = getItemDefinition(itemId);
    this.deps.addChatLine(
      `Recibiste ${item.name} x${added}.${remaining > 0 ? ` (${remaining} no entraron)` : ""}`
    );
    this.deps.scheduleSave();
  }

  private printCommandsList(): void {
    this.deps.addChatLine("--- Comandos ---");
    this.deps.addChatLine("/commands — esta lista");
    this.deps.addChatLine("/meditar — meditar");
    this.deps.addChatLine("/hogar — ir al sacerdote de tu ciudad");
    this.deps.addChatLine("/marcarhogar — marcar ciudad actual como hogar");
    this.deps.addChatLine("/morir — morir al instante");
    this.deps.addChatLine("/renegar — abandonar el imperio (solo ciudadano)");
    this.deps.addChatLine("/salir — volver a selección de personajes");
    this.deps.addChatLine("/reset — reiniciar progreso del personaje");
    this.deps.addChatLine("/gold <cantidad> — sumar oro");
    this.deps.addChatLine("/give <cantidad> <itemId> [personaje] — dar ítems");
    this.deps.addChatLine("/ui clear — marco claro (UIAOWEBWhite)");
    this.deps.addChatLine("/ui dark — marco oscuro (UIAOWEBDark)");
    this.deps.addChatLine("/ui red — marco rojo (UIAOWEBRed)");
    this.deps.addChatLine("/ui ajuste — mover minimapa y nombre con flechas");
    this.deps.addChatLine("/ui minimap <dx> <dy> — mover minimapa (+2 -1 relativo)");
    this.deps.addChatLine("/ui minimap scale 1.1 — escala del minimapa");
    this.deps.addChatLine("/ui mapname <dx> <dy> — mover nombre del mapa");

    if (this.deps.isPlayerAdmin()) {
      this.deps.addChatLine("--- Admin ---");
      this.deps.addChatLine("/hitbox [on|off] — debug de hitboxes");
      this.deps.addChatLine("/mob help — editor de hitbox de mobs");
      this.deps.addChatLine("/tp <jugador> <mapa> <x> <y> — teletransporte (servidor)");
    } else {
      this.deps.addChatLine("(Admin: /hitbox, /mob, /tp)");
    }
  }
}
