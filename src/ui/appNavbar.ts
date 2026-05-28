import type Phaser from "phaser";

const NAV_STATUS_CLEAR_MS = 4000;

export function setupAppNavbar(game: Phaser.Game): void {
  const playButton = document.getElementById("nav-play-btn");
  playButton?.addEventListener("click", () => {
    openCharacterSelect(game);
  });

  setupFullscreenToggle(game);

  bindPlaceholderNavButton("nav-news-btn", "Noticias — próximamente.");
  bindPlaceholderNavButton("nav-wiki-btn", "Wiki — próximamente.");
}

function setupFullscreenToggle(game: Phaser.Game): void {
  const button = document.getElementById("nav-fullscreen-btn");
  if (!button) {
    return;
  }

  const syncLabel = () => {
    button.textContent = game.scale.isFullscreen ? "Salir pantalla completa" : "Pantalla completa";
  };

  game.scale.on("enterfullscreen", syncLabel);
  game.scale.on("leavefullscreen", syncLabel);
  syncLabel();

  button.addEventListener("click", () => {
    if (game.scale.isFullscreen) {
      game.scale.stopFullscreen();
    } else {
      game.scale.startFullscreen();
    }
  });
}

function bindPlaceholderNavButton(elementId: string, message: string): void {
  const button = document.getElementById(elementId);
  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    setNavStatus(message);
  });
}

function setNavStatus(message: string): void {
  const status = document.getElementById("nav-status");
  if (!status) {
    return;
  }

  status.textContent = message;
  window.setTimeout(() => {
    if (status.textContent === message) {
      status.textContent = "";
    }
  }, NAV_STATUS_CLEAR_MS);
}

export function openCharacterSelect(game: Phaser.Game): void {
  const charSelectScene = game.scene.getScene("CharacterSelectScene");
  if (charSelectScene?.scene.isActive()) {
    return;
  }

  const gameScene = game.scene.getScene("GameScene");
  const gameSceneIsUp =
    Boolean(gameScene) &&
    (gameScene.scene.isActive() || gameScene.scene.isPaused());

  if (gameSceneIsUp) {
    if (gameScene.scene.isActive()) {
      game.scene.pause("GameScene");
    }
    if (!charSelectScene?.scene.isActive()) {
      game.scene.run("CharacterSelectScene", { returnMode: "resume" });
    }
    return;
  }

  game.scene.start("CharacterSelectScene", { returnMode: "enter" });
}
