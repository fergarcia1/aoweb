import Phaser from "phaser";
import { AuthScene } from "./scenes/AuthScene";
import { CharacterCreationScene } from "./scenes/CharacterCreationScene";
import { CharacterSelectScene } from "./scenes/CharacterSelectScene";
import { GameScene } from "./scenes/GameScene";
import { flushProgressOnPageHide } from "./game/emergencyProgressFlush";
import { disconnectActiveMultiplayer } from "./network/multiplayerSession";
import { setupAppNavbar } from "./ui/appNavbar";
import { reportStartupError, setupErrorDiagnostics } from "./debug/errorDiagnostics";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: 800,
  height: 600,
  // Fondo fuera de los tiles del mapa (cuando la cámara sale del borde).
  backgroundColor: "#0d1117",
  antialias: true,
  pixelArt: false,
  autoRound: false,
  roundPixels: false,
  dom: {
    createContainer: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // CharacterSelect primero: GameScene precarga miles de PNG (items, mapas, mobs).
  // Si arranca al abrir la página, la pantalla queda en verde hasta terminar.
  scene: [AuthScene, CharacterSelectScene, CharacterCreationScene, GameScene],
};

setupErrorDiagnostics();

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    flushProgressOnPageHide();
    disconnectActiveMultiplayer();
  });
}

try {
  const game = new Phaser.Game(config);
  setupAppNavbar(game);
} catch (error) {
  reportStartupError(error);
  throw error;
}
