import {
  getKeyCodeName,
  loadKeybindings,
  saveKeybindings,
  type ActionName,
  type Keybindings,
} from "../config/keybindings";
import { loadMasterVolume, saveMasterVolume } from "../config/audioSettings";
import {
  AOWEB_UI_SKIN_VARIANTS,
  getAowebSkinThemeLabel,
  getAowebSkinVariant,
  type AowebUiSkinVariant,
} from "./aowebSkinVariant";

export type OptionsOverlayHandlers = {
  onBindingsChanged: () => void;
  onVolumeChanged: (volume: number) => void;
  onSkinVariantChanged: (variant: AowebUiSkinVariant) => void;
};

const KEY_ACTIONS: { id: ActionName; label: string }[] = [
  { id: "useItem", label: "Usar objeto" },
  { id: "pickup", label: "Agarrar" },
  { id: "equip", label: "Equipar" },
  { id: "drop", label: "Tirar" },
  { id: "moveUp", label: "W / Arriba" },
  { id: "moveLeft", label: "A / Izquierda" },
  { id: "moveDown", label: "S / Abajo" },
  { id: "moveRight", label: "D / Derecha" },
  { id: "attack", label: "Golpear" },
];

const SKIN_OPTIONS: AowebUiSkinVariant[] = AOWEB_UI_SKIN_VARIANTS.filter(
  (variant) => variant !== "light"
);

export class OptionsOverlay {
  private readonly container: HTMLDivElement;
  private bindings: Keybindings = loadKeybindings();
  private masterVolume = loadMasterVolume();
  private capturingAction: ActionName | null = null;

  constructor(private readonly handlers: OptionsOverlayHandlers) {
    this.container = document.createElement("div");
    this.container.style.position = "absolute";
    this.container.style.top = "50%";
    this.container.style.left = "50%";
    this.container.style.transform = "translate(-50%, -50%)";
    this.container.style.width = "340px";
    this.container.style.maxHeight = "min(680px, calc(100vh - 32px))";
    this.container.style.boxSizing = "border-box";
    this.container.style.overflowY = "auto";
    this.container.style.background = "linear-gradient(180deg, rgba(28, 12, 10, 0.98), rgba(10, 8, 9, 0.98))";
    this.container.style.border = "1px solid #7d3028";
    this.container.style.borderRadius = "6px";
    this.container.style.padding = "14px";
    this.container.style.color = "#f3dcc5";
    this.container.style.fontFamily = "Arial, sans-serif";
    this.container.style.zIndex = "1000";
    this.container.style.display = "none";
    this.container.style.boxShadow = "0 16px 48px rgba(0, 0, 0, 0.65)";

    document.body.appendChild(this.container);
    document.addEventListener("keydown", this.handleDocumentKeyDown, true);
    this.render();
  }

  public toggle() {
    if (this.isOpen()) {
      this.close();
      return;
    }
    this.bindings = loadKeybindings();
    this.masterVolume = loadMasterVolume();
    this.render();
    this.container.style.display = "block";
  }

  public isOpen(): boolean {
    return this.container.style.display === "block";
  }

  public close() {
    this.capturingAction = null;
    this.container.style.display = "none";
  }

  public destroy() {
    document.removeEventListener("keydown", this.handleDocumentKeyDown, true);
    this.container.remove();
  }

  private handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (!this.isOpen()) {
      return;
    }

    if (this.capturingAction) {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        this.capturingAction = null;
        this.render();
        return;
      }

