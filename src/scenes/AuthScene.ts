import Phaser from "phaser";
import {
  clearAuthSession,
  getAuthAccount,
  isAuthenticated,
  login,
  register,
} from "../network/authApi";
import {
  hasMenuMusicStarted,
  playMenuMusic,
  playMenuMusicFromUserGesture,
  preloadMenuMusic,
} from "../audio/menuMusic";

const AUTH_REQUIRED = import.meta.env.VITE_AUTH_REQUIRED === "true";
const HERO_BACKGROUND_URL = "/assets/ui/aoweb-dragon-war-loading.png";

export class AuthScene extends Phaser.Scene {
  private overlay?: HTMLDivElement;
  private unlockMenuMusic?: (event: Event) => void;
  private mode: "login" | "register" = "login";

  constructor() {
    super("AuthScene");
  }

  preload(): void {
    preloadMenuMusic(this);
  }

  create(): void {
    playMenuMusic(this);
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
          background:
            linear-gradient(90deg, rgba(8, 10, 16, 0.64), rgba(16, 7, 6, 0.72)),
            url("${HERO_BACKGROUND_URL}") center center / cover no-repeat;
          z-index: 20;
          font-family: Arial, sans-serif;
          color: #f3dcc5;
        }
        #aoweb-auth::after {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 44%, rgba(255, 219, 150, 0.1), transparent 26%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.52));
        }
        #aoweb-auth .panel {
          width: min(360px, calc(100vw - 32px));
          position: relative;
          z-index: 1;
          border: 1px solid #b7332b;
          background: linear-gradient(180deg, rgba(25, 11, 9, 0.92), rgba(9, 7, 8, 0.96));
          box-shadow: 0 16px 48px rgba(0,0,0,0.65);
          padding: 24px;
          border-radius: 4px;
          backdrop-filter: blur(5px);
        }
        #aoweb-auth h1 {
          margin: 0 0 6px;
          font-size: 30px;
          color: #f1c44d;
          text-align: center;
          font-weight: bold;
          letter-spacing: 0.08em;
          text-shadow: 0 2px 0 #4b100d, 0 0 18px rgba(255, 85, 48, 0.38);
        }
        #aoweb-auth p {
          margin: 0 0 18px;
          color: #d8b887;
          text-align: center;
          font-size: 13px;
        }
        #aoweb-auth label {
          display: block;
          margin: 10px 0 5px;
          font-size: 13px;
          color: #d8b887;
          text-transform: uppercase;
          font-weight: bold;
        }
        #aoweb-auth input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #8d2a24;
          background: rgba(10, 8, 9, 0.86);
          color: #ffffff;
          padding: 10px 11px;
          font-size: 14px;
          outline: none;
          border-radius: 0;
        }
        #aoweb-auth input:focus {
          border-color: #f1c44d;
        }
        #aoweb-auth button {
          width: 100%;
          margin-top: 14px;
          border: 1px solid #d4a72c;
          background: #4b1714;
          color: #ffe6c8;
          padding: 10px;
          cursor: pointer;
          font-weight: 700;
          border-radius: 0;
        }
        #aoweb-auth button:hover {
          background: #6f211d;
        }
        #aoweb-auth .link {
          border: 0;
          background: transparent;
          color: #f1c44d;
          font-weight: 400;
          margin-top: 8px;
        }
        #aoweb-auth .link:hover {
          text-decoration: underline;
          background: transparent;
        }
        #aoweb-auth .dev {
          color: #d8b887;
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

    this.bindMenuMusicUnlock();
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

    const stopPropagation = (e: Event) => e.stopPropagation();
    const userEl = overlay.querySelector("#auth-user");
    const passEl = overlay.querySelector("#auth-pass");
    if (userEl) {
      userEl.addEventListener("keydown", stopPropagation);
      userEl.addEventListener("keyup", stopPropagation);
      userEl.addEventListener("keypress", stopPropagation);
    }
    if (passEl) {
      passEl.addEventListener("keydown", stopPropagation);
      passEl.addEventListener("keyup", stopPropagation);
      passEl.addEventListener("keypress", stopPropagation);
    }
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
    this.unbindMenuMusicUnlock();
  }

  shutdown(): void {
    this.destroyOverlay();
  }

  private bindMenuMusicUnlock(): void {
    this.unbindMenuMusicUnlock();
    const unlock = () => {
      playMenuMusicFromUserGesture(this);
      if (hasMenuMusicStarted()) {
        this.unbindMenuMusicUnlock();
      }
    };
    this.unlockMenuMusic = unlock;
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
  }

  private unbindMenuMusicUnlock(): void {
    if (!this.unlockMenuMusic) {
      return;
    }
    document.removeEventListener("pointerdown", this.unlockMenuMusic, true);
    document.removeEventListener("keydown", this.unlockMenuMusic, true);
    this.unlockMenuMusic = undefined;
  }
}
