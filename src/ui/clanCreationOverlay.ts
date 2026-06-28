export type ClanCreationOverlayHandlers = {
  onSubmit: (name: string, description: string) => void;
};

export class ClanCreationOverlay {
  private readonly container: HTMLDivElement;

  constructor(private readonly handlers: ClanCreationOverlayHandlers) {
    this.container = document.createElement("div");
    this.container.style.position = "absolute";
    this.container.style.top = "50%";
    this.container.style.left = "50%";
    this.container.style.transform = "translate(-50%, -50%)";
    this.container.style.width = "380px";
    this.container.style.maxWidth = "calc(100vw - 28px)";
    this.container.style.boxSizing = "border-box";
    this.container.style.background =
      "linear-gradient(180deg, rgba(28, 12, 10, 0.98), rgba(10, 8, 9, 0.98))";
    this.container.style.border = "1px solid #7d3028";
    this.container.style.borderRadius = "6px";
    this.container.style.padding = "14px";
    this.container.style.color = "#f3dcc5";
    this.container.style.fontFamily = "Arial, sans-serif";
    this.container.style.zIndex = "1002";
    this.container.style.display = "none";
    this.container.style.boxShadow = "0 16px 48px rgba(0, 0, 0, 0.65)";
    document.body.appendChild(this.container);
    this.captureOverlayEvents();
    this.render();
  }

  open(): void {
    this.container.style.display = "block";
    this.render();
    window.setTimeout(() => {
      (this.container.querySelector("#ao-clan-name") as HTMLInputElement | null)?.focus();
    }, 0);
  }

  close(): void {
    this.container.style.display = "none";
  }

  destroy(): void {
    this.container.remove();
  }

  private render(error = ""): void {
    this.container.innerHTML = `
      <style>
        .ao-clan-title { margin: 0 0 10px; text-align: center; font-size: 20px; color: #ffd9a6; }
        .ao-clan-label { display: block; margin: 10px 0 5px; color: #d8a475; font-size: 12px; text-transform: uppercase; }
        .ao-clan-input, .ao-clan-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #8f4737;
          background: #130d0d;
          color: #ffe6c8;
          padding: 8px;
          outline: none;
          resize: none;
        }
        .ao-clan-input:focus, .ao-clan-textarea:focus { border-color: #d4935d; }
        .ao-clan-error { min-height: 18px; margin-top: 8px; color: #ff7777; font-size: 12px; text-align: center; }
        .ao-clan-actions { display: flex; justify-content: center; gap: 8px; margin-top: 12px; }
        .ao-clan-button { height: 30px; min-width: 96px; border: 1px solid #8f4737; background: #2b1512; color: #ffe6c8; cursor: pointer; }
        .ao-clan-button:hover { background: #3d1d18; }
        .ao-clan-primary { border-color: #b7623d; background: #693027; }
      </style>
      <h2 class="ao-clan-title">Crear Clan</h2>
      <label class="ao-clan-label" for="ao-clan-name">Nombre</label>
      <input id="ao-clan-name" class="ao-clan-input" maxlength="24" autocomplete="off" />
      <label class="ao-clan-label" for="ao-clan-description">Descripcion</label>
      <textarea id="ao-clan-description" class="ao-clan-textarea" rows="4" maxlength="160"></textarea>
      <div class="ao-clan-error">${error}</div>
      <div class="ao-clan-actions">
        <button id="ao-clan-submit" class="ao-clan-button ao-clan-primary">Crear</button>
        <button id="ao-clan-cancel" class="ao-clan-button">Cancelar</button>
      </div>
    `;

    const nameInput = this.container.querySelector("#ao-clan-name") as HTMLInputElement | null;
    const descriptionInput = this.container.querySelector(
      "#ao-clan-description"
    ) as HTMLTextAreaElement | null;

    const submit = () => {
      const name = nameInput?.value.trim() ?? "";
      const description = descriptionInput?.value.trim() ?? "";
      if (name.length < 3) {
        this.render("El nombre debe tener al menos 3 caracteres.");
        return;
      }
      this.handlers.onSubmit(name, description);
      this.close();
    };

    this.container.querySelector("#ao-clan-submit")?.addEventListener("click", submit);
    this.container.querySelector("#ao-clan-cancel")?.addEventListener("click", () => this.close());
    this.container.querySelectorAll("input, textarea").forEach((element) => {
      element.addEventListener("keydown", (event) => {
        const keyEvent = event as KeyboardEvent;
        keyEvent.stopPropagation();
        keyEvent.stopImmediatePropagation();
        if (keyEvent.key === "Escape") {
          keyEvent.preventDefault();
          this.close();
        }
        if (keyEvent.key === "Enter" && !keyEvent.shiftKey && element.tagName !== "TEXTAREA") {
          keyEvent.preventDefault();
          submit();
        }
      });
    });
  }

  private captureOverlayEvents(): void {
    const stop = (event: Event) => {
      event.stopPropagation();
      event.stopImmediatePropagation();
    };
    [
      "keydown",
      "keyup",
      "keypress",
      "beforeinput",
      "input",
      "compositionstart",
      "compositionupdate",
      "compositionend",
      "pointerdown",
      "pointerup",
      "mousedown",
      "mouseup",
      "click",
      "wheel",
    ].forEach((eventName) => {
      this.container.addEventListener(eventName, stop);
    });
    this.container.addEventListener(
      "contextmenu",
      (event) => {
        event.preventDefault();
        stop(event);
      }
    );
  }
}
