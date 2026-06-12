import Phaser from "phaser";
import {
  clearAuthSession,
  getAuthAccount,
  isAuthenticated,
  login,
  register,
} from "../network/authApi";

const AUTH_REQUIRED = import.meta.env.VITE_AUTH_REQUIRED === "true";

export class AuthScene extends Phaser.Scene {
  private overlay?: HTMLDivElement;
  private mode: "login" | "register" = "login";

  constructor() {
    super("AuthScene");
  }

  create(): void {
    if (isAuthenticated()) {
      this.scene.start("CharacterSelectScene");
      return;
    }
    this.add.rectangle(400, 300, 800, 600, 0x0d1117).setOrigin(0.5);
    this.renderOverlay();
  }

  private renderOverlay(): void {
    this.destroyOverlay();
    const overlay = document.createElement("div");
    overlay.id = "aoweb-auth";
    overlay.innerHTML = `
      <style>
        #aoweb-auth {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          background: rgba(13,17,23,0.92);
          z-index: 20;
          font-family: "Segoe UI", Tahoma, sans-serif;
          color: #e6edf3;
        }
        #aoweb-auth .panel {
          width: min(360px, calc(100vw - 32px));
          border: 1px solid #5c4a22;
          background: #14100c;
          box-shadow: 0 0 0 1px #1f2937, 0 16px 48px rgba(0,0,0,0.45);
          padding: 22px;
        }
        #aoweb-auth h1 {
          margin: 0 0 6px;
          font-size: 24px;
          color: #d4b65a;
          text-align: center;
        }
        #aoweb-auth p {
          margin: 0 0 18px;
          color: #9aa4b2;
          text-align: center;
          font-size: 13px;
        }
        #aoweb-auth label {
          display: block;
          margin: 10px 0 5px;
          font-size: 13px;
          color: #c7d0dd;
        }
        #aoweb-auth input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #3d4858;
          background: #0d1117;
          color: #e6edf3;
          padding: 10px 11px;
          font-size: 14px;
          outline: none;
        }
        #aoweb-auth input:focus {
          border-color: #d4b65a;
        }
        #aoweb-auth button {
          width: 100%;
          margin-top: 14px;
          border: 1px solid #8a6f2a;
          background: #2c2414;
          color: #f2d77a;
          padding: 10px;
          cursor: pointer;
          font-weight: 700;
        }
        #aoweb-auth .link {
          border: 0;
          background: transparent;
          color: #9fb3d9;
          font-weight: 400;
          margin-top: 8px;
        }
        #aoweb-auth .dev {
          color: #9aa4b2;
        }
        #aoweb-auth .error {
          min-height: 18px;
          margin-top: 10px;
          color: #ff8b8b;
          font-size: 13px;
          text-align: center;
        }
      </style>
      <div class="panel">
        <h1>AOWEB</h1>
        <p>${this.mode === "login" ? "Ingresar a tu cuenta" : "Crear una cuenta nueva"}</p>
        <form id="auth-form">
          <label>Usuario</label>
          <input id="auth-user" autocomplete="username" maxlength="20" />
          <label>Contrasena</label>
          <input id="auth-pass" type="password" autocomplete="${
            this.mode === "login" ? "current-password" : "new-password"
          }" />
          <button type="submit">${this.mode === "login" ? "Ingresar" : "Crear cuenta"}</button>
        </form>
        <button class="link" id="auth-switch">${
          this.mode === "login" ? "Crear cuenta" : "Ya tengo cuenta"
        }</button>
        ${AUTH_REQUIRED ? "" : `<button class="link dev" id="auth-skip">Continuar sin cuenta (dev)</button>`}
        <div class="error" id="auth-error"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.overlay = overlay;

    overlay.querySelector("#auth-switch")?.addEventListener("click", () => {
      this.mode = this.mode === "login" ? "register" : "login";
      this.renderOverlay();
    });
    overlay.querySelector("#auth-skip")?.addEventListener("click", () => {
      clearAuthSession();
      this.startGame();
    });
    overlay.querySelector("#auth-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.submit();
    });
  }

  private async submit(): Promise<void> {
    const username = (this.overlay?.querySelector<HTMLInputElement>("#auth-user")?.value ?? "").trim();
    const password = this.overlay?.querySelector<HTMLInputElement>("#auth-pass")?.value ?? "";
    const error = this.overlay?.querySelector<HTMLDivElement>("#auth-error");
    if (error) {
      error.textContent = "";
    }
    const result =
      this.mode === "login" ? await login(username, password) : await register(username, password);
    if (!result.ok) {
      if (error) {
        error.textContent = result.error;
      }
      return;
    }
    this.startGame();
  }

  private startGame(): void {
    const account = getAuthAccount();
    console.log(account ? `[auth] logged in as ${account.username}` : "[auth] dev guest mode");
    this.destroyOverlay();
    this.scene.start("CharacterSelectScene");
  }

  private destroyOverlay(): void {
    this.overlay?.remove();
    this.overlay = undefined;
  }

  shutdown(): void {
    this.destroyOverlay();
  }
}
