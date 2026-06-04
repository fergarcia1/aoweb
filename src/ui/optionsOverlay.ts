import { loadKeybindings, saveKeybindings, getKeyCodeName, type Keybindings, type ActionName } from "../config/keybindings";

export class OptionsOverlay {
  private container: HTMLDivElement;
  private bindings: Keybindings;
  private onBindingsChanged: () => void;

  constructor(onBindingsChanged: () => void) {
    this.onBindingsChanged = onBindingsChanged;
    this.bindings = loadKeybindings();

    this.container = document.createElement("div");
    this.container.style.position = "absolute";
    this.container.style.top = "50%";
    this.container.style.left = "50%";
    this.container.style.transform = "translate(-50%, -50%)";
    this.container.style.width = "300px";
    this.container.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
    this.container.style.border = "2px solid #5a3c22";
    this.container.style.borderRadius = "8px";
    this.container.style.padding = "16px";
    this.container.style.color = "#e0c090";
    this.container.style.fontFamily = "sans-serif";
    this.container.style.zIndex = "1000";
    this.container.style.display = "none";

    document.body.appendChild(this.container);
    this.render();
  }

  public toggle() {
    if (this.container.style.display === "none") {
      this.bindings = loadKeybindings();
      this.render();
      this.container.style.display = "block";
    } else {
      this.container.style.display = "none";
    }
  }

  public isOpen(): boolean {
    return this.container.style.display === "block";
  }

  private render() {
    this.container.innerHTML = `
      <h2 style="margin-top: 0; text-align: center; border-bottom: 1px solid #5a3c22; padding-bottom: 8px;">Opciones</h2>
      <div id="options-content" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;"></div>
      <div style="text-align: center;">
        <button id="btn-close-options" style="background: #3a1c02; color: #e0c090; border: 1px solid #5a3c22; padding: 4px 16px; cursor: pointer;">Cerrar</button>
      </div>
    `;

    const content = this.container.querySelector("#options-content")!;
    
    const actions: { id: ActionName, label: string }[] = [
      { id: "attack", label: "Atacar" },
      { id: "pickup", label: "Agarrar Item" },
      { id: "equip", label: "Equipar/Usar" },
      { id: "drop", label: "Tirar Item" },
      { id: "meditate", label: "Meditar" },
    ];

    actions.forEach(action => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      
      const label = document.createElement("span");
      label.innerText = action.label;
      
      const btn = document.createElement("button");
      btn.innerText = getKeyCodeName(this.bindings[action.id]);
      btn.style.background = "#2a1c02";
      btn.style.color = "#fff";
      btn.style.border = "1px solid #5a3c22";
      btn.style.padding = "2px 8px";
      btn.style.cursor = "pointer";
      btn.style.minWidth = "60px";
      
      btn.onclick = () => {
        btn.innerText = "...";
        const listener = (e: KeyboardEvent) => {
          e.preventDefault();
          this.bindings[action.id] = e.keyCode;
          saveKeybindings(this.bindings);
          this.onBindingsChanged();
          this.render();
          document.removeEventListener("keydown", listener);
        };
        document.addEventListener("keydown", listener);
      };

      row.appendChild(label);
      row.appendChild(btn);
      content.appendChild(row);
    });

    this.container.querySelector("#btn-close-options")!.addEventListener("click", () => {
      this.toggle();
    });
  }
}
