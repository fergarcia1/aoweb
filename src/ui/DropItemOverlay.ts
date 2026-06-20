import Phaser from "phaser";

type DropItemOverlayHandlers = {
  onConfirm: (amount: number) => void;
  onCancel: () => void;
};

type DropOverlayGlobal = typeof globalThis & {
  __aowebDropItemOverlays?: DropItemOverlay[];
};

export class DropItemOverlay {
  private readonly container: HTMLDivElement;
  private readonly input: HTMLInputElement;
  private readonly slider: HTMLInputElement;
  private readonly itemNameText: HTMLDivElement;
  private readonly maxLabel: HTMLSpanElement;
  
  private handlers: DropItemOverlayHandlers | null = null;
  private amount = 1;
  private maxAmount = 1;

  constructor(private readonly scene?: Phaser.Scene) {
    const globalOverlays = globalThis as DropOverlayGlobal;
    globalOverlays.__aowebDropItemOverlays?.forEach((overlay) => overlay.destroy());
    globalOverlays.__aowebDropItemOverlays = [this];

    this.container = document.createElement("div");
    this.container.style.position = "absolute";
    this.container.style.top = "50%";
    this.container.style.left = "50%";
    this.container.style.transform = "translate(-50%, -50%)";
    this.container.style.width = "320px";
    this.container.style.boxSizing = "border-box";
    this.container.style.background = "linear-gradient(180deg, rgba(28, 12, 10, 0.98), rgba(10, 8, 9, 0.98))";
    this.container.style.border = "1px solid #7d3028";
    this.container.style.borderRadius = "6px";
    this.container.style.padding = "16px";
    this.container.style.color = "#f3dcc5";
    this.container.style.fontFamily = "Arial, sans-serif";
    this.container.style.zIndex = "1100";
    this.container.style.display = "none";
    this.container.style.boxShadow = "0 16px 48px rgba(0, 0, 0, 0.65)";
    this.container.style.textAlign = "center";

    this.container.innerHTML = `
      <style>
        .ao-drop-title { margin: 0 0 10px; font-size: 18px; color: #ffd9a6; font-weight: bold; }
        .ao-drop-item-name { margin: 0 0 16px; font-size: 14px; color: #ffffff; font-weight: bold; }
        
        .ao-drop-qty-row { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px; }
        .ao-drop-qty-btn { width: 28px; height: 28px; border: 1px solid #8f4737; background: #2b1512; color: #ffe6c8; cursor: pointer; font-size: 15px; font-weight: bold; border-radius: 4px; display: flex; align-items: center; justify-content: center; user-select: none; }
        .ao-drop-qty-btn:hover { background: #3d1d18; }
        .ao-drop-qty-input { width: 88px; height: 28px; border: 1px solid #8f4737; background: #1a0a08; color: #ffffff; text-align: center; font-size: 14px; font-weight: bold; border-radius: 4px; box-sizing: border-box; }
        .ao-drop-qty-input:focus { outline: none; border-color: #ffd9a6; }
        .ao-drop-max-info { font-size: 12px; color: #d8a475; font-weight: bold; }

        .ao-drop-slider-container { display: flex; align-items: center; justify-content: center; padding: 0 10px; margin-bottom: 20px; }
        .ao-drop-slider { flex: 1; accent-color: #b74235; cursor: pointer; height: 4px; }

        .ao-drop-footer { display: flex; justify-content: center; gap: 12px; border-top: 1px solid rgba(196, 92, 72, 0.45); padding-top: 12px; }
        .ao-drop-btn { min-width: 96px; height: 28px; border: 1px solid #8f4737; background: #2b1512; color: #ffe6c8; cursor: pointer; font-weight: bold; border-radius: 4px; font-size: 13px; }
        .ao-drop-btn:hover { background: #3d1d18; }
        .ao-drop-btn-confirm { background: #7a261a; border-color: #a63f32; color: #ffffff; }
        .ao-drop-btn-confirm:hover { background: #963124; }
      </style>
      <h2 class="ao-drop-title">Tirar Objeto</h2>
      <div class="ao-drop-item-name" id="ao-drop-item-name"></div>
      
      <div class="ao-drop-qty-row">
        <button class="ao-drop-qty-btn" id="ao-drop-dec">-</button>
        <input type="number" class="ao-drop-qty-input" id="ao-drop-val" min="1" value="1" />
        <button class="ao-drop-qty-btn" id="ao-drop-inc">+</button>
        <span class="ao-drop-max-info" id="ao-drop-max">/ 1</span>
      </div>

      <div class="ao-drop-slider-container">
        <input type="range" class="ao-drop-slider" id="ao-drop-range" min="1" max="1" value="1" />
      </div>

      <div class="ao-drop-footer">
        <button class="ao-drop-btn ao-drop-btn-confirm" id="ao-drop-btn-confirm">Tirar</button>
        <button class="ao-drop-btn" id="ao-drop-btn-cancel">Cancelar</button>
      </div>
    `;

    document.body.appendChild(this.container);

    this.itemNameText = this.container.querySelector("#ao-drop-item-name")!;
    this.input = this.container.querySelector("#ao-drop-val")!;
    this.slider = this.container.querySelector("#ao-drop-range")!;
    this.maxLabel = this.container.querySelector("#ao-drop-max")!;

    // Stop keyboard events from bubbling up to Phaser's window listener
    const stopPropagation = (e: KeyboardEvent) => {
      e.stopPropagation();
    };
    this.input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        this.handleAccept();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.handleCancel();
      }
    });
    this.input.addEventListener("keyup", stopPropagation);
    this.input.addEventListener("keypress", stopPropagation);

    this.slider.addEventListener("keydown", stopPropagation);
    this.slider.addEventListener("keyup", stopPropagation);
    this.slider.addEventListener("keypress", stopPropagation);

    // Focus and blur events to suspend Phaser keyboard input
    this.input.addEventListener("focus", () => {
      if (this.scene?.input?.keyboard) {
        this.scene.input.keyboard.enabled = false;
      }
    });
    this.input.addEventListener("blur", () => {
      if (this.scene?.input?.keyboard) {
        this.scene.input.keyboard.enabled = true;
      }
    });

    // Event listeners
    this.container.querySelector("#ao-drop-dec")!.addEventListener("click", () => this.updateValue(this.amount - 1));
    this.container.querySelector("#ao-drop-inc")!.addEventListener("click", () => this.updateValue(this.amount + 1));
    
    this.input.addEventListener("input", () => {
      let val = parseInt(this.input.value, 10);
      if (isNaN(val)) val = 1;
      this.updateValue(val);
    });

    this.slider.addEventListener("input", () => {
      this.updateValue(parseInt(this.slider.value, 10));
    });

    this.container.querySelector("#ao-drop-btn-confirm")!.addEventListener("click", () => this.handleAccept());
    this.container.querySelector("#ao-drop-btn-cancel")!.addEventListener("click", () => this.handleCancel());
    
    // Global key listener to capture ESC
    document.addEventListener("keydown", this.handleDocumentKeyDown, true);
  }

  private handleDocumentKeyDown = (e: KeyboardEvent) => {
    if (this.isOpen() && e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      this.handleCancel();
    }
  };

  private updateValue(val: number) {
    this.amount = Math.max(1, Math.min(this.maxAmount, val));
    this.input.value = this.amount.toString();
    this.slider.value = this.amount.toString();
  }

  show(scene: Phaser.Scene, itemName: string, maxAmount: number, handlers: DropItemOverlayHandlers) {
    this.handlers = handlers;
    this.maxAmount = maxAmount;
    this.itemNameText.innerText = itemName;
    this.maxLabel.innerText = `/ ${maxAmount}`;
    
    this.slider.max = maxAmount.toString();
    this.updateValue(1);

    this.container.style.display = "block";
    
    // Auto-focus input
    setTimeout(() => {
      this.input.focus();
      this.input.select();
    }, 40);
  }

  hide() {
    this.handlers = null;
    this.container.style.display = "none";
    if (this.scene?.input?.keyboard) {
      this.scene.input.keyboard.enabled = true; // Ensure keyboard is re-enabled
    }
  }

  isOpen() {
    return this.container.style.display === "block";
  }

  handleKeyDown(event: KeyboardEvent) {
    // Left backward compatibility wrapper
    if (this.isOpen() && event.key === "Escape") {
      this.handleCancel();
    }
  }

  private handleAccept() {
    if (this.handlers) {
      this.handlers.onConfirm(this.amount);
    }
    this.hide();
  }

  private handleCancel() {
    if (this.handlers) {
      this.handlers.onCancel();
    }
    this.hide();
  }

  destroy() {
    document.removeEventListener("keydown", this.handleDocumentKeyDown, true);
    this.container.remove();
  }
}
