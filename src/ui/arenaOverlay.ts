import type {
  ArenaMode,
  ArenaStatePayload,
  ArenaPlayerSummary,
} from "../../shared/arena";

export type ArenaOverlayHandlers = {
  onJoinQueue: (mode: ArenaMode) => void;
  onCancelQueue: () => void;
  onReadyAccept: () => void;
  onReadyCancel: () => void;
};

type ReadyCheck = {
  mode: ArenaMode;
  opponent: ArenaPlayerSummary;
  expiresAtMs: number;
};

export class ArenaOverlay {
  private readonly container: HTMLDivElement;
  private state: ArenaStatePayload = {
    status: "idle",
    mode: null,
    wins1v1: 0,
    queueSize1v1: 0,
  };
  private readyCheck: ReadyCheck | null = null;
  private tickTimer: number | null = null;

  constructor(private readonly handlers: ArenaOverlayHandlers) {
    this.container = document.createElement("div");
    this.container.style.position = "absolute";
    this.container.style.top = "50%";
    this.container.style.left = "50%";
    this.container.style.transform = "translate(-50%, -50%)";
    this.container.style.width = "340px";
    this.container.style.maxWidth = "calc(100vw - 28px)";
    this.container.style.boxSizing = "border-box";
    this.container.style.background =
      "linear-gradient(180deg, rgba(28, 12, 10, 0.98), rgba(10, 8, 9, 0.98))";
    this.container.style.border = "1px solid #7d3028";
    this.container.style.borderRadius = "6px";
    this.container.style.padding = "14px";
    this.container.style.color = "#f3dcc5";
    this.container.style.fontFamily = "Arial, sans-serif";
    this.container.style.zIndex = "1001";
    this.container.style.display = "none";
    this.container.style.boxShadow = "0 16px 48px rgba(0, 0, 0, 0.65)";
    document.body.appendChild(this.container);
    this.render();
  }

  open(): void {
    this.container.style.display = "block";
    this.render();
    this.startTicker();
  }

  close(): void {
    this.container.style.display = "none";
    this.stopTicker();
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  isOpen(): boolean {
    return this.container.style.display === "block";
  }

  destroy(): void {
    this.stopTicker();
    this.container.remove();
  }

  setState(state: ArenaStatePayload): void {
    this.state = state;
    if (state.status !== "ready_check") {
      this.readyCheck = null;
    }
    if (
      state.status === "countdown" ||
      state.status === "fighting" ||
      state.status === "round_ended"
    ) {
      if (this.isOpen()) {
        this.close();
      }
    }
    this.render();
  }

  showReadyCheck(ready: ReadyCheck): void {
    this.readyCheck = ready;
    this.open();
  }

  clearReadyCheck(): void {
    this.readyCheck = null;
    this.render();
  }

  private startTicker(): void {
    if (this.tickTimer !== null) return;
    this.tickTimer = window.setInterval(() => this.render(), 500);
  }

  private stopTicker(): void {
    if (this.tickTimer === null) return;
    window.clearInterval(this.tickTimer);
    this.tickTimer = null;
  }

  private render(): void {
    const ready = this.readyCheck;
    const queueDisabled =
      this.state.status !== "idle" && this.state.status !== "finished";
    const cancelVisible =
      this.state.status === "queued" ||
      this.state.status === "ready_check" ||
      this.state.status === "accepted";
    const status = this.formatStatus();
    const readySeconds = ready
      ? Math.max(0, Math.ceil((ready.expiresAtMs - Date.now()) / 1000))
      : 0;

    this.container.innerHTML = `
      <style>
        .ao-arena-title { margin: 0 0 8px; text-align: center; font-size: 20px; color: #ffd9a6; }
        .ao-arena-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 30px; }
        .ao-arena-label { color: #d8a475; font-size: 12px; text-transform: uppercase; }
        .ao-arena-value { color: #ffe6c8; font-size: 13px; text-align: right; }
        .ao-arena-status { margin: 10px 0 12px; min-height: 34px; color: #f3dcc5; font-size: 13px; line-height: 17px; text-align: center; }
        .ao-arena-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .ao-arena-button { height: 30px; border: 1px solid #8f4737; background: #2b1512; color: #ffe6c8; cursor: pointer; }
        .ao-arena-button:hover:not(:disabled) { background: #3d1d18; }
        .ao-arena-button:disabled { opacity: 0.45; cursor: default; }
        .ao-arena-ready { border-top: 1px solid rgba(196, 92, 72, 0.45); margin-top: 12px; padding-top: 12px; }
        .ao-arena-footer { display: flex; justify-content: center; gap: 8px; margin-top: 14px; }
        .ao-arena-primary { border-color: #b7623d; background: #693027; }
      </style>
      <h2 class="ao-arena-title">Arenas</h2>
      <div class="ao-arena-row">
        <span class="ao-arena-label">Ganadas 1v1</span>
        <span class="ao-arena-value">${this.state.wins1v1}</span>
      </div>
      <div class="ao-arena-row">
        <span class="ao-arena-label">Cola 1v1</span>
        <span class="ao-arena-value">${this.state.queueSize1v1}</span>
      </div>
      <div class="ao-arena-status">${status}</div>
      <div class="ao-arena-grid">
        <button id="ao-arena-queue-1v1" class="ao-arena-button ao-arena-primary" ${queueDisabled ? "disabled" : ""}>1v1</button>
        <button class="ao-arena-button" disabled>2v2</button>
        <button class="ao-arena-button" disabled>3v3</button>
      </div>
      ${
        ready
          ? `<div class="ao-arena-ready">
              <div class="ao-arena-status">Estas listo contra ${ready.opponent.name}? (${readySeconds}s)</div>
              <div class="ao-arena-grid">
                <button id="ao-arena-ready-accept" class="ao-arena-button ao-arena-primary">Aceptar</button>
                <button id="ao-arena-ready-cancel" class="ao-arena-button">Cancelar</button>
              </div>
            </div>`
          : ""
      }
      <div class="ao-arena-footer">
        ${cancelVisible ? `<button id="ao-arena-cancel" class="ao-arena-button">Salir de cola</button>` : ""}
        <button id="ao-arena-close" class="ao-arena-button">Cerrar</button>
      </div>
    `;

    this.container.querySelector("#ao-arena-queue-1v1")?.addEventListener("click", () => {
      this.handlers.onJoinQueue("1v1");
      this.close();
    });
    this.container.querySelector("#ao-arena-cancel")?.addEventListener("click", () => {
      this.handlers.onCancelQueue();
    });
    this.container.querySelector("#ao-arena-ready-accept")?.addEventListener("click", () => {
      this.readyCheck = null;
      this.handlers.onReadyAccept();
      this.render();
    });
    this.container.querySelector("#ao-arena-ready-cancel")?.addEventListener("click", () => {
      this.readyCheck = null;
      this.handlers.onReadyCancel();
      this.render();
    });
    this.container.querySelector("#ao-arena-close")?.addEventListener("click", () => {
      this.close();
    });
  }

  private formatStatus(): string {
    if (this.state.status === "queued") return "Buscando rival 1v1...";
    if (this.state.status === "ready_check") return "Arena encontrada.";
    if (this.state.status === "accepted") return "Aceptaste. Esperando al rival...";
    if (this.state.status === "countdown") return "Duelo por comenzar.";
    if (this.state.status === "fighting") {
      const score = this.state.score;
      return score ? `Combatiendo (${score.you}-${score.opponent})` : "Combatiendo.";
    }
    if (this.state.status === "round_ended") return "Ronda finalizada.";
    return "Listo para entrar en cola.";
  }
}