      this.bindings[this.capturingAction] = event.keyCode;
      saveKeybindings(this.bindings);
      this.handlers.onBindingsChanged();
      this.capturingAction = null;
      this.render();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  };

  private render() {
    this.container.innerHTML = `
      <style>
        .ao-options-title { margin: 0 0 6px; text-align: center; font-size: 20px; color: #ffd9a6; }
        .ao-options-hint { margin: 0 0 10px; text-align: center; font-size: 12px; color: #b89a78; }
        .ao-options-hint kbd { background: #3d1d18; border: 1px solid #8f4737; border-radius: 3px; padding: 1px 5px; font-family: monospace; color: #ffe6c8; }
        .ao-options-section { border-top: 1px solid rgba(196, 92, 72, 0.45); padding-top: 12px; margin-top: 12px; }
        .ao-options-section-title { margin: 0 0 8px; font-size: 12px; color: #d8a475; text-transform: uppercase; }
        .ao-options-row { display: flex; align-items: center; justify-content: space-between; min-height: 32px; gap: 10px; }
        .ao-options-label { font-size: 13px; color: #f3dcc5; }
        .ao-options-button { min-width: 86px; height: 26px; border: 1px solid #8f4737; background: #2b1512; color: #ffe6c8; cursor: pointer; }
        .ao-options-button:hover { background: #3d1d18; }
        .ao-options-button.capturing { color: #ffffff; border-color: #f2b36b; background: #60301f; }
        .ao-options-skins { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .ao-options-skin { height: 30px; border: 1px solid #704035; background: #1f1413; color: #ead0b8; cursor: pointer; }
        .ao-options-skin.active { border-color: #ffd08a; color: #ffffff; background: #693027; }
        .ao-options-footer { display: flex; justify-content: center; margin-top: 14px; }
        .ao-options-volume { width: 172px; accent-color: #b74235; }
        .ao-options-volume-value { min-width: 38px; text-align: right; color: #ffe6c8; }
      </style>
      <h2 class="ao-options-title">Opciones</h2>
      <p class="ao-options-hint">Para mostrar/ocultar los FPS y el ping: <kbd>*</kbd></p>
      <section class="ao-options-section">
        <h3 class="ao-options-section-title">Audio</h3>
        <div class="ao-options-row">
          <span class="ao-options-label">Volumen</span>
          <input id="ao-options-volume" class="ao-options-volume" type="range" min="0" max="100" step="1" value="${Math.round(this.masterVolume * 100)}" />
          <span id="ao-options-volume-value" class="ao-options-volume-value">${Math.round(this.masterVolume * 100)}%</span>
        </div>
      </section>
      <section class="ao-options-section">
        <h3 class="ao-options-section-title">Teclas</h3>
        <div id="ao-options-keys"></div>
      </section>
      <section class="ao-options-section">
        <h3 class="ao-options-section-title">Interfaz</h3>
        <div id="ao-options-skins" class="ao-options-skins"></div>
      </section>
      <div class="ao-options-footer">
        <button id="ao-options-close" class="ao-options-button">Cerrar</button>
      </div>
    `;

    this.renderKeyRows();
    this.renderSkinButtons();
    this.bindStaticControls();
  }

  private renderKeyRows() {
    const content = this.container.querySelector("#ao-options-keys");
    if (!content) {
      return;
    }

    for (const action of KEY_ACTIONS) {
      const row = document.createElement("div");
      row.className = "ao-options-row";

      const label = document.createElement("span");
      label.className = "ao-options-label";
      label.innerText = action.label;

      const button = document.createElement("button");
      button.className = "ao-options-button";
      if (this.capturingAction === action.id) {
        button.classList.add("capturing");
      }
      button.innerText =
        this.capturingAction === action.id
          ? "Presiona..."
          : getKeyCodeName(this.bindings[action.id]);
      button.addEventListener("click", () => {
        this.capturingAction = action.id;
        this.render();
      });

      row.append(label, button);
      content.appendChild(row);
    }
  }

  private renderSkinButtons() {
    const content = this.container.querySelector("#ao-options-skins");
    if (!content) {
      return;
    }

    const active = getAowebSkinVariant();
    const labels: Record<AowebUiSkinVariant, string> = {
      dark: "Dark",
      red: "Red",
      white: "Clear",
      light: "Legacy",
    };

    for (const variant of SKIN_OPTIONS) {
      const button = document.createElement("button");
      button.className = `ao-options-skin${variant === active ? " active" : ""}`;
      button.innerText = labels[variant];
      button.title = getAowebSkinThemeLabel(variant);
      button.addEventListener("click", () => {
        this.handlers.onSkinVariantChanged(variant);
        this.render();
      });
      content.appendChild(button);
    }
  }

  private bindStaticControls() {
    this.container.querySelector("#ao-options-close")?.addEventListener("click", () => {
      this.close();
    });

    const volumeInput = this.container.querySelector<HTMLInputElement>("#ao-options-volume");
    const volumeValue = this.container.querySelector("#ao-options-volume-value");
    volumeInput?.addEventListener("input", () => {
      const volume = saveMasterVolume(Number(volumeInput.value) / 100);
      this.masterVolume = volume;
      if (volumeValue) {
        volumeValue.textContent = `${Math.round(volume * 100)}%`;
      }
      this.handlers.onVolumeChanged(volume);
    });
  }
}
