import { ALL_ITEM_IDS } from "../../items/itemDefinitions";
import { addToInventory, type InventorySlot } from "../../items/inventoryStack";
import { getItemDefinition } from "../../items/itemDefinitions";
import type { GameUi } from "../../ui/gameUi";

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
      this.deps.addChatLine("Uso: /ui mapname <dx> <dy> | reset | info");
      return true;
    }

    const sub = args[0];
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
          this.deps.addChatLine("Uso: /ui mapname <dx> <dy> | reset | info");
        }
        return true;
      }

      const dx = parseInt(args[1], 10);
      const dy = parseInt(args[2], 10);
      if (isNaN(dx) || isNaN(dy)) {
        this.deps.addChatLine("Uso: /ui mapname <dx> <dy>");
        return true;
      }
      this.deps.gameUi.setMapNameOffset(dx, dy);
      this.deps.addChatLine(`mapNameOffset actualizado: x=${dx} y=${dy}`);
      return true;
    }

    this.deps.addChatLine("Comando UI desconocido. Probá: /ui mapname ...");
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
    this.deps.addChatLine("/reset — reiniciar progreso del personaje");
    this.deps.addChatLine("/gold <cantidad> — sumar oro");
    this.deps.addChatLine("/give <cantidad> <itemId> [personaje] — dar ítems");
    this.deps.addChatLine("/ui mapname <dx> <dy> — mover nombre del mapa");
    this.deps.addChatLine("/ui mapname reset | info — resetear o ver offset");

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
